#!/usr/bin/env bun
import { BoxRenderable, TextRenderable, createCliRenderer } from "@opentui/core";
import { createLocalSession, loadLocalSisoSnapshot } from "../../../packages/siso-tui/src/adapters/local-snapshot";
import type { SisoUiEvent, SisoUiSession } from "../../../packages/siso-tui/src/contract/events";
import { fit, line, renderEventRows, renderSessionListRows, renderStatusLine, renderTranscriptRows } from "../../../packages/siso-tui/src/components/rows";
import { createSisoTuiRuntime, type SisoTuiRuntime, type SisoTuiRuntimeToolEvent } from "../../../packages/siso-tui/src/runtime/session-runtime";
import { sisoTerminalTheme as theme } from "../../../packages/siso-tui/src/theme/siso-theme";

type Route = "session" | "sessions" | "agents" | "status";

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  targetFps: 30,
  maxFps: 30,
  useThread: false,
  useMouse: true,
  startOnNewLine: true,
});

let route: Route = "session";
let input = "";
let selectedSession = 0;
let status = loadLocalSisoSnapshot();
let sessions: SisoUiSession[] = [createLocalSession()];
let currentSession = sessions[0]!;
let runtime: SisoTuiRuntime | undefined;
let sending = false;
let activeAssistantIndex: number | undefined;
let transcriptScrollOffset = 0;
const activeToolGroups = new Map<string, number>();

const shell = new BoxRenderable(renderer, {
  id: "siso-tui-shell",
  position: "absolute",
  left: 0,
  top: 0,
  width: renderer.terminalWidth,
  height: renderer.terminalHeight,
  backgroundColor: theme.bg,
});
renderer.root.add(shell);

const header = text("siso-tui-header");
const body = text("siso-tui-body");
const composer = text("siso-tui-composer");
const footer = text("siso-tui-footer");
for (const item of [header, body, composer, footer]) shell.add(item);

function text(id: string) {
  return new TextRenderable(renderer, {
    id,
    position: "absolute",
    left: 0,
    top: 0,
    width: 80,
    height: 1,
    content: "",
    fg: theme.text,
  });
}

function setBlock(node: TextRenderable, opts: { left: number; top: number; width: number; height: number; content: string; fg?: string }) {
  node.left = opts.left;
  node.top = opts.top;
  node.width = opts.width;
  node.height = opts.height;
  node.fg = opts.fg ?? theme.text;
  node.content = opts.content;
}

function appWidth() {
  return Math.min(112, Math.max(56, renderer.terminalWidth - 6));
}

function appLeft(width: number) {
  return Math.max(0, Math.floor((renderer.terminalWidth - width) / 2));
}

function drawApp(width: number, left: number, height: number) {
  const bodyRows = Math.max(8, height - 6);
  const rows = routeRows(width, bodyRows);
  setBlock(header, {
    left,
    top: 0,
    width,
    height: 1,
    fg: theme.accent,
    content: headerLine(width),
  });
  setBlock(body, { left, top: 2, width, height: bodyRows, content: rows.join("\n") });
  body.scrollY = route === "session" ? Math.max(0, rows.length - bodyRows - transcriptScrollOffset) : 0;
  setBlock(composer, { left, top: height - 3, width, height: 3, fg: input ? theme.text : theme.muted, content: composerRows(width).join("\n") });
  setBlock(footer, { left, top: height - 4, width, height: 1, fg: theme.muted, content: footerLine(width) });
}

function headerLine(width: number) {
  const left = sending ? "SISO · streaming" : "SISO";
  const right = renderStatusLine(status.status as Extract<SisoUiEvent, { type: "status" }>, Math.max(16, width - left.length - 2)).trim();
  return fit(`${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`, width);
}

function footerLine(width: number) {
  if (route === "session") return fit(transcriptScrollOffset > 0 ? `↑ ${transcriptScrollOffset} lines above latest` : "", width);
  if (route === "agents") return fit(`${status.children.length} recent child agents`, width);
  if (route === "sessions") return fit(`${sessions.length} sessions`, width);
  return fit("", width);
}

function routeRows(width: number, maxRows: number) {
  if (route === "sessions") return renderSessionListRows(sessions, selectedSession, width, maxRows);
  if (route === "agents") {
    const rows = [fit("Agents", width), line(width)];
    rows.push(...renderTranscriptRows(status.children, width, maxRows - 2));
    return rows.slice(0, maxRows);
  }
  if (route === "status") {
    return [
      fit("Status", width),
      line(width),
      fit(`cwd ${status.cwd}`, width),
      fit(`child runs ${status.children.length}`, width),
      fit(`source ${status.childRunDir}`, width),
      "",
      fit("This shell renders from packages/siso-tui contract components.", width),
    ].slice(0, maxRows);
  }
  return transcriptRows(width);
}

function transcriptRows(width: number) {
  const rows: string[] = [];
  for (const event of currentSession.events) {
    if (event.type === "status") continue;
    rows.push(...renderEventRows(event, width), "");
  }
  if (!rows.length) {
    rows.push(
      fit("", width),
      "",
    );
  }
  return rows;
}

function composerRows(width: number) {
  const label = route === "session" ? input || (sending ? "SISO is working…" : "Message SISO…") : "Press c for chat";
  return [
    `╭${line(width - 2)}╮`,
    `${fit(`│ › ${label}`, width - 1)}│`,
    `╰${line(width - 2)}╯`,
  ];
}

function draw() {
  const width = appWidth();
  const left = appLeft(width);
  const height = renderer.terminalHeight;
  shell.width = renderer.terminalWidth;
  shell.height = height;
  drawApp(width, left, height);
  renderer.requestRender();
}

function refresh() {
  status = loadLocalSisoSnapshot();
  const existingStatusIndex = currentSession.events.findIndex((event) => event.type === "status");
  if (existingStatusIndex >= 0) currentSession.events[existingStatusIndex] = status.status;
  else currentSession.events.push(status.status);
}

async function getRuntime() {
  if (!runtime) runtime = await createSisoTuiRuntime({ cwd: process.env.SISO_TUI_CWD ?? process.cwd() });
  return runtime;
}

function submitPrompt() {
  const text = input.trim();
  if (!text || sending) return;
  currentSession.events.push({ type: "message", role: "user", text, at: new Date().toISOString() });
  currentSession.updatedAt = new Date().toISOString();
  currentSession.events.push({
    type: "message",
    role: "assistant",
    text: "",
    at: new Date().toISOString(),
  });
  activeAssistantIndex = currentSession.events.length - 1;
  activeToolGroups.clear();
  sending = true;
  transcriptScrollOffset = 0;
  input = "";
  draw();

  void getRuntime()
    .then((activeRuntime) => activeRuntime.sendPrompt(text, {
      onAssistantDelta(delta) {
        appendAssistantDelta(delta);
        draw();
      },
      onToolEvent(event) {
        applyToolEvent(event);
        refresh();
        draw();
      },
      onDone() {
        sending = false;
        activeAssistantIndex = undefined;
        currentSession.updatedAt = new Date().toISOString();
        draw();
      },
      onError(error) {
        sending = false;
        activeAssistantIndex = undefined;
        currentSession.events.push({
          type: "notice",
          tone: "error",
          title: "Runtime error",
          text: error.message,
          at: new Date().toISOString(),
        });
        draw();
      },
    }))
    .catch((error) => {
      sending = false;
      activeAssistantIndex = undefined;
      const normalized = error instanceof Error ? error : new Error(String(error));
      currentSession.events.push({
        type: "notice",
        tone: "error",
        title: "Runtime error",
        text: normalized.message,
        at: new Date().toISOString(),
      });
      draw();
    });
}

function appendAssistantDelta(delta: string) {
  if (activeAssistantIndex === undefined || currentSession.events[activeAssistantIndex]?.type !== "message") {
    currentSession.events.push({ type: "message", role: "assistant", text: "", at: new Date().toISOString() });
    activeAssistantIndex = currentSession.events.length - 1;
  }
  const event = currentSession.events[activeAssistantIndex];
  if (event?.type === "message") event.text += delta;
  currentSession.updatedAt = new Date().toISOString();
}

function applyToolEvent(event: SisoTuiRuntimeToolEvent) {
  const existing = activeToolGroups.get(event.id);
  const item = {
    id: event.id,
    label: event.name,
    detail: toolDetail(event),
    status: event.phase === "end" ? (event.isError ? "error" as const : "done" as const) : "running" as const,
  };
  if (existing !== undefined && currentSession.events[existing]?.type === "tool_group") {
    const group = currentSession.events[existing];
    if (group.type !== "tool_group") return;
    group.status = item.status === "error" ? "error" : item.status === "done" ? "done" : "running";
    group.summary = toolSummary(event);
    group.items = [item];
    group.at = new Date().toISOString();
    return;
  }
  currentSession.events.push({
    type: "tool_group",
    phase: toolPhase(event.name),
    status: item.status === "error" ? "error" : item.status === "done" ? "done" : "running",
    summary: toolSummary(event),
    items: [item],
    at: new Date().toISOString(),
  });
  activeToolGroups.set(event.id, currentSession.events.length - 1);
}

function toolPhase(name: string) {
  const value = name.toLowerCase();
  if (/(read|ls|grep|find|search|context|status)/.test(value)) return "Explore";
  if (/(edit|write|patch|update)/.test(value)) return "Modify";
  if (/(test|smoke|check|verify|doctor)/.test(value)) return "Verify";
  if (/(agent|spawn|delegate|task)/.test(value)) return "Delegate";
  return "Tools";
}

function toolSummary(event: SisoTuiRuntimeToolEvent) {
  if (event.phase === "start") return `${event.name} started`;
  if (event.phase === "update") return `${event.name} running`;
  return event.isError ? `${event.name} failed` : `${event.name} complete`;
}

function toolDetail(event: SisoTuiRuntimeToolEvent) {
  const source = event.result ?? event.args;
  if (!source) return undefined;
  if (typeof source === "string") return source.slice(0, 90);
  if (typeof source !== "object") return String(source).slice(0, 90);
  const record = source as Record<string, unknown>;
  const candidates = [record.file, record.path, record.command, record.cmd, record.pattern, record.query, record.bytes];
  const selected = candidates.find((item) => item !== undefined && item !== null && String(item).trim());
  return selected === undefined ? undefined : String(selected).slice(0, 90);
}

function openSelectedSession() {
  if (selectedSession === 0) {
    currentSession = createLocalSession();
    sessions = [currentSession, ...sessions].slice(0, 12);
  } else {
    currentSession = sessions[selectedSession - 1] ?? sessions[0]!;
  }
  route = "session";
  transcriptScrollOffset = 0;
  input = "";
}

const timer = setInterval(() => {
  refresh();
  draw();
}, 3000);

draw();
renderer.start();

renderer.keyInput.on("keypress", (key) => {
  if ((key.ctrl && key.name === "c") || key.name === "escape" || (key.name === "q" && route !== "session") || (key.name === "q" && route === "session" && !input)) return cleanup();
  if (key.ctrl && key.name === "a") { route = "agents"; draw(); return; }
  if (key.ctrl && key.name === "s") { route = "status"; draw(); return; }
  if (key.ctrl && key.name === "l") { route = "sessions"; selectedSession = 0; draw(); return; }
  if (key.ctrl && key.name === "r") { refresh(); draw(); return; }
  if (route === "sessions") {
    if (key.name === "up") selectedSession = Math.max(0, selectedSession - 1);
    else if (key.name === "down") selectedSession = Math.min(sessions.length, selectedSession + 1);
    else if (key.name === "return" || key.name === "enter") openSelectedSession();
    draw();
    return;
  }
  if (route !== "session") {
    if (key.name === "c" || key.name === "return" || key.name === "enter") route = "session";
    draw();
    return;
  }
  if (!input && key.sequence === "/") { route = "sessions"; selectedSession = 0; draw(); return; }
  if (key.name === "up") { scrollTranscript(1); draw(); return; }
  if (key.name === "down") { scrollTranscript(-1); draw(); return; }
  if (key.name === "pageup") { scrollTranscript(Math.max(4, renderer.terminalHeight - 8)); draw(); return; }
  if (key.name === "pagedown") { scrollTranscript(-Math.max(4, renderer.terminalHeight - 8)); draw(); return; }
  if (key.name === "return" || key.name === "enter") { submitPrompt(); return; }
  if (key.name === "backspace") { input = input.slice(0, -1); draw(); return; }
  if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) { input += key.sequence; draw(); }
});

renderer.on("resize", draw);

body.onMouseScroll = (event) => {
  if (route !== "session") return;
  scrollTranscript(event.scroll?.direction === "up" ? 3 : -3);
  draw();
};

function scrollTranscript(delta: number) {
  const width = appWidth();
  const bodyRows = Math.max(8, renderer.terminalHeight - 8);
  const max = Math.max(0, transcriptRows(width).length - bodyRows);
  transcriptScrollOffset = Math.max(0, Math.min(max, transcriptScrollOffset + delta));
}

function cleanup() {
  clearInterval(timer);
  void runtime?.dispose();
  renderer.destroy();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
