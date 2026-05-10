# SISO Extension Harness Scalability

## Summary

SISO should treat external packages as a searchable supply chain, not as always-on runtime features. The harness can support thousands of indexed extensions if it separates discovery, approval, installation, activation, and runtime exposure.

## Current SISO Feature Areas

| SISO area | Current local implementation | Comparable packages | Early read |
|---|---|---|---|
| Agent routing | `route-policy.js`, profile registry, native subagent bridge | `pi-subagents`, `taskplane`, `pi-crew`, `@0xkobold/pi-orchestration`, `@dreki-gg/pi-subagent` | SISO is stronger on Bifrost/model routing and scoped child records. Pi packages may be stronger on polished user-facing workflows and packaged prompts. |
| Workflow/task execution | `workflow-layer.js`, `task-store.js`, scoped task registry | `taskplane`, `pi-crew`, `pi-agent-flow`, `@juicesharp/rpiv-todo`, `pi-kanban`, `pi-board` | SISO has durable task metadata and model routing. External packages may have better TUI/board UX and prompt ergonomics. |
| Context/memory | `siso-context-manager`, context filter, typed memory, librarian, retrieval pointers | `@samfp/pi-memory`, `pi-hermes-memory`, `context-mode`, `pi-memctx`, `pi-continue` | SISO is stronger on provider-payload filtering and lifecycle capture. External packages may be ahead on FTS search, session search UX, and continuation ledgers. |
| Web/research | SISO currently relies on available agent/browser/web tools plus router tooling | `pi-web-access`, `pi-smart-fetch`, `@ollama/pi-web-search`, `@juicesharp/rpiv-web-tools` | External packages are likely ahead for Pi-native web/fetch/PDF/YouTube convenience. SISO should adopt through an adapter, not duplicate every provider. |
| MCP/integrations | SISO router/tools and available Codex apps; no broad Pi MCP import layer | `pi-mcp-adapter`, `@spences10/pi-mcp` | External packages may be ahead on MCP server import UX. SISO should use a compatibility shim and keep permissions centralized. |
| Code intelligence | `tooling-actions.js` repo search, repo index, code query, sourcegraph, outlines | `pi-lens`, `pi-simplify` | SISO has useful bounded search/index tools. `pi-lens` may be ahead on live LSP/linter/typecheck feedback. |
| Safety/permissions | `worker-guard.js`, child context guard, secret-path checks, scoped records | `@gotgenes/pi-permission-system`, `pi-skill-guard` | SISO should keep safety as core infrastructure. External packages can provide ideas, but should not own global permissions. |
| Status/TUI | `siso-status`, OpenTUI app, tool display, timeline, Extensions view | `@vtstech/pi-status`, `pi-powerline-footer`, `pi-kanban`, `glimpseui` | SISO has integrated status and Bifrost telemetry. External packages may have better widgets and visual affordances. |
| Ask-user/advisor/side-channel | request-user style tools in Codex context, SISO council/oracle route | `@juicesharp/rpiv-ask-user-question`, `pi-ask-user`, `@juicesharp/rpiv-advisor`, `pi-btw`, `@juicesharp/rpiv-btw` | External packages may be better packaged UX. SISO should expose these as optional interaction tools. |

## What Looks Better Outside SISO

- `pi-subagents` has a richer packaged orchestration UX: named roles, prompts, chains, background runs, and natural-language workflows.
- `context-mode`, `pi-hermes-memory`, and `@samfp/pi-memory` suggest stronger search/memory products than a simple JSONL memory store.
- `pi-mcp-adapter` likely solves MCP import/connect UX faster than building it all in SISO.
- `pi-lens` is probably ahead on LSP/lint/type feedback.
- `@juicesharp/rpiv-todo`, `pi-kanban`, and `pi-board` look stronger for user-visible task surfaces.
- `pi-web-access` and `pi-smart-fetch` are likely ahead for Pi-native web/PDF/GitHub/YouTube fetch workflows.

## What SISO Should Keep Core

- Model routing through Bifrost.
- Permission boundaries and child-agent guardrails.
- Context filtering and provider-payload slimming.
- Durable child records, task ownership, and scoped visibility.
- Extension approval policy.
- Runtime activation and tool-budget control.

These are harness concerns. Third-party packages should not own them globally.

## Scalable Extension Model

Use a five-stage lifecycle:

1. **Indexed**: package appears in `data/extensions/extension-catalog.json`; no code is installed or loaded.
2. **Audited**: tarball, repo, manifest, scripts, dependencies, and behavior are reviewed.
3. **Approved**: package is allowed by policy, pinned by version/integrity, and assigned capabilities.
4. **Installed**: package bits exist in a local extension store, but are not loaded by default.
5. **Activated**: package is enabled for a specific profile, workspace, task, session, or user command.

Runtime rule:

```text
thousands indexed -> hundreds audited -> tens installed -> single digits active per session
```

## Proposed Directory Layout

```text
data/extensions/
  extension-catalog.json
  shortlist.md

.siso/extensions/
  registry.json
  approvals/
    pi-subagents.json
  installed/
    pi-subagents/0.24.0/
  manifests/
    pi-subagents.json
  activation/
    workspace.json
    profiles/
      minimax.scout.json
      spark.worker.json
```

## Extension Registry Record

```json
{
  "id": "pi.dev:pi-subagents",
  "name": "pi-subagents",
  "version": "0.24.0",
  "source": "npm",
  "integrity": "sha512-...",
  "status": "approved",
  "capabilities": ["agent-orchestration", "task-workflow"],
  "risk": {
    "score": 25,
    "requiresUserApproval": true
  },
  "activation": {
    "default": false,
    "profiles": ["planner", "orchestrator"],
    "commands": ["/parallel-review"],
    "tools": ["subagent"]
  }
}
```

## Avoiding Harness Bloat

The harness should not import every extension at startup. It should:

- Load only a compact registry index at startup.
- Discover tools lazily based on active profile and task.
- Use tool packs: `web`, `memory`, `orchestration`, `mcp`, `code-intel`, `ui`.
- Cap active tools per model request.
- Keep extension README/source out of context unless explicitly requested.
- Summarize extension capabilities into 1-3 line cards.
- Disable extensions by workspace/profile instead of uninstalling them.
- Use version pinning and integrity checks for reproducibility.

## Decision Policy

| Decision | Use when |
|---|---|
| Install | Package is audited, low risk, maintained, and cleanly scoped. |
| Fork | Package solves a strategic SISO gap but needs hardening or Bifrost/SISO integration. |
| Copy pattern | Idea is good but package runtime is too broad, risky, stale, or incompatible. |
| Watch | Promising but not urgent or not mature enough. |
| Ignore | Duplicative, unsafe, unmaintained, or irrelevant. |

## First Integration Candidates

1. `pi-subagents`: deep-audit for orchestration patterns; likely fork/copy-pattern rather than direct install because SISO already owns child records and routing.
2. `@samfp/pi-memory` or `pi-hermes-memory`: compare memory/search design against SISO context manager.
3. `pi-mcp-adapter`: audit as MCP import layer candidate.
4. `pi-lens`: inspect for LSP/lint/typecheck feedback patterns.
5. `@juicesharp/rpiv-todo` / `pi-kanban`: inspect task UI patterns for OpenTUI.
6. `pi-web-access` / `pi-smart-fetch`: audit web/PDF/GitHub fetch scope.

## Versioned Rollout

- **v0**: catalog only; no installs.
- **v1**: audit workflow and approved registry.
- **v2**: install store with version pins and integrity checks.
- **v3**: lazy activation by profile/task/tool pack.
- **v4**: extension compatibility shim for Pi package manifests.
- **v5**: extension marketplace UI with search, audit status, enable/disable, and per-workspace policies.
