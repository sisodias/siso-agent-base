import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSisoTaskWave,
  claimNextSisoTask,
  createSisoTask,
  failAndBlockSisoTask,
  listSisoTasks,
  resumeFailedSisoTask,
} from "../extensions/siso-agent-router/task-store.js";

const cwd = mkdtempSync(join(tmpdir(), "siso-task-store-scheduler-"));

try {
  const dep = createSisoTask({
    cwd,
    title: "Dependency",
    status: "ready",
  }).task;
  const child = createSisoTask({
    cwd,
    title: "Child",
    status: "blocked",
    blockedBy: [dep.id],
  }).task;
  const independent = createSisoTask({
    cwd,
    title: "Independent",
    status: "ready",
  }).task;

  const claimed = claimNextSisoTask({ cwd });
  assert.equal(claimed.task.id, independent.id);
  assert.equal(claimed.task.status, "claimed");

  const failed = failAndBlockSisoTask({ cwd, id: dep.id });
  assert.equal(failed.failedTask.id, dep.id);
  assert.equal(failed.failedTask.status, "failed");
  assert.equal(failed.blockedTasks.map((task) => task.id).includes(child.id), true);

  const resumed = resumeFailedSisoTask({ cwd, id: dep.id });
  assert.equal(resumed.rootTask.id, dep.id);
  assert.equal(resumed.rootTask.status, "ready");

  const wave = buildSisoTaskWave({ cwd, maxParallel: 2 });
  assert.equal(wave.claimedTasks.length, 1);
  assert.equal(wave.claimedTasks[0].id, dep.id);

  const listed = listSisoTasks({ cwd, limit: 10 });
  assert.equal(listed.total, 3);
  assert.equal(listed.tasks.some((task) => task.status === "claimed"), true);
} finally {
  rmSync(cwd, { recursive: true, force: true });
}

console.log("SISO_TASK_STORE_SCHEDULER_SMOKE_OK");
