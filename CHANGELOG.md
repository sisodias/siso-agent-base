# Changelog
## 0.1.109 - 2026-05-10
- Add Autopilot Fix Loop with bounded validation runs, unsafe-command blocking, failure summaries, and gathered repair context.
- Wire the controller through `siso action=check op=fix|fix-loop|autopilot-fix` and add compact formatted output.
- Add scenario card metadata, workspace-validation pack coverage, Test Space coverage, and `smoke:autopilot-fix-loop`.

## 0.1.108 - 2026-05-10
- Add Repo Index v1 with cached local file, symbol, and import metadata under `.siso/repo-index`.
- Add Sourcegraph-lite `codeQuery` support for `symbol:`, `path:`, `file:`, `lang:`, and `imports:` filters, wired through `siso action=repo op=query`.
- Add `repoIndexBuild` / `repoIndexStatus` router support, scenario cards, repo-navigation pack entries, Test Space coverage, and `smoke:repo-index`.

## 0.1.107 - 2026-05-09
- Add `relatedChecks` to recommend primary, secondary, and full validation commands from changed paths, capabilities, and task text, wired through `siso action=check op=related`.
- Add `gatherContext` to build task-aware context packets from tool recommendations, ranked repo maps, search/read evidence, and related checks, wired through `siso action=repo op=gather`.
- Add scenario cards, Test Space coverage, and smoke tests for Related Checks and Gather Context.

## 0.1.106 - 2026-05-09
- Expand Tool Scenario Cards from the initial code-intelligence set to 31 cards, covering write helpers, docs helpers, capability add/show/update/audit, tool search/show/recommend/inventory/load/unload/stats, and existing validation/navigation tools.
- Keep tool-selection evals green after the expanded card set, preserving correct expected tool/pack selection and avoided-tool behavior.
- Add V2 readiness smoke coverage so stale capability docs, missing readiness wiring, and temporary recorder artifacts cannot quietly drift into a V2 release.
- Add the Autopilot Verifier Loop design contract and `autopilotPlan`, a no-edit runtime slice for controller/worker/read-only-verifier planning with checkpoints, checks, failure signatures, flight-recorder metadata, and compact feedback packets.
- Add an Autopilot Tool Scenario Card and tool-selection eval case so agents can discover the verifier-plan path for post-implementation specification checks.

## 0.1.105 - 2026-05-09
- Add deterministic `smoke:tool-selection-eval` cases for Tool Scenario Card recommendation quality, covering expected tools, expected packs, and avoided tools.
- Improve `toolRecommend` ranking with scenario-specific boosts/penalties for code search, known-file reads, failing checks, diff review, capabilities, runtime readiness, source drift, and contract review.
- Add tool adoption telemetry for recommend/load/unload events plus `siso action=tool op=stats`, and update the default profile to prefer native scenario-card tools before raw shell fallback.

## 0.1.104 - 2026-05-10
- Add `rankedRepoMap`, an Aider-inspired bounded local repo map that ranks files and symbols for a task before agents start repeated search/read loops.
- Wire ranked repo maps through `siso action=repo op=ranked-map|repo-map|repomap`, returning compact file scores and task-relevant symbol previews.
- Add a `ranked-repo-map` Tool Scenario Card and make it the first tool in the repo-navigation pack, while keeping `repoSearch` as the exact-match fallback.
- Document the broader 10x roadmap: public code search, ranked repo maps, tree-sitter/persistent map cache, checkpoint autopilot, and OpenCode-style parent/child cost rollups.
- Expand `smoke:agent-tooling` and `smoke:tool-scenario-cards` so ranked maps must stay bounded, include relevant symbols, and avoid secret-like paths.

## 0.1.103 - 2026-05-10
- Add `publicCodeSearch`, a bounded Sourcegraph-backed public code search primitive inspired by OpenCode's Sourcegraph/code-search tools.
- Wire public code search through `siso action=repo op=sourcegraph|public-code|internet-code|codesearch`, returning compact repo/path/line previews and result URLs without requesting full external file contents.
- Add a Tool Scenario Card and repo-navigation pack entry so agents can choose public code search when local repo tools cannot answer how other projects solved a problem.
- Expand `smoke:agent-tooling` with a mocked Sourcegraph regression proving compact output, query shaping, and no full-file-content GraphQL request.

## 0.1.102 - 2026-05-10
- Scope status queues, last UI context, context-manager state, and lifecycle correction drains by active session so queued prompts, context captures, and correction lessons cannot bleed across chats.
- Harden child completion delivery with parent-scoped notification keys, claim-before-send lock files, durable claim markers, and retry cleanup on failed sends to prevent duplicate or wrong-parent follow-ups.
- Make child cleanup safe by default: public cleanup stays dry-run unless `confirm=true`, deletes only recomputed child-run log paths under the child-run directory, clamps retention inputs, and refuses interrupts for non-active child records.
- Preserve child resume permission ceilings by deriving resume routes from the original child profile instead of accepting attempted spawn option upgrades.
- Harden installer/update release surfaces with install ownership markers, non-destructive local sync, source-checkout fallback update flow, source-drift env support, and release-surface smoke warnings for untracked local release files.
- Add `smoke:session-isolation`, `smoke:child-control-safety`, `smoke:install-release`, and expanded child notification coverage for these cross-chat, cleanup, and release-safety regressions.

## 0.1.101 - 2026-05-10
- Harden child-agent control paths so legacy `/agents` aliases, `siso action=child`, and child-run collection are scoped to the active parent session instead of the global child-run directory.
- Track child notification dispatchers per parent session and stop them by session on shutdown, preventing stale dispatchers from leaking completions across chats.
- Strip raw spawn `command`/`args`/`task` fields from public spawn details, compact nested child result projections, and prefer compact notification summaries over raw child `finalOutput`.
- Strengthen provider-boundary filtering for multi-part tool results and mixed `input`/`messages` payloads so raw secondary parts cannot ride past a tombstone.
- Add safety guards for SISO agent tooling: secret-like paths are refused by outline/update/patch helpers, unsafe shell/destructive `runCheck` commands are blocked, and check output is character-capped.
- Add `smoke:child-control-isolation` plus expanded context, spawn, notification, router, and tooling smokes for these regression cases.

## 0.1.100 - 2026-05-09
- Add provider-boundary lazy tool schema slimming in `siso-context-manager`, driven by `.siso/tool-state.json`, so unloaded tool schemas can be hidden while preserving core discovery/router tools and loaded scenario-card tools.
- Add `smoke:tool-schema-lazy` to verify unloaded schemas are removed from provider payloads and a discovery hint is injected.

## 0.1.99 - 2026-05-09
- Add lazy tool pack metadata in `docs/tools/packs.json` for repo navigation, workspace validation, docs/capabilities, and operations readiness.
- Add `toolLoad`/`toolUnload` state tracking over Tool Scenario Cards and wire `siso action=tool op=load|unload` routing.
- Add `smoke:tool-packs` to validate pack integrity and include it in the full smoke suite.

## 0.1.98 - 2026-05-09
- Add runtime Tool Scenario Card discovery actions over `docs/tools/scenario-cards.json`: `toolSearch`, `toolShow`, `toolInventory`, and `toolRecommend`.
- Wire `siso action=tool` routing for search/show/inventory/recommend and extend `smoke:agent-tooling` to verify bounded scenario-card recommendations.

## 0.1.97 - 2026-05-09
- Implement Tool Scenario Cards with `docs/tools/scenario-cards.json`, covering when to use/avoid SISO code-intelligence and validation tools, workflow stages, shell habits replaced, expected outputs, failure modes, related capabilities/contracts/benchmarks, and validation commands.
- Add `smoke:tool-scenario-cards`, Test Space coverage, and `tool-selection-correctness` benchmark metadata for scenario-first tool selection.
- Harden child completion delivery so hidden follow-up notifications require an explicit parent session scope, preventing unscoped subagent completions from being injected into unrelated chats.
- Start the child notification dispatcher with the actual `session_start` context so parent-session routing comes from the active chat rather than ambient process state.

## 0.1.96 - 2026-05-09
- Add a Claude Code-style session-scoped agent store under `~/.siso/agent/sessions/{sessionId}/agents/{agentId}/`, with compact agent records, raw event logs kept out of parent-visible details, and `eventCount` preserved for observability.
- Dual-write child agent status into the new session store while preserving existing child-run/task records, then project HUD/router state from the current session so subagents remain per-chat by construction.
- Add `smoke:session-store` plus capability/test-space coverage for the Session-Scoped Agent Runtime, and verify native spawn paths dual-write compact session agent records.
- Tighten `siso doctor` stale local-route detection to active profile config files so old transcript history cannot fail an otherwise clean install.

## 0.1.95 - 2026-05-09
- Document Tool Scenario Cards so lazy tool discovery teaches agents when to use tools, when not to use them, what alternatives to prefer, and how tool packs fit coding workflows.
- Clarify the live-context contract for lazy tool discovery: large registries and scenario cards stay in an external searchable index, while the prompt only receives tiny discovery schemas, a handful of ranked recommendations, and explicitly loaded full schemas.
- Document Lazy Tool Discovery and Loading as the design direction for exposing large tool universes through a tiny search/show/recommend/load interface instead of prompt-bloating schemas.
- Scope active child-agent status/HUD rows to the current chat/session so subagents spawned in one chat no longer appear below the input in unrelated or newly opened chats.
- Add a status-widget regression smoke for cross-session child leakage, and clear stale global router child snapshots when a fresh session starts.
- Record the proposed Autopilot Smoke Fix Loop as a future high-priority capability for bounded inspect/edit/test reruns without parent-chat token bloat.
- Force `smoke:context-explain` to run with full status tooling even when the ambient shell is in lean status mode, so `smoke:all` is deterministic.
- Add Agent Tooling to the Test Space plan/coverage map so the new toolkit is tracked by both capability and test-space validation.
- Fill the remaining capability registry write helpers with dry-run capable `capability_add` and `capability_update` implementations and smoke coverage.

## 0.1.94 - 2026-05-09
- Implement SISO agent tooling actions for structured repo search, multi-file reads, project trees/maps, file outlines, symbol search, workspace status/diff, summarized check runs, capability search/show/audit, context packs, task-aware repo briefings, Markdown outlines, doc updates, and atomic patch application.
- Add `smoke:agent-tooling` coverage and include the Agent Tooling Roadmap implementation in the capability registry.


## 0.1.93 - 2026-05-09
- Disable child-agent runtime budgets: `maxRuntimeMs` is now treated as deprecated/no-op and runtime budget checks no longer stop or mark MiniMax scouts over budget.
- Keep only concurrency-related child budget sanitization such as `maxParallel`, so child agents can use their full runtime while fleet fan-out remains controllable.
- Document the Agent Tooling Roadmap so high-leverage coding-agent tool ideas are preserved before implementation.
- Add `agent-tooling-roadmap` to the capability registry covering structured repo search, multi-file reads/context packs, project maps, symbol navigation, atomic patches, workspace diffs, summarized checks, docs helpers, capability registry tools, and task-aware codebase briefings.

## 0.1.92 - 2026-05-09

- Ensure `siso_context` returns the provider payload when prompt slimming is the only provider-boundary change, not only when regular tool-result replacements also happen.
- Add `measure:prompt-slim` to run prompt slimming against recent local provider-request dumps and fail unless at least one real sample reaches the configured 10x ratio.
- Update provider-filter declarations with `promptSlim` telemetry so callers can distinguish compaction-only wins from normal context-filter replacements.

## 0.1.91 - 2026-05-09

- Add provider-boundary prompt slimming in `siso_context` filtering: long provider histories now replace the old message prefix with one compact `SISO_PROMPT_SLIM` checkpoint while preserving the recent tail.
- Enable prompt slimming by default with `SISO_PROMPT_SLIM=0` as an escape hatch, plus tunables for max messages/chars, kept tail size, and summary size.
- Preserve current tool-use continuity by keeping the recent tail intact and avoiding cuts between an assistant tool-use and its following tool-result.
- Expand `smoke:context` to prove 300+ old messages shrink by more than 5x without losing the current tail.
- Real sample measurement: recent local provider payloads of 737k and 731k chars slimmed to about 39k and 36.5k chars, roughly 18.8x and 20x smaller.

## 0.1.90 - 2026-05-09

- Compact `siso_context` tool details for status, memory, central memory, supersede, pointers, and retrieve so raw pending events, memory bodies, and retrieved event text do not ride back in hidden details.
- Keep explicit `siso_context op=retrieve` visible output bounded by `maxChars`, while returning only compact event metadata in details.
- Make `smoke:agents-command` use current-relative timestamps so stale-agent assertions do not fail as fixed seed records age.
- Add `smoke:context-details` and include it in `smoke:all` to guard context-manager inspection paths against raw text payload regressions.

## 0.1.89 - 2026-05-09

- Compact child-control returned `records` for list/status/logs/interrupt/resume so raw child event arrays and huge final outputs no longer ride back inside tool details.
- Compact `/agents` command details for list/fleet/queue/report/detail/events/files/peek/name/resume/handoff so queued spawn payloads, raw `result.final`, and raw task events stay out of parent context.
- Add `smoke:child-control` plus `/agents` detail-shape assertions to keep child inspection/control paths from reintroducing hidden context bloat.

## 0.1.88 - 2026-05-09

- Stop the top-level composite `siso` tool wrapper from appending raw `permission_check` and `tool_result` event objects into returned `details`.
- Preserve wrapper observability by incrementing compact `eventCount` instead of returning raw event arrays.
- Extend `smoke:composite-result` through the real lean `siso` tool path so wrapper-level raw event payloads cannot regress.

## 0.1.87 - 2026-05-09

- Replace raw council/workflow child event arrays with bounded `eventCount` fields so composite SISO actions do not reintroduce hidden event-payload context bloat.
- Update council and workflow native bridge adapters to read compact native details (`id`, `status`, `tokens`, `compactResult`) instead of the removed raw `details.native` transcript shape.
- Add `smoke:composite-result` and include it in `smoke:all` to guard council/workflow details against raw event payloads.

## 0.1.86 - 2026-05-09

- Cap legacy foreground spawn result previews with `SISO_LEGACY_SUBAGENT_RESULT_MAX_CHARS`, defaulting to 900 chars plus a truncation marker and artifact pointer.
- Compact `publicSpawnResult()` details by removing raw event payloads, returning `eventCount`, capping final output, and replacing huge stderr previews with a pointer marker.
- Add `smoke:spawn-result` and include it in `smoke:all` so raw child stdout/stderr/events cannot creep back into model-visible spawn results.

## 0.1.85 - 2026-05-09

- Cap native subagent foreground result previews with `SISO_NATIVE_SUBAGENT_RESULT_MAX_CHARS`, defaulting to 900 chars plus a truncation marker.
- Stop returning raw nested native subagent transcripts in the `details` object; keep bounded usage, compact result, output char counts, and a small native summary instead.
- Expand native subagent smoke coverage so huge child output cannot be echoed back into the parent turn or hidden inside returned details.
- Align the native subagent bridge declaration with the current implementation shape.

## 0.1.84 - 2026-05-09

- Resolve `/skill ...` aliases and prefixes against one skill catalog snapshot instead of repeatedly querying the skill hub for each candidate.
- Add skill hub scan/cache-hit diagnostics and smoke coverage proving `/skill agent improve ...` performs one catalog scan even with the cache disabled.
- Cap single child-agent completion notification results with `SISO_CHILD_NOTIFICATION_RESULT_MAX_CHARS`, defaulting to a compact preview plus a full-output artifact pointer.
- Expand child notification smoke coverage so long subagent final output cannot be injected wholesale into the parent turn.

## 0.1.83 - 2026-05-09

- Cache SISO skill catalog metadata per process with a short TTL and `SISO_SKILL_CACHE=0` escape hatch, so repeated slash skill resolution no longer repeatedly scans every skill root.
- Keep `/skills` compact by default with a lower list cap and no path/heading dumps unless full output is explicitly requested.
- Cap `/skill` body injection with `SISO_SKILL_PROMPT_MAX_CHARS` and add a clear retrieval pointer when the loaded skill body is truncated.
- Restore the wrapper's status poll default to 2000ms so full HUD sessions stop rescanning child-run state every 500ms.
- Expand `smoke:skill-slash` to guard compact skill output and prompt-size capping for synthetic large skill catalogs.

## 0.1.82 - 2026-05-09

- Add a `siso doctor` smoke for the active profile `defaultModel`, currently `claude-opus-4-7` routed to GPT-5.5 through the Mac Mini Bifrost gateway.
- Keep the existing lightweight `gpt-5.4-mini` model smoke, but stop treating it as proof that the default Oracle route is healthy.
- Fail doctor clearly when the default route returns transient Codex auth/provider failures such as `auth_unavailable` or upstream EOF errors.

## 0.1.81 - 2026-05-09

- Keep active subagent rows in launch order instead of reordering them every time a child emits newer telemetry.
- Render child task labels as short 3-4 word summaries so long prompts do not dominate the footer.
- Collapse command-run diagnostics such as `Run commands ... latest bash tail ...` into readable labels like `Inspect TUI components`.
- Expand status-widget smoke coverage for stable ordering, command-diagnostic filtering, and compact task labels.

## 0.1.80 - 2026-05-09

- Stop exposing normal child-agent `maxTokens`, `maxTools`, `maxFleetTokens`, and `maxFleetTools` controls to the SISO spawn tools.
- Treat legacy token/tool budget inputs as ignored compatibility fields so spawned agents can use their full context instead of being aborted at tiny 2k/4k/6k local caps.
- Preserve operational guardrails that do not choke model context: `maxRuntimeMs` for runaway runtime and `maxParallel` for fleet concurrency.
- Update status and `/agents` smokes so token/tool overage is telemetry only, while runtime over-budget reporting remains available.
- Align SISO subagent defaults with Claude Code's pattern: separate child context, model/tool routing, max-turn style behavior, and completion notifications instead of small hard token ceilings.
- Repair local installs from the canonical SISO workspace by syncing the source package into `~/.siso-agent-base` before running doctor, so source/runtime version upgrades can actually activate locally.

## 0.1.79 - 2026-05-09

- Add an end-to-end subagent lifecycle smoke that launches a real background child through the SISO supervisor path.
- Verify completed child records come back scoped to the spawning parent session with parsed token and tool-call usage.
- Verify terminal child results deliver a hidden `siso-task-notification` parent follow-up with `triggerTurn: true` and `deliverAs: "followUp"`, matching the Claude Code-style return-to-parent flow.
- Keep the notification out of visible user-authored chat while still giving the parent agent task result context to answer naturally.
- Include the lifecycle smoke in the canonical `npm run smoke:all` suite.

## 0.1.78 - 2026-05-09

- Make the live SISO status timeline opt-in with `SISO_STATUS_TIMELINE=1` instead of publishing skill/tool/timeline rows during normal `siso` sessions.
- Keep the normal TUI focused on the native footer counters: context, calls, subagents, active agents, and the right-side model name.
- Preserve active child-agent loader rows and queued prompt rows while removing routine timeline accumulation below the editor.
- Expand status-widget smoke coverage so timeline rows stay hidden by default and still work when explicitly enabled.

## 0.1.77 - 2026-05-09

- Classify aggregate `siso action=spawn` timeline events as `Agents` instead of generic `Use tools`.
- Rewrite raw aggregate spawn labels in status timeline rows to human-readable `spawn agents` text.
- Add a broad-codebase task token floor so tiny child budgets such as 2k/4k are raised to 12k for repository/codebase/source-organization audits.
- Preserve explicit small budgets for narrow child tasks while marking adjusted broad-task budgets with `sisoAdjustedMinTokens`.
- Expand timeline and native subagent smoke coverage for spawn classification and broad-task budget normalization.

## 0.1.76 - 2026-05-09

- Add `npm run smoke:wrapper` for dynamic `siso` wrapper coverage.
- Verify `siso smoke help`, `list`, `--help`, and `-h` render smoke help without invoking npm.
- Verify focused wrapper routing maps `siso smoke release` to the installed `smoke:release` script.
- Include `smoke:wrapper` in the canonical `npm run smoke:all` suite.

## 0.1.75 - 2026-05-09

- Add `siso smoke help`, `siso smoke list`, `siso smoke --help`, and `siso smoke -h`.
- List common installed smoke targets directly from the wrapper without invoking npm.
- Show examples for full and focused smoke runs.
- Extend release metadata smoke coverage so smoke help remains discoverable.

## 0.1.74 - 2026-05-09

- Add `siso smoke [name]` as a wrapper shortcut for installed SISO Agent Base smoke scripts.
- Default `siso smoke` to the canonical `smoke:all` suite.
- Support focused runs such as `siso smoke release`, `siso smoke where`, and `siso smoke doctor`.
- Run smoke scripts against the active installed runtime directory so verification follows the same path as `siso`.
- Extend release metadata smoke coverage so the wrapper smoke command remains wired in.

## 0.1.73 - 2026-05-09

- Add `npm run smoke:doctor` for dynamic `siso doctor` version-parity coverage.
- Add a `SISO_DOCTOR_VERSION_ONLY=1` smoke mode so doctor parity can be tested without network/model/runtime dependency checks.
- Verify doctor passes when installed runtime and canonical source versions match.
- Verify doctor fails clearly when the installed runtime version drifts behind the canonical source.
- Include `smoke:doctor` in the canonical `npm run smoke:all` suite.

## 0.1.72 - 2026-05-09

- Add `npm run smoke:where` for dynamic `siso where` coverage.
- Verify `siso where` reports source version, runtime version, and `version status: match` for aligned source/runtime layouts.
- Verify `siso where` reports `version status: drift` and a warning when the runtime version falls behind the canonical source.
- Include `smoke:where` in the canonical `npm run smoke:all` suite.

## 0.1.71 - 2026-05-09

- Add source and runtime version lines to `siso where`.
- Show a `version status` field so the location map makes source/runtime drift visible immediately.
- Warn from `siso where` when the installed runtime version differs from the canonical source version.
- Extend release metadata smoke coverage so `siso where` keeps exposing version parity information.

## 0.1.70 - 2026-05-09

- Add a `siso doctor` check that compares the installed runtime `VERSION` with the canonical source `VERSION`.
- Fail doctor when the live install drifts from `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base`.
- Print the matching installed/source version when runtime and source are aligned.
- Extend release metadata smoke coverage so this doctor guardrail remains wired in.

## 0.1.69 - 2026-05-09

- Run `npm run smoke:release` inside `scripts/install-local.sh` before local install/update work continues.
- Block silent installs when `package.json`, `package-lock.json`, `VERSION`, or `releases/latest.json` drift apart.
- Add an explicit `SISO_SKIP_RELEASE_SMOKE=1` bypass for emergency/local debugging only.
- Extend release metadata smoke coverage so the installer keeps enforcing this guardrail.

## 0.1.68 - 2026-05-09

- Add `npm run smoke:all` as the canonical full local verification command.
- Run release metadata, router/status lean tools, Bifrost checks, context checks, task scope, `/agents`, child notifications, native subagent status, renderer polish, skill checks, and shell syntax in one ordered suite.
- Reduce release drift from hand-typed smoke chains before local installs.
- Keep individual smoke scripts available for focused debugging.

## 0.1.67 - 2026-05-09

- Add `npm run smoke:release` to verify release metadata before local installs.
- Check that `package.json`, `package-lock.json`, `VERSION`, and `releases/latest.json` all report the same version.
- Require non-empty latest release notes so local upgrade metadata stays useful.
- Prevent the `siso version` drift caught during the 0.1.66 install verification from silently recurring.

## 0.1.66 - 2026-05-09

- Add `/agents peek <task-id|name> <artifact> [bytes]` for bounded child artifact reads.
- Support safe peeks for scoped task artifacts such as stdout, stderr, events, transcript, summary, handoff, and task records.
- Cap peek output with `SISO_AGENT_PEEK_MAX_BYTES` so large child logs do not flood the parent context.
- Keep artifact peeks scoped to the current parent session so sibling-session child files stay hidden.
- Add `/agents peek` to `/agents help` and expand smoke coverage for bounded, missing, unknown, and hidden artifact reads.

## 0.1.65 - 2026-05-09

- Add a summary line to `/agents files` and `/agents paths`.
- Count existing, missing, and large artifacts before listing individual child paths.
- Keep per-path existence, size, directory, and large-file hints unchanged.
- Preserve path-only output so artifact triage does not pull child file contents into context.
- Expand `/agents` smoke coverage for artifact summary counts.

## 0.1.64 - 2026-05-09

- Add large-artifact hints to `/agents files` and `/agents paths`.
- Mark files at or above the large-artifact threshold with `large, use narrow reads`.
- Keep the default threshold at 50k bytes and allow tuning with `SISO_AGENT_LARGE_ARTIFACT_BYTES`.
- Preserve path-only output so child artifacts are not dumped into context.
- Expand `/agents` smoke coverage for large artifact warnings.

## 0.1.63 - 2026-05-09

- Add existence and compact size metadata to `/agents files` and `/agents paths`.
- Mark missing artifact paths explicitly instead of showing path-only rows.
- Show directory artifacts as `exists · dir`.
- Keep the command read-only and path-only so artifact lookup does not dump child logs, transcripts, or handoffs into context.
- Expand `/agents` smoke coverage for file existence and size metadata.

## 0.1.62 - 2026-05-09

- Add `/agents files <task-id|name>` and `/agents paths <task-id|name>` for scoped child artifact lookup.
- List task, events, transcript, summary, handoff, stdout, stderr, exit, artifact, and legacy child-run paths without dumping file contents.
- Keep artifact lookup scoped to the current parent session so sibling-session child files stay hidden.
- Add `/agents files` to `/agents help`.
- Expand `/agents` smoke coverage for artifact path lookup and hidden sibling protection.

## 0.1.61 - 2026-05-09

- Add `/agents help`, `/agents --help`, and `/agents -h` for the scoped subagent command surface.
- Document inspect, report, lifecycle filter, budget filter, stale filter, and control commands in one compact help output.
- Include duration examples for stale report thresholds.
- Route help before the legacy child-run fallback so `/agents help` no longer dumps old child records.
- Expand `/agents` smoke coverage for help output and discoverability.

## 0.1.60 - 2026-05-09

- Add `/agents report latest <limit>` and `/agents summary latest <limit>` for the most recently updated scoped child tasks.
- Support `recent` as an alias for `latest`.
- Treat `latest` and `recent` as report filters instead of fleet ids.
- Apply the latest limit before grouping so report totals describe the visible slice.
- Expand `/agents` smoke coverage for latest report filtering.

## 0.1.59 - 2026-05-09

- Add per-command stale threshold support for `/agents report stale <duration>`.
- Support duration suffixes `ms`, `s`, `m`, `h`, and `d`; bare numbers default to minutes.
- Apply the command threshold consistently to stale filtering, stale report headers, and empty-state messages.
- Keep `SISO_AGENT_STALE_MS` as the default when no command threshold is supplied.
- Expand `/agents` smoke coverage for custom stale thresholds and empty stale reports.

## 0.1.58 - 2026-05-09

- Show the active stale threshold in `/agents report stale`, `/agents report hung`, and `/agents report stuck`.
- Add per-child stale age text to report rows when active children have not updated recently.
- Keep stale detection based on the existing `SISO_AGENT_STALE_MS` threshold while making the report explain what it used.
- Expand `/agents` smoke coverage for stale threshold and stale-age report output.

## 0.1.57 - 2026-05-09

- Add `/agents report stale` for active child tasks that have not updated recently.
- Support `hung` and `stuck` as aliases for the stale active-agent report filter.
- Use `updatedAt` with a default 15 minute stale threshold, configurable through `SISO_AGENT_STALE_MS`.
- Return a clear empty-state message when no active scoped children are stale.
- Expand `/agents` smoke coverage for stale active-agent filtering.

## 0.1.56 - 2026-05-09

- Add `/agents report active`, `/agents report queued`, `/agents report completed`, and `/agents report failed` lifecycle filters.
- Support matching `/agents summary <filter>` aliases for the same lifecycle slices.
- Treat lifecycle keywords as report filters rather than fleet ids, while preserving arbitrary fleet-targeted reports.
- Add clear empty-state messaging for lifecycle filters with no matching scoped child tasks.
- Expand `/agents` smoke coverage for active and queued report filters.

## 0.1.55 - 2026-05-09

- Add `/agents report over-budget` and `/agents summary over-budget` for focused budget-pressure triage.
- Treat `over-budget` and `budget` as report filters instead of fleet names.
- Keep fleet-targeted reports working while separating fleet targets from special report filters.
- Return a clear empty-state message when no scoped child tasks exceed budgets.
- Expand `/agents` smoke coverage for over-budget report filtering.

## 0.1.54 - 2026-05-09

- Add budget-overrun counts to `/agents report` and `/agents summary` totals.
- Show per-child budget exceedance details in report rows using the same budget logic as `/agents status`.
- Surface token/tool budget pressure directly in fleet and parent-session reports without opening individual task details.
- Expand `/agents` smoke coverage for over-budget report totals and per-child budget text.

## 0.1.53 - 2026-05-09

- Add `/agents report <fleet-id>` and `/agents summary <fleet-id>` for fleet-scoped child rollups.
- Keep `/agents report <number>` working as a row limit while treating non-numeric arguments as fleet targets.
- Show the target fleet in the report header and return a clear empty-state message for missing fleets.
- Preserve parent-session scoping before applying the fleet filter so sibling sessions stay hidden.
- Expand `/agents` smoke coverage for fleet report filtering and empty fleet reports.

## 0.1.52 - 2026-05-09

- Add `/agents report` and `/agents summary` for parent-scoped subagent rollups.
- Report active, queued, completed, and attention-needed child groups with scoped totals.
- Include aggregate tokens, tool calls, event counts, and fleet ids without dumping raw transcripts.
- Show concise per-child report rows with status, role, usage, last tool, fleet, and summary.
- Expand `/agents` smoke coverage to prove reports stay scoped to the current parent session.

## 0.1.51 - 2026-05-09

- Show durable event counts in `/agents` list rows when a child task has an `events.jsonl` artifact.
- Show the latest formatted child event and event count in `/agents status <id|name>`.
- Surface the latest tool-call name in list rows so active workers reveal recent activity without opening raw logs.
- Rename the detail path label to `Events file` to keep the human summary separate from the artifact path.
- Expand `/agents` smoke coverage for event summaries in list and status output.

## 0.1.50 - 2026-05-09

- Add `/agents events <id|name> [limit]` for reading scoped child-agent event timelines.
- Show durable `events.jsonl` paths in `/agents status` output.
- Format lifecycle, tool-call, permission, and result events through the existing SISO agent-event formatter instead of exposing raw JSONL.
- Keep event lookup scoped to the current parent agent so concurrent SISO sessions do not see each other's subagents.
- Expand `/agents` smoke coverage for named event lookup and event limiting.

## 0.1.49 - 2026-05-09

- Add durable `events.jsonl` artifacts for scoped SISO child tasks.
- Persist normalized child lifecycle/tool events with task, root session, parent session, owner, and fleet scope metadata.
- Include the events artifact path in task records and terminal handoff files.
- Deduplicate event appends so repeated task-record writes do not replay the same lifecycle events.
- Add smoke and `siso doctor` coverage for durable task event logs.

## 0.1.48 - 2026-05-09

- Add a lean-router smoke test for `SISO_AGENT_ROUTER_TOOL_MODE=lean`.
- Verify lean router mode keeps `/skills`, `/skill`, `/siso-route`, and `/agents` commands registered.
- Verify lean router mode keeps only the aggregate `siso` tool visible while deferring split router tool schemas such as `siso_spawn`, `siso_child`, task, skill-hub, and repo-candidate tools.
- Add a `siso doctor` marker for lean router tool availability.

## 0.1.47 - 2026-05-09

- Keep `/siso-bifrost-metrics`, `/siso-bifrost-dashboard`, and `/siso-bifrost-duplicates` registered when `SISO_STATUS_TOOL_MODE=lean`.
- Continue deferring `siso_status` and Bifrost diagnostic tool schemas in lean mode so normal SISO requests stay smaller.
- Add a lean-mode smoke test proving slash commands remain available while status/Bifrost tools are not registered.
- Add a `siso doctor` marker for lean status command availability.

## 0.1.46 - 2026-05-09

- Add stable short `shape=` identifiers to `/siso-bifrost-duplicates` group headers.
- Hash the coarse prompt-shape fingerprint already used for duplicate grouping so suspicious repeated provider-call patterns can be referenced across runs.
- Expand duplicate-request smoke coverage for shape id output.

## 0.1.45 - 2026-05-09

- Make `/siso-bifrost-duplicates` choose `top_text` from each group's largest aggregate text section.
- Avoid misleading duplicate reports where `largest=large_other_text` but the preview row shows a bigger one-off `pi_kernel` block.
- Keep fallback behavior for groups without a matching top-text block.
- Expand duplicate-request smoke coverage for representative top-text selection.

## 0.1.44 - 2026-05-09

- Enrich `/siso-bifrost-duplicates` with bounded top text previews for each duplicate request group.
- Show dominant top tools per duplicate group so repeated subagent/tool-schema-heavy shapes are easier to spot.
- Add a short action hint per group based on the largest repeated section.
- Keep previews capped and sanitized so duplicate diagnosis does not dump raw prompt bodies back into context.
- Expand duplicate-request smoke coverage for top text, top tools, and hint output.

## 0.1.43 - 2026-05-09

- Add `/siso-bifrost-duplicates` for drilling into near-duplicate provider request groups from recent Bifrost metrics.
- Add `siso_bifrost_duplicates` as a tool-accessible version of the duplicate request report.
- Show duplicate group count, timestamps, model, average body/tool size, largest section, and SISO profile counts.
- Reuse the same coarse prompt-shape fingerprint as the dashboard warning so the warning has an immediate investigation path.
- Add duplicate-request smoke coverage for grouping, windows, profiles, body size, and largest-section output.

## 0.1.42 - 2026-05-09

- Add Bifrost dashboard warnings for request bursts across recent metrics rows.
- Add near-duplicate prompt-shape detection using coarse model/body/tool/category fingerprints.
- Show the largest aggregate text section in `siso_bifrost_dashboard` output.
- Keep warnings explicit that they are diagnostic signals for repeated provider calls, not exact billing proof.
- Add Bifrost dashboard smoke coverage for burst, duplicate-shape, and largest-section output.

## 0.1.41 - 2026-05-09

- Add bounded warnings to `/siso-context-explain` and `siso_status op=context`.
- Flag tool output when it is the largest context bucket so agents know to summarize or use retrieval pointers.
- Warn when tool schemas are heavy, history is large, or the visible context estimate is already high.
- Keep warning output capped and deterministic so context diagnosis stays readable.
- Expand context-explain smoke coverage for warning output through both command and tool paths.

## 0.1.40 - 2026-05-09

- Add `/siso-context-explain` to explain the current provider input/context breakdown without dumping raw prompt text.
- Add `siso_status op=context` for agents to inspect context composition through the existing SISO status tool.
- Report request size, input text size, tool schema size, history item count, estimated visible context tokens, category totals, and largest text blocks.
- Keep previews bounded so context debugging does not re-inject giant system prompts or tool outputs.
- Add context-explain smoke coverage for the formatter, slash command, and `siso_status` tool path.

## 0.1.39 - 2026-05-08

- Add a SISO status timeline reducer that groups raw activity into clean skill and tool-family rows.
- Render active subagents with Pi's native loader while showing grouped skill/tool timeline rows as plain compact text.
- Group repo search/read activity, edit activity, agent spawns, and command activity behind human-readable labels instead of raw tool diagnostics.
- Keep raw activity details out of the visible widget while preserving the underlying event stream for debugging.
- Add timeline smoke coverage and extend status-widget smoke coverage for grouped skill, search, and edit rows.

## 0.1.38 - 2026-05-08

- Refresh scoped `summary.md` and `handoff.md` artifacts when `updateScopedTaskRecord` applies direct `/agents` lifecycle changes.
- Include `cancelled` as a terminal status for handoff generation.
- Make handoff rendering work for both raw child-run records and canonical scoped task records.
- Prefer terminal error/cancel messages over stale prior success summaries when writing task artifacts.
- Keep `task.json`, `transcript.jsonl`, summary, and handoff artifacts aligned after cancel, drain, stop, and name updates.
- Expand task-scope smoke coverage for direct-update summary/handoff refresh.

## 0.1.37 - 2026-05-08

- Append compact transcript events when scoped task records are updated directly through `updateScopedTaskRecord`.
- Cover `/agents`-style lifecycle updates such as cancel, drain, stop, and name changes in each task's `transcript.jsonl`.
- Reuse the same structured transcript event shape as child-run task writes.
- Keep existing task summary, handoff, and task record behavior unchanged.
- Expand task-scope smoke coverage for transcript events emitted by direct scoped updates.

## 0.1.36 - 2026-05-08

- Add bounded retry/backoff to `siso doctor` gateway health and model smoke checks.
- Keep network retries configurable with `SISO_DOCTOR_NET_RETRIES`, defaulting to 3 attempts.
- Suppress raw curl timeout noise during model smoke retries while preserving final pass/fail reporting.
- Preserve strict failures for invalid keys, missing profile/runtime files, stale routing, and missing extensions.
- Verify the hardened doctor path with syntax smoke, full package smoke, and a live doctor run.

## 0.1.35 - 2026-05-08

- Append compact JSONL lifecycle events to each scoped task's `transcript.jsonl` path on task record writes.
- Capture task status, parent/root/owner scope, fleet id, role/model, token/tool progress, queue metadata, summaries, and errors in transcript events.
- Keep transcripts compact and structured so parent agents can inspect task history without loading raw child stdout/stderr.
- Preserve existing `task.json`, `summary.md`, and terminal `handoff.md` behavior.
- Expand task-scope smoke coverage for transcript creation and event content.

## 0.1.34 - 2026-05-08

- Preserve queued task records when `/agents drain` still hits fleet max-parallel or aggregate budget policy.
- Report blocked drain attempts as `blocked <task-id>: <reason>` instead of marking the queued record dispatched.
- Refresh the queued reason on blocked drain attempts so operators can see the latest fleet policy blocker.
- Keep successful drain behavior unchanged for queued tasks that can be dispatched.
- Expand command smoke coverage for blocked drain preservation.

## 0.1.33 - 2026-05-08

- Add `/agents cancel <queued-task-id|name|fleet-id>` for parent-scoped queued work cancellation.
- Cancel direct queued tasks or every queued task in a visible fleet without touching running children or sibling-session queues.
- Mark cancelled queued records as `cancelled` with readable parent/fleet reasons and remove their queued spawn payloads.
- Count cancelled tasks as failed/terminal in scoped fleet summaries so stale queue cleanup stays visible.
- Expand command smoke coverage for queued fleet cancellation and post-cancel queue filtering.

## 0.1.32 - 2026-05-08

- Add queued task counts to scoped `/agents` summaries and `/agents fleets` output.
- Render queued child tasks distinctly in `/agents` lists with queue age and fleet id.
- Add `/agents queue [fleet-id]` to inspect parent-scoped queued work without launching it.
- Show queued timestamps and queue reasons in `/agents status <task-id-or-name>`.
- Expand command smoke coverage for queue summaries, queue filtering, and queued status details.

## 0.1.31 - 2026-05-08

- Queue max-parallel-blocked fleet spawns as scoped `queued` task records instead of only rejecting them.
- Persist queued spawn payloads, queue timestamps, and readable queue reasons on scoped task records.
- Add `/agents drain <fleet-id> [limit]` to dispatch queued parent-owned fleet work when capacity is available.
- Keep queue draining explicit and parent-scoped so SISO does not unexpectedly launch sibling-session work.
- Add smoke coverage for queued fleet records and `/agents drain` dispatch bookkeeping.

## 0.1.30 - 2026-05-08

- Add spawn-level fleet dispatch policy fields `maxParallel`, `maxFleetTokens`, and `maxFleetTools`.
- Preflight each fleet spawn against parent-scoped active children and aggregate fleet usage before launching native or legacy child agents.
- Record blocked fleet spawns as scoped `unsupported` task records with readable reasons instead of silently over-dispatching.
- Keep fleet dispatch checks parent-scoped so sibling sessions do not affect or leak into the current agent's fleet policy.
- Expand subagent smoke coverage for max-parallel fleet blocking and blocked task record persistence.

## 0.1.29 - 2026-05-08

- Add `fleetId`, `budget`, `maxTokens`, `maxTools`, and `maxRuntimeMs` fields to `siso` spawn and `siso_spawn`.
- Thread spawn-level fleet ids and budget caps through native subagent status/details and legacy child-run records.
- Persist per-dispatch fleet and budget metadata into scoped task records for `/agents fleets`, `/agents status`, and budget governor enforcement.
- Keep global `SISO_TASK_MAX_*` env budgets as fallback/defaults while allowing each spawned child to carry stricter local caps.
- Expand subagent smoke coverage for budgeted fleet metadata written through the spawn bridge into scoped task records.

## 0.1.28 - 2026-05-08

- Add `/agents stop <task-id|name|fleet-id>` plus `interrupt` and `abort` aliases for parent-scoped child control.
- Resolve direct task ids/names before fleet ids, then stop only running tasks visible to the current parent scope.
- Mark stopped scoped tasks as `aborted` with a readable parent/fleet reason even when no legacy child-run process is available.
- Keep sibling or other-parent tasks hidden and untouched during fleet stops.
- Expand `/agents` smoke coverage for fleet stop behavior and sibling isolation.

## 0.1.27 - 2026-05-08

- Add shared task budget evaluation for token, tool, and runtime limits from scoped task records and SISO budget env vars.
- Enforce background child budgets during live status polling by marking runaway children aborted with a readable budget reason.
- Preserve normal live telemetry persistence when a child is still within budget.
- Reuse the shared budget evaluator in `/agents status` so command warnings match the governor.
- Add status smoke coverage proving a background child is aborted when live token usage exceeds its configured budget.

## 0.1.26 - 2026-05-08

- Batch multiple completed child task notifications into one hidden `siso-task-notification-batch` parent follow-up.
- Include child task ids, statuses, fleet ids, handoff paths, token usage, tool usage, and durations in the batch XML.
- Mark every child in a batch delivered exactly once while syncing scoped task records.
- Add `/agents fleets` and `/agents fleet [fleet-id]` scoped fleet summaries for parent-owned task groups.
- Add smoke coverage for batch notifications and scoped fleet command output.

## 0.1.25 - 2026-05-08

- Add scoped task names/handles so parent agents can assign stable labels such as `@verifier` to children they own.
- Add `/agents name <task-id> <name>` and allow `/agents status` / `/agents handoff` to resolve either task ids or scoped names.
- Mark named tasks as addressable in canonical task records while keeping sibling/other-parent tasks hidden.
- Add conservative `/agents resume <task-id-or-name> <message>` routing through the legacy child-run resume path only when a scoped task has a compatible legacy child-run path.
- Show budget warnings in `/agents status` when scoped task records reach configured token/tool limits.
- Expand command smoke coverage for naming, addressability, budget warnings, name lookup, handoff lookup, and conservative resume messaging.

## 0.1.24 - 2026-05-08

- Add parent-scoped `/agents` list, detail, and handoff views backed by the scoped task registry instead of the global legacy child-run list.
- Keep sibling/other-parent child tasks hidden from `/agents`, `/agents status <id>`, and `/agents handoff <id>` unless they belong to the current parent scope.
- Add scoped fleet summaries with running/completed/failed counts, total token/tool telemetry, and fleet ids.
- Carry optional fleet id and basic task budget metadata into canonical task records for later fleet governors.
- Track background child stdout offsets during status polling so live token/tool telemetry is parsed incrementally rather than re-counted on every poll.
- Add command smoke coverage for scoped `/agents` behavior and expand status-widget coverage for delta parser non-duplication.

## 0.1.23 - 2026-05-08

- Add a scoped SISO task registry for child agents with `rootSessionId`, `parentSessionId`, `ownerAgentId`, optional `spawnedByTaskId`, depth, and durable task paths.
- Write canonical task records under `~/.siso/agent/tasks/<root-session>/tasks/<task-id>/task.json` while preserving legacy `~/.siso/agent/child-runs` compatibility.
- Write terminal child handoffs to `handoff.md` so completed/failed children produce durable parent-readable documents instead of relying only on chat/tool output.
- Filter child completion notifications by parent session so a parent agent only receives results for children it owns.
- Update status polling to use scoped visibility checks and keep scoped task records in sync when live background telemetry or terminal state changes.
- Add smoke coverage for scoped task records, handoff generation, parent/sibling visibility, and parent-scoped notification delivery.

## 0.1.22 - 2026-05-08

- Preserve human task text for file-backed background child agents from launch through the below-editor active-agent loader.
- Parse live background child stdout while the child is still running so the loader can update token and tool counts before the process exits.
- Prefer background child exit markers over dead supervisor PID checks so clean completions are not rewritten as aborted.
- Keep parsed background child telemetry on the child-run record and surface it through the active widget without exposing raw child ids.
- Repair native Pi footer counter parsing so it recognizes SISO status text such as `1 agent` and `3 calls`, not only label-before-number forms.
- Expand status/render smoke coverage for live background telemetry, task-label preservation, completed-exit handling, and footer parser markers.

## 0.1.21 - 2026-05-08

- Fix background child task notifications so completed child results are fed back as hidden Pi custom messages instead of visible user-authored XML.
- Stop replaying old child-run records on fresh `siso` startup by requiring notification candidates to have started after the current Pi session began.
- Remove the immediate startup notification tick so the dispatcher does not collide with Pi while a new prompt/session is still initializing.
- Preserve child-run lifecycle `updatedAt` when marking parent notification delivery or the older terminal `notified` flag, preventing old runs from being made to look fresh.
- Expand child notification smoke coverage for hidden custom delivery, stale-run suppression, duplicate prevention, and timestamp preservation.

## 0.1.20 - 2026-05-08

- Add `/skills` to list/filter available SISO/Pi profile skills from chat.
- Add `/skill <skill-name-or-query> [instructions]` to resolve a skill, expand its `SKILL.md`, and send it back through the agent as a skill-guided prompt.
- Add the friendly `/skill agent improve ...` alias for the `improve-agent-system` workflow.
- Add smoke coverage for the new slash skill commands.
- Add Claude Code-style background child task notifications: terminal child runs now enqueue a user-role `<task-notification>` through `pi.sendUserMessage(..., { deliverAs: "followUp" })` so the parent agent can wake back up and answer naturally.
- Add a SISO child notification dispatcher, XML notification formatter, and exactly-once delivery guard using `parentNotifiedAt` / `parentNotification.deliveredAt` rather than the older lifecycle `notified` flag.
- Route `background=true` child spawns through the file-backed legacy runner so SISO can watch completion records and feed results back into the parent chat.
- Add profile guidance telling the parent to treat `<task-notification>` messages as internal SISO signals, not visible user-authored chat.
- Add smoke coverage for notification formatting, follow-up delivery, running-child suppression, and duplicate prevention.

## 0.1.19 - 2026-05-08

- Restore Claude Code-style parent re-entry for SISO child agents by returning a clean parent-facing result block after spawn completion instead of metadata-only tool output.
- Include the child task, profile, model, token count, tool-call count, and final result text in native and legacy spawn outputs so the foreground agent can answer back in chat.
- Parse Pi native subagent `details.results[].usage` and assistant/tool messages so active status rows and completed spawn results can show real usage when the native subagent reports it.
- Keep using the local Claude Code-like research repo only as a behavior reference: terminal lifecycle first, then exactly one parent-facing child result.

## 0.1.18 - 2026-05-08

- Move the active subagent loader to the surface below Pi's context/footer line by patching native layout order from `editor -> below widget -> footer` to `editor -> footer -> below widget`.
- Enrich the active subagent loader label with the child task, elapsed runtime, compact token count, and tool-call count.
- Preserve child task text in native and legacy child status snapshots so the loader can show what the child is actually doing instead of a static `Spawning ...` label.
- Update renderer and status-widget smoke coverage for the below-footer placement and live metrics display.

## 0.1.17 - 2026-05-08

- Replace the active subagent text spinner with Pi's native `Loader` component so the above-prompt row uses the same animated loading mechanism as the built-in working indicator.
- Keep the human-readable active-agent message (`Spawning MiniMax worker ...`) while letting Pi own the animated spinner frames.
- Stop native loader instances when the widget refreshes so repeated status updates do not leave animation intervals running.
- Update smoke coverage to require a widget factory that renders a native Loader spinner rather than plain string lines.

## 0.1.16 - 2026-05-08

- Move the active subagent widget above the prompt so SISO does not render child-agent state below the text input.
- Replace the drawer-style `agents ...` display with a single human-readable spinner row such as `Spawning MiniMax worker · MiniMax M2.7 · now · <task>`.
- Hide raw child ids, token counts, lanes, and other implementation details from the active subagent loading row.
- Update status-widget smoke coverage to require above-editor placement, spinner-style loading, human-readable names, and no raw child ids.

## 0.1.15 - 2026-05-08

- Restrict the below-editor SISO widget to active subagent status only, so prompt entry is no longer followed by leaked `run`, `ctx`, `tools`, `activity`, or prompt-breakdown diagnostics.
- Simplify the active agent drawer to show only the live agent count and animated child rows while the native footer remains the single context/model/calls surface.
- Add status-widget smoke coverage that rejects diagnostic leakage and proves a single active child renders as one drawer row plus one animated launch row.

## 0.1.14 - 2026-05-08

- Remove the duplicate `π · ctx ...` line from the full SISO widget under the editor input.
- Keep the native Pi footer as the single context/model/status HUD while preserving the agent drawer for active child agents.
- Add smoke coverage so the full widget cannot reintroduce a redundant footer/context line.

## 0.1.13 - 2026-05-08

- Stop the full SISO status widget from showing global historical child-run records when the current Pi session id is unavailable.
- Hide completed/failed child history from the editor drawer unless active children are present for the current session.
- Treat background/running child records with dead PIDs as aborted so stale supervisors do not appear as active agents.

## 0.1.12 - 2026-05-08

- Remove the old `/Users/shaansisodia/siso-agent-base` compatibility symlink so the workspace repo is the only editable source path.
- Delete legacy Pi Harness Lab tombstone/archive folders after curating useful research into the canonical SISO Agent Base docs.
- Rename curated old-lab documentation folders to `legacy-agent-research` so future agents do not treat `pi-harness-lab` as an active product surface.
- Move context-manager and transcript defaults from `~/.siso/pi-harness-lab` to `~/.siso/agent/...` so the hidden lab folder is not recreated during normal use.
- Sync the active installed runtime with deletion enabled so stale copied legacy folders disappear from `~/.siso-agent-base`.

## 0.1.11 - 2026-05-08

- Move the canonical local source repo to `/Users/shaansisodia/SISO_Workspace/SISO_Agent_Base`.
- Add `siso where` to print the active command, canonical source, installed runtime, profile, SISO home, current directory, and git root.
- Warn from `siso doctor` and `siso where` when agents launch from legacy lab or generated runtime folders instead of the canonical source repo.
- Keep `~/.siso-agent-base` as generated installed runtime and `~/.siso/agent` as active profile/state, not editable package source.

## 0.1.10 - 2026-05-08

- Add the `improve-agent-system` SISO profile skill for agent-system improvements: read current version/changelog, identify a scoped high-leverage issue, change source first, verify, install locally, bump version, and update changelog.
- Ship profile skills from `templates/profile/skills` during install/update and teach the SISO skill hub to discover `~/.siso/agent/profile/skills`.
- Add a package smoke test proving the improvement workflow skill is discoverable and contains the required version/changelog/install guardrails.

## 0.1.9 - 2026-05-08

- Make the restored native subagent child state visible by rendering the full SISO status widget/agent drawer in `siso-status`.
- Enable full status UI, faster status polling, and compact router UI by default in the `siso` launcher.
- Animate active child-agent glyphs in the agent drawer and add a smoke test proving active child rows are published to the widget surface.

## 0.1.8 - 2026-05-08

- Restore SISO child status publishing when spawns use Pi's native `subagent` runtime so the HUD/agent drawer can show active child-agent state again.
- Include `child_id`, `child_status`, and token fields in native subagent results so compact SISO renderers classify them as agent results.
- Enforce child-agent context tiers in legacy spawn prompts: scout/`none` profiles get no context packet, while project profiles drop global rules, global lessons, and memory-index excerpts.
- Add a native-subagent status smoke test that proves native child launches publish `running` and terminal snapshots.
- Tighten native renderer smoke coverage so duplicated animation helper methods are caught instead of silently accumulating across update/repair runs.
- Keep the 0.1.7 context-meter and provider-payload filtering fixes.

## 0.1.7 - 2026-05-08

- Fix the native SISO footer context meter so it uses Pi's live `session.getContextUsage()` estimate instead of cumulative session input/output tokens.
- Filter Minimax/Anthropic-style provider payloads that use `messages[]`, including nested `tool_result` content, before they reach Bifrost.
- Keep Responses API `input[]` filtering intact and add package-level smoke coverage for both payload shapes.
- Make the native renderer patch idempotent so repeated update/repair runs do not duplicate animation helpers or corrupt renderer braces.

## 0.1.6 - 2026-05-08

- Pin the launcher to the exact bundled Pi CLI path instead of relying on potentially stale `node_modules/.bin/pi` symlinks.
- Repair stale or half-patched runtime dependencies automatically during install/update.
- Verify SISO HUD/router extensions and native Pi renderer polish against the bundled Pi runtime.
