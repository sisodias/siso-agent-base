import { visibleWidth } from "../../node_modules/@mariozechner/pi-tui/dist/utils.js";
import { fit, joinVisible, padRight, paint, sanitizeChildLabel } from "./theme.mjs";

const toneColor = {
  ok: "green",
  running: "cyan",
  warn: "yellow",
  error: "red",
  info: "blue",
  muted: "gray",
  selected: "magenta",
};

const toneIcon = {
  ok: "✓",
  running: "◐",
  warn: "!",
  error: "✕",
  info: "•",
  muted: "·",
  selected: "◆",
};

export function StatusPill({ label, value, tone = "info" }, width = 24) {
  const text = value ? `${label} ${value}` : label;
  return fit(paint(` ${text} `, toneColor[tone] ?? "blue"), width);
}

export function KeyHint(key, label) {
  return joinVisible([paint(key, "gray"), label]);
}

export function Divider(width, label = "") {
  if (!label) return "─".repeat(Math.max(0, width));
  const title = ` ${label} `;
  const left = Math.max(1, Math.floor((width - visibleWidth(title)) / 2));
  const right = Math.max(0, width - left - visibleWidth(title));
  return `${"─".repeat(left)}${title}${"─".repeat(right)}`;
}

export function Spinner({ frame = 0, tone = "running" } = {}) {
  const frames = ["◐", "◓", "◑", "◒"];
  return paint(frames[Math.abs(frame) % frames.length], toneColor[tone] ?? "cyan");
}

export function ProgressBar({ percent = 0, width = 12, tone = "ok" }) {
  const clamped = Math.max(0, Math.min(1, percent));
  const filled = Math.round(width * clamped);
  return `${paint("█".repeat(filled), toneColor[tone] ?? "green")}${paint("░".repeat(Math.max(0, width - filled)), "gray")}`;
}

export function StatusLine({ left = [], center = [], right = [] }, width = 80) {
  const leftText = joinVisible(left);
  const centerText = joinVisible(center);
  const rightText = joinVisible(right);
  const reserved = visibleWidth(leftText) + visibleWidth(centerText) + visibleWidth(rightText);
  const gap = Math.max(1, Math.floor((width - reserved) / 2));
  return fit([leftText, centerText, rightText].filter(Boolean).join(" ".repeat(gap)), width);
}

export function Notice({ title, body, tone = "info" }, width = 80) {
  return Card({ title: `${toneIcon[tone] ?? "•"} ${title}`, tone, body: [body] }, width).render();
}

export function Breadcrumb(items = [], width = 80) {
  return fit(items.map((item, index) => index === items.length - 1 ? paint(item, "cyan") : paint(item, "gray")).join(paint(" › ", "gray")), width);
}

export function truncatePath(path, width = 40) {
  const value = String(path ?? "");
  if (visibleWidth(value) <= width) return value;
  const parts = value.split("/").filter(Boolean);
  if (parts.length <= 2) return fit(value, width);
  return fit(`…/${parts.slice(-2).join("/")}`, width);
}

export function TruncatedPath({ path, width = 40 }) {
  return truncatePath(path, width);
}

export function ToolSubject({ name, path, detail }, width = 64) {
  const subject = joinVisible([
    paint(name, "cyan"),
    path ? paint(truncatePath(path, Math.max(12, Math.floor(width * 0.45))), "gray") : undefined,
    detail ? paint(detail, "gray") : undefined,
  ]);
  return fit(subject, width);
}

export function ContextMeter({ used = 0.32, label = "context" }, width = 28) {
  const barWidth = Math.max(6, Math.min(12, width - visibleWidth(label) - 6));
  const bar = ProgressBar({ percent: used, width: barWidth, tone: used > 0.85 ? "warn" : "ok" });
  return fit(`${label} ${bar} ${Math.round(used * 100)}%`, width);
}

export function ProgressLine({ label, detail, tone = "running", elapsed, right }, width = 80) {
  const icon = tone === "running" ? Spinner({ tone }) : paint(toneIcon[tone] ?? "•", toneColor[tone] ?? "blue");
  const left = joinVisible([icon, label, detail ? paint(detail, "gray") : undefined]);
  const suffix = joinVisible([elapsed, right], " · ");
  const gap = Math.max(1, width - visibleWidth(left) - visibleWidth(suffix));
  return fit(`${left}${" ".repeat(gap)}${paint(suffix, "gray")}`, width);
}

export function ChildAgentRow({ name, model, status = "running", task, elapsed, tools, budget }, width = 80) {
  const tone = status === "completed" ? "ok" : status === "queued" ? "warn" : status === "failed" ? "error" : "running";
  const label = sanitizeChildLabel(name);
  const right = joinVisible([
    elapsed,
    tools !== undefined ? `${tools} tools` : undefined,
    budget,
  ], " · ");
  return ProgressLine({ label, detail: joinVisible([model, task], " "), tone, elapsed: right }, width);
}

export function WorkflowStepRow({ step, owner, status = "running", detail }, width = 80) {
  const tone = status === "done" ? "ok" : status === "blocked" ? "warn" : status === "failed" ? "error" : "running";
  return ProgressLine({ label: step, detail: joinVisible([owner, detail], " "), tone }, width);
}

export function CouncilMemberRow({ member, stance, status = "running", confidence }, width = 80) {
  return ProgressLine({
    label: member,
    detail: stance,
    tone: status === "done" ? "ok" : "running",
    right: confidence ? `${confidence}% confidence` : undefined,
  }, width);
}

export function ToolCard({ title, command, subject, output = [], status = "running", elapsed }, width = 80) {
  const tone = status === "failed" ? "error" : status === "done" ? "ok" : "running";
  const body = [
    command ? `${paint("cmd", "gray")} ${command}` : undefined,
    subject,
    ...output,
  ].filter(Boolean);
  return Card({ title: `${title}${elapsed ? ` ${paint(elapsed, "gray")}` : ""}`, tone, body }, width).render();
}

export function PermissionCard({ action, target, risk = "medium", reason, actions = ["Allow once", "Deny"] }, width = 80) {
  const tone = risk === "high" ? "error" : risk === "medium" ? "warn" : "info";
  return Card({
    title: `Permission · ${action}`,
    tone,
    body: [
      `${paint("target", "gray")} ${target}`,
      reason ? `${paint("reason", "gray")} ${reason}` : undefined,
      `${paint("actions", "gray")} ${actions.join(" / ")}`,
    ].filter(Boolean),
  }, width).render();
}

export function MessageGroup({ title, tone = "info", messages = [] }, width = 80) {
  return Card({ title, tone, body: messages }, width).render();
}

export function PromptComposer({ placeholder = "Message SISO…", mode = "normal", queued = 0, attachments = [] }, width = 80) {
  const chips = attachments.length ? `${paint("context", "gray")} ${attachments.map((a) => `[${a}]`).join(" ")}` : undefined;
  const body = [chips, paint(placeholder, "gray"), queued ? paint(`${queued} queued prompt${queued === 1 ? "" : "s"}`, "yellow") : undefined].filter(Boolean);
  const footer = joinVisible([KeyHint("Enter", "send"), KeyHint("Shift+Enter", "newline"), KeyHint("/", "commands"), paint(mode, "cyan")], "  ");
  return [...Card({ title: "Prompt", tone: "selected", body }, width).render(), fit(footer, width)];
}

export function OverlayMenu({ title, items = [], selected = 0 }, width = 80) {
  const body = items.map((item, index) => `${index === selected ? paint("›", "cyan") : " "} ${item.label}${item.detail ? ` ${paint(item.detail, "gray")}` : ""}`);
  return Card({ title, tone: "info", body }, width).render();
}


export function AttachmentChip({ type = "file", label }, width = 24) {
  const icon = type === "image" ? "▧" : type === "ide" ? "⌘" : type === "repo" ? "⌂" : "◇";
  return fit(paint(` ${icon} ${label} `, "gray"), width);
}

export function ContextChip(props, width = 28) {
  return AttachmentChip({ type: props.type ?? "repo", label: props.label }, width);
}

export function TokenBudgetMeter({ used = 0.42, label = "tokens", remaining }, width = 36) {
  const tone = used > 0.9 ? "error" : used > 0.75 ? "warn" : "ok";
  const barWidth = Math.max(6, Math.min(14, width - visibleWidth(label) - 12));
  const suffix = remaining ? `${remaining} left` : `${Math.round(used * 100)}%`;
  return fit(`${label} ${ProgressBar({ percent: used, width: barWidth, tone })} ${suffix}`, width);
}

export function FleetBudgetMeter({ running = 0, queued = 0, maxParallel = 5, tokensUsed = "61k", tokensLeft = "189k" }, width = 80) {
  return Card({ title: "Fleet budget", tone: queued > 0 ? "warn" : "info", body: [
    `parallel ${running}/${maxParallel} · queued ${queued}`,
    `tokens used ${tokensUsed} · remaining ${tokensLeft}`,
  ] }, width).render();
}

export function ToolOutputPreview({ lines = [], collapsed = 0 }, width = 80) {
  const body = lines.slice(0, 4).map((line) => paint("│ ", "gray") + fit(line, Math.max(8, width - 6)));
  if (collapsed > 0) body.push(paint(`… ${collapsed} output lines collapsed`, "gray"));
  return body.map((line) => fit(line, width));
}

export function ToolErrorPreview({ message, hint }, width = 80) {
  return Notice({ title: "Tool error", tone: "error", body: joinVisible([message, hint ? paint(`hint: ${hint}`, "gray") : undefined], " · ") }, width);
}

export function PermissionRulePreview({ rule, scope = "project", effect = "allow" }, width = 80) {
  const tone = effect === "deny" ? "error" : effect === "ask" ? "warn" : "ok";
  return fit(`${paint(effect.toUpperCase(), toneColor[tone])} ${paint(scope, "gray")} ${rule}`, width);
}

export function PermissionDialog({ title = "Permission request", request, rules = [], actions = ["Allow once", "Deny"] }, width = 80) {
  const body = [
    request,
    ...rules.map((rule) => PermissionRulePreview(rule, width - 4)),
    `${paint("actions", "gray")} ${actions.join(" / ")}`,
  ].filter(Boolean);
  return Card({ title, tone: "warn", body }, width).render();
}

export function DiffCard({ file, added = [], removed = [], context = [] }, width = 80) {
  const rows = [
    `${paint("file", "gray")} ${truncatePath(file, Math.max(12, width - 12))}`,
    ...context.slice(0, 2).map((line) => `  ${line}`),
    ...removed.slice(0, 3).map((line) => paint(`- ${line}`, "red")),
    ...added.slice(0, 3).map((line) => paint(`+ ${line}`, "green")),
  ];
  return Card({ title: `Diff +${added.length} -${removed.length}`, tone: "info", body: rows }, width).render();
}

export function StructuredDiffCard({ files = [] }, width = 80) {
  const body = files.map((file) => `${paint(file.status ?? "edit", file.status === "delete" ? "red" : file.status === "create" ? "green" : "cyan")} ${truncatePath(file.path, Math.max(12, width - 26))} ${paint(`+${file.added ?? 0} -${file.removed ?? 0}`, "gray")}`);
  return Card({ title: "Structured diff", tone: "info", body }, width).render();
}

export function MarkdownBlock({ lines = [] }, width = 80) {
  return lines.map((line) => {
    if (line.startsWith("#")) return fit(paint(line, "bold"), width);
    if (line.startsWith("```")) return fit(paint(line, "gray"), width);
    if (line.startsWith("- ")) return fit(`${paint("•", "cyan")} ${line.slice(2)}`, width);
    return fit(line, width);
  });
}


export function Table({ columns = [], rows = [] }, width = 80) {
  const safeWidth = Math.max(20, width);
  const colCount = Math.max(1, columns.length);
  const explicit = columns.map((col) => col.width ?? 0);
  const remaining = Math.max(1, safeWidth - 4 - explicit.reduce((sum, item) => sum + item, 0) - (colCount - 1) * 2);
  const flexCount = columns.filter((col) => !col.width).length || 1;
  const widths = columns.map((col) => col.width ?? Math.max(6, Math.floor(remaining / flexCount)));
  const header = columns.map((col, index) => fit(paint(col.label, "gray"), widths[index])).join("  ");
  const line = widths.map((w) => "─".repeat(w)).join("──");
  return [header, line, ...rows.map((row) => columns.map((col, index) => fit(row[col.key] ?? "", widths[index])).join("  "))].map((line) => fit(line, safeWidth));
}

export function ListRow({ label, detail, selected = false, tone = "info", right }, width = 80) {
  const pointer = selected ? paint("›", "cyan") : " ";
  const left = joinVisible([pointer, selected ? paint(label, "cyan") : label, detail ? paint(detail, "gray") : undefined]);
  const gap = Math.max(1, width - visibleWidth(left) - visibleWidth(right ?? ""));
  return fit(`${left}${" ".repeat(gap)}${right ? paint(right, toneColor[tone] ?? "gray") : ""}`, width);
}

export function SelectList({ title = "Select", items = [], selected = 0 }, width = 80) {
  return Card({
    title,
    tone: "info",
    body: items.map((item, index) => ListRow({ ...item, selected: index === selected }, width - 4)),
  }, width).render();
}

export function ShortcutTable({ shortcuts = [] }, width = 80) {
  return Table({
    columns: [{ key: "key", label: "Key", width: 14 }, { key: "action", label: "Action" }],
    rows: shortcuts.map((item) => ({ key: paint(item.key, "gray"), action: item.action })),
  }, width);
}

export function DiffAddedLine(line, width = 80) {
  return fit(paint(`+ ${line}`, "green"), width);
}

export function DiffRemovedLine(line, width = 80) {
  return fit(paint(`- ${line}`, "red"), width);
}

export function DiffContextLine(line, width = 80) {
  return fit(paint(`  ${line}`, "gray"), width);
}

export function DiffHunk({ header = "@@", context = [], removed = [], added = [] }, width = 80) {
  return [
    fit(paint(header, "magenta"), width),
    ...context.map((line) => DiffContextLine(line, width)),
    ...removed.map((line) => DiffRemovedLine(line, width)),
    ...added.map((line) => DiffAddedLine(line, width)),
  ];
}

export function BashPermissionRequest(props, width = 80) {
  return PermissionDialog({
    title: "Bash permission",
    request: `Run ${props.command}`,
    rules: props.rules ?? [{ effect: "ask", scope: "project", rule: "bash:*" }],
    actions: props.actions ?? ["Allow once", "Always allow", "Deny"],
  }, width);
}

export function FilePermissionRequest(props, width = 80) {
  return PermissionDialog({
    title: `${props.operation ?? "File"} permission`,
    request: `${props.operation ?? "Edit"} ${truncatePath(props.path, Math.max(12, width - 24))}`,
    rules: props.rules ?? [{ effect: "ask", scope: "workspace", rule: "files:write" }],
    actions: props.actions ?? ["Review diff", "Allow", "Deny"],
  }, width);
}

export function WebFetchPermissionRequest(props, width = 80) {
  return PermissionDialog({
    title: "Web fetch permission",
    request: `Fetch ${props.url}`,
    rules: props.rules ?? [{ effect: "ask", scope: "session", rule: "webfetch:domain" }],
    actions: props.actions ?? ["Allow once", "Deny"],
  }, width);
}

export function SkillPermissionRequest(props, width = 80) {
  return PermissionDialog({
    title: "Skill permission",
    request: `Load skill ${props.skill}`,
    rules: props.rules ?? [{ effect: "allow", scope: "profile", rule: "skills:read" }],
    actions: props.actions ?? ["Load", "Cancel"],
  }, width);
}

export function ChildAgentSpawnPermissionRequest(props, width = 80) {
  return PermissionDialog({
    title: "Child agent permission",
    request: `Spawn ${props.profile ?? "worker"} · ${props.task ?? "background task"}`,
    rules: props.rules ?? [{ effect: "ask", scope: "fleet", rule: `maxParallel:${props.maxParallel ?? 5}` }],
    actions: props.actions ?? ["Spawn", "Queue", "Cancel"],
  }, width);
}

export function TranscriptViewport({ messages = [] }, width = 80) {
  const lines = [];
  for (const message of messages) {
    lines.push(...MessageRouter(message, width));
  }
  return lines;
}

export function MessageRouter(message, width = 80) {
  if (message.type === "user") return MessageGroup({ title: "User", tone: "selected", messages: message.lines ?? [message.text] }, width);
  if (message.type === "assistant") return MessageGroup({ title: "Assistant", tone: "info", messages: message.lines ?? [message.text] }, width);
  if (message.type === "tool") return ToolCard({ title: message.title ?? "Tool", command: message.command, subject: message.subject, output: message.output ?? [], status: message.status ?? "done" }, width);
  if (message.type === "notice") return Notice({ title: message.title ?? "Notice", body: message.text, tone: message.tone ?? "info" }, width);
  return MessageGroup({ title: "Message", tone: "muted", messages: [message.text ?? ""] }, width);
}

export function CodeBlock({ language = "text", code = "" }, width = 80) {
  const lines = String(code).split(/\r?\n/);
  return Card({ title: `Code · ${language}`, tone: "muted", body: lines.map((line, index) => `${paint(String(index + 1).padStart(2), "gray")} ${line}`) }, width).render();
}

export function AgentDetail({ name, model, status, task, usage = {} }, width = 80) {
  return Card({ title: `Agent · ${sanitizeChildLabel(name)}`, tone: status === "failed" ? "error" : status === "queued" ? "warn" : "running", body: [
    `model ${model ?? "unknown"} · status ${status ?? "running"}`,
    task,
    `tokens ${usage.tokens ?? "n/a"} · tools ${usage.tools ?? 0} · runtime ${usage.runtime ?? "n/a"}`,
  ].filter(Boolean) }, width).render();
}

export function AgentTimeline({ events = [] }, width = 80) {
  return Card({ title: "Agent timeline", tone: "info", body: events.map((event) => ProgressLine({ label: event.label, detail: event.detail, tone: event.tone ?? "info", elapsed: event.time }, width - 4)) }, width).render();
}

export function McpServerDetail({ name, status, tools = [], auth }, width = 80) {
  return Card({ title: `MCP · ${name}`, tone: status === "ready" ? "ok" : status === "auth" ? "warn" : "muted", body: [
    `status ${status} · auth ${auth ?? "n/a"}`,
    ...tools.slice(0, 5).map((tool) => `tool ${tool}`),
  ] }, width).render();
}

export function HelpPanel({ shortcuts = [], commands = [] }, width = 80) {
  return [
    ...Card({ title: "Help", tone: "info", body: commands.map((cmd) => `${cmd.name} ${paint(cmd.description, "gray")}`) }, width).render(),
    ...ShortcutTable({ shortcuts }, width),
  ];
}

export function WizardStep({ title, step, total, body = [], actions = [] }, width = 80) {
  return Card({ title: `${title} · step ${step}/${total}`, tone: "selected", body: [...body, actions.length ? `${paint("actions", "gray")} ${actions.join(" / ")}` : undefined].filter(Boolean) }, width).render();
}

export function SandboxConfigPanel({ mode = "workspace-write", network = "ask", dependencies = [] }, width = 80) {
  return Card({ title: "Sandbox config", tone: "info", body: [
    `mode ${mode}`,
    `network ${network}`,
    `dependencies ${dependencies.length ? dependencies.join(", ") : "none"}`,
  ] }, width).render();
}



export function ScrollBar({ position = 0, visible = 10, total = 100 }, height = 8) {
  const safeHeight = Math.max(1, height);
  const ratio = Math.max(0.05, Math.min(1, visible / Math.max(visible, total)));
  const thumb = Math.max(1, Math.round(safeHeight * ratio));
  const start = Math.round((safeHeight - thumb) * Math.max(0, Math.min(1, position)));
  return Array.from({ length: safeHeight }, (_, index) => index >= start && index < start + thumb ? paint("█", "cyan") : paint("│", "gray"));
}

export function NewMessagesPill({ count = 1 }, width = 80) {
  return fit(paint(` ${count} new assistant turn${count === 1 ? "" : "s"} ↓ `, "cyan"), width);
}

export function UnseenDivider({ count = 1 }, width = 80) {
  return Divider(width, `${count} unseen assistant turn${count === 1 ? "" : "s"}`);
}

export function VirtualizedViewport({ rows = [], offset = 0, height = 10, title = "Viewport" }, width = 80) {
  const safeHeight = Math.max(3, height);
  const bodyHeight = safeHeight - 2;
  const visibleRows = rows.slice(offset, offset + bodyHeight);
  const scroll = ScrollBar({ position: offset / Math.max(1, rows.length - bodyHeight), visible: bodyHeight, total: rows.length }, bodyHeight);
  const body = visibleRows.map((row, index) => `${fit(row, Math.max(8, width - 7))} ${scroll[index] ?? ""}`);
  return Card({ title, tone: "info", body }, width).render();
}

export function PromptFooter({ mode = "normal", left = [], right = [] }, width = 80) {
  return StatusLine({
    left: [KeyHint("Enter", "send"), KeyHint("Shift+Enter", "newline"), ...left],
    center: [paint(mode, "cyan")],
    right,
  }, width);
}

export function PromptHistorySearch({ query = "", results = [] }, width = 80) {
  return Card({ title: `History search · ${query}`, tone: "info", body: results.map((result, index) => ListRow({ label: result, selected: index === 0 }, width - 4)) }, width).render();
}

export function PromptModeIndicator({ mode = "normal", detail }, width = 24) {
  const tone = mode === "plan" ? "magenta" : mode === "command" ? "cyan" : mode === "permission" ? "yellow" : "green";
  return fit(paint(` ${mode}${detail ? ` · ${detail}` : ""} `, tone), width);
}

export function AgentList({ agents = [], selected = 0 }, width = 80) {
  return Card({ title: "Agents", tone: "info", body: agents.map((agent, index) => ListRow({ label: agent.name, detail: `${agent.model ?? "model"} · ${agent.status ?? "idle"}`, right: agent.tools ? `${agent.tools} tools` : undefined, selected: index === selected }, width - 4)) }, width).render();
}

export function AgentEditor({ name = "worker", prompt = "", tools = [], permissions = [] }, width = 80) {
  return Card({ title: `Agent editor · ${name}`, tone: "selected", body: [
    `${paint("prompt", "gray")} ${fit(prompt, Math.max(10, width - 14))}`,
    `${paint("tools", "gray")} ${tools.join(", ") || "none"}`,
    `${paint("permissions", "gray")} ${permissions.join(", ") || "ask"}`,
  ] }, width).render();
}

export function AgentCreateWizard({ step = 1, total = 3, name = "new-agent" }, width = 80) {
  return WizardStep({ title: `Create agent · ${name}`, step, total, body: ["Choose role prompt", "Pick tool permissions", "Set budget and model lane"], actions: ["Back", "Create", "Cancel"] }, width);
}

export function McpAuthPanel({ server = "github", status = "auth required", scopes = [] }, width = 80) {
  return Card({ title: `MCP auth · ${server}`, tone: status.includes("required") ? "warn" : "ok", body: [
    `status ${status}`,
    `scopes ${scopes.join(", ") || "none"}`,
    `${paint("actions", "gray")} Connect / Disable / Docs`,
  ] }, width).render();
}

export function McpToolList({ server = "mcp", tools = [] }, width = 80) {
  return Card({ title: `MCP tools · ${server}`, tone: "info", body: tools.map((tool) => ListRow({ label: tool.name, detail: tool.description, right: tool.permission ?? "ask" }, width - 4)) }, width).render();
}

export function PermissionRuleEditor({ rules = [] }, width = 80) {
  return Card({ title: "Permission rules", tone: "warn", body: rules.map((rule, index) => ListRow({ label: `${index + 1}. ${rule.effect}`, detail: `${rule.scope} ${rule.rule}`, selected: index === 0 }, width - 4)) }, width).render();
}

export function SettingsPanel({ title = "Settings", rows = [] }, width = 80) {
  return Card({ title, tone: "info", body: rows.map((row) => ListRow({ label: row.label, detail: row.value, right: row.status }, width - 4)) }, width).render();
}

export function SettingsCategoryList({ categories = [], selected = 0 }, width = 80) {
  return SelectList({ title: "Settings categories", selected, items: categories.map((category) => ({ label: category.label, detail: category.detail })) }, width);
}

export function DiffNavigator({ files = [], selected = 0 }, width = 80) {
  return Card({ title: "Diff navigator", tone: "info", body: files.map((file, index) => ListRow({ label: truncatePath(file.path, Math.max(12, width - 30)), detail: file.status, right: `+${file.added ?? 0} -${file.removed ?? 0}`, selected: index === selected }, width - 4)) }, width).render();
}

export function OnboardingChecklist({ items = [] }, width = 80) {
  return Card({ title: "Onboarding", tone: "selected", body: items.map((item) => ProgressLine({ label: item.label, detail: item.detail, tone: item.done ? "ok" : "running" }, width - 4)) }, width).render();
}



export function ModelSelectorPanel({ models = [], selected = 0 }, width = 80) {
  return SelectList({ title: "Model selector", selected, items: models.map((model) => ({ label: model.name, detail: `${model.provider ?? "provider"} · ${model.context ?? "ctx"}`, right: model.status })) }, width);
}

export function ProviderStatusPanel({ providers = [] }, width = 80) {
  return Card({ title: "Providers", tone: "info", body: providers.map((provider) => ProgressLine({ label: provider.name, detail: provider.detail, tone: provider.ok ? "ok" : "warn", right: provider.model }, width - 4)) }, width).render();
}

export function SearchPanel({ query = "", results = [] }, width = 80) {
  return Card({ title: `Search · ${query}`, tone: "info", body: results.map((result, index) => ListRow({ label: truncatePath(result.path, Math.max(12, width - 34)), detail: result.match, right: result.line ? `:${result.line}` : undefined, selected: index === 0 }, width - 4)) }, width).render();
}

export function NotificationCenter({ notifications = [] }, width = 80) {
  return Card({ title: "Notifications", tone: "info", body: notifications.map((item) => ProgressLine({ label: item.title, detail: item.detail, tone: item.tone ?? "info", elapsed: item.time }, width - 4)) }, width).render();
}

export function MemoryPanel({ entries = [] }, width = 80) {
  return Card({ title: "Memory", tone: "info", body: entries.map((entry) => ListRow({ label: entry.title, detail: entry.scope, right: entry.age }, width - 4)) }, width).render();
}

export function SkillPanel({ skills = [] }, width = 80) {
  return Card({ title: "Skills", tone: "info", body: skills.map((skill) => ListRow({ label: skill.name, detail: skill.description, right: skill.source }, width - 4)) }, width).render();
}

export function TaskPanel({ tasks = [] }, width = 80) {
  return Card({ title: "Tasks", tone: "info", body: tasks.map((task) => ProgressLine({ label: task.title, detail: task.owner, tone: task.status === "done" ? "ok" : task.status === "blocked" ? "warn" : "running", right: task.budget }, width - 4)) }, width).render();
}

export function BifrostDashboard({ route = "local", duplicateCount = 0, calls = 0, latency = "n/a" }, width = 80) {
  return Card({ title: "Bifrost dashboard", tone: duplicateCount ? "warn" : "ok", body: [
    `route ${route} · calls ${calls} · latency ${latency}`,
    `duplicate prompts ${duplicateCount}`,
    `schema health ${duplicateCount ? "review" : "ok"}`,
  ] }, width).render();
}

export function CompactStatusDashboard({ context = 0.32, calls = 6, agents = 2, model = "Spark" }, width = 80) {
  return Card({ title: "Compact status", tone: "info", body: [
    StatusLine({ left: [ContextMeter({ used: context }, 24)], center: [`calls ${calls}`, `agents ${agents}`], right: [model] }, width - 4),
    "Timeline rows hidden by default · use expanded status on demand",
  ] }, width).render();
}

export function RateLimitNotice({ reset = "soon", provider = "provider" }, width = 80) {
  return Notice({ title: "Rate limit", tone: "warn", body: `${provider} limited · resets ${reset} · fallback route available` }, width);
}

export function ResumeConversationPanel({ sessions = [] }, width = 80) {
  return SelectList({ title: "Resume conversation", selected: 0, items: sessions.map((session) => ({ label: session.title, detail: session.cwd, right: session.age })) }, width);
}



export function PromptInputFooterLeft({ mode = "normal", branch = "main", cwd = "repo" }, width = 40) {
  return fit(joinVisible([PromptModeIndicator({ mode }, 14), paint(branch, "gray"), truncatePath(cwd, Math.max(8, width - 24))]), width);
}

export function PromptInputFooterRight({ model = "Spark", context = 0.32, agents = 0 }, width = 40) {
  return fit(joinVisible([model, ContextMeter({ used: context }, 18), agents ? `${agents} agents` : undefined], " · "), width);
}

export function PromptInputSuggestions({ suggestions = [] }, width = 80) {
  return OverlayMenu({ title: "Prompt suggestions", items: suggestions.map((item) => ({ label: item.label, detail: item.detail })), selected: 0 }, width);
}

export function PromptQueuedCommands({ commands = [] }, width = 80) {
  return Card({ title: "Queued prompts", tone: "warn", body: commands.map((cmd, index) => `${index + 1}. ${cmd}`) }, width).render();
}

export function PromptStashNotice({ count = 1 }, width = 80) {
  return Notice({ title: "Prompt stash", tone: "info", body: `${count} draft prompt${count === 1 ? "" : "s"} saved for later` }, width);
}

export function PromptNotifications({ items = [] }, width = 80) {
  return Card({ title: "Prompt notifications", tone: "info", body: items.map((item) => ProgressLine({ label: item.title, detail: item.detail, tone: item.tone ?? "info" }, width - 4)) }, width).render();
}

export function IssueFlagBanner({ issue, severity = "warn" }, width = 80) {
  return Notice({ title: "Issue flag", tone: severity, body: issue }, width);
}

export function VoiceIndicator({ active = false }, width = 24) {
  return fit(paint(active ? " voice listening " : " voice idle ", active ? "green" : "gray"), width);
}

export function SandboxPromptFooterHint({ mode = "workspace-write" }, width = 80) {
  return fit(`${paint("sandbox", "gray")} ${mode} · approvals protect external effects`, width);
}

export function UserMessage(props, width = 80) {
  return MessageGroup({ title: "User", tone: "selected", messages: props.lines ?? [props.text] }, width);
}

export function AssistantMessage(props, width = 80) {
  return MessageGroup({ title: "Assistant", tone: "info", messages: props.lines ?? [props.text] }, width);
}

export function ThinkingMessage({ text = "thinking…" }, width = 80) {
  return Notice({ title: "Thinking", tone: "muted", body: text }, width);
}

export function SystemNoticeMessage({ title = "System", text, tone = "info" }, width = 80) {
  return Notice({ title, body: text, tone }, width);
}

export function AttachmentMessage({ attachments = [] }, width = 80) {
  return Card({ title: "Attachments", tone: "info", body: attachments.map((item) => AttachmentChip({ type: item.type, label: item.label }, width - 4)) }, width).render();
}

export function CompactBoundaryMessage({ label = "conversation compacted" }, width = 80) {
  return Divider(width, label);
}

export function GroupedToolUseContent({ tools = [] }, width = 80) {
  return Card({ title: "Tool group", tone: "running", body: tools.map((tool) => ProgressLine({ label: tool.name, detail: tool.subject, tone: tool.status === "done" ? "ok" : "running", right: tool.elapsed }, width - 4)) }, width).render();
}

export function BashToolCard({ command, status = "running", output = [] }, width = 80) {
  return ToolCard({ title: "Bash", command, status, output }, width);
}

export function FileReadToolCard({ path, lines }, width = 80) {
  return ToolCard({ title: "Read file", status: "done", subject: ToolSubject({ name: "read", path, detail: lines ? `${lines} lines` : undefined }, width - 8), output: [] }, width);
}

export function FileEditToolCard({ path, added = 0, removed = 0 }, width = 80) {
  return ToolCard({ title: "Edit file", status: "done", subject: ToolSubject({ name: "edit", path, detail: `+${added} -${removed}` }, width - 8), output: [] }, width);
}

export function SearchToolCard({ query, matches = 0 }, width = 80) {
  return ToolCard({ title: "Search", status: "done", subject: ToolSubject({ name: "rg", detail: query }, width - 8), output: [`${matches} matches`] }, width);
}

export function WebFetchToolCard({ url, status = "done" }, width = 80) {
  return ToolCard({ title: "Web fetch", status, subject: ToolSubject({ name: "fetch", detail: url }, width - 8), output: [status === "done" ? "content preview collapsed" : "waiting for approval"] }, width);
}

export function McpToolCard({ server, tool, status = "done" }, width = 80) {
  return ToolCard({ title: "MCP tool", status, subject: ToolSubject({ name: server, detail: tool }, width - 8), output: [] }, width);
}

export function NotebookPermissionRequest(props, width = 80) {
  return PermissionDialog({ title: "Notebook permission", request: `Edit notebook ${truncatePath(props.path, width - 24)}`, rules: [{ effect: "ask", scope: "workspace", rule: "notebook:edit" }], actions: ["Preview", "Allow", "Deny"] }, width);
}

export function PlanModePermissionRequest({ action = "enter" }, width = 80) {
  return PermissionDialog({ title: "Plan mode permission", request: `${action} plan mode`, rules: [{ effect: "ask", scope: "session", rule: "plan-mode" }], actions: ["Allow", "Cancel"] }, width);
}

export function AskUserQuestionPermissionRequest({ question }, width = 80) {
  return PermissionDialog({ title: "Ask user", request: question, rules: [{ effect: "allow", scope: "session", rule: "ask-user" }], actions: ["Ask", "Cancel"] }, width);
}

export function WorkflowLaunchPermissionRequest({ workflow = "workflow", workers = 2 }, width = 80) {
  return PermissionDialog({ title: "Workflow launch", request: `Launch ${workflow} with ${workers} workers`, rules: [{ effect: "ask", scope: "fleet", rule: `workers:${workers}` }], actions: ["Launch", "Queue", "Cancel"] }, width);
}

export function CouncilLaunchPermissionRequest({ members = 3 }, width = 80) {
  return PermissionDialog({ title: "Council launch", request: `Run council with ${members} members`, rules: [{ effect: "ask", scope: "fleet", rule: "council" }], actions: ["Run", "Cancel"] }, width);
}

export function ExternalRoutePermissionRequest({ route = "bifrost" }, width = 80) {
  return PermissionDialog({ title: "External route", request: `Use ${route} external model route`, rules: [{ effect: "ask", scope: "network", rule: "external-route" }], actions: ["Allow once", "Deny"] }, width);
}



export function LogoMark({ name = "SISO", version = "dev" }, width = 80) {
  return [
    fit(paint(` ${name} `, "cyan") + paint(` agent UI ${version}`, "gray"), width),
    fit(paint(" open-source terminal agent system", "gray"), width),
  ];
}

export function AuthStatusBox({ provider = "anthropic", status = "verified", account = "user" }, width = 80) {
  const tone = status === "verified" ? "ok" : status === "expired" ? "warn" : "error";
  return Card({ title: "Auth status", tone, body: [`provider ${provider}`, `status ${status}`, `account ${account}`] }, width).render();
}

export function OAuthSelector({ providers = [] }, width = 80) {
  return SelectList({ title: "OAuth providers", selected: 0, items: providers.map((provider) => ({ label: provider.name, detail: provider.status, right: provider.default ? "default" : undefined })) }, width);
}

export function ApiKeyApproval({ service = "provider", keyState = "detected" }, width = 80) {
  return PermissionDialog({ title: "API key approval", request: `${service} key ${keyState}`, rules: [{ effect: "ask", scope: "local", rule: "auth:keychain" }], actions: ["Use key", "Ignore", "Open settings"] }, width);
}

export function ThemeSelectorPanel({ themes = [], selected = 0 }, width = 80) {
  return SelectList({ title: "Theme selector", selected, items: themes.map((theme) => ({ label: theme.name, detail: theme.description, right: theme.active ? "active" : undefined })) }, width);
}

export function ChangelogPanel({ entries = [] }, width = 80) {
  return Card({ title: "Changelog", tone: "info", body: entries.map((entry) => `${paint(entry.version, "cyan")} ${entry.summary}`) }, width).render();
}

export function AutoUpdateNotice({ version = "next", status = "available" }, width = 80) {
  return Notice({ title: "Update", tone: status === "available" ? "info" : "ok", body: `version ${version} ${status}` }, width);
}

export function DoctorPanel({ checks = [] }, width = 80) {
  return Card({ title: "Doctor", tone: checks.some((check) => !check.ok) ? "warn" : "ok", body: checks.map((check) => ProgressLine({ label: check.name, detail: check.detail, tone: check.ok ? "ok" : "warn" }, width - 4)) }, width).render();
}

export function ErrorBoundaryPanel({ error, stack }, width = 80) {
  return Card({ title: "UI error", tone: "error", body: [error, stack ? fit(stack, width - 4) : undefined, "Demo harness recovered without touching runtime"].filter(Boolean) }, width).render();
}

export function LoadingState({ label = "Loading", detail, frame = 0 }, width = 80) {
  return ProgressLine({ label, detail, tone: "running", elapsed: `${frame}s` }, width);
}

export function EmptyState({ title = "Nothing here", hint = "Try another command" }, width = 80) {
  return Card({ title, tone: "muted", body: [paint(hint, "gray")] }, width).render();
}

export function ImagePreview({ path, width: imageWidth = 32, height: imageHeight = 8 }, width = 80) {
  const rows = Array.from({ length: Math.min(6, imageHeight) }, (_, index) => `${paint("▧".repeat(Math.min(20, imageWidth)), "gray")} ${index === 0 ? truncatePath(path, Math.max(10, width - 28)) : ""}`);
  return Card({ title: "Image preview", tone: "info", body: rows }, width).render();
}

export function FileTree({ root = ".", entries = [] }, width = 80) {
  return Card({ title: `Files · ${root}`, tone: "info", body: entries.map((entry) => `${"  ".repeat(entry.depth ?? 0)}${entry.type === "dir" ? "▸" : "•"} ${entry.name}`) }, width).render();
}

export function RepoMapPanel({ modules = [] }, width = 80) {
  return Card({ title: "Repo map", tone: "info", body: modules.map((mod) => `${truncatePath(mod.path, Math.max(10, width - 30))} ${paint(mod.summary, "gray")}`) }, width).render();
}

export function GitStatusPanel({ branch = "main", changes = [] }, width = 80) {
  return Card({ title: `Git · ${branch}`, tone: changes.length ? "warn" : "ok", body: changes.length ? changes.map((change) => `${change.status} ${truncatePath(change.path, width - 8)}`) : ["working tree clean"] }, width).render();
}

export function BranchSummaryPanel({ base = "main", head = "feature", summary = [] }, width = 80) {
  return Card({ title: `Branch summary · ${base}..${head}`, tone: "info", body: summary }, width).render();
}

export function CompactionSummaryPanel({ before = "120k", after = "32k", notes = [] }, width = 80) {
  return Card({ title: "Compaction summary", tone: "info", body: [`before ${before} · after ${after}`, ...notes] }, width).render();
}

export function CostTrackerPanel({ input = "0", output = "0", cost = "$0.00" }, width = 80) {
  return Card({ title: "Cost tracker", tone: "info", body: [`input ${input} · output ${output}`, `estimated ${cost}`] }, width).render();
}

export function SessionStatsPanel({ turns = 0, tools = 0, agents = 0, context = 0.5 }, width = 80) {
  return Card({ title: "Session stats", tone: "info", body: [`turns ${turns} · tools ${tools} · agents ${agents}`, ContextMeter({ used: context }, width - 4)] }, width).render();
}

export function CommandPalette({ commands = [], selected = 0 }, width = 80) {
  return OverlayMenu({ title: "Command palette", selected, items: commands.map((command) => ({ label: command.name, detail: command.description })) }, width);
}

export function SlashCommandHelp({ commands = [] }, width = 80) {
  return Card({ title: "Slash commands", tone: "info", body: commands.map((command) => `${paint(command.name, "cyan")} ${command.description}`) }, width).render();
}

export function ToastStack({ toasts = [] }, width = 80) {
  return toasts.flatMap((toast) => Notice({ title: toast.title, body: toast.body, tone: toast.tone ?? "info" }, width));
}

export function ModalDialog({ title = "Dialog", body = [], actions = [] }, width = 80) {
  return Card({ title, tone: "selected", body: [...body, actions.length ? `${paint("actions", "gray")} ${actions.join(" / ")}` : undefined].filter(Boolean) }, width).render();
}

export function ConfirmDialog({ title = "Confirm", action = "Continue" }, width = 80) {
  return ModalDialog({ title, body: ["This action requires confirmation."], actions: [action, "Cancel"] }, width);
}

export function TextInputPreview({ label = "Input", value = "", placeholder = "Type…" }, width = 80) {
  return Card({ title: label, tone: "selected", body: [value || paint(placeholder, "gray")] }, width).render();
}

export function TeamPanel({ members = [] }, width = 80) {
  return Card({ title: "Team", tone: "info", body: members.map((member) => ListRow({ label: member.name, detail: member.role, right: member.status }, width - 4)) }, width).render();
}

export function FeedbackSurveyPanel({ prompt = "How was this session?" }, width = 80) {
  return Card({ title: "Feedback", tone: "info", body: [prompt, `${paint("1", "gray")} bad  ${paint("5", "gray")} great  ${paint("Esc", "gray")} skip`] }, width).render();
}

export function DesktopUpsellPanel({ message = "Try the desktop companion for richer previews." }, width = 80) {
  return Notice({ title: "Desktop companion", tone: "info", body: message }, width);
}



export function TabBar({ tabs = [], selected = 0 }, width = 80) {
  const text = tabs.map((tab, index) => index === selected ? paint(` ${tab} `, "cyan") : paint(` ${tab} `, "gray")).join(" ");
  return fit(text, width);
}

export function SplitPane({ leftTitle = "Left", rightTitle = "Right", left = [], right = [] }, width = 80) {
  const gap = 2;
  const leftWidth = Math.max(18, Math.floor((width - gap) * 0.42));
  const rightWidth = Math.max(18, width - gap - leftWidth);
  const leftLines = Card({ title: leftTitle, tone: "info", body: left }, leftWidth).render();
  const rightLines = Card({ title: rightTitle, tone: "info", body: right }, rightWidth).render();
  const rows = Math.max(leftLines.length, rightLines.length);
  return Array.from({ length: rows }, (_, index) => `${padRight(leftLines[index] ?? "", leftWidth)}${" ".repeat(gap)}${padRight(rightLines[index] ?? "", rightWidth)}`);
}

export function Accordion({ sections = [] }, width = 80) {
  return Card({ title: "Accordion", tone: "info", body: sections.flatMap((section) => [
    `${section.open ? "▾" : "▸"} ${section.title}`,
    ...(section.open ? (section.items ?? []).map((item) => `  ${item}`) : []),
  ]) }, width).render();
}

export function TreeView({ nodes = [] }, width = 80) {
  return Card({ title: "Tree", tone: "info", body: nodes.map((node) => `${"  ".repeat(node.depth ?? 0)}${node.expanded ? "▾" : node.children ? "▸" : "•"} ${node.label}`) }, width).render();
}

export function CheckboxList({ items = [] }, width = 80) {
  return Card({ title: "Checklist", tone: "info", body: items.map((item) => `${item.checked ? "☑" : "☐"} ${item.label}${item.detail ? ` ${paint(item.detail, "gray")}` : ""}`) }, width).render();
}

export function RadioGroup({ label = "Options", items = [], selected = 0 }, width = 80) {
  return Card({ title: label, tone: "info", body: items.map((item, index) => `${index === selected ? "◉" : "○"} ${item}`) }, width).render();
}

export function MetricSparkline({ label = "metric", values = [] }, width = 80) {
  const chars = "▁▂▃▄▅▆▇█";
  const max = Math.max(1, ...values);
  const line = values.map((value) => chars[Math.min(chars.length - 1, Math.floor((value / max) * (chars.length - 1)))]).join("");
  return fit(`${label} ${paint(line, "cyan")}`, width);
}

export function TelemetryChart({ title = "Telemetry", series = [] }, width = 80) {
  return Card({ title, tone: "info", body: series.map((item) => MetricSparkline(item, width - 4)) }, width).render();
}

export function LogViewer({ title = "Logs", lines = [] }, width = 80) {
  return Card({ title, tone: "muted", body: lines.map((line) => `${paint(line.level ?? "info", line.level === "error" ? "red" : line.level === "warn" ? "yellow" : "gray")} ${line.message}`) }, width).render();
}

export function QueuePanel({ items = [] }, width = 80) {
  return Card({ title: "Queue", tone: items.length ? "warn" : "ok", body: items.length ? items.map((item, index) => `${index + 1}. ${item.title} ${paint(item.reason ?? "", "gray")}`) : ["queue empty"] }, width).render();
}

export function FleetDetailPanel({ fleetId = "fleet", children = [] }, width = 80) {
  return Card({ title: `Fleet · ${fleetId}`, tone: "running", body: children.map((child) => ChildAgentRow(child, width - 4)) }, width).render();
}

export function WorkflowGraph({ nodes = [] }, width = 80) {
  return Card({ title: "Workflow graph", tone: "info", body: nodes.map((node) => `${node.id} ${paint("→", "gray")} ${node.next?.join(", ") || "done"} ${paint(node.status ?? "", "gray")}`) }, width).render();
}

export function CouncilSynthesisCard({ question, synthesis, votes = [] }, width = 80) {
  return Card({ title: "Council synthesis", tone: "selected", body: [question, synthesis, ...votes.map((vote) => `${vote.member}: ${vote.position} ${paint(`${vote.confidence}%`, "gray")}`)] }, width).render();
}

export function TaskDependencyPanel({ tasks = [] }, width = 80) {
  return Card({ title: "Task dependencies", tone: "info", body: tasks.map((task) => `${task.id} ${task.blockedBy?.length ? paint(`blocked by ${task.blockedBy.join(",")}`, "yellow") : paint("ready", "green")}`) }, width).render();
}

export function SecuritySettingsPanel({ rows = [] }, width = 80) {
  return SettingsPanel({ title: "Security settings", rows }, width);
}

export function ApprovalModeSelector({ selected = 1 }, width = 80) {
  return RadioGroup({ label: "Approval mode", selected, items: ["Ask every time", "Workspace trusted", "Autonomous with rules"] }, width);
}

export function SandboxDependenciesPanel({ dependencies = [] }, width = 80) {
  return CheckboxList({ items: dependencies.map((dep) => ({ label: dep.name, checked: dep.installed, detail: dep.version ?? "missing" })) }, width);
}

export function EnvVarPanel({ vars = [] }, width = 80) {
  return Card({ title: "Environment", tone: "info", body: vars.map((item) => `${item.name}=${item.value ? paint("set", "green") : paint("unset", "gray")}`) }, width).render();
}

export function FileChangeSummary({ files = [] }, width = 80) {
  const added = files.reduce((sum, file) => sum + (file.added ?? 0), 0);
  const removed = files.reduce((sum, file) => sum + (file.removed ?? 0), 0);
  return Card({ title: `Changes +${added} -${removed}`, tone: "info", body: files.map((file) => `${file.status ?? "M"} ${truncatePath(file.path, width - 18)} ${paint(`+${file.added ?? 0} -${file.removed ?? 0}`, "gray")}`) }, width).render();
}



export function AccessibilityPanel({ rows = [] }, width = 80) {
  return Card({ title: "Accessibility", tone: "info", body: rows.map((row) => `${row.label} ${paint(row.value, row.ok ? "green" : "yellow")}`) }, width).render();
}

export function KeybindingConflictPanel({ conflicts = [] }, width = 80) {
  return Card({ title: "Keybinding conflicts", tone: conflicts.length ? "warn" : "ok", body: conflicts.length ? conflicts.map((item) => `${paint(item.key, "gray")} ${item.current} ↔ ${item.conflict}`) : ["no conflicts"] }, width).render();
}

export function SmokeReportPanel({ suites = [] }, width = 80) {
  return Card({ title: "Smoke report", tone: suites.some((s) => !s.ok) ? "error" : "ok", body: suites.map((suite) => ProgressLine({ label: suite.name, detail: suite.detail, tone: suite.ok ? "ok" : "error", right: suite.duration }, width - 4)) }, width).render();
}

export function TestFailurePanel({ test, error, command }, width = 80) {
  return Card({ title: "Test failure", tone: "error", body: [test, error, command ? `${paint("cmd", "gray")} ${command}` : undefined].filter(Boolean) }, width).render();
}

export function ReleaseChecklistPanel({ items = [] }, width = 80) {
  return Card({ title: "Release checklist", tone: "info", body: items.map((item) => `${item.done ? paint("✓", "green") : paint("○", "gray")} ${item.label}`) }, width).render();
}

export function VersionBadge({ version = "0.0.0", channel = "dev" }, width = 24) {
  return fit(paint(` v${version} ${channel} `, channel === "stable" ? "green" : "cyan"), width);
}

export function InstallProgressPanel({ steps = [] }, width = 80) {
  return Card({ title: "Install progress", tone: "running", body: steps.map((step) => ProgressLine({ label: step.name, detail: step.detail, tone: step.done ? "ok" : "running" }, width - 4)) }, width).render();
}

export function RouterDecisionCard({ route = "local", profile = "worker", reason = "policy" }, width = 80) {
  return Card({ title: "Router decision", tone: "info", body: [`route ${route}`, `profile ${profile}`, `reason ${reason}`] }, width).render();
}

export function ContextExplainPanel({ tiers = [] }, width = 80) {
  return Card({ title: "Context explain", tone: "info", body: tiers.map((tier) => `${tier.name} ${paint(`${tier.tokens} tokens`, "gray")} ${tier.status ?? ""}`) }, width).render();
}

export function ContextMemoryPanel({ memories = [] }, width = 80) {
  return Card({ title: "Context memory", tone: "info", body: memories.map((memory) => `${memory.source}: ${memory.summary}`) }, width).render();
}

export function ChildNotificationCard({ child = "child", status = "completed", delivered = true }, width = 80) {
  return Card({ title: "Child notification", tone: delivered ? "ok" : "warn", body: [`${sanitizeChildLabel(child)} ${status}`, delivered ? "delivered as hidden parent follow-up" : "pending delivery"] }, width).render();
}

export function ParentFollowupCard({ triggerTurn = true, summary = "child result available" }, width = 80) {
  return Card({ title: "Parent follow-up", tone: triggerTurn ? "running" : "info", body: [`triggerTurn ${triggerTurn}`, summary] }, width).render();
}

export function BudgetPressureWarning({ scope = "fleet", used = 0.84 }, width = 80) {
  return Notice({ title: "Budget pressure", tone: used > 0.9 ? "error" : "warn", body: `${scope} budget ${Math.round(used * 100)}% used · consider queueing or compacting` }, width);
}

export function ToolApprovalSummary({ approvals = [] }, width = 80) {
  return Card({ title: "Tool approvals", tone: "info", body: approvals.map((approval) => `${approval.tool} ${paint(approval.decision, approval.decision === "deny" ? "red" : "green")} ${paint(approval.scope ?? "once", "gray")}`) }, width).render();
}

export function WebSearchResultCard({ query, results = [] }, width = 80) {
  return Card({ title: `Web search · ${query}`, tone: "info", body: results.map((result) => `${result.title} ${paint(result.url, "gray")}`) }, width).render();
}

export function NotebookEditCard({ path, cells = 0, added = 0, removed = 0 }, width = 80) {
  return ToolCard({ title: "Notebook edit", status: "done", subject: ToolSubject({ name: "notebook", path, detail: `${cells} cells +${added} -${removed}` }, width - 8), output: [] }, width);
}

export function TodoListPanel({ todos = [] }, width = 80) {
  return Card({ title: "Todos", tone: "info", body: todos.map((todo) => `${todo.done ? paint("☑", "green") : "☐"} ${todo.text}`) }, width).render();
}

export function PlanModePanel({ objective, steps = [] }, width = 80) {
  return Card({ title: "Plan mode", tone: "selected", body: [objective, ...steps.map((step, index) => `${index + 1}. ${step}`)] }, width).render();
}

export function IDESelectionPanel({ file, range, preview = [] }, width = 80) {
  return Card({ title: "IDE selection", tone: "info", body: [`${truncatePath(file, width - 18)} ${paint(range, "gray")}`, ...preview.slice(0, 4)] }, width).render();
}

export function FileAttachmentList({ files = [] }, width = 80) {
  return Card({ title: "File attachments", tone: "info", body: files.map((file) => AttachmentChip({ type: "file", label: truncatePath(file, width - 18) }, width - 4)) }, width).render();
}

export function ImageAttachmentGrid({ images = [] }, width = 80) {
  return Card({ title: "Image attachments", tone: "info", body: images.map((image) => `${paint("▧", "gray")} ${truncatePath(image.path, width - 18)} ${paint(image.size ?? "", "gray")}`) }, width).render();
}

export function ClipboardPasteNotice({ kind = "text", size = "small" }, width = 80) {
  return Notice({ title: "Clipboard paste", tone: "info", body: `${kind} paste detected · ${size}` }, width);
}

export function ExternalEditorPanel({ editor = "$EDITOR", file = "prompt.md" }, width = 80) {
  return Card({ title: "External editor", tone: "info", body: [`editor ${editor}`, `file ${file}`, "save and close to return"] }, width).render();
}

export function HistoryTimeline({ events = [] }, width = 80) {
  return Card({ title: "History", tone: "info", body: events.map((event) => `${paint(event.time, "gray")} ${event.title}`) }, width).render();
}

export function SessionExportPanel({ formats = [] }, width = 80) {
  return Card({ title: "Export session", tone: "info", body: formats.map((format) => `${format.name} ${paint(format.detail, "gray")}`) }, width).render();
}



export function ReviewSummaryPanel({ files = [], comments = [] }, width = 80) {
  return Card({ title: "Review summary", tone: comments.some((c) => c.severity === "blocker") ? "error" : "info", body: [
    `${files.length} files reviewed · ${comments.length} comments`,
    ...comments.slice(0, 5).map((comment) => `${paint(comment.severity ?? "note", comment.severity === "blocker" ? "red" : "yellow")} ${truncatePath(comment.file ?? "", 28)} ${comment.text}`),
  ] }, width).render();
}

export function InlineCommentPanel({ file, line, comments = [] }, width = 80) {
  return Card({ title: `Inline comments · ${truncatePath(file, 32)}:${line}`, tone: "info", body: comments.map((comment) => `${comment.author}: ${comment.text}`) }, width).render();
}

export function PatchApplyPanel({ patches = [] }, width = 80) {
  return Card({ title: "Patch apply", tone: patches.some((p) => p.status === "failed") ? "error" : "ok", body: patches.map((patch) => `${patch.status === "applied" ? paint("✓", "green") : paint("!", "yellow")} ${truncatePath(patch.file, width - 18)} ${paint(patch.status, "gray")}`) }, width).render();
}

export function RollbackPanel({ checkpoints = [] }, width = 80) {
  return SelectList({ title: "Rollback checkpoint", selected: 0, items: checkpoints.map((checkpoint) => ({ label: checkpoint.name, detail: checkpoint.time, right: checkpoint.files ? `${checkpoint.files} files` : undefined })) }, width);
}

export function DatabaseQueryCard({ query, rows = 0, duration = "0ms" }, width = 80) {
  return ToolCard({ title: "Database query", status: "done", subject: ToolSubject({ name: "sqlite", detail: `${rows} rows · ${duration}` }, width - 8), output: [query] }, width);
}

export function JsonPreview({ value, title = "JSON" }, width = 80) {
  const text = JSON.stringify(value, null, 2).split("\n").slice(0, 8);
  return Card({ title, tone: "muted", body: text }, width).render();
}

export function CsvTablePreview({ columns = [], rows = [] }, width = 80) {
  return Card({ title: "CSV preview", tone: "info", body: Table({ columns: columns.map((c) => ({ key: c, label: c })), rows }, width - 4).slice(0, 8) }, width).render();
}

export function ApiRequestCard({ method = "GET", url, status = "pending" }, width = 80) {
  return ToolCard({ title: "API request", status: status === "200" ? "done" : "running", subject: ToolSubject({ name: method, detail: url }, width - 8), output: [`status ${status}`] }, width);
}

export function BrowserActionCard({ action = "open", target, status = "pending" }, width = 80) {
  return ToolCard({ title: "Browser action", status: status === "done" ? "done" : "running", subject: ToolSubject({ name: action, detail: target }, width - 8), output: [] }, width);
}

export function ComputerUseCard({ action, coordinates, status = "pending" }, width = 80) {
  return ToolCard({ title: "Computer use", status: status === "done" ? "done" : "running", subject: ToolSubject({ name: action, detail: coordinates }, width - 8), output: ["requires explicit approval"] }, width);
}

export function TerminalMultiplexerPanel({ panes = [] }, width = 80) {
  return Card({ title: "Terminal panes", tone: "info", body: panes.map((pane) => `${pane.id} ${paint(pane.status, pane.status === "running" ? "cyan" : "gray")} ${pane.command}`) }, width).render();
}

export function ProcessListPanel({ processes = [] }, width = 80) {
  return Card({ title: "Processes", tone: "info", body: processes.map((proc) => `${proc.pid} ${proc.name} ${paint(proc.cpu ?? "0%", "gray")} ${proc.status}`) }, width).render();
}

export function PerformancePanel({ fps = 0, renderMs = 0, memory = "n/a" }, width = 80) {
  return Card({ title: "TUI performance", tone: renderMs > 50 ? "warn" : "ok", body: [`fps ${fps}`, `render ${renderMs}ms`, `memory ${memory}`] }, width).render();
}

export function FeatureFlagPanel({ flags = [] }, width = 80) {
  return Card({ title: "Feature flags", tone: "info", body: flags.map((flag) => `${flag.enabled ? paint("on", "green") : paint("off", "gray")} ${flag.name}`) }, width).render();
}

export function ExperimentBanner({ name, variant }, width = 80) {
  return Notice({ title: "Experiment", tone: "info", body: `${name} · variant ${variant}` }, width);
}

export function LocalizationPanel({ locale = "en-US", strings = [] }, width = 80) {
  return Card({ title: "Localization", tone: "info", body: [`locale ${locale}`, ...strings.map((item) => `${item.key}: ${item.value}`)] }, width).render();
}

export function ThemePreviewGrid({ themes = [] }, width = 80) {
  return Card({ title: "Theme preview", tone: "info", body: themes.map((theme) => `${paint("██", theme.color ?? "cyan")} ${theme.name} ${paint(theme.description ?? "", "gray")}`) }, width).render();
}

export function ColorPalettePanel({ colors = [] }, width = 80) {
  return Card({ title: "Color palette", tone: "info", body: colors.map((color) => `${paint("●", color.tone ?? "cyan")} ${color.name} ${paint(color.hex ?? "", "gray")}`) }, width).render();
}

export function DensityPreviewPanel({ densities = [] }, width = 80) {
  return Card({ title: "Density preview", tone: "info", body: densities.map((density) => `${density.name}: ${"▁".repeat(density.spacing ?? 1)} ${paint(density.description ?? "", "gray")}`) }, width).render();
}

export function PrivacyNoticePanel({ items = [] }, width = 80) {
  return Card({ title: "Privacy", tone: "info", body: items.map((item) => `${item.shared ? paint("shared", "yellow") : paint("local", "green")} ${item.name}`) }, width).render();
}

export function DataRetentionPanel({ policies = [] }, width = 80) {
  return Card({ title: "Data retention", tone: "info", body: policies.map((policy) => `${policy.scope} ${paint(policy.duration, "gray")}`) }, width).render();
}

export function AuditLogPanel({ entries = [] }, width = 80) {
  return Card({ title: "Audit log", tone: "info", body: entries.map((entry) => `${paint(entry.time, "gray")} ${entry.actor} ${entry.action}`) }, width).render();
}

export function PromptTemplatePanel({ templates = [] }, width = 80) {
  return SelectList({ title: "Prompt templates", selected: 0, items: templates.map((template) => ({ label: template.name, detail: template.description, right: template.source })) }, width);
}

export function SnippetLibraryPanel({ snippets = [] }, width = 80) {
  return Card({ title: "Snippets", tone: "info", body: snippets.map((snippet) => `${snippet.trigger} ${paint(snippet.description, "gray")}`) }, width).render();
}

export function MacroRecorderPanel({ recording = false, events = 0 }, width = 80) {
  return Card({ title: "Macro recorder", tone: recording ? "running" : "muted", body: [`recording ${recording}`, `events ${events}`, "replay commands safely in demo"] }, width).render();
}



export function ExtensionManagerPanel({ extensions = [] }, width = 80) {
  return Card({ title: "Extensions", tone: "info", body: extensions.map((ext) => `${ext.enabled ? paint("on", "green") : paint("off", "gray")} ${ext.name} ${paint(ext.version ?? "", "gray")}`) }, width).render();
}

export function PluginInstallPanel({ plugin, status = "ready", steps = [] }, width = 80) {
  return Card({ title: `Install plugin · ${plugin}`, tone: status === "failed" ? "error" : "running", body: steps.map((step) => ProgressLine({ label: step.name, detail: step.detail, tone: step.done ? "ok" : "running" }, width - 4)) }, width).render();
}

export function ProfileManagerPanel({ profiles = [] }, width = 80) {
  return SelectList({ title: "Profiles", selected: 0, items: profiles.map((profile) => ({ label: profile.name, detail: profile.model, right: profile.default ? "default" : profile.lane })) }, width);
}

export function SkillMarketplacePanel({ skills = [] }, width = 80) {
  return Card({ title: "Skill marketplace", tone: "info", body: skills.map((skill) => `${skill.installed ? paint("✓", "green") : paint("+", "cyan")} ${skill.name} ${paint(skill.description, "gray")}`) }, width).render();
}

export function RepoCatalogPanel({ repos = [] }, width = 80) {
  return Card({ title: "Repo catalog", tone: "info", body: repos.map((repo) => `${repo.name} ${paint(repo.kind ?? "repo", "gray")} ${repo.priority ?? ""}`) }, width).render();
}

export function RepoRecommendationPanel({ recommendations = [] }, width = 80) {
  return Card({ title: "Repo recommendations", tone: "info", body: recommendations.map((rec) => `${paint(rec.score ?? "", "cyan")} ${rec.name} ${paint(rec.reason, "gray")}`) }, width).render();
}

export function BenchmarkPanel({ benchmarks = [] }, width = 80) {
  return Card({ title: "Benchmarks", tone: "info", body: benchmarks.map((bench) => `${bench.name} ${paint(bench.score, "cyan")} ${paint(bench.delta ?? "", bench.delta?.startsWith("+") ? "green" : "red")}`) }, width).render();
}

export function LatencyBreakdownPanel({ phases = [] }, width = 80) {
  return Card({ title: "Latency breakdown", tone: "info", body: phases.map((phase) => `${phase.name} ${paint(phase.ms + "ms", "gray")} ${ProgressBar({ percent: phase.ratio ?? 0.2, width: 10, tone: "info" })}`) }, width).render();
}

export function TimelineFilterPanel({ filters = [] }, width = 80) {
  return CheckboxList({ items: filters.map((filter) => ({ label: filter.name, checked: filter.enabled, detail: filter.count !== undefined ? `${filter.count}` : undefined })) }, width);
}

export function TimelineEventDetail({ event }, width = 80) {
  return Card({ title: "Timeline event", tone: event.tone ?? "info", body: [`type ${event.type}`, `surface ${event.surface}`, event.detail] }, width).render();
}

export function KeyboardShortcutEditor({ bindings = [] }, width = 80) {
  return Card({ title: "Keyboard shortcuts", tone: "info", body: bindings.map((binding) => `${paint(binding.key, "gray")} ${binding.action} ${binding.custom ? paint("custom", "cyan") : ""}`) }, width).render();
}

export function CommandHistoryPanel({ commands = [] }, width = 80) {
  return Card({ title: "Command history", tone: "info", body: commands.map((cmd) => `${paint(cmd.time, "gray")} ${cmd.command}`) }, width).render();
}

export function TerminalCapabilityPanel({ capabilities = [] }, width = 80) {
  return Card({ title: "Terminal capabilities", tone: "info", body: capabilities.map((cap) => `${cap.ok ? paint("✓", "green") : paint("×", "red")} ${cap.name} ${paint(cap.detail ?? "", "gray")}`) }, width).render();
}

export function ResizePreviewPanel({ columns = 80, rows = 24 }, width = 80) {
  return Card({ title: "Resize preview", tone: "info", body: [`terminal ${columns}×${rows}`, `layout ${columns < 60 ? "compact" : "standard"}`, `footer ${rows < 16 ? "minimal" : "full"}`] }, width).render();
}

export function ServerHealthPanel({ services = [] }, width = 80) {
  return Card({ title: "Server health", tone: services.some((svc) => !svc.ok) ? "warn" : "ok", body: services.map((svc) => `${svc.ok ? paint("✓", "green") : paint("!", "yellow")} ${svc.name} ${paint(svc.latency ?? "", "gray")}`) }, width).render();
}

export function RemoteTunnelPanel({ tunnels = [] }, width = 80) {
  return Card({ title: "Remote tunnels", tone: "info", body: tunnels.map((tunnel) => `${tunnel.name} ${paint(tunnel.url, "gray")} ${tunnel.status}`) }, width).render();
}

export function BackupPanel({ backups = [] }, width = 80) {
  return Card({ title: "Backups", tone: "info", body: backups.map((backup) => `${backup.name} ${paint(backup.size, "gray")} ${backup.age}`) }, width).render();
}

export function PrunePanel({ candidates = [] }, width = 80) {
  return Card({ title: "Prune candidates", tone: candidates.length ? "warn" : "ok", body: candidates.length ? candidates.map((item) => `${item.kind} ${item.count} ${paint(item.size ?? "", "gray")}`) : ["nothing to prune"] }, width).render();
}

export function MigrationPlanPanel({ migrations = [] }, width = 80) {
  return Card({ title: "Migration plan", tone: "warn", body: migrations.map((migration) => `${migration.done ? paint("✓", "green") : paint("○", "gray")} ${migration.name} ${paint(migration.risk ?? "", "gray")}`) }, width).render();
}

export function CompatibilityMatrix({ rows = [] }, width = 80) {
  return Table({ columns: [{ key: "feature", label: "Feature", width: 22 }, { key: "pi", label: "pi" }, { key: "ink", label: "ink" }, { key: "status", label: "status" }], rows }, width);
}

export function OpenSourceLicensePanel({ licenses = [] }, width = 80) {
  return Card({ title: "Open-source licenses", tone: "info", body: licenses.map((license) => `${license.package} ${paint(license.license, "gray")}`) }, width).render();
}

export function ContributionGuidePanel({ steps = [] }, width = 80) {
  return Card({ title: "Contributing", tone: "info", body: steps.map((step, index) => `${index + 1}. ${step}`) }, width).render();
}



export function GuidedTourPanel({ steps = [], current = 0 }, width = 80) {
  return Card({ title: "Guided tour", tone: "selected", body: steps.map((step, index) => `${index === current ? paint("▶", "cyan") : paint("○", "gray")} ${step.title} ${paint(step.hint ?? "", "gray")}`) }, width).render();
}

export function CoachMark({ target, message }, width = 80) {
  return Notice({ title: `Tip · ${target}`, tone: "info", body: message }, width);
}

export function EmptyProjectOnboarding({ cwd = "workspace" }, width = 80) {
  return WizardStep({ title: "Project setup", step: 1, total: 3, body: [`Detected ${cwd}`, "Create project memory", "Configure safe defaults"], actions: ["Initialize", "Skip"] }, width);
}

export function ProjectTrustSummary({ trusted = false, rules = [] }, width = 80) {
  return Card({ title: "Project trust", tone: trusted ? "ok" : "warn", body: [trusted ? "trusted workspace" : "trust required", ...rules.map((rule) => PermissionRulePreview(rule, width - 4))] }, width).render();
}

export function WorkspaceHealthPanel({ checks = [] }, width = 80) {
  return Card({ title: "Workspace health", tone: checks.some((check) => !check.ok) ? "warn" : "ok", body: checks.map((check) => ProgressLine({ label: check.name, detail: check.detail, tone: check.ok ? "ok" : "warn" }, width - 4)) }, width).render();
}

export function DependencyGraphPanel({ nodes = [] }, width = 80) {
  return Card({ title: "Dependency graph", tone: "info", body: nodes.map((node) => `${node.name} ${paint("→", "gray")} ${(node.deps ?? []).join(", ") || "none"}`) }, width).render();
}

export function PackageManagerPanel({ manager = "npm", scripts = [] }, width = 80) {
  return Card({ title: `Package manager · ${manager}`, tone: "info", body: scripts.map((script) => `${paint(script.name, "cyan")} ${script.command}`) }, width).render();
}

export function BuildStatusPanel({ targets = [] }, width = 80) {
  return Card({ title: "Build status", tone: targets.some((target) => target.status === "failed") ? "error" : "ok", body: targets.map((target) => ProgressLine({ label: target.name, detail: target.detail, tone: target.status === "done" ? "ok" : target.status === "failed" ? "error" : "running", right: target.duration }, width - 4)) }, width).render();
}

export function LintReportPanel({ issues = [] }, width = 80) {
  return Card({ title: "Lint report", tone: issues.length ? "warn" : "ok", body: issues.length ? issues.map((issue) => `${truncatePath(issue.file, 24)}:${issue.line} ${paint(issue.rule, "gray")} ${issue.message}`) : ["no lint issues"] }, width).render();
}

export function TypecheckReportPanel({ errors = [] }, width = 80) {
  return Card({ title: "Typecheck", tone: errors.length ? "error" : "ok", body: errors.length ? errors.map((error) => `${truncatePath(error.file, 24)} ${error.message}`) : ["types ok"] }, width).render();
}

export function CoveragePanel({ percent = 0, files = [] }, width = 80) {
  return Card({ title: "Coverage", tone: percent >= 0.8 ? "ok" : "warn", body: [`overall ${ProgressBar({ percent, width: 16, tone: percent >= 0.8 ? "ok" : "warn" })} ${Math.round(percent * 100)}%`, ...files.map((file) => `${truncatePath(file.path, 28)} ${Math.round(file.percent * 100)}%`)] }, width).render();
}

export function ArtifactListPanel({ artifacts = [] }, width = 80) {
  return Card({ title: "Artifacts", tone: "info", body: artifacts.map((artifact) => `${artifact.kind} ${truncatePath(artifact.path, 32)} ${paint(artifact.size ?? "", "gray")}`) }, width).render();
}

export function DownloadProgressPanel({ downloads = [] }, width = 80) {
  return Card({ title: "Downloads", tone: "running", body: downloads.map((item) => `${item.name} ${ProgressBar({ percent: item.progress ?? 0, width: 12, tone: "info" })} ${Math.round((item.progress ?? 0) * 100)}%`) }, width).render();
}

export function CacheStatusPanel({ caches = [] }, width = 80) {
  return Card({ title: "Cache status", tone: "info", body: caches.map((cache) => `${cache.name} ${paint(cache.hitRate ?? "", "gray")} ${cache.size ?? ""}`) }, width).render();
}

export function NetworkRequestPanel({ requests = [] }, width = 80) {
  return Card({ title: "Network requests", tone: "info", body: requests.map((request) => `${request.method} ${request.host} ${paint(request.status, request.status >= 400 ? "red" : "green")} ${request.ms}ms`) }, width).render();
}

export function RateLimitPanel({ limits = [] }, width = 80) {
  return Card({ title: "Rate limits", tone: limits.some((limit) => limit.remaining < 5) ? "warn" : "info", body: limits.map((limit) => `${limit.name} ${limit.remaining}/${limit.total} resets ${limit.reset}`) }, width).render();
}

export function QuotaUsagePanel({ quotas = [] }, width = 80) {
  return Card({ title: "Quota usage", tone: "info", body: quotas.map((quota) => `${quota.name} ${ProgressBar({ percent: quota.used ?? 0, width: 12, tone: quota.used > 0.8 ? "warn" : "ok" })} ${Math.round((quota.used ?? 0) * 100)}%`) }, width).render();
}

export function AlertRulePanel({ rules = [] }, width = 80) {
  return Card({ title: "Alert rules", tone: "info", body: rules.map((rule) => `${rule.enabled ? paint("on", "green") : paint("off", "gray")} ${rule.name} ${paint(rule.condition, "gray")}`) }, width).render();
}

export function IncidentPanel({ incidents = [] }, width = 80) {
  return Card({ title: "Incidents", tone: incidents.length ? "error" : "ok", body: incidents.length ? incidents.map((incident) => `${incident.severity} ${incident.title} ${paint(incident.status, "gray")}`) : ["no active incidents"] }, width).render();
}

export function RecoveryActionPanel({ actions = [] }, width = 80) {
  return Card({ title: "Recovery actions", tone: "warn", body: actions.map((action) => `${action.safe ? paint("safe", "green") : paint("manual", "yellow")} ${action.label}`) }, width).render();
}



export function LoadingScreen({ title = "SISO", subtitle = "starting agent runtime", steps = [] }, width = 80, height = 24) {
  const boxWidth = Math.min(64, Math.max(32, width - 4));
  const topPad = Math.max(0, Math.floor((height - 8 - steps.length) / 2));
  const leftPad = " ".repeat(Math.max(0, Math.floor((width - boxWidth) / 2)));
  const content = [
    fit(paint(title, "cyan"), boxWidth),
    fit(paint(subtitle, "gray"), boxWidth),
    "",
    ...steps.map((step) => ProgressLine({ label: step.label, detail: step.detail, tone: step.done ? "ok" : "running" }, boxWidth)),
  ];
  return [
    ...Array(topPad).fill(""),
    ...Card({ title: "", tone: "info", body: content }, boxWidth).render().map((line) => leftPad + line),
  ];
}

export function CenteredAppShell({ title = "SISO", subtitle = "agent workspace", body = [], footer = [] }, width = 80, height = 24) {
  const shellWidth = Math.min(104, Math.max(44, width - 4));
  const leftPad = " ".repeat(Math.max(0, Math.floor((width - shellWidth) / 2)));
  const maxBody = Math.max(4, height - 7);
  const clippedBody = body.slice(0, maxBody);
  const shell = [
    fit(`${paint(title, "cyan")} ${paint(subtitle, "gray")}`, shellWidth),
    Divider(shellWidth),
    ...clippedBody.map((line) => fit(line, shellWidth)),
    Divider(shellWidth),
    ...(footer.length ? footer : [StatusLine({ left: [KeyHint("/", "commands"), KeyHint("Tab", "focus")], right: ["SISO ready"] }, shellWidth)]),
  ];
  return shell.map((line) => leftPad + line);
}

export function ChatViewport({ messages = [], centered = true }, width = 80, height = 16) {
  const viewportWidth = centered ? Math.min(96, Math.max(42, width - 6)) : width;
  const rows = TranscriptViewport({ messages }, viewportWidth).slice(0, height);
  return Card({ title: "Chat", tone: "info", body: rows.map((line) => fit(line, viewportWidth - 4)) }, viewportWidth).render();
}

export function BottomComposer({ placeholder = "Message SISO…", mode = "normal" }, width = 80) {
  return [
    ...PromptComposer({ placeholder, mode }, width),
    PromptFooter({ mode, right: ["lightweight static shell"] }, width),
  ];
}

export function PanelOverlay({ title = "Overlay", body = [], actions = [] }, width = 80) {
  const overlayWidth = Math.min(72, Math.max(36, width - 8));
  return ModalDialog({ title, body, actions }, overlayWidth);
}


export function Card({ title, body = [], tone = "info" }, width = 80) {
  return {
    render() {
      const color = toneColor[tone] ?? "blue";
      const safeWidth = Math.max(12, width);
      const titleText = title ? ` ${paint(title, color)}` : "";
      const topFill = Math.max(0, safeWidth - visibleWidth(titleText) - 2);
      const lines = [`╭─${titleText}${"─".repeat(topFill)}╮`];
      for (const row of body) {
        const contentWidth = safeWidth - 4;
        const line = fit(String(row ?? ""), contentWidth);
        lines.push(`│ ${padRight(line, contentWidth)} │`);
      }
      lines.push(`╰${"─".repeat(Math.max(0, safeWidth - 2))}╯`);
      return lines.map((line) => fit(line, safeWidth));
    },
  };
}
