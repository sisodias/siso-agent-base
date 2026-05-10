# Pi Codex Subagent Runtime Decision

Date: 2026-05-07

## Decision

Use native `pi-subagents` as the primary runtime for direct delegation:

- direct `subagent` calls
- `siso action=spawn`
- `siso_spawn`
- parent-model initiated parallel subagent fan-out

Keep SISO's legacy `runProfileSpawn()` path for internal SISO council/workflow orchestration for now.

## Why

First-principles owner-layer trace:

1. Native `pi-subagents` is a Pi tool runtime, not a public in-process API exposed to other tools.
2. Pi extension tool execution receives `ctx`, but `ctx` does not expose callable registered tools.
3. The parent `pi` API has `getAllTools()` in typings, but this is not a stable executor surface for one custom tool to invoke another.
4. Forcing council/workflow to call native `subagent` inside `siso` either falls back to legacy or risks recursive `siso` calls from child agents.
5. Direct parent-model calls to `subagent` work and support single, parallel, and chains.

So the safe architecture is:

```text
Parent model / Pi session
  ├─ native subagent tool: primary worker runtime
  ├─ siso route/spawn: SISO policy adapter over native subagent where callable
  └─ siso council/workflow: legacy orchestration until redesigned as prompt-level native subagent chains
```

## Current verified behavior

Verified live:

- `siso action=spawn` uses native subagent bridge.
- `siso_spawn` uses native subagent bridge.
- Native direct `subagent` parallel fan-out works.
- SISO native model routes work through Bifrost:
  - `scout` / `worker` / `verifier` → MiniMax
  - `reviewer` → Spark
  - `planner` / `oracle` → GPT-5.5
- Legacy background supervisor-only zero-output exits are marked failed, not completed.
- Child completion does not inject surprise follow-up turns by default.

## Not doing now

Do not keep trying to make `council-layer` and `workflow-layer` call native `subagent` in-process from inside the `siso` tool. That fights Pi's extension boundaries.

If we want native council/workflow, implement them as one of:

1. Parent-prompt presets that instruct the foreground model to call native `subagent` with `tasks` or `chain`.
2. A new native `pi-subagents` chain preset file.
3. A separate Pi process runner that invokes `subagent` directly, accepting the extra process boundary explicitly.

## Next implementation target

Add lightweight prompt/slash presets for common native fan-outs:

- `parallel-recon`
- `parallel-review`
- `plan-worker-verify`

These should use native `subagent` directly instead of adding another custom SISO process manager.
