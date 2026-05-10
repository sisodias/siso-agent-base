import { fit, line } from "../ui/layout";

export function promptBox(input: string, width: number, placeholder = "Message SISO…", focused = true) {
  const promptText = input || placeholder;
  const title = focused ? " prompt " : "";
  const top = `╭${line(Math.max(0, width - title.length - 2))}${title}╮`;
  return [top, fit(`│ › ${promptText}`, width - 1) + "│", `╰${line(width - 2)}╯`].join("\n");
}
