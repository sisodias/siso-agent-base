export function createAgentEvent(event, now = () => new Date()) {
    return {
        ...event,
        timestamp: now().toISOString(),
    };
}
export function formatAgentEvent(event) {
    const base = `${event.type} run=${event.runId} surface=${event.surface}`;
    if (event.type === "run_started") {
        return [
            base,
            event.profile ? `profile=${event.profile}` : "",
            event.model ? `model=${event.model}` : "",
            event.permissionProfile ? `permission=${event.permissionProfile}` : "",
        ].filter(Boolean).join(" ");
    }
    if (event.type === "model_request") {
        return [
            base,
            `model=${event.model}`,
            event.messageCount === undefined ? "" : `messages=${event.messageCount}`,
            event.toolCount === undefined ? "" : `tools=${event.toolCount}`,
            event.promptTokens === undefined ? "" : `prompt_tokens=${event.promptTokens}`,
        ].filter(Boolean).join(" ");
    }
    if (event.type === "assistant_message") {
        return `${base} text=${compact(event.text)}`;
    }
    if (event.type === "tool_call") {
        return [
            base,
            `tool=${event.toolName}`,
            event.toolCallId ? `call=${event.toolCallId}` : "",
        ].filter(Boolean).join(" ");
    }
    if (event.type === "tool_result") {
        return [
            base,
            `tool=${event.toolName}`,
            event.toolCallId ? `call=${event.toolCallId}` : "",
            `ok=${event.ok}`,
            event.summary ? `summary=${compact(event.summary)}` : "",
        ].filter(Boolean).join(" ");
    }
    if (event.type === "permission_check") {
        return [
            base,
            `mode=${event.mode}`,
            `action=${event.action}`,
            `allowed=${event.allowed}`,
            event.reason ? `reason=${compact(event.reason)}` : "",
        ].filter(Boolean).join(" ");
    }
    return [
        base,
        `status=${event.status}`,
        event.totalTokens === undefined ? "" : `total_tokens=${event.totalTokens}`,
    ].filter(Boolean).join(" ");
}
function compact(text, limit = 96) {
    const normalized = text.replace(/\s+/g, " ").trim();
    return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}
