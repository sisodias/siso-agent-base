type MemoryItem = {
    category?: string;
    text?: string;
    importance?: number;
    confidence?: number;
};
type ContextEvent = {
    eventName?: string;
    toolName?: string;
    text?: string;
    estimatedTokens?: number;
};
export declare function formatCodexCasePacket(args: {
    task: string;
    memories?: MemoryItem[];
    recentEvents?: ContextEvent[];
    maxChars?: number;
}): string;
export declare function loadCodexCasePacket(task: string, options?: {
    root?: string;
    runId?: string;
    maxChars?: number;
}): string | undefined;
export {};
