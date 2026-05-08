import type { DistillResult } from "./distill.js";
import type { ContextEvent, MemoryItem } from "./store.js";
export type LibrarianMode = "local" | "semantic";
export type LibrarianReason = "threshold" | "turns" | "tokens" | "large_filter" | "pre_codex" | "boundary" | "manual";
export type LibrarianState = {
    turnsSinceSemantic: number;
    tokensSinceSemantic: number;
    largeFiltersSinceSemantic: number;
    semanticRuns: number;
    localRuns: number;
    lastRun?: string;
    lastReason?: LibrarianReason;
    lastMode?: LibrarianMode;
    lastSavedTokens?: number;
};
export type LibrarianPolicy = {
    semanticEnabled: boolean;
    turnsThreshold: number;
    tokenThreshold: number;
    pendingThreshold: number;
    largeFilterThreshold: number;
};
export type LibrarianDecision = {
    shouldRun: boolean;
    mode: LibrarianMode;
    reason: LibrarianReason;
};
export declare function librarianPolicyFromEnv(env?: NodeJS.ProcessEnv): LibrarianPolicy;
export declare function chooseLibrarianRun(state: LibrarianState, pendingEvents: ContextEvent[], policy: LibrarianPolicy, reason?: LibrarianReason): LibrarianDecision | undefined;
export declare function updateLibrarianStateAfterRun(state: LibrarianState, result: DistillResult, mode: LibrarianMode, reason: LibrarianReason): void;
export declare function renderLibrarianStatus(result: DistillResult, mode: LibrarianMode, reason: LibrarianReason): string;
export declare function buildCodexCasePacket(args: {
    task: string;
    memories: MemoryItem[];
    recentEvents?: ContextEvent[];
    maxChars?: number;
}): string;
export declare function appendLibrarianLog(root: string, line: string): void;
