#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "siso-doctor-smoke-"));
const home = join(root, "home");
const source = join(home, "SISO_Workspace", "SISO_Agent_Base");
const runtime = join(root, "runtime");

mkdirSync(source, { recursive: true });
mkdirSync(runtime, { recursive: true });

function runDoctor() {
  return spawnSync("bash", ["bin/siso-doctor"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: home,
      SISO_AGENT_BASE_DIR: runtime,
      SISO_DOCTOR_VERSION_ONLY: "1",
      PATH: process.env.PATH ?? "",
    },
    encoding: "utf8",
  });
}

writeFileSync(join(source, "VERSION"), "2.0.0\n", "utf8");
writeFileSync(join(runtime, "VERSION"), "2.0.0\n", "utf8");

const matched = runDoctor();
assert.equal(matched.status, 0, matched.stderr);
assert.match(matched.stdout, /canonical source found/);
assert.match(matched.stdout, /installed runtime matches canonical source version \(2\.0\.0\)/);
assert.match(matched.stdout, /SISO doctor passed/);

writeFileSync(join(runtime, "VERSION"), "1.9.9\n", "utf8");
const drifted = runDoctor();
assert.notEqual(drifted.status, 0, "version drift must fail doctor");
assert.match(drifted.stdout, /fail - installed runtime version 1\.9\.9 differs from canonical source version 2\.0\.0/);
assert.match(drifted.stderr, /SISO doctor found issues/);

const doctorScript = readFileSync("bin/siso-doctor", "utf8");
assert.match(doctorScript, /profile_has_stale_local_routing\(\)/, "doctor should isolate stale local-route checks");
assert.doesNotMatch(doctorScript, /grep -R "127\\.0\\.0\\.1:8080\\\\\|localhost:8080\\\\\|codex-proxy-local-key" "\$PROFILE_DIR"/, "doctor should not scan old session transcripts for stale active routing");

console.log("SISO_DOCTOR_SMOKE_OK");
