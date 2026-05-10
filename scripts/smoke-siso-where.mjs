#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "siso-where-smoke-"));
const home = join(root, "home");
const source = join(home, "SISO_Workspace", "SISO_Agent_Base");
const runtime = join(root, "runtime");
const profile = join(root, "profile");
const sisoHome = join(root, ".siso");

mkdirSync(source, { recursive: true });
mkdirSync(runtime, { recursive: true });
mkdirSync(profile, { recursive: true });
mkdirSync(sisoHome, { recursive: true });

function runWhere(cwd = source) {
  return execFileSync("bash", ["bin/siso-where"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: home,
      SISO_AGENT_BASE_DIR: runtime,
      SISO_PROFILE_DIR: profile,
      SISO_HOME: sisoHome,
      PATH: process.env.PATH ?? "",
      PWD: cwd,
    },
    encoding: "utf8",
  });
}

function runWhereRuntime(cwd = source) {
  return execFileSync("bash", ["bin/siso-where", "--runtime"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: home,
      SISO_AGENT_BASE_DIR: runtime,
      SISO_PROFILE_DIR: profile,
      SISO_HOME: sisoHome,
      SISO_MODEL: "claude-opus-4-7",
      SISO_TOOLS: "read,bash,siso,siso_context",
      PATH: process.env.PATH ?? "",
      PWD: cwd,
    },
    encoding: "utf8",
  });
}

writeFileSync(join(source, "VERSION"), "1.2.3\n", "utf8");
writeFileSync(join(runtime, "VERSION"), "1.2.3\n", "utf8");

const matched = runWhere();
assert.match(matched, /canonical source: .*SISO_Workspace\/SISO_Agent_Base/);
assert.match(matched, /source version:\s+1\.2\.3/);
assert.match(matched, /runtime version:\s+1\.2\.3/);
assert.match(matched, /version status:\s+match/);
assert.doesNotMatch(matched, /Installed runtime version differs from canonical source version/);

writeFileSync(join(runtime, "VERSION"), "1.2.2\n", "utf8");
const drifted = runWhere();
assert.match(drifted, /source version:\s+1\.2\.3/);
assert.match(drifted, /runtime version:\s+1\.2\.2/);
assert.match(drifted, /version status:\s+drift/);
assert.match(drifted, /Installed runtime version differs from canonical source version/);

const runtimeMap = runWhereRuntime();
assert.match(runtimeMap, /SISO runtime map/);
assert.match(runtimeMap, /provider:\s+bifrost-anthropic/);
assert.match(runtimeMap, /model:\s+claude-opus-4-7/);
assert.match(runtimeMap, /tools:\s+read,bash,siso,siso_context/);
assert.match(runtimeMap, /pi skills:\s+disabled \("--no-skills"\)|pi skills:\s+disabled \(\-\-no-skills\)/);
assert.match(runtimeMap, /manual extensions:/);
assert.match(runtimeMap, /router tool mode:\s+lean/);
assert.match(runtimeMap, /context filter:\s+1/);
assert.match(runtimeMap, /controller routing:\s+1/);

console.log("SISO_WHERE_SMOKE_OK");
