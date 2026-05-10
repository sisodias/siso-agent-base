# Timeline Tool Skill UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compact Claude Code-style grouped tool, skill, and active-subagent timeline rows to the local SISO status UI.

**Architecture:** Keep raw Pi activity events as the input, add a focused timeline reducer in `extensions/siso-status/timeline.js`, and have the status extension render active subagents with loaders while rendering grouped tool/skill rows as plain compact text. This preserves the existing native loader polish and avoids leaking raw diagnostics under the editor.

**Tech Stack:** Node ESM, Pi extension APIs, `@mariozechner/pi-tui`, smoke scripts.

---

### Task 1: Timeline Reducer

**Files:**
- Create: `extensions/siso-status/timeline.js`
- Create: `scripts/smoke-status-timeline.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing smoke coverage**

Add a smoke that creates a status state, applies skill and tool events, and expects compact grouped rows such as `Skill improve-agent-system`, `Search repo`, and `Edit files`.

- [ ] **Step 2: Verify the smoke fails**

Run: `npm run smoke:timeline`

Expected: fails because `scripts/smoke-status-timeline.mjs` or `timeline.js` does not exist.

- [ ] **Step 3: Implement minimal reducer**

Create `timeline.js` with tool family classification, count aggregation, and bounded row formatting.

- [ ] **Step 4: Verify the smoke passes**

Run: `npm run smoke:timeline`

Expected: `SISO_STATUS_TIMELINE_SMOKE_OK`.

### Task 2: Status Widget Integration

**Files:**
- Modify: `extensions/siso-status/index.js`
- Modify: `extensions/siso-status/status-state.js`
- Modify: `scripts/smoke-status-agent-widget.mjs`

- [ ] **Step 1: Add failing widget assertions**

Extend the existing widget smoke so status rendering includes grouped skill/tool rows as plain text while keeping active subagent rows on native `Loader`.

- [ ] **Step 2: Verify the smoke fails**

Run: `npm run smoke:status-widget`

Expected: fails because timeline rows are not rendered.

- [ ] **Step 3: Wire timeline rows into the widget**

Export timeline rows from `status-state.js`, import them in `index.js`, and change widget construction so active child rows use `Loader` while timeline rows use `Text`.

- [ ] **Step 4: Verify the smoke passes**

Run: `npm run smoke:status-widget`

Expected: existing loader assertions still pass and new timeline row assertions pass.

### Task 3: Release Locally

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `VERSION`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `releases/latest.json`

- [ ] **Step 1: Run the full smoke chain**

Run all SISO smoke scripts.

- [ ] **Step 2: Bump to `0.1.39`**

Update package/version metadata and changelog with the timeline/grouped UI changes.

- [ ] **Step 3: Install locally and verify**

Run install-local, `siso version`, `siso --version`, and `siso doctor`.
