# SISO Extensions Catalog

Use the SISO Extensions Catalog before building new SISO agent features from scratch. It indexes Pi ecosystem packages from `https://pi.dev/packages` and turns them into searchable, scored integration candidates.

## Agent Usage

```js
siso({ action: "extension", op: "search", query: "subagent orchestration", limit: 10 })
siso({ action: "extension", op: "recommend", query: "persistent memory and session recall", limit: 8 })
siso({ action: "extension", op: "show", id: "pi.dev:pi-subagents" })
siso({ action: "extension", op: "audit-plan", id: "pi.dev:pi-subagents" })
siso({ action: "extension", op: "compare", ids: ["pi.dev:pi-subagents", "pi.dev:taskplane"] })
siso({ action: "extension", op: "approve", id: "pi.dev:pi-subagents", decision: "copy-pattern", capabilities: ["agent-orchestration"] })
siso({ action: "extension", op: "fetch", id: "pi.dev:pi-subagents", version: "0.24.0" })
siso({ action: "extension", op: "store" })
```

`op=fetch` stores a pinned tarball in `~/.siso/extensions/installed/`. It does not load or execute package code.

## Refresh

```bash
node scripts/scrape-pi-packages.mjs --pages=47 --detail-limit=all
```

For a faster refresh that only enriches the top catalog rows:

```bash
node scripts/scrape-pi-packages.mjs --pages=47 --detail-limit=150
```

## Rules

- Do not install third-party packages directly from the catalog without an audit.
- Prefer `copy-pattern` when the idea is useful but the package has unclear trust boundaries.
- Prefer `fork-candidate` when SISO needs hardening, source review, or API changes.
- Use `install-candidate` only after source, npm tarball, scripts, dependencies, and runtime behavior have been reviewed.
- Keep third-party package code inactive until it is activated for a specific profile, workspace, command, or tool pack.

## Generated Outputs

- `data/extensions/pi-packages.raw.json`: raw normalized scrape records.
- `data/extensions/extension-catalog.json`: agent-facing scored catalog.
- `data/extensions/shortlist.md`: human-readable ranked shortlist.
- `~/.siso/extensions/registry.json`: local approval/install/activation registry.
- `~/.siso/extensions/installed/`: local versioned tarball store; packages here are fetched, not automatically active.
