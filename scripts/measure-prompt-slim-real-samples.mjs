#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { filterProviderPayload } from "../extensions/siso-context-manager/provider-filter.js";

const explicitDir = process.argv[2];
const providerDir = explicitDir ?? join(homedir(), ".siso", "agent", "transcripts", "2026-05-09", "unknown", "provider-requests");
const limit = Number.parseInt(process.env.SISO_PROMPT_SLIM_MEASURE_LIMIT ?? "120", 10);
const minRatio = Number.parseFloat(process.env.SISO_PROMPT_SLIM_MEASURE_MIN_RATIO ?? "10");

if (!existsSync(providerDir)) {
  throw new Error(`Provider request directory not found: ${providerDir}`);
}

const files = readdirSync(providerDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => join(providerDir, name))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  .slice(0, Number.isFinite(limit) ? limit : 120);

const rows = [];
for (const file of files) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }
  if (!Array.isArray(payload.messages) && !Array.isArray(payload.input)) continue;
  const result = filterProviderPayload(payload, { runId: "measure-prompt-slim" });
  if (!result.promptSlim) continue;
  rows.push({
    file,
    beforeChars: result.before.rawChars,
    afterChars: result.after.rawChars,
    beforeMessages: result.before.messageItems || result.before.inputItems,
    afterMessages: result.after.messageItems || result.after.inputItems,
    compressedMessageCount: result.promptSlim.compressedMessageCount,
    keptMessageCount: result.promptSlim.keptMessageCount,
    estimatedSavedTokens: result.promptSlim.estimatedSavedTokens,
    ratio: result.before.rawChars / Math.max(1, result.after.rawChars),
  });
}

rows.sort((a, b) => b.ratio - a.ratio);
const tenX = rows.filter((row) => row.ratio >= minRatio);
const best = rows[0];
const latest = rows.slice(0, 10).map((row) => ({
  file: row.file.split("/").pop(),
  beforeChars: row.beforeChars,
  afterChars: row.afterChars,
  beforeMessages: row.beforeMessages,
  afterMessages: row.afterMessages,
  compressedMessageCount: row.compressedMessageCount,
  keptMessageCount: row.keptMessageCount,
  estimatedSavedTokens: row.estimatedSavedTokens,
  ratio: Number(row.ratio.toFixed(2)),
}));

assert.ok(rows.length > 0, "No prompt-slim-eligible provider request samples found.");
assert.ok(tenX.length > 0, `No samples reached ${minRatio}x; best=${best?.ratio.toFixed(2) ?? "none"}x`);

console.log(JSON.stringify({
  providerDir,
  scannedFiles: files.length,
  slimEligibleSamples: rows.length,
  minRatio,
  samplesAtOrAboveMinRatio: tenX.length,
  best: best ? {
    file: best.file.split("/").pop(),
    beforeChars: best.beforeChars,
    afterChars: best.afterChars,
    beforeMessages: best.beforeMessages,
    afterMessages: best.afterMessages,
    compressedMessageCount: best.compressedMessageCount,
    keptMessageCount: best.keptMessageCount,
    estimatedSavedTokens: best.estimatedSavedTokens,
    ratio: Number(best.ratio.toFixed(2)),
  } : null,
  topSamples: latest,
}, null, 2));
