# Agent Tool and Skill Speed Deep Dive

Date: 2026-05-09

Scope: read-only audit of Shaan's local SISO Agent Base, Pi runtime wiring, SISO router/status/context extensions, Bifrost telemetry, skill loading, and subagent/task orchestration. This note focuses on concrete ways to make tool calls, skill calls, and multi-agent work faster without broad rewrites.

## Executive Summary

The fastest path is not one big rewrite. It is a stack of small latency cuts:

1. Keep model payloads smaller: tool schemas and repeated tool/child outputs are a major tax on every model turn.
2. Cache skill metadata: raw skill lookup is not awful, but slash skill resolution multiplies scans and can take hundreds of milliseconds.
3. Stop polling large child-run directories so aggressively: the full status HUD repeatedly scans hundreds of child-run files.
4. Make duplicate/retry control smarter: auth flaps and ambiguous failures can resend near-identical large requests.
5. Use parallel subagents deliberately: separate contexts and restricted tools are the right pattern, but parent reinjection must stay compact.
6. Add benchmarks so speed regressions become visible.

## Current Path

`bin/siso` launches the bundled Pi CLI with:

- provider: `bifrost-anthropic`
- default model: `claude-opus-4-7`
- visible tools: `read,bash,edit,write,ls,siso,siso_context`
- skills disabled in Pi itself via `--no-skills`
- SISO lifecycle/context/status/router extensions loaded explicitly

Important files:

- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/bin/siso`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/extensions/siso-agent-router/index.js`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/extensions/siso-agent-router/skill-hub.js`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/extensions/siso-agent-router/spawn-layer.js`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/extensions/siso-status/index.js`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/extensions/siso-status/status-state.js`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base/extensions/siso-context-manager/provider-filter.js`
- `/Users/shaansisodia/.config/bifrost/codex-bifrost-shim.mjs`

## Measured Signals

Skill hub query timing, current installed skill roots:

- Installed roots contain about 62 skill files.
- `querySkillHub({ op: "list" })`: p50 about 26ms locally, with occasional spikes above 100ms.
- `querySkillHub({ op: "load_body", skillId: "siso-profile:improve-agent-system" })`: p50 about 24-63ms depending run, with p95 spikes near 200ms.
- Slash `/skill agent improve ...` can take around 800ms because alias/prefix resolution calls `querySkillHub` repeatedly.

Bifrost payload metrics:

- Recent GPT-5.5 tool-heavy requests averaged about 150k-175k request chars.
- Tool schema was about 18.9k chars per tool-heavy turn.
- `subagent` schema was the largest tool schema contributor, around 12.5k chars.
- Dominant text category was `large_other_text`, usually repeated large tool outputs, raw context, pasted transcripts, or child result material.
- Duplicate request reports found repeated prompt shapes, often 3-4 near-identical requests within seconds.

Status/runtime overhead:

- `SISO_STATUS_POLL_MS` defaults to 500ms.
- Status polling scans child-run records from disk.
- Local child-run state had hundreds of files and large accumulated stdout/jsonl artifacts.
- Full status UI recomputes widget lines on tool events and interval polls.

Gateway reliability:

- GPT-5.5/Oracle route can flap with `unexpected EOF` followed by `auth_unavailable`.
- Retrying full large payloads during auth flaps burns wall-clock time and can create duplicate-shape request bursts.
- MiniMax/Spark may stay healthy while GPT-5.5 fails, so circuit breakers should be provider/model-specific.

## High-Leverage Fixes

### 0.1.83 Local Fixes Shipped

Implemented in local SISO Agent Base 0.1.83:

- Skill catalog metadata now has an in-process cache with a short TTL and `SISO_SKILL_CACHE=0` escape hatch.
- `/skills` defaults to compact rows and a lower list cap so skill discovery does not dump paths/headings into the model-visible conversation.
- `/skill` prompt injection is capped by `SISO_SKILL_PROMPT_MAX_CHARS` and emits a retrieval pointer when truncated.
- `bin/siso` now defaults `SISO_STATUS_POLL_MS` to 2000ms instead of 500ms.
- `smoke:skill-slash` now covers compact output and large skill body truncation.

Implemented in local SISO Agent Base 0.1.84:

- Slash skill resolution now resolves aliases/prefixes against one catalog snapshot, with smoke coverage proving `/skill agent improve ...` uses one catalog scan when caching is disabled.
- Child completion notifications now cap single-child result previews with `SISO_CHILD_NOTIFICATION_RESULT_MAX_CHARS` and point to the full child artifact instead of reinjecting large final output into the parent turn.

Implemented in local SISO Agent Base 0.1.85:

- Native subagent foreground results now cap parent-visible result previews with `SISO_NATIVE_SUBAGENT_RESULT_MAX_CHARS`.
- Native bridge details no longer return raw nested native transcripts; they preserve compact result, usage, output char counts, and a bounded native summary.

Implemented in local SISO Agent Base 0.1.86:

- Legacy foreground spawn results now cap parent-visible result previews with `SISO_LEGACY_SUBAGENT_RESULT_MAX_CHARS`.
- Public spawn details no longer return raw event payloads and replace huge stderr previews with a pointer marker, preserving only compact result data, counts, and artifact paths.

Implemented in local SISO Agent Base 0.1.87:

- Council/workflow aggregate results now carry `eventCount` instead of raw event arrays.
- Council/workflow native bridge adapters now consume compact native details directly, preserving usage accounting after raw native transcripts were removed.

Implemented in local SISO Agent Base 0.1.88:

- The top-level composite `siso` tool wrapper now adds compact event counts instead of appending raw wrapper event objects into returned details.

Implemented in local SISO Agent Base 0.1.89:

- Child-control list/status/logs/interrupt/resume results now return compact child records with `eventCount`, usage, compact summaries, and artifact pointers instead of raw event arrays or large final outputs.
- `/agents` command details now return compact scoped task records so list/report/peek/files/status calls do not leak queued spawn payloads, raw event arrays, or raw `result.final` back into parent context.
- Added smoke coverage for direct child-control, lean `siso action=child`, and `/agents` details compaction.

Implemented in local SISO Agent Base 0.1.90:

- `siso_context` details for status, memory, central memory, supersede, pointers, and retrieve now return compact metadata instead of raw pending events, memory bodies, or retrieved event records.
- Explicit `siso_context op=retrieve` still returns bounded raw text in the visible tool output, but details now carry only event metadata, counts, and truncation fields.
- `smoke:context-details` guards the context-manager inspection path, and `smoke:agents-command` now uses current-relative timestamps so stale-agent smoke expectations stay stable over time.

Implemented in local SISO Agent Base 0.1.91:

- Provider-boundary prompt slimming now attacks the biggest remaining waste source: full-session replay. When provider `messages[]`/`input[]` exceed configured count or char thresholds, SISO replaces the old prefix with one compact `SISO_PROMPT_SLIM` checkpoint and preserves the recent tail.
- The default tail is 32 messages, and the cutter avoids splitting an assistant tool-use from its following tool-result. `SISO_PROMPT_SLIM=0` disables the behavior; `SISO_PROMPT_SLIM_MAX_MESSAGES`, `SISO_PROMPT_SLIM_MAX_CHARS`, `SISO_PROMPT_SLIM_KEEP_LAST`, and `SISO_PROMPT_SLIM_SUMMARY_MAX_CHARS` tune it.
- Real local provider request samples from 2026-05-09: `2026-05-09T15-02-18-194Z.json` slimmed from 737,354 chars / 542 messages to 39,287 chars / 33 messages (18.77x smaller), and `2026-05-09T15-00-17-114Z.json` slimmed from 730,946 chars / 536 messages to 36,518 chars / 33 messages (20.02x smaller). A smaller 117,250-char / 141-message payload still slimmed to 41,710 chars (2.81x smaller).

Implemented in local SISO Agent Base 0.1.92:

- `siso_context` now returns the slimmed provider payload even when prompt slimming is the only provider-boundary change.
- `npm run measure:prompt-slim` scans recent local provider request dumps and verifies the real-sample 10x claim. On the 2026-05-09 sample set it scanned 120 files, found 71 slim-eligible payloads, found 24 at or above 10x, and the best sample shrank from 723,819 chars / 526 messages to 34,068 chars / 33 messages (21.25x).

Implemented in local SISO Agent Base 0.1.101:

- Legacy child-control reads are now parent-session scoped: `/agents logs|tail|status`, `siso action=child`, and direct child-run collection no longer read sibling chat child records from the global child-run directory.
- Child notification dispatchers are tracked per parent session and stopped per session, so an old chat's polling loop cannot survive a chat switch and inject completions into the wrong parent.
- Public spawn details now omit raw child `command`, `args`, and `task` fields. Native bridge params are also compacted to metadata, preserving routing/debug fields without replaying full prompts.
- Provider-boundary filtering now rewrites every text-bearing part in a multi-part tool result and filters both `input[]` and `messages[]` when a mixed gateway payload carries both fields.
- Agent tooling safety now refuses secret-like file targets for outline/doc update/patch helpers, blocks obvious shell chaining/destructive `runCheck` commands, and caps one-line check output with `SISO_CHECK_OUTPUT_TRUNCATED`.
- Regression coverage added/expanded: `smoke:child-control-isolation`, `smoke:child-control`, `smoke:child-notifications`, `smoke:spawn-result`, `smoke:context`, `smoke:router-lean`, and `smoke:agent-tooling`.

Implemented in local SISO Agent Base 0.1.102:

- Status queues, last UI context, context-manager state, and lifecycle correction drains are now keyed by explicit session identity, directly addressing cross-chat queued prompt/context leakage.
- Child notifications now claim records before sending, use parent-scoped keys/locks, clear claims after failed sends, and mark delivery only for the exact parent session.
- Child cleanup is dry-run unless `confirm=true`, only deletes recomputed child-run log paths under the child-run directory, clamps retention options, and refuses interrupts for already-terminal records.
- Child resume preserves the original child profile and permission ceiling instead of accepting attempted route upgrades from resume options.
- Install/update paths now use ownership markers and non-destructive sync/update fallbacks, with `smoke:install-release` surfacing untracked release surface files as local warnings and strict-mode release failures.

### 1. Skill Catalog Cache

Problem:

`querySkillHub` recursively scans all roots and reads every `SKILL.md` on every skill list/search/info/load. Exact `skillId` loads still pay the full scan before filtering.

Fix:

- Add in-process metadata cache keyed by `cwd`, `SISO_SKILL_ROOTS`, and root mtimes.
- Keep bodies lazy: cache frontmatter, description, headings, path, source, and aliases, but read full body only for `load_body`.
- Add `SISO_SKILL_CACHE=0` escape hatch.
- Add `/skills refresh` or internal invalidation when roots change.

Expected impact:

- Warm exact skill load should drop from tens/hundreds of ms to single-digit ms.
- Slash `/skill` should stop paying repeated scans.

### 2. One-Pass Slash Skill Resolution

Problem:

`/skill agent improve ...` tries multiple leading token prefixes and aliases. Each attempt can call `querySkillHub` for exact and fuzzy candidates, multiplying full root scans.

Fix:

- Build all prefix/alias candidates first.
- Resolve all candidates against one catalog snapshot.
- Rank exact id/name/alias matches without rescanning.

Expected impact:

- Slash skill load should become deterministic and fast.
- Fewer accidental empty searches.

### 3. Compact Skill Output

Problem:

`/skills` with no query can output 50 entries, including ids, descriptions, headings, and absolute paths. One measured default list produced more than 22k chars.

Fix:

- Default `/skills` output to compact rows: id, name, source, 80-120 char summary.
- Lower default limit to 10 or 20.
- Reserve headings and paths for `info`.
- Keep `load_body` capped, with retrieval pointer when truncated.

Expected impact:

- Less context bloat after skill discovery.
- Faster later model turns because huge skill catalogs are not re-fed.

### 4. Status Polling and Child Index Cache

Problem:

Full status UI polls every 500ms and repeatedly scans child-run/task files. Notifications and `/agents` do similar scans independently.

Fix:

- Raise default poll interval to 2000ms or make it adaptive.
- Poll quickly only while active children exist.
- Add shared in-memory child/task index invalidated by `writeChildRunRecord` / `setChildStatus`.
- Avoid scanning scoped tasks when `fleetId` or `maxParallel` is absent.

Expected impact:

- Lower local CPU/disk churn during tool-heavy sessions.
- More responsive terminal under many child runs.

### 5. Tool Schema Slimming and Deferred Tool Modes

Problem:

Tool schemas add a fixed cost every tool-capable request. Recent Bifrost metrics show about 19k chars of schema, with subagent schema dominating.

Fix:

- Keep lean router/status defaults.
- Split the large `siso` schema into an always-visible minimal schema plus deferred exact schemas for rare actions.
- Consider making child/subagent advanced fields hidden unless debug/advanced mode is enabled.
- Continue Mac Mini shim schema slimming, but move stable schema simplifications into SISO where possible.

Expected impact:

- Fewer prompt chars every turn.
- Faster model planning around tools because the visible tool surface is simpler.

### 6. Compact Child Results Only

Problem:

Subagents should reduce parent context, but parent reinjection can still carry large summaries, raw output, native details, and repeated task notifications.

Fix:

- Parent gets short summary, status, usage, and artifact paths.
- Full stdout/transcript/handoff stays in files.
- `/agents peek` remains the bounded opt-in retrieval path.
- Do not store raw nested native `details` in model-visible tool result history by default.

Expected impact:

- Subagents become a real context-management win instead of a hidden payload leak.
- Faster parent turns after many subagents complete.

### 7. Duplicate Dispatch and Auth-Flap Circuit Breakers

Problem:

Duplicate-shape telemetry shows repeated large requests. Auth flaps on GPT-5.5 can cause full-payload retries and force users to click continue.

Fix:

- Add duplicate-shape breaker: if 3+ near-identical requests happen in 20s for a parent turn, pause further dispatch and surface a clear diagnostic.
- For auth errors, stop retrying full payloads; run a tiny no-tools auth probe first.
- If a route is unhealthy, fail fast or offer fallback to Spark/MiniMax.

Expected impact:

- Fewer repeated expensive requests.
- Faster recovery from gateway/provider issues.

### 8. Parallel Tool and Task Scheduler

Problem:

The agent often does independent reads/searches sequentially. The user wants Codex-like prompt queueing and aggressive parallelism without cross-agent confusion.

Fix:

- Add per-agent prompt queue: Enter while busy queues by default, explicit interrupt/steer remains separate.
- Add internal batch helpers for read/search/status tasks so one tool call can perform independent file reads/searches in parallel.
- Encourage child agents for independent lanes, with per-parent scoping already enforced by task records.
- Keep max parallel per fleet and per parent to avoid runaway fanout.

Expected impact:

- Faster codebase exploration and research tasks.
- Main agent stays responsive while children work.

## Benchmarks To Add

1. `bench:skill-hub`
   - 50-100 synthetic skills.
   - Cold and warm list/search/exact load timings.
   - Assert warm exact load under a loose threshold.

2. `smoke:skill-output-size`
   - Default `/skills` output below a char cap.
   - `/skill` injected prompt capped for large synthetic skills.

3. `bench:status-poll`
   - Temp child-run dirs with 10/100/1000 records.
   - Measure current scan cost and cached-index cost.

4. `bench:tool-schema-tax`
   - Compare no tools, lean tools, full tools.
   - Record `body_chars`, `tool_chars`, first-token latency, total latency.

5. `bench:child-result-reinjection`
   - Compare raw child output vs compact summary vs artifact pointer.
   - Measure `large_other_text`, body chars, and next-turn latency.

6. `smoke:duplicate-breaker`
   - Feed duplicate synthetic Bifrost metric rows.
   - Assert warning/breaker would fire.

7. `bench:gateway-route`
   - Tiny no-tools smokes for MiniMax, Spark, Oracle.
   - Separate route health from full agent payload latency.

8. `bench:shim-overhead`
   - Replay sanitized payload into shim with local mock upstream.
   - Measure parse, patch, prompt slim, metrics extraction, stream normalization.

## External Patterns Worth Copying

Official Claude docs emphasize subagents for separate context windows, task-specific prompts, restricted tool access, and returning relevant findings instead of intermediate tool chatter. Anthropic SDK docs also describe running specialized subagents simultaneously for review/research style work.

OpenAI Responses supports parallel tool calls through a request option, and Anthropic tool-use docs describe parallel tool calls for independent operations. The transferable pattern is: expose a tool surface that makes independent work obvious and safe, then execute independent tool calls concurrently and return compact joined results.

For SISO, this means:

- read-only scout agents should default to fast/cheap models and read/search-only tools;
- subagents should return compact findings plus artifact references;
- the parent should not see sibling agents from other sessions;
- queueing should be per active agent/session, not global;
- a batch/local tool can do parallel filesystem work faster and more reliably than asking the model to make many separate calls.

Sources:

- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Claude Agent SDK subagents: https://docs.claude.com/en/docs/agent-sdk/subagents
- Anthropic tool use overview: https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview
- OpenAI Responses API reference: https://platform.openai.com/docs/api-reference/responses

## Recommended Implementation Order

1. Skill speed slice:
   - catalog cache
   - one-pass slash resolution
   - compact `/skills`
   - performance/output smokes

2. Status/runtime speed slice:
   - adaptive polling
   - shared child/task index
   - skip unnecessary fleet scans
   - status overhead benchmark

3. Payload slimming slice:
   - compact child result reinjection
   - cap skill body injection
   - lean/deferred tool schema split
   - Bifrost dashboard prompt-slim visibility

4. Reliability and duplicate-control slice:
   - duplicate request breaker
   - auth-flap circuit breaker
   - route-health probes and fallback messaging

5. Parallel work slice:
   - per-agent prompt queue
   - batch filesystem/search helper
   - fanout scheduler guardrails

## Open Questions

- Should default `SISO_STATUS_POLL_MS` become 2000ms immediately, or adaptive based on active child count?
- Should `/skills` default limit be 10 or 20?
- Should Oracle route auth flaps fall back to Spark automatically, or should the UI ask first?
- Should a batch filesystem/search helper be exposed as a new SISO action or as a separate native tool?
