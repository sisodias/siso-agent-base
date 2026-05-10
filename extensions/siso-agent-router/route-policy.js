import { PROFILE_REGISTRY } from "./profile-registry.js";
import { rankSpecialistsForTask } from "./specialist-registry.js";
const READ_PATTERNS = [
    /\b(find|search|inspect|look\s+at|research|summari[sz]e|explain|list|scan)\b/i,
    /\bwhere\s+is\b/i,
];
const TEST_PATTERNS = [
    /\b(test|verify|lint|typecheck|build|smoke|check)\b/i,
    /\bdoes\s+it\s+work\b/i,
];
const EDIT_PATTERNS = [
    /\b(fix|implement|add|change|modify|patch|update|wire|refactor|migrate|rewrite)\b/i,
    /\bwrite\s+(code|the|a)\b/i,
];
const CREATE_PATTERNS = [
    /\b(create|make|build|harden)\b/i,
];
const REVIEW_PATTERNS = [
    /\b(review|audit|security|regression|risk|critique|adversarial)\b/i,
];
const PLAN_PATTERNS = [
    /\b(plan|architecture|design|spec|roadmap|strategy|task board|system)\b/i,
    /\bhow\s+should\s+we\b/i,
];
const CODEX_PATTERNS = [
    /\b(codex|rescue|stuck|failed repeatedly|weird bug|complex debug|adversarial|race condition|hard-to-reverse)\b/i,
    /\b(refactor|migrate|rewrite)\b.*\b(6|7|8|9|10|many|across \d+|multiple domains)\b/i,
];
const GPT_MINI_PATTERNS = [
    /\b(gpt[- ]?(mini|5\.4 mini|5\.4-mini)|openai[- ]native|structured|json|schema|tool[- ]?call|parse|extract)\b/i,
    /\b(strict|deterministic)\b.*\b(format|output|schema|json|tools?)\b/i,
];
function matchesAny(task, patterns) {
    return patterns.some((pattern) => pattern.test(task));
}
function estimatesLargeSprint(task) {
    return /\b(sprint|multi-agent|parallel workers|many agents|across repos|whole repo|all repos|migration)\b/i.test(task);
}
const DOMAIN_PATTERNS = [
    ["payments", /\b(stripe|payment|payments|billing|checkout|subscription|invoice|portal)\b/i],
    ["webhooks", /\b(webhook|webhooks)\b/i],
    ["backend", /\b(api|backend|server|endpoint|route|webhook|middleware)\b/i],
    ["security", /\b(security|secure|harden|threat|vulnerability|secret|cookie|session|oauth|auth|idempotency)\b/i],
    ["database", /\b(database|db|sql|postgres|neon|schema|migration|write|idempotency)\b/i],
    ["auth", /\b(auth|oauth|login|session|cookie|route guard|middleware)\b/i],
    ["deployment", /\b(deploy|deployment|vercel|env|config|production|release)\b/i],
    ["nextjs", /\b(next\.?js)\b/i],
    ["frontend", /\b(react|next\.?js|frontend|dashboard|page|ui|component|chart|filter)\b/i],
    ["routing", /\b(route|routes|routing|middleware|route guard|route guards)\b/i],
    ["analytics", /\b(analytics|chart|dashboard|metric|report)\b/i],
    ["data", /\b(data|payload|analytics|metric|report)\b/i],
    ["testing", /\b(tests?|verify|regression|lint|typecheck|build|smoke)\b/i],
    ["planning", /\b(plan|allocation|specialist|roadmap|architecture|design)\b/i],
    ["debugging", /\b(debug|regression|bug|failure|broken|fix)\b/i],
];
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
function detectDomains(task) {
    return unique(DOMAIN_PATTERNS.filter(([, pattern]) => pattern.test(task)).map(([domain]) => domain));
}
function specialistsForDomains(domains, task) {
    const map = {
        payments: "payments-stripe",
        backend: "backend-api",
        security: "security-reviewer",
        database: "database",
        auth: "auth-security",
        deployment: "deployment-infra",
        nextjs: "frontend-nextjs",
        frontend: /\bnext\.?js\b/i.test(task) ? "frontend-nextjs" : "frontend-react",
        routing: "backend-api",
        analytics: "data-visualization",
        data: "database",
        webhooks: "backend-api",
        testing: "test-verifier",
        planning: "planner",
        debugging: "debugger",
    };
    return unique(domains.map((domain) => map[domain]));
}
function controllerFirstEnabled(options = {}) {
    return options.controllerFirst === true || process.env.SISO_CONTROLLER_FIRST_ROUTING === "1";
}
function legacySnapshot(decision) {
    return {
        profile: decision.profile,
        lane: decision.lane,
        model: decision.model,
    };
}
function fromProfile(profileId, overrides) {
    const profile = PROFILE_REGISTRY[profileId];
    if (!profile)
        throw new Error(`Unknown SISO profile: ${profileId}`);
    return {
        kind: overrides.kind ?? profile.role,
        profile: profile.id,
        lane: profile.lane,
        model: profile.model,
        tools: profile.tools,
        contextTier: profile.defaultContext,
        statePolicy: profile.statePolicy,
        permissionProfile: profile.permissionProfile,
        inheritContext: overrides.inheritContext ?? profile.defaultContext === "full",
        needsWorktree: overrides.needsWorktree ?? profile.statePolicy === "sprint-worktree",
        maxParallelAgents: profile.maxParallelAgents,
        rationale: overrides.rationale,
        ...(overrides.policyVersion ? { policyVersion: overrides.policyVersion } : {}),
        ...(overrides.routing ? { routing: overrides.routing } : {}),
        ...(overrides.controller ? { controller: overrides.controller } : {}),
        ...(overrides.domains ? { domains: overrides.domains } : {}),
        ...(overrides.specialists ? { specialists: overrides.specialists } : {}),
        ...(overrides.specialistCandidates ? { specialistCandidates: overrides.specialistCandidates } : {}),
        ...(overrides.legacyRoute ? { legacyRoute: overrides.legacyRoute } : {}),
    };
}
function compactSpecialistCandidates(task, domains) {
    return rankSpecialistsForTask(task, { domains }).slice(0, 4).map((specialist) => ({
        id: specialist.id,
        alias: specialist.alias,
        role: specialist.role,
        executionProfile: specialist.executionProfile,
        riskTier: specialist.riskTier,
        score: specialist.score,
        matchedDomains: specialist.matchedDomains,
    }));
}
function chooseLegacyRoute(task) {
    const normalized = task.trim();
    const isReview = matchesAny(normalized, REVIEW_PATTERNS);
    const isPlan = matchesAny(normalized, PLAN_PATTERNS);
    const isEdit = matchesAny(normalized, EDIT_PATTERNS);
    const isTest = matchesAny(normalized, TEST_PATTERNS);
    const isRead = matchesAny(normalized, READ_PATTERNS);
    const isCodex = matchesAny(normalized, CODEX_PATTERNS);
    const isGptMini = matchesAny(normalized, GPT_MINI_PATTERNS);
    const needsWorktree = estimatesLargeSprint(normalized);
    if (isCodex && !isPlan) {
        return fromProfile(isReview ? "codex.review" : "codex.rescue", {
            kind: "codex",
            inheritContext: false,
            needsWorktree: false,
            rationale: isReview
                ? "Adversarial or high-risk review should escalate to Codex instead of burning foreground context."
                : "Complex rescue/debug work should go to Codex while Pi keeps orchestration lean.",
        });
    }
    if (isGptMini && isEdit) {
        return fromProfile("gpt54mini.worker", {
            inheritContext: false,
            needsWorktree: false,
            rationale: "Strict structured/tool-call-sensitive edits should use the cheap OpenAI-native GPT-5.4 Mini lane.",
        });
    }
    if (isGptMini && isTest) {
        return fromProfile("gpt54mini.verifier", {
            inheritContext: false,
            needsWorktree: false,
            rationale: "Structured output, schema, and tool-contract verification fit the cheap GPT-5.4 Mini lane.",
        });
    }
    if (isGptMini) {
        return fromProfile("gpt54mini.scout", {
            inheritContext: false,
            needsWorktree: false,
            rationale: "Structured extraction and parsing should use GPT-5.4 Mini instead of bulk MiniMax.",
        });
    }
    if (isReview && !isEdit) {
        return fromProfile("spark.reviewer", {
            inheritContext: false,
            needsWorktree: false,
            rationale: "Review tasks need stronger reasoning than scout but no write tools by default.",
        });
    }
    if (isPlan && !isEdit && !isTest) {
        const wantsOracle = /\b(oracle|god|consult|advice|advise|talk to god|ask gpt)\b/i.test(normalized);
        return fromProfile(wantsOracle ? "gpt55.oracle" : "gpt55.planner", {
            inheritContext: true,
            needsWorktree: false,
            rationale: wantsOracle
                ? "Oracle calls use GPT-5.5 for advisory judgment and return only a decision/rationale."
                : "Planning and architecture can justify GPT-5.5 via the Opus route, with no write tools.",
        });
    }
    if (isEdit) {
        return fromProfile(needsWorktree ? "spark.worker" : "minimax.worker", {
            inheritContext: false,
            needsWorktree,
            rationale: needsWorktree
                ? "Large sprint-like edits should allocate one task worktree and run multiple workers inside it."
                : "Small edits can run cheaply on MiniMax/Haiku with write tools scoped to the task.",
        });
    }
    if (isTest) {
        return fromProfile("minimax.verifier", {
            inheritContext: false,
            needsWorktree: false,
            rationale: "Verification is cheap read/bash work and should default to MiniMax/Haiku.",
        });
    }
    if (isRead || normalized.length > 0) {
        return fromProfile("minimax.scout", {
            inheritContext: false,
            needsWorktree: false,
            rationale: "Discovery and research should be cheap, read-only, and avoid inherited transcript bloat.",
        });
    }
    return fromProfile("minimax.scout", {
        inheritContext: false,
        needsWorktree: false,
        rationale: "Empty or unclear tasks should start as low-cost discovery.",
    });
}
function shouldControllerPlan(task, domains) {
    const hasMutation = matchesAny(task, EDIT_PATTERNS) || matchesAny(task, CREATE_PATTERNS);
    return /\b(allocation plan|domain specialist|specialist allocation)\b/i.test(task) ||
        (!hasMutation && domains.includes("planning") && domains.filter((domain) => domain !== "planning").length >= 3);
}
function shouldControllerAllocate(task, domains, legacyDecision) {
    const hasReviewAndMutation = matchesAny(task, REVIEW_PATTERNS) && (matchesAny(task, EDIT_PATTERNS) || matchesAny(task, CREATE_PATTERNS));
    const hasArchitectureAndMutation = matchesAny(task, PLAN_PATTERNS) && (matchesAny(task, EDIT_PATTERNS) || matchesAny(task, CREATE_PATTERNS));
    const highRisk = domains.some((domain) => ["auth", "security", "payments", "database", "deployment"].includes(domain));
    const multiDomain = domains.filter((domain) => !["planning", "testing", "debugging"].includes(domain)).length >= 2;
    const crossDomainRefactor = /\b(refactor|migrate|rewrite)\b/i.test(task) && (multiDomain || /\b(6|7|8|9|10|many|across \d+|multiple domains)\b/i.test(task));
    const domainRiskOverMini = ["minimax.worker", "minimax.scout", "gpt54mini.worker", "codex.rescue"].includes(legacyDecision.profile) && highRisk;
    return hasReviewAndMutation || hasArchitectureAndMutation || crossDomainRefactor || (domainRiskOverMini && multiDomain);
}
function chooseControllerFirstRoute(task, legacyDecision) {
    const normalized = task.trim();
    const domains = detectDomains(normalized);
    const specialists = specialistsForDomains(domains, normalized);
    const specialistCandidates = compactSpecialistCandidates(normalized, domains);
    if (shouldControllerPlan(normalized, domains)) {
        return fromProfile("gpt55.planner", {
            inheritContext: true,
            needsWorktree: false,
            policyVersion: 2,
            routing: "controller_planning",
            controller: "gpt55",
            domains,
            specialists: specialists.length ? specialists : ["planner"],
            specialistCandidates,
            legacyRoute: legacySnapshot(legacyDecision),
            rationale: "Controller-first routing: allocation/planning task should be handled by GPT-5.5 before specialist dispatch.",
        });
    }
    if (shouldControllerAllocate(normalized, domains, legacyDecision)) {
        return fromProfile("gpt55.planner", {
            inheritContext: true,
            needsWorktree: false,
            policyVersion: 2,
            routing: "controller_allocation",
            controller: "gpt55",
            domains,
            specialists: specialists.length ? specialists : ["planner"],
            specialistCandidates,
            legacyRoute: legacySnapshot(legacyDecision),
            rationale: "Controller-first routing: complex, high-risk, or multi-domain work should be allocated by GPT-5.5 before execution.",
        });
    }
    if (legacyDecision.profile === "minimax.scout" && matchesAny(normalized, CREATE_PATTERNS)) {
        return fromProfile("minimax.worker", {
            inheritContext: false,
            needsWorktree: false,
            policyVersion: 2,
            routing: "direct_worker",
            domains,
            specialists,
            specialistCandidates,
            legacyRoute: legacySnapshot(legacyDecision),
            rationale: "Controller-first routing: creation language requires a worker-capable direct route at minimum.",
        });
    }
    return {
        ...legacyDecision,
        policyVersion: 2,
        routing: "legacy",
        domains,
        specialists,
        specialistCandidates,
    };
}
export function chooseRoute(task, options = {}) {
    const legacyDecision = chooseLegacyRoute(task);
    return controllerFirstEnabled(options) ? chooseControllerFirstRoute(task, legacyDecision) : legacyDecision;
}
export function formatDecision(_task, decision) {
    return [
        `kind=${decision.kind}`,
        `profile=${decision.profile}`,
        `lane=${decision.lane}`,
        decision.routing ? `routing=${decision.routing}` : undefined,
        decision.controller ? `controller=${decision.controller}` : undefined,
        decision.domains?.length ? `domains=${decision.domains.join(",")}` : undefined,
        decision.specialists?.length ? `specialists=${decision.specialists.join(",")}` : undefined,
        decision.specialistCandidates?.length ? `specialist_candidates=${decision.specialistCandidates.map((item) => item.id).join(",")}` : undefined,
        decision.legacyRoute?.profile ? `legacy_profile=${decision.legacyRoute.profile}` : undefined,
        `context_tier=${decision.contextTier}`,
        `permission_profile=${decision.permissionProfile}`,
        `needs_worktree=${decision.needsWorktree}`,
    ].filter(Boolean).join("\n");
}
