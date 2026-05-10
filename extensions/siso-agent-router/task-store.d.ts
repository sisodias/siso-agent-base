import { type ModelId, type ModelLane } from "./profile-registry.js";
export type SisoTaskStatus = "backlog" | "ready" | "claimed" | "running" | "blocked" | "done" | "failed" | "cancelled";
export type SisoTaskPriority = "A" | "B" | "C" | "D";
export interface SisoTask {
    id: string;
    title: string;
    description: string;
    status: SisoTaskStatus;
    priority: SisoTaskPriority;
    owner?: string;
    profile: string;
    lane: ModelLane;
    model: ModelId;
    blockedBy: string[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    metadata?: Record<string, unknown>;
}
export interface TaskStore {
    version: 1;
    tasks: SisoTask[];
}
export interface CreateTaskInput {
    cwd?: string;
    title: string;
    description?: string;
    status?: SisoTaskStatus;
    priority?: SisoTaskPriority;
    owner?: string;
    blockedBy?: string[];
    metadata?: Record<string, unknown>;
}
export interface ListTaskInput {
    cwd?: string;
    status?: SisoTaskStatus;
    query?: string;
    limit?: number;
}
export interface UpdateTaskInput {
    cwd?: string;
    id: string;
    title?: string;
    description?: string;
    status?: SisoTaskStatus;
    priority?: SisoTaskPriority;
    owner?: string;
    blockedBy?: string[];
    metadata?: Record<string, unknown>;
}
export interface TaskScheduleInput {
    cwd?: string;
    now?: string | Date | (() => string | Date);
}
export interface TaskWaveInput extends TaskScheduleInput {
    maxParallel?: number;
}
export interface TaskIdScheduleInput extends TaskScheduleInput {
    id: string;
}
export declare function taskStorePath(cwd?: string): string;
export declare function createSisoTask(input: CreateTaskInput): {
    path: string;
    task: SisoTask;
};
export declare function listSisoTasks(input?: ListTaskInput): {
    path: string;
    tasks: SisoTask[];
    total: number;
};
export declare function updateSisoTask(input: UpdateTaskInput): {
    path: string;
    task: SisoTask;
};
export declare function claimNextSisoTask(input?: TaskScheduleInput): {
    path: string;
    task: SisoTask | null;
    index: number;
    tasks: SisoTask[];
    total: number;
};
export declare function buildSisoTaskWave(input?: TaskWaveInput): {
    path: string;
    claimedTasks: SisoTask[];
    tasks: SisoTask[];
    total: number;
};
export declare function failAndBlockSisoTask(input: TaskIdScheduleInput): {
    path: string;
    failedTask: SisoTask | null;
    blockedTasks: SisoTask[];
    tasks: SisoTask[];
    total: number;
};
export declare function resumeFailedSisoTask(input: TaskIdScheduleInput): {
    path: string;
    rootTask: SisoTask | null;
    resumedTasks: SisoTask[];
    tasks: SisoTask[];
    total: number;
};
export declare function formatSisoTask(task: SisoTask): string;
export declare function formatSisoTaskScheduleResult(result: {
    path: string;
    total?: number;
    tasks?: SisoTask[];
    task?: SisoTask | null;
    claimedTasks?: SisoTask[];
    failedTask?: SisoTask | null;
    blockedTasks?: SisoTask[];
    rootTask?: SisoTask | null;
    resumedTasks?: SisoTask[];
}): string;
export declare function formatSisoTaskList(result: {
    path: string;
    tasks: SisoTask[];
    total: number;
}): string;
