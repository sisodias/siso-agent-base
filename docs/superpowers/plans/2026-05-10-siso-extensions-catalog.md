# SISO Extensions Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Pi package intelligence catalog that SISO agents can query before building or installing extension features.

**Architecture:** Add a scraper that writes normalized data under `data/extensions`, a router-side query module, and smoke tests with fixtures. Expose the catalog through `siso({ action: "extension" })` and a dedicated `siso_extension_catalog` tool.

**Tech Stack:** Node.js ESM, built-in `fetch`, `node:fs`, `node:path`, SISO router tools, plain JSON/Markdown outputs.

---

### Task 1: Scraper and Normalizer

**Files:**
- Create: `scripts/scrape-pi-packages.mjs`
- Create: `docs/extensions-catalog.md`

- [x] Add a scraper with `--pages`, `--detail-limit`, `--out`, and `--fixture-dir` options.
- [x] Cache raw catalog/detail HTML under `data/extensions/sources/pi.dev`.
- [x] Parse package cards from SSR HTML.
- [x] Parse detail pages for version, license, manifest, README, downloads, and links.
- [x] Score package category fit and risk.
- [x] Write `pi-packages.raw.json`, `extension-catalog.json`, and `shortlist.md`.

### Task 2: Router Catalog Module

**Files:**
- Create: `extensions/siso-agent-router/extension-catalog.js`
- Create: `extensions/siso-agent-router/extension-catalog.d.ts`

- [x] Load `data/extensions/extension-catalog.json`.
- [x] Implement `list`, `search`, `show`, `recommend`, `compare`, and `audit-plan`.
- [x] Format compact text output so agent context stays small.

### Task 3: SISO Tool Exposure

**Files:**
- Modify: `extensions/siso-agent-router/index.js`

- [x] Add `extension` to the SISO domain list.
- [x] Wire `siso({ action: "extension" })` to the new module.
- [x] Register `siso_extension_catalog` as a dedicated tool.
- [x] Add compact tool-result rendering for extension rows.

### Task 4: Verification

**Files:**
- Create: `scripts/smoke-extension-catalog.mjs`
- Add fixture files under `test-space/extension-catalog-fixtures`

- [x] Verify scraper output from fixture HTML.
- [x] Verify search/recommend/show/compare/audit-plan behavior.
- [x] Verify the router module returns compact output.

### Task 5: Full Catalog Refresh

**Files:**
- Generated: `data/extensions/extension-catalog.json`
- Generated: `data/extensions/shortlist.md`

- [x] Run the scraper against live `pi.dev`.
- [x] Confirm package count, top recommendations, and shortlist output.
- [ ] Deep-audit the top packages before any install.
