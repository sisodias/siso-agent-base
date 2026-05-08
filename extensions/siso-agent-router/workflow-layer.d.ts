import { type CouncilRunResult } from "./council-layer.js";
import { type SisoTask } from "./task-store.js";
import { type PublicSpawnRunResult } from "./spawn-layer.js";
import type { SisoAgentEvent } from "./agent-events.js";
export interface WorkflowOptions {
    cwd?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    background?: boolean;
    noTools?: boolean;
    workerCount?: number;
    council?: boolean;
}
export interface WorkflowWorkerResult {
    task: SisoTask;
    child: PublicSpawnRunResult;
}
export interface WorkflowRunResult {
    task: SisoTask;
    council?: CouncilRunResult;
    workers: WorkflowWorkerResult[];
    status: "planned" | "completed" | "partial" | "failed" | "background";
    totalTokens: number;
    events: SisoAgentEvent[];
}
export declare function runWorkflow(task: string, options?: WorkflowOptions, signal?: AbortSignal): Promise<WorkflowRunResult>;
export declare function formatWorkflowResult(result: WorkflowRunResult): string;
