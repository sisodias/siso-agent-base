import { type MemoryItem } from "./store.js";
export type TypedMemoryType = "event" | "fact" | "status" | "decision" | "caveat" | "error_fix" | "handoff";
export type TypedMemory = {
    id: string;
    type: TypedMemoryType;
    projectKey: string;
    agent: string;
    runId: string;
    ts: string;
    content: string;
    key?: string;
    status?: "active" | "superseded" | "resolved" | "stale";
    confidence: number;
    importance: number;
    sourceIds: string[];
    corroboratedBy: string[];
    conflictsWith: string[];
    expiresAt?: string;
};
export declare function typedMemoryFromItem(item: MemoryItem, agent?: string): TypedMemory | undefined;
export declare function readCentralMemory(root?: string): TypedMemory[];
export declare function promoteTypedMemories(items: MemoryItem[], options?: {
    root?: string;
    agent?: string;
}): TypedMemory[];
export declare function formatCentralMemory(rows: TypedMemory[], limit?: number): string;
export declare function centralMemoryStats(root?: string): {
    memories: number;
    byType: Record<string, number>;
    path: string;
    bytes: number;
};
