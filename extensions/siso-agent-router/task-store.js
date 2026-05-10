import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { chooseRoute } from "./route-policy.js";
import { buildReadyWave, claimNextTask, failAndBlockChildren, resumeFailed } from "./task-scheduler.js";
export function taskStorePath(cwd = process.cwd()) {
    return join(resolve(cwd), ".pi", "tasks", "siso-tasks.json");
}
function emptyStore() {
    return { version: 1, tasks: [] };
}
function readStore(path) {
    if (!existsSync(path))
        return emptyStore();
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return { version: 1, tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [] };
}
function writeStore(path, store) {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`);
    renameSync(tmp, path);
}
function routeForTask(title, description) {
    return chooseRoute(`${title}\n${description}`.trim());
}
function taskFromRoute(input, route, now) {
    return {
        id: `siso-task-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
        title: input.title,
        description: input.description ?? "",
        status: input.status ?? (input.blockedBy?.length ? "blocked" : "ready"),
        priority: input.priority ?? "B",
        ...(input.owner ? { owner: input.owner } : {}),
        profile: route.profile,
        lane: route.lane,
        model: route.model,
        blockedBy: input.blockedBy ?? [],
        createdAt: now,
        updatedAt: now,
        ...(input.metadata ? { metadata: input.metadata } : {}),
    };
}
export function createSisoTask(input) {
    if (!input.title.trim())
        throw new Error("title is required");
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const now = new Date().toISOString();
    const route = routeForTask(input.title, input.description ?? "");
    const task = taskFromRoute(input, route, now);
    store.tasks.unshift(task);
    writeStore(path, store);
    return { path, task };
}
export function listSisoTasks(input = {}) {
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const query = input.query?.trim().toLowerCase();
    const filtered = store.tasks
        .filter((task) => !input.status || task.status === input.status)
        .filter((task) => !query || [
        task.id,
        task.title,
        task.description,
        task.profile,
        task.lane,
        task.model,
        task.owner ?? "",
        JSON.stringify(task.metadata ?? {}),
    ].join("\n").toLowerCase().includes(query))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const limit = Math.max(1, Math.min(typeof input.limit === "number" ? Math.floor(input.limit) : 20, 100));
    return { path, tasks: filtered.slice(0, limit), total: store.tasks.length };
}
export function updateSisoTask(input) {
    if (!input.id.trim())
        throw new Error("id is required");
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const index = store.tasks.findIndex((task) => task.id === input.id);
    if (index < 0)
        throw new Error(`task not found: ${input.id}`);
    const existing = store.tasks[index];
    const now = new Date().toISOString();
    const next = {
        ...existing,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.owner !== undefined ? { owner: input.owner } : {}),
        ...(input.blockedBy !== undefined ? { blockedBy: input.blockedBy } : {}),
        ...(input.metadata !== undefined ? { metadata: { ...(existing.metadata ?? {}), ...input.metadata } } : {}),
        updatedAt: now,
    };
    if (input.title !== undefined || input.description !== undefined) {
        const route = routeForTask(next.title, next.description);
        next.profile = route.profile;
        next.lane = route.lane;
        next.model = route.model;
    }
    if (["done", "failed", "cancelled"].includes(next.status)) {
        next.completedAt = next.completedAt ?? now;
    }
    else {
        delete next.completedAt;
    }
    store.tasks[index] = next;
    writeStore(path, store);
    return { path, task: next };
}
export function claimNextSisoTask(input = {}) {
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const result = claimNextTask(store.tasks, {
        ...(input.now ? { now: input.now } : {}),
    });
    store.tasks = result.tasks;
    writeStore(path, store);
    return {
        path,
        task: result.task,
        index: result.index,
        tasks: result.tasks,
        total: store.tasks.length,
    };
}
export function buildSisoTaskWave(input = {}) {
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const result = buildReadyWave(store.tasks, {
        ...(typeof input.maxParallel === "number" ? { maxParallel: input.maxParallel } : {}),
        ...(input.now ? { now: input.now } : {}),
    });
    store.tasks = result.tasks;
    writeStore(path, store);
    return {
        path,
        claimedTasks: result.claimedTasks,
        tasks: result.tasks,
        total: store.tasks.length,
    };
}
export function failAndBlockSisoTask(input) {
    if (!input.id.trim())
        throw new Error("id is required");
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const result = failAndBlockChildren(store.tasks, input.id, {
        ...(input.now ? { now: input.now } : {}),
    });
    store.tasks = result.tasks;
    writeStore(path, store);
    return {
        path,
        failedTask: result.failedTask,
        blockedTasks: result.blockedTasks,
        tasks: result.tasks,
        total: store.tasks.length,
    };
}
export function resumeFailedSisoTask(input) {
    if (!input.id.trim())
        throw new Error("id is required");
    const path = taskStorePath(input.cwd);
    const store = readStore(path);
    const result = resumeFailed(store.tasks, input.id, {
        ...(input.now ? { now: input.now } : {}),
    });
    store.tasks = result.tasks;
    writeStore(path, store);
    return {
        path,
        rootTask: result.rootTask,
        resumedTasks: result.resumedTasks,
        tasks: result.tasks,
        total: store.tasks.length,
    };
}
export function formatSisoTask(task) {
    return [
        `id=${task.id}`,
        `status=${task.status}`,
        `priority=${task.priority}`,
        `title=${JSON.stringify(task.title)}`,
        `profile=${task.profile}`,
        `lane=${task.lane}`,
        `model=${task.model}`,
        `owner=${task.owner ?? "none"}`,
        `blocked_by=${task.blockedBy.join(",") || "none"}`,
        `updated_at=${task.updatedAt}`,
    ].join(" ");
}
export function formatSisoTaskScheduleResult(result) {
    const lines = [
        `store=${result.path}`,
        `total=${result.total ?? result.tasks?.length ?? 0}`,
    ];
    if (result.task !== undefined) {
        lines.push(result.task ? `claimed=${result.task.id}` : "claimed=none");
    }
    if (Array.isArray(result.claimedTasks)) {
        lines.push(`claimed=${result.claimedTasks.map((task) => task.id).join(",") || "none"}`);
    }
    if (result.failedTask) {
        lines.push(`failed=${result.failedTask.id}`);
    }
    if (Array.isArray(result.blockedTasks)) {
        lines.push(`blocked=${result.blockedTasks.map((task) => task.id).join(",") || "none"}`);
    }
    if (result.rootTask) {
        lines.push(`resumed_root=${result.rootTask.id}`);
    }
    if (Array.isArray(result.resumedTasks)) {
        lines.push(`resumed=${result.resumedTasks.map((task) => `${task.id}:${task.status}`).join(",") || "none"}`);
    }
    return lines.join("\n");
}
export function formatSisoTaskList(result) {
    if (result.tasks.length === 0) {
        return `No SISO tasks matched.\nstore=${result.path}\ntotal=${result.total}`;
    }
    return [
        `store=${result.path}`,
        `returned=${result.tasks.length}`,
        `total=${result.total}`,
        ...result.tasks.map(formatSisoTask),
    ].join("\n");
}
