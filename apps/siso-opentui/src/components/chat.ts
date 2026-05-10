import { fit, wrapText } from "../ui/layout";

export type ChatMessage = { role: string; text: string };

export function chatRows(messages: ChatMessage[], width: number, maxRows: number) {
  const rows: string[] = [];
  for (const msg of messages.slice(-8)) {
    const label = msg.role === "user" ? "You" : msg.role === "tool" ? "Tool" : "SISO";
    rows.push(fit(label, width));
    rows.push(...wrapText(`  ${msg.text}`, width));
    rows.push("");
  }
  return rows.slice(Math.max(0, rows.length - maxRows)).join("\n");
}
