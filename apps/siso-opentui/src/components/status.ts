import type { SisoSnapshot } from "../siso/orchestrator";
import { card, fit } from "../ui/layout";

export function statusRows(status: SisoSnapshot, width: number, maxRows: number) {
  return card("status", [
    `cwd ${status.cwd}`,
    `model ${status.model}`,
    `Bifrost ${status.bifrost}`,
    `orchestrator ${status.orchestrator.mode}`,
    `agents active ${status.active} · done ${status.done} · failed ${status.failed}`,
    `loaded ${status.loadedAt.toLocaleTimeString()}`,
  ], width).slice(0, maxRows).map((row) => fit(row, width)).join("\n");
}
