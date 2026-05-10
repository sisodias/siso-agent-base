# OpenCode TUI Vendor Notes

Source: https://github.com/anomalyco/opencode
License: MIT, preserved at `apps/siso-opentui/LICENSE.opencode`.

The files in this directory are a vendored/adaptation staging copy of OpenCode's TUI frontend (`packages/opencode/src/cli/cmd/tui`). They are not the active SISO OpenTUI app yet.

Goal:

1. Keep OpenCode's proven OpenTUI/Solid app structure available locally.
2. Replace OpenCode backend imports with SISO adapters in `../siso`.
3. Move components into active use incrementally:
   - theme/context
   - startup loading
   - dialog/toast shell
   - home/session routing
   - prompt textarea
   - session/tool/permission views

Do not edit these files blindly. Port small slices into SISO-owned modules or adapt imports deliberately.
