export const sisoTheme = {
  bg: "#090d12",
  bgSoft: "#0d1219",
  panel: "#101720",
  panelHover: "#151e2a",
  text: "#d8dee9",
  textStrong: "#eef5ff",
  muted: "#7b8494",
  dim: "#4b5565",
  faint: "#252d38",
  border: "#1f2937",
  borderActive: "#2f81f7",
  accent: "#8bd5ff",
  accent2: "#c099ff",
  success: "#8ce99a",
  warning: "#ffd166",
  error: "#ff6b6b",
};

export function statusColor(status: string) {
  if (status === "completed" || status === "ok") return sisoTheme.success;
  if (["failed", "timeout", "aborted", "stopped", "error"].includes(status)) return sisoTheme.error;
  if (["queued", "planned", "warn"].includes(status)) return sisoTheme.warning;
  return sisoTheme.accent;
}

export function statusIcon(status: string) {
  if (status === "completed" || status === "ok") return "✓";
  if (["failed", "timeout", "aborted", "stopped", "error"].includes(status)) return "✕";
  if (["queued", "planned"].includes(status)) return "○";
  return "◐";
}
