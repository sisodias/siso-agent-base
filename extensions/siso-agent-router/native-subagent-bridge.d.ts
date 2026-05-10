import { type RouteDecision } from "./route-policy.js";
type NativeToolExecute = (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: unknown, ctx?: NativeSubagentBridgeContext) => Promise<NativeSubagentToolResult> | NativeSubagentToolResult;
export interface NativeSubagentBridgeContext {
    getAllTools?: () => Array<{
        name?: string;
        execute?: NativeToolExecute;
    }>;
}
export interface NativeSubagentSpawnOptions {
    task: string;
    cwd?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    background?: boolean;
    maxDepth?: number;
    noTools?: boolean;
    fleetId?: string;
    budget?: Record<string, unknown>;
    decision?: RouteDecision;
    signal?: AbortSignal;
    ctx?: NativeSubagentBridgeContext;
    executeNative?: NativeSubagentExecutor;
}
export interface NativeSubagentSpawnResult {
    usedNative: boolean;
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: unknown;
}
type NativeSubagentToolResult = {
    content?: Array<{
        type?: string;
        text?: string;
    }>;
    details?: unknown;
};
type NativeSubagentExecutor = (params: Record<string, unknown>, signal?: AbortSignal) => Promise<NativeSubagentToolResult>;
export declare function nativeSubagentAvailable(ctx?: NativeSubagentBridgeContext): boolean;
export declare function sisoRoleToNativeAgent(decision: RouteDecision): string;
export declare function modelForNativeSubagent(decision: RouteDecision): string | undefined;
export declare function buildNativeSubagentParams(task: string, decision: RouteDecision, options: NativeSubagentSpawnOptions): Record<string, unknown>;
export declare function formatNativeSpawnResult(task: string, decision: RouteDecision, native: NativeSubagentToolResult, childId: string, childStatus: string, timing?: {
    durationMs?: number;
}): string;
export declare function executeSpawnWithNativeSubagentBridge(options: NativeSubagentSpawnOptions): Promise<NativeSubagentSpawnResult>;
export {};
