#!/usr/bin/env node
import assert from "node:assert/strict";
import { gatherContext } from "../extensions/siso-agent-router/tooling-actions.js";
const root = process.cwd();
const result = gatherContext({ cwd: root, task: "improve tool recommendation ranking and scenario cards", limit: 4, maxChars: 4000 });
assert.equal(result.action, "gather-context");
assert.ok(result.evidence.length > 0);
assert.ok(result.files.files.length > 0);
assert.ok(result.relatedChecks.primary.includes("npm run smoke:agent-tooling"));
assert.ok(result.recommendation.recommendations.length > 0);
console.log("SISO_GATHER_CONTEXT_SMOKE_OK");
