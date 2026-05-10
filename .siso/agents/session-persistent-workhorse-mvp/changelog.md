# Changelog

## 2026-05-10 01:40

- Added `.siso/bin/persist prompt <agent-id> [run-file]` for rendering background child assignments from durable state.
- Improved `.siso/bin/persist status` with concise state fields and operator next commands.
- Updated `.siso/bin/persist tick` output to reference the prompt renderer.
- Fixed tick worklog append bug caused by backticks around `$run`.
