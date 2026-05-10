# Changelog

## 2026-05-10

- Created `persistent-agent-system-improver` as the first live persistent agent/team.
- Collapsed the previous `atlas` / `forge` split because it was premature and too abstract.
- Switched to descriptive naming so the agent's purpose is obvious from its name.

## 2026-05-10 — Manual run/inspect workflows

- Added manual workflow for running persistent agents.
- Added manual workflow for inspecting persistent agents.
- Added templates for agent folders and run reports.
- Added the first run report for `persistent-agent-system-improver`.

## 2026-05-10 — Persistence activation skill

- Added profile skill `persistence` for activating persistent workhorse agents from any chat agent.
- Added workflow doc for persistence skill activation and future TUI hooks.
- Added inbox task to test the persistent workhorse loop.

## 2026-05-10 — Session-owned persistent workhorse model

- Added workflow for session agents to create their own persistent workhorse agents.
- Added continuation states: `active`, `done`, `blocked-needs-user`, `blocked-needs-permission`, `paused-by-user`, `failed`.
- Added template files for `continuation.md` and `questions.md`.

## 2026-05-10 — Session workhorse continuation shim

- Added `.siso/agents/workflows/continue-session-workhorse.md` as the MVP runner/checker for active session workhorses.
- Added `.siso/agents/templates/session-next-run-request-template.md`.
- Updated the session workhorse workflow/template so active non-terminal runs must write `outbox/next-run-request.md` with the exact next dispatch prompt.

## 2026-05-10 — CLI activation loop

- Added `bin/siso-agent` for `siso agent list`, `siso agent inspect <id>`, and `siso agent run <id>`.
- Wired the top-level `bin/siso` wrapper to dispatch `agent` and `agents` commands before falling through to Pi.
- Added smoke coverage for the persistent-agent CLI.
- Added `siso-agent` to the install/update copy list and release-surface smoke.
- Added durable run records for the first command-backed activation request.
