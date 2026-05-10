#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/analyze-tool-errors.mjs [options]

Options:
  --hours=24                 Analyze rows from the last N hours unless --since is set.
  --since=2026-05-10         Analyze rows since local date or ISO timestamp.
  --root=PATH                Transcript root. Defaults to ~/.siso/agent/transcripts.
  --out=PATH                 Markdown report path.
  --examples=2               Examples per signature.
  --limit=30                 Number of signatures to include.
`);
  process.exit(0);
}

const getArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
};

const hours = Number(getArg('hours', '24'));
const explicitSince = getArg('since', '');
const cutoff = explicitSince ? new Date(explicitSince) : new Date(Date.now() - hours * 60 * 60 * 1000);
if (Number.isNaN(cutoff.getTime())) throw new Error(`Invalid --since value: ${explicitSince}`);
const since = explicitSince || cutoff.toISOString();
const cutoffDay = cutoff.toISOString().slice(0, 10);
const outPath = getArg('out', `.siso/reports/tool-error-digest-${new Date().toISOString().slice(0, 10)}.md`);
const maxExamples = Number(getArg('examples', '2'));
const limit = Number(getArg('limit', '30'));
const transcriptRoot = getArg('root', join(homedir(), '.siso/agent/transcripts'));

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try { return { row: JSON.parse(line), line: index + 1 }; }
      catch { return null; }
    })
    .filter(Boolean);
}

function listErrorFiles(root) {
  const days = [];
  if (!existsSync(root)) return days;
  for (const day of readdirSync(root).sort()) {
    if (day < cutoffDay) continue;
    const p = join(root, day, 'errors.jsonl');
    if (existsSync(p) && statSync(p).isFile()) days.push(p);
  }
  return days;
}

function textOf(row) {
  const val = row.text ?? row.error ?? row.errorMessage ?? row.message ?? row.output ?? row.result ?? '';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return String(val); }
}

function toolNameOf(row) {
  return row.tool_name ?? row.payload?.toolName ?? row.payload?.tool_name ?? row.payload?.name ?? '';
}

function toolInputOf(row) {
  const input = row.payload?.input ?? row.payload?.toolInput ?? {};
  if (!input || typeof input !== 'object') return '';
  if (typeof input.command === 'string') return input.command;
  if (typeof input.cmd === 'string') return input.cmd;
  if (typeof input.path === 'string') return input.path;
  try { return JSON.stringify(input); } catch { return ''; }
}

function scrub(text) {
  const singleLine = String(text)
    .replace(/(api[_-]?key|authorization|token|secret|password)(["'\s:=]+)[^,"'\s}]+/gi, '$1$2[REDACTED]')
    .replace(/"thinking(Signature)?":"[^"]+"/g, '"thinking$1":"[REDACTED]"')
    .replace(/\s+/g, ' ')
    .replace(/\s+$/g, '')
    .trim();
  return singleLine.length > 700 ? `${singleLine.slice(0, 700)} ... [truncated]` : singleLine;
}

function classify(text) {
  const low = text.toLowerCase();
  if (looksLikeSourceDump(text)) return ['source dump logged as error', 'Avoid treating successful large file output as a repair bug; inspect the originating tool call/logging path.'];
  if (looksLikeLineRangeDump(text)) return ['source excerpt logged as error', 'Avoid treating successful line-range output as a repair bug; inspect the originating tool call/logging path.'];
  if (looksLikeDirectoryListingDump(text)) return ['directory listing logged as error', 'Avoid treating successful directory listings as repair bugs; inspect the originating tool call/logging path.'];
  if (looksLikeErrorSummaryDump(text)) return ['error summary output logged as error', 'Avoid feeding ad hoc error-summary output back into the repair queue.'];
  if (looksLikeTerminalControlOutput(text)) return ['terminal control output logged as error', 'Avoid treating TUI control sequences as repair bugs; use a PTY-aware smoke or filtered output.'];
  if (low.includes('could not find edits') && low.includes('oldtext must match exactly')) return ['stale edit target', 'Re-read the file immediately before editing and use a smaller unique hunk.'];
  if (low.includes('found 2 occurrences of edits') && low.includes('oldtext must be unique')) return ['ambiguous edit target', 'Use a larger unique hunk or apply_patch context so replacements cannot match multiple locations.'];
  if (/^\s*(grep|rg)\b[\s\S]*command exited with code 1\s*$/i.test(text)) return ['search miss logged as error', 'Use search commands that tolerate no-match results when absence is expected.'];
  if (looksLikeHeredocTerminatorMisuse(text)) return ['shell heredoc misuse', 'Place redirection/pipes on the heredoc command, not on the PY terminator line.'];
  if (low.includes('missing script: "test"')) return ['missing npm script', 'Add/avoid the script; agents should inspect package scripts before running npm test.'];
  if (low.includes('python: command not found')) return ['bad command assumption', 'Use python3 on macOS or probe executable availability.'];
  if (low.includes('eisdir')) return ['file-vs-directory misuse', 'Check stat/isDirectory before read.'];
  if (low.includes('enoent') || low.includes('no such file or directory') || low.includes('path not found')) return ['missing/stale path', 'Validate paths against current workspace before tool calls.'];
  if (low.includes('timed out') || low.includes('timeout')) return ['timeout', 'Raise budget for known-slow commands or use narrower commands.'];
  if (low.includes('assertionerror')) return ['assertion failure', 'Capture failing assertion and add/update smoke coverage.'];
  if (low.includes('syntaxerror')) return ['syntax error', 'Run syntax checks before shipping generated/edited JS.'];
  if (low.includes('typeerror')) return ['type error', 'Add runtime guard or focused regression test.'];
  if (low.includes('command not found')) return ['missing command', 'Probe command availability and provide fallback.'];
  if (low.includes('permission denied') || low.includes('eacces')) return ['permission error', 'Avoid protected paths or fix permissions.'];
  if (low.includes('tool_use ids were found without tool_result')) return ['provider protocol', 'Ensure every emitted tool_use gets a matching tool_result.'];
  if (low.includes('invalid_request_error')) return ['provider request error', 'Reduce/repair malformed provider payload.'];
  if (low.includes('getaddrinfo enotfound') || low.includes('fetch failed')) return ['network/dependency failure', 'Retry with bounded backoff and surface the failing host/service.'];
  if (low.includes('no such column')) return ['schema mismatch', 'Use schema introspection before querying local DBs.'];
  if (low.includes('error')) return ['generic tool error', 'Inspect command output and add a typed classifier.'];
  return ['misc tool error', 'Inspect manually.'];
}

function isActionableCategory(category) {
  return ![
    'source dump logged as error',
    'source excerpt logged as error',
    'directory listing logged as error',
    'error summary output logged as error',
    'terminal control output logged as error',
    'search miss logged as error',
  ].includes(category);
}

function commandLabel(text) {
  const m = String(text).match(/\s---\s+(.{1,80}?)(?:\s+Command exited with code|\s*$)/i);
  return m ? m[1].trim() : '';
}

function signature(row, text) {
  const low = text.toLowerCase();
  const toolName = toolNameOf(row);
  const toolInput = toolInputOf(row);
  let m;
  if (looksLikeSourceDump(text)) {
    const source = toolInput || toolName || 'unknown';
    return `${toolName || 'tool'}: ${commandShape(source)}`;
  }
  if (looksLikeLineRangeDump(text)) {
    const source = toolInput || toolName || 'unknown';
    return `${toolName || 'tool'}: ${commandShape(source)}`;
  }
  if (looksLikeDirectoryListingDump(text)) {
    const source = toolInput || toolName || 'unknown';
    return `${toolName || 'tool'}: ${commandShape(source)}`;
  }
  if (looksLikeErrorSummaryDump(text)) {
    const source = toolInput || toolName || 'unknown';
    return `${toolName || 'tool'}: ${commandShape(source)}`;
  }
  if (looksLikeTerminalControlOutput(text)) {
    const source = toolInput || toolName || 'unknown';
    return `${toolName || 'tool'}: ${commandShape(source)}`;
  }
  if (/could not find edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i.test(text)) {
    return text.match(/Could not find edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i)[0];
  }
  if (/found \d+ occurrences of edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i.test(text)) {
    return text.match(/Found \d+ occurrences of edits\[\d+\] in [^\n.]+(?:\.[A-Za-z0-9]+)?/i)[0];
  }
  if (/^\s*(grep|rg)\b[\s\S]*command exited with code 1\s*$/i.test(text)) {
    const source = commandShape(toolInput || toolName || text);
    return `${toolName || 'search'}: ${source}`;
  }
  if (looksLikeHeredocTerminatorMisuse(text)) {
    const source = commandShape(toolInput || toolName || text);
    return `${toolName || 'bash'}: ${source}`;
  }
  if ((m = text.match(/Path not found:\s*[^\n\r]+/i))) return m[0].slice(0, 220);
  if ((m = text.match(/no such column:\s*[^\s;]+/i))) return m[0];
  if ((m = text.match(/getaddrinfo ENOTFOUND\s+[^\s]+/i))) return m[0];
  if ((m = text.match(/fetch failed/i))) return `${commandLabel(text) || 'fetch'}: fetch failed`;
  if ((m = text.match(/ENOENT[^\n\r]{0,180}/i))) return m[0];
  if ((m = text.match(/no such file or directory[^\n\r]{0,180}/i))) return m[0];
  if ((m = text.match(/Timed out after \d+ms|timed out after \d+ seconds|timeout[^\n\r]{0,80}/i))) {
    const source = commandShape(toolInput || toolName);
    return source ? `${m[0]}: ${source}` : m[0];
  }
  if ((m = text.match(/[^\n\r:]+: command not found/i))) return m[0].trim();
  if (low.includes('missing script: "test"')) return 'npm Missing script: test';
  if ((m = text.match(/AssertionError[^\n\r]*/i))) return m[0].slice(0, 160);
  if ((m = text.match(/SyntaxError[^\n\r]*/i))) return m[0].slice(0, 160);
  if ((m = text.match(/TypeError[^\n\r]*/i))) return m[0].slice(0, 160);
  if ((m = text.match(/EISDIR[^\n\r]*/i))) return m[0].slice(0, 160);
  if ((m = text.match(/npm error[^\n\r]*/i))) return m[0].slice(0, 160);
  if ((m = text.match(/Command exited with code \d+/i))) {
    const label = commandLabel(text);
    const source = toolInput || label || toolName;
    return source ? `${source.slice(0, 160)}: ${m[0]}` : m[0];
  }
  if (toolInput && scrub(text).length < 80) return `${toolInput.slice(0, 160)}: ${scrub(text)}`;
  return scrub(text).replace(/\s+/g, ' ').slice(0, 160) || '(empty error output)';
}

function commandShape(input) {
  const text = String(input ?? '').trim();
  if (!text) return '';
  const firstLine = text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? text;
  return firstLine.replace(/\s+/g, ' ').slice(0, 120);
}

function looksLikeSourceDump(text) {
  const value = String(text ?? '');
  return /\bimport\s+\{[^}]+\}\s+from\s+["'][^"']+["']/.test(value)
    || /\bexport\s+(async\s+)?function\s+[A-Za-z0-9_$]+/.test(value)
    || /\bconst\s+[A-Z0-9_]{3,}\s*=/.test(value);
}

function looksLikeLineRangeDump(text) {
  return /^---\s+\d+(?:-\d+)?(?:\s+---)?\s+\d+:\s+/s.test(String(text ?? ''));
}

function looksLikeDirectoryListingDump(text) {
  return /^total\s+\d+\s+[bcdlps-][rwx-]{9}\s+/s.test(String(text ?? ''));
}

function looksLikeErrorSummaryDump(text) {
  const value = String(text ?? '');
  return /^TRUE_ERROR_EVENTS\s+\d+\s+TOP\s+\d+\s+\|\s+/s.test(value);
}

function looksLikeHeredocTerminatorMisuse(text) {
  const value = String(text ?? '');
  return /syntaxerror: invalid syntax/i.test(value) && /\n\s*py\s*(?:[>|])/i.test(value);
}

function looksLikeTerminalControlOutput(text) {
  const value = String(text ?? '');
  return /\x1b\[\?\d+[a-z]/i.test(value) || /\x1b\]\d+;/.test(value);
}

const groups = new Map();
const seenToolCalls = new Set();
let rawToolErrors = 0;
let ignoredProviderTelemetry = 0;

for (const file of listErrorFiles(transcriptRoot)) {
  for (const { row, line } of readJsonl(file)) {
    if (row.timestamp && new Date(row.timestamp) < cutoff) continue;
    const eventType = row.event_type ?? row.type ?? '';
    if (eventType === 'before_provider_request') { ignoredProviderTelemetry++; continue; }
    if (!['tool_result', 'tool_execution_end'].includes(eventType) || row.kind !== 'error') continue;
    const callId = row.payload?.toolCallId ?? row.toolCallId ?? '';
    if (callId) {
      if (seenToolCalls.has(callId)) continue;
      seenToolCalls.add(callId);
    }
    rawToolErrors++;
    const text = textOf(row);
    const sig = signature(row, text);
    const [category, recommendedFix] = classify(text);
    const key = `${category}::${sig}`;
    const item = groups.get(key) ?? { category, signature: sig, recommendedFix, count: 0, first: row.timestamp ?? '', latest: row.timestamp ?? '', examples: [] };
    item.count++;
    if (row.timestamp && (!item.first || row.timestamp < item.first)) item.first = row.timestamp;
    if (row.timestamp && (!item.latest || row.timestamp > item.latest)) item.latest = row.timestamp;
    if (item.examples.length < maxExamples) {
      item.examples.push({
        timestamp: row.timestamp ?? '',
        eventType,
        toolName: toolNameOf(row),
        toolInput: toolInputOf(row),
        cwd: row.cwd ?? row.payload?.cwd ?? '',
        file: relative(homedir(), file),
        line,
        text: scrub(text),
      });
    }
    groups.set(key, item);
  }
}

const sorted = [...groups.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));
const actionable = sorted.filter((group) => isActionableCategory(group.category));
const nonActionable = sorted.filter((group) => !isActionableCategory(group.category));
const byCategory = new Map();
for (const g of sorted) byCategory.set(g.category, (byCategory.get(g.category) ?? 0) + g.count);

const lines = [];
lines.push(`# Tool Error Digest`);
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Since: ${since}`);
lines.push(`Transcript root: \`${transcriptRoot.replace(homedir(), '~')}\``);
lines.push('');
lines.push(`Raw real tool errors: **${rawToolErrors}**`);
lines.push(`Unique signatures: **${sorted.length}**`);
lines.push(`Actionable signatures: **${actionable.length}**`);
lines.push(`Non-actionable/noise signatures: **${nonActionable.length}**`);
lines.push(`Ignored provider telemetry rows: **${ignoredProviderTelemetry}**`);
lines.push('');
lines.push('## Category counts');
lines.push('');
for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) lines.push(`- ${count} — ${cat}`);
lines.push('');
lines.push('## Fix backlog');
lines.push('');
for (const g of actionable.slice(0, 10)) {
  lines.push(`- ${g.count}× ${g.category}: \`${g.signature.replace(/`/g, '\\`')}\` — ${g.recommendedFix}`);
}
if (!actionable.length) lines.push('- No actionable tool-error signatures found.');
lines.push('');
lines.push('## Non-actionable Noise');
lines.push('');
for (const g of nonActionable.slice(0, 10)) {
  lines.push(`- ${g.count}× ${g.category}: \`${g.signature.replace(/`/g, '\\`')}\``);
}
if (!nonActionable.length) lines.push('- None detected.');
lines.push('');
lines.push('## Top recurring signatures');
lines.push('');
for (const g of sorted.slice(0, limit)) {
  lines.push(`### ${g.count}× ${g.category}`);
  lines.push('');
  lines.push(`Signature: \`${g.signature.replace(/`/g, '\\`')}\``);
  lines.push(`First: ${g.first || 'unknown'}  `);
  lines.push(`Latest: ${g.latest || 'unknown'}  `);
  lines.push(`Likely future fix: ${g.recommendedFix}`);
  lines.push('');
  for (const ex of g.examples) {
    lines.push(`<details><summary>Example ${ex.timestamp || ''}</summary>`);
    lines.push('');
    lines.push(`- Event: ${ex.eventType}`);
    if (ex.toolName) lines.push(`- Tool: \`${ex.toolName}\``);
    if (ex.toolInput) lines.push(`- Input: \`${ex.toolInput.replace(/`/g, '\\`').slice(0, 260)}\``);
    if (ex.cwd) lines.push(`- CWD: \`${ex.cwd}\``);
    lines.push(`- Source: \`~/${ex.file}:${ex.line}\``);
    lines.push('');
    lines.push('```text');
    lines.push(ex.text || '(no output)');
    lines.push('```');
    lines.push('</details>');
    lines.push('');
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${outPath}`);
console.log(`Raw tool errors: ${rawToolErrors}`);
console.log(`Unique signatures: ${sorted.length}`);
console.log('Top categories:');
for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`- ${count} ${cat}`);
