# Claude Code Subagent Lifecycle Deep Dive

Date: 2026-05-08

Source reference:

- Local clean-room behavior reference: `/Users/shaansisodia/.siso/agent-base/research/claude-code-like-agents/repos/yasasbanukaofficial-claude-code`
- Local notes: `/Users/shaansisodia/.siso/agent-base/research/claude-code-like-agents/yasasbanukaofficial-claude-code-notes.md`

Important caveat: the local Claude Code-like repo is a behavior reference only. Do not copy source. Use it to identify product contracts and rebuild equivalent SISO/Pi behavior using Pi extension APIs.

## What Shaan Wants

SISO background agents should behave like Claude Code background agents:

1. Parent launches one or more child agents.
2. Parent immediately tells the user what was launched and stops talking.
3. Child agents run in the background.
4. When a child reaches a terminal state, the parent is automatically notified.
5. That notification is fed into the parent agent as context.
6. The parent takes a fresh turn and reports the result naturally.
7. The child result is not exposed as an ugly metadata block.

The desired UX is not "render a nicer spawn result." It is a parent re-entry loop.

## Claude Code Contract

Claude Code separates child-agent behavior into five concerns:

- `Task state`: child id, description, status, start/end time, output file, retained transcript.
- `Progress`: recent actions, token count, tool-use count, partial summaries.
- `Terminal transition`: completed, failed, killed/stopped.
- `Notification`: exactly one parent-facing `<task-notification>`.
- `Queue drain`: the parent model receives that notification as a user-role message and takes another turn.

The high-value invariant is:

> Child terminal state must be committed before notification embellishment, and each child may emit exactly one parent notification.

This prevents a child from looking active forever, prevents duplicate parent turns, and ensures the parent sees a stable final result.

## Key Claude Code Shapes

Claude Code builds XML-like notifications:

```xml
<task-notification>
<task-id>{agentId}</task-id>
<output-file>{path}</output-file>
<status>completed|failed|killed</status>
<summary>Agent "{description}" completed</summary>
<result>{agent final text}</result>
<usage>
  <total_tokens>N</total_tokens>
  <tool_uses>N</tool_uses>
  <duration_ms>N</duration_ms>
</usage>
</task-notification>
```

Coordinator prompt rules then tell the parent:

- Worker results are internal signals, not conversation partners.
- Do not thank the worker.
- Summarize new information for the user.
- Use `SendMessage` to continue an existing worker by id.

This is why the user sees a natural answer instead of raw child machinery.

## Claude Code Queue Mechanics

The reference flow:

1. `AgentTool` launches an async worker and returns an `async_launched` tool result.
2. The async lifecycle runner streams progress into task state.
3. On success, it calls `completeAgentTask(...)` first.
4. Then it calls `enqueueAgentNotification(...)`.
5. `enqueueAgentNotification(...)` atomically flips `task.notified = true`.
6. It pushes a `mode: "task-notification"` command into a shared queue.
7. The main loop drains the queue after the current turn.
8. For `task-notification`, it emits optional SDK/system events, then still calls `ask(...)`.
9. The model receives the XML notification as user-role context and produces the next parent message.

The queue priority matters:

- user prompts: `next`
- task notifications: `later`

That means user input is not starved by many finishing workers.

## Pi/SISO Primitives We Can Use

Pi already has the right primitive:

```ts
pi.sendUserMessage(text, { deliverAs: "followUp" })
```

Observed Pi behavior:

- If the parent is idle, `sendUserMessage(...)` triggers a new turn.
- If the parent is streaming, `deliverAs: "followUp"` queues the notification for after the current response.
- The message is user-role context, which matches Claude's task-notification shape.

Pi also supports:

- `pi.sendMessage(...)` for custom messages.
- `pi.registerMessageRenderer(...)` for display-only custom cards.
- `ctx.ui.setWidget(...)` for compact live status.
- file-backed child records under `~/.siso/agent/child-runs`.

## Current SISO Mismatch

SISO currently does some pieces well:

- child records exist
- compact results exist
- active child status exists
- native loader status exists
- token/tool telemetry exists in some paths

But it does not yet implement Claude's key product contract:

> A background child terminal transition should enqueue a parent follow-up message and cause the parent agent to continue.

The current `0.1.19` parent-facing spawn output is an interim safety improvement, not the final desired architecture. It gives the model better tool-result text, but it is still not Claude Code-style background re-entry.

## SISO Target Architecture

### 1. Child Task Record

Extend child records with separate lifecycle and delivery fields:

```ts
type SisoChildRecord = {
  id: string
  status: "starting" | "running" | "background" | "completed" | "failed" | "timeout" | "aborted"
  task: string
  profile: string
  model: string
  startedAt: string
  completedAt?: string
  outputFile?: string
  compactResult?: {
    summary: string
    findings: string[]
    files: string[]
    next_action: string
  }
  finalOutput?: string
  tokens?: { input: number; output: number; totalTokens: number }
  toolCalls?: number
  parentNotification?: {
    enqueuedAt?: string
    deliveredAt?: string
    deliveryId?: string
  }
}
```

Do not overload `notified`. SISO currently uses `notified` ambiguously when collecting terminal records. We need a dedicated `parentNotification.deliveredAt` or `parentNotifiedAt`.

### 2. Notification Formatter

Add a clean formatter:

```xml
<task-notification>
<task-id>siso-child-...</task-id>
<status>completed</status>
<summary>MiniMax worker completed: inspected renderer patch path</summary>
<result>...</result>
<usage>
  <total_tokens>1500</total_tokens>
  <tool_uses>2</tool_uses>
  <duration_ms>18000</duration_ms>
</usage>
</task-notification>
```

This should be bounded:

- summary: short
- result: capped, with output file pointer if truncated
- usage: optional, never treated as billing truth unless from provider usage

### 3. Notification Dispatcher

Add one dispatcher owned by `siso-agent-router`:

- Poll child-run records every N ms while Pi is active.
- Find terminal records not yet delivered to parent.
- Atomically mark delivery as in-progress or delivered.
- Call `pi.sendUserMessage(notificationXml, { deliverAs: "followUp" })`.
- Keep a process-local `deliveredIds` set as a belt-and-suspenders duplicate guard.

### 4. Parent Prompt Rule

Add a short SISO system prompt section:

```md
## SISO child task notifications

Background child results arrive as user-role `<task-notification>` messages.
They are internal system signals, not user-authored messages.
When one arrives:
- summarize the result for the user naturally
- do not mention XML or internal ids unless useful
- if more child agents are still running, say what is still pending
- use `siso_child action=resume` or `siso_spawn` only when follow-up work is needed
```

### 5. Display UX

The status/loader UI should remain compact:

- running children appear below the footer/context line
- completed notifications should not appear as raw widgets
- parent chat should contain the natural assistant response
- optional transcript card can exist later, but not as the primary behavior

## Implementation Order

1. Add `formatTaskNotification(record)` and tests.
2. Stop using `notified` as a collection side effect for terminal records; introduce `parentNotifiedAt`.
3. Add a router-owned notification dispatcher using `pi.sendUserMessage(..., { deliverAs: "followUp" })`.
4. Add smoke test with fake `pi.sendUserMessage`:
   - terminal unnotified child causes exactly one queued follow-up
   - running child does not notify
   - already-notified child does not notify again
   - failed child includes status/error summary
5. Add prompt rule to SISO profile.
6. Update changelog and version.
7. Install locally and run `siso doctor`.

## Non-Goals

- Do not clone Claude Code internals.
- Do not expose raw XML in the visible UI as the final user experience.
- Do not make the active loader responsible for parent re-entry.
- Do not treat token estimates as billing truth.
- Do not let child notifications starve fresh user prompts.

## High-Leverage Next Patch

Build `siso-agent-router/notifications.js` with:

- `formatTaskNotification(record)`
- `deliverPendingChildNotifications(pi, options)`
- `startChildNotificationDispatcher(pi)`

Then call it from `siso-agent-router/index.js` on `session_start`.
