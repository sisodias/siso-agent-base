# Tool Scenario Cards

Purpose: make SISO tool discovery answer the most important question: **when should an agent use this tool?**

A large tool registry is useless if agents only know tool names. Tool metadata must encode scenarios, triggers, anti-triggers, examples, and routing guidance so agents can pick the smallest correct tool without loading every schema.

## Live context budget

Scenario cards are not meant to be dumped into the prompt.

The agent should view tool scenarios through retrieval:

1. The model always sees only the tiny discovery tools.
2. The model calls `tool_recommend` or `tool_search` for the task.
3. The runtime returns a small, ranked set of scenario cards.
4. The model can call `tool_show` for one card if it needs more detail.
5. Full executable schemas appear only after an explicit load step.

Even if the registry contains thousands or millions of tools, a normal turn should expose only a handful of cards. The scenario registry is an external index, not live context.

Default output target for `tool_recommend`:

```json
{
  "taskIntent": "codebase exploration before edit",
  "recommendations": [
    {
      "id": "repo-navigation",
      "reason": "Need to inspect existing code before editing.",
      "useFirst": "repo.brief",
      "when": "Use for locating and summarizing relevant repo context.",
      "avoid": "Do not use for pure chat or known exact file reads."
    }
  ]
}
```

That is enough for the agent to decide. Longer examples and full schemas should be behind `tool_show` / `tool_load`.

## Design principle

Tool discovery should be scenario-first, not schema-first.

Bad discovery result:

```text
repo_search — searches a repo
```

Good discovery result:

```text
repo_search — Use when you need to locate files, symbols, config, docs, or code references and you do not already know the exact path. Do not use when you already have the file path and only need contents; use read_many instead.
```

## Industry patterns to borrow

### Claude Code-style guidance

Coding agents work best when tool descriptions include operational policy, not just parameter docs:

- what the tool does
- when to use it
- when not to use it
- batching expectations
- safety constraints
- examples of common calls
- preferred alternatives

SISO should adopt this style in compact metadata and only load full schemas on demand.

### Sourcegraph/Cody-style code intelligence

Sourcegraph makes search powerful by exposing search modes and query affordances:

- known exact text → literal search
- unknown location → repo/path/file filters
- symbol navigation → definitions/references
- impact analysis → references/dependency graph
- broad exploration → result ranking and grouped matches

SISO scenario metadata should encode the same intent distinctions.

### Cursor/Continue/Cline/Aider-style workflows

These systems reduce friction by routing users/agents toward workflows:

- gather context before editing
- prefer targeted reads over whole-repo dumps
- apply patches in small reviewable batches
- run relevant tests after edits
- summarize failures before fixing
- keep repo maps/memory to avoid rediscovery

SISO tools should declare workflow positions: `discover`, `inspect`, `edit`, `verify`, `repair`, `document`, `delegate`, `release`.

### Large tool-universe research patterns

Tool retrieval systems generally need:

- compact descriptions for retrieval
- semantic tags/embeddings
- scenario examples
- negative examples
- ranking by intent, cost, and risk
- progressive schema disclosure
- feedback from successful/failed usage

SISO should make tool selection a retrieval/routing problem, not a giant prompt problem.

## Tool Scenario Card format

Every tool and pack should have a compact scenario card.

```json
{
  "id": "repo.search",
  "pack": "repo-navigation",
  "name": "Repo Search",
  "summary": "Structured text, regex, symbol-ish, or filename search over the current repo.",
  "workflowStage": ["discover", "inspect"],
  "risk": "read-only",
  "cost": "low",
  "useWhen": [
    "You need to find where a concept, function, command, config, doc, or error string appears.",
    "You do not know the exact file path yet.",
    "You need a small set of candidate files before reading contents."
  ],
  "doNotUseWhen": [
    "You already know the exact files to inspect; use read_many.",
    "You need definitions/references from an index; prefer code_query or symbol_search if loaded.",
    "You need to understand a whole task area; prefer gather_context."
  ],
  "triggerPhrases": [
    "where is",
    "find references",
    "search for",
    "which file",
    "where does this command live"
  ],
  "antiTriggerPhrases": [
    "read these files",
    "show this file",
    "apply this patch"
  ],
  "preferredBefore": [],
  "preferredAfter": ["repo.read_many", "repo.file_outline"],
  "alternatives": [
    { "id": "repo.read_many", "when": "exact paths are already known" },
    { "id": "repo.gather_context", "when": "task needs ranked evidence, summaries, and related checks" }
  ],
  "examples": [
    {
      "scenario": "Find where router actions are dispatched.",
      "call": { "query": "domain ===", "path": "extensions/siso-agent-router", "limit": 20 },
      "why": "The exact dispatch file/line is unknown."
    }
  ],
  "outputUse": "Read the best 2-5 matching files or switch to gather_context if results are broad.",
  "loadHint": "Usually included in repo-navigation pack; keep loaded for codebase exploration tasks."
}
```

## Pack Scenario Card format

Packs also need scenario cards because agents should often load packs, not individual tools.

```json
{
  "id": "repo-navigation",
  "summary": "Find, inspect, outline, and summarize codebase context.",
  "useWhen": [
    "The task requires understanding existing repo code before editing.",
    "The agent needs to locate relevant files, symbols, docs, or capabilities."
  ],
  "doNotUseWhen": [
    "The task is pure conversation and needs no repo inspection.",
    "Only release metadata or docs registry edits are needed; use docs-capabilities pack."
  ],
  "contains": ["repo.search", "repo.read_many", "repo.project_tree", "repo.project_map", "repo.file_outline", "repo.context_pack", "repo.brief"],
  "firstTool": "repo.brief",
  "fallbackTool": "repo.search",
  "nextPacks": ["workspace-validation", "docs-capabilities"]
}
```

## Scenario routing fields

Minimum fields for scalable lazy loading:

- `useWhen`
- `doNotUseWhen`
- `triggerPhrases`
- `antiTriggerPhrases`
- `workflowStage`
- `risk`
- `cost`
- `preferredBefore`
- `preferredAfter`
- `alternatives`
- `examples`
- `outputUse`
- `loadHint`

Optional advanced fields:

- `requiresContext`: files, git repo, package.json, capability registry, network, etc.
- `failureModes`: common bad uses and how to recover.
- `confidenceBoosts`: conditions that should increase ranking.
- `confidencePenalties`: conditions that should decrease ranking.
- `permissionProfile`: read-only, write, shell, network, destructive.
- `maxOutputPolicy`: default output budget.
- `telemetry`: success/failure counters for ranking.

## Tool recommendation output

`tool_recommend` should return scenario reasoning, not just names.

```json
{
  "taskIntent": "codebase exploration before edit",
  "recommendations": [
    {
      "id": "repo-navigation",
      "type": "pack",
      "score": 0.92,
      "reason": "Task asks to inspect existing implementation before changing files.",
      "useFirst": "repo.brief",
      "then": ["repo.search", "repo.read_many", "workspace.related_checks"]
    }
  ],
  "notRecommended": [
    {
      "id": "autopilot-repair",
      "reason": "No failing check has been provided yet."
    }
  ]
}
```

## Decision tree for common coding tasks

### User asks to understand code

1. Use `repo.brief` or `gather_context`.
2. If too broad, use `repo.search`.
3. Read top files with `read_many`.
4. Use `file_outline`/`symbol_search` for structure.

### User asks to change code

1. Gather context first unless exact files and change are obvious.
2. Use `related_checks` before editing.
3. Patch small and atomically.
4. Run primary checks.
5. Update docs/changelog/capability registry if agent-system behavior changed.

### User gives failing test/log

1. Use `run_check` only if failure needs reproduction.
2. Use failure summarizer / search error strings.
3. Gather affected context.
4. Patch.
5. Rerun related check.
6. Escalate to autopilot loop only when bounded repair is appropriate.

### User asks broad research

1. Use delegation/research pack, not write tools.
2. Spawn scouts with strict read-only contracts.
3. Aggregate findings into a decision doc or capability idea.
4. Only implement after user confirms or task explicitly asks to build.

### User asks docs/release/capability updates

1. Use docs-capabilities pack.
2. Inspect current registry/changelog conventions.
3. Use section-aware doc updates.
4. Run capability/release smoke checks.

## Ranking model

A simple first version can score tools by:

```text
score = lexicalMatch
      + triggerPhraseMatch
      + workflowStageMatch
      + contextAvailability
      + recentSuccess
      - antiTriggerMatch
      - unnecessaryRisk
      - highCostWithoutNeed
```

Higher-level workflow tools should beat primitive tools when they directly match the scenario.

Examples:

- Task: "figure out where this router action is handled" → `gather_context` or `repo.search`, not `apply_patch`.
- Task: "run the tests for files I changed" → `related_checks`, then `run_check`, not `smoke:all` first.
- Task: "fix this failing smoke" → `autopilot_fix_loop` if bounded, otherwise `run_check` + inspect + patch.

## Anti-overcomplication rules

- Show the agent one recommended path, not 20 options.
- Prefer a pack or workflow over many primitive tools.
- Keep scenario cards compact; load long examples only on `tool_show`.
- Use defaults aggressively.
- Make wrong-tool recovery explicit.
- Avoid making agents choose between synonyms; consolidate or alias tools.

## First implementation plan

1. Extend lazy tool metadata with scenario cards.
2. Create scenario cards for existing Agent Tooling pack.
3. Implement `tool_recommend` over scenario metadata.
4. Add `tool_show(..., includeScenarios: true)`.
5. Add smoke tests:
   - code exploration recommends repo-navigation/gather-context.
   - failing smoke recommends workspace-validation/autopilot-repair.
   - docs update recommends docs-capabilities.
   - pure chat recommends no extra tool pack.
6. Use telemetry later to improve ranking.

## Success criteria

- Agents know when to use a tool and when not to.
- Discovery returns a recommended workflow, not a bag of tools.
- The default prompt stays small.
- Full schemas remain lazy-loaded.
- Tool choice becomes more reliable as the registry grows.
