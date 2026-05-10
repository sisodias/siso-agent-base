export const SISO_OUTPUT_STYLE_PROMPT = `

SISO interaction style:
- Before tool-heavy work, briefly acknowledge the user's goal and state the direction in 1-3 short lines.
- During work, give concise progress notes when useful, especially before switching strategy or after important validation. Do not expose hidden chain-of-thought; summarize observable reasoning only.
- Prefer native SISO/code-intelligence tools over noisy shell dumps when available.
- Final responses should be clean operator summaries, not raw transcripts. Avoid dumping code unless the user asks for code.
- Do not prefix normal final answers with file-type labels like TXT. Use short headings and bullets.
- Always include what changed, what was validated, and what remains risky/next when relevant.
- Be direct and practical. Keep output concise unless the user asks for depth.
`;

export function buildSisoPreflightMessage(prompt = "") {
  const text = String(prompt ?? "").replace(/\s+/g, " ").trim();
  const compact = text.length > 140 ? `${text.slice(0, 137)}...` : text;
  const direction = inferDirection(text);
  return {
    customType: "siso-preflight",
    display: "SISO direction",
    content: `I’ll handle this as: ${direction}\nI’ll inspect the relevant files first, then make the smallest safe change and validate it.`,
    details: { phase: "recon", direction, promptPreview: compact }
  };
}

export function buildSisoPhaseMessage(phase, content, details = {}) {
  return {
    customType: "siso-phase",
    display: `SISO ${phaseTitle(phase)}`,
    content: String(content ?? "").trim(),
    details: { phase, ...details }
  };
}

function inferDirection(text) {
  const lower = text.toLowerCase();
  if (/render|output|message|tui|ui|display/.test(lower)) return "UI/output polish and renderer behavior";
  if (/contract|drift|doctor|readiness|release|version/.test(lower)) return "agent-system safety/readiness infrastructure";
  if (/benchmark|score|metric|eval/.test(lower)) return "harness benchmark and measurement work";
  if (/tool|search|context|repo|code intelligence/.test(lower)) return "agent tooling/code-intelligence work";
  if (/bug|fix|broken|error|fail/.test(lower)) return "debugging and targeted repair";
  return "a scoped SISO agent-base change";
}

export function renderSisoPhaseCard(message, options = {}, theme) {
  const details = message?.details && typeof message.details === "object" ? message.details : {};
  const phase = String(details.phase ?? "direction");
  const title = phaseTitle(phase);
  const content = String(message?.content ?? "").trim();
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const head = color(theme, "toolTitle", `◇ ${title}`);
  const body = lines.slice(0, options.expanded ? 8 : 2).map((line) => `${color(theme, "muted", "│")} ${line}`);
  const more = options.expanded && lines.length > body.length ? [color(theme, "muted", `│ … ${lines.length - body.length} more`)] : [];
  return [head, ...body, ...more].join("\n");
}

function phaseTitle(phase) {
  if (phase === "recon") return "Plan";
  if (phase === "implement") return "Implement";
  if (phase === "validate") return "Validate";
  if (phase === "repair") return "Repair";
  if (phase === "summary") return "Summary";
  return "SISO Direction";
}

function color(theme, key, text) {
  try {
    return theme?.fg ? theme.fg(key, text) : text;
  } catch {
    return text;
  }
}
