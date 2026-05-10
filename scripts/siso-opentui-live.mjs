#!/usr/bin/env node
import { createCliRenderer, BoxRenderable, TextRenderable } from "@opentui/core";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

const theme = {
  bg: "#080b10",
  text: "#d7dde8",
  muted: "#6f7a89",
  accent: "#7dd3fc",
};

const renderer = await createCliRenderer({ exitOnCtrlC: false, targetFps: 24, maxFps: 24, useThread: false, startOnNewLine: true });
const root = renderer.root;
let ready = false;
let input = "";
let frame = 0;
let view = "chat";
let status = loadStatus();
let messages = [
  { role: "user", text: "OpenTUI app shell prototype." },
  { role: "assistant", text: "Live local SISO status is wired. Press a for agents, s for status, q to exit." },
];

const shell = new BoxRenderable(renderer, { id: "siso-shell", position: "absolute", left: 0, top: 0, width: renderer.terminalWidth, height: renderer.terminalHeight, backgroundColor: theme.bg });
root.add(shell);
const header = text("siso-header");
const body = text("siso-body");
const composer = text("siso-composer");
const hints = text("siso-hints");
const footer = text("siso-footer");
for (const item of [header, body, composer, hints, footer]) shell.add(item);

function text(id) {
  return new TextRenderable(renderer, { id, position: "absolute", left: 0, top: 0, width: 80, height: 1, content: "", fg: theme.text });
}

function fit(value, width) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trimEnd();
  if (raw.length <= width) return raw + " ".repeat(Math.max(0, width - raw.length));
  return raw.slice(0, Math.max(0, width - 1)) + "…";
}
function center(width) { return Math.max(0, Math.floor((renderer.terminalWidth - width) / 2)); }
function colWidth() { return Math.min(104, Math.max(52, renderer.terminalWidth - 8)); }
function spinner() { return ["◐", "◓", "◑", "◒"][frame % 4]; }
function line(width, char = "─") { return char.repeat(Math.max(0, width)); }
function setBlock(node, { left, top, width, height, content, fg = theme.text }) {
  node.left = left; node.top = top; node.width = width; node.height = height; node.fg = fg; node.content = content;
}

function loadStatus() {
  const childDir = join(homedir(), ".siso", "agent", "child-runs");
  const children = [];
  if (existsSync(childDir)) {
    for (const file of readdirSync(childDir).filter((f) => f.endsWith(".json") && !f.endsWith(".exit.json")).slice(-300)) {
      const path = join(childDir, file);
      try {
        const data = JSON.parse(readFileSync(path, "utf8"));
        const st = statSync(path);
        children.push({
          id: data.id ?? basename(file, ".json"),
          status: data.status ?? "unknown",
          profile: data.profile ?? data.lane ?? "agent",
          task: data.task ?? data.title ?? data.description ?? data.compactResult?.summary ?? "background task",
          tokens: data.usage?.total_tokens ?? data.tokensEstimated ?? data.tokens_estimated,
          tools: data.usage?.tool_uses ?? data.toolCalls ?? data.tool_calls,
          updatedAt: data.updatedAt ?? data.completedAt ?? data.startedAt ?? st.mtime.toISOString(),
        });
      } catch {}
    }
    children.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
  const active = children.filter((c) => ["running", "planned", "queued"].includes(c.status)).length;
  const done = children.filter((c) => c.status === "completed").length;
  const failed = children.filter((c) => ["failed", "timeout", "aborted", "stopped"].includes(c.status)).length;
  return { children: children.slice(0, 10), active, done, failed, cwd: basename(process.cwd()), model: process.env.SISO_MODEL || "Spark", bifrost: "ok", loadedAt: new Date() };
}

function drawLoading(width, left, height) {
  const top = Math.max(2, Math.floor(height / 2) - 5);
  setBlock(header, { left, top, width, height: 2, fg: theme.accent, content: [fit("SISO", width), fit("terminal agent workspace", width)].join("\n") });
  setBlock(body, { left, top: top + 4, width, height: 6, content: [fit(`${spinner()} Loading workspace`, width), fit("  profile ready", width), fit("  Bifrost route ready", width), fit("  OpenTUI renderer starting", width), "", fit("q exits", width)].join("\n") });
  setBlock(composer, { left, top: height - 4, width, height: 1, fg: theme.muted, content: "" });
  setBlock(hints, { left, top: height - 3, width, height: 1, fg: theme.muted, content: "" });
  setBlock(footer, { left, top: height - 1, width, height: 1, fg: theme.muted, content: fit("local renderer · live local status", width) });
}

function wrapText(text, width) {
  const rows = [];
  let current = "";
  for (const word of String(text ?? "").split(/\s+/)) {
    if ((current + " " + word).trim().length > width) { rows.push(fit(current, width)); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) rows.push(fit(current, width));
  return rows;
}

function chatRows(width, maxRows) {
  const rows = [];
  for (const msg of messages.slice(-8)) {
    rows.push(fit(msg.role === "user" ? "You" : "SISO", width));
    rows.push(...wrapText(`  ${msg.text}`, width));
    rows.push("");
  }
  return rows.slice(Math.max(0, rows.length - maxRows)).join("\n");
}

function agentRows(width, maxRows) {
  const rows = [fit("Recent child agents", width), line(width)];
  for (const child of status.children) {
    const label = child.id.replace(/siso-child-[a-z0-9-]+/i, "child-agent");
    rows.push(fit(`${icon(child.status)} ${label} · ${child.status} · ${child.profile}`, width));
    rows.push(fit(`  ${child.task}`, width));
  }
  if (rows.length <= 2) rows.push(fit("No child runs found", width));
  return rows.slice(0, maxRows).join("\n");
}
function icon(st) { return st === "completed" ? "✓" : ["failed", "timeout", "aborted", "stopped"].includes(st) ? "!" : "◐"; }

function statusRows(width, maxRows) {
  return [
    fit("SISO status", width), line(width),
    fit(`cwd ${status.cwd}`, width),
    fit(`model ${status.model}`, width),
    fit(`Bifrost ${status.bifrost}`, width),
    fit(`agents active ${status.active} · done ${status.done} · failed ${status.failed}`, width),
    fit(`loaded ${status.loadedAt.toLocaleTimeString()}`, width),
  ].slice(0, maxRows).join("\n");
}

function drawApp(width, left, height) {
  const rows = Math.max(6, height - 10);
  setBlock(header, { left, top: 1, width, height: 2, fg: theme.accent, content: [fit("SISO", width), fit("OpenTUI app mode · a agents · s status · c chat · r refresh · q exit", width)].join("\n") });
  const content = view === "agents" ? agentRows(width, rows) : view === "status" ? statusRows(width, rows) : chatRows(width, rows);
  setBlock(body, { left, top: 4, width, height: rows, content });
  const promptTop = Math.max(7, height - 5);
  const promptText = input || (view === "chat" ? "Message SISO…" : "Press c for chat, r refresh");
  setBlock(composer, { left, top: promptTop, width, height: 3, fg: input ? theme.text : theme.muted, content: [`╭${line(width - 2)}╮`, fit(`│ › ${promptText}`, width - 1) + "│", `╰${line(width - 2)}╯`].join("\n") });
  setBlock(hints, { left, top: promptTop + 3, width, height: 1, fg: theme.muted, content: fit("Enter local message · a agents · s status · c chat · r refresh", width) });
  setBlock(footer, { left, top: height - 1, width, height: 1, fg: theme.muted, content: fit(`Bifrost ${status.bifrost} · ${status.model} · ${status.active} active agents · ${status.children.length} recent`, width) });
}

function draw() {
  const width = colWidth(); const left = center(width); const height = renderer.terminalHeight;
  shell.width = renderer.terminalWidth; shell.height = height;
  if (!ready) drawLoading(width, left, height); else drawApp(width, left, height);
  renderer.requestRender();
}

const timer = setInterval(() => { frame++; if (frame > 6) ready = true; if (frame % 20 === 0) status = loadStatus(); draw(); }, 180);
draw();
renderer.start();

renderer.keyInput.on("keypress", (key) => {
  if ((key.ctrl && key.name === "c") || key.name === "q" || key.name === "escape") return cleanup();
  if (!ready) return;
  if (key.name === "a") { view = "agents"; input = ""; draw(); return; }
  if (key.name === "s") { view = "status"; input = ""; draw(); return; }
  if (key.name === "c") { view = "chat"; input = ""; draw(); return; }
  if (key.name === "r") { status = loadStatus(); draw(); return; }
  if (view !== "chat") return;
  if (key.name === "return" || key.name === "enter") {
    if (input.trim()) { messages.push({ role: "user", text: input.trim() }); messages.push({ role: "assistant", text: "Got it locally. Real runtime streaming is the next integration step." }); input = ""; }
    draw(); return;
  }
  if (key.name === "backspace") { input = input.slice(0, -1); draw(); return; }
  if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) { input += key.sequence; draw(); }
});
renderer.on("resize", draw);
function cleanup() { clearInterval(timer); renderer.destroy(); process.exit(0); }
process.on("SIGINT", cleanup); process.on("SIGTERM", cleanup);
