import { readRunEvents } from "./store.js";
import { analyzeSupersede } from "./supersede.js";
export function retrieveEvent(runId, eventId, options = {}) {
    const events = readRunEvents(runId, options.root);
    const event = events.find((row) => row.id === eventId);
    const candidate = analyzeSupersede(events).candidates.find((row) => row.eventId === eventId);
    if (!event) {
        return { runId, eventId, found: false, text: `No context event found for run=${runId} event=${eventId}` };
    }
    const maxChars = options.maxChars ?? 12000;
    const body = event.text ?? "";
    const text = [
        `run=${runId}`,
        `event=${event.id}`,
        `kind=${event.kind}`,
        `event_name=${event.eventName}`,
        `tool=${event.toolName ?? "none"}`,
        `tokens=${event.estimatedTokens}`,
        `cwd=${event.cwd}`,
        candidate ? `supersede_reason=${candidate.reason} kept_event=${candidate.keptEventId ?? "summary-pointer"}` : "supersede_reason=none",
        "--- raw text ---",
        body.slice(0, maxChars),
        body.length > maxChars ? `--- truncated ${body.length - maxChars} chars ---` : "--- end raw text ---",
    ].join("\n");
    return { runId, eventId, found: true, event, candidate, text };
}
export function formatRetrievalPointers(runId, candidates, limit = 20) {
    if (candidates.length === 0)
        return "No retrieval pointers.";
    return candidates.slice(0, limit).map((candidate) => [
        `event=${candidate.eventId}`,
        `reason=${candidate.reason}`,
        `tokens=${candidate.estimatedTokens}`,
        `retrieve=siso_context op=retrieve runId=${runId} eventId=${candidate.eventId}`,
        `summary=${candidate.summary}`,
    ].join(" ")).join("\n");
}
