import { type ContextFilterReplacement } from "./filter.js";
export type ProviderPayloadMetrics = {
    rawChars: number;
    estimatedTokensByChars: number;
    inputItems: number;
    messageItems: number;
    functionCallOutputs: number;
    functionCallOutputChars: number;
    largeFunctionCallOutputs: number;
    containsFilteredTombstone: boolean;
    itemCounts: Record<string, number>;
    itemChars: Record<string, number>;
};
export type ProviderFilterResult<T = unknown> = {
    payload: T;
    replacements: ContextFilterReplacement[];
    estimatedSavedTokens: number;
    before: ProviderPayloadMetrics;
    after: ProviderPayloadMetrics;
    promptSlim?: {
        field?: "input" | "messages";
        applied: true;
        originalMessageCount: number;
        keptMessageCount: number;
        compressedMessageCount: number;
        originalChars: number;
        compactChars: number;
        estimatedSavedTokens: number;
        beforeChars: number;
        afterChars: number;
    } | Array<{
        field?: "input" | "messages";
        applied: true;
        originalMessageCount: number;
        keptMessageCount: number;
        compressedMessageCount: number;
        originalChars: number;
        compactChars: number;
        estimatedSavedTokens: number;
        beforeChars: number;
        afterChars: number;
    }>;
    toolSlim?: {
        applied: true;
        originalToolCount: number;
        keptToolCount: number;
        hiddenToolCount: number;
        loadedPackIds: string[];
        loadedToolIds: string[];
        estimatedSavedTokens: number;
    };
};
export declare function estimateProviderPayloadMetrics(payload: unknown): ProviderPayloadMetrics;
export declare function filterProviderPayload<T = unknown>(payload: T, options: {
    runId: string;
    cwd?: string;
}): ProviderFilterResult<T>;
