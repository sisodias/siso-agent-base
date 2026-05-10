# ChatGPT `/Goals` Research Memo

Date: 2026-05-10
Scope: Relevance of ChatGPT-style goals to SISO persistent agents.

## Evidence and limitations

- Web access was not available in this verification environment, and no authoritative local documentation for ChatGPT `/Goals` was found during scoped inspection.
- Treat any description of ChatGPT `/Goals` below as **speculation/inference from the task prompt**, not confirmed product behavior.
- This memo therefore focuses on design patterns SISO can evaluate safely rather than claims about OpenAI implementation details.

## User-facing mental model

Speculation: A `/Goals` feature likely frames durable work as explicit user-owned objectives rather than one-off chat turns.

Pattern SISO should copy:

- Present each persistent agent as working toward a named goal with visible status.
- Make the goal understandable without reading implementation files.
- Separate the enduring goal from the current run/task, so users know whether the agent is continuing a mission or doing an isolated request.

Avoid:

- Hidden autonomous objectives.
- Ambiguous labels like “memory” or “agent state” when the user needs “what are you trying to accomplish?”
- Treating every chat instruction as an automatically persistent goal.

## Goal creation and management

Speculation: Goals may be created explicitly through a command-style affordance and then managed via a UI/list.

Pattern SISO should copy:

- Require explicit creation or promotion into a persistent goal.
- Store goal metadata in durable files: owner, purpose, success criteria, scope, created date, current status, and allowed paths/tools.
- Support simple lifecycle states: proposed, active, paused, completed, cancelled.
- Keep a goal history/changelog for edits.

Avoid:

- Silent goal mutation based only on conversational drift.
- Multiple overlapping goals with unclear priority.
- Goal records that lack success criteria or exit conditions.

## Persistence and continuation behavior

Speculation: A goals system likely allows ChatGPT to resume context around an objective across sessions.

Pattern SISO should copy:

- Persist compact state: current objective, last completed action, next recommended action, blockers, decisions, and relevant files.
- Resume from durable summaries, not from raw full transcripts.
- On continuation, start by stating what is being resumed and what evidence supports that state.
- Keep manual-run behavior until reliability and safety are proven.

Avoid:

- Always-on background execution without a visible queue and approval model.
- Assuming stale state is still true; agents should revalidate important facts before acting.
- Infinite continuation loops without a checkpoint or user-facing stop condition.

## Agent-to-user handoff

Speculation: Mature goal UX probably distinguishes between agent work, user-needed decisions, and completed handoff.

Pattern SISO should copy:

- Use explicit handoff states: needs-user-input, blocked, ready-for-review, done.
- When blocked, report the decision needed and the minimum options.
- When ready for review, include changed files, validation evidence, and residual risks.
- Keep handoffs short and actionable.

Avoid:

- Vague “let me know what you think” endings.
- Continuing to modify files after declaring work ready for review.
- Burying blockers in long logs.

## Status/check-in UX

Speculation: A goals feature likely benefits from status surfaces showing progress and next steps.

Pattern SISO should copy:

- Provide a compact status view per persistent agent:
  - current goal
  - current phase/run
  - last update
  - last validation
  - next action
  - blockers
- Use periodic checkpoints for long work, but keep them file-backed and inspectable.
- Distinguish “active now” from “available to resume.”

Avoid:

- Noisy heartbeat updates that do not change state.
- Status fields that cannot be traced to files or validation.
- Green status without recent checks.

## Patterns SISO should copy

1. Explicit, user-visible goals as the root mental model.
2. Durable goal cards/files with success criteria and lifecycle state.
3. Resume summaries that make continuation explainable.
4. Clear handoff states for user decisions, review, and completion.
5. Compact status surfaces instead of transcript archaeology.
6. Conservative persistence: remember intent and progress, not every detail.

## Patterns SISO should avoid

1. Hidden autonomous goal creation.
2. Unbounded background work.
3. Stale context treated as authoritative.
4. Goals without owner, scope, or completion criteria.
5. Overly complex multi-agent splits before one manual loop works.
6. Status UX that optimizes for activity instead of verified progress.

## Recommended SISO MVP additions

- Add a `goal_card.md` template for persistent agents with: title, owner, status, success criteria, scope, controlled paths, latest checkpoint, next action, and handoff state.
- Add lifecycle states to `.siso/agents/*/goals.md` or a separate metadata block.
- Add a standard `status.md` or generated inspect view for each persistent agent.
- Add a continuation rule: every resumed run must read the goal card, last run note, and controlled paths before acting.
- Add a handoff rule: final responses must include changed files, validation, blockers, and next action when relevant.

## Confidence

Low for factual claims about ChatGPT `/Goals` behavior because web access and authoritative local sources were unavailable. Medium for the SISO design recommendations because they are grounded in general persistent-agent UX and the existing SISO file-backed agent model.
