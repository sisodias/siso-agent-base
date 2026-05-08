import { type ModelId, type ModelLane } from "./profile-registry.js";
export type SisoTaskStatus = "backlog" | "ready" | "running" | "blocked" | "done" | "failed" | "cancelled";
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
export declare function formatSisoTask(task: SisoTask): string;
export declare function formatSisoTaskList(result: {
    path: string;
    tasks: SisoTask[];
    total: number;
}): string;
