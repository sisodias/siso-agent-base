#!/usr/bin/env node
import assert from "node:assert/strict";
import { codeQuery, repoIndexBuild, repoIndexStatus } from "../extensions/siso-agent-router/tooling-actions.js";
const root = process.cwd();
const built = repoIndexBuild({ cwd: root, limit: 8000 });
assert.equal(built.action, "repo-index-build");
assert.ok(built.fileCount > 10);
assert.ok(built.symbolCount > 10);
const status = repoIndexStatus({ cwd: root });
assert.equal(status.exists, true);
assert.equal(status.fileCount, built.fileCount);
const symbol = codeQuery({ cwd: root, query: "symbol:repoIndexBuild", limit: 10 });
assert.ok(symbol.symbols.some((s) => s.name === "repoIndexBuild"));
assert.ok(symbol.results.every((r) => r.kind === "symbol"), "symbol-only query should not include unrelated file padding");
const file = codeQuery({ cwd: root, query: "file:tooling-actions lang:javascript", limit: 10 });
assert.ok(file.files.some((f) => f.path.includes("tooling-actions.js")));
const imports = codeQuery({ cwd: root, query: "imports:node:fs", limit: 10 });
assert.ok(imports.imports.some((i) => i.path.includes("tooling-actions.js")));
console.log("SISO_REPO_INDEX_SMOKE_OK");
