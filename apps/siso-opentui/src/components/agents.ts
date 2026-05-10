import type { SisoSnapshot } from "../siso/orchestrator";
import { card, fit, sanitizeChildId } from "../ui/layout";
import { statusIcon } from "../ui/theme";

export function agentRows(status: SisoSnapshot, width: number, maxRows: number) {
  const body: string[] = [];
  for (const child of status.children.slice(0, 8)) {
    const label = sanitizeChildId(child.id);
    const tools = child.tools === undefined ? "?" : String(child.tools);
    body.push(`${statusIcon(child.status)} ${label} · ${child.status} · ${child.profile} · ${tools} tools`);
    body.push(`  ${child.task}`);
  }
  if (!body.length) body.push("No child runs found");
  return card("agents", body, width).slice(0, maxRows).map((row) => fit(row, width)).join("\n");
}
