#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative } from "node:path";

const DEFAULT_TRANSCRIPT_ROOT = join(homedir(), ".siso", "agent", "transcripts");
const DEFAULT_QUEUE_ROOT = join(homedir(), ".siso", "agent", "error-queue");
const STATUSES = ["queue", "assigned", "resolved", "failed", "needs-human"];

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("--") ? args[0] : "help";
const flags = args.slice(command === "help" ? 0 : 1);

function getArg(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const hit = flags.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return flags.includes(`--${name}`);
}

function usage() {
  console.log(`Usage: node scripts/error-queue.mjs <command> [options]

Commands:
  queue       Classify recent tool errors, dedupe them, and write durable packets.
  status      Print queue counts and top unresolved packets.
  batch       Group queued packets by repair lane for faster parent/worker dispatch.
  prune       Move stale/noise packets from queue to resolved.
  resolve-lane Move one verified lane from queue to resolved: --lane=timeout --reason=...
  dispatch    Move queued packets to assigned and write MiniMax worker prompts.
  resolve     Mark one packet resolved: --id=ERR-...
  fail        Mark one packet failed or needs-human: --id=ERR-... [--needs-human]

Options:
  --hours=24                  Scan last N hours unless --since is set.
  --since=2026-05-10          Scan since local date or ISO timestamp.
  --transcript-root=PATH      Defaults to ~/.siso/agent/transcripts.
  --queue-root=PATH           Defaults to ~/.siso/agent/error-queue.
  --limit=10                  Queue/dispatch/status limit.
  --profile=minimax.worker    Dispatch profile.
  --write-prompts             For batch, write lane-level worker prompt files.
  --execute                   Actually spawn SISO workers; default writes prompt packets only.
`);
}

function nowIso() {
  return new Date().toISOString();
}

function jsonRead(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function jsonWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tempPath, path);
}

function safeName(value, fallback = "unknown") {
  const safe = String(value ?? "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || fallback;
}

function shortHash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function cutoffFromFlags() {
  const explicitSince = getArg("since", "");
  const hours = Number(getArg("hours", "24"));
  const cutoff = explicitSince ? new Date(explicitSince) : new Date(Date.now() - hours * 60 * 60 * 1000);
  if (Number.isNaN(cutoff.getTime())) throw new Error(`Invalid cutoff: ${explicitSince || hours}`);
  return cutoff;
}

function queueRoot() {
  return getArg("queue-root", DEFAULT_QUEUE_ROOT);
}

function transcriptRoot() {
  return getArg("transcript-root", DEFAULT_TRANSCRIPT_ROOT);
}

function packetDir(status) {
  return join(queueRoot(), status);
}

function packetPath(status, id) {
  return join(packetDir(status), `${safeName(id)}.json`);
}

function indexPath() {
  return join(queueRoot(), "fingerprints.json");
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return { row: JSON.parse(line), line: index + 1 };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function listErrorFiles(root, cutoff) {
  const files = [];
  if (!existsSync(root)) return files;
  const cutoffDay = cutoff.toISOString().slice(0, 10);
  for (const day of readdirSync(root).sort()) {
    if (day < cutoffDay) continue;
    const path = join(root, day, "errors.jsonl");
    if (existsSync(path) && statSync(path).isFile()) files.push(path);
  }
  return files;
}

function textOf(row) {
  const val = row.text ?? row.error ?? row.errorMessage ?? row.message ?? row.output ?? row.result ?? "";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function toolNameOf(row) {
  return row.tool_name ?? row.payload?.toolName ?? row.payload?.tool_name ?? row.payload?.name ?? "";
}

function toolInputOf(row) {
  const input = row.payload?.input ?? row.payload?.toolInput ?? {};
  if (!input || typeof input !== "object") return "";
  if (typeof input.command === "string") return input.command;
  if (typeof input.cmd === "string") return input.cmd;
  if (typeof input.path === "string") return input.path;
  try {
    return JSON.stringify(input);
  } catch {
    return "";
  }
}

function scrub(text, max = 700) {
  const clean = String(text)
    .replace(/(api[_-]?key|authorization|token|secret|password)(["'\s:=]+)[^,"'\s}]+/gi, "$1$2[REDACTED]")
    .replace(/"thinking(Signature)?":"[^"]+"/g, '"thinking$1":"[REDACTED]"')
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max)} ... [truncated]` : clean;
}

function classify(text) {
  const low = text.toLowerCase();
  if (looksLikeSourceDump(text)) return ["source dump logged as error", "Avoid treating successful large file output as a repair bug; inspect the originating tool call/logging path."];
  if (looksLikeLineRangeDump(text)) return ["source excerpt logged as error", "Avoid treating successful line-range output as a repair bug; inspect the originating tool call/logging path."];
  if (looksLikeDirectoryListingDump(text)) return ["directory listing logged as error", "Avoid treating successful directory listings as repair bugs; inspect the originating tool call/logging path."];
  if (looksLikeErrorSummaryDump(text)) return ["error summary output logged as error", "Avoid feeding ad hoc error-summary output back into the repair queue."];
  if (looksLikeTerminalControlOutput(text)) return ["terminal control output logged as error", "Avoid treating TUI control sequences as repair bugs; use a PTY-aware smoke or filtered output."];
  if (low.includes("could not find edits") && low.includes("oldtext must match exactly")) return ["stale edit target", "Re-read the file immediately before editing and use a smaller unique hunk."];
  if (low.includes("found 2 occurrences of edits") && low.includes("oldtext must be unique")) return ["ambiguous edit target", "Use a larger unique hunk or apply_patch context so replacements cannot match multiple locations."];
  if (/^\s*(grep|rg)\b[\s\S]*command exited with code 1\s*$/i.test(text)) return ["search miss logged as error", "Use search commands that tolerate no-match results when absence is expected."];
  if (looksLikeHeredocTerminatorMisuse(text)) return ["shell heredoc misuse", "Place redirection/pipes on the heredoc command, not on the PY terminator line."];
  if (low.includes('missing script: "test"')) return ["missing npm script", "Add a safe script alias or teach agents to inspect package scripts before running npm test."];
  if (low.includes("python: command not found")) return ["bad command assumption", "Use python3 on macOS or probe executable availability before running python."];
  if (low.includes("eisdir")) return ["file-vs-directory misuse", "Check stat/isDirectory before attempting file reads."];
  if (low.includes("enoent") || low.includes("no such file or directory") || low.includes("path not found")) return ["missing/stale path", "Validate current workspace paths before tool calls and tolerate optional folders."];
  if (low.includes("timed out") || low.includes("timeout")) return ["timeout", "Use narrower commands or pass a larger timeout for known slow operations."];
  if (low.includes("assertionerror")) return ["assertion failure", "Capture the failing assertion and add or update smoke coverage."];
  if (low.includes("syntaxerror")) return ["syntax error", "Run syntax checks before shipping generated or edited JS."];
  if (low.includes("typeerror")) return ["type error", "Add a runtime guard and focused regression test."];
  if (low.includes("command not found")) return ["missing command", "Probe command availability and provide a fallback."];
  if (low.includes("permission denied") || low.includes("eacces")) return ["permission error", "Avoid protected paths or fix permissions."];
  if (low.includes("tool_use ids were found without tool_result")) return ["provider protocol", "Ensure every emitted tool_use gets a matching tool_result."];
  if (low.includes("invalid_request_error")) return ["provider request error", "Reduce or repair malformed provider payloads."];
  if (low.includes("getaddrinfo enotfound") || low.includes("fetch failed")) return ["network/dependency failure", "Retry with bounded backoff and surface the failing host/service."];
  if (low.includes("no such column")) return ["schema mismatch", "Use schema introspection before querying local DBs."];
  if (low.includes("error")) return ["generic tool error", "Inspect command output and add a typed classifier."];
  return ["misc tool error", "Inspect manually and add a classifier if recurring."];
}

function isActionableCategory(category) {
  return ![
    "source dump logged as error",
    "source excerpt logged as error",
    "directory listing logged as error",
    "error summary output logged as error",
    "terminal control output logged as error",
    "search miss logged as error",
  ].includes(category);
}

function isStaleNoisePacket(packet) {
  const category = String(packet?.category ?? "");
  if (!isActionableCategory(category)) return true;
  const signature = String(packet?.signature ?? "");
  const evidenceText = Array.isArray(packet?.evidence) ? packet.evidence.map((item) => item?.text ?? "").join("\n") : "";
  const text = `${signature}\n${evidenceText}`;
  if (looksLikeSourceDump(text) || looksLikeLineRangeDump(text) || looksLikeDirectoryListingDump(text) || looksLikeErrorSummaryDump(text) || looksLikeTerminalControlOutput(text)) return true;
  if (/^(import \{|function |diff --git |M VERSION |--- command entry refs ---|Recent agent log\/error candidates:|scripts\/[^:]+:\d+:)/s.test(signature)) return true;
  if (/^\d+\s+'?function\s+/s.test(signature) || /^'.*function\s+/s.test(signature)) return true;
  if (/^\[fd error\]: Search path '.+\/(\.siso\/bin\/persist|\.siso-wiki|src|lib)' is not a directory/.test(signature)) return true;
  return false;
}

function repairLane(packet) {
  const category = String(packet?.category ?? "");
  const signature = String(packet?.signature ?? "");
  const input = String(packet?.input ?? "");
  const text = `${category}\n${signature}\n${input}`;
  if (isStaleNoisePacket(packet)) return "stale-noise";
  if (category === "stale edit target" || /oldText must match exactly|overlap in .*Merge them into one edit|replacement produced identical content/i.test(text)) return "agent-misuse";
  if (/Could not find the exact text|old text must match exactly/i.test(text)) return "agent-misuse";
  if (/\bcat\s+>\s+.+<<['"]?EOF/i.test(text)) return "agent-misuse";
  if (/Validation failed for tool "siso".*additional properties/i.test(text)) return "agent-misuse";
  if (/Missing script:/i.test(text)) return "missing-script-alias";
  if (category === "timeout" || /timed out after|timeout/i.test(text)) return "timeout";
  if (category === "missing/stale path" || /ENOENT|Path not found|No such file or directory|Search path '.+' is not a directory/i.test(text)) return "stale-path";
  if (/\b(?:grep|rg|fd)\b[\s\S]*Command exited with code 1/i.test(text)) return "stale-noise";
  if (/^\.(?:pi|siso)\/session-context\//i.test(signature)) return "stale-noise";
  if (/^docs\/research\//i.test(signature)) return "stale-noise";
  if (/^test-space\/coverage\.json-\d+-/i.test(signature)) return "stale-noise";
  if (/pi\.registerTool|Return persisted child-run storage stats/i.test(text)) return "stale-noise";
  if (/\/\.siso\/agent-base\/research\/|docs\/research\/persistent-executive-agents/i.test(text)) return "stale-path";
  if (/terminal control|alternate screen|\\x1b\[\?1049h|\u001b\[\?1049h/i.test(text)) return "verify-or-fix";
  if (/scripts\/smoke-test-space-coverage\.mjs|test-space\/(?:test-plan|coverage)\.json|docs\/capabilities\/registry\.json/i.test(text)) return "verify-or-fix";
  if (/npm ls @mariozechner\/pi-coding-agent @mariozechner\/pi-tui/i.test(text)) return "verify-or-fix";
  if (category === "assertion failure" || category === "syntax error" || category === "type error") return "verify-or-fix";
  return "dispatchable";
}

function signature(row, text) {
  const low = text.toLowerCase();
  const toolName = toolNameOf(row);
  const toolInput = toolInputOf(row);
  let match;
  if (looksLikeSourceDump(text)) {
    const source = toolInput || toolName || "unknown";
    return `${toolName || "tool"}: ${commandShape(source)}`;
  }
  if (looksLikeLineRangeDump(text)) {
    const source = toolInput || toolName || "unknown";
    return `${toolName || "tool"}: ${commandShape(source)}`;
  }
  if (looksLikeDirectoryListingDump(text)) {
    const source = toolInput || toolName || "unknown";
    return `${toolName || "tool"}: ${commandShape(source)}`;
  }
  if (looksLikeErrorSummaryDump(text)) {
    const source = toolInput || toolName || "unknown";
    return `${toolName || "tool"}: ${commandShape(source)}`;
  }
  if (looksLikeTerminalControlOutput(text)) {
    const source = toolInput || toolName || "unknown";
    return `${toolName || "tool"}: ${commandShape(source)}`;
  }
  if (/could not find edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i.test(text)) {
    return text.match(/Could not find edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i)[0];
  }
  if (/found \d+ occurrences of edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i.test(text)) {
    return text.match(/Found \d+ occurrences of edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i)[0];
  }
  if (/^\s*(grep|rg)\b[\s\S]*command exited with code 1\s*$/i.test(text)) {
    const source = commandShape(toolInput || toolName || text);
    return `${toolName || "search"}: ${source}`;
  }
  if (looksLikeHeredocTerminatorMisuse(text)) {
    const source = commandShape(toolInput || toolName || text);
    return `${toolName || "bash"}: ${source}`;
  }
  if ((match = text.match(/Path not found:\s*[^\n\r]+/i))) return match[0].slice(0, 220);
  if ((match = text.match(/no such column:\s*[^\s;]+/i))) return match[0];
  if ((match = text.match(/getaddrinfo ENOTFOUND\s+[^\s]+/i))) return match[0];
  if ((match = text.match(/ENOENT[^\n\r]{0,180}/i))) return match[0];
  if ((match = text.match(/no such file or directory[^\n\r]{0,180}/i))) return match[0];
  if ((match = text.match(/Timed out after \d+ms|timed out after \d+ seconds|timeout[^\n\r]{0,80}/i))) {
    const source = commandShape(toolInput || toolName);
    return source ? `${match[0]}: ${source}` : match[0];
  }
  if ((match = text.match(/[^\n\r:]+: command not found/i))) return match[0].trim();
  if (low.includes('missing script: "test"')) return "npm Missing script: test";
  if ((match = text.match(/AssertionError[^\n\r]*/i))) return match[0].slice(0, 160);
  if ((match = text.match(/SyntaxError[^\n\r]*/i))) return match[0].slice(0, 160);
  if ((match = text.match(/TypeError[^\n\r]*/i))) return match[0].slice(0, 160);
  if ((match = text.match(/EISDIR[^\n\r]*/i))) return match[0].slice(0, 160);
  if ((match = text.match(/npm error[^\n\r]*/i))) return match[0].slice(0, 160);
  if ((match = text.match(/Command exited with code \d+/i))) {
    const source = toolInput || toolName;
    return source ? `${source.slice(0, 160)}: ${match[0]}` : match[0];
  }
  if (toolInput && scrub(text).length < 80) return `${toolInput.slice(0, 160)}: ${scrub(text)}`;
  return scrub(text, 160) || "(empty error output)";
}

function commandShape(input) {
  const text = String(input ?? "").trim();
  if (!text) return "";
  const firstLine = text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? text;
  return firstLine.replace(/\s+/g, " ").slice(0, 120);
}

function looksLikeSourceDump(text) {
  const value = String(text ?? "");
  return /\bimport\s+\{[^}]+\}\s+from\s+["'][^"']+["']/.test(value)
    || /\bexport\s+(async\s+)?function\s+[A-Za-z0-9_$]+/.test(value)
    || /\bconst\s+[A-Z0-9_]{3,}\s*=/.test(value);
}

function looksLikeLineRangeDump(text) {
  return /^---\s+\d+(?:-\d+)?(?:\s+---)?\s+\d+:\s+/s.test(String(text ?? ""));
}

function looksLikeDirectoryListingDump(text) {
  return /^total\s+\d+\s+[bcdlps-][rwx-]{9}\s+/s.test(String(text ?? ""));
}

function looksLikeErrorSummaryDump(text) {
  const value = String(text ?? "");
  return /^TRUE_ERROR_EVENTS\s+\d+\s+TOP\s+\d+\s+\|\s+/s.test(value);
}

function looksLikeHeredocTerminatorMisuse(text) {
  const value = String(text ?? "");
  return /syntaxerror: invalid syntax/i.test(value) && /\n\s*py\s*(?:[>|])/i.test(value);
}

function looksLikeTerminalControlOutput(text) {
  const value = String(text ?? "");
  return /\x1b\[\?\d+[a-z]/i.test(value) || /\x1b\]\d+;/.test(value);
}

function severityFor(category, count) {
  if (category === "provider protocol" || category === "syntax error") return "high";
  if (count >= 5 || category === "timeout" || category === "missing/stale path") return "medium";
  return "low";
}

function packetId(fingerprint) {
  return `ERR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${shortHash(fingerprint)}`;
}

function readAllPackets() {
  const packets = [];
  for (const status of STATUSES) {
    const dir = packetDir(status);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".json"))) {
      packets.push({ status, path: join(dir, name), packet: jsonRead(join(dir, name)) });
    }
  }
  return packets.filter((item) => item.packet);
}

function findPacket(id) {
  return readAllPackets().find((item) => item.packet.id === id);
}

function writePrompt(packet, profile) {
  const prompt = [
    `Fix ${packet.id}.`,
    "",
    `Category: ${packet.category}`,
    `Severity: ${packet.severity}`,
    `Fingerprint: ${packet.fingerprint}`,
    `Occurrences: ${packet.count}`,
    `Latest: ${packet.latestAt}`,
    `Tool: ${packet.tool || "unknown"}`,
    `Input: ${packet.input || "unknown"}`,
    `CWD: ${packet.cwd || "unknown"}`,
    "",
    "Goal:",
    packet.recommendedFix,
    "",
    "Evidence:",
    ...packet.evidence.slice(0, 3).map((item) => `- ${item.source}: ${item.text}`),
    "",
    "Rules:",
    "- Keep the patch narrow.",
    "- Add or update smoke coverage for the specific failure class.",
    "- Do not touch unrelated files.",
    "- Do not revert user changes.",
    "- Return changed files and verification commands.",
  ].join("\n");
  const promptPath = join(queueRoot(), "assignments", `${packet.id}-${safeName(profile)}.md`);
  mkdirSync(dirname(promptPath), { recursive: true });
  writeFileSync(promptPath, `${prompt}\n`);
  return { prompt, promptPath };
}

async function spawnWorker(prompt, profile, packet) {
  const { runProfileSpawn } = await import("../extensions/siso-agent-router/spawn-layer.js");
  return runProfileSpawn(prompt, {
    background: true,
    queue: true,
    maxDepth: 2,
    fleetId: "error-repair",
    budget: { maxParallel: Number(getArg("max-parallel", "3")) },
    decision: {
      kind: "worker",
      profile,
      lane: profile.startsWith("minimax") ? "minimax" : "codex",
      model: profile.startsWith("minimax") ? "claude-haiku-4-5-20251001" : "gpt-5.5",
      tools: [],
      contextTier: "project",
      statePolicy: "write",
      permissionProfile: "workspace-write",
    },
    metadata: { errorPacketId: packet.id },
  });
}

async function queueCommand() {
  const cutoff = cutoffFromFlags();
  const root = transcriptRoot();
  const index = jsonRead(indexPath(), {});
  const seenToolCalls = new Set();
  const groups = new Map();
  let scanned = 0;
  let ignored = 0;
  let ignoredNonActionable = 0;

  for (const file of listErrorFiles(root, cutoff)) {
    for (const { row, line } of readJsonl(file)) {
      if (row.timestamp && new Date(row.timestamp) < cutoff) continue;
      const eventType = row.event_type ?? row.type ?? "";
      if (eventType === "before_provider_request") {
        ignored++;
        continue;
      }
      if (!["tool_result", "tool_execution_end"].includes(eventType) || row.kind !== "error") continue;
      const callId = row.payload?.toolCallId ?? row.toolCallId ?? "";
      if (callId) {
        if (seenToolCalls.has(callId)) continue;
        seenToolCalls.add(callId);
      }
      scanned++;
      const text = textOf(row);
      const sig = signature(row, text);
      const [category, recommendedFix] = classify(text);
      if (!isActionableCategory(category)) {
        ignoredNonActionable++;
        continue;
      }
      const fingerprint = `${category}:${sig}`;
      const item = groups.get(fingerprint) ?? {
        fingerprint,
        category,
        signature: sig,
        recommendedFix,
        count: 0,
        firstAt: row.timestamp ?? "",
        latestAt: row.timestamp ?? "",
        tool: toolNameOf(row),
        input: toolInputOf(row),
        cwd: row.cwd ?? row.payload?.cwd ?? "",
        evidence: [],
      };
      item.count++;
      if (row.timestamp && (!item.firstAt || row.timestamp < item.firstAt)) item.firstAt = row.timestamp;
      if (row.timestamp && (!item.latestAt || row.timestamp > item.latestAt)) item.latestAt = row.timestamp;
      if (item.evidence.length < 5) {
        item.evidence.push({
          source: `~/${relative(homedir(), file)}:${line}`,
          timestamp: row.timestamp ?? "",
          tool: toolNameOf(row),
          input: toolInputOf(row),
          cwd: row.cwd ?? "",
          text: scrub(text, 500),
        });
      }
      groups.set(fingerprint, item);
    }
  }

  let created = 0;
  let updated = 0;
  const limit = Number(getArg("limit", "50"));
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count || b.latestAt.localeCompare(a.latestAt)).slice(0, limit);
  for (const group of sorted) {
    const existingId = index[group.fingerprint];
    const existing = existingId ? findPacket(existingId) : undefined;
    const id = existing?.packet?.id ?? packetId(group.fingerprint);
    const status = existing?.status ?? "queue";
    const packet = {
      ...(existing?.packet ?? {}),
      id,
      fingerprint: group.fingerprint,
      category: group.category,
      signature: group.signature,
      status,
      severity: severityFor(group.category, group.count),
      count: Math.max(existing?.packet?.count ?? 0, group.count),
      firstAt: existing?.packet?.firstAt && existing.packet.firstAt < group.firstAt ? existing.packet.firstAt : group.firstAt,
      latestAt: group.latestAt,
      tool: group.tool,
      input: group.input,
      cwd: group.cwd,
      recommendedFix: group.recommendedFix,
      evidence: group.evidence,
      assignment: existing?.packet?.assignment ?? { profile: "minimax.worker", attempts: 0 },
      updatedAt: nowIso(),
      createdAt: existing?.packet?.createdAt ?? nowIso(),
    };
    index[group.fingerprint] = id;
    jsonWrite(packetPath(status, id), packet);
    existing ? updated++ : created++;
  }
  jsonWrite(indexPath(), index);
  console.log(`Queued error packets: created=${created} updated=${updated} scanned=${scanned} ignored_telemetry=${ignored} ignored_non_actionable=${ignoredNonActionable}`);
}

function statusCommand() {
  const packets = readAllPackets();
  const counts = Object.fromEntries(STATUSES.map((status) => [status, packets.filter((item) => item.status === status).length]));
  console.log(`Error queue: ${queueRoot()}`);
  for (const status of STATUSES) console.log(`- ${status}: ${counts[status]}`);
  const top = packets
    .filter((item) => item.status === "queue" || item.status === "assigned")
    .sort((a, b) => (b.packet.count ?? 0) - (a.packet.count ?? 0) || String(b.packet.latestAt).localeCompare(String(a.packet.latestAt)))
    .slice(0, Number(getArg("limit", "10")));
  if (!top.length) return;
  console.log("\nTop unresolved:");
  for (const { packet } of top) console.log(`- ${packet.id} ${packet.count}x ${packet.category} ${packet.signature}`);
}

function recommendationForLane(lane) {
  if (lane === "stale-noise") return "run errors:prune or resolve as historical noise";
  if (lane === "agent-misuse") return "update prompts/classifiers once, then resolve historical packets";
  if (lane === "missing-script-alias") return "add npm compatibility aliases or update docs/check mappings";
  if (lane === "stale-path") return "add optional-path guards, compatibility wrappers, or resolve obsolete paths";
  if (lane === "timeout") return "group by command family; raise timeout only for live commands, resolve stale checks after verification";
  if (lane === "verify-or-fix") return "rerun current smoke/syntax checks; fix only if still reproduces";
  return "dispatch to minimax.worker or spark.worker depending on file scope";
}

function batchCommand() {
  const queued = readAllPackets()
    .filter((item) => item.status === "queue")
    .sort((a, b) => repairLane(a.packet).localeCompare(repairLane(b.packet)) || String(a.packet.id).localeCompare(String(b.packet.id)));
  const limit = Number(getArg("limit", "8"));
  const groups = new Map();
  for (const item of queued) {
    const lane = repairLane(item.packet);
    const list = groups.get(lane) ?? [];
    list.push(item.packet);
    groups.set(lane, list);
  }
  const order = ["stale-noise", "agent-misuse", "missing-script-alias", "stale-path", "timeout", "verify-or-fix", "dispatchable"];
  const writePrompts = hasFlag("write-prompts");
  const profile = getArg("profile", "minimax.worker");
  console.log(`Error queue batches: total=${queued.length}`);
  for (const lane of order) {
    const packets = groups.get(lane) ?? [];
    if (!packets.length) continue;
    console.log(`\n${lane}: ${packets.length}`);
    console.log(`recommended=${recommendationForLane(lane)}`);
    for (const packet of packets.slice(0, limit)) {
      console.log(`- ${packet.id} ${packet.category}: ${String(packet.signature ?? "").replace(/\s+/g, " ").slice(0, 180)}`);
    }
    if (packets.length > limit) console.log(`- ... ${packets.length - limit} more`);
    if (writePrompts) {
      const promptPath = writeBatchPrompt(lane, packets, profile, limit);
      console.log(`Wrote batch prompt: ${promptPath}`);
    }
  }
}

function writeBatchPrompt(lane, packets, profile, limit) {
  const id = `BATCH-${safeName(lane)}-${safeName(profile)}`;
  const shown = packets.slice(0, limit);
  const prompt = [
    `Fix SISO error queue lane: ${lane}.`,
    "",
    `Profile: ${profile}`,
    `Packets: ${packets.length}`,
    `Recommended approach: ${recommendationForLane(lane)}`,
    "",
    "Work mode:",
    "- Treat this as one batch, not isolated packet repair.",
    "- First determine which packet examples are stale/historical versus currently reproducible.",
    "- Make the smallest shared fix that prevents the whole lane from recurring.",
    "- Add or update focused smoke coverage.",
    "- Resolve packets only after verification.",
    "",
    "Representative packets:",
    ...shown.map((packet) => [
      `- ${packet.id}`,
      `  category: ${packet.category}`,
      `  signature: ${String(packet.signature ?? "").replace(/\s+/g, " ").slice(0, 500)}`,
      `  input: ${String(packet.input ?? "").replace(/\s+/g, " ").slice(0, 500)}`,
    ].join("\n")),
    packets.length > shown.length ? `- ... ${packets.length - shown.length} more packets in this lane` : "",
  ].filter(Boolean).join("\n");
  const promptPath = join(queueRoot(), "assignments", `${id}.md`);
  mkdirSync(dirname(promptPath), { recursive: true });
  writeFileSync(promptPath, `${prompt}\n`);
  return promptPath;
}

function pruneCommand() {
  const queued = readAllPackets()
    .filter((item) => item.status === "queue")
    .sort((a, b) => String(a.packet.id).localeCompare(String(b.packet.id)));
  const limit = Number(getArg("limit", String(queued.length)));
  let moved = 0;
  let kept = 0;
  for (const item of queued) {
    if (!isStaleNoisePacket(item.packet)) {
      kept++;
      continue;
    }
    if (moved >= limit) {
      kept++;
      continue;
    }
    const packet = {
      ...item.packet,
      status: "resolved",
      resolvedAt: nowIso(),
      updatedAt: nowIso(),
      pruneReason: "stale/noise packet",
    };
    jsonWrite(packetPath("resolved", packet.id), packet);
    renameSync(item.path, `${item.path}.pruned`);
    moved++;
  }
  console.log(`Pruned stale packets: moved=${moved} kept=${kept}`);
}

function resolveLaneCommand() {
  const lane = getArg("lane", "");
  const reason = getArg("reason", "");
  if (!lane) throw new Error("--lane is required");
  if (!reason) throw new Error("--reason is required");
  const queued = readAllPackets()
    .filter((item) => item.status === "queue" && repairLane(item.packet) === lane)
    .sort((a, b) => String(a.packet.id).localeCompare(String(b.packet.id)));
  const limit = Number(getArg("limit", String(queued.length)));
  const dryRun = hasFlag("dry-run");
  let moved = 0;
  for (const item of queued.slice(0, limit)) {
    const packet = {
      ...item.packet,
      status: "resolved",
      resolvedAt: nowIso(),
      updatedAt: nowIso(),
      resolutionReason: reason,
      resolutionLane: lane,
    };
    if (!dryRun) {
      jsonWrite(packetPath("resolved", packet.id), packet);
      renameSync(item.path, `${item.path}.resolved-lane`);
    }
    moved++;
    console.log(`${dryRun ? "would resolve" : "resolved"} ${packet.id} ${packet.category}: ${String(packet.signature ?? "").replace(/\s+/g, " ").slice(0, 140)}`);
  }
  console.log(`${dryRun ? "Would resolve" : "Resolved"} lane ${lane}: moved=${moved} remaining=${Math.max(queued.length - moved, 0)}`);
}

async function dispatchCommand() {
  const profile = getArg("profile", "minimax.worker");
  const execute = hasFlag("execute");
  const limit = Number(getArg("limit", "3"));
  const queued = readAllPackets()
    .filter((item) => item.status === "queue")
    .sort((a, b) => (b.packet.count ?? 0) - (a.packet.count ?? 0) || String(b.packet.latestAt).localeCompare(String(a.packet.latestAt)))
    .slice(0, limit);
  let dispatched = 0;
  for (const item of queued) {
    const packet = {
      ...item.packet,
      status: "assigned",
      assignedAt: nowIso(),
      assignment: {
        profile,
        attempts: Number(item.packet.assignment?.attempts ?? 0) + 1,
      },
    };
    const { prompt, promptPath } = writePrompt(packet, profile);
    if (execute) {
      const result = await spawnWorker(prompt, profile, packet);
      packet.assignment.childId = result.id;
      packet.assignment.childStatus = result.status;
    }
    jsonWrite(packetPath("assigned", packet.id), packet);
    renameSync(item.path, `${item.path}.dispatched`);
    dispatched++;
    console.log(`${execute ? "dispatched" : "prepared"} ${packet.id} -> ${promptPath}`);
  }
  console.log(`Dispatch complete: ${dispatched}`);
}

function moveCommand(nextStatus) {
  const id = getArg("id", "");
  if (!id) throw new Error("--id is required");
  const found = findPacket(id);
  if (!found) throw new Error(`Packet not found: ${id}`);
  const packet = { ...found.packet, status: nextStatus, updatedAt: nowIso() };
  if (nextStatus === "resolved") packet.resolvedAt = nowIso();
  if (nextStatus === "failed" || nextStatus === "needs-human") packet.failedAt = nowIso();
  jsonWrite(packetPath(nextStatus, id), packet);
  renameSync(found.path, `${found.path}.${nextStatus}`);
  console.log(`${id} -> ${nextStatus}`);
}

try {
  if (command === "help" || command === "--help" || command === "-h") usage();
  else if (command === "queue") await queueCommand();
  else if (command === "status") statusCommand();
  else if (command === "batch") batchCommand();
  else if (command === "prune") pruneCommand();
  else if (command === "resolve-lane") resolveLaneCommand();
  else if (command === "dispatch") await dispatchCommand();
  else if (command === "resolve") moveCommand("resolved");
  else if (command === "fail") moveCommand(hasFlag("needs-human") ? "needs-human" : "failed");
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
