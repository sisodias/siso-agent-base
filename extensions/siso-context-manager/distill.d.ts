import { type ContextEvent, type MemoryItem } from "./store.js";
export type DistillResult = {
    runId: string;
    sourceIds: string[];
    inputTokens: number;
    items: MemoryItem[];
    summary: string;
};
export declare function deterministicDistill(events: ContextEvent[], options?: {
    maxItems?: number;
}): DistillResult;
export declare function dedupeItems(items: MemoryItem[]): MemoryItem[];
export declare function promoteProjectMemories(items: MemoryItem[], root?: string): MemoryItem[];
export declare function minimaxDistill(events: ContextEvent[], options?: {
    endpoint?: string;
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
}): Promise<DistillResult | undefined>;
