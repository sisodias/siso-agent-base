# Pi Council Prototype

## Purpose

Build a small, inspectable Pi+Bifrost version of the LLM Council pattern.

The goal is not to copy `karpathy/llm-council` as an app. The goal is a Pi-native tool that can be called when a task benefits from multiple model perspectives, peer critique, or a synthesized final answer.

## Source References

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/karpathy-llm-council/backend/council.py`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/jacob-bd-llm-council-plus/backend/council.py`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/jacob-bd-llm-council-plus/backend/providers/`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/jacob-bd-llm-council-plus/backend/settings.py`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/forrestchang-andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/davidkimai-context-engineering/context-schemas/`

## Tool Shape

```text
ask_council(
  prompt: string,
  mode: "compare" | "rank" | "synthesize",
  models?: string[],
  chairman?: string,
  rubric?: string,
  context_packet?: object,
  budget?: object
)
```

## Modes

### `compare`

Runs Stage 1 only.

Use when:

- We want multiple raw model answers.
- The user asks for brainstorming or alternative strategies.
- Latency/cost should stay low.

Output:

```json
{
  "mode": "compare",
  "responses": [
    { "label": "Response A", "model": "bifrost/model-a", "content": "...", "latency_ms": 1234 }
  ]
}
```

### `rank`

Runs Stage 1 and Stage 2.

Use when:

- We want cross-model critique.
- There are competing technical decisions.
- We need to identify strongest answer without synthesis.

Output:

```json
{
  "mode": "rank",
  "responses": [],
  "rankings": [],
  "aggregate_rankings": [
    { "label": "Response B", "model": "bifrost/model-b", "average_rank": 1.3 }
  ]
}
```

### `synthesize`

Runs Stage 1, Stage 2, and Stage 3.

Use when:

- The task is high value.
- We want a final recommendation.
- The council should resolve disagreements.

Output:

```json
{
  "mode": "synthesize",
  "responses": [],
  "rankings": [],
  "aggregate_rankings": [],
  "final": {
    "model": "bifrost/chairman",
    "content": "..."
  }
}
```

## Bifrost Adapter

The prototype should call Bifrost, not OpenRouter directly.

Endpoint:

```text
http://localhost:8080/anthropic
```

Candidate implementation:

```text
research/prototypes/pi_council/
├── council.py
├── bifrost_client.py
├── schemas.py
├── storage.py
├── prompts.py
└── README.md
```

The Bifrost client should:

- accept model IDs,
- send Anthropic-compatible requests,
- capture latency,
- capture token fields when available,
- return structured success/error objects,
- never log secrets.

## Context Packet

Council calls should accept an optional context packet:

```json
{
  "task": "Decide whether to adopt pi-subagents",
  "constraints": [
    "Keep Bifrost",
    "Do not mutate real ~/.pi/agent",
    "Prefer lab prototypes"
  ],
  "evidence": [
    {
      "path": "/absolute/path/report.md",
      "summary": "..."
    }
  ],
  "success_criteria": [
    "Recommendation names exact files/repositories",
    "Recommendation includes adoption cost",
    "Recommendation includes next test"
  ],
  "verification": [
    "Check sources exist",
    "Separate evidence from inference"
  ]
}
```

## Ranking Prompt Contract

Use structured JSON instead of relying only on free-form `FINAL RANKING`.

Expected Stage 2 output:

```json
{
  "evaluations": [
    {
      "label": "Response A",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "score": 7
    }
  ],
  "ranking": ["Response B", "Response A", "Response C"],
  "best_for": {
    "accuracy": "Response B",
    "implementation": "Response A",
    "creativity": "Response C"
  }
}
```

Parser rule:

- Try JSON first.
- Fall back to `FINAL RANKING:` style parsing.
- Preserve raw ranking text either way.

## Karpathy Kernel For Council Runs

Every council prompt should include a compact behavior guardrail:

```text
Surface assumptions. Prefer the simplest workable design. Do not invent unnecessary machinery. Make claims verifiable. Distinguish evidence from inference.
```

For implementation tasks, add:

```text
Every proposed code change must map to the request. Include verification steps.
```

## Storage

Store council traces as JSONL:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/runs/council/YYYY-MM-DD.jsonl
```

Each record:

```json
{
  "id": "uuid",
  "created_at": "2026-05-05T10:00:00",
  "mode": "synthesize",
  "models": [],
  "chairman": "",
  "context_packet_hash": "",
  "stage1": [],
  "stage2": [],
  "stage3": {},
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0,
    "estimated_cost_usd": null
  },
  "errors": []
}
```

## Budget Controls

Default budgets:

- `compare`: 2 to 4 models.
- `rank`: 2 to 4 models.
- `synthesize`: 3 to 5 models.

Budget fields:

```json
{
  "max_models": 4,
  "max_total_tokens": 60000,
  "max_wall_time_seconds": 180,
  "allow_slow_models": false
}
```

If budget is exceeded:

- return partial results,
- preserve trace,
- do not silently retry expensive calls.

## Prototype Plan

1. Build `bifrost_client.py`.
   Verify with a single model call through `http://localhost:8080/anthropic`.

2. Build `council.py` with `compare` mode.
   Verify two models run in parallel and traces are written.

3. Add `rank` mode with anonymized labels and JSON-first parser.
   Verify aggregate ranking is deterministic.

4. Add `synthesize` mode with chairman model.
   Verify final answer includes disagreements and confidence.

5. Add a Pi extension wrapper or command shim.
   Verify the tool can be invoked from an isolated lab profile.

6. Add a tiny evaluation set.
   Verify council output is better than one model for at least a few research/adoption tasks.

## First Test Tasks

- Decide which Pi subagent package to inspect first.
- Compare `pi-subagents`, `pi-fast-subagent`, `pi-minions`, and `pi-agent-router`.
- Decide which memory/context package is worth prototyping.
- Review whether `pi-hashline-readmap` belongs in the harness core or as optional tooling.

## Non-Goals

- No web app in the first prototype.
- No direct provider keys.
- No global Pi install.
- No mutation of real `~/.pi/agent`.
- No automatic adoption decisions without stored evidence.
