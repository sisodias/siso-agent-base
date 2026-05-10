import type { SisoOpenTuiSession } from "../siso/sessions";
import { card, fit, twoColumn } from "../ui/layout";

function recentRows(sessions: SisoOpenTuiSession[], selected: number, width: number) {
  const rows = [`${selected === 0 ? "›" : " "} n  New session`];
  sessions.forEach((session, index) => {
    const cursor = selected === index + 1 ? "›" : " ";
    const age = new Date(session.updatedAt).toLocaleTimeString();
    rows.push(`${cursor} ${String(index + 1).padEnd(2)} ${session.title} · ${age}`);
  });
  if (!sessions.length) rows.push("   No saved sessions yet");
  return rows.map((row) => fit(row, width));
}

export function homeRows(sessions: SisoOpenTuiSession[], selected: number, width: number, maxRows: number) {
  const left = ["SISO", "", "OpenTUI app mode", "", "Enter open", "n new", "a agents", "e extensions", "s status", "q quit"];
  const right = card("recent sessions", recentRows(sessions, selected, Math.max(20, Math.floor(width * 0.58))), Math.max(30, Math.floor(width * 0.58)));
  return twoColumn(left, right, width).slice(0, maxRows).join("\n");
}
