#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "siso-wrapper-smoke-"));
const runtime = join(root, "runtime");
mkdirSync(runtime, { recursive: true });
writeFileSync(join(runtime, "package.json"), JSON.stringify({
  type: "module",
  scripts: {
    "smoke:release": "node -e \"console.log('WRAPPER_RELEASE_OK')\"",
  },
}, null, 2), "utf8");

function runSiso(args) {
  return spawnSync("bash", ["bin/siso", ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SISO_AGENT_BASE_DIR: runtime,
      PATH: process.env.PATH ?? "",
    },
    encoding: "utf8",
  });
}

for (const helpArg of ["help", "list", "--help", "-h"]) {
  const result = runSiso(["smoke", helpArg]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SISO smoke commands/);
  assert.match(result.stdout, /Usage:\n  siso smoke \[name\]/);
  assert.match(result.stdout, /siso smoke release/);
  assert.doesNotMatch(result.stdout, /npm ERR!/);
}

const release = runSiso(["smoke", "release"]);
assert.equal(release.status, 0, release.stderr);
assert.match(release.stdout, /WRAPPER_RELEASE_OK/);
assert.doesNotMatch(release.stderr, /npm ERR!/);

console.log("SISO_WRAPPER_SMOKE_OK");
