import type { SisoSnapshot } from "../siso/orchestrator";
import { card, fit } from "../ui/layout";

export function toolRows(status: SisoSnapshot, width: number, maxRows: number) {
  const body: string[] = [];
  for (const child of status.children.slice(0, 8)) {
    const tools = child.tools ?? 0;
    const tokens = child.tokens ? `${child.tokens} tok` : "tokens n/a";
    body.push(`${child.status.padEnd(10)} ${child.profile} · ${tools} tools · ${tokens}`);
    body.push(`  ${child.task}`);
  }
  if (!body.length) body.push("No recent tool activity found");
  return card("activity", body, width).slice(0, maxRows).map((row) => fit(row, width)).join("\n");
}
