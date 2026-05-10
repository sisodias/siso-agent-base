---
name: improve-agent-system
description: Use before changing SISO Agent Base, Pi/SISO agent infrastructure, router/status/context/lifecycle extensions, native renderer patches, profile skills, or release/version/changelog files. Guides the agent through reading current version/changelog, finding the active install path, making a scoped improvement, verifying it, installing locally, and recording the change.
---

# Improve Agent System

Use this workflow for SISO/Pi agent-system improvements.

## Workflow

1. Establish the active surface:
   - `type -a siso`
   - `siso version`
   - `siso --version`
   - `siso doctor`
   - Read `VERSION`, `CHANGELOG.md`, `releases/latest.json`, and the files likely to own the behavior.

2. Identify the smallest high-leverage issue:
   - Prefer root-cause fixes over UI-only symptoms.
   - Check whether the active install under `~/.siso-agent-base` differs from the source repo.
   - Do not touch friend/customer runtimes unless explicitly asked.

3. Make the change in the source package first:
   - Keep edits scoped.
   - Add or update a smoke/test that fails before the fix when practical.
   - Update active installed files only after source verification passes.

4. Verify:
   - Run the focused smoke/test.
   - Run package smoke scripts relevant to the touched area.
   - Run `siso doctor` after installing locally.
   - For renderer changes, verify patch idempotence: re-run the patch and expect `changed=0`.

5. Version and record:
   - Bump `VERSION`, `package.json`, `package-lock.json`, and `releases/latest.json`.
   - Add a dated `CHANGELOG.md` entry with user-visible behavior, guardrails/tests, and migration notes if any.
   - Keep the changelog factual; mention paths only when useful.

6. Close with:
   - Current active `siso version`.
   - Verification commands that passed.
   - Files changed.
   - Any next high-leverage issue discovered but not fixed.

## Guardrails

- Do not broad-rewrite the agent system.
- Do not remove existing SISO polish, router, context, lifecycle, status, or Bifrost behavior unless replacing it with verified equivalent behavior.
- Do not claim the runtime changed until the active local install has been updated and `siso doctor` passes.
- Avoid leaking secrets, raw provider payloads, or large child logs into prompts, changelogs, or final responses.
