# SISO TUI

Fresh terminal app shell for SISO using OpenTUI.

This is the next-generation terminal renderer. It keeps plain `siso` as the stable Pi-native fallback while `siso tui` experiments with a cleaner OpenCode-style app shell.

## Intent

```txt
SISO runtime/events
  -> packages/siso-tui render contract
  -> apps/siso-tui OpenTUI terminal shell
```

## Reused From The Old Prototype

- The old `apps/siso-opentui` remains as research/reference.
- Useful runtime/session ideas are being rewritten into `packages/siso-tui`.
- Vendored OpenCode files remain reference material only.

## Run

```bash
siso tui
```

Direct during development:

```bash
bun apps/siso-tui/src/main.tsx
```
