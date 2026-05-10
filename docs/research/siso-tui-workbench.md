# SISO TUI Workbench

This is the safe visual iteration loop for the SISO R1 UI rebuild.

It is demo-only: it does not change live routing, subagent notifications, Bifrost, context filtering, launcher behavior, or Pi runtime components.

## Run one surface

```bash
npm run tui:demo -- composer
npm run tui:demo -- agent-ops --width=100 --height=40
npm run tui:demo -- tool-cards --width=80
npm run tui:demo -- permissions-full
npm run tui:demo -- all
```

## Generate a gallery

```bash
npm run tui:gallery
open artifacts/tui-demo/README.md
```

For width variants:

```bash
node scripts/tui-demo-gallery.mjs --all-widths
```

## Smoke test

```bash
npm run smoke:tui-demo
```

The smoke renders all registered demo modes at 40, 80, and 120 columns and checks for stable labels, no raw child IDs, no obvious diagnostics, and line-width safety.

## Current implementation

- Demo runner: `scripts/tui-demo.mjs`
- Components: `scripts/tui-demo-components/index.mjs`
- Theme/ANSI helpers: `scripts/tui-demo-components/theme.mjs`
- Smoke: `scripts/smoke-tui-demo.mjs`
- Gallery generator: `scripts/tui-demo-gallery.mjs`
- Inventory: `docs/research/siso-r1-tui-component-inventory.md`

## How to improve safely

1. Add or refine a component in `scripts/tui-demo-components/index.mjs`.
2. Add a deterministic demo mode in `scripts/tui-demo.mjs`.
3. Add mode-specific smoke labels in `scripts/smoke-tui-demo.mjs`.
4. Run:

```bash
npm run smoke:tui-demo
npm run tui:gallery
```

5. Review `artifacts/tui-demo/README.md`.
6. Only after the demo looks good, discuss wiring a small primitive into live runtime.

## First live integration candidates

Safest first:

- `ToolCard` / tool summary rows
- `AgentOpsPanel` / active child-agent rows
- `StatusLine` / non-invasive footer indicators

Riskier, do later:

- `PromptComposer`
- full transcript viewport
- permission approval flow
- live renderer migration
