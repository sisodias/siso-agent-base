# Capability Ideas Inbox

This file only lists capabilities that are still idea-only or deliberately not wired into normal runtime checks. Active capabilities belong in `current.md` and `registry.json`.

## Capability Audit Smoke

Status: idea
Priority: medium

Automatically compare `package.json` scripts, changelog headings/bullets, router modules, docs, and capability registry entries to flag likely missing or stale capability records.

## Live Event-Driven TUI

Status: idea
Priority: high

Connect the TUI to live structured agent/tool/file/status events instead of static demo fixtures. The important V2 requirement is per-session filtering so child-agent rows and completion payloads cannot bleed across chats.

## Capability CLI

Status: idea
Priority: medium

Add `siso capability list/search/show/audit/changelog` commands backed by `docs/capabilities/registry.json`. Tooling actions already exist; the missing piece is a first-class user command surface.

## Autopilot Smoke/Fix Loop

Status: partially promoted; full checkpointed edit/rerun loop remains idea
Priority: high

`0.1.109` ships a no-edit repair controller that runs a scoped check, blocks unsafe commands, summarizes failures, and gathers repair context. The remaining idea is the full checkpointed inspect/edit/test loop: checkpoint before edits, apply or delegate narrow fixes, rerun validation, add read-only verifier verdicts, and return compact progress/results without flooding the parent chat.

## Promoted Out Of Ideas

These are no longer idea-only and should not be re-added above unless the registry regresses:

- Source Drift Detector — validated
- Agent Contracts — implemented/draft enforcement layer
- Agent Flight Recorder — validated MVP with manual recorders and analysis
- Autopilot Fix Loop — validated no-edit repair controller
