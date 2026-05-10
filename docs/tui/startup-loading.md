# SISO Startup Loading

Status: first slice
Owner surface: plain `siso` / Pi native interactive TUI

Plain `siso` now owns a tiny Pi-native startup header during interactive TUI initialization:

```txt
SISO
loading workspace · Spark · extensions
```

The hook is `InteractiveMode.init()` in Pi's `modes/interactive/interactive-mode.js`.

Sequence:

1. Build the normal Pi native layout.
2. Before `this.ui.start()`, install a SISO loading header when `APP_NAME` is `SISO`.
3. Start the TUI.
4. Await `this.rebindCurrentSession()` while the loading header is visible.
5. Briefly flip to a ready header.
6. Clear the built-in header immediately after `renderInitialMessages()` so the user lands in normal chat.

This deliberately does not sleep or delay startup. The loading state lasts only as long as Pi already spends binding the session, model, resources, and extensions.

Patch owners:

- `packages/siso-tui/src/pi-native/startup-loading.js`
- `packages/siso-tui/src/pi-native/patch-rules.js`
- `scripts/patch-pi-native-renderers.mjs`

Verification:

```bash
node scripts/patch-pi-native-renderers.mjs
npm run smoke:renderers
```

Control:

```bash
SISO_PI_STARTUP_LOADING=0 siso
```

## Next Step

Measure a real `siso` launch with `npm run measure:siso-startup` and decide whether the ready header should become a persistent first-chat welcome line or remain transient.
