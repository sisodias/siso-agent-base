import { filterContextMessages } from "./filter.js";
function itemType(item) {
    if (!item || typeof item !== "object")
        return "unknown";
    const record = item;
    return String(record.type ?? record.role ?? "unknown");
}
export function estimateProviderPayloadMetrics(payload) {
    const raw = (() => { try {
        return JSON.stringify(payload);
    }
    catch {
        return String(payload);
    } })();
    const record = payload && typeof payload === "object" ? payload : {};
    const input = Array.isArray(record.input) ? record.input : [];
    const itemCounts = {};
    const itemChars = {};
    let functionCallOutputs = 0;
    let functionCallOutputChars = 0;
    let largeFunctionCallOutputs = 0;
    for (const item of input) {
        const type = itemType(item);
        const itemRaw = (() => { try {
            return JSON.stringify(item);
        }
        catch {
            return String(item);
        } })();
        itemCounts[type] = (itemCounts[type] ?? 0) + 1;
        itemChars[type] = (itemChars[type] ?? 0) + itemRaw.length;
        if (type === "function_call_output") {
            functionCallOutputs += 1;
            functionCallOutputChars += itemRaw.length;
            if (itemRaw.length > 4000)
                largeFunctionCallOutputs += 1;
        }
    }
    return {
        rawChars: raw.length,
        estimatedTokensByChars: Math.ceil(raw.length / 4),
        inputItems: input.length,
        functionCallOutputs,
        functionCallOutputChars,
        largeFunctionCallOutputs,
        containsFilteredTombstone: raw.includes("SISO_CONTEXT_FILTERED"),
        itemCounts,
        itemChars,
    };
}
export function filterProviderPayload(payload, options) {
    const before = estimateProviderPayloadMetrics(payload);
    if (!payload || typeof payload !== "object")
        return { payload, replacements: [], estimatedSavedTokens: 0, before, after: before };
    const record = payload;
    if (!Array.isArray(record.input))
        return { payload, replacements: [], estimatedSavedTokens: 0, before, after: before };
    const result = filterContextMessages(record.input, { runId: options.runId, protectLast: 8 });
    if (result.replacements.length === 0)
        return { payload, replacements: [], estimatedSavedTokens: 0, before, after: before };
    const nextPayload = { ...record, input: result.messages };
    return {
        payload: nextPayload,
        replacements: result.replacements,
        estimatedSavedTokens: result.estimatedSavedTokens,
        before,
        after: estimateProviderPayloadMetrics(nextPayload),
    };
}
