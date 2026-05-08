const FILE_RE = /(?:^|\s|["'`])([\w./-]+\.(?:ts|tsx|js|jsx|mjs|json|md|py|rs|go|sh|yml|yaml|sql|css|html))(?:\s|$|["'`:,])/g;
const STATE_QUERY_RE = /\b(git status|pwd|ls\b|find\b|rg\b|grep\b|tree\b|git diff --stat|git branch)\b/i;
const SUCCESS_RE = /\b(ok|pass|passed|success|fixed|exit 0|0 failed|done)\b/i;
const ERROR_RE = /\b(error|failed|fail|exception|traceback|timeout|exit [1-9]\d*)\b/i;
function textOf(event) {
    return `${event.toolName ?? ""} ${event.text ?? ""}`.replace(/\s+/g, " ").trim();
}
function fingerprint(event) {
    return `${event.kind}:${event.toolName ?? ""}:${textOf(event).slice(0, 1000)}`.toLowerCase();
}
function stateFingerprint(event) {
    const text = textOf(event);
    const match = text.match(STATE_QUERY_RE)?.[0]?.toLowerCase();
    if (!match)
        return undefined;
    return `${event.toolName ?? "bash"}:${match}`;
}
function filesIn(event) {
    const text = textOf(event);
    return [...text.matchAll(FILE_RE)].map((match) => match[1] ?? "").filter(Boolean);
}
function addCandidate(candidates, event, reason, keptEventId, summary) {
    if (event.estimatedTokens <= 0)
        return;
    if (candidates.some((candidate) => candidate.eventId === event.id && candidate.reason === reason))
        return;
    candidates.push({ eventId: event.id, keptEventId, reason, estimatedTokens: event.estimatedTokens, summary });
}
export function analyzeSupersede(events, options = {}) {
    const protectLast = options.protectLast ?? 6;
    const largeOutputTokens = options.largeOutputTokens ?? 3000;
    const protectedIds = protectLast > 0 ? new Set(events.slice(-protectLast).map((event) => event.id)) : new Set();
    const candidates = [];
    const latestByFingerprint = new Map();
    for (const event of events)
        latestByFingerprint.set(fingerprint(event), event);
    for (const event of events) {
        const latest = latestByFingerprint.get(fingerprint(event));
        if (!latest || latest.id === event.id || protectedIds.has(event.id))
            continue;
        addCandidate(candidates, event, "duplicate_tool", latest.id, `Duplicate ${event.toolName ?? event.kind}; keep latest event ${latest.id}.`);
    }
    const latestByState = new Map();
    for (const event of events) {
        const key = stateFingerprint(event);
        if (key)
            latestByState.set(key, event);
    }
    for (const event of events) {
        const key = stateFingerprint(event);
        const latest = key ? latestByState.get(key) : undefined;
        if (!latest || latest.id === event.id || protectedIds.has(event.id))
            continue;
        addCandidate(candidates, event, "state_query", latest.id, `Stale state query; keep latest ${key} at ${latest.id}.`);
    }
    const latestByFile = new Map();
    for (const event of events) {
        for (const file of filesIn(event))
            latestByFile.set(file, event);
    }
    for (const event of events) {
        if (protectedIds.has(event.id))
            continue;
        for (const file of filesIn(event)) {
            const latest = latestByFile.get(file);
            if (!latest || latest.id === event.id)
                continue;
            addCandidate(candidates, event, "one_file_one_view", latest.id, `Older view of ${file}; keep latest event ${latest.id}.`);
            break;
        }
    }
    const latestSuccessByTool = new Map();
    for (const event of events) {
        const key = event.toolName ?? event.kind;
        if (SUCCESS_RE.test(textOf(event)))
            latestSuccessByTool.set(key, event);
    }
    for (const event of events) {
        const key = event.toolName ?? event.kind;
        const latest = latestSuccessByTool.get(key);
        if (!latest || latest.id === event.id || protectedIds.has(event.id))
            continue;
        if (ERROR_RE.test(textOf(event)))
            addCandidate(candidates, event, "stale_error_retry", latest.id, `Older failure appears superseded by later success ${latest.id}.`);
    }
    for (const event of events) {
        if (protectedIds.has(event.id))
            continue;
        if (event.estimatedTokens >= largeOutputTokens) {
            addCandidate(candidates, event, "large_stale_output", undefined, `Large stale output (${event.estimatedTokens}t) should be summarized with retrieval pointer.`);
        }
    }
    const byEvent = new Map();
    for (const candidate of candidates.sort((a, b) => b.estimatedTokens - a.estimatedTokens)) {
        if (!byEvent.has(candidate.eventId) || (byEvent.get(candidate.eventId)?.reason === "duplicate_tool" && candidate.reason !== "duplicate_tool"))
            byEvent.set(candidate.eventId, candidate);
    }
    const deduped = [...byEvent.values()];
    return {
        scanned: events.length,
        candidates: deduped,
        estimatedSavedTokens: deduped.reduce((sum, candidate) => sum + candidate.estimatedTokens, 0),
    };
}
export function formatSupersedeReport(report, limit = 20) {
    return [
        `scanned=${report.scanned}`,
        `candidates=${report.candidates.length}`,
        `estimated_saved_tokens=${report.estimatedSavedTokens}`,
        ...report.candidates.slice(0, limit).map((candidate) => `${candidate.reason} event=${candidate.eventId} keep=${candidate.keptEventId ?? "summary-pointer"} tokens=${candidate.estimatedTokens} ${candidate.summary}`),
    ].join("\n");
}
