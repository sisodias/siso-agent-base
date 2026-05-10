import { visibleWidth } from "../../node_modules/@mariozechner/pi-tui/dist/utils.js";

const ANSI = /\x1b\[[0-9;]*m/g;
const TOKEN = /\x1b\[[0-9;]*m|[^\x1b]/g;
const useColor = !process.env.NO_COLOR;

export const style = useColor ? {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
} : {
  reset: "",
  dim: "",
  bold: "",
  blue: "",
  cyan: "",
  green: "",
  yellow: "",
  red: "",
  magenta: "",
  gray: "",
};

export function paint(value, color) {
  if (!useColor) return String(value ?? "");
  return `${style[color] ?? ""}${value}${style.reset}`;
}

export function stripAnsi(value) {
  return String(value ?? "").replace(ANSI, "");
}

export function padRight(value, width) {
  const missing = width - visibleWidth(value);
  return missing > 0 ? `${value}${" ".repeat(missing)}` : value;
}

export function fit(value, width, ellipsis = "…") {
  const maxWidth = Math.max(0, width);
  if (maxWidth <= 0) return "";
  const text = String(value ?? "");
  const textWidth = visibleWidth(text);
  if (textWidth <= maxWidth) return text;

  const ellipsisWidth = visibleWidth(ellipsis);
  if (ellipsisWidth >= maxWidth) return ellipsis.slice(0, maxWidth);

  const targetWidth = maxWidth - ellipsisWidth;
  let out = "";
  let used = 0;
  for (const match of text.matchAll(TOKEN)) {
    const part = match[0];
    if (part.startsWith("\x1b")) {
      out += part;
      continue;
    }
    const partWidth = visibleWidth(part);
    if (used + partWidth > targetWidth) break;
    out += part;
    used += partWidth;
  }
  return `${out}${useColor ? style.reset : ""}${ellipsis}`;
}

export function joinVisible(parts, separator = " ") {
  return parts.filter((part) => part !== undefined && part !== null && String(part).length > 0).join(separator);
}

export function sanitizeChildLabel(label) {
  return String(label ?? "agent")
    .replace(/siso-child-[a-z0-9-]+/gi, "child-agent")
    .replace(/child[_-]?[a-z0-9-]{6,}/gi, "child-agent")
    .replace(/task[_-]?[a-z0-9-]{6,}/gi, "task")
    .replace(/[a-f0-9]{12,}/gi, "agent");
}
