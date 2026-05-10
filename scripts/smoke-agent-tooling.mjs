#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyPatch,
  briefRepo,
  capabilityAdd,
  capabilityAudit,
  capabilitySearch,
  capabilityShow,
  capabilityUpdate,
  contextPack,
  docUpdate,
  fileOutline,
  markdownOutline,
  projectMap,
  projectTree,
  publicCodeSearch,
  rankedRepoMap,
  readMany,
  repoSearch,
  runCheck,
  symbolSearch,
  toolInventory,
  toolLoad,
  toolRecommend,
  toolSearch,
  toolShow,
  toolUnload,
  workspaceDiff,
  workspaceStatus,
} from "../extensions/siso-agent-router/tooling-actions.js";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));

const toolSearchResult = toolSearch({ cwd: root, query: "find code by text", limit: 3 });
assert.ok(toolSearchResult.results.some((r) => r.tool === "repoSearch"));

const toolShowResult = toolShow({ cwd: root, id: "repo-search" });
assert.equal(toolShowResult.found, true);
assert.equal(toolShowResult.card.tool, "repoSearch");

const toolPackShow = toolShow({ cwd: root, id: "repo-navigation" });
assert.equal(toolPackShow.found, true);
assert.equal(toolPackShow.type, "pack");

const toolLoadDry = toolLoad({ cwd: root, packIds: "repo-navigation", toolIds: "repo-search", reason: "smoke", dryRun: true });
assert.equal(toolLoadDry.dryRun, true);
assert.ok(toolLoadDry.loaded.packIds.includes("repo-navigation"));
assert.ok(toolLoadDry.loaded.toolIds.includes("repo-search"));

const toolUnloadDry = toolUnload({ cwd: root, packIds: "repo-navigation", toolIds: "repo-search", dryRun: true });
assert.equal(toolUnloadDry.dryRun, true);

const toolInventoryResult = toolInventory({ cwd: root, domain: "verification" });
assert.ok(toolInventoryResult.cards.some((r) => r.tool === "runCheck"));

const toolRecommendResult = toolRecommend({ cwd: root, task: "find where router actions are implemented", limit: 3 });
assert.equal(toolRecommendResult.action, "tool-recommend");
assert.ok(toolRecommendResult.recommendations.some((r) => r.tool === "repoSearch" || r.tool === "briefRepo" || r.tool === "contextPack"));

const search = repoSearch({ cwd: root, query: "Agent Tooling Roadmap", path: "docs", limit: 5 });
assert.equal(search.action, "repo-search");
assert.ok(search.results.some((r) => r.path.includes("agent-tooling-roadmap.md")));

const publicCode = await publicCodeSearch({
  query: "repo:opencode-ai/opencode sourcegraph",
  limit: 2,
  fetchImpl: async (url, init) => {
    assert.equal(url, "https://sourcegraph.com/.api/graphql");
    const body = JSON.parse(init.body);
    assert.match(body.variables.query, /repo:opencode-ai\/opencode sourcegraph count:2/);
    assert.doesNotMatch(body.query, /\bcontent\b/, "public code search should not request full file content");
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          data: {
            search: {
              results: {
                matchCount: 3,
                resultCount: 1,
                approximateResultCount: 1,
                limitHit: false,
                missing: [],
                timedout: [],
                indexUnavailable: false,
                results: [{
                  __typename: "FileMatch",
                  repository: { name: "opencode-ai/opencode" },
                  file: { path: "internal/llm/tools/sourcegraph.go", url: "/github.com/opencode-ai/opencode/-/blob/internal/llm/tools/sourcegraph.go" },
                  lineMatches: [
                    { lineNumber: 213, preview: "https://sourcegraph.com/.api/graphql" },
                    { lineNumber: 247, preview: "<em>formatSourcegraphResults</em>(result, params.ContextWindow)" },
                  ],
                }],
              },
            },
          },
        });
      },
    };
  },
});
assert.equal(publicCode.action, "public-code-search");
assert.equal(publicCode.ok, true);
assert.equal(publicCode.results[0].repo, "opencode-ai/opencode");
assert.equal(publicCode.results[0].matches[1].preview, "formatSourcegraphResults(result, params.ContextWindow)");
assert.ok(JSON.stringify(publicCode).length < 5000, "public code search details should stay compact");
assert.doesNotMatch(JSON.stringify(publicCode), /file \\{ path url content \\}/, "public code search must not request full file content");

const files = readMany({ cwd: root, paths: "VERSION,package.json", maxChars: 2000 });
assert.equal(files.files.length, 2);
assert.ok(files.files.every((f) => f.ok));

const tree = projectTree({ cwd: root, depth: 1 });
assert.match(tree.text, /docs\//);

const map = projectMap({ cwd: root });
assert.equal(map.name, "siso-agent-base");
assert.ok(map.directories.some((d) => d.path === "docs"));

const rankedMap = rankedRepoMap({
  cwd: root,
  query: "publicCodeSearch sourcegraph repo map",
  path: "extensions/siso-agent-router",
  maxChars: 6000,
  limit: 12,
});
assert.equal(rankedMap.action, "ranked-repo-map");
assert.equal(typeof rankedMap.truncated, "boolean");
assert.ok(rankedMap.files.length > 0);
assert.ok(rankedMap.files[0].score >= rankedMap.files.at(-1).score);
assert.ok(rankedMap.files.some((file) => file.path === "extensions/siso-agent-router/tooling-actions.js"));
assert.ok(rankedMap.symbols.some((symbol) => symbol.name === "publicCodeSearch"));
assert.ok(JSON.stringify(rankedMap).length < 8000, "ranked repo map should stay parent-context bounded");
assert.doesNotMatch(JSON.stringify(rankedMap), /token|secret|private[-_]?key/i, "ranked repo map must not include secret-like paths or contents");

const outline = fileOutline({ cwd: root, path: "extensions/siso-agent-router/tooling-actions.js" });
assert.ok(outline.symbols.some((s) => s.name === "repoSearch"));

const symbol = symbolSearch({ cwd: root, query: "repoSearch", path: "extensions", limit: 5 });
assert.ok(symbol.results.length > 0);

const caps = capabilitySearch({ cwd: root, query: "agent tooling", limit: 5 });
assert.ok(caps.results.some((c) => c.id === "agent-tooling-roadmap"));

const cap = capabilityShow({ cwd: root, id: "agent-tooling-roadmap" });
assert.equal(cap.found, true);

const addDry = capabilityAdd({ cwd: root, id: "temporary-agent-tooling-smoke", title: "Temporary Agent Tooling Smoke", content: "Dry-run add only", dryRun: true });
assert.equal(addDry.dryRun, true);
assert.equal(addDry.capability.id, "temporary-agent-tooling-smoke");

const updateDry = capabilityUpdate({ cwd: root, id: "agent-tooling-roadmap", content: "Dry-run summary", dryRun: true });
assert.equal(updateDry.found, true);
assert.equal(updateDry.dryRun, true);

const audit = capabilityAudit({ cwd: root });
  assert.equal(audit.action, "capability-audit");
assert.ok(audit.count > 0);

const pack = contextPack({ cwd: root, query: "repo_search", paths: "docs/capabilities/agent-tooling-roadmap.md", limit: 5, maxChars: 2000 });
assert.equal(pack.action, "context-pack");
assert.ok(pack.search.results.length > 0);
assert.ok(pack.files.files[0].ok);

const brief = briefRepo({ cwd: root, task: "agent tooling", query: "agent tooling" });
assert.equal(brief.action, "brief-repo");
assert.ok(brief.map.name);

const md = markdownOutline({ cwd: root, path: "docs/capabilities/agent-tooling-roadmap.md" });
assert.ok(md.symbols.length > 0);

const status = workspaceStatus({ cwd: root });
assert.equal(status.ok, true);

const diff = workspaceDiff({ cwd: root, stat: true, maxChars: 4000 });
assert.equal(diff.ok, true);

const check = runCheck({ cwd: root, command: "node -e \"process.stdout.write('ok')\"", timeoutMs: 10000 });
assert.equal(check.ok, true);
assert.match(check.summary, /ok/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "siso-tooling-"));
fs.writeFileSync(path.join(tmp, "doc.md"), "# Title\n\nold\n");
fs.writeFileSync(path.join(tmp, "auth.json"), "{\"token\":\"secret\"}\n");
const missingCardsRecommendation = toolRecommend({ cwd: tmp, task: "inspect source and recommend a tool", limit: 3 });
assert.equal(missingCardsRecommendation.action, "tool-recommend");
assert.equal(missingCardsRecommendation.missingScenarioCards, true);
assert.deepEqual(missingCardsRecommendation.recommendations, []);

const dry = docUpdate({ cwd: tmp, path: "doc.md", content: "new", dryRun: true });
assert.equal(dry.dryRun, true);
docUpdate({ cwd: tmp, path: "doc.md", content: "new" });
assert.match(fs.readFileSync(path.join(tmp, "doc.md"), "utf8"), /new/);
applyPatch({ cwd: tmp, patches: [{ path: "doc.md", oldText: "old", newText: "OLDER" }] });
assert.match(fs.readFileSync(path.join(tmp, "doc.md"), "utf8"), /OLDER/);

assert.throws(() => fileOutline({ cwd: tmp, path: "auth.json" }), /secret-like path/);
assert.throws(() => docUpdate({ cwd: tmp, path: "auth.json", content: "nope" }), /secret-like path/);
assert.throws(() => applyPatch({ cwd: tmp, patches: [{ path: "auth.json", oldText: "secret", newText: "leak" }] }), /secret-like path/);

const blockedVictim = path.join(tmp, "blocked-victim.txt");
const blocked = runCheck({ cwd: tmp, command: `node -e "process.stdout.write('bad')" ; touch ${JSON.stringify(blockedVictim)}`, timeoutMs: 10000 });
assert.equal(blocked.ok, false);
assert.equal(blocked.blocked, true);
assert.match(blocked.summary, /blocked unsafe check command/);
assert.equal(fs.existsSync(blockedVictim), false, "blocked shell metacharacter command must not execute trailing touch");

const destructive = runCheck({ cwd: tmp, command: "rm -rf .", timeoutMs: 10000 });
assert.equal(destructive.ok, false);
assert.equal(destructive.blocked, true);
assert.match(destructive.summary, /blocked unsafe check command/);

const longLine = runCheck({ cwd: root, command: "node -e \"process.stdout.write('LONG_LINE_SHOULD_BE_CAPPED '+ 'L'.repeat(200000))\"", timeoutMs: 10000 });
assert.equal(longLine.ok, true);
assert.ok(longLine.summary.length < 5000, `runCheck summary should be capped, got ${longLine.summary.length}`);
assert.match(longLine.summary, /SISO_CHECK_OUTPUT_TRUNCATED/);
assert.doesNotMatch(longLine.summary, /L{10000}/);

console.log("SISO_AGENT_TOOLING_SMOKE_OK");
