import { type RouteDecision } from "./route-policy.js";
import type { ModelId, ModelLane } from "./profile-registry.js";
import { type SisoAgentEvent } from "./agent-events.js";
export type ChildAgentStatus = "planned" | "starting" | "running" | "background" | "completed" | "failed" | "timeout" | "aborted" | "unsupported";
export interface TokenUsage {
    input: number;
    output: number;
    totalTokens: number;
}
export interface ChildAgentSnapshot {
    id: string;
    status: ChildAgentStatus;
    profile: string;
    lane: ModelLane;
    model: ModelId;
    startedAt?: string;
    updatedAt?: string;
    pid?: number;
    exitCode?: number | null;
    signal?: string | null;
    durationMs?: number;
    tokens?: TokenUsage;
    toolCalls?: number;
    notified?: boolean;
    outputChars?: number;
    truncatedOutputChars?: number;
    compactResult?: CompactChildResult;
    error?: string;
    runRecordPath?: string;
}
export interface RouterStatusSnapshot {
    profile?: string;
    lane?: ModelLane;
    model?: ModelId;
    tokens?: TokenUsage;
    activeChildId?: string;
    child?: ChildAgentSnapshot;
    children?: Record<string, ChildAgentSnapshot>;
    updatedAt: string;
}
declare global {
    var __SISO_ROUTER_STATUS__: RouterStatusSnapshot | undefined;
}
export interface SpawnOptions {
    command?: string;
    codexCommand?: string;
    codexHome?: string;
    codexModel?: string;
    cwd?: string;
    provider?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    background?: boolean;
    codexAdapter?: "pi" | "codex-cli";
    maxDepth?: number;
    decision?: RouteDecision;
    noTools?: boolean;
}
export interface SpawnSpec {
    adapter: "pi" | "codex-pi" | "codex-cli";
    command: string;
    args: string[];
    cwd: string;
    decision: RouteDecision;
    task: string;
    unsupportedReason?: string;
}
export interface SpawnRunResult {
    id: string;
    status: ChildAgentStatus;
    adapter: "pi" | "codex-pi" | "codex-cli";
    decision: RouteDecision;
    command: string;
    args: string[];
    cwd: string;
    pid?: number;
    exitCode?: number | null;
    signal?: string | null;
    durationMs: number;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    finalOutput: string;
    compactResult: CompactChildResult;
    rawOutputChars: number;
    truncatedOutputChars: number;
    tokens: TokenUsage;
    toolCalls: number;
    notified?: boolean;
    error?: string;
    runRecordPath?: string;
    stdoutPath?: string;
    stderrPath?: string;
    events?: SisoAgentEvent[];
}
export interface CompactChildResult {
    summary: string;
    findings: string[];
    files: string[];
    next_action: string;
}
export interface ChildRunRecord {
    id: string;
    status: ChildAgentStatus;
    adapter: SpawnRunResult["adapter"];
    profile: string;
    lane: ModelLane;
    model: ModelId;
    cwd: string;
    pid?: number;
    exitCode?: number | null;
    signal?: string | null;
    startedAt: string;
    updatedAt: string;
    completedAt?: string;
    stdoutPath: string;
    stderrPath: string;
    exitPath?: string;
    runRecordPath: string;
    tokens: TokenUsage;
    toolCalls: number;
    compactResult: CompactChildResult;
    rawOutputChars: number;
    truncatedOutputChars: number;
    error?: string;
    notified?: boolean;
    parentSessionId?: string;
    events?: SisoAgentEvent[];
}
export interface ChildRunCleanupOptions {
    maxAgeHours?: number;
    maxRuns?: number;
    dryRun?: boolean;
}
export interface ChildRunCleanupResult {
    scannedRuns: number;
    removedFiles: string[];
    removedBytes: number;
    dryRun: boolean;
}
export interface ChildRunStorageStats {
    runs: number;
    activeRuns: number;
    completedRuns: number;
    failedRuns: number;
    recordBytes: number;
    stdoutBytes: number;
    stderrBytes: number;
    totalBytes: number;
    newestUpdatedAt?: string;
    oldestUpdatedAt?: string;
    estimatedDailyGrowthBytes: number;
}
export type ChildControlAction = "list" | "status" | "logs" | "interrupt" | "resume";
export interface ChildControlInput {
    action: ChildControlAction;
    id?: string;
    limit?: number;
    signal?: "SIGTERM" | "SIGKILL";
    message?: string;
    background?: boolean;
    timeoutMs?: number;
    spawnOptions?: SpawnOptions;
}
export interface ChildControlResult {
    action: ChildControlAction;
    records: ChildRunRecord[];
    text: string;
}
export type PublicSpawnRunResult = Omit<SpawnRunResult, "stdout" | "stderr"> & {
    stderrPreview: string;
};
export declare function readChildRunRecord(id: string): ChildRunRecord | undefined;
export declare function collectChildRunRecord(id: string): ChildRunRecord | undefined;
export declare function collectLatestChildRunRecords(limit?: number): ChildRunRecord[];
export declare function controlChildRun(input: ChildControlInput): Promise<ChildControlResult>;
export declare function cleanupChildRunLogs(options?: ChildRunCleanupOptions): ChildRunCleanupResult;
export declare function getChildRunStorageStats(): ChildRunStorageStats;
export declare function truncateForParent(text: string, limit?: number): {
    text: string;
    originalChars: number;
    truncatedChars: number;
};
export declare function compactChildResult(text: string): CompactChildResult;
export declare function setRouterStatus(patch: Partial<RouterStatusSnapshot>): RouterStatusSnapshot;
export declare function isTerminalChildStatus(status: ChildAgentStatus | string | undefined): boolean;
export declare function setChildStatus(snapshot: ChildAgentSnapshot, activate: boolean): RouterStatusSnapshot;
export declare function getRouterStatus(): RouterStatusSnapshot | undefined;
export declare function normalizePiTools(tools: string[]): string[];
export declare function buildChildPrompt(task: string, decision: RouteDecision, contextPacket?: string): string;
export declare function buildCodexPrompt(task: string, decision: RouteDecision, contextPacket?: string, casePacket?: string): string;
export declare function buildSpawnSpec(task: string, options?: SpawnOptions, decision?: RouteDecision): SpawnSpec;
type JsonEventParseState = {
    finalOutput: string;
    tokens: TokenUsage;
    toolCalls: number;
    runId?: string;
    surface?: "child" | "foreground" | "council" | "workflow" | "occ-reference";
    model?: ModelId | string;
    events?: SisoAgentEvent[];
};
export declare function parseJsonEventLine(line: string, current: JsonEventParseState): void;
export declare function runProfileSpawn(task: string, options?: SpawnOptions, signal?: AbortSignal): Promise<SpawnRunResult>;
export declare function snapshotFromResult(result: SpawnRunResult): ChildAgentSnapshot;
export declare function publicSpawnResult(result: SpawnRunResult): PublicSpawnRunResult;
export declare function formatSpawnResult(task: string, result: SpawnRunResult): string;
export {};
