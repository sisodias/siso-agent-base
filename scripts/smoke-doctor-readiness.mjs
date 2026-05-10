#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  SISO_AGENT_BASE_DIR: process.cwd(),
  PATH: process.env.PATH ?? ""
};

for (const [mode, marker] of [
  ["drift", "SISO_SOURCE_DRIFT_SMOKE_OK"],
  ["contracts", "SISO_CONTRACTS_CHANGED_OK"],
  ["readiness", "SISO_DOCTOR_READINESS_OK"]
]) {
  const result = spawnSync("bash", ["bin/siso-doctor", mode], {
    cwd: process.cwd(),
    env,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `${mode} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  assert.match(result.stdout, new RegExp(marker), `${mode} missing marker ${marker}`);
}

console.log("SISO_DOCTOR_READINESS_SMOKE_OK");
