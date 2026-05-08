import { PROFILE_REGISTRY } from "./profile-registry.js";
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
    };
}
export function chooseRoute(task) {
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
export function formatDecision(_task, decision) {
    return [
        `kind=${decision.kind}`,
        `profile=${decision.profile}`,
        `lane=${decision.lane}`,
        `context_tier=${decision.contextTier}`,
        `permission_profile=${decision.permissionProfile}`,
        `needs_worktree=${decision.needsWorktree}`,
    ].join("\n");
}
