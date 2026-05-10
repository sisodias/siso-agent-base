import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { decisionForProfile, runCouncil } from "./council-layer.js";
import { createSisoTask, updateSisoTask } from "./task-store.js";
import { publicSpawnResult, runProfileSpawn } from "./spawn-layer.js";
import { executeSpawnWithNativeSubagentBridge, nativeSubagentAvailable } from "./native-subagent-bridge.js";
import { runCheck, workspaceDiff, workspaceStatus } from "./tooling-actions.js";
import { specialistAllocationForTask } from "./specialist-registry.js";
function titleFrom(task) {
    const compact = task.trim().replace(/\s+/g, " ");
    return compact.length <= 80 ? compact : `${compact.slice(0, 77)}...`;
}
function statusFrom(workers, dryRun, background) {
    if (dryRun)
        return "planned";
    if (background)
        return "background";
    const completed = workers.filter((worker) => worker.child.status === "completed").length;
    if (completed === workers.length)
        return "completed";
    if (completed > 0)
        return "partial";
    return "failed";
}
function workerPrompt(task, parentTask, workerIndex, council) {
    return [
        `SISO workflow parent task: ${parentTask.id}`,
        `Worker slot: ${workerIndex}`,
        "Do only this bounded slice.",
        "Final response must include: changed_files, checks_run, acceptance_status, risks, blockers.",
        council ? `Council summary: ${council.synthesis.summary}` : "",
        "",
        "Task:",
        task,
    ].filter(Boolean).join("\n");
}
function structuredWorkerPrompt(input) {
    return [
        `SISO workflow parent task: ${input.parent.id}`,
        `Workflow mode: ${input.mode}`,
        `Stage: ${input.stageIndex}`,
        `Worker slot: ${input.workerIndex}`,
        `Requested agent: ${input.agent}`,
        input.specialistId ? `Specialist: ${input.specialistId}` : "",
        input.executionProfile ? `Execution profile: ${input.executionProfile}` : "",
        "Do only this bounded slice.",
        "Final response must include: changed_files, checks_run, acceptance_status, risks, blockers.",
        input.council ? `Council summary: ${input.council.synthesis.summary}` : "",
        "",
        "Original task:",
        input.originalTask,
        "",
        "Task:",
        input.task,
        input.reason ? `\nAssignment reason:\n${input.reason}` : "",
        input.acceptanceCriteria?.length ? `\nAcceptance criteria:\n${input.acceptanceCriteria.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
        input.requiredChecks?.length ? `\nRequired checks:\n${input.requiredChecks.map((item) => `- ${item}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");
}
function templateTask(text, originalTask, previous) {
    return String(text ?? originalTask)
        .replaceAll("{task}", originalTask)
        .replaceAll("{previous}", previous ?? "");
}
function normalizeStructuredAgent(value, fallback = "worker") {
    return String(value ?? fallback).trim() || fallback;
}
function normalizeStructuredTask(spec, index, originalTask, previous) {
    const agent = normalizeStructuredAgent(spec?.agent ?? spec?.profile);
    return {
        agent,
        task: templateTask(spec?.task ?? spec?.description ?? originalTask, originalTask, previous),
        specialistId: typeof spec?.specialistId === "string" ? spec.specialistId : typeof spec?.specialist === "string" ? spec.specialist : undefined,
        executionProfile: typeof spec?.executionProfile === "string" ? spec.executionProfile : undefined,
        requiredChecks: Array.isArray(spec?.requiredChecks) ? spec.requiredChecks.map((item) => String(item ?? "").trim()).filter(Boolean) : typeof spec?.requiredChecks === "string" ? parseCheckCommands(spec.requiredChecks) : undefined,
        acceptanceCriteria: Array.isArray(spec?.acceptanceCriteria) ? spec.acceptanceCriteria.map((item) => String(item ?? "").trim()).filter(Boolean) : typeof spec?.acceptanceCriteria === "string" ? spec.acceptanceCriteria.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : undefined,
        reason: typeof spec?.reason === "string" ? spec.reason : undefined,
        output: typeof spec?.output === "string" ? spec.output : undefined,
        outputMode: spec?.outputMode === "file-only" ? "file-only" : spec?.outputMode === "inline" ? "inline" : undefined,
        index,
        raw: spec,
    };
}
function extractJsonObject(text) {
    const raw = String(text ?? "").trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1])
        return fenced[1].trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}
export function parseWorkflowAllocationPlan(value) {
    if (!value)
        return undefined;
    if (typeof value === "string") {
        const json = extractJsonObject(value);
        try {
            return JSON.parse(json);
        }
        catch (error) {
            throw new Error(`Invalid workflow allocation plan JSON: ${error.message}`);
        }
    }
    if (typeof value === "object" && !Array.isArray(value))
        return value;
    throw new Error("allocationPlan must be an object or JSON string");
}
export function validateWorkflowAllocationPlan(plan) {
    const input = plan && typeof plan === "object" && !Array.isArray(plan) ? plan : undefined;
    if (!input)
        throw new Error("allocationPlan must be an object");
    if (!Array.isArray(input.assignments) || input.assignments.length === 0)
        throw new Error("allocationPlan.assignments must be a non-empty array");
    const errors = [];
    input.assignments.forEach((assignment, index) => {
        if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) {
            errors.push(`assignments[${index}] must be an object`);
            return;
        }
        if (typeof assignment.task !== "string" && typeof assignment.description !== "string")
            errors.push(`assignments[${index}].task is required`);
        if (assignment.specialistId !== undefined && typeof assignment.specialistId !== "string")
            errors.push(`assignments[${index}].specialistId must be a string`);
        if (assignment.executionProfile !== undefined && typeof assignment.executionProfile !== "string")
            errors.push(`assignments[${index}].executionProfile must be a string`);
    });
    if (errors.length)
        throw new Error(`Invalid workflow allocation plan: ${errors.join("; ")}`);
    return input;
}
function normalizeAllocationPlan(plan, originalTask) {
    const input = validateWorkflowAllocationPlan(parseWorkflowAllocationPlan(plan));
    const assignments = input.assignments;
    return {
        taskKind: typeof input.taskKind === "string" ? input.taskKind : undefined,
        complexity: typeof input.complexity === "string" ? input.complexity : undefined,
        riskTier: typeof input.riskTier === "string" ? input.riskTier : typeof input.risk === "string" ? input.risk : undefined,
        domains: Array.isArray(input.domains) ? input.domains.map((item) => String(item ?? "").trim()).filter(Boolean) : undefined,
        assignments: assignments.map((assignment, index) => ({
            agent: assignment.agent ?? assignment.profile ?? assignment.role ?? "worker",
            task: assignment.task ?? assignment.description ?? originalTask,
            specialistId: assignment.specialistId ?? assignment.specialist,
            executionProfile: assignment.executionProfile ?? assignment.defaultProfile,
            requiredChecks: assignment.requiredChecks ?? assignment.checks ?? assignment.verification,
            acceptanceCriteria: assignment.acceptanceCriteria ?? assignment.acceptance ?? assignment.criteria,
            reason: assignment.reason,
            output: assignment.output,
            outputMode: assignment.outputMode,
            index,
            raw: assignment,
        })),
    };
}
function workflowOptionsFromAllocationPlan(task, options) {
    if (!options.allocationPlan)
        return options;
    const plan = normalizeAllocationPlan(options.allocationPlan, task);
    const tasks = options.tasks ?? plan.assignments;
    const checks = options.checks ?? options.commands ?? options.command ?? plan.assignments.flatMap((assignment) => parseCheckCommands(assignment.requiredChecks)).filter(Boolean);
    return {
        ...options,
        tasks,
        allocationPlan: plan,
        ...(checks && (!Array.isArray(checks) || checks.length > 0) ? { checks } : {}),
    };
}
function controllerAllocationPrompt(task) {
    return [
        "You are the GPT-5.5 SISO controller. Produce a specialist allocation plan as strict JSON only.",
        "Schema:",
        JSON.stringify({
            taskKind: "implementation|review|research|verification|planning",
            complexity: "single_domain|multi_domain|cross_repo",
            riskTier: "low|medium|high|critical",
            domains: ["domain"],
            assignments: [{
                    task: "bounded assignment",
                    specialistId: "specialist.auth.security",
                    executionProfile: "spark.worker",
                    requiredChecks: ["npm run smoke:example"],
                    acceptanceCriteria: ["observable outcome"],
                    reason: "why this specialist owns this slice",
                }],
        }),
        "Use available specialist ids such as specialist.auth.security, specialist.payments.stripe, specialist.backend.api, specialist.frontend.react, specialist.frontend.nextjs, specialist.database.persistence, specialist.security.appsec, specialist.agent-system.runtime, specialist.testing.verifier.",
        "Prefer 1-4 assignments. Do not include prose outside JSON.",
        "",
        "User task:",
        task,
    ].join("\n");
}
async function generateControllerAllocationPlan(task, options, signal) {
    if (typeof options.executeControllerAllocation === "function") {
        const output = await options.executeControllerAllocation(controllerAllocationPrompt(task), { task, options, signal });
        return {
            source: "test-hook",
            plan: parseWorkflowAllocationPlan(output),
        };
    }
    if (!nativeSubagentAvailable(options.ctx))
        return undefined;
    const decision = decisionForProfile("gpt55.planner", "SISO GPT-5.5 controller generates workflow allocation plan.");
    const bridged = await executeSpawnWithNativeSubagentBridge({
        task: controllerAllocationPrompt(task),
        cwd: options.cwd,
        ctx: options.ctx,
        timeoutMs: options.timeoutMs,
        background: false,
        noTools: true,
        decision,
        signal,
    });
    const text = bridged.details?.finalOutput ?? bridged.content?.map((item) => item.text ?? "").join("\n") ?? "";
    return {
        source: "native-subagent",
        controllerId: bridged.details?.id,
        plan: parseWorkflowAllocationPlan(text),
    };
}
async function maybeApplyControllerAllocation(task, options, signal) {
    const enabled = options.controllerAllocate === true || options.controllerAllocation === true || process.env.SISO_WORKFLOW_CONTROLLER_ALLOCATE === "1";
    if (!enabled || options.allocationPlan || Array.isArray(options.tasks) || Array.isArray(options.chain))
        return options;
    const generated = await generateControllerAllocationPlan(task, options, signal);
    if (!generated?.plan)
        return options;
    return {
        ...options,
        allocationPlan: generated.plan,
        controllerAllocation: {
            source: generated.source,
            status: "generated",
            ...(generated.controllerId ? { controllerId: generated.controllerId } : {}),
        },
    };
}
function parseCheckCommands(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 8);
    }
    return String(value ?? "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function resolveOutputPath(cwd, output) {
    return isAbsolute(output) ? output : resolve(cwd ?? process.cwd(), output);
}
function persistStructuredOutput(spec, child, cwd) {
    if (!spec.output)
        return child;
    const outputPath = resolveOutputPath(cwd, spec.output);
    const text = child.finalOutput ?? child.compactResult?.summary ?? "";
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${text.trimEnd()}\n`);
    const stats = statSync(outputPath);
    const reference = `Output saved to: ${outputPath} (${formatBytes(stats.size)}).`;
    if (spec.outputMode === "file-only") {
        return {
            ...child,
            finalOutput: reference,
            compactResult: {
                ...(child.compactResult ?? {}),
                summary: reference,
                files: [...new Set([...(child.compactResult?.files ?? []), outputPath])],
            },
        };
    }
    return {
        ...child,
        finalOutput: [child.finalOutput, reference].filter(Boolean).join("\n\n"),
        compactResult: {
            ...(child.compactResult ?? {}),
            files: [...new Set([...(child.compactResult?.files ?? []), outputPath])],
        },
    };
}
function expandTaskCounts(tasks, originalTask, previous) {
    const expanded = [];
    for (const spec of Array.isArray(tasks) ? tasks : []) {
        const count = Number.isInteger(spec?.count) && spec.count > 0 ? Math.min(spec.count, 12) : 1;
        for (let i = 0; i < count; i++) {
            expanded.push(normalizeStructuredTask({
                ...spec,
                task: count > 1 ? `${spec.task ?? originalTask}\n\nParallel copy: ${i + 1}/${count}` : spec?.task,
            }, expanded.length, originalTask, previous));
        }
    }
    return expanded;
}
function normalizeChainStages(chain, originalTask) {
    return (Array.isArray(chain) ? chain : [])
        .map((step) => {
        if (Array.isArray(step?.parallel)) {
            return { mode: "parallel", tasks: step.parallel };
        }
        return { mode: "single", tasks: [step] };
    })
        .filter((stage) => stage.tasks.length > 0);
}
function workflowRecipe(name, task) {
    const recipe = String(name ?? "").trim().toLowerCase();
    if (!recipe)
        return undefined;
    const scoped = (body) => `${body}\n\nScope: ${task}`;
    const recipes = {
        "parallel-review": {
            mode: "parallel",
            tasks: [
                { agent: "reviewer", task: scoped("Review the current work for correctness, regressions, and broken behavior. Inspect evidence directly. Do not edit.") },
                { agent: "reviewer", task: scoped("Review tests and validation quality. Identify missing checks and risky unverified claims. Do not edit.") },
                { agent: "reviewer", task: scoped("Review simplicity, maintainability, and unnecessary complexity. Prefer actionable findings. Do not edit.") },
            ],
        },
        "parallel-research": {
            mode: "parallel",
            tasks: [
                { agent: "scout", task: scoped("Build local codebase context and identify relevant files, patterns, and constraints."), output: "handoff/local-context.md", outputMode: "file-only" },
                { agent: "scout", task: scoped("Gather external ecosystem or documentation evidence relevant to the request."), output: "handoff/external-research.md", outputMode: "file-only" },
            ],
        },
        "context-build": {
            mode: "chain",
            chain: [{
                    parallel: [
                        { agent: "scout", task: scoped("Build request and scope context. Include assumptions, non-goals, and acceptance criteria."), output: "context-build/request-and-scope.md", outputMode: "file-only" },
                        { agent: "scout", task: scoped("Build codebase and patterns context. Follow imports, callers, tests, docs, and config."), output: "context-build/codebase-and-patterns.md", outputMode: "file-only" },
                        { agent: "reviewer", task: scoped("Build validation and risk context. Include likely tests/checks and failure modes."), output: "context-build/validation-and-risks.md", outputMode: "file-only" },
                    ],
                }],
        },
        "handoff-plan": {
            mode: "chain",
            chain: [
                {
                    parallel: [
                        { agent: "scout", task: scoped("Research transferable implementation ideas and external references."), output: "handoff/external-reference.md", outputMode: "file-only" },
                        { agent: "scout", task: scoped("Build local codebase context for implementing this safely."), output: "handoff/local-context.md", outputMode: "file-only" },
                        { agent: "planner", task: scoped("Compare evidence and propose implementation strategy."), output: "handoff/implementation-strategy.md", outputMode: "file-only" },
                    ],
                },
                { agent: "planner", task: "Read {previous} and synthesize the final handoff plan, likely files, constraints, non-goals, validation, risks, unresolved questions, and implementation-ready meta-prompt.", output: "handoff/final-handoff-plan.md", outputMode: "file-only" },
            ],
        },
        "cleanup-review": {
            mode: "parallel",
            tasks: [
                { agent: "reviewer", task: scoped("Review the current diff for unnecessary verbosity, duplication, and unclear names. Do not edit.") },
                { agent: "reviewer", task: scoped("Review the current diff for over-engineering and avoidable abstractions. Do not edit.") },
            ],
        },
    };
    return recipes[recipe] ? { recipe, ...recipes[recipe] } : undefined;
}
function applyWorkflowRecipe(task, options) {
    if (!options.recipe)
        return options;
    const recipe = workflowRecipe(options.recipe, task);
    if (!recipe)
        throw new Error(`Unknown SISO workflow recipe: ${options.recipe}`);
    return {
        ...options,
        recipe: recipe.recipe,
        ...(recipe.mode === "parallel" ? { tasks: options.tasks ?? recipe.tasks } : {}),
        ...(recipe.mode === "chain" ? { chain: options.chain ?? recipe.chain } : {}),
    };
}
async function mapConcurrent(items, concurrency, run) {
    const limit = Math.max(1, Math.min(Math.floor(concurrency || items.length || 1), items.length || 1, 12));
    const results = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: limit }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await run(items[index], index);
        }
    }));
    return results;
}
function outputFromWorkers(workers) {
    return workers
        .map((worker, index) => `Worker ${index + 1} (${worker.task.owner ?? worker.task.metadata?.agent ?? "agent"}): ${worker.child.finalOutput ?? worker.child.compactResult?.summary ?? ""}`.trim())
        .filter(Boolean)
        .join("\n\n");
}
function compactText(value, max = 240) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}
function workflowAllocationId(parent, options) {
    const explicit = String(options.allocationId ?? "").trim();
    return explicit || `alloc-${parent.id}`;
}
function assignmentIdFor(allocationId, index) {
    return `${allocationId}-assign-${index}`;
}
function stepIdFor(mode, stageIndex, workerIndex) {
    return `${mode}-stage-${stageIndex}-worker-${workerIndex}`;
}
function specialistIdForDecision(decision, fallback) {
    return String(decision?.profile ?? fallback ?? "worker").trim() || "worker";
}
function allocationMetadataForWorker(task, decision, fallback, options = {}) {
    const allocation = specialistAllocationForTask(task, {
        agent: fallback,
        specialistId: options.specialistId,
        domains: options.parentDomains ?? [],
    });
    return {
        specialistId: allocation.specialistId || specialistIdForDecision(decision, fallback),
        specialistAlias: allocation.specialistAlias,
        domain: allocation.primaryDomain,
        domains: allocation.domains,
        domainRatings: allocation.domainRatings,
        riskTier: allocation.riskTier,
        contextTier: allocation.contextTier,
        permissionProfile: allocation.permissionProfile,
        verification: allocation.verification,
        executionProfile: allocation.executionProfile,
        specialistScore: allocation.score,
    };
}
function verificationContractForWorkflow(options, checkCommands, maxVerifierIterations) {
    return {
        verifier: "minimax.verifier",
        verify: options.verify !== false,
        verifyIterations: maxVerifierIterations,
        requiredChecks: checkCommands,
        verifierTools: "none",
        rollbackMode: "explicit-only",
    };
}
function verifierAllocationMetadata(parent, allocationId, workflowMode, verificationContract, iteration) {
    return {
        kind: "workflow-verifier",
        workflowMode,
        parentTaskId: parent.id,
        allocationId,
        stepId: `verifier-${iteration}`,
        specialistId: "minimax.verifier",
        verificationContract,
    };
}
function formatCheckEvidence(checkIterations) {
    const latest = checkIterations.at(-1);
    if (!latest)
        return "";
    return [
        `Checks iteration ${latest.iteration}: ok=${latest.ok}`,
        ...latest.results.map((check) => [
            `- command=${check.command}`,
            `ok=${check.ok}`,
            `exit=${check.exitCode}`,
            check.blocked ? "blocked=true" : undefined,
            check.timedOut ? "timedOut=true" : undefined,
            check.summary ? `summary=${compactText(check.summary, 300)}` : undefined,
        ].filter(Boolean).join(" ")),
    ].join("\n");
}
function verifierPrompt(task, workers, council, checkIterations = []) {
    return [
        "Verifier task:",
        "Review the completed SISO workflow evidence. Do not edit files.",
        "Return one of: VERDICT: pass, VERDICT: needs_fix, or VERDICT: blocked.",
        council ? `Council summary: ${council.synthesis.summary}` : "",
        "",
        "Original task:",
        task,
        "",
        checkIterations.length ? "Required check evidence:" : "",
        formatCheckEvidence(checkIterations),
        checkIterations.length ? "" : "",
        "Worker evidence:",
        outputFromWorkers(workers),
    ].filter(Boolean).join("\n");
}
function missingRequirementFromVerifier(verifier) {
    const text = verifier?.finalOutput ?? verifier?.compactResult?.summary ?? "";
    const match = text.match(/missing requirement\s*:?\s*(.+)$/im);
    return compactText(match?.[1] ?? text, 220);
}
function failureSignatureFromVerifier(verifier, workers) {
    return [
        verifier?.verdict ?? "unknown",
        missingRequirementFromVerifier(verifier),
        workers.map((worker) => worker.child.id).join(","),
    ].filter(Boolean).join("|").slice(0, 500);
}
function latestFailedCheck(checkIterations) {
    const latest = checkIterations.at(-1);
    return latest?.results.find((check) => !check.ok);
}
function feedbackPacketFromVerifier(verifier, workers, checkIterations = []) {
    const failedCheck = latestFailedCheck(checkIterations);
    return {
        verdict: verifier?.verdict ?? "unknown",
        missingRequirement: failedCheck ? `Required check failed: ${compactText(failedCheck.summary || failedCheck.command, 180)}` : missingRequirementFromVerifier(verifier),
        failingCheckCommand: failedCheck?.command ?? null,
        failureSignature: failedCheck ? `check|${failedCheck.command}|${failedCheck.exitCode}|${compactText(failedCheck.summary, 160)}` : failureSignatureFromVerifier(verifier, workers),
        relevantFiles: [...new Set(workers.flatMap((worker) => worker.child.compactResult?.files ?? []))].slice(0, 8),
        suggestedNextAction: failedCheck ? "Address the failing required check, then rerun verification." : compactText(verifier?.compactResult?.next_action ?? "Run one bounded follow-up pass addressing the verifier feedback.", 220),
        freshCheckpointRequired: true,
    };
}
function feedbackWorkerPrompt(task, workers, verifier, iteration, checkIterations = []) {
    const packet = feedbackPacketFromVerifier(verifier, workers, checkIterations);
    return [
        `SISO workflow verifier feedback pass: ${iteration}`,
        "Do one bounded follow-up implementation pass that addresses the verifier feedback.",
        "Do not repeat completed work. Return compact evidence of what changed or why no change was needed.",
        "",
        "Original task:",
        task,
        "",
        "Verifier feedback:",
        `verdict=${packet.verdict}`,
        `missingRequirement=${packet.missingRequirement}`,
        packet.failingCheckCommand ? `failingCheckCommand=${packet.failingCheckCommand}` : undefined,
        `failureSignature=${packet.failureSignature}`,
        `relevantFiles=${packet.relevantFiles.join(",") || "none"}`,
        `suggestedNextAction=${packet.suggestedNextAction}`,
        `freshCheckpointRequired=${packet.freshCheckpointRequired}`,
        "",
        "Prior worker evidence:",
        outputFromWorkers(workers),
    ].filter(Boolean).join("\n");
}
function verdictFromVerifier(text) {
    if (/\bVERDICT:\s*pass\b/i.test(text) || /^\s*pass\b/i.test(text))
        return "pass";
    if (/\bVERDICT:\s*blocked\b/i.test(text) || /\bblocked\b/i.test(text))
        return "blocked";
    if (/\bVERDICT:\s*needs[_ -]?fix\b/i.test(text) || /\bneeds[_ -]?fix\b/i.test(text))
        return "needs_fix";
    return "unknown";
}
async function runStructuredWorker(input) {
    const decision = decisionForProfile(input.spec.executionProfile ?? input.spec.agent, `SISO structured workflow selected ${input.spec.executionProfile ?? input.spec.agent}.`);
    const specialist = allocationMetadataForWorker(input.spec.task, decision, input.spec.agent, {
        parentDomains: input.options.parentAllocation?.domains,
        specialistId: input.spec.specialistId,
    });
    const prompt = structuredWorkerPrompt({
        parent: input.parent,
        mode: input.mode,
        stageIndex: input.stageIndex,
        workerIndex: input.workerIndex,
        agent: input.spec.agent,
        task: input.spec.task,
        originalTask: input.originalTask,
        specialistId: input.spec.specialistId,
        executionProfile: input.spec.executionProfile,
        requiredChecks: input.spec.requiredChecks,
        acceptanceCriteria: input.spec.acceptanceCriteria,
        reason: input.spec.reason,
        council: input.council,
    });
    const workerTask = createSisoTask({
        cwd: input.options.cwd,
        title: `${input.mode === "chain" ? `Stage ${input.stageIndex} ` : ""}${input.spec.agent}: ${titleFrom(input.spec.task)}`,
        description: prompt,
        priority: "A",
        status: input.options.dryRun ? "ready" : "running",
        owner: decision.profile,
        blockedBy: [input.parent.id],
        metadata: {
            kind: "workflow-worker",
            workflowMode: input.mode,
            parentTaskId: input.parent.id,
            allocationId: input.options.allocationId,
            assignmentId: assignmentIdFor(input.options.allocationId, input.workerIndex),
            stepId: stepIdFor(input.mode, input.stageIndex, input.workerIndex),
            ...specialist,
            ownershipBoundary: compactText(input.spec.task, 260),
            ...(input.spec.executionProfile ? { requestedExecutionProfile: input.spec.executionProfile } : {}),
            ...(input.spec.requiredChecks?.length ? { requiredChecks: input.spec.requiredChecks } : {}),
            ...(input.spec.acceptanceCriteria?.length ? { acceptanceCriteria: input.spec.acceptanceCriteria } : {}),
            ...(input.spec.reason ? { allocationReason: input.spec.reason } : {}),
            stageIndex: input.stageIndex,
            workerIndex: input.workerIndex,
            agent: input.spec.agent,
            ...(input.spec.output ? { output: resolveOutputPath(input.options.cwd, input.spec.output) } : {}),
            ...(input.spec.outputMode ? { outputMode: input.spec.outputMode } : {}),
        },
    }).task;
    const child = persistStructuredOutput(input.spec, await runWorkflowWorkerViaNativeBridge(prompt, {
        cwd: input.options.cwd,
        timeoutMs: input.options.timeoutMs,
        dryRun: input.options.dryRun,
        background: input.options.background,
        noTools: input.options.noTools,
        ctx: input.options.ctx,
        decision,
        allocationMetadata: {
            ...workerTask.metadata,
            verificationContract: input.options.verificationContract,
        },
        signal: input.signal,
    }), input.options.cwd);
    return { task: updateWorkerTask(input.options.cwd, workerTask, child), child };
}
async function runFeedbackWorker(task, parent, workers, verifier, iteration, options, signal, checkIterations = []) {
    const decision = decisionForProfile("minimax.worker", "SISO workflow feedback worker addresses verifier needs_fix verdict.");
    const prompt = feedbackWorkerPrompt(task, workers, verifier, iteration, checkIterations);
    const workerTask = createSisoTask({
        cwd: options.cwd,
        title: `Verifier feedback ${iteration}: ${titleFrom(task)}`,
        description: prompt,
        priority: "A",
        status: options.dryRun ? "ready" : "running",
        owner: decision.profile,
        blockedBy: [parent.id],
        metadata: {
            kind: "workflow-feedback-worker",
            workflowMode: "feedback",
            parentTaskId: parent.id,
            allocationId: options.allocationId,
            assignmentId: assignmentIdFor(options.allocationId, workers.length + 1),
            stepId: `feedback-${iteration}`,
            specialistId: "minimax.feedback",
            ownershipBoundary: compactText(`Address verifier feedback for iteration ${iteration}: ${feedbackPacketFromVerifier(verifier, workers, checkIterations).missingRequirement}`, 260),
            workerIndex: workers.length + 1,
            verifierId: verifier?.id,
            verifierVerdict: verifier?.verdict,
            feedbackIteration: iteration,
        },
    }).task;
    const child = await runWorkflowWorkerViaNativeBridge(prompt, {
        ctx: options.ctx,
        cwd: options.cwd,
        timeoutMs: options.timeoutMs,
        dryRun: options.dryRun,
        background: options.background,
        noTools: options.noTools,
        decision,
        allocationMetadata: {
            ...workerTask.metadata,
            verificationContract: options.verificationContract,
        },
        signal,
    });
    return { task: updateWorkerTask(options.cwd, workerTask, child), child };
}
function runWorkflowChecks(commands, options, iteration) {
    if (!commands.length)
        return undefined;
    const results = commands.map((command) => ({
        command,
        ...runCheck({
            cwd: options.cwd,
            command,
            timeoutMs: options.checkTimeoutMs ?? options.timeoutMs,
        }),
    }));
    return {
        iteration,
        ok: results.every((check) => check.ok),
        results,
    };
}
function createWorkflowCheckpoint(options, iteration, reason) {
    const status = workspaceStatus({ cwd: options.cwd });
    const diffStat = workspaceDiff({ cwd: options.cwd, stat: true, maxChars: 2000 });
    return {
        iteration,
        reason,
        createdAt: new Date().toISOString(),
        rollbackMode: "explicit-only",
        statusOk: status.ok,
        statusText: compactText(status.text, 1000),
        diffStatOk: diffStat.ok,
        diffStatText: compactText(diffStat.text, 1200),
    };
}
function writeWorkflowFlightRecorder(options, payload) {
    const root = resolve(options.cwd ?? process.cwd());
    const id = String(options.autopilotRunId || options.flightRunId || payload.taskId || `workflow-${Date.now()}`).replace(/[^A-Za-z0-9._-]+/g, "-");
    const dir = join(root, ".siso", "flight-runs");
    const path = join(dir, `${id}.json`);
    const record = {
        action: "workflow-flight-recorder",
        id,
        writtenAt: new Date().toISOString(),
        ...payload,
    };
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    return { id, path, records: ["workflow", "workers", "checks", "verifierVerdicts", "feedbackPackets", "checkpoints", "outcome"] };
}
function latestCheckFailure(checkIterations) {
    return checkIterations.at(-1)?.results.find((check) => !check.ok);
}
function workflowLoopOutcome(baseStatus, verifier, verifierIterations, feedbackPackets, verifySkipped, checkIterations = []) {
    if (verifySkipped)
        return "skipped";
    if (baseStatus !== "completed")
        return "worker_failed";
    const failedCheck = latestCheckFailure(checkIterations);
    if (failedCheck?.blocked)
        return "check_blocked";
    if (failedCheck)
        return "checks_failed_exhausted";
    if (!verifier)
        return "skipped";
    if (verifier.verdict === "pass")
        return feedbackPackets.length > 0 ? "passed_after_feedback" : "passed";
    if (verifier.verdict === "needs_fix")
        return "needs_fix_exhausted";
    if (verifier.verdict === "blocked")
        return "blocked";
    return "verifier_unknown";
}
function finalWorkflowStatus(baseStatus, loopOutcome) {
    if (baseStatus === "planned" || baseStatus === "background")
        return baseStatus;
    if (baseStatus !== "completed")
        return baseStatus;
    if (loopOutcome === "blocked" || loopOutcome === "needs_fix_exhausted" || loopOutcome === "check_blocked" || loopOutcome === "checks_failed_exhausted" || loopOutcome === "verifier_unknown" || loopOutcome === "worker_failed")
        return "failed";
    return "completed";
}
function parentStatusFromWorkflow(status) {
    if (status === "completed" || status === "planned")
        return "done";
    if (status === "background" || status === "partial")
        return "running";
    return "failed";
}
async function runParallelStructuredWorkflow(originalTask, parent, council, options, signal) {
    const specs = expandTaskCounts(options.tasks, originalTask, "");
    const concurrency = Math.max(1, Math.min(Math.floor(options.concurrency ?? specs.length), specs.length || 1, 12));
    const workers = await mapConcurrent(specs, concurrency, (spec, index) => runStructuredWorker({
        mode: "parallel",
        parent,
        originalTask,
        spec,
        stageIndex: 1,
        workerIndex: index + 1,
        council,
        options,
        signal,
    }));
    return {
        mode: "parallel",
        stages: [{ index: 1, mode: "parallel", workers: workers.map((worker) => worker.task.id) }],
        workers,
    };
}
async function runChainStructuredWorkflow(originalTask, parent, council, options, signal) {
    const stages = [];
    const workers = [];
    let previous = "";
    const chainStages = normalizeChainStages(options.chain, originalTask);
    for (let stageIndex = 0; stageIndex < chainStages.length; stageIndex++) {
        const stage = chainStages[stageIndex];
        const specs = expandTaskCounts(stage.tasks, originalTask, previous);
        const concurrency = stage.mode === "parallel"
            ? Math.max(1, Math.min(Math.floor(options.concurrency ?? specs.length), specs.length || 1, 12))
            : 1;
        const stageWorkers = await mapConcurrent(specs, concurrency, (spec, index) => runStructuredWorker({
            mode: "chain",
            parent,
            originalTask,
            spec,
            stageIndex: stageIndex + 1,
            workerIndex: workers.length + index + 1,
            council,
            options,
            signal,
        }));
        workers.push(...stageWorkers);
        stages.push({ index: stageIndex + 1, mode: stage.mode, workers: stageWorkers.map((worker) => worker.task.id) });
        previous = outputFromWorkers(stageWorkers);
    }
    return { mode: "chain", stages, workers };
}
function updateWorkerTask(cwd, task, child) {
    const terminalStatus = child.status === "planned"
        ? "ready"
        : child.status === "completed"
            ? "done"
            : child.status === "background"
                ? "running"
                : "failed";
    return updateSisoTask({
        cwd,
        id: task.id,
        status: terminalStatus,
        metadata: {
            ...(task.metadata ?? {}),
            childId: child.id,
            childStatus: child.status,
            childTokens: child.tokens.totalTokens,
        },
    }).task;
}
export async function runWorkflow(task, options = {}, signal) {
    options = applyWorkflowRecipe(task, options);
    options = await maybeApplyControllerAllocation(task, options, signal);
    options = workflowOptionsFromAllocationPlan(task, options);
    const hasExplicitTasks = Array.isArray(options.tasks) && options.tasks.length > 0;
    const hasExplicitChain = Array.isArray(options.chain) && options.chain.length > 0;
    const workflowMode = hasExplicitChain ? "chain" : hasExplicitTasks ? "parallel" : "fanout";
    const checkCommands = parseCheckCommands(options.checks ?? options.commands ?? options.command);
    const maxVerifierIterations = Math.max(1, Math.min(Math.floor(options.verifyIterations ?? options.verifierIterations ?? process.env.SISO_WORKFLOW_VERIFY_ITERATIONS ?? 2), 4));
    const parent = createSisoTask({
        cwd: options.cwd,
        title: `Workflow: ${titleFrom(task)}`,
        description: task,
        priority: "A",
        status: options.dryRun ? "ready" : "running",
        owner: "siso.workflow",
        metadata: { kind: "workflow", workflowMode },
    }).task;
    const allocationId = workflowAllocationId(parent, options);
    const parentAllocation = specialistAllocationForTask(task, { agent: "planner" });
    const verificationContract = verificationContractForWorkflow(options, checkCommands, maxVerifierIterations);
    options = { ...options, allocationId, verificationContract, parentAllocation };
    const council = options.council === false
        ? undefined
        : await runCouncil(task, {
            ctx: options.ctx,
            cwd: options.cwd,
            mode: "compare",
            maxMembers: 2,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            noTools: options.noTools,
        }, signal);
    const structured = hasExplicitChain
        ? await runChainStructuredWorkflow(task, parent, council, options, signal)
        : hasExplicitTasks
            ? await runParallelStructuredWorkflow(task, parent, council, options, signal)
            : undefined;
    const workerCount = structured ? structured.workers.length : Math.max(1, Math.min(Math.floor(options.workerCount ?? 2), 6));
    const workerDecision = decisionForProfile("minimax.worker", "SISO workflow fans execution out to cheap MiniMax workers.");
    const workers = structured?.workers ?? await Promise.all(Array.from({ length: workerCount }, async (_, index) => {
        const specialist = allocationMetadataForWorker(task, workerDecision, "minimax.worker", {
            parentDomains: parentAllocation.domains,
        });
        const workerTask = createSisoTask({
            cwd: options.cwd,
            title: `Worker ${index + 1}: ${titleFrom(task)}`,
            description: workerPrompt(task, parent, index + 1, council),
            priority: "A",
            status: options.dryRun ? "ready" : "running",
            owner: "minimax.worker",
            blockedBy: [parent.id],
            metadata: {
                kind: "workflow-worker",
                parentTaskId: parent.id,
                allocationId,
                assignmentId: assignmentIdFor(allocationId, index + 1),
                stepId: stepIdFor("fanout", 1, index + 1),
                ...specialist,
                ownershipBoundary: compactText(task, 260),
                workerIndex: index + 1,
            },
        }).task;
        const child = await runWorkflowWorkerViaNativeBridge(workerPrompt(task, parent, index + 1, council), {
            ctx: options.ctx,
            cwd: options.cwd,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            background: options.background,
            noTools: options.noTools,
            decision: workerDecision,
            allocationMetadata: {
                ...workerTask.metadata,
                verificationContract,
            },
            signal,
        });
        return { task: updateWorkerTask(options.cwd, workerTask, child), child };
    }));
    const status = statusFrom(workers, options.dryRun, options.background);
    const verifierIterations = [];
    const feedbackPackets = [];
    const failureSignatures = [];
    const reentryWorkerIds = [];
    const checkIterations = [];
    const checkpoints = [];
    const firstCheck = runWorkflowChecks(checkCommands, options, 1);
    if (firstCheck)
        checkIterations.push(firstCheck);
    let verifier = firstCheck && !firstCheck.ok ? {
        id: `check-${Date.now().toString(36)}`,
        profile: "required-checks",
        status: "completed",
        verdict: "needs_fix",
        tokens: { input: 0, output: 0, totalTokens: 0 },
        compactResult: {
            summary: "Required checks failed.",
            findings: firstCheck.results.filter((check) => !check.ok).map((check) => `${check.command}: ${compactText(check.summary, 160)}`),
            files: [],
            next_action: "Address the failing required checks before verifier review.",
        },
        finalOutput: firstCheck.results.filter((check) => !check.ok).map((check) => `${check.command}\n${check.summary}`).join("\n\n"),
        toolCalls: 0,
        eventCount: 0,
    } : await runWorkflowVerifierViaNativeBridge(task, workers, council, {
        cwd: options.cwd,
        ctx: options.ctx,
        timeoutMs: options.timeoutMs,
        dryRun: options.dryRun,
        background: options.background,
        verify: options.verify,
        checkIterations,
        allocationMetadata: verifierAllocationMetadata(parent, allocationId, workflowMode, verificationContract, 1),
        signal,
    });
    if (verifier)
        verifierIterations.push(verifier);
    for (let iteration = 1; verifier?.verdict === "needs_fix" && !latestFailedCheck(checkIterations)?.blocked && iteration < maxVerifierIterations; iteration++) {
        const feedbackPacket = feedbackPacketFromVerifier(verifier, workers, checkIterations);
        feedbackPackets.push(feedbackPacket);
        failureSignatures.push(feedbackPacket.failureSignature);
        checkpoints.push(createWorkflowCheckpoint(options, iteration, feedbackPacket.failureSignature));
        const feedbackWorker = await runFeedbackWorker(task, parent, workers, verifier, iteration, options, signal, checkIterations);
        workers.push(feedbackWorker);
        reentryWorkerIds.push(feedbackWorker.child.id);
        const check = runWorkflowChecks(checkCommands, options, iteration + 1);
        if (check)
            checkIterations.push(check);
        verifier = check && !check.ok ? {
            id: `check-${Date.now().toString(36)}-${iteration}`,
            profile: "required-checks",
            status: "completed",
            verdict: "needs_fix",
            tokens: { input: 0, output: 0, totalTokens: 0 },
            compactResult: {
                summary: "Required checks failed.",
                findings: check.results.filter((item) => !item.ok).map((item) => `${item.command}: ${compactText(item.summary, 160)}`),
                files: [],
                next_action: "Address the failing required checks before verifier review.",
            },
            finalOutput: check.results.filter((item) => !item.ok).map((item) => `${item.command}\n${item.summary}`).join("\n\n"),
            toolCalls: 0,
            eventCount: 0,
        } : await runWorkflowVerifierViaNativeBridge(task, workers, council, {
            cwd: options.cwd,
            ctx: options.ctx,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            background: options.background,
            verify: options.verify,
            checkIterations,
            allocationMetadata: verifierAllocationMetadata(parent, allocationId, workflowMode, verificationContract, iteration + 1),
            signal,
        });
        if (verifier)
            verifierIterations.push(verifier);
    }
    if (verifier?.verdict === "needs_fix") {
        const feedbackPacket = feedbackPacketFromVerifier(verifier, workers, checkIterations);
        feedbackPackets.push(feedbackPacket);
        failureSignatures.push(feedbackPacket.failureSignature);
    }
    const loopOutcome = workflowLoopOutcome(status, verifier, verifierIterations, feedbackPackets, verifierIterations.length === 0 && checkIterations.length === 0, checkIterations);
    const finalStatus = finalWorkflowStatus(status, loopOutcome);
    const parentStatus = parentStatusFromWorkflow(finalStatus);
    const flightRecorderPayload = {
        taskId: parent.id,
        status: finalStatus,
        loopOutcome,
        workerIds: workers.map((worker) => worker.child.id),
        verifierVerdicts: verifierIterations.map((item) => item.verdict),
        verifierIds: verifierIterations.map((item) => item.id),
        feedbackPackets,
        failureSignatures,
        reentryWorkerIds,
        checksOk: checkIterations.length ? checkIterations.at(-1)?.ok === true : undefined,
        checkIterations: checkIterations.map((iteration) => ({
            iteration: iteration.iteration,
            ok: iteration.ok,
            results: iteration.results.map((check) => ({
                command: check.command,
                ok: check.ok,
                blocked: check.blocked,
                exitCode: check.exitCode,
                elapsedMs: check.elapsedMs,
                timedOut: check.timedOut,
                summary: compactText(check.summary, 500),
            })),
        })),
        checkpoints,
    };
    const flightRecorder = writeWorkflowFlightRecorder(options, flightRecorderPayload);
    const updatedParent = updateSisoTask({
        cwd: options.cwd,
        id: parent.id,
        status: parentStatus,
        metadata: {
            ...(parent.metadata ?? {}),
            allocationId,
            domains: parentAllocation.domains,
            specialistIds: parentAllocation.specialistIds,
            specialistAliases: parentAllocation.specialistAliases,
            riskTier: parentAllocation.riskTier,
            ...(options.allocationPlan ? { allocationPlan: options.allocationPlan } : {}),
            ...(options.controllerAllocation ? { controllerAllocation: options.controllerAllocation } : {}),
            verificationContract,
            workflowStatus: finalStatus,
            workflowMode,
            ...(options.recipe ? { recipe: options.recipe } : {}),
            councilStatus: council?.status ?? "skipped",
            verifierStatus: verifier?.status ?? "skipped",
            verifierVerdict: verifier?.verdict ?? "skipped",
            verifierIterations: verifierIterations.length,
            verifierVerdicts: verifierIterations.map((item) => item.verdict),
            verifierIds: verifierIterations.map((item) => item.id),
            feedbackPackets,
            failureSignatures,
            reentryWorkerIds,
            checkIterations,
            checksOk: checkIterations.length ? checkIterations.at(-1)?.ok === true : undefined,
            requiredChecks: checkCommands,
            failedCheckCommand: latestCheckFailure(checkIterations)?.command,
            checkpoints,
            flightRecorder,
            maxVerifierIterations,
            loopOutcome,
            stages: structured?.stages ?? [{ index: 1, mode: "fanout", workers: workers.map((worker) => worker.task.id) }],
            workerCount: workers.length,
            childIds: workers.map((worker) => worker.child.id),
        },
    }).task;
    return {
        task: updatedParent,
        mode: workflowMode,
        allocationId,
        verificationContract,
        ...(options.allocationPlan ? { allocationPlan: options.allocationPlan } : {}),
        ...(options.controllerAllocation ? { controllerAllocation: options.controllerAllocation } : {}),
        ...(options.recipe ? { recipe: options.recipe } : {}),
        stages: structured?.stages ?? [{ index: 1, mode: "fanout", workers: workers.map((worker) => worker.task.id) }],
        council,
        verifier,
        verifierIterations,
        feedbackPackets,
        failureSignatures,
        reentryWorkerIds,
        checkIterations,
        checksOk: checkIterations.length ? checkIterations.at(-1)?.ok === true : undefined,
        requiredChecks: checkCommands,
        failedCheckCommand: latestCheckFailure(checkIterations)?.command,
        checkpoints,
        flightRecorder,
        maxVerifierIterations,
        loopOutcome,
        workers,
        status: finalStatus,
        totalTokens: (council?.totalTokens ?? 0) + verifierIterations.reduce((sum, item) => sum + item.tokens.totalTokens, 0) + workers.reduce((sum, worker) => sum + worker.child.tokens.totalTokens, 0),
        eventCount: (council?.eventCount ?? 0) + verifierIterations.reduce((sum, item) => sum + (item.eventCount ?? 0), 0) + workers.reduce((sum, worker) => sum + (worker.child.eventCount ?? 0), 0),
    };
}
async function runWorkflowVerifierViaNativeBridge(task, workers, council, options) {
    const shouldVerify = options.verify === true || (options.verify !== false && !options.dryRun && !options.background && nativeSubagentAvailable(options.ctx));
    if (!shouldVerify)
        return undefined;
    const decision = decisionForProfile("minimax.verifier", "SISO supervisor verifies workflow output after worker completion.");
    const bridged = await executeSpawnWithNativeSubagentBridge({
        task: verifierPrompt(task, workers, council, options.checkIterations ?? []),
        cwd: options.cwd,
        ctx: options.ctx,
        timeoutMs: options.timeoutMs,
        background: false,
        noTools: true,
        decision,
        allocationMetadata: options.allocationMetadata,
        signal: options.signal,
    });
    const text = bridged.content.map((item) => item.text).join("\n");
    const details = bridged.details && typeof bridged.details === "object" ? bridged.details : {};
    const compactResult = details.compactResult && typeof details.compactResult === "object"
        ? details.compactResult
        : {
            summary: text.replace(/\s+/g, " ").trim().slice(0, 240) || "Workflow verifier completed.",
            findings: [],
            files: [],
            next_action: "Use the verifier verdict to decide whether to continue.",
        };
    const tokens = details.tokens && typeof details.tokens === "object" ? tokensFromUsage(details.tokens) : { input: 0, output: 0, totalTokens: 0 };
    return {
        id: typeof details.id === "string" ? details.id : `verifier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        profile: decision.profile,
        status: nativeStatus(details),
        verdict: verdictFromVerifier(details.finalOutput ?? text),
        tokens,
        compactResult,
        finalOutput: typeof details.finalOutput === "string" ? details.finalOutput : text,
        toolCalls: typeof details.toolCalls === "number" ? details.toolCalls : 0,
        eventCount: typeof details.eventCount === "number" ? details.eventCount : 0,
    };
}
async function runWorkflowWorkerViaNativeBridge(task, options) {
    if (options.dryRun || options.background || process.env.SISO_WORKFLOW_RUNTIME === "legacy") {
        return publicSpawnResult(await runProfileSpawn(task, {
            cwd: options.cwd,
            ctx: options.ctx,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            background: options.background,
            noTools: options.noTools,
            decision: options.decision,
            allocationMetadata: options.allocationMetadata,
        }, options.signal));
    }
    const bridged = await executeSpawnWithNativeSubagentBridge({
        task,
        cwd: options.cwd,
        ctx: options.ctx,
        timeoutMs: options.timeoutMs,
        background: false,
        noTools: options.noTools,
        decision: options.decision,
        allocationMetadata: options.allocationMetadata,
        signal: options.signal,
    });
    const text = bridged.content.map((item) => item.text).join("\n");
    const details = bridged.details && typeof bridged.details === "object" ? bridged.details : {};
    const compactResult = details.compactResult && typeof details.compactResult === "object"
        ? details.compactResult
        : {
            summary: text.replace(/\s+/g, " ").trim().slice(0, 240) || "Native workflow worker completed.",
            findings: [],
            files: [],
            next_action: "Use the native worker result if relevant.",
        };
    const tokens = details.tokens && typeof details.tokens === "object" ? tokensFromUsage(details.tokens) : { input: 0, output: 0, totalTokens: 0 };
    return {
        id: typeof details.id === "string" ? details.id : `native-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        status: nativeStatus(details),
        adapter: details.adapter === "native-subagent" ? "native-subagent" : "pi",
        decision: options.decision,
        command: "subagent",
        args: [],
        cwd: options.cwd ?? process.cwd(),
        durationMs: typeof details.durationMs === "number" ? details.durationMs : 0,
        timedOut: false,
        finalOutput: typeof details.finalOutput === "string" && details.finalOutput.trim() ? details.finalOutput : text,
        compactResult,
        rawOutputChars: typeof details.rawOutputChars === "number" ? details.rawOutputChars : text.length,
        truncatedOutputChars: typeof details.truncatedOutputChars === "number" ? details.truncatedOutputChars : 0,
        tokens,
        toolCalls: typeof details.toolCalls === "number" ? details.toolCalls : 0,
        eventCount: typeof details.eventCount === "number" ? details.eventCount : 0,
        stderrPreview: "",
    };
}
function nativeStatus(native) {
    const status = native.status;
    if (status === "completed" || status === "background" || status === "failed" || status === "timeout" || status === "aborted" || status === "planned" || status === "unsupported")
        return status;
    return "completed";
}
function tokensFromNative(native) {
    const resultTokens = Array.isArray(native.results)
        ? native.results.reduce((sum, item) => {
            const result = item && typeof item === "object" ? item : {};
            return sum + tokensFromUsage(result.usage).totalTokens;
        }, 0)
        : 0;
    if (resultTokens > 0)
        return { input: 0, output: 0, totalTokens: resultTokens };
    return tokensFromUsage(native.usage ?? native.tokens);
}
function tokensFromUsage(value) {
    const usage = value && typeof value === "object" ? value : {};
    const input = typeof usage.input === "number" ? usage.input : typeof usage.inputTokens === "number" ? usage.inputTokens : 0;
    const output = typeof usage.output === "number" ? usage.output : typeof usage.outputTokens === "number" ? usage.outputTokens : 0;
    const totalTokens = typeof usage.totalTokens === "number" ? usage.totalTokens : typeof usage.total === "number" ? usage.total : input + output;
    return { input, output, totalTokens };
}
export function formatWorkflowResult(result) {
    return [
        `workflow_status=${result.status}`,
        `workflow_mode=${result.mode ?? result.task.metadata?.workflowMode ?? "fanout"}`,
        result.recipe ? `recipe=${result.recipe}` : "",
        `allocation_id=${result.allocationId ?? result.task.metadata?.allocationId ?? "none"}`,
        `parent_task=${result.task.id}`,
        `total_tokens=${result.totalTokens}`,
        `council_status=${result.council?.status ?? "skipped"}`,
        `verifier_status=${result.verifier?.status ?? "skipped"}`,
        `verifier_verdict=${result.verifier?.verdict ?? "skipped"}`,
        `verifier_iterations=${result.verifierIterations?.length ?? 0}`,
        `loop_outcome=${result.loopOutcome ?? "unknown"}`,
        `feedback_packets=${result.feedbackPackets?.length ?? 0}`,
        `reentry_workers=${result.reentryWorkerIds?.length ?? 0}`,
        `checkpoints=${result.checkpoints?.length ?? 0}`,
        `check_iterations=${result.checkIterations?.length ?? 0}`,
        `checks_ok=${result.checksOk ?? "skipped"}`,
        result.failedCheckCommand ? `failed_check=${result.failedCheckCommand}` : "",
        `workers=${result.workers.length}`,
        `stages=${result.stages?.length ?? 1}`,
        `parent_status=${result.task.status}`,
        `parent_profile=${result.task.profile}`,
        result.council ? `council_members=${result.council.members.length}` : "",
        ...result.workers.map((worker, index) => [
            `worker_${index + 1}_task=${worker.task.id}`,
            `status=${worker.child.status}`,
            `owner=${worker.task.owner ?? "none"}`,
            `profile=${worker.child.decision.profile}`,
            `tokens=${worker.child.tokens.totalTokens}`,
            `child_id=${worker.child.id}`,
            `record=${worker.child.runRecordPath ? basename(worker.child.runRecordPath) : "none"}`,
        ].join(" ")),
    ].filter(Boolean).join("\n");
}
