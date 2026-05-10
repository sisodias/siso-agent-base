import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

export type SisoChild = {
  id: string;
  status: string;
  profile: string;
  task: string;
  tokens?: number;
  tools?: number;
  updatedAt: string;
};

export function loadSisoStatus() {
  const childDir = join(homedir(), ".siso", "agent", "child-runs");
  const children: SisoChild[] = [];
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
  return {
    children: children.slice(0, 10),
    active: children.filter((c) => ["running", "planned", "queued"].includes(c.status)).length,
    done: children.filter((c) => c.status === "completed").length,
    failed: children.filter((c) => ["failed", "timeout", "aborted", "stopped"].includes(c.status)).length,
    cwd: basename(process.cwd()),
    model: process.env.SISO_MODEL || "Spark",
    bifrost: "ok",
    loadedAt: new Date(),
  };
}
