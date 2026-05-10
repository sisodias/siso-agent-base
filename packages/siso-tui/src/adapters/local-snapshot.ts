import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { SisoUiEvent, SisoUiSession } from "../contract/events";

export type LocalSnapshotOptions = {
  childRunDir?: string;
  cwd?: string;
  model?: string;
};

export function loadLocalSisoSnapshot(options: LocalSnapshotOptions = {}) {
  const childRunDir = options.childRunDir ?? process.env.SISO_CHILD_RUN_DIR ?? join(homedir(), ".siso", "agent", "child-runs");
  const children = readChildRuns(childRunDir);
  const active = children.filter((event) => event.type === "agent" && event.status === "running").length;
  const latestStatus: SisoUiEvent = {
    type: "status",
    model: options.model ?? process.env.SISO_MODEL,
    activeAgents: active,
    at: new Date().toISOString(),
  };
  return {
    status: latestStatus,
    children,
    cwd: basename(options.cwd ?? process.cwd()),
    childRunDir,
  };
}

export function createLocalSession(title = "SISO terminal session"): SisoUiSession {
  const snapshot = loadLocalSisoSnapshot();
  const events: SisoUiEvent[] = [
    snapshot.status,
  ];
  return {
    id: `local-${Date.now().toString(36)}`,
    title,
    model: process.env.SISO_MODEL,
    updatedAt: new Date().toISOString(),
    events,
  };
}

function readChildRuns(dir: string): SisoUiEvent[] {
  if (!existsSync(dir)) return [];
  const records = [];
  for (const file of readdirSync(dir).filter((item) => item.endsWith(".json") && !item.endsWith(".exit.json")).slice(-250)) {
    const path = join(dir, file);
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      const st = statSync(path);
      const terminal = ["completed", "failed", "timeout", "aborted", "stopped"].includes(data.status);
      const failed = ["failed", "timeout", "aborted", "stopped"].includes(data.status);
      records.push({
        type: "agent",
        status: failed ? "failed" : terminal ? "complete" : "running",
        role: compactRole(data.profile ?? data.lane ?? "agent"),
        task: data.task ?? data.title ?? data.description,
        checks: data.toolCalls ?? data.tool_calls,
        tokens: data.tokens?.totalTokens ?? data.usage?.total_tokens,
        duration: duration(data.durationMs),
        summary: data.compactResult?.summary,
        at: data.updatedAt ?? data.completedAt ?? data.startedAt ?? st.mtime.toISOString(),
      } satisfies SisoUiEvent);
    } catch {
      // Ignore malformed run records. They remain inspectable on disk.
    }
  }
  return records.sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? ""))).slice(0, 12);
}

function compactRole(role: string) {
  return String(role).split(".").filter(Boolean).at(-1) ?? "agent";
}

function duration(ms: unknown) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return undefined;
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
