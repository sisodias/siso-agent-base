#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const shouldCheckChanged = args.includes("--changed") || args.includes("--diff");
const shouldWriteReport = args.includes("--write-report") || shouldCheckChanged;
const fail = (msg) => {
  console.error(`SISO_CONTRACTS_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const contracts = readJson("docs/contracts/contracts.json");
const scripts = readJson("package.json").scripts ?? {};
const capabilityRegistry = readJson("docs/capabilities/registry.json");
const capabilityIds = new Set(capabilityRegistry.capabilities.map((cap) => cap.id));

function validateRegistry() {
  if (contracts.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (!Array.isArray(contracts.contracts) || contracts.contracts.length === 0) fail("contracts missing");
  const ids = new Set();
  const statuses = new Set(["idea", "draft", "active", "enforced", "retired"]);
  const levels = new Set(["advisory", "required", "permission-gated", "blocking"]);
  for (const contract of contracts.contracts) {
    if (!contract.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contract.id)) fail(`bad id ${contract.id}`);
    if (ids.has(contract.id)) fail(`duplicate id ${contract.id}`);
    ids.add(contract.id);
    if (!contract.name) fail(`${contract.id} missing name`);
    if (!statuses.has(contract.status)) fail(`${contract.id} invalid status ${contract.status}`);
    if (!levels.has(contract.level)) fail(`${contract.id} invalid level ${contract.level}`);
    if (!Array.isArray(contract.appliesTo) || contract.appliesTo.length === 0) fail(`${contract.id} appliesTo missing`);
    if (!Array.isArray(contract.rules) || contract.rules.length === 0) fail(`${contract.id} rules missing`);
    if (!Array.isArray(contract.requiredCommands)) fail(`${contract.id} requiredCommands must be array`);
    for (const command of contract.requiredCommands) {
      const match = /^npm run ([a-z0-9:.-]+)$/.exec(command);
      if (match && !scripts[match[1]]) fail(`${contract.id} references missing npm script ${match[1]}`);
    }
    if (!Array.isArray(contract.evidence) || contract.evidence.length === 0) fail(`${contract.id} evidence missing`);
    if (!Array.isArray(contract.capabilityIds)) fail(`${contract.id} capabilityIds must be array`);
    for (const capabilityId of contract.capabilityIds) {
      if (!capabilityIds.has(capabilityId)) fail(`${contract.id} references unknown capability ${capabilityId}`);
    }
  }
  for (const rel of ["docs/contracts/README.md", "docs/research/agent-contracts-research.md"]) {
    if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
  }
}

function gitChangedFiles() {
  const outputs = [];
  for (const gitArgs of [["diff", "--name-only"], ["diff", "--name-only", "--cached"], ["ls-files", "--others", "--exclude-standard"]]) {
    try {
      outputs.push(execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }));
    } catch {
      // Non-git checkouts can still validate schema.
    }
  }
  return [...new Set(outputs.join("\n").split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].sort();
}

function globToRegExp(glob) {
  let out = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      const after = glob[i + 2];
      if (after === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (char === "*") {
      out += "[^/]*";
    } else if (char === "?") {
      out += "[^/]";
    } else {
      out += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${out}$`);
}

function matchesAny(file, globs) {
  return globs.some((glob) => globToRegExp(glob).test(file));
}

function contractReport(files) {
  const matched = [];
  for (const contract of contracts.contracts) {
    const changedFiles = files.filter((file) => matchesAny(file, contract.appliesTo));
    if (changedFiles.length === 0) continue;
    matched.push({
      id: contract.id,
      name: contract.name,
      level: contract.level,
      status: contract.status,
      changedFiles,
      requiredCommands: contract.requiredCommands,
      evidence: contract.evidence,
      riskFilesTouched: Array.isArray(contract.riskFiles) ? changedFiles.filter((file) => matchesAny(file, contract.riskFiles)) : []
    });
  }
  const requiredCommands = [...new Set(matched.flatMap((item) => item.requiredCommands))].sort();
  return {
    generatedAt: new Date().toISOString(),
    changedFileCount: files.length,
    changedFiles: files,
    matchedContractCount: matched.length,
    matchedContracts: matched,
    requiredCommands,
    permissionGatedContracts: matched.filter((item) => item.level === "permission-gated" || item.riskFilesTouched.length > 0).map((item) => item.id)
  };
}

function markdownReport(report) {
  const lines = [
    "# SISO Contract Diff Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Changed files: ${report.changedFileCount}`,
    `Matched contracts: ${report.matchedContractCount}`,
    "",
    "## Required commands",
    "",
    ...(report.requiredCommands.length ? report.requiredCommands.map((command) => `- \`${command}\``) : ["- none"]),
    "",
    "## Permission-gated contracts",
    "",
    ...(report.permissionGatedContracts.length ? report.permissionGatedContracts.map((id) => `- ${id}`) : ["- none"]),
    "",
    "## Matched contracts",
    ""
  ];
  for (const contract of report.matchedContracts) {
    lines.push(`### ${contract.id}`);
    lines.push("");
    lines.push(`Level: ${contract.level}`);
    lines.push("");
    lines.push("Changed files:");
    lines.push(...contract.changedFiles.map((file) => `- \`${file}\``));
    if (contract.riskFilesTouched.length) {
      lines.push("");
      lines.push("Risk files touched:");
      lines.push(...contract.riskFilesTouched.map((file) => `- \`${file}\``));
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

validateRegistry();
let report;
if (shouldCheckChanged || shouldWriteReport) {
  report = contractReport(gitChangedFiles());
  const outDir = path.join(root, "test-space", "results");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "contracts-report.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "contracts-report.md"), markdownReport(report));
}

if (shouldCheckChanged) {
  const required = report.requiredCommands.length ? ` required=${report.requiredCommands.join(",")}` : " required=none";
  const gated = report.permissionGatedContracts.length ? ` gated=${report.permissionGatedContracts.join(",")}` : " gated=none";
  console.log(`SISO_CONTRACTS_CHANGED_OK changed=${report.changedFileCount} matched=${report.matchedContractCount}${required}${gated}`);
} else {
  console.log("SISO_CONTRACTS_SMOKE_OK");
}
