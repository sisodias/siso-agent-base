#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_V2_READINESS_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(root, rel));

const pkg = readJson("package.json");
const scripts = pkg.scripts ?? {};

if (!exists("docs/strategy/v2.1-readiness-plan.md")) fail("missing docs/strategy/v2.1-readiness-plan.md");
if (!scripts["smoke:v2-readiness"]) fail("missing npm script smoke:v2-readiness");
if (!scripts["smoke:tool-selection-eval"]) fail("missing npm script smoke:tool-selection-eval");
if (!scripts["smoke:all"]?.includes("npm run smoke:tool-selection-eval")) fail("smoke:all omits smoke:tool-selection-eval");
if (!scripts["smoke:all"]?.includes("npm run smoke:v2-readiness")) fail("smoke:all omits smoke:v2-readiness");

const tmpArtifacts = [
  "scripts/smoke-flight-recorder.mjs.tmp"
].filter(exists);
if (tmpArtifacts.length) fail(`remove temp artifacts before V2: ${tmpArtifacts.join(", ")}`);

const registry = readJson("docs/capabilities/registry.json");
const activeByName = new Map();
for (const cap of registry.capabilities ?? []) {
  activeByName.set(String(cap.name || "").toLowerCase(), cap);
}
const ideas = read("docs/capabilities/ideas.md");
const current = read("docs/capabilities/current.md");
const changelogCandidates = read("docs/capabilities/changelog-candidates.md");

for (const name of ["Source Drift Detector", "Agent Contracts", "Agent Flight Recorder"]) {
  const cap = activeByName.get(name.toLowerCase());
  if (!cap || cap.status === "idea" || cap.exists === false) continue;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^##\\s+${escaped}\\s*$`, "m").test(ideas)) {
    fail(`${name} is active in registry but still listed in ideas.md`);
  }
  const missingSection = current.split(/^##\s+Missing \/ Proposed\s*$/m)[1] ?? "";
  if (new RegExp(`^-\\s+${escaped}\\s*$`, "m").test(missingSection)) {
    fail(`${name} is active in registry but still listed as missing/proposed in current.md`);
  }
}

for (const requiredIdea of ["Capability Audit Smoke", "Live Event-Driven TUI", "Capability CLI", "Autopilot Smoke/Fix Loop"]) {
  const escaped = requiredIdea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`^##\\s+${escaped}\\s*$`, "m").test(ideas)) {
    fail(`ideas.md missing live idea ${requiredIdea}`);
  }
}

const pending = changelogCandidates.split(/^##\s+Pending\s*$/m)[1]?.split(/^##\s+Consumed\s*$/m)[0] ?? "";
for (const consumed of ["Tool Scenario Cards", "Lazy Tool Discovery", "Agent Tooling Roadmap", "Capability Registry"]) {
  if (pending.includes(consumed)) fail(`changelog-candidates pending still includes consumed item: ${consumed}`);
}
if (/^None yet\.\s*$/m.test(changelogCandidates)) fail("changelog-candidates consumed section still says None yet");

console.log("SISO_V2_READINESS_SMOKE_OK");
