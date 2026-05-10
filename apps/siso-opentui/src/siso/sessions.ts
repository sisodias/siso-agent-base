import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type SisoOpenTuiMessage = { role: "user" | "assistant"; text: string; at: string };
export type SisoOpenTuiSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: SisoOpenTuiMessage[];
};

const root = join(homedir(), ".siso", "agent", "opentui", "sessions");
function ensureRoot() {
  mkdirSync(root, { recursive: true });
}
function pathFor(id: string) {
  return join(root, `${id}.json`);
}
function now() {
  return new Date().toISOString();
}
function safeTitle(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > 48 ? `${value.slice(0, 45)}...` : value || "New session";
}

export function listSessions(): SisoOpenTuiSession[] {
  ensureRoot();
  const sessions: SisoOpenTuiSession[] = [];
  for (const file of readdirSync(root).filter((item) => item.endsWith(".json"))) {
    try {
      sessions.push(JSON.parse(readFileSync(join(root, file), "utf8")));
    } catch {}
  }
  sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return sessions;
}

export function createSession(title = "New session") {
  ensureRoot();
  const id = `session-${Date.now().toString(36)}`;
  const session: SisoOpenTuiSession = {
    id,
    title,
    createdAt: now(),
    updatedAt: now(),
    messages: [
      { role: "assistant", text: "New SISO OpenTUI session. Real model streaming is the next integration step.", at: now() },
    ],
  };
  saveSession(session);
  return session;
}

export function loadSession(id: string) {
  ensureRoot();
  if (!existsSync(pathFor(id))) return undefined;
  return JSON.parse(readFileSync(pathFor(id), "utf8")) as SisoOpenTuiSession;
}

export function saveSession(session: SisoOpenTuiSession) {
  ensureRoot();
  writeFileSync(pathFor(session.id), JSON.stringify(session, null, 2));
}

export function appendMessage(session: SisoOpenTuiSession, role: "user" | "assistant", text: string) {
  session.messages.push({ role, text, at: now() });
  if (role === "user" && (session.title === "New session" || session.title.startsWith("Session "))) session.title = safeTitle(text);
  session.updatedAt = now();
  saveSession(session);
}
