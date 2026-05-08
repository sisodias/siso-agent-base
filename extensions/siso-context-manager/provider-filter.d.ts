import { type ContextFilterReplacement } from "./filter.js";
export type ProviderPayloadMetrics = {
    rawChars: number;
    estimatedTokensByChars: number;
    inputItems: number;
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
};
export declare function estimateProviderPayloadMetrics(payload: unknown): ProviderPayloadMetrics;
export declare function filterProviderPayload<T = unknown>(payload: T, options: {
    runId: string;
}): ProviderFilterResult<T>;
