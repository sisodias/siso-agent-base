# Reverse Engineering Infrastructure Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use the cheapest capable research profile first. Workers write evidence-backed artifacts only. The synthesis agent decides what becomes Pi harness code.

**Goal:** Build a repeatable pipeline for reverse engineering JCode and other agent harness repos, then converting the best patterns into Pi+Bifrost+SISO features without prompt bloat.

**Architecture:** Treat every external codebase as an evidence source, not a dependency by default. MiniMax/Spark scouts produce small structured reports, a synthesis lane ranks features, and implementation workers land Pi-native adapters behind `siso`, `pi-codex doctor`, and the status/dashboard surfaces.

**Tech Stack:** Pi, Bifrost, TypeScript, Node scripts, JSON/JSONL research artifacts, `packages/siso-agent-router`, `packages/siso-status`, `packages/siso-lifecycle`.

---

## North Star

We are not cloning JCode, OpenCode, Claude Code, or any other harness wholesale.

We are building the SISO agent harness:

- GPT-5.5 main agent for top-level reasoning and planning.
- Bifrost as the model router.
- MiniMax as the default scout/worker/verifier fleet.
- Spark for heavier implementation/review lanes.
- Codex for adversarial review and rescue.
- Pi as the interactive shell.
- SISO skills, memory, routing, feedback, and hooks as lazy runtime capabilities.

Every external repo goes through the same funnel:

```text
discover -> clone/snapshot -> scout -> feature map -> synthesis -> implementation plan -> adapter -> test -> dogfood
```

## Repository Layout

Create or standardize these areas:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/
  research/
    sources/                         # cloned or vendored external repos
    inbox/                           # raw worker reports, one file per worker/repo
    queues/                          # batch queues for subagent research
    scorecards/                      # normalized repo + feature scorecards
    syntheses/                       # batch synthesis outputs
  docs/
    reverse-engineering-infrastructure-plan.md
    jcode-feature-map.md             # human-readable JCode extraction map
    reusable-repo-analysis-playbook.md
  decisions/
    YYYY-MM-DD-<feature>-source.md   # accepted/rejected source decisions
  packages/
    siso-agent-router/               # routing, skills, spawn, council, repo recommender
    siso-status/                     # token/status/dashboard surfaces
    siso-lifecycle/                  # Pi lifecycle hooks
  scripts/
    create_research_queue.mjs
    synthesize_research_batch.mjs
    inspect_repo_candidate.mjs
    pi-codex-doctor.mjs
```

## Artifact Contracts

Every worker report should be strict JSON so another agent can synthesize it without rereading the whole repo.

Path:

```text
research/inbox/<repo-slug>.<lane>.<agent-id>.json
```

Shape:

```json
{
  "repo": "1jehuang/jcode",
  "source_path": "/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/1jehuang-jcode",
  "lane": "swarm|search|memory|provider|ui|mcp|testing|performance",
  "confidence": "high|medium|low",
  "summary": "One paragraph with the actual useful pattern.",
  "features": [
    {
      "name": "Structure-aware grep",
      "why_it_matters": "Gives agents code context without dumping whole files.",
      "evidence": [
        {
          "path": "README.md",
          "lines": "120-170",
          "claim": "README documents agentgrep as adaptive code search."
        }
      ],
      "copy_strategy": "port-pattern|wrap-package|reference-only|reject",
      "pi_target": "scripts/pi-brain-grep.mjs",
      "first_test": "npm run brain:grep -- \"spawn\" -- --pretty"
    }
  ],
  "risks": [
    {
      "risk": "Full harness adoption would compete with Pi instead of improving it.",
      "mitigation": "Only port narrow patterns behind existing siso/Pi surfaces."
    }
  ],
  "recommended_next_action": "Prototype structure-aware grep in the existing brain:grep slice."
}
```

## Subagent Roles

Use subagents as lanes, not as random extra chat windows.

| Role | Default model | Writes | Purpose |
| --- | --- | --- | --- |
| Repo scout | MiniMax | `research/inbox/*.json` | One repo, one feature lane, evidence only |
| Claude asset scout | MiniMax | `research/inbox/claude-assets.*.json` | Map global `.claude` assets to lazy Pi capabilities |
| Synthesis agent | Spark or GPT-5.5 | `research/syntheses/*.md/json` | Rank features and pick build slices |
| Planner | GPT-5.5 | `docs/*-implementation-plan.md` | Produce exact implementation plan |
| Worker | MiniMax or Spark | code/tests | Implement scoped adapter |
| Verifier | MiniMax | test reports | Run smokes, token budgets, and regression checks |
| Codex reviewer | Codex | review report | Adversarial review before calling it good |

Worktrees are task-level, not agent-level:

- Read-only scouts stay in the main checkout or a cloned source folder.
- Implementation workers share a task worktree when they are contributing to the same slice.
- Separate risky slices get separate worktrees.
- No per-agent worktree churn.

## JCode First-Pass Lanes

JCode gets split into these research lanes:

1. `search`: `agentgrep`, structure-aware search, adaptive truncation.
2. `swarm`: coordinator, worktree manager, child lifecycle, file-touch notifications.
3. `memory`: memory graph, sidecar verification, session resume.
4. `provider`: provider profiles, model routing, MCP/config import.
5. `performance`: startup time, RAM, cache budgets, context budgets.
6. `ui`: TUI status, session switching, child-agent visibility.
7. `testing`: smoke tests, regression gates, dogfood loops.

Each lane returns evidence and one implementation recommendation.

## Scout Synthesis: 2026-05-06

Three MiniMax read-only scouts reviewed the lab, JCode, and global Claude migration surface.

Their consensus:

- The lab already has the right primitives: profile registry, route policy, workflow fan-out, task store, status dashboard, research catalogs, and Bifrost token metrics.
- The missing layer is a first-class reverse-engineering run system that creates queue items, stores artifacts, validates evidence, synthesizes handoffs, and promotes only verified candidates to Pi implementation tasks.
- JCode should be mined first for `agentgrep`, file-touch coordination, memory/performance budgets, MCP/config import, provider profile UX, and resume/import patterns.
- Global Claude should not be copied into Pi. The correct migration is compact startup rules plus lazy skill/context loaders and runtime extensions.

Immediate JCode copy order:

1. `agentgrep`-style structure in `pi-brain-grep`.
2. File-touch conflict telemetry for SISO workers.
3. Budget guardrail expansion before dynamic MCP/tools.
4. Read-only MCP/config import inspection.
5. Provider profile doctor/setup UX.
6. Resume index for Pi child runs and checkpoints.

Immediate global Claude copy order:

1. Keep `/Users/shaansisodia/.pi-bifrost/agent/SYSTEM.md` as the compact startup kernel.
2. Keep `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/context-loader.ts` as the lazy context loader.
3. Keep `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/skill-hub.ts` as the lazy skill loader.
4. Keep `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/profile-registry.ts` as the Claude-agent-to-Pi-profile translation layer.
5. Keep extending `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-lifecycle/src/index.ts` for hook behavior.

Hard excludes from startup:

- `/Users/shaansisodia/.claude/projects`, except the active project `MEMORY.md` index snippet.
- `/Users/shaansisodia/.claude/_quarantine`.
- `/Users/shaansisodia/.claude/extensions`.
- `/Users/shaansisodia/.claude/plugins`.
- `/Users/shaansisodia/.claude/file-history`.
- `/Users/shaansisodia/.claude/transcripts`.
- `/Users/shaansisodia/.claude/history.jsonl`.
- Full skill bodies.
- Hook source code.
- Old plans and feedback unless active-path or explicitly requested.

## Feature Selection Rules

Accept a feature only when it passes all five checks:

1. **Leverage:** It makes Pi meaningfully better as a Claude Code replacement.
2. **Token discipline:** It reduces or avoids prompt/tool/schema bloat.
3. **Pi-native path:** It can be expressed through `siso`, a Pi extension, or a wrapper script.
4. **Small first slice:** It can ship behind one testable command or status surface.
5. **Dogfood value:** Shaan can feel it in daily `pi-codex` use.

Reject or defer when:

- It requires adopting another full harness runtime.
- It eagerly loads big context.
- It duplicates an existing Pi/SISO capability with no clear improvement.
- It adds a dependency before we have measured the current baseline.

## Integration Pipeline

### Phase 1: Research Intake

- Create a queue item per repo/lane.
- Dispatch MiniMax scouts.
- Store strict JSON reports in `research/inbox`.
- Require exact evidence paths.

### Phase 2: Synthesis

- Read the queue and inbox reports.
- Produce `research/syntheses/<batch>.json` with:
  - `implement_now`
  - `prototype_next`
  - `inspect_more`
  - `reference_only`
  - `reject`
  - `risk_register`
- Update `docs/jcode-feature-map.md` for human scanning.

### Phase 3: Planning

- For each `implement_now` feature, write a focused implementation plan.
- Plan must name exact files, tests, smoke commands, token budget checks, and rollback path.
- First JCode-derived plan should be `structure-aware brain grep`.

### Phase 4: Implementation

- Implement behind existing surfaces:
  - `npm run brain:grep`
  - `siso action="repo" ...`
  - `siso action="spawn" ...`
  - `~/bin/pi-codex doctor`
  - `~/bin/pi-codex dashboard`
- Keep startup kernel unchanged unless a token-budget test proves improvement.

### Phase 5: Verification

Run:

```bash
npm run verify:local
npm run verify:live
```

Feature-specific gates:

```bash
npm run brain:grep -- "spawn-layer" -- --pretty
~/bin/pi-codex doctor
~/bin/pi-codex dashboard --json
```

Bifrost/token gates:

- `tool_count <= 9`
- `tool_chars <= 8000`
- `pi_kernel <= 2000`
- baseline `body_without_tools_chars <= 7000`
- lazy skill row `body_without_tools_chars <= 9000`
- child/council budget unchanged unless intentionally updated.

### Phase 6: Dogfood

- Use `~/bin/pi-codex` to inspect and improve `pi-harness-lab`.
- Every missing feature becomes a queue item, not a vague TODO.
- Every accepted external pattern gets a decision record.
- Every token regression gets a failing budget check.

## Parallel Codebase Support

The same system should handle JCode, OpenCode, Pi packages, MCP repos, memory engines, code search engines, and Claude/Codex ecosystem repos.

For each new repo:

1. Add or confirm source under `research/sources`.
2. Add a broad catalog row if missing.
3. Create lane-specific queue items.
4. Dispatch scouts with one lane each.
5. Synthesize into feature families, not raw links.
6. Promote only the smallest testable adapter.

## First Implementation Targets

1. **JCode-style structure-aware grep**
   - Target: `scripts/pi-brain-grep.mjs`
   - Add: file outline around matches, seen-file adaptive output, compact JSON mode.
   - Verify: `npm run brain:grep -- "spawn-layer" -- --pretty`.

2. **Research queue automation**
   - Target: `research/scripts/create_research_queue.mjs`, new `research/scripts/synthesize_research_batch.mjs`.
   - Add: JCode lane queue generator and synthesis artifact builder.
   - Verify: generated queue and synthesis JSON parse cleanly.

3. **JCode feature map**
   - Target: `docs/jcode-feature-map.md`.
   - Add: lane-by-lane findings with evidence and Pi integration target.
   - Verify: every accepted feature has at least one local evidence path.

4. **Swarm/worktree policy**
   - Target: `packages/siso-agent-router/src/spawn-layer.ts`, `packages/siso-agent-router/src/workflow-layer.ts`.
   - Add: coordinator-only child spawning policy and task-level worktree notes/status.
   - Verify: worker guard tests and workflow smoke tests still pass.

5. **Doctor budget expansion**
   - Target: `scripts/pi-codex-doctor.mjs`, `packages/siso-status/src/bifrost-metrics.ts`.
   - Add: context section breakdown and budget status for research/skill/kernel rows.
   - Verify: `~/bin/pi-codex doctor` surfaces bloat causes.

## Operating Rule

Main agent owns strategy. Subagents collect evidence. Synthesis converts evidence into features. Workers implement narrow slices. Verifiers and Codex review before the harness is trusted.

No feature enters the Pi harness because it is impressive. It enters because it makes `pi-codex` smaller, smarter, more inspectable, or better at running cheap parallel workers.
