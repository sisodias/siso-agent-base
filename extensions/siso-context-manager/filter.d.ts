export type ContextFilterReason = "duplicate_tool_result" | "state_query_result" | "large_tool_result" | "noisy_tool_result" | "old_tool_result";
export type ContextFilterReplacement = {
    index: number;
    toolCallId?: string;
    reason: ContextFilterReason;
    originalChars: number;
    estimatedTokens: number;
    pointer: string;
};
export type ContextFilterResult<T = unknown> = {
    messages: T[];
    replacements: ContextFilterReplacement[];
    estimatedSavedTokens: number;
};
export declare function messageText(message: unknown): string;
export declare function filterContextMessages<T = unknown>(messages: T[], options?: {
    runId: string;
    largeOutputTokens?: number;
    protectLast?: number;
}): ContextFilterResult<T>;
