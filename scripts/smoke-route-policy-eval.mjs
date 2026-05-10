#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chooseRoute } from "../extensions/siso-agent-router/route-policy.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const casesPath = path.join(root, "benchmarks", "harness", "route-policy-cases.json");
const outDir = path.join(root, "artifacts", "evals");
const casesDoc = JSON.parse(fs.readFileSync(casesPath, "utf8"));

assert.equal(casesDoc.version, 1);
assert.ok(Array.isArray(casesDoc.cases));
assert.ok(casesDoc.cases.length >= 10);

const results = casesDoc.cases.map((item) => {
  const decision = chooseRoute(item.task);
  const actualRoute = decision.profile;
  return {
    id: item.id,
    task: item.task,
    actualRoute,
    expectedCurrentRoute: item.currentRoute,
    matchesDocumentedCurrent: actualRoute === item.currentRoute,
    desiredOutcome: item.desiredOutcome,
  };
});

const mismatches = results.filter((item) => !item.matchesDocumentedCurrent);
assert.deepEqual(mismatches, [], "route-policy current behavior drifted; update fixtures or inspect routing changes");

const controllerTargets = results.filter((item) => item.desiredOutcome.controller === "gpt55");
assert.ok(controllerTargets.length >= 8, "fixtures should primarily exercise controller-first routing targets");

const controllerFirstResults = casesDoc.cases.map((item) => {
  const decision = chooseRoute(item.task, { controllerFirst: true });
  const desired = item.desiredOutcome;
  if (desired.routing === "controller_allocation" || desired.routing === "controller_planning") {
    assert.equal(decision.routing, desired.routing, `${item.id} should route through ${desired.routing}`);
    assert.equal(decision.controller, desired.controller, `${item.id} should use ${desired.controller} controller`);
    assert.equal(decision.profile, "gpt55.planner", `${item.id} should materialize as GPT-5.5 planner/controller`);
  } else if (desired.routing === "direct_or_controller_worker") {
    assert.ok(
      (decision.routing === "direct_worker" && decision.kind === "worker") ||
      (decision.routing === "controller_allocation" && decision.controller === "gpt55"),
      `${item.id} should be worker-capable or controller-allocated`
    );
  }
  for (const domain of desired.domains || []) {
    assert.ok(decision.domains?.includes(domain), `${item.id} missing desired domain ${domain}`);
  }
  return {
    id: item.id,
    actualRoute: decision.profile,
    routing: decision.routing,
    controller: decision.controller,
    domains: decision.domains || [],
    specialists: decision.specialists || [],
    legacyRoute: decision.legacyRoute,
  };
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "route-policy-eval-summary.json"), `${JSON.stringify({
  total: results.length,
  documentedCurrentMatches: results.length - mismatches.length,
  controllerTargets: controllerTargets.length,
  results,
  controllerFirstResults,
}, null, 2)}\n`);

console.log(`SISO_ROUTE_POLICY_EVAL_SMOKE_OK cases=${results.length} controller_targets=${controllerTargets.length} controller_first=${controllerFirstResults.length}`);
