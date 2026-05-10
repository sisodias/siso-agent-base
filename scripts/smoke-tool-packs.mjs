#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => { console.error(`SISO_TOOL_PACKS_SMOKE_FAIL ${msg}`); process.exit(1); };
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const packsDoc = readJson("docs/tools/packs.json");
const cards = readJson("docs/tools/scenario-cards.json").cards;
const cardIds = new Set(cards.map((c) => c.id));
if (packsDoc.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Array.isArray(packsDoc.packs) || packsDoc.packs.length === 0) fail("packs missing");
const ids = new Set();
for (const pack of packsDoc.packs) {
  if (!pack.id || ids.has(pack.id)) fail(`bad or duplicate pack id ${pack.id}`);
  ids.add(pack.id);
  for (const field of ["summary", "firstTool", "fallbackTool"]) if (!pack[field]) fail(`${pack.id} ${field} missing`);
  for (const field of ["useWhen", "avoidWhen", "contains", "nextPacks"]) if (!Array.isArray(pack[field])) fail(`${pack.id} ${field} must be array`);
  for (const cardId of pack.contains) if (!cardIds.has(cardId)) fail(`${pack.id} contains missing card ${cardId}`);
  if (!cardIds.has(pack.firstTool)) fail(`${pack.id} firstTool missing card ${pack.firstTool}`);
  if (!cardIds.has(pack.fallbackTool)) fail(`${pack.id} fallbackTool missing card ${pack.fallbackTool}`);
}
for (const required of ["repo-navigation", "workspace-validation", "docs-capabilities"]) if (!ids.has(required)) fail(`missing required pack ${required}`);
console.log(`SISO_TOOL_PACKS_SMOKE_OK packs=${packsDoc.packs.length}`);
