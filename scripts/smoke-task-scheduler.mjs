import assert from "node:assert/strict";
import {
  buildReadyWave,
  claimNextTask,
  failAndBlockChildren,
  resumeFailed,
} from "../extensions/siso-agent-router/task-scheduler.js";

function task(id, status, extra = {}) {
  return {
    id,
    title: id,
    description: "",
    status,
    priority: "B",
    profile: "profile",
    lane: "lane",
    model: "model",
    blockedBy: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

{
  const tasks = [
    task("blocked-root", "blocked", { blockedBy: ["dependency"] }),
    task("ready-child", "ready"),
    task("dependency", "done"),
  ];

  const result = claimNextTask(tasks);
  assert.equal(result.task?.id, "ready-child");
  assert.equal(result.tasks[0].status, "blocked");
  assert.equal(result.tasks[1].status, "claimed");
  assert.equal(result.tasks[2].status, "done");
}

{
  const tasks = [
    task("runner", "running"),
    task("ready-a", "ready"),
    task("ready-b", "ready"),
    task("backlog", "backlog"),
    task("blocked", "blocked", { blockedBy: ["runner"] }),
  ];

  const result = buildReadyWave(tasks, { maxParallel: 2 });
  assert.deepEqual(
    result.claimedTasks.map((item) => item.id),
    ["ready-a"],
  );
  assert.equal(result.tasks.find((item) => item.id === "runner")?.status, "running");
  assert.equal(result.tasks.find((item) => item.id === "ready-a")?.status, "claimed");
  assert.equal(result.tasks.find((item) => item.id === "ready-b")?.status, "ready");
  assert.equal(result.tasks.find((item) => item.id === "backlog")?.status, "backlog");
  assert.equal(result.tasks.find((item) => item.id === "blocked")?.status, "blocked");
}

{
  const tasks = [
    task("root", "running"),
    task("child", "ready", { dependsOn: ["root"] }),
    task("grandchild", "claimed", { blockedBy: ["child"] }),
    task("done-leaf", "done", { dependsOn: ["child"] }),
  ];

  const result = failAndBlockChildren(tasks, "root");
  assert.equal(result.failedTask?.id, "root");
  assert.equal(result.tasks.find((item) => item.id === "root")?.status, "failed");
  assert.equal(result.tasks.find((item) => item.id === "child")?.status, "blocked");
  assert.equal(result.tasks.find((item) => item.id === "grandchild")?.status, "blocked");
  assert.equal(result.tasks.find((item) => item.id === "done-leaf")?.status, "done");
}

{
  const tasks = [
    task("root", "failed"),
    task("child", "failed", { dependsOn: ["root"] }),
    task("grandchild", "failed", { blockedBy: ["child"] }),
    task("done-leaf", "done", { dependsOn: ["child"] }),
    task("cancelled-leaf", "cancelled", { blockedBy: ["root"] }),
  ];

  const result = resumeFailed(tasks, "root");
  assert.equal(result.rootTask?.id, "root");
  assert.equal(result.tasks.find((item) => item.id === "root")?.status, "ready");
  assert.equal(result.tasks.find((item) => item.id === "child")?.status, "blocked");
  assert.equal(result.tasks.find((item) => item.id === "grandchild")?.status, "blocked");
  assert.equal(result.tasks.find((item) => item.id === "done-leaf")?.status, "done");
  assert.equal(result.tasks.find((item) => item.id === "cancelled-leaf")?.status, "cancelled");
}

console.log("SISO_TASK_SCHEDULER_SMOKE_OK");
