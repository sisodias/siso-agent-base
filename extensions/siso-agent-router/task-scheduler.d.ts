export type SisoTaskSchedulerStatus = "ready" | "blocked" | "claimed" | "running" | "done" | "failed" | "cancelled";
export interface SisoTaskSchedulerTask {
    id: string;
    status: SisoTaskSchedulerStatus;
    blockedBy?: readonly string[];
    dependsOn?: readonly string[];
    updatedAt?: string;
    completedAt?: string;
    [key: string]: unknown;
}
export interface TaskSchedulerOptions {
    maxParallel?: number;
    now?: string | Date | (() => string | Date);
}
export interface ClaimNextTaskResult<T extends SisoTaskSchedulerTask> {
    tasks: T[];
    task: T | null;
    index: number;
}
export interface BuildReadyWaveResult<T extends SisoTaskSchedulerTask> {
    tasks: T[];
    claimedTasks: T[];
}
export interface FailAndBlockChildrenResult<T extends SisoTaskSchedulerTask> {
    tasks: T[];
    failedTask: T | null;
    blockedTasks: T[];
}
export interface ResumeFailedResult<T extends SisoTaskSchedulerTask> {
    tasks: T[];
    rootTask: T | null;
    resumedTasks: T[];
}
export declare function claimNextTask<T extends SisoTaskSchedulerTask>(tasks: readonly T[], options?: TaskSchedulerOptions): ClaimNextTaskResult<T>;
export declare function buildReadyWave<T extends SisoTaskSchedulerTask>(tasks: readonly T[], options?: TaskSchedulerOptions): BuildReadyWaveResult<T>;
export declare function failAndBlockChildren<T extends SisoTaskSchedulerTask>(tasks: readonly T[], failedId: string, options?: TaskSchedulerOptions): FailAndBlockChildrenResult<T>;
export declare function resumeFailed<T extends SisoTaskSchedulerTask>(tasks: readonly T[], rootId: string, options?: TaskSchedulerOptions): ResumeFailedResult<T>;
