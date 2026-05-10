import { type CouncilRunResult } from "./council-layer.js";
import { type SisoTask } from "./task-store.js";
import { type PublicSpawnRunResult } from "./spawn-layer.js";
export interface WorkflowOptions {
    cwd?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    background?: boolean;
    noTools?: boolean;
    workerCount?: number;
    concurrency?: number;
    recipe?: "parallel-review" | "parallel-research" | "context-build" | "handoff-plan" | "cleanup-review" | string;
    tasks?: WorkflowTaskSpec[];
    chain?: WorkflowChainStep[];
    allocationPlan?: WorkflowAllocationPlan | string;
    allocationPlanText?: string;
    council?: boolean;
    verify?: boolean;
    verifyIterations?: number;
    verifierIterations?: number;
    controllerAllocate?: boolean;
    controllerAllocation?: boolean | WorkflowControllerAllocationResult;
    executeControllerAllocation?: (prompt: string, context: {
        task: string;
        options: WorkflowOptions;
        signal?: AbortSignal;
    }) => unknown | Promise<unknown>;
    allocationId?: string;
    checks?: string | string[];
    commands?: string | string[];
    command?: string;
    checkTimeoutMs?: number;
    ctx?: {
        getAllTools?: () => Array<{
            name: string;
            execute?: (...args: unknown[]) => unknown;
        }>;
    };
}
export interface WorkflowTaskSpec {
    agent?: string;
    profile?: string;
    task?: string;
    description?: string;
    specialist?: string;
    specialistId?: string;
    executionProfile?: string;
    requiredChecks?: string | string[];
    acceptanceCriteria?: string | string[];
    count?: number;
    output?: string;
    outputMode?: "inline" | "file-only";
}
export interface WorkflowChainStep extends WorkflowTaskSpec {
    parallel?: WorkflowTaskSpec[];
}
export interface WorkflowAllocationAssignment extends WorkflowTaskSpec {
    role?: string;
    defaultProfile?: string;
    reason?: string;
    checks?: string | string[];
    verification?: string | string[];
    acceptance?: string | string[];
    criteria?: string | string[];
}
export interface WorkflowAllocationPlan {
    taskKind?: string;
    complexity?: string;
    risk?: string;
    riskTier?: string;
    domains?: string[];
    assignments?: WorkflowAllocationAssignment[];
}
export interface WorkflowControllerAllocationResult {
    source: "test-hook" | "native-subagent" | string;
    status: "generated" | string;
    controllerId?: string;
}
export interface WorkflowWorkerResult {
    task: SisoTask;
    child: PublicSpawnRunResult;
}
export interface WorkflowAllocationMetadata {
    kind?: string;
    workflowMode?: string;
    parentTaskId?: string;
    allocationId?: string;
    assignmentId?: string;
    stepId?: string;
    specialistId?: string;
    domain?: string;
    ownershipBoundary?: string;
    stageIndex?: number;
    workerIndex?: number;
    agent?: string;
    verifierId?: string;
    verifierVerdict?: string;
    feedbackIteration?: number;
    verificationContract?: WorkflowVerificationContract;
    requiredChecks?: string[];
    acceptanceCriteria?: string[];
}
export interface WorkflowStageResult {
    index: number;
    mode: "fanout" | "single" | "parallel";
    workers: string[];
}
export interface WorkflowVerifierResult {
    id: string;
    profile: string;
    status: "completed" | "background" | "failed" | "timeout" | "aborted" | "planned" | "unsupported";
    verdict: "pass" | "needs_fix" | "blocked" | "unknown";
    tokens: {
        input: number;
        output: number;
        totalTokens: number;
    };
    compactResult: PublicSpawnRunResult["compactResult"];
    finalOutput: string;
    toolCalls: number;
    eventCount: number;
}
export interface WorkflowFeedbackPacket {
    verdict: string;
    missingRequirement: string;
    failingCheckCommand: string | null;
    failureSignature: string;
    relevantFiles: string[];
    suggestedNextAction: string;
    freshCheckpointRequired: boolean;
}
export interface WorkflowCheckResult {
    command: string;
    action: "run-check";
    ok: boolean;
    blocked: boolean;
    exitCode: number | null;
    elapsedMs: number;
    timedOut: boolean;
    summary: string;
}
export interface WorkflowCheckIteration {
    iteration: number;
    ok: boolean;
    results: WorkflowCheckResult[];
}
export interface WorkflowCheckpoint {
    iteration: number;
    reason: string;
    createdAt: string;
    rollbackMode: "explicit-only";
    statusOk: boolean;
    statusText: string;
    diffStatOk: boolean;
    diffStatText: string;
}
export interface WorkflowFlightRecorder {
    id: string;
    path: string;
    records: string[];
}
export interface WorkflowVerificationContract {
    verifier: "minimax.verifier" | string;
    verify: boolean;
    verifyIterations: number;
    requiredChecks: string[];
    verifierTools: "none" | string;
    rollbackMode: "explicit-only" | string;
}
export interface WorkflowRunResult {
    task: SisoTask;
    mode?: "fanout" | "parallel" | "chain";
    allocationId?: string;
    verificationContract?: WorkflowVerificationContract;
    recipe?: string;
    stages?: WorkflowStageResult[];
    council?: CouncilRunResult;
    verifier?: WorkflowVerifierResult;
    verifierIterations?: WorkflowVerifierResult[];
    feedbackPackets?: WorkflowFeedbackPacket[];
    failureSignatures?: string[];
    reentryWorkerIds?: string[];
    checkIterations?: WorkflowCheckIteration[];
    checksOk?: boolean;
    requiredChecks?: string[];
    failedCheckCommand?: string;
    checkpoints?: WorkflowCheckpoint[];
    flightRecorder?: WorkflowFlightRecorder;
    allocationPlan?: WorkflowAllocationPlan;
    controllerAllocation?: WorkflowControllerAllocationResult;
    maxVerifierIterations?: number;
    loopOutcome?: "skipped" | "passed" | "passed_after_feedback" | "needs_fix_exhausted" | "blocked" | "check_blocked" | "checks_failed_exhausted" | "worker_failed" | "verifier_unknown";
    workers: WorkflowWorkerResult[];
    status: "planned" | "completed" | "partial" | "failed" | "background";
    totalTokens: number;
    eventCount: number;
}
export declare function runWorkflow(task: string, options?: WorkflowOptions, signal?: AbortSignal): Promise<WorkflowRunResult>;
export declare function parseWorkflowAllocationPlan(value: unknown): WorkflowAllocationPlan | undefined;
export declare function validateWorkflowAllocationPlan(plan: unknown): WorkflowAllocationPlan;
export declare function formatWorkflowResult(result: WorkflowRunResult): string;
