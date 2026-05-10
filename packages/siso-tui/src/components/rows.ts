import type { SisoUiEvent, SisoUiSession, SisoUiToolItem, SisoUiToolPhase } from "../contract/events";

export type SisoRowTheme = {
  accent?: string;
  muted?: string;
  success?: string;
  warning?: string;
  error?: string;
};

export function fit(value: unknown, width: number) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trimEnd();
  if (raw.length <= width) return raw + " ".repeat(Math.max(0, width - raw.length));
  return raw.slice(0, Math.max(0, width - 1)) + "…";
}

export function wrapText(text: string, width: number) {
  const rows: string[] = [];
  let current = "";
  for (const word of String(text ?? "").split(/\s+/).filter(Boolean)) {
    const next = `${current} ${word}`.trim();
    if (next.length > width && current) {
      rows.push(fit(current, width));
      current = word;
    } else {
      current = next;
    }
  }
  if (current) rows.push(fit(current, width));
  return rows.length ? rows : [fit("", width)];
}

export function line(width: number, char = "─") {
  return char.repeat(Math.max(0, width));
}

export function formatTokens(tokens?: number) {
  if (!tokens || !Number.isFinite(tokens)) return "";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}m tok`;
  if (tokens >= 1000) return `${Math.round(tokens / 100) / 10}k tok`;
  return `${tokens} tok`;
}

export function renderStartupRows(width: number, model = "Spark") {
  return [
    fit("SISO", width),
    fit(`loading workspace · ${model} · extensions`, width),
  ];
}

export function renderStatusLine(event: Extract<SisoUiEvent, { type: "status" }> | undefined, width: number) {
  const model = event?.model ?? "Spark";
  const context = event?.contextPercent === undefined ? "" : `ctx ${Math.round(event.contextPercent)}%`;
  const tokens = event?.contextTokens ? formatTokens(event.contextTokens) : "";
  const agents = event?.activeAgents ? `${event.activeAgents} agents` : "";
  return fit([model, context, tokens, agents].filter(Boolean).join(" · "), width);
}

export function renderToolGroupRows(event: Extract<SisoUiEvent, { type: "tool_group" }>, width: number) {
  const header = `▾ ${phasePast(event.phase, event.status)} · ${event.summary}`;
  const childRows = event.items.slice(0, 4).map((item) => renderToolItem(item, width));
  return [fit(header, width), ...childRows];
}

export function renderAgentRows(event: Extract<SisoUiEvent, { type: "agent" }>, width: number) {
  const icon = event.status === "complete" ? "✓" : event.status === "failed" ? "!" : "●";
  const metrics = [
    event.checks === undefined ? "" : `${event.checks} check${event.checks === 1 ? "" : "s"}`,
    formatTokens(event.tokens),
    event.duration,
  ].filter(Boolean).join(" · ");
  const title = `${icon} Agent ${event.status} · ${event.role}${event.task ? ` · ${shortTask(event.task)}` : ""}${metrics ? ` · ${metrics}` : ""}`;
  const rows = [fit(title, width)];
  if (event.summary) rows.push(...wrapText(`  │ ${event.summary}`, width).slice(0, 2));
  return rows;
}

export function renderMessageRows(event: Extract<SisoUiEvent, { type: "message" }>, width: number) {
  const label = event.role === "user" ? "You" : event.role === "assistant" ? "SISO" : "System";
  if (!event.text.trim()) return [fit(label, width), fit("  ...", width)];
  return [fit(label, width), ...wrapText(`  ${event.text}`, width)];
}

export function renderNoticeRows(event: Extract<SisoUiEvent, { type: "notice" }>, width: number) {
  const icon = event.tone === "success" ? "✓" : event.tone === "error" ? "!" : event.tone === "warning" ? "!" : "•";
  const rows = [fit(`${icon} ${event.title}`, width)];
  if (event.text) rows.push(...wrapText(`  ${event.text}`, width).slice(0, 2));
  return rows;
}

export function renderEventRows(event: SisoUiEvent, width: number) {
  if (event.type === "message") return renderMessageRows(event, width);
  if (event.type === "tool_group") return renderToolGroupRows(event, width);
  if (event.type === "agent") return renderAgentRows(event, width);
  if (event.type === "notice") return renderNoticeRows(event, width);
  return [];
}

export function renderTranscriptRows(events: SisoUiEvent[], width: number, maxRows: number) {
  const rows: string[] = [];
  for (const event of events) {
    if (event.type === "status") continue;
    rows.push(...renderEventRows(event, width), "");
  }
  const clipped = rows.slice(Math.max(0, rows.length - maxRows));
  while (clipped.length < maxRows) clipped.unshift(fit("", width));
  return clipped.slice(-maxRows);
}

export function renderSessionListRows(sessions: SisoUiSession[], selected: number, width: number, maxRows: number) {
  const rows = [fit("Sessions", width), line(width)];
  rows.push(fit(`${selected === 0 ? "›" : " "} New session`, width));
  sessions.slice(0, Math.max(0, maxRows - 3)).forEach((session, index) => {
    const marker = selected === index + 1 ? "›" : " ";
    rows.push(fit(`${marker} ${session.title} · ${session.model ?? "model"} · ${session.events.length} events`, width));
  });
  return rows.slice(0, maxRows);
}

function renderToolItem(item: SisoUiToolItem, width: number) {
  const icon = item.status === "error" ? "!" : "└";
  return fit(`  ${icon} ${item.label}${item.detail ? ` · ${item.detail}` : ""}`, width);
}

function phasePast(phase: SisoUiToolPhase, status: string) {
  const running: Record<SisoUiToolPhase, string> = {
    Explore: "Exploring",
    Modify: "Modifying",
    Verify: "Verifying",
    Delegate: "Delegating",
    Tools: "Using tools",
  };
  const done: Record<SisoUiToolPhase, string> = {
    Explore: "Explored",
    Modify: "Modified",
    Verify: "Verified",
    Delegate: "Delegated",
    Tools: "Used tools",
  };
  return status === "running" ? running[phase] : done[phase];
}

function shortTask(task: string) {
  const words = String(task ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.slice(0, 5).join(" ");
}
