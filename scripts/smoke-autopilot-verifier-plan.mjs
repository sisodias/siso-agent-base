#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_AUTOPILOT_VERIFIER_PLAN_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["smoke:autopilot-verifier"]) fail("missing npm script smoke:autopilot-verifier");
if (!pkg.scripts?.["smoke:all"]?.includes("npm run smoke:autopilot-verifier")) fail("smoke:all omits smoke:autopilot-verifier");

const docPath = "docs/strategy/autopilot-verifier-loop.md";
if (!exists(docPath)) fail(`missing ${docPath}`);
const doc = read(docPath);
const required = [
  "controller",
  "worker",
  "verifier",
  "Minimax",
  "checkpoint",
  "failure signature",
  "maxIterations",
  "sessionId",
  "threadId",
  "flight recorder",
  "feedback packet",
  "read-only verifier",
  "no raw logs",
];
for (const term of required) {
  if (!doc.toLowerCase().includes(term.toLowerCase())) fail(`${docPath} missing required term: ${term}`);
}

const readiness = read("docs/strategy/v2.1-readiness-plan.md");
if (!readiness.includes(docPath)) fail("V2.1 readiness plan does not reference autopilot verifier loop doc");

console.log("SISO_AUTOPILOT_VERIFIER_PLAN_SMOKE_OK");
