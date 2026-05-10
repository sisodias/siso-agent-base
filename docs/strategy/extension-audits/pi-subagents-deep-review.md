# pi-subagents Deep Review

Date: 2026-05-10

## Package Snapshot

- Package: `pi-subagents@0.24.0`
- npm integrity: `sha512-qg8Kx7zW9+P7a7o3X4J3poerYnIP125oloKOeScxJlrMIKwUCORBFGZixzdmQEo83SOcoPt3UFjyYeDsHmouIw==`
- Published: 2026-05-03
- Tarball: 81 files, 242024 bytes packed, 966402 bytes unpacked
- Local review copy: `/tmp/siso-pi-subagents-review/package`
- SISO store copy: `~/.siso/extensions/installed/pi-subagents/0.24.0`

## Verdict

Do not wire `pi-subagents` directly into SISO as an always-on runtime.

Use it as a high-value reference package and selectively port/fork patterns into SISO:

- Copy/fork the subagent UX ideas: chain execution, parallel task schema, slash prompts, long-running controls, and worktree isolation.
- Keep SISO-owned routing, child records, task scope, lifecycle capture, Bifrost model selection, and permissions.
- Only execute package code later through the extension store + activation registry + compatibility shim.

## Why This Is Not A Simple Install

`pi-subagents` is a full runtime extension, not just prompts.

It registers a `subagent` tool, message renderers, slash bridges, prompt-template delegation, foreground/background execution, async job tracking, result watchers, and session cleanup. The extension entrypoint makes this clear in `/tmp/siso-pi-subagents-review/package/src/extension/index.ts:1` and the tool registration sits around `/tmp/siso-pi-subagents-review/package/src/extension/index.ts:398`.

The package also shells out to `pi` for child execution from `/tmp/siso-pi-subagents-review/package/src/runs/background/subagent-runner.ts:207`, manages worktrees through git commands in `/tmp/siso-pi-subagents-review/package/src/runs/shared/worktree.ts:83`, and writes session/artifact state.

That overlaps with SISO core responsibilities.

## What pi-subagents Does Better

- Richer user-facing subagent surface:
  - single, parallel, and chain modes in one tool schema
  - visible chain template variables like `{task}`, `{previous}`, and `{chain_dir}`
  - packaged slash prompts and prompt-template bridge

- Better foreground/background UX:
  - async execution, status, interrupt, resume, and notification flows
  - TUI renderers for collapsed/expanded subagent results
  - result watcher and completion notices

- Stronger multi-agent workflow ergonomics:
  - native `tasks[]` parallel schema
  - `chain[]` sequential pipeline schema
  - worktree isolation option for parallel edits
  - intercom bridge for parent-child follow-up

- Useful hardening patterns:
  - output truncation and artifact capture
  - hidden error detection
  - model fallback attempts
  - completion guard for implementation tasks that made no edits

## What SISO Does Better

- Bifrost/model routing is centralized in SISO. `spawn-layer.js` chooses profiles and models before spawning.
- SISO already enforces child depth, fleet budgets, and max-parallel policy in `checkFleetSpawnPolicy`.
- SISO writes scoped child records and task artifacts into its own task registry.
- SISO has a native bridge that can call an available Pi `subagent` tool but still wraps the result in SISO status records.
- SISO workflow creates durable parent/worker task records instead of treating parallel work as only a tool response.

## Integration Decision

Use this package as `copy-pattern` now, not `install`.

The clean architecture is:

```text
SISO router owns routing, permissions, task scope, lifecycle, and telemetry
  |
  +-- SISO extension registry decides what is approved and active
        |
        +-- pi-subagents patterns are ported/forked behind SISO contracts
              |
              +-- optional future compatibility shim may call package code lazily
```

Do not let package code own global child routing, model selection, session storage, or permission policy.

## Porting Queue

1. Chain/parallel schema adapter:
   - Done in SISO workflow layer.
   - Added SISO-native support for `tasks[]`, `chain[]`, `{task}`, `{previous}`, task `count`, bounded `concurrency`, per-step profile routing, stage metadata, and output/file-only handoff references.

2. Worktree isolation:
   - Port the clean-git worktree flow, but adjust it for SISO's dirty-worktree reality and approval rules.

3. Subagent result UX:
   - Copy the collapsed/expanded result card and notification ideas into OpenTUI/SISO status.

4. Async resume/control:
   - Compare SISO `controlChildRun` with `pi-subagents` interrupt/resume and add live follow-up where our native bridge exposes intercom.

5. Completion guard:
   - Add a SISO guard that detects implementation children returning only plans when the task required edits.

6. Saved chain recipes:
   - Add reusable SISO workflow recipes for review, research, context-build, handoff-plan, and cleanup without loading `pi-subagents` slash-command runtime.

7. Doctor diagnostics:
   - Add a SISO subagent doctor view that checks child-run dirs, task scope, native bridge availability, extension registry state, and async/runtime config.

8. Intercom/live follow-up:
   - Compare SISO child control/resume with `pi-subagents` live intercom bridge before deciding whether to port this directly or keep SISO resume process-based.

## Ported Into SISO

The first tranche is now SISO-native:

- Explicit parallel workflow tasks:

```js
siso({
  action: "workflow",
  task: "Ship the feature",
  options: {
    tasks: [
      { agent: "scout", task: "Map the implementation", output: "handoff/scout.md", outputMode: "file-only" },
      { agent: "reviewer", task: "Review risks" },
      { agent: "worker", task: "Patch the implementation" }
    ],
    concurrency: 2
  }
})
```

- Sequential chain workflows with `{previous}` handoff:

```js
siso({
  action: "workflow",
  task: "Build the handoff",
  options: {
    chain: [
      { agent: "scout", task: "Find facts for {task}" },
      { agent: "planner", task: "Plan from {previous}" },
      { parallel: [
        { agent: "worker", task: "Implement from {previous}" },
        { agent: "reviewer", task: "Review from {previous}" }
      ] }
    ]
  }
})
```

SISO still owns routing, task records, child lifecycle, activation policy, and Bifrost model selection.

## Risk Notes

- The package has a CLI/bin entrypoint and Pi extension entrypoint.
- It spawns child `pi` processes and passes environment/context into them.
- It writes state under Pi session/artifact directories.
- It can create git worktrees and optional setup hooks.
- Direct activation could conflict with SISO's own `spawn`, `workflow`, `task-registry`, and native bridge semantics.

## Current SISO Store State

The package tarball has been fetched into the extension store with integrity verification. It is not loaded by default.

```text
status=installed
loaded=false
path=~/.siso/extensions/installed/pi-subagents/0.24.0
integrity=sha512-qg8Kx7zW9+P7a7o3X4J3poerYnIP125oloKOeScxJlrMIKwUCORBFGZixzdmQEo83SOcoPt3UFjyYeDsHmouIw==
```

## Practical Rule

If a package only adds a clean tool, use a direct adapter.

If a package owns orchestration/runtime behavior, use fork or copy-pattern.

`pi-subagents` owns orchestration/runtime behavior, so SISO should learn from it without letting it replace SISO's core harness.
