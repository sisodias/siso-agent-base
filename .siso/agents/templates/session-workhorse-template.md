# Session Persistent Workhorse Template

Use this when a chat/session agent needs a durable worker that keeps going until done or blocked.

## Create folder

```txt
.siso/agents/<agent-id>/
```

## Required files

```txt
agent.md
controlled-paths.md
goals.md
memory.md
continuation.md
questions.md
worklog.md
changelog.md
metrics.md
inbox/README.md
outbox/README.md
outbox/next-run-request.md   # created/updated only when continuation remains active
runs/
```

## `agent.md`

```md
# Agent: <Readable Name>

ID: <agent-id>
Name: <Readable Name>
Status: live
Created: <date>
Owner: current session/main agent
Role: session persistent workhorse
Autonomy: background child runs, mediated by session/main agent

## Purpose

<one sentence goal>

## Relationship

Shaan talks to the session/main agent. The session/main agent talks to this workhorse. This workhorse asks questions through the session/main agent.
```

## `continuation.md`

```md
# Continuation

Status: active
Mode: continue-until-done
Current phase: setup
Next action: start first background run
Blocker: none
Needs user: no
Last run: never
Terminal condition: spec done or blocked with explicit question/permission request
```

## `questions.md`

```md
# Questions For Shaan

## Open

None.

## Answered
```
