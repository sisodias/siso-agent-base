# SISO Command Agent Quality Issues

Date: 2026-05-10

Scope: this document is about improving the `siso` command path in this repo. It is not a generic critique of Codex, Pi, Claude Code, or the Codex desktop app.

## Goal

Make `siso` feel closer to first-class Codex GPT-5.5: smarter task decomposition, stronger tool use, longer persistence, better subagents, and fewer losses from wrapper/runtime design.

The target architecture is:

- GPT-5.5/oracle-class main controller owns the full user objective.
- The controller allocates whole tasks to domain-rated specialists.
- Cheap models do cheap specialist work, not default serious engineering.
- Results return with enough evidence for integration and verification.
- The `siso` command remains the primary user entrypoint.

## Confirmed Current Main `siso` Launch Shape

Source: `bin/siso`.

The main `siso` command is a wrapper around Pi, not generic Codex. It resolves install/profile/secrets locations, loads `~/.siso/agent/secrets.env`, sets `PI_CODING_AGENT_DIR` to the SISO profile, then execs Pi from the bundled `@mariozechner/pi-coding-agent` package when available.

The main launch uses the Bifrost Anthropic-compatible provider:

```bash
--provider bifrost-anthropic
--model "$MODEL"
--tools "$TOOLS"
--no-skills
--no-context-files
--no-extensions
```

The default model is:

```bash
SISO_MODEL="${SISO_MODEL:-claude-opus-4-7}"
```

The README documents `claude-opus-4-7` as the GPT-5.5/oracle route.

The default main-session tool allowlist is:

```bash
SISO_TOOLS="${SISO_TOOLS:-read,bash,edit,write,ls,siso,siso_context}"
```

Important nuance: the main `siso` command disables Pi's automatic skills/context/extensions discovery, but then manually loads SISO extensions with `-e`:

- `siso-lifecycle`
- `siso-context-manager`
- `siso-status`
- `siso-agent-router`

So the main `siso` session is not tool-less. It is a curated SISO runtime. The likely risk is that it does not get Pi's broader default discovery/runtime ecosystem, and it does not get Codex's native first-class tool runtime.

The installed profile still includes `settings.json`, `models.json`, `SYSTEM.md`, and copied SISO skills, but runtime access to skills is through SISO router commands/tools rather than Pi auto-loading.

Default main runtime state includes:

- `PI_OFFLINE=1`
- `PI_TELEMETRY=0`
- `SISO_AGENT_ROUTER_TOOL_MODE=lean`
- `SISO_CONTROLLER_FIRST_ROUTING=1`
- `SISO_STATUS_TOOL_MODE=lean`
- `SISO_LIFECYCLE_TOOL_MODE=lean`
- `SISO_CONTEXT_FILTER=1`
- `SISO_CONTEXT_SEMANTIC_LIBRARIAN=1`
- `SISO_STATUS_UI=full`
- `SISO_AGENT_ROUTER_UI=compact`

## Confirmed Current Child-Agent Launch Shape

Source: `extensions/siso-agent-router/spawn-layer.js`.

SISO child spawning has several effective paths.

### Legacy Pi Child Path

Most non-Codex routes use this path. It launches `pi-codex` from `$HOME/bin/pi-codex` or `pi-codex`, marks adapter `pi`, and uses:

```bash
--no-session
--no-skills
--no-context-files
--no-extensions
--mode json
```

Tools are profile-derived and permission-filtered. Only Pi built-ins are allowed:

```text
read,bash,edit,write,find,ls
```

`permissionProfile=plan` strips `edit/write`; `accept_edits` keeps them; `deny_by_default` gives no tools.

### Codex Via Pi Child Path

Codex-selected rescue/review routes default to adapter `codex-pi` unless `SISO_CODEX_ADAPTER=codex-cli`. This still launches `pi-codex`, defaults to model `gpt-5.5`, and uses:

```bash
--no-session
--no-skills
--no-context-files
--no-extensions
--mode json
--tools read,find,ls,bash
```

This means Codex-via-Pi children are read-only by hard-coded tool list.

### Codex CLI Child Path

This is used only for Codex-selected routes when `SISO_CODEX_ADAPTER=codex-cli` or the caller passes `options.codexAdapter="codex-cli"`.

It runs:

```bash
codex exec
--ephemeral
--ignore-rules
--sandbox read-only
approval_policy="never"
--json
```

It does not use Pi's `--no-session/--no-skills/--no-context-files/--no-extensions` flags. Its isolation comes from Codex CLI flags instead, so its behavior is not identical to Pi child isolation.

### Native Subagent Bridge

The native subagent bridge sits in front of the legacy paths for direct `siso action=spawn` and `siso_spawn`.

It uses native only when all of these are true:

- `SISO_SPAWN_RUNTIME !== "legacy"`
- a native `subagent` tool exists in `ctx.getAllTools()`
- `dryRun` is false
- `background !== true`

Otherwise it falls back to `runProfileSpawn()`.

Native params are currently limited to:

```js
{
  agent,
  task,
  context: "fresh",
  clarify: false,
  cwd,
  model
}
```

The native bridge does not currently pass the SISO profile tool list, and it does not apply `noTools`.

This distinction matters:

- Main `siso` has curated SISO extensions.
- SISO-spawned Pi children generally do not inherit those extensions.
- Codex CLI children are advisory/read-only by default.
- Child output is shaped for compact reporting, not full engineering continuity.
- Foreground spawns can use native subagent semantics, while background spawns always fall back to legacy process semantics.
- A dry run can report the legacy spawn plan even though a real foreground run would use the native bridge.

## Issue 1: Route Policy Is A Regex Classifier, Not A Smart Controller

Status update, 2026-05-10:

- Added controller-first routing metadata behind `chooseRoute(task, { controllerFirst: true })` and `SISO_CONTROLLER_FIRST_ROUTING=1`.
- `bin/siso` now defaults `SISO_CONTROLLER_FIRST_ROUTING=1`, so the normal CISO entrypoint uses the controller-first route policy unless explicitly disabled.
- Added route-policy fixtures and smoke coverage in `benchmarks/harness/route-policy-cases.json` and `scripts/smoke-route-policy-eval.mjs`.
- Verified current legacy routes still match documented behavior, while controller-first mode sends the benchmarked high-risk/multi-domain tasks to `gpt55.planner` with `routing=controller_allocation` or `routing=controller_planning`.

Remaining gap: this is still a deterministic controller-first policy, not a full GPT-5.5-generated allocation graph with persisted specialist IDs, ownership boundaries, and verification contracts.

Status update, later 2026-05-10:

- Added a local side-by-side Codex-vs-SISO eval scaffold in `benchmarks/harness/codex-vs-siso-cases.json` and `scripts/run-codex-vs-siso-eval.mjs`.
- The smoke path exercises SISO controller allocation deterministically, checks specialist identity, execution profile, required checks, acceptance criteria, allocation metadata, and worker evidence-contract prompting.
- The direct Codex side is deliberately skipped by default. It can be attempted with `npm run eval:codex-vs-siso -- --live` plus `SISO_CODEX_LIVE_EVAL=1`.
- A live planning run completed successfully on 2026-05-10: SISO local assertions were 100%, and direct `codex exec --json` returned parseable allocation plans for all 3 cases.
- This means we now have a working planning benchmark lane. The remaining eval gap is full end-to-end implementation comparison: same task, isolated workspace, direct Codex edit/check loop vs `siso` controller/subagent/check loop.

Sources:

- `extensions/siso-agent-router/route-policy.js`
- `extensions/siso-agent-router/profile-registry.js`
- `extensions/siso-agent-router/native-subagent-bridge.js`
- `extensions/siso-agent-router/task-store.js`
- `docs/capabilities/registry.json`

The current route policy uses keyword matching to choose a profile. For normal edit tasks, it routes to MiniMax unless the task looks sprint-sized:

```js
if (isEdit) {
  return fromProfile(needsWorktree ? "spark.worker" : "minimax.worker", ...)
}
```

This does not match the desired architecture where GPT-5.5 understands the full objective and allocates domain-rated tasks.

Risk:

- Serious implementation tasks can be downgraded to a cheap worker before the main controller reasons about task shape.
- Routing is based on words like `fix`, `implement`, `review`, or `plan`, not domain, blast radius, ambiguity, or required verification.
- The route policy becomes the brain, while GPT-5.5 should be the brain.
- GPT-5.5 only gets narrow planning/advisory paths; architecture tasks that also say "implement", "fix", "update", or "test" bypass GPT-5.5.
- Native subagent execution preserves the generic route only: it passes generic agent/task/model fields, not a domain specialist identity, rubric, rating, ownership boundary, or controller allocation result.
- Task storage bakes in a single generic route by storing `profile`, `lane`, and `model`, not an allocation graph.

Desired change:

- Keep routing as advisory metadata, not automatic dispatch.
- Return candidate specialist plans for GPT-5.5/controller approval.
- Add domain ratings such as frontend, backend, infra, tests, docs, research, refactor, debugging, security.
- Let the controller choose scout/worker/verifier composition.

Concrete observed misroutes from read-only route sampling:

| Task | Current route | Problem |
| --- | --- | --- |
| `Implement Stripe subscription checkout, webhook idempotency, and billing portal in the Next.js app` | `minimax.worker` | Payments/backend/security task goes straight to cheap worker with no controller or payments specialist. |
| `Design and implement authentication with middleware, session storage, and route guards` | `minimax.worker` | Mixed architecture and auth implementation bypasses GPT-5.5 because `implement` triggers edit routing. |
| `Audit the security of auth, payments, and deployment config, then patch the highest risk issues` | `minimax.worker` | Security audit plus patch should use security-rated reviewer/worker planning; edit keyword overrides review/security semantics. |
| `Create a React dashboard for customer billing analytics with charts and filters` | `minimax.scout` | `create` is not in `EDIT_PATTERNS`, so implementation becomes read-only scout. |
| `Make a new Next.js page for the admin dashboard` | `minimax.scout` | `make` is not an edit verb, so frontend build becomes read-only discovery. |
| `Create OAuth login and harden session cookie policy` | `minimax.scout` | Auth/security implementation routes to read-only scout because neither `create` nor `harden` is recognized as edit. |
| `Build a domain specialist allocation plan for auth, billing, frontend, data, and deployment` | `minimax.verifier` | `build` matches test/build verification regex before plan/controller semantics are understood. |
| `Refactor 8 modules across frontend, API, auth, billing, and tests` | `codex.rescue` | Large planned refactor becomes rescue/debug instead of GPT-5.5 controller allocation. |
| `Parse JSON webhook payloads and update database writes deterministically` | `gpt54mini.worker` | JSON/parse/deterministic words force GPT-5.4 Mini even though this is database/webhook domain work. |
| `Review and fix regression in auth middleware` | `minimax.worker` | Review/security/regression semantics are ignored because `fix` wins. |

Minimum direct-route rules to keep:

- read-only file search/recon with no implementation language
- explicit `run npm test`, `lint`, `typecheck`, or `build`
- tiny single-file edit with a known path and low risk
- explicit `parse/extract JSON` task with no domain side effects

Everything else should go through GPT-5.5/controller allocation.

## Issue 2: Cheap Models Are Too Prominent For Default Edit Work

Source: `extensions/siso-agent-router/profile-registry.js`.

Current profile registry maps:

- `minimax.worker` to `claude-haiku-4-5-20251001`
- `spark.worker` to `claude-sonnet-4-6`
- `gpt55.planner` to `claude-opus-4-7`
- `gpt55.oracle` to `claude-opus-4-7`

The default edit route picks `minimax.worker` for non-sprint edits.

Risk:

- GPT-5.5 is used as planner/oracle, but not enough as controller/integrator/serious implementer.
- MiniMax is useful for cheap exploration and parallel reading, but should not be the default engineer for ambiguous or correctness-sensitive work.

Desired change:

- Use MiniMax for scout/research/repetitive inspection by default.
- Use Spark or GPT-5.5 for serious implementation, ambiguity, multi-file changes, and final integration.
- Add explicit "serious mode" thresholds: multi-file edits, unknown test surface, production config, auth, migrations, package manager changes, and repeated failures.
- Separate specialist identity from execution lane. `minimax.worker` should not mean both "cheap model" and "the domain expert."

Example future specialist profile:

```js
{
  id: "specialist.auth.security",
  lane: "spark",
  role: "specialist",
  domain: "auth-security",
  model: "claude-sonnet-4-6",
  rating: 0.92,
  specialties: ["oauth", "sessions", "cookies", "middleware", "threat-modeling"],
  tools: ["read", "find", "ls", "edit", "write", "bash"],
  permissionProfile: "accept_edits",
  riskTier: "high",
  defaultContext: "project"
}
```

## Issue 3: Child Agents Are Forced Into JSON-Only Contracts

Source: `extensions/siso-agent-router/spawn-layer.js`.

Child prompts include:

```text
Return JSON only: {"summary":"...","findings":["..."],"files":["..."],"next_action":"..."}
```

The Codex child prompt also asks for JSON only.

Risk:

- Good for dashboards, bad for deep debugging and nuanced coding.
- The model optimizes for a report envelope instead of natural engineering flow.
- Parent loses useful evidence and tradeoffs.

Desired change:

- Remove JSON-only from serious workers.
- Use natural task execution instructions.
- Require a structured final section only after work is complete.
- Keep JSON-only for narrow verifier/schema/scout tasks where structure is the point.

## Issue 4: Child Runtime Is Not First-Class Enough

Status update, 2026-05-10:

- Native foreground spawn now receives the same effective Pi tool policy as legacy children through `effectivePiTools()`.
- Native `noTools=true` is forwarded as explicit `noTools: true`.
- Council and workflow paths now receive `ctx`, so they can see the native `subagent` tool when launched from the `siso` router.
- Council/workflow now prefer native subagents when available and only force legacy through `SISO_COUNCIL_RUNTIME=legacy` or `SISO_WORKFLOW_RUNTIME=legacy`.
- Native workflow projection now preserves adapter, tool call count, duration, raw/truncated output sizes, and unwrapped final output from bridge details.
- Native foreground children now dual-write scoped task records, so `/agents` and fleet accounting can see native child status, fleet id, token usage, tool count, and compact result.
- `scripts/smoke-native-subagent-status.mjs` verifies native scoped task visibility and that a running native child consumes a `maxParallel` fleet slot.
- Workflow-created parent/worker tasks now persist lightweight allocation metadata: `allocationId`, `assignmentId`, `stepId`, `specialistId`, `ownershipBoundary`, and a parent `verificationContract`.
- Native and legacy scoped child task records now preserve compact allocation metadata, including workflow worker/verifier metadata, so `/agents` can join live child runs back to workflow assignments.

Remaining gap: background execution remains legacy, and the workflow metadata is still a lightweight graph rather than a full GPT-5.5-generated domain allocation with domain ratings.

Sources:

- `extensions/siso-agent-router/spawn-layer.js`
- `extensions/siso-agent-router/native-subagent-bridge.js`

The child agent paths often disable session, skills, context files, and extensions. The native subagent bridge exists, but SISO still has legacy Pi child paths and compact adapter behavior.

Risk:

- Child agents are stateless workers rather than full agents.
- They do not naturally inherit the same tool ecosystem as main `siso`.
- They may lack skills or extension tools needed for high-quality task execution.
- Codex native subagents may be better than the Pi wrapper path for many specialist tasks.
- Native and legacy child behavior diverge by `background` flag.
- Native bridge now forwards SISO tool ceilings when the native subagent runtime accepts `tools`/`noTools`.
- `noTools` is forwarded to native subagents.
- Codex CLI isolation is behaviorally different from Pi isolation.

Desired change:

- Prefer native Codex subagents where available.
- Use the newly working MiniMax Codex subagent path for cheap MiniMax specialists.
- For Pi children that need SISO tools, launch with an explicit curated extension set instead of `--no-extensions`.
- Keep a safe no-extension mode only for untrusted/narrow children.
- Forward effective tool policy into native subagent params when the runtime supports it, or explicitly document native subagents as not SISO-tool-limited.
- Add dry-run reporting for `wouldUseNative`, resolved adapter, command, flags, effective tool set, and output caps.
- Add a smoke test comparing foreground native vs background legacy spawn for the same profile.

## Issue 5: Tool And Context Results May Be Too Lossy

Sources:

- `extensions/siso-agent-router/native-subagent-bridge.js`
- `extensions/siso-context-manager/filter.js`
- `extensions/siso-context-manager/provider-filter.js`
- `extensions/siso-lifecycle/index.js`
- `extensions/siso-status/index.js`
- `extensions/siso-status/status-state.js`
- `extensions/siso-agent-router/tooling-actions.js`
- `extensions/siso-agent-router/index.js`

The native subagent bridge defaults to a short parent-visible result cap:

```js
SISO_NATIVE_SUBAGENT_RESULT_MAX_CHARS ?? "900"
```

Legacy spawn parent preview also defaults to a short cap:

```js
SISO_LEGACY_SUBAGENT_RESULT_MAX_CHARS ?? "900"
```

Foreground/background full logs are persisted, but in-memory and parent-visible limits are smaller:

- process stdout/stderr trailing memory: 24000 chars
- child final output in records: 1600 chars
- child errors: 4000 chars
- parsed JSON summary: 300 chars
- parsed findings: 5
- parsed files: 8
- parsed next action: 240 chars

SISO also intentionally compacts child outputs, context manager payloads, status output, and tool details.

Risk:

- Compaction is necessary, but over-compaction prevents the controller from seeing enough evidence.
- Parent agent may receive "summary says fixed" instead of the concrete files, commands, failures, and uncertainty needed to integrate.
- Tool-call fidelity may degrade if provider payloads or tool results are filtered too aggressively.
- Parent may not know to inspect `stdoutPath`/`stderrPath` artifact files when the 900-char preview hides critical evidence.
- Large/noisy tool results are compacted even when recent; `protectLast` protects duplicate/state-query cases but not large/noisy results.
- Large tool-result tombstones point to retrieval but do not include the available compact summary, so important test failures, grep output, or diffs can become metadata only.
- Provider-boundary prompt slimming is high leverage, but the summary is mechanical: counts plus last compact lines, not synthesized task state.
- Some router outputs may return bulky `details: result`; if Pi includes `details` in provider-visible tool history, the model may see duplicate raw content.

Desired change:

- Raise result caps for serious work, for example 4000-8000 chars.
- Use tiered results: short status line, medium evidence summary, full artifact pointer.
- Preserve exact verification commands and key failure snippets.
- Do not replay raw huge logs into hot context.
- Add bounded head/tail semantic previews to tombstones, especially for test failures, diffs, and child summaries.
- Use lifecycle/context-manager memory as prompt-slim summary source instead of only recent compact lines.
- Add smoke coverage proving repo/workspace/check `details` cannot duplicate raw text into provider history.

Current evidence that compaction is useful:

- The docs record a pathological historical request around 428 input items, 186 function calls, 186 function outputs, and about 925k raw chars of function output.
- Lean status mode avoids status/Bifrost tool schema bloat while keeping slash commands.
- Lazy tool schema hiding replaces unused schemas with a tiny discovery hint.
- Local provider payloads are preserved for forensics without automatically sending them back to the model.

Open verification item:

- Determine whether `details: result` from repo/workspace/check routes is model-visible or UI-only. If model-visible, compact these details aggressively.

## Issue 5A: Lazy Tool TTL Is Metadata, Not Enforced Expiry

Sources:

- `extensions/siso-agent-router/tooling-actions.js`
- `extensions/siso-context-manager/provider-filter.js`
- `.siso/tool-state.json`

Tool loading records `ttlTurns`, but the provider filter reads loaded-tool state without decrementing or expiring it.

Risk:

- Lazy-loaded schemas may accumulate across a session/workspace and quietly bloat prompts again.

Desired change:

- Enforce TTL/expiry in tool state.
- Clear loaded tools at task boundaries.
- Add smoke coverage that a loaded tool expires after its TTL.

## Issue 5B: Lean Router Schema Is Token-Efficient But Overloaded

Source: `extensions/siso-agent-router/index.js`.

Lean router mode exposes one broad `siso` tool, which is good for schema size. But `SISO_PARAMS` is a very wide generic object shared across unrelated domains.

Known schema ergonomics risks:

- `mode` is defined twice in the object literal; the later generic definition overrides the earlier council enum.
- Some parameter mappings are non-obvious, such as `paths` becoming `toolIds`, `title` becoming `packIds`, and `content` becoming load reason for tool operations.
- A single overloaded schema can reduce tool-call accuracy even while reducing tokens.

Desired change:

- Keep lean mode, but split into a small discriminated set:
  - `siso_route`
  - `siso_agent`
  - `siso_repo`
  - `siso_tool_discovery`
- Alternatively, fix duplicate/ambiguous fields in `SISO_PARAMS` and add route-specific validation.

## Issue 6: Main `siso` Disables Pi Auto Discovery

Source: `bin/siso`.

The main launcher uses:

```bash
--no-skills
--no-context-files
--no-extensions
```

Then it manually loads SISO extensions.

Risk:

- This is probably intentional and safer.
- But it may prevent the main model from benefiting from Pi's native skills/context/extension ecosystem.
- The SISO replacement surface must be truly better than what it disables.

Desired change:

- Audit what Pi default discovery would add.
- Keep the curated default if it is safer, but add controlled opt-in tool packs.
- Add `siso doctor runtime` to show exactly what is enabled, disabled, and manually injected.
- Add an in-session runtime summary such as `siso action=workspace op=runtime`, so the model can inspect its actual capabilities without reading wrapper scripts.
- Split main session tool modes:
  - default write-capable mode, matching current behavior
  - read-only investigation mode
  - high-trust implementation mode

## Issue 6A: Runtime Introspection Is Too Indirect

Status update, 2026-05-10:

- Added `siso-where --runtime`.
- Added in-session `siso action=workspace op=runtime` / `runtime-summary`.
- Runtime summaries include provider, model, tool allowlist, Pi discovery flags, manual extensions, lean/full modes, path state, spawn runtime, controller-first routing, and native subagent availability when inspectable.

Sources:

- `bin/siso`
- `bin/siso-doctor`
- `extensions/siso-agent-router/index.js`
- `extensions/siso-status/index.js`
- `extensions/siso-lifecycle/index.js`

The runtime has many important toggles:

- provider/model
- tool allowlist
- manually loaded extensions
- disabled Pi discovery flags
- lean/full tool modes
- context filter state
- lifecycle transcript paths
- child spawn runtime
- native subagent availability

Today, the agent usually has to read wrapper scripts or infer behavior from status commands.

Risk:

- Agents misunderstand what is actually enabled.
- Humans debugging `siso` have to mentally merge launcher flags, env vars, extension registration, and doctor output.

Desired change:

- Add `siso doctor runtime` or `siso where --runtime`.
- Add in-session `siso action=workspace op=runtime`.
- Include:
  - `provider`
  - `model`
  - `SISO_MODEL`
  - `SISO_TOOLS`
  - loaded extension paths
  - Pi discovery flags
  - registered LLM-callable tools
  - registered slash commands
  - lean/full mode env vars
  - context/lifecycle/status paths
  - child spawn default runtime
  - native subagent availability when inspectable

## Issue 6B: Wrapper Smoke Currently Fails

Source: `scripts/smoke-siso-wrapper.mjs`.

Read-only research found:

```text
npm run smoke:wrapper --silent
```

currently fails because the smoke expects `/smoke:release/` in stdout, while the wrapper only produced `WRAPPER_RELEASE_OK`.

Risk:

- The central `siso` launch surface has a failing smoke signal.
- This may be a stale or over-specific assertion rather than a real wrapper failure, but it weakens confidence.

Desired change:

- Fix/update `scripts/smoke-siso-wrapper.mjs` so the assertion matches current npm output behavior.
- Keep it focused on wrapper dispatch correctness, not incidental npm stdout.

## Issue 7: No Automatic Supervisor-Verifier Loop

Status update, 2026-05-10:

- Workflow runs now add a supervisor-lite verifier after worker completion when native subagents are available.
- The verifier uses the `minimax.verifier` profile, runs with `noTools: true`, and receives compact workflow evidence rather than raw child logs.
- Workflow metadata/result formatting now includes `verifierStatus` and `verifierVerdict`.
- `siso action=workflow verify=false` can explicitly disable this verifier; default behavior is automatic native verification when available.
- `scripts/smoke-workflow-structures.mjs` verifies that a completed native workflow runs one worker and one verifier, parses `VERDICT: pass`, and renders verifier status/verdict.
- Verifier `needs_fix` now triggers a bounded feedback worker pass and re-verification, capped by `verifyIterations` / `SISO_WORKFLOW_VERIFY_ITERATIONS`.
- Workflow metadata/result formatting now includes verifier verdict history, feedback packets, failure signatures, re-entry worker ids, max verifier iterations, and loop outcome.
- Repeated `needs_fix` now fails the workflow with `loopOutcome=needs_fix_exhausted` instead of reporting a clean completed/done state. `blocked` also fails without spawning a feedback worker.
- Explicit workflow checks now run after workers and after feedback workers, before verifier review.
- Failed checks create compact feedback packets and re-enter the worker loop. Passing check evidence is included in the verifier prompt. Blocked unsafe checks fail with `loopOutcome=check_blocked` and do not spawn verifier/feedback workers.
- Feedback re-entry now captures compact checkpoint metadata before the feedback worker runs, with rollback marked `explicit-only`.
- Workflow loops now write compact flight recorder files under `.siso/flight-runs/<workflow-task-id>.json` with worker ids, check iterations, verifier verdicts, feedback packets, checkpoints, and final outcome.
- Workflow parent task metadata now includes a `verificationContract` containing verifier profile, verify toggle, iteration cap, required checks, verifier tool mode, and rollback mode. Worker metadata inherits the workflow `allocationId` and gets per-assignment ids/step ids for durable joins.
- Workflow-launched native worker and verifier scoped records now carry the same allocation metadata in `/agents` task records, including `kind=workflow-verifier` for verifier records.

Remaining gap: rollback is not automatic. Checkpoints are metadata for explicit recovery, not a built-in revert mechanism.

Sources:

- `docs/research/legacy-agent-research/feature-integration-log.md`
- `extensions/siso-agent-router/workflow-layer.js`
- `extensions/siso-agent-router/council-layer.js`

The research backlog already identifies "Supervisor-lite verifier" as P0.

Risk:

- Workers can report success without a separate no-tools verifier checking evidence.
- Main controller has to manually decide whether to continue.
- Codex feels stronger partly because it keeps pushing toward verified completion.

Desired change:

- After worker/council/workflow completion, run a verifier with strict output:

```json
{
  "status": "done | continue | failed",
  "reason": "...",
  "next_action": "..."
}
```

- Persist verifier decision in child run/task metadata.
- Feed "continue" decisions back into the controller.

## Issue 8: Domain Ratings Are Missing

Status update, 2026-05-10:

- Added a lightweight static specialist registry in `extensions/siso-agent-router/specialist-registry.js`.
- The registry separates durable specialist identity from execution profiles. Example: `specialist.auth.security` is distinct from executable profiles such as `spark.worker` or `minimax.worker`.
- Registry entries include aliases, role, domain ratings, risk tier, context tier, permission profile, execution profile, and verification hints.
- Controller-first route decisions now include compact `specialistCandidates` while preserving the older `specialists` aliases for compatibility.
- Workflow parent metadata now stores detected domains, candidate specialist ids/aliases, and risk tier.
- Workflow worker/scoped child metadata now stores specialist ids, aliases, primary domain, domain ratings, risk tier, context/permission profile, execution profile, and verification hints.
- Added `scripts/smoke-specialist-registry.mjs` to verify registry integrity, route candidate metadata, and representative allocation.
- Workflow now accepts controller allocation plans through `allocationPlan` objects or fenced/inline JSON text, normalizes `assignments[]` into structured workflow tasks, honors assignment `specialistId` and `executionProfile`, merges assignment `requiredChecks`, and preserves `acceptanceCriteria`.
- Workflow can now opt into automatic controller allocation with `controllerAllocate=true`; it asks the `gpt55.planner` native subagent for strict JSON, validates the plan, and dispatches the resulting assignments. Tests use a mockable `executeControllerAllocation` hook.
- Worker prompts now require an evidence contract in final responses: changed files, checks run, acceptance status, risks, and blockers.
- Added a local Codex-parity architecture scorecard in `benchmarks/harness/codex-parity-cases.json` and `scripts/smoke-codex-parity-scorecard.mjs`.

Remaining gap: automatic controller allocation exists, but live side-by-side direct Codex vs SISO evals and true first-class Codex tool/session runtime parity are still missing.

Current routing uses role/model profiles, not durable domain ratings.

Missing dimensions:

- frontend
- backend
- infra
- tests
- docs
- data
- auth/security
- build/release
- debugging
- research
- refactor/migration
- UI/UX
- agent-system internals

Desired change:

- Add a domain classifier that returns scored candidates.
- Track model/domain performance over time.
- Let GPT-5.5 controller combine domain scores with task risk.

Example controller allocation shape:

```json
{
  "taskKind": "implementation",
  "complexity": "multi_domain",
  "risk": "high",
  "domains": ["payments", "backend", "security", "database"],
  "assignments": [
    {
      "task": "Implement Stripe checkout and billing portal",
      "specialist": "specialist.payments.stripe",
      "reason": "Highest rating for Stripe subscription flows",
      "contextTier": "project",
      "permissionProfile": "accept_edits",
      "verification": ["unit tests", "webhook idempotency test"]
    },
    {
      "task": "Review webhook idempotency and secret handling",
      "specialist": "specialist.security.appsec",
      "reason": "Security-sensitive payment webhook path",
      "contextTier": "project",
      "permissionProfile": "plan",
      "verification": ["threat-model checklist"]
    }
  ]
}
```

## Working Hypothesis

The quality gap is mostly a runtime architecture issue, not just prompt engineering.

Direct Codex GPT-5.5 gets:

- native model/tool protocol
- first-class tool loop
- managed subagents
- strong session continuity
- high-quality system prompt
- better compaction behavior
- strong verification bias

Current `siso` gets:

- Bifrost/Pi wrapper
- curated SISO tools
- regex route policy
- stripped child workers
- JSON-only child contracts
- compacted child results
- no automatic verifier loop

That is why direct Codex can feel dramatically smarter even if the headline model route is similar.

## Research Questions Still To Verify

- How much tool-call fidelity is lost through Bifrost/Pi provider translation?
- What exactly does Pi default skills/context/extension discovery provide when not disabled?
- Are SISO context filters removing useful evidence too early?
- Which child-agent path is most common in real `siso` sessions: native subagent, legacy Pi child, or Codex child?
- How often does regex route policy misroute real tasks?
- What would a side-by-side benchmark show for direct Codex GPT-5.5 vs current `siso` vs patched `siso`?
- What retention/redaction policy should apply to local lifecycle provider payload files?

## Proposed Work Plan

1. Done: fix/update `smoke:wrapper` so the wrapper launch surface has a clean signal.
2. Done: add `siso where --runtime` to print the exact main-session runtime.
3. Done: add in-session `siso action=workspace op=runtime` for model-visible capability inspection.
4. Done: add route-eval fixtures for the concrete misroutes listed above.
5. Done: define a lightweight specialist registry schema with domain ratings, risk tier, context tier, permission profile, execution profile, and verification hints.
6. Partially done: route policy now exposes controller-first routing metadata, domains, and specialist candidates; workflow can ingest controller allocation plans and opt into automatic GPT-5.5 controller generation, but broader defaulting and live quality evals remain.
7. Done: add controller-first task allocation shape behind `SISO_CONTROLLER_FIRST_ROUTING`, now defaulted on in `bin/siso`.
8. Partially done: native spawn now writes scoped task records for `/agents` and fleet accounting; workflow parent/worker tasks and scoped child records now persist allocation IDs, assignment IDs, step IDs, specialist IDs, ownership boundaries, verification contracts, domain ratings, risk tiers, specialist aliases, required checks, and acceptance criteria. Automatic GPT-5.5 plan generation remains incomplete.
9. Partially done: direct spawn, council, and workflow now prefer native subagents when available for foreground work; background execution remains legacy.
10. Remove JSON-only contracts from serious worker/rescue prompts.
11. Raise serious-work child result caps and preserve verification evidence.
12. Partially done: workflow results now get a bounded supervisor-lite verifier loop with explicit required checks, verification contracts, checkpoint metadata, compact flight recorder, and feedback re-entry; automatic rollback remains.
13. Add compact-preview tombstones for large tool results.
14. Prove or fix provider-visible duplication from router `details`.
15. Enforce lazy tool TTL expiry.
16. Split or tighten the overloaded lean `siso` schema.
17. Audit lifecycle transcript retention/redaction for provider payload files.
18. Partially done: add local Codex-parity architecture scorecard; live side-by-side evals on representative `siso` tasks remain.

## Immediate Patch Candidates

- `extensions/siso-agent-router/route-policy.js`
- `extensions/siso-agent-router/profile-registry.js`
- `extensions/siso-agent-router/spawn-layer.js`
- `extensions/siso-agent-router/native-subagent-bridge.js`
- `bin/siso`
- `bin/siso-doctor`
- `docs/troubleshooting.md`
