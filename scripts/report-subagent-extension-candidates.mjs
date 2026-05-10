#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const catalogPath = process.argv[2] ?? path.join(root, "data", "extensions", "extension-catalog.json");
const outPath = process.argv[3] ?? path.join(root, "docs", "strategy", "subagent-extension-candidates.md");

const terms = [
  "subagent",
  "sub-agent",
  "subagents",
  "orchestrator",
  "delegate",
  "delegated",
  "delegation",
  "parallel",
  "chain",
  "swarm",
  "crew",
  "team",
  "mailbox",
  "intercom",
  "side conversation",
  "second opinion",
  "workflow",
];

function text(value) {
  return String(value ?? "").toLowerCase();
}

function body(pkg) {
  return [
    pkg.name,
    pkg.description,
    pkg.author,
    pkg.categories?.join(" "),
    pkg.types?.join(" "),
    pkg.sisoFit?.rationale,
    pkg.readme,
    pkg.piManifest ? JSON.stringify(pkg.piManifest) : "",
  ].map(text).join("\n");
}

function decision(pkg, hits) {
  if (pkg.name === "pi-subagents") return "already reviewed; port/fork patterns";
  if (hits.includes("swarm") || hits.includes("team") || hits.includes("orchestrator")) return "deep audit for orchestration patterns";
  if (hits.includes("delegate") || hits.includes("workflow") || hits.includes("parallel")) return "audit for workflow/coordination ideas";
  return "watch";
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const rows = catalog.packages
  .map((pkg) => {
    const haystack = body(pkg);
    const hits = terms.filter((term) => haystack.includes(term));
    const categories = pkg.categories ?? [];
    const strongHits = hits.filter((hit) => hit !== "workflow");
    const score = (pkg.sisoFit?.score ?? 0)
      + strongHits.length * 10
      + (hits.includes("subagent") || hits.includes("subagents") || hits.includes("sub-agent") ? 40 : 0)
      + (hits.includes("swarm") || hits.includes("team") || hits.includes("orchestrator") ? 25 : 0)
      + (categories.includes("agent-orchestration") ? 10 : 0);
    return { pkg, hits, score, strongHits };
  })
  .filter((row) => row.strongHits.length > 0 || row.pkg.name?.includes("agent-flow") || row.pkg.name?.includes("crew"))
  .sort((a, b) => b.score - a.score || (b.pkg.downloadsMonthly ?? 0) - (a.pkg.downloadsMonthly ?? 0))
  .slice(0, 60);

const lines = [
  "# Subagent Extension Candidates",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Catalog: ${catalogPath}`,
  "",
  "| Package | Score | Risk | Recommendation | Hits | Why | Decision |",
  "|---|---:|---:|---|---|---|---|",
  ...rows.map(({ pkg, hits }) => [
    `[${pkg.name}](${pkg.packageUrl ?? pkg.npmUrl ?? ""})`,
    pkg.sisoFit?.score ?? 0,
    pkg.risk?.score ?? 0,
    pkg.recommendation ?? "",
    hits.join(", "),
    String(pkg.description ?? "").replaceAll("|", "\\|"),
    decision(pkg, hits),
  ].join(" | ")).map((line) => `| ${line} |`),
  "",
  "## Rule",
  "",
  "Audit orchestration packages as references first. Keep SISO routing, permissions, child lifecycle, and task records in SISO core.",
  "",
];

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`SISO_SUBAGENT_EXTENSION_CANDIDATES_BUILT count=${rows.length} out=${outPath}`);
