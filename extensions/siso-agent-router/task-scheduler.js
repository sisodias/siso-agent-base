const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);
const ACTIVE_STATUSES = new Set(["claimed", "running"]);

function uniqueStrings(values) {
    const seen = new Set();
    const output = [];
    for (const value of values ?? []) {
        if (typeof value !== "string")
            continue;
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed))
            continue;
        seen.add(trimmed);
        output.push(trimmed);
    }
    return output;
}
function dependencyIds(task) {
    return uniqueStrings([...(task.blockedBy ?? []), ...(task.dependsOn ?? [])]).filter((id) => id !== task.id);
}
function isTerminal(status) {
    return TERMINAL_STATUSES.has(status);
}
function isProtectedTerminal(status) {
    return status === "done" || status === "cancelled";
}
function dependencyMap(tasks) {
    const byId = new Map();
    for (const task of tasks) {
        byId.set(task.id, task);
    }
    return byId;
}
function areDependenciesSatisfied(task, byId) {
    const deps = dependencyIds(task);
    if (deps.length === 0)
        return true;
    for (const depId of deps) {
        const dep = byId.get(depId);
        if (!dep || dep.status !== "done") {
            return false;
        }
    }
    return true;
}
function collectDescendants(tasks, rootId) {
    const childrenByParent = new Map();
    for (const task of tasks) {
        for (const depId of dependencyIds(task)) {
            const bucket = childrenByParent.get(depId);
            if (bucket) {
                bucket.push(task.id);
            }
            else {
                childrenByParent.set(depId, [task.id]);
            }
        }
    }
    const descendants = [];
    const seen = new Set([rootId]);
    const stack = [...(childrenByParent.get(rootId) ?? [])];
    while (stack.length > 0) {
        const id = stack.pop();
        if (!id || seen.has(id))
            continue;
        seen.add(id);
        descendants.push(id);
        for (const childId of childrenByParent.get(id) ?? []) {
            if (!seen.has(childId))
                stack.push(childId);
        }
    }
    return descendants;
}
function cloneTask(task, changes = {}) {
    const next = { ...task, ...changes };
    if (changes.status !== undefined) {
        next.updatedAt = changes.updatedAt ?? task.updatedAt;
        if (isTerminal(changes.status)) {
            next.completedAt = changes.completedAt ?? task.completedAt ?? next.updatedAt;
        }
        else {
            delete next.completedAt;
        }
    }
    return next;
}
function nowIso(now = new Date()) {
    if (typeof now === "function") {
        return nowIso(now());
    }
    if (typeof now === "string")
        return now;
    if (now instanceof Date)
        return now.toISOString();
    return new Date().toISOString();
}
function claimableIndex(tasks) {
    const byId = dependencyMap(tasks);
    for (let index = 0; index < tasks.length; index++) {
        const task = tasks[index];
        if (task.status !== "ready")
            continue;
        if (!areDependenciesSatisfied(task, byId))
            continue;
        return index;
    }
    return -1;
}
function activeCount(tasks) {
    return tasks.reduce((count, task) => count + (ACTIVE_STATUSES.has(task.status) ? 1 : 0), 0);
}
function normalizeReadyBlocked(tasks) {
    const byId = dependencyMap(tasks);
    return tasks.map((task) => {
        if (isTerminal(task.status) || ACTIVE_STATUSES.has(task.status)) {
            return task;
        }
        if (task.status !== "ready" && task.status !== "blocked") {
            return task;
        }
        const nextStatus = areDependenciesSatisfied(task, byId) ? "ready" : "blocked";
        return nextStatus === task.status ? task : cloneTask(task, { status: nextStatus });
    });
}
export function claimNextTask(tasks, options = {}) {
    const nextTasks = tasks.slice();
    const index = claimableIndex(nextTasks);
    if (index < 0) {
        return { tasks: nextTasks, task: null, index: -1 };
    }
    const task = nextTasks[index];
    const updatedAt = nowIso(options.now);
    const claimedTask = cloneTask(task, { status: "claimed", updatedAt });
    nextTasks[index] = claimedTask;
    return { tasks: nextTasks, task: claimedTask, index };
}
export function buildReadyWave(tasks, options = {}) {
    const maxParallel = Number.isFinite(options.maxParallel) ? Math.max(0, Math.floor(options.maxParallel)) : Number.POSITIVE_INFINITY;
    const nextTasks = normalizeReadyBlocked(tasks.slice());
    let slots = Number.isFinite(maxParallel) ? Math.max(0, maxParallel - activeCount(nextTasks)) : Number.POSITIVE_INFINITY;
    const claimedTasks = [];
    if (slots <= 0) {
        return { tasks: nextTasks, claimedTasks };
    }
    const updatedAt = nowIso(options.now);
    for (let index = 0; index < nextTasks.length && slots > 0; index++) {
        const task = nextTasks[index];
        if (task.status !== "ready")
            continue;
        const claimedTask = cloneTask(task, { status: "claimed", updatedAt });
        nextTasks[index] = claimedTask;
        claimedTasks.push(claimedTask);
        slots--;
    }
    return { tasks: nextTasks, claimedTasks };
}
export function failAndBlockChildren(tasks, failedId, options = {}) {
    const nextTasks = tasks.slice();
    const index = nextTasks.findIndex((task) => task.id === failedId);
    if (index < 0) {
        throw new Error(`task not found: ${failedId}`);
    }
    const affectedIds = new Set([failedId, ...collectDescendants(nextTasks, failedId)]);
    const updatedAt = nowIso(options.now);
    const blockedTasks = [];
    let failedTask = null;
    for (let i = 0; i < nextTasks.length; i++) {
        const task = nextTasks[i];
        if (!affectedIds.has(task.id))
            continue;
        if (task.id === failedId) {
            const nextTask = cloneTask(task, { status: "failed", updatedAt });
            nextTasks[i] = nextTask;
            failedTask = nextTask;
            continue;
        }
        if (isTerminal(task.status))
            continue;
        const nextTask = cloneTask(task, { status: "blocked", updatedAt });
        nextTasks[i] = nextTask;
        blockedTasks.push(nextTask);
    }
    return { tasks: nextTasks, failedTask, blockedTasks };
}
export function resumeFailed(tasks, rootId, options = {}) {
    const nextTasks = tasks.slice();
    const index = nextTasks.findIndex((task) => task.id === rootId);
    if (index < 0) {
        throw new Error(`task not found: ${rootId}`);
    }
    if (nextTasks[index].status !== "failed") {
        throw new Error(`task is not failed: ${rootId}`);
    }
    const descendants = collectDescendants(nextTasks, rootId);
    const descendantIds = new Set(descendants);
    const byId = dependencyMap(nextTasks);
    const updatedAt = nowIso(options.now);
    let rootTask = null;
    const resumedTasks = [];
    for (let i = 0; i < nextTasks.length; i++) {
        const task = nextTasks[i];
        if (task.id === rootId) {
            const nextStatus = areDependenciesSatisfied(task, byId) ? "ready" : "blocked";
            const nextTask = cloneTask(task, { status: nextStatus, updatedAt });
            nextTasks[i] = nextTask;
            rootTask = nextTask;
            resumedTasks.push(nextTask);
            continue;
        }
        if (!descendantIds.has(task.id))
            continue;
        if (isProtectedTerminal(task.status))
            continue;
        const nextTask = cloneTask(task, { status: "blocked", updatedAt });
        nextTasks[i] = nextTask;
        resumedTasks.push(nextTask);
    }
    return { tasks: nextTasks, rootTask, resumedTasks };
}
