# Pi Eval Harness and Benchmark Plan

## Bottom Line

Pi should be improved with a layered eval suite, not vibes. Public coding benchmarks tell us whether the model stack is competitive, but the main target is the Pi harness itself: routing, context selection, tool use, diff discipline, verification, delegation, council usage, and final-response contracts.

Build a cheap local `pi-evals` suite first, then add small public benchmark subsets for external signal.

## Goals

- Detect whether Pi harness changes improve or degrade real coding-agent behavior.
- Keep benchmark runs cheap enough to run before prompt/tool/harness changes.
- Separate model quality from harness quality where possible.
- Track cost, tokens, wall time, route choice, tool usage, patch size, and failure mode.
- Make failures reusable as regression cases.

## Benchmark Layers

### Tier 0: Ultra-Cheap Smoke

Run on every meaningful harness or kernel change.

Suggested contents:

- 5 HumanEval/MBPP-style function tasks.
- 5 instruction/final-format policy tasks.
- 5 tiny repo-debug fixtures with deterministic tests.

Target:

- Runtime: under 5 minutes.
- Purpose: catch obvious regressions in code generation, tool policy, and response formatting.

### Tier 1: Local SISO-Bench

Run daily or before merging important Pi harness changes.

Suggested contents:

- 20-50 local deterministic cases.
- Small repo-debug tasks.
- Surgical edit tasks.
- Tool-use policy tasks.
- Council/routing judgment tasks.
- Final-format and verification tasks.

Target:

- Runtime: 15-45 minutes.
- Purpose: measure the actual SISO/Pi operating style.

### Tier 2: Public Agent Benchmark Subset

Run weekly or for major harness comparisons.

Suggested contents:

- 10-25 SWE-bench Lite or SWE-bench Verified tasks.
- 10 Aider Polyglot benchmark tasks.
- Optional: 10 LiveCodeBench tasks for raw coding signal.

Target:

- Purpose: compare against public-ish baselines and detect whether Pi remains competitive beyond local fixtures.

### Tier 3: Expensive Bakeoff

Run rarely.

Suggested contents:

- Larger SWE-bench Verified subset.
- Multiple model routes.
- Ablations: with/without council, with/without retrieval, with/without verifier, different routing policies.

Target:

- Purpose: justify major architecture changes.

## Public Benchmarks Worth Using

### SWE-bench Verified / Lite

Best realistic coding-agent benchmark. Tests repository navigation, issue understanding, patching, and tests. Use small sampled subsets first because full runs are slower and more expensive.

Recommended use:

- Weekly subset.
- Track pass rate, cost, time, diff size, and failure taxonomy.

### Aider Polyglot Benchmark

Good edit-based benchmark across languages. More harness-relevant than pure function synthesis because it expects changes to existing files.

Recommended use:

- Medium-cost regression suite.
- Useful for testing patch quality and multi-language edits.

### HumanEval / MBPP

Cheap classic coding-puzzle benchmarks. Useful as a smoke test, but too toy-like and likely contaminated.

Recommended use:

- Tier 0 preflight only.
- Do not treat as proof of agent quality.

### LiveCodeBench

Modern coding benchmark with less contamination than older puzzle sets. Good for raw model coding ability, but not repo-agent behavior.

Recommended use:

- Model comparison and route calibration.

### RepoBench / CodeSearchNet-Style Retrieval Tasks

Useful for context/retrieval quality. Pi performance depends heavily on whether the harness finds the right files before editing.

Recommended use:

- Build local retrieval cases around SISO repos.
- Score whether the harness selected relevant files/symbols before patching.

## Local SISO-Bench Case Types

### Surgical Repo Edit Evals

Prompt examples:

- `Fix this failing test with minimal changes.`
- `Add this field to the schema and update only the required call sites.`
- `Update this API route without touching the UI.`
- `Refactor this one function only.`

Score:

- Tests pass.
- Typecheck/lint pass.
- Files changed under threshold.
- Lines changed under threshold.
- No unrelated formatting churn.
- Final response follows Pi contract.

### Tool-Use Policy Evals

Prompt examples:

- Broad repo exploration where `.siso-wiki/index.md` exists; Pi must read it first.
- Delegation request; Pi must route before spawning/council.
- Simple task where council should not be used.
- Image edit request; Pi must use image tool.
- Destructive request; Pi must ask before acting.

Score:

- Required tool was called.
- Forbidden tool was avoided.
- No unnecessary question.
- Verification happened before final.
- Final response contract obeyed.

### Debugging Evals

Fixture examples:

- TypeScript import path bug.
- Env var mismatch.
- Schema field mismatch.
- React hydration bug.
- Broken migration.
- Failing lint rule.
- Test fixture mismatch.

Score:

- Root cause found.
- Minimal fix.
- Tests pass.
- No unrelated edits.

### Instruction-Following Evals

Prompt examples:

- User asks vague question; Pi should not over-explore.
- User asks broad refactor; Pi should scope before acting.
- User asks to use council on a trivial task; Pi should explain why it is not worth it.
- Final response must include exactly 3 numbered next steps with one Recommended item.

Score:

- Obeyed policy.
- Avoided overreach.
- Correct final format.
- No hallucinated file/API claims.

### Council and Routing Evals

Prompt examples:

- Architecture choice with tradeoffs.
- Repeated failure diagnosis.
- Adversarial review of a proposed harness change.
- Cheap coding task where council should be avoided.

Score:

- Council used only when useful.
- Route choice matched task class.
- Synthesis produced one concrete recommendation.
- Cost was justified by decision value.

## Suggested Repository Layout

```text
pi-harness-lab/
  pi-evals/
    README.md
    cases/
      coding-small/
      repo-debug/
      tool-policy/
      final-format/
      council-routing/
    fixtures/
    runners/
      run_case.ts
      score_patch.ts
      score_transcript.ts
    reports/
      latest.json
      history.jsonl
```

## Case File Shape

```yaml
id: repo-debug-import-001
type: coding
repo_fixture: fixtures/import-bug
prompt: "Tests are failing. Fix the bug with minimal changes."
commands:
  - npm test
scoring:
  tests_pass: 50
  max_files_changed: 2
  max_lines_changed: 40
  no_unrelated_changes: 20
  verification_performed: 20
  final_format: 10
```

## Run Record Shape

```json
{
  "case_id": "repo-debug-import-001",
  "harness_version": "pi-codex-v0.1",
  "model_route": "minimax.worker",
  "tokens": 8421,
  "estimated_cost_usd": 0.03,
  "wall_time_sec": 92,
  "tool_calls": 14,
  "tests_passed": true,
  "files_changed": 1,
  "lines_changed": 8,
  "score": 94,
  "failure_reason": null
}
```

## Failure Taxonomy

Use a small fixed set so trend reports are readable:

```text
PASS
TEST_FAIL
COMPILE_FAIL
LINT_FAIL
WRONG_FILE
OVER_EDIT
NO_VERIFICATION
BAD_ROUTING
UNNEEDED_COUNCIL
MISSED_COUNCIL
BAD_FINAL_FORMAT
TIMEOUT
TOOL_ERROR
GAVE_UP
HALLUCINATION
```

## Metrics To Track

Core coding:

- pass rate
- tests/typecheck/lint status
- patch applies cleanly
- files changed
- lines changed
- unrelated diff ratio

Agent behavior:

- route selected
- tools called
- tokens
- estimated cost
- wall time
- failed command count
- repeated attempt count
- verifier/council use

Policy behavior:

- unnecessary question asked
- destructive action attempted
- final format violation
- instruction violation
- missing verification
- hallucinated file/API

## Initial Build Plan

1. Create `pi-evals/` with a README, case schema, and report schema.
2. Add 15 local cases:
   - 5 tiny coding/debug fixtures.
   - 5 tool-policy/final-format transcript cases.
   - 5 routing/council judgment cases.
3. Implement a runner that can execute one case against the current Pi profile and store a JSONL run record.
4. Implement deterministic scorers first: tests pass, diff size, final format, required/forbidden tool calls.
5. Add one LLM-judge scorer only after deterministic checks are stable.
6. Add a small SWE-bench Lite/Verified subset runner after local runs are useful.

## Decision Rule

A harness change is better only if it improves one of these without materially hurting the others:

- higher score/pass rate
- lower cost/tokens
- faster wall time
- smaller irrelevant diff
- fewer routing/tool/final-format violations

Pass rate alone is not enough. A harness can pass tests while becoming more expensive, messier, or less controllable.
