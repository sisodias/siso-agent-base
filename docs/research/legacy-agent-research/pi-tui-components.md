# Pi TUI Components Documentation Snapshot

Source: Pi docs page "TUI Components" / `@mariozechner/pi-tui`.
Captured from user-provided paste on 2026-05-07.

> Purpose: reference for building Pi extensions/custom tools/custom HUDs/overlays/widgets without having to rediscover Pi's TUI component model.

---

# TUI Components

pi can create TUI components. Ask it to build one for your use case.

Extensions and custom tools can render custom TUI components for interactive user interfaces. This page covers the component system and available building blocks.

Source: `@mariozechner/pi-tui`

## Component Interface

All components implement:

```ts
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  wantsKeyRelease?: boolean;
  invalidate(): void;
}
```

| Method | Description |
|---|---|
| `render(width)` | Return array of strings, one per line. Each line must not exceed width. |
| `handleInput?(data)` | Receive keyboard input when component has focus. |
| `wantsKeyRelease?` | If true, component receives key release events (Kitty protocol). Default: false. |
| `invalidate()` | Clear cached render state. Called on theme changes. |

The TUI appends a full SGR reset and OSC 8 reset at the end of each rendered line. Styles do not carry across lines. If you emit multi-line text with styling, reapply styles per line or use `wrapTextWithAnsi()` so styles are preserved for each wrapped line.

## Focusable Interface (IME Support)

Components that display a text cursor and need IME (Input Method Editor) support should implement the Focusable interface:

```ts
import { CURSOR_MARKER, type Component, type Focusable } from "@mariozechner/pi-tui";

class MyInput implements Component, Focusable {
  focused: boolean = false;

  render(width: number): string[] {
    const marker = this.focused ? CURSOR_MARKER : "";
    return [`> ${beforeCursor}${marker}\x1b[7m${atCursor}\x1b[27m${afterCursor}`];
  }
}
```

When a Focusable component has focus, TUI:

- Sets `focused = true` on the component
- Scans rendered output for `CURSOR_MARKER`, a zero-width APC escape sequence
- Positions the hardware terminal cursor at that location
- Shows the hardware cursor

This enables IME candidate windows to appear at the correct position for CJK input methods. The Editor and Input built-in components already implement this interface.

## Container Components with Embedded Inputs

When a container component, dialog, selector, etc. contains an Input or Editor child, the container must implement Focusable and propagate the focus state to the child. Otherwise, the hardware cursor won't be positioned correctly for IME input.

```ts
import { Container, type Focusable, Input } from "@mariozechner/pi-tui";

class SearchDialog extends Container implements Focusable {
  private searchInput: Input;

  private _focused = false;
  get focused(): boolean {
    return this._focused;
  }
  set focused(value: boolean) {
    this._focused = value;
    this.searchInput.focused = value;
  }

  constructor() {
    super();
    this.searchInput = new Input();
    this.addChild(this.searchInput);
  }
}
```

Without this propagation, typing with an IME (Chinese, Japanese, Korean, etc.) will show the candidate window in the wrong position on screen.

## Using Components

In extensions via `ctx.ui.custom()`:

```ts
pi.on("session_start", async (_event, ctx) => {
  const handle = ctx.ui.custom(myComponent);
  // handle.requestRender() - trigger re-render
  // handle.close() - restore normal UI
});
```

In custom tools via `pi.ui.custom()`:

```ts
async execute(toolCallId, params, onUpdate, ctx, signal) {
  const handle = pi.ui.custom(myComponent);
  // ...
  handle.close();
}
```

## Overlays

Overlays render components on top of existing content without clearing the screen. Pass `{ overlay: true }` to `ctx.ui.custom()`:

```ts
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyDialog({ onClose: done }),
  { overlay: true }
);
```

For positioning and sizing, use `overlayOptions`:

```ts
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new SidePanel({ onClose: done }),
  {
    overlay: true,
    overlayOptions: {
      width: "50%",
      minWidth: 40,
      maxHeight: "80%",
      anchor: "right-center",
      offsetX: -2,
      offsetY: 0,
      row: "25%",
      col: 10,
      margin: 2,
      visible: (termWidth, termHeight) => termWidth >= 80,
    },
    onHandle: (handle) => {
      // handle.setHidden(true/false) - toggle visibility
      // handle.hide() - permanently remove
    },
  }
);
```

## Overlay Lifecycle

Overlay components are disposed when closed. Don't reuse references. Create fresh instances.

Wrong:

```ts
let menu: MenuComponent;
await ctx.ui.custom((_, __, ___, done) => {
  menu = new MenuComponent(done);
  return menu;
}, { overlay: true });
setActiveComponent(menu);  // Disposed
```

Correct:

```ts
const showMenu = () => ctx.ui.custom((_, __, ___, done) =>
  new MenuComponent(done), { overlay: true });

await showMenu();
await showMenu();
```

See `overlay-qa-tests.ts` for comprehensive examples covering anchors, margins, stacking, responsive visibility, and animation.

## Built-in Components

Import from `@mariozechner/pi-tui`:

```ts
import { Text, Box, Container, Spacer, Markdown } from "@mariozechner/pi-tui";
```

### Text

Multi-line text with word wrapping.

```ts
const text = new Text(
  "Hello World",
  1,
  1,
  (s) => bgGray(s)
);
text.setText("Updated");
```

### Box

Container with padding and background color.

```ts
const box = new Box(
  1,
  1,
  (s) => bgGray(s)
);
box.addChild(new Text("Content", 0, 0));
box.setBgFn((s) => bgBlue(s));
```

### Container

Groups child components vertically.

```ts
const container = new Container();
container.addChild(component1);
container.addChild(component2);
container.removeChild(component1);
```

### Spacer

Empty vertical space.

```ts
const spacer = new Spacer(2);
```

### Markdown

Renders markdown with syntax highlighting.

```ts
const md = new Markdown(
  "# Title\n\nSome **bold** text",
  1,
  1,
  theme
);
md.setText("Updated markdown");
```

### Image

Renders images in supported terminals: Kitty, iTerm2, Ghostty, WezTerm.

```ts
const image = new Image(
  base64Data,
  "image/png",
  theme,
  { maxWidthCells: 80, maxHeightCells: 24 }
);
```

## Keyboard Input

Use `matchesKey()` for key detection:

```ts
import { matchesKey, Key } from "@mariozechner/pi-tui";

handleInput(data: string) {
  if (matchesKey(data, Key.up)) {
    this.selectedIndex--;
  } else if (matchesKey(data, Key.enter)) {
    this.onSelect?.(this.selectedIndex);
  } else if (matchesKey(data, Key.escape)) {
    this.onCancel?.();
  } else if (matchesKey(data, Key.ctrl("c"))) {
    // Ctrl+C
  }
}
```

Key identifiers:

- Basic keys: `Key.enter`, `Key.escape`, `Key.tab`, `Key.space`, `Key.backspace`, `Key.delete`, `Key.home`, `Key.end`
- Arrow keys: `Key.up`, `Key.down`, `Key.left`, `Key.right`
- With modifiers: `Key.ctrl("c")`, `Key.shift("tab")`, `Key.alt("left")`, `Key.ctrlShift("p")`
- String format also works: `"enter"`, `"ctrl+c"`, `"shift+tab"`, `"ctrl+shift+p"`

## Line Width

Critical: Each line from `render()` must not exceed the width parameter.

```ts
import { visibleWidth, truncateToWidth } from "@mariozechner/pi-tui";

render(width: number): string[] {
  return [truncateToWidth(this.text, width)];
}
```

Utilities:

- `visibleWidth(str)` - Get display width, ignores ANSI codes
- `truncateToWidth(str, width, ellipsis?)` - Truncate with optional ellipsis
- `wrapTextWithAnsi(str, width)` - Word wrap preserving ANSI codes

## Creating Custom Components

Example: Interactive selector

```ts
import {
  matchesKey, Key,
  truncateToWidth, visibleWidth
} from "@mariozechner/pi-tui";

class MySelector {
  private items: string[];
  private selected = 0;
  private cachedWidth?: number;
  private cachedLines?: string[];

  public onSelect?: (item: string) => void;
  public onCancel?: () => void;

  constructor(items: string[]) {
    this.items = items;
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.up) && this.selected > 0) {
      this.selected--;
      this.invalidate();
    } else if (matchesKey(data, Key.down) && this.selected < this.items.length - 1) {
      this.selected++;
      this.invalidate();
    } else if (matchesKey(data, Key.enter)) {
      this.onSelect?.(this.items[this.selected]);
    } else if (matchesKey(data, Key.escape)) {
      this.onCancel?.();
    }
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    this.cachedLines = this.items.map((item, i) => {
      const prefix = i === this.selected ? "> " : "  ";
      return truncateToWidth(prefix + item, width);
    });
    this.cachedWidth = width;
    return this.cachedLines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
```

Usage in an extension:

```ts
pi.registerCommand("pick", {
  description: "Pick an item",
  handler: async (args, ctx) => {
    const items = ["Option A", "Option B", "Option C"];
    const selector = new MySelector(items);

    let handle: { close: () => void; requestRender: () => void };

    await new Promise<void>((resolve) => {
      selector.onSelect = (item) => {
        ctx.ui.notify(`Selected: ${item}`, "info");
        handle.close();
        resolve();
      };
      selector.onCancel = () => {
        handle.close();
        resolve();
      };
      handle = ctx.ui.custom(selector);
    });
  }
});
```

## Theming

Components accept theme objects for styling.

In `renderCall`/`renderResult`, use the theme parameter:

```ts
renderResult(result, options, theme, context) {
  return new Text(theme.fg("success", "Done!"), 0, 0);
  const styled = theme.bg("toolPendingBg", theme.fg("accent", "text"));
}
```

Foreground colors via `theme.fg(color, text)`:

| Category | Colors |
|---|---|
| General | text, accent, muted, dim |
| Status | success, error, warning |
| Borders | border, borderAccent, borderMuted |
| Messages | userMessageText, customMessageText, customMessageLabel |
| Tools | toolTitle, toolOutput |
| Diffs | toolDiffAdded, toolDiffRemoved, toolDiffContext |
| Markdown | mdHeading, mdLink, mdLinkUrl, mdCode, mdCodeBlock, mdCodeBlockBorder, mdQuote, mdQuoteBorder, mdHr, mdListBullet |
| Syntax | syntaxComment, syntaxKeyword, syntaxFunction, syntaxVariable, syntaxString, syntaxNumber, syntaxType, syntaxOperator, syntaxPunctuation |
| Thinking | thinkingOff, thinkingMinimal, thinkingLow, thinkingMedium, thinkingHigh, thinkingXhigh |
| Modes | bashMode |

Background colors via `theme.bg(color, text)`:

- `selectedBg`
- `userMessageBg`
- `customMessageBg`
- `toolPendingBg`
- `toolSuccessBg`
- `toolErrorBg`

For Markdown, use `getMarkdownTheme()`:

```ts
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Markdown } from "@mariozechner/pi-tui";

renderResult(result, options, theme, context) {
  const mdTheme = getMarkdownTheme();
  return new Markdown(result.details.markdown, 0, 0, mdTheme);
}
```

## Debug logging

Set `PI_TUI_WRITE_LOG` to capture the raw ANSI stream written to stdout.

```bash
PI_TUI_WRITE_LOG=/tmp/tui-ansi.log npx tsx packages/tui/test/chat-simple.ts
```

## Performance

Cache rendered output when possible:

```ts
class CachedComponent {
  private cachedWidth?: number;
  private cachedLines?: string[];

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }
    // ... compute lines ...
    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
```

Call `invalidate()` when state changes, then `handle.requestRender()` to trigger re-render.

## Invalidation and Theme Changes

When the theme changes, the TUI calls `invalidate()` on all components to clear their caches. Components must properly implement `invalidate()` to ensure theme changes take effect.

### The Problem

If a component pre-bakes theme colors into strings via `theme.fg()`, `theme.bg()`, etc. and caches them, the cached strings contain ANSI escape codes from the old theme. Simply clearing the render cache isn't enough if the component stores themed content separately.

Wrong approach:

```ts
class BadComponent extends Container {
  private content: Text;

  constructor(message: string, theme: Theme) {
    super();
    this.content = new Text(theme.fg("accent", message), 1, 0);
    this.addChild(this.content);
  }
}
```

### The Solution

Components that build content with theme colors must rebuild that content when `invalidate()` is called:

```ts
class GoodComponent extends Container {
  private message: string;
  private content: Text;

  constructor(message: string) {
    super();
    this.message = message;
    this.content = new Text("", 1, 0);
    this.addChild(this.content);
    this.updateDisplay();
  }

  private updateDisplay(): void {
    this.content.setText(theme.fg("accent", this.message));
  }

  override invalidate(): void {
    super.invalidate();
    this.updateDisplay();
  }
}
```

### Pattern: Rebuild on Invalidate

```ts
class ComplexComponent extends Container {
  private data: SomeData;

  constructor(data: SomeData) {
    super();
    this.data = data;
    this.rebuild();
  }

  private rebuild(): void {
    this.clear();
    this.addChild(new Text(theme.fg("accent", theme.bold("Title")), 1, 0));
    this.addChild(new Spacer(1));

    for (const item of this.data.items) {
      const color = item.active ? "success" : "muted";
      this.addChild(new Text(theme.fg(color, item.label), 1, 0));
    }
  }

  override invalidate(): void {
    super.invalidate();
    this.rebuild();
  }
}
```

This pattern is needed when:

- Pre-baking theme colors
- Syntax highlighting
- Complex layouts that embed theme colors

Not needed when:

- Using theme callbacks
- Simple containers
- Stateless render computing themed output fresh every render call

## Common Patterns

### Pattern 1: Selection Dialog (SelectList)

Use SelectList from `@mariozechner/pi-tui` with DynamicBorder for framing.

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@mariozechner/pi-tui";

pi.registerCommand("pick", {
  handler: async (_args, ctx) => {
    const items: SelectItem[] = [
      { value: "opt1", label: "Option 1", description: "First option" },
      { value: "opt2", label: "Option 2", description: "Second option" },
      { value: "opt3", label: "Option 3" },
    ];

    const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
      container.addChild(new Text(theme.fg("accent", theme.bold("Pick an Option")), 1, 0));

      const selectList = new SelectList(items, Math.min(items.length, 10), {
        selectedPrefix: (t) => theme.fg("accent", t),
        selectedText: (t) => theme.fg("accent", t),
        description: (t) => theme.fg("muted", t),
        scrollInfo: (t) => theme.fg("dim", t),
        noMatch: (t) => theme.fg("warning", t),
      });
      selectList.onSelect = (item) => done(item.value);
      selectList.onCancel = () => done(null);
      container.addChild(selectList);
      container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
      container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

      return {
        render: (w) => container.render(w),
        invalidate: () => container.invalidate(),
        handleInput: (data) => { selectList.handleInput(data); tui.requestRender(); },
      };
    });

    if (result) ctx.ui.notify(`Selected: ${result}`, "info");
  },
});
```

Examples: `preset.ts`, `tools.ts`

### Pattern 2: Async Operation with Cancel (BorderedLoader)

```ts
import { BorderedLoader } from "@mariozechner/pi-coding-agent";

pi.registerCommand("fetch", {
  handler: async (_args, ctx) => {
    const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const loader = new BorderedLoader(tui, theme, "Fetching data...");
      loader.onAbort = () => done(null);

      fetchData(loader.signal)
        .then((data) => done(data))
        .catch(() => done(null));

      return loader;
    });

    if (result === null) ctx.ui.notify("Cancelled", "info");
    else ctx.ui.setEditorText(result);
  },
});
```

Examples: `qna.ts`, `handoff.ts`

### Pattern 3: Settings/Toggles (SettingsList)

```ts
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, type SettingItem, SettingsList, Text } from "@mariozechner/pi-tui";

pi.registerCommand("settings", {
  handler: async (_args, ctx) => {
    const items: SettingItem[] = [
      { id: "verbose", label: "Verbose mode", currentValue: "off", values: ["on", "off"] },
      { id: "color", label: "Color output", currentValue: "on", values: ["on", "off"] },
    ];

    await ctx.ui.custom((_tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new Text(theme.fg("accent", theme.bold("Settings")), 1, 1));

      const settingsList = new SettingsList(
        items,
        Math.min(items.length + 2, 15),
        getSettingsListTheme(),
        (id, newValue) => ctx.ui.notify(`${id} = ${newValue}`, "info"),
        () => done(undefined),
        { enableSearch: true },
      );
      container.addChild(settingsList);

      return {
        render: (w) => container.render(w),
        invalidate: () => container.invalidate(),
        handleInput: (data) => settingsList.handleInput?.(data),
      };
    });
  },
});
```

Examples: `tools.ts`

### Pattern 4: Persistent Status Indicator

```ts
ctx.ui.setStatus("my-ext", ctx.ui.theme.fg("accent", "● active"));
ctx.ui.setStatus("my-ext", undefined);
```

Examples: `status-line.ts`, `plan-mode.ts`, `preset.ts`

### Pattern 4b: Working Indicator Customization

```ts
ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg("accent", "●")] });

ctx.ui.setWorkingIndicator({
  frames: [
    ctx.ui.theme.fg("dim", "·"),
    ctx.ui.theme.fg("muted", "•"),
    ctx.ui.theme.fg("accent", "●"),
    ctx.ui.theme.fg("muted", "•"),
  ],
  intervalMs: 120,
});

ctx.ui.setWorkingIndicator({ frames: [] });
ctx.ui.setWorkingIndicator();
```

Only affects the normal streaming working indicator. Compaction and retry loaders keep built-in styling. Custom frames are rendered verbatim, so extensions must add their own colors when needed.

Examples: `working-indicator.ts`

### Pattern 5: Widgets Above/Below Editor

```ts
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"]);
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"], { placement: "belowEditor" });

ctx.ui.setWidget("my-widget", (_tui, theme) => {
  const lines = items.map((item, i) =>
    item.done
      ? theme.fg("success", "✓ ") + theme.fg("muted", item.text)
      : theme.fg("dim", "○ ") + item.text
  );
  return {
    render: () => lines,
    invalidate: () => {},
  };
});

ctx.ui.setWidget("my-widget", undefined);
```

Examples: `plan-mode.ts`

### Pattern 6: Custom Footer

Replace the footer. `footerData` exposes data not otherwise accessible to extensions.

```ts
ctx.ui.setFooter((tui, theme, footerData) => ({
  invalidate() {},
  render(width: number): string[] {
    // footerData.getGitBranch(): string | null
    // footerData.getExtensionStatuses(): ReadonlyMap<string, string>
    return [`${ctx.model?.id} (${footerData.getGitBranch() || "no git"})`];
  },
  dispose: footerData.onBranchChange(() => tui.requestRender()),
}));

ctx.ui.setFooter(undefined);
```

Token stats available via `ctx.sessionManager.getBranch()` and `ctx.model`.

Examples: `custom-footer.ts`

### Pattern 7: Custom Editor (vim mode, etc.)

```ts
import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@mariozechner/pi-tui";

type Mode = "normal" | "insert";

class VimEditor extends CustomEditor {
  private mode: Mode = "insert";

  handleInput(data: string): void {
    if (matchesKey(data, "escape")) {
      if (this.mode === "insert") {
        this.mode = "normal";
        return;
      }
      super.handleInput(data);
      return;
    }

    if (this.mode === "insert") {
      super.handleInput(data);
      return;
    }

    switch (data) {
      case "i": this.mode = "insert"; return;
      case "h": super.handleInput("\x1b[D"); return;
      case "j": super.handleInput("\x1b[B"); return;
      case "k": super.handleInput("\x1b[A"); return;
      case "l": super.handleInput("\x1b[C"); return;
    }
    if (data.length === 1 && data.charCodeAt(0) >= 32) return;
    super.handleInput(data);
  }

  render(width: number): string[] {
    const lines = super.render(width);
    if (lines.length > 0) {
      const label = this.mode === "normal" ? " NORMAL " : " INSERT ";
      const lastLine = lines[lines.length - 1]!;
      lines[lines.length - 1] = truncateToWidth(lastLine, width - label.length, "") + label;
    }
    return lines;
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) =>
      new VimEditor(theme, keybindings)
    );
  });
}
```

Key points:

- Extend CustomEditor to get app keybindings: escape to abort, ctrl+d to exit, model switching, etc.
- Call `super.handleInput(data)` for keys you don't handle.
- Factory pattern: `setEditorComponent` receives a factory function with tui, theme, keybindings.
- Pass `undefined` to restore default editor: `ctx.ui.setEditorComponent(undefined)`.

Examples: `modal-editor.ts`

## Key Rules

- Always use theme from callback. Don't import theme directly. Use theme from `ctx.ui.custom((tui, theme, keybindings, done) => ...)` callback.
- Always type DynamicBorder color param: `(s: string) => theme.fg("accent", s)`.
- Call `tui.requestRender()` after state changes.
- Return the three-method object: `{ render, invalidate, handleInput }`.
- Use existing components: SelectList, SettingsList, BorderedLoader cover 90% of cases.

## Examples mentioned

- Selection UI: `examples/extensions/preset.ts`
- Async with cancel: `examples/extensions/qna.ts`
- Settings toggles: `examples/extensions/tools.ts`
- Status indicators: `examples/extensions/plan-mode.ts`
- Working indicator: `examples/extensions/working-indicator.ts`
- Custom footer: `examples/extensions/custom-footer.ts`
- Custom editor: `examples/extensions/modal-editor.ts`
- Snake game: `examples/extensions/snake.ts`
- Custom tool rendering: `examples/extensions/todo.ts`
