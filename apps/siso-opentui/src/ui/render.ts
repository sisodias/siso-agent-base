import type { TextRenderable } from "@opentui/core";
import { sisoTheme } from "./theme";

export function setBlock(node: TextRenderable, opts: { left: number; top: number; width: number; height: number; content: string; fg?: string }) {
  node.left = opts.left;
  node.top = opts.top;
  node.width = opts.width;
  node.height = opts.height;
  node.fg = opts.fg ?? sisoTheme.text;
  node.content = opts.content;
}
