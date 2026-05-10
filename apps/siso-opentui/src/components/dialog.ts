import { card } from "../ui/layout";
export function dialogRows(title: string, body: string[], width: number) {
  const modalWidth = Math.min(72, Math.max(38, width - 8));
  const left = Math.max(0, Math.floor((width - modalWidth) / 2));
  const pad = " ".repeat(left);
  return card(title, body, modalWidth).map((row) => pad + row).join("\n");
}
