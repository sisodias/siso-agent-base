import { card, fit } from "../ui/layout";

export type CommandItem = { key: string; label: string; description: string };
export const commands: CommandItem[] = [
  { key: "c", label: "Chat", description: "Return to transcript" },
  { key: "a", label: "Agents", description: "Show recent child agents" },
  { key: "e", label: "Extensions", description: "Browse SISO extension candidates" },
  { key: "t", label: "Tools", description: "Show recent activity" },
  { key: "s", label: "Status", description: "Show SISO status" },
  { key: "r", label: "Refresh", description: "Reload local snapshot" },
  { key: "q", label: "Quit", description: "Exit app" },
];
export function commandPaletteRows(width: number, selected = 0) {
  const rows = ["Type shortcut or use ↑/↓ then Enter", ""];
  commands.forEach((command, index) => {
    rows.push(`${index === selected ? "›" : " "} ${command.key.padEnd(2)} ${command.label.padEnd(10)} ${command.description}`);
  });
  return card("commands", rows, width).map((row) => fit(row, width)).join("\n");
}
