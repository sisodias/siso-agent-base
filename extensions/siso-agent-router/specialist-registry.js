const DOMAIN_PATTERNS = [
    ["payments", /\b(stripe|payment|payments|billing|checkout|subscription|invoice|portal)\b/i],
    ["webhooks", /\b(webhook|webhooks)\b/i],
    ["backend", /\b(api|backend|server|endpoint|route|middleware|webhook|webhooks)\b/i],
    ["security", /\b(security|secure|harden|threat|vulnerability|secret|cookie|session|oauth|auth|idempotency)\b/i],
    ["database", /\b(database|db|sql|postgres|neon|schema|migration|write|idempotency|storage)\b/i],
    ["auth", /\b(auth|oauth|login|session|cookie|route guard|middleware)\b/i],
    ["deployment", /\b(deploy|deployment|vercel|env|config|production|release)\b/i],
    ["nextjs", /\b(next\.?js)\b/i],
    ["frontend", /\b(react|next\.?js|frontend|dashboard|page|ui|component|chart|filter)\b/i],
    ["routing", /\b(route|routes|routing|middleware|route guard|route guards)\b/i],
    ["analytics", /\b(analytics|chart|dashboard|metric|report)\b/i],
    ["data", /\b(data|payload|analytics|metric|report|extract|parse)\b/i],
    ["testing", /\b(tests?|verify|regression|lint|typecheck|build|smoke|check)\b/i],
    ["planning", /\b(plan|allocation|specialist|roadmap|architecture|design)\b/i],
    ["debugging", /\b(debug|regression|bug|failure|broken|fix)\b/i],
    ["docs", /\b(docs?|documentation|readme|guide|changelog)\b/i],
    ["agent-system", /\b(agent|subagent|router|workflow|allocation|ciso|siso|codex|pi)\b/i],
];
export const SPECIALIST_REGISTRY = {
    "specialist.payments.stripe": {
        id: "specialist.payments.stripe",
        alias: "payments-stripe",
        role: "worker",
        domains: { payments: 0.97, webhooks: 0.88, backend: 0.78, security: 0.74, database: 0.68 },
        riskTier: "high",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "spark.worker",
        verification: ["payment flow smoke", "webhook idempotency check", "secret handling review"],
    },
    "specialist.auth.security": {
        id: "specialist.auth.security",
        alias: "auth-security",
        role: "worker",
        domains: { auth: 0.96, security: 0.95, backend: 0.75, routing: 0.72 },
        riskTier: "high",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "spark.worker",
        verification: ["auth regression check", "session/cookie policy review", "route guard coverage"],
    },
    "specialist.security.appsec": {
        id: "specialist.security.appsec",
        alias: "security-reviewer",
        role: "reviewer",
        domains: { security: 0.98, auth: 0.85, payments: 0.74, deployment: 0.7 },
        riskTier: "high",
        contextTier: "project",
        permissionProfile: "plan",
        executionProfile: "spark.reviewer",
        verification: ["threat-model checklist", "highest-risk findings", "patch review"],
    },
    "specialist.backend.api": {
        id: "specialist.backend.api",
        alias: "backend-api",
        role: "worker",
        domains: { backend: 0.94, routing: 0.82, webhooks: 0.82, data: 0.64 },
        riskTier: "medium",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "minimax.worker",
        verification: ["API route smoke", "error path check"],
    },
    "specialist.database.persistence": {
        id: "specialist.database.persistence",
        alias: "database",
        role: "worker",
        domains: { database: 0.95, data: 0.82, backend: 0.7, webhooks: 0.62 },
        riskTier: "high",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "spark.worker",
        verification: ["migration safety check", "idempotency check", "data write test"],
    },
    "specialist.frontend.nextjs": {
        id: "specialist.frontend.nextjs",
        alias: "frontend-nextjs",
        role: "worker",
        domains: { nextjs: 0.96, frontend: 0.9, routing: 0.68, analytics: 0.54 },
        riskTier: "medium",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "minimax.worker",
        verification: ["render smoke", "route/page check"],
    },
    "specialist.frontend.react": {
        id: "specialist.frontend.react",
        alias: "frontend-react",
        role: "worker",
        domains: { frontend: 0.94, analytics: 0.72, data: 0.58 },
        riskTier: "medium",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "minimax.worker",
        verification: ["component smoke", "responsive UI check"],
    },
    "specialist.data.analytics": {
        id: "specialist.data.analytics",
        alias: "data-visualization",
        role: "worker",
        domains: { analytics: 0.95, data: 0.86, frontend: 0.62 },
        riskTier: "medium",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "minimax.worker",
        verification: ["sample data render", "chart/filter check"],
    },
    "specialist.deployment.vercel": {
        id: "specialist.deployment.vercel",
        alias: "deployment-infra",
        role: "worker",
        domains: { deployment: 0.96, security: 0.65, backend: 0.52 },
        riskTier: "high",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "spark.worker",
        verification: ["env/config diff review", "deployment smoke"],
    },
    "specialist.testing.verifier": {
        id: "specialist.testing.verifier",
        alias: "test-verifier",
        role: "verifier",
        domains: { testing: 0.96, debugging: 0.62 },
        riskTier: "low",
        contextTier: "project",
        permissionProfile: "plan",
        executionProfile: "minimax.verifier",
        verification: ["targeted smoke", "test output evidence"],
    },
    "specialist.debugging.rescue": {
        id: "specialist.debugging.rescue",
        alias: "debugger",
        role: "worker",
        domains: { debugging: 0.94, testing: 0.68, backend: 0.5 },
        riskTier: "medium",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "spark.worker",
        verification: ["reproduction evidence", "regression check"],
    },
    "specialist.agent-system.runtime": {
        id: "specialist.agent-system.runtime",
        alias: "agent-runtime",
        role: "worker",
        domains: { "agent-system": 0.98, backend: 0.55, testing: 0.52 },
        riskTier: "high",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "spark.worker",
        verification: ["router smoke", "workflow smoke", "task-scope smoke"],
    },
    "specialist.general.implementation": {
        id: "specialist.general.implementation",
        alias: "general-worker",
        role: "worker",
        domains: { backend: 0.35, frontend: 0.35, data: 0.25 },
        riskTier: "low",
        contextTier: "project",
        permissionProfile: "accept_edits",
        executionProfile: "minimax.worker",
        verification: ["targeted smoke"],
    },
    "specialist.planning.controller": {
        id: "specialist.planning.controller",
        alias: "planner",
        role: "planner",
        domains: { planning: 0.98 },
        riskTier: "medium",
        contextTier: "full",
        permissionProfile: "plan",
        executionProfile: "gpt55.planner",
        verification: ["allocation completeness review"],
    },
};
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
export function detectTaskDomains(task, hints = []) {
    const text = String(task ?? "");
    const detected = DOMAIN_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([domain]) => domain);
    return unique([...hints, ...detected]);
}
function roleMatches(specialist, requestedAgent = "") {
    const agent = String(requestedAgent ?? "").toLowerCase();
    if (!agent)
        return 0;
    if (agent.includes(specialist.role))
        return 0.15;
    if (agent.includes("review") && specialist.role === "reviewer")
        return 0.2;
    if (agent.includes("verify") && specialist.role === "verifier")
        return 0.2;
    if (agent.includes("plan") && specialist.role === "planner")
        return 0.2;
    return 0;
}
export function rankSpecialistsForTask(task, options = {}) {
    const domains = detectTaskDomains(task, options.domains ?? []);
    const scored = Object.values(SPECIALIST_REGISTRY)
        .map((specialist) => {
        const domainScore = domains.reduce((sum, domain) => sum + Number(specialist.domains[domain] ?? 0), 0);
        const score = domainScore + roleMatches(specialist, options.agent);
        return {
            ...specialist,
            score: Math.round(score * 1000) / 1000,
            matchedDomains: domains.filter((domain) => specialist.domains[domain] !== undefined),
        };
    })
        .filter((specialist) => specialist.score > 0)
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return scored.length ? scored : [{
            ...SPECIALIST_REGISTRY["specialist.general.implementation"],
            score: 0.1,
            matchedDomains: domains,
        }];
}
export function getSpecialist(identifier) {
    const value = String(identifier ?? "").trim();
    if (!value)
        return undefined;
    return SPECIALIST_REGISTRY[value] ?? Object.values(SPECIALIST_REGISTRY).find((specialist) => specialist.alias === value);
}
export function specialistAllocationForTask(task, options = {}) {
    const domains = detectTaskDomains(task, options.domains ?? []);
    const explicit = getSpecialist(options.specialistId ?? options.specialist);
    const ranked = explicit
        ? [{ ...explicit, score: 1, matchedDomains: domains.filter((domain) => explicit.domains[domain] !== undefined) }]
        : rankSpecialistsForTask(task, { ...options, domains });
    const primary = ranked[0];
    return {
        domains,
        primaryDomain: primary.matchedDomains[0] ?? domains[0] ?? "general",
        specialistId: primary.id,
        specialistAlias: primary.alias,
        specialistIds: ranked.slice(0, 4).map((specialist) => specialist.id),
        specialistAliases: ranked.slice(0, 4).map((specialist) => specialist.alias),
        domainRatings: primary.domains,
        riskTier: primary.riskTier,
        contextTier: primary.contextTier,
        permissionProfile: primary.permissionProfile,
        executionProfile: primary.executionProfile,
        verification: primary.verification,
        score: primary.score,
    };
}
