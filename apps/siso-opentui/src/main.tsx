#!/usr/bin/env bun
import { createCliRenderer, BoxRenderable, TextRenderable } from "@opentui/core";
import { loadSnapshot, submitIntent } from "./siso/orchestrator";
import { sisoTheme } from "./ui/theme";
import { fit } from "./ui/layout";
import { setBlock } from "./ui/render";
import { loadingBody } from "./components/loading";
import { chatRows, type ChatMessage } from "./components/chat";
import { agentRows } from "./components/agents";
import { statusRows } from "./components/status";
import { promptBox } from "./components/prompt";
import { homeRows } from "./components/home";
import { appendMessage, createSession, listSessions, loadSession, type SisoOpenTuiSession } from "./siso/sessions";
import { commandPaletteRows, commands } from "./components/command-palette";
import { toolRows } from "./components/tools";
import { extensionRows } from "./components/extensions";
import { dialogRows } from "./components/dialog";
import { toastRows, type Toast } from "./components/toast";
import { createSisoOpenTuiRuntime, type SisoOpenTuiRuntime } from "./siso/session-runtime";

const renderer = await createCliRenderer({ exitOnCtrlC: false, targetFps: 24, maxFps: 24, useThread: false, startOnNewLine: true });
let ready = false;
let input = "";
let frame = 0;
let route: "home" | "session" = "home";
let view: "chat" | "agents" | "tools" | "extensions" | "status" = "chat";
let overlay: "commands" | "help" | null = null;
let selectedCommand = 0;
let toasts: Toast[] = [];
let sessions = listSessions();
let selectedHome = 0;
let currentSession: SisoOpenTuiSession | undefined = sessions[0] ?? createSession("New session");
let status = loadSnapshot();
let messages: ChatMessage[] = currentSession?.messages ?? [];
let runtime: SisoOpenTuiRuntime | undefined;
let streamingAssistant = "";
let streamingToolLines: string[] = [];
let isSubmitting = false;
const realRuntimeEnabled = process.env.SISO_OPENTUI_REAL_AGENT === "1";

const shell = new BoxRenderable(renderer, { id: "siso-shell", position: "absolute", left: 0, top: 0, width: renderer.terminalWidth, height: renderer.terminalHeight, backgroundColor: sisoTheme.bg });
renderer.root.add(shell);
const header = text("siso-header");
const body = text("siso-body");
const composer = text("siso-composer");
const hints = text("siso-hints");
const footer = text("siso-footer");
for (const item of [header, body, composer, hints, footer]) shell.add(item);

function text(id: string) {
  return new TextRenderable(renderer, { id, position: "absolute", left: 0, top: 0, width: 80, height: 1, content: "", fg: sisoTheme.text });
}
function center(width: number) { return Math.max(0, Math.floor((renderer.terminalWidth - width) / 2)); }
function colWidth() { return Math.min(104, Math.max(52, renderer.terminalWidth - 8)); }

function drawLoading(width: number, left: number, height: number) {
  const top = Math.max(2, Math.floor(height / 2) - 5);
  setBlock(header, { left, top, width, height: 2, fg: sisoTheme.accent, content: [fit("SISO", width), fit("terminal agent workspace", width)].join("\n") });
  setBlock(body, { left, top: top + 4, width, height: 6, content: loadingBody(frame, width) });
  setBlock(composer, { left, top: height - 4, width, height: 1, fg: sisoTheme.muted, content: "" });
  setBlock(hints, { left, top: height - 3, width, height: 1, fg: sisoTheme.muted, content: "" });
  setBlock(footer, { left, top: height - 1, width, height: 1, fg: sisoTheme.muted, content: fit("OpenTUI app · live local SISO status", width) });
}
function pushToast(title: string, message: string) {
  toasts.push({ title, message, ttl: 24 });
}

function activateCommand(key: string) {
  if (key === "q") return cleanup();
  if (key === "r") { submitIntent({ type: "status.refresh" }); status = loadSnapshot(); pushToast("Refreshed", "SISO snapshot reloaded"); overlay = null; draw(); return; }
  if (["a", "e", "s", "c"].includes(key)) {
    const next = key === "a" ? "agents" : key === "e" ? "extensions" : key === "s" ? "status" : "chat";
    submitIntent({ type: "view.change", view: next });
    view = next; input = ""; overlay = null; draw(); return;
  }
  if (key === "t") { view = "tools"; input = ""; overlay = null; draw(); return; }
}

function syncSessionMessages() {
  messages = currentSession?.messages ?? [];
  if (streamingAssistant || streamingToolLines.length > 0) {
    messages = [
      ...messages,
      { role: "assistant", text: streamingAssistant || "Working..." },
      ...streamingToolLines.map((text) => ({ role: "tool", text })),
    ];
  }
}
function openSelectedHome() {
  if (selectedHome === 0) {
    currentSession = createSession("New session");
  } else {
    currentSession = loadSession(sessions[selectedHome - 1]?.id) ?? sessions[selectedHome - 1];
  }
  syncSessionMessages();
  route = "session";
  view = "chat";
  input = "";
}
function drawApp(width: number, left: number, height: number) {
  const rows = Math.max(6, height - 10);
  setBlock(header, { left, top: 1, width, height: 2, fg: sisoTheme.accent, content: [fit("SISO", width), fit(route === "home" ? "OpenTUI home · Enter open · n new · q exit" : "OpenTUI session · / commands · ? help · h home", width)].join("\n") });
  let content = route === "home" ? homeRows(sessions, selectedHome, width, rows) : view === "agents" ? agentRows(status, width, rows) : view === "tools" ? toolRows(status, width, rows) : view === "extensions" ? extensionRows(width, rows) : view === "status" ? statusRows(status, width, rows) : chatRows(messages, width, rows);
  if (overlay === "commands") content = dialogRows("Commands", commandPaletteRows(width - 10, selectedCommand).split("\n"), width);
  if (overlay === "help") content = dialogRows("Help", ["a agents", "e extensions", "t tools", "s status", "c chat", "r refresh", "/ commands", "q exit"], width);
  const toast = toastRows(toasts, width);
  if (toast) content = `${content}\n${toast}`;
  setBlock(body, { left, top: 4, width, height: rows, content });
  const promptTop = Math.max(7, height - 5);
  const placeholder = route === "home" ? "Select or create a session…" : view === "chat" ? "Message SISO…" : "Press c for chat, r refresh";
  setBlock(composer, { left, top: promptTop, width, height: 3, fg: input ? sisoTheme.text : sisoTheme.muted, content: promptBox(input, width, placeholder) });
  setBlock(hints, { left, top: promptTop + 3, width, height: 1, fg: sisoTheme.muted, content: fit(route === "home" ? "↑/↓ select · Enter open · n new" : realRuntimeEnabled ? "Enter sends to SISO runtime · / commands · ? help · h home" : "Enter local message · / commands · ? help · h home", width) });
  setBlock(footer, { left, top: height - 1, width, height: 1, fg: sisoTheme.muted, content: fit(`Bifrost ${status.bifrost} · ${status.model} · ${status.active} active agents · ${sessions.length} sessions`, width) });
}
function draw() {
  const width = colWidth(); const left = center(width); const height = renderer.terminalHeight;
  shell.width = renderer.terminalWidth; shell.height = height;
  if (!ready) drawLoading(width, left, height); else drawApp(width, left, height);
  renderer.requestRender();
}
const timer = setInterval(() => { frame++; if (frame > 6) ready = true; if (frame % 20 === 0) status = loadSnapshot(); toasts = toasts.map((toast) => ({ ...toast, ttl: toast.ttl - 1 })).filter((toast) => toast.ttl > 0); draw(); }, 180);
draw();
renderer.start();
renderer.keyInput.on("keypress", (key) => {
  if ((key.ctrl && key.name === "c") || key.name === "q" || key.name === "escape") return cleanup();
  if (!ready) return;
  if (route === "home") {
    if (key.name === "up") { selectedHome = Math.max(0, selectedHome - 1); draw(); return; }
    if (key.name === "down") { selectedHome = Math.min(sessions.length, selectedHome + 1); draw(); return; }
    if (key.name === "return" || key.name === "enter") { openSelectedHome(); draw(); return; }
    if (key.name === "n" || key.sequence === "n") { selectedHome = 0; openSelectedHome(); draw(); return; }
    if (key.name === "a") { route = "session"; view = "agents"; draw(); return; }
    if (key.name === "e") { route = "session"; view = "extensions"; draw(); return; }
    if (key.name === "s") { route = "session"; view = "status"; draw(); return; }
  }
  if (key.name === "h") { sessions = listSessions(); route = "home"; selectedHome = 0; input = ""; draw(); return; }
  if (overlay === "commands") {
    if (key.name === "up") { selectedCommand = Math.max(0, selectedCommand - 1); draw(); return; }
    if (key.name === "down") { selectedCommand = Math.min(commands.length - 1, selectedCommand + 1); draw(); return; }
    if (key.name === "return" || key.name === "enter") { activateCommand(commands[selectedCommand].key); return; }
    const direct = commands.find((command) => command.key === key.name || command.key === key.sequence);
    if (direct) { activateCommand(direct.key); return; }
  }
  if (key.sequence === "/") { overlay = "commands"; selectedCommand = 0; draw(); return; }
  if (key.sequence === "?") { overlay = "help"; draw(); return; }
  if (overlay && (key.name === "escape" || key.name === "backspace")) { overlay = null; draw(); return; }
  if (key.name === "t") { view = "tools"; input = ""; draw(); return; }
  if (key.name === "e") { submitIntent({ type: "view.change", view: "extensions" }); view = "extensions"; input = ""; draw(); return; }
  if (key.name === "a") { submitIntent({ type: "view.change", view: "agents" }); view = "agents"; input = ""; draw(); return; }
  if (key.name === "s") { submitIntent({ type: "view.change", view: "status" }); view = "status"; input = ""; draw(); return; }
  if (key.name === "c") { submitIntent({ type: "view.change", view: "chat" }); view = "chat"; input = ""; draw(); return; }
  if (key.name === "r") { submitIntent({ type: "status.refresh" }); status = loadSnapshot(); pushToast("Refreshed", "SISO snapshot reloaded"); draw(); return; }
  if (view !== "chat") return;
  if (key.name === "return" || key.name === "enter") {
    if (input.trim() && currentSession && !isSubmitting) void submitChat(input.trim());
    draw();
    return;
  }
  if (key.name === "backspace") { input = input.slice(0, -1); draw(); return; }
  if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) { input += key.sequence; draw(); return; }
});

renderer.on("resize", draw);
async function submitChat(text: string) {
  if (!currentSession) return;
  submitIntent({ type: "chat.submit", text });
  appendMessage(currentSession, "user", text);
  currentSession = loadSession(currentSession.id) ?? currentSession;
  input = "";
  streamingAssistant = "";
  streamingToolLines = [];
  syncSessionMessages();
  sessions = listSessions();
  draw();

  if (!realRuntimeEnabled) {
    appendMessage(currentSession, "assistant", "Intent accepted locally. Set SISO_OPENTUI_REAL_AGENT=1 to stream through the SISO runtime.");
    currentSession = loadSession(currentSession.id) ?? currentSession;
    syncSessionMessages();
    sessions = listSessions();
    draw();
    return;
  }

  isSubmitting = true;
  try {
    runtime ??= await createSisoOpenTuiRuntime();
    await runtime.sendPrompt(text, {
      onAssistantDelta(delta) {
        streamingAssistant += delta;
        syncSessionMessages();
        draw();
      },
      onToolEvent(event) {
        const label = event.phase === "start" ? "started" : event.phase === "update" ? "updated" : event.isError ? "failed" : "finished";
        streamingToolLines = [`${event.name} ${label}`, ...streamingToolLines].slice(0, 4);
        syncSessionMessages();
        draw();
      },
      onDone() {
        const finalText = streamingAssistant.trim() || "SISO runtime finished without assistant text.";
        if (currentSession) {
          appendMessage(currentSession, "assistant", finalText);
          currentSession = loadSession(currentSession.id) ?? currentSession;
          sessions = listSessions();
        }
        streamingAssistant = "";
        streamingToolLines = [];
        syncSessionMessages();
        draw();
      },
      onError(error) {
        if (currentSession) {
          appendMessage(currentSession, "assistant", `Runtime error: ${error.message}`);
          currentSession = loadSession(currentSession.id) ?? currentSession;
          sessions = listSessions();
        }
        streamingAssistant = "";
        streamingToolLines = [];
        syncSessionMessages();
        draw();
      },
    });
  } catch {
    // onError has already rendered the runtime failure.
  } finally {
    isSubmitting = false;
  }
}

function cleanup() {
  clearInterval(timer);
  void runtime?.dispose();
  renderer.destroy();
  process.exit(0);
}
process.on("SIGINT", cleanup); process.on("SIGTERM", cleanup);
