#!/usr/bin/env node
import assert from "node:assert/strict";
import { relatedChecks } from "../extensions/siso-agent-router/tooling-actions.js";
const root = process.cwd();
const tooling = relatedChecks({ cwd: root, paths: "extensions/siso-agent-router/tooling-actions.js,docs/tools/scenario-cards.json", task: "change tool recommendation" });
assert.ok(tooling.primary.includes("npm run smoke:agent-tooling"));
assert.ok(tooling.primary.includes("npm run smoke:tool-scenario-cards"));
assert.ok(tooling.secondary.includes("npm run smoke:tool-selection-eval") || tooling.primary.includes("npm run smoke:tool-selection-eval"));
const release = relatedChecks({ cwd: root, paths: "VERSION,package.json,releases/latest.json,CHANGELOG.md" });
assert.ok(release.primary.includes("npm run smoke:release"));
const context = relatedChecks({ cwd: root, paths: "extensions/siso-context-manager/provider-filter.js", task: "schema lazy" });
assert.ok(context.primary.includes("npm run smoke:tool-schema-lazy"));
assert.ok(context.secondary.includes("npm run smoke:context") || context.primary.includes("npm run smoke:context"));
console.log("SISO_RELATED_CHECKS_SMOKE_OK");
