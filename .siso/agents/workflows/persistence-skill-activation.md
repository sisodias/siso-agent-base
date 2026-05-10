# Workflow: Persistence Skill Activation

Purpose: define how any SISO agent can activate the persistent workhorse system.

## UX intent

The user talks to a main/chat agent. The main agent can activate persistence with the `persistence` skill. Once activated, the main agent delegates durable work to background workhorse agents and checks up on them.

```txt
main/chat agent = user's conversational interface
persistent workhorse = background child agent(s) + durable state files
```

## Minimum MVP behavior

1. Main agent receives a durable goal.
2. Main agent loads the `persistence` skill.
3. Main agent writes an inbox task for the persistent agent/team.
4. Main agent spawns a background child agent as the workhorse.
5. Workhorse writes run report, worklog, changelog, memory, and metrics.
6. Main agent summarizes progress/results to the user.

## Default persistent agent/team

```txt
persistent-agent-system-improver
```

Goal:
Improve the persistent-agent system itself.

## Future TUI hook

The TUI can later watch:

- `.siso/agents/*/runs/`
- `.siso/agents/*/worklog.md`
- `.siso/agents/*/changelog.md`
- `.siso/agents/*/metrics.md`
- `.siso/agents/*/outbox/`

This avoids building UI now while giving the TUI stable files/events to render.
