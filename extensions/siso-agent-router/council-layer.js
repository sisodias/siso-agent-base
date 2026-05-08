import { PROFILE_REGISTRY } from "./profile-registry.js";
import { compactChildResult, publicSpawnResult, runProfileSpawn } from "./spawn-layer.js";
import { executeSpawnWithNativeSubagentBridge } from "./native-subagent-bridge.js";
const DEFAULT_MEMBERS = ["minimax.scout", "minimax.verifier", "gpt54mini.scout"];
const REVIEW_MEMBERS = ["minimax.scout", "minimax.verifier", "spark.reviewer"];
const SYNTHESIS_MEMBER = "gpt55.oracle";
function routeKind(role) {
    if (role === "rescue")
        return "rescue";
    return role;
}
export function decisionForProfile(profileId, rationale = "Council member selected by SISO profile registry.") {
    const profile = PROFILE_REGISTRY[profileId];
    if (!profile)
        throw new Error(`Unknown SISO council profile: ${profileId}`);
    return {
        kind: routeKind(profile.role),
        profile: profile.id,
        lane: profile.lane,
        model: profile.model,
        tools: profile.tools,
        contextTier: profile.defaultContext,
        statePolicy: profile.statePolicy,
        permissionProfile: profile.permissionProfile,
        inheritContext: profile.defaultContext === "full",
        needsWorktree: profile.statePolicy === "sprint-worktree",
        maxParallelAgents: profile.maxParallelAgents,
        rationale,
    };
}
function profilesFor(mode, members, maxMembers) {
    const selected = members?.length ? members : mode === "review" ? REVIEW_MEMBERS : DEFAULT_MEMBERS;
    return [...new Set(selected)].slice(0, Math.max(1, maxMembers));
}
function memberPrompt(task, mode, profile, rubric) {
    return [
        "You are one member of a SISO Pi council.",
        "Give an independent answer; do not coordinate with other council members.",
        "Surface assumptions. Prefer the simplest workable design. Make claims verifiable.",
        `Council mode: ${mode}`,
        `Council profile: ${profile}`,
        rubric ? `Rubric: ${rubric}` : "",
        "",
        "Task:",
        task,
    ].filter(Boolean).join("\n");
}
function synthesisFromMembers(task, members) {
    const completed = members.filter((member) => member.status === "completed");
    const summaries = completed.map((member) => `${member.profile}: ${member.result.summary}`);
    const findings = members.flatMap((member) => member.result.findings.map((finding) => `${member.profile}: ${finding}`)).slice(0, 5);
    const files = [...new Set(members.flatMap((member) => member.result.files))].slice(0, 8);
    return {
        summary: summaries.length ? `Council covered ${completed.length}/${members.length} members for: ${task.slice(0, 120)}` : "Council produced no completed member answers.",
        findings,
        files,
        next_action: completed.length === members.length ? "Parent should synthesize or execute the chosen path." : "Inspect failed council members before relying on the result.",
    };
}
function statusFor(members, dryRun) {
    if (dryRun)
        return "planned";
    if (members.length === 0)
        return "failed";
    const completed = members.filter((member) => member.status === "completed").length;
    if (completed === members.length)
        return "completed";
    if (completed > 0)
        return "partial";
    return "failed";
}
export async function runCouncil(task, options = {}, signal) {
    const mode = options.mode ?? "compare";
    const maxMembers = options.maxMembers ?? 3;
    const profiles = profilesFor(mode, options.members, maxMembers);
    const runs = await Promise.all(profiles.map(async (profileId) => {
        const decision = decisionForProfile(profileId);
        const result = await runCouncilMemberViaNativeBridge(memberPrompt(task, mode, profileId, options.rubric), decision, options, signal);
        const profile = PROFILE_REGISTRY[profileId];
        return {
            profile: profileId,
            lane: decision.lane,
            model: decision.model,
            role: profile.role,
            status: result.status,
            childId: result.id,
            tokens: result.tokens,
            result: result.compactResult,
            ...(result.runRecordPath ? { recordPath: result.runRecordPath } : {}),
            ...(result.events ? { events: result.events } : {}),
        };
    }));
    const members = mode === "synthesize" && !options.dryRun
        ? [...runs, await runSynthesisMember(task, runs, options, signal)]
        : runs;
    return {
        mode,
        task,
        status: statusFor(members, options.dryRun),
        members,
        synthesis: synthesisFromMembers(task, members),
        totalTokens: members.reduce((sum, member) => sum + member.tokens.totalTokens, 0),
        events: members.flatMap((member) => member.events ?? []),
    };
}
async function runSynthesisMember(task, members, options, signal) {
    const decision = decisionForProfile(SYNTHESIS_MEMBER, "Council synthesis escalates to GPT-5.5 oracle only after cheap member fan-out.");
    const prompt = [
        "You are the SISO council chair.",
        "Synthesize the member findings into one decision. Keep it compact and actionable.",
        "",
        "Original task:",
        task,
        "",
        "Member results:",
        JSON.stringify(members.map((member) => ({
            profile: member.profile,
            status: member.status,
            summary: member.result.summary,
            findings: member.result.findings,
            next_action: member.result.next_action,
        }))),
    ].join("\n");
    const result = await runCouncilMemberViaNativeBridge(prompt, decision, options, signal);
    const profile = PROFILE_REGISTRY[SYNTHESIS_MEMBER];
    return {
        profile: SYNTHESIS_MEMBER,
        lane: decision.lane,
        model: decision.model,
        role: profile.role,
        status: result.status,
        childId: result.id,
        tokens: result.tokens,
        result: result.compactResult,
        ...(result.runRecordPath ? { recordPath: result.runRecordPath } : {}),
        ...(result.events ? { events: result.events } : {}),
    };
}
async function runCouncilMemberViaNativeBridge(task, decision, options, signal) {
    if (options.dryRun || process.env.SISO_COUNCIL_RUNTIME !== "native-pi-process") {
        return publicSpawnResult(await runProfileSpawn(task, {
            ...(options.cwd ? { cwd: options.cwd } : {}),
            ...(typeof options.timeoutMs === "number" ? { timeoutMs: options.timeoutMs } : {}),
            ...(typeof options.dryRun === "boolean" ? { dryRun: options.dryRun } : {}),
            ...(typeof options.noTools === "boolean" ? { noTools: options.noTools } : {}),
            decision,
        }, signal));
    }
    const bridged = await executeSpawnWithNativeSubagentBridge({
        task,
        cwd: options.cwd,
        timeoutMs: options.timeoutMs,
        background: false,
        noTools: options.noTools,
        decision,
        signal,
    });
    const details = bridged.details && typeof bridged.details === "object" ? bridged.details : {};
    const native = details.native && typeof details.native === "object" ? details.native : {};
    const text = bridged.content.map((item) => item.text).join("\n");
    const compactResult = compactChildResult(text);
    const tokens = tokensFromNative(native);
    return {
        id: typeof native.id === "string" ? native.id : `native-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        status: nativeStatus(native),
        tokens,
        compactResult,
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
export function formatCouncilResult(result) {
    const compact = (value, max = 120) => {
        const text = String(value ?? "none");
        return text.length <= max ? text : `${text.slice(0, max)}...`;
    };
    return [
        `council_status=${result.status}`,
        `mode=${result.mode}`,
        `members=${result.members.length}`,
        `total_tokens=${result.totalTokens}`,
        ...result.members.map((member, index) => [
            `member_${index + 1}_profile=${member.profile}`,
            `status=${member.status}`,
            `tokens=${member.tokens.totalTokens}`,
            `child_id=${member.childId}`,
        ].join(" ")),
    ].join("\n");
}
