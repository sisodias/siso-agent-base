# SISO Extensions Catalog Design

## Goal

Build a first-class SISO Extensions Catalog so agents can discover, search, rank, audit, and integrate Pi ecosystem packages instead of rebuilding useful capabilities from scratch.

## Scope

The first implementation covers the Pi package catalog at `https://pi.dev/packages`. It creates a local structured index under `data/extensions`, exposes that index through the SISO router, and gives agents a repeatable audit path before installing third-party packages.

## Architecture

The catalog has three layers:

- `scripts/scrape-pi-packages.mjs` fetches Pi catalog pages, caches raw HTML, parses package cards and detail pages, scores packages, and writes normalized JSON plus a Markdown shortlist.
- `extensions/siso-agent-router/extension-catalog.js` loads the normalized JSON and supports `list`, `search`, `show`, `recommend`, `compare`, and `audit-plan` operations.
- `siso({ action: "extension" })` and `siso_extension_catalog` expose the catalog to agents without loading thousands of package pages into prompt context.

## Data Model

Each package candidate has stable fields:

- identity: `id`, `source`, `name`, `packageUrl`
- package links: `npmUrl`, `repoUrl`, `homepageUrl`, `installCommand`
- metadata: `author`, `version`, `license`, `published`, `downloadsMonthly`, `downloadsWeekly`, `sizeKb`, `types`
- content: `description`, `readmeText`, `piManifest`
- SISO intelligence: `categories`, `sisoFit`, `risk`, `recommendation`

## Safety

The catalog never installs packages. It only discovers and scores them. Any package with executable extension behavior, install scripts, external API calls, broad filesystem access, or prompt/system influence must be audited before installation. The audit plan recommends `npm view`, `npm pack`, manifest inspection, source comparison, and a dry-run install in a disposable workspace.

## UX

Agents use examples like:

```js
siso({ action: "extension", op: "search", query: "subagent orchestration", limit: 10 })
siso({ action: "extension", op: "recommend", query: "persistent memory and session recall" })
siso({ action: "extension", op: "audit-plan", id: "pi.dev:pi-subagents" })
```

The OpenTUI can later add an Extensions tab, but the MVP prioritizes structured agent access over a full browser UI.

## Success Criteria

- Scrape all Pi catalog pages into a normalized local index.
- Generate a human-readable shortlist.
- Let agents query and compare packages through the SISO router.
- Provide audit plans before installation decisions.
- Add smoke tests that use fixture data so verification does not depend on live network access.
