# Persistent Agent System Improver Memory

## Stable Facts

- Shaan wants an MVP persistent-agent system using current SISO infrastructure.
- Agents can be stateless at runtime but persistent through files.
- The first test subject should be one descriptive agent/team focused on improving the persistent-agent system itself.
- Descriptive names are preferred over metaphorical names like Atlas or Forge.
- The MVP should expose goals, memory, worklog, changelog, controlled paths, goal history, and token metrics.
- Agents may evolve their own memories and propose goal changes.
- Manual YouTube transcript collection was unreliable and is parked for later tooling.

## Preferences / Principles

- Use names that explain what the agent does.
- Do not split agents before the split is clearly useful.
- Prefer one agent/team per clear goal.
- Start with Markdown/file-backed state.
- Keep everything inspectable and easy to correct.
- Avoid daemon/scheduler complexity until the manual loop works.

## Lessons Learned

- The initial split into `atlas` and `forge` was too abstract and premature.
- For MVP validation, a single descriptive persistent agent/team is easier to understand and inspect.

## Lessons Learned From Runs

### 2026-05-10

- The first useful persistent-agent loop is `run` + `inspect`.
- Create/run/inspect should remain manual until the file-backed process proves useful.
- The run report itself is a good test artifact for the persistent-agent MVP.
- As of 2026-05-10, the first command surface is `siso agent inspect <id>` and `siso agent run <id>`. `run` renders a continuation prompt and queues a durable activation request, but it does not yet spawn a background worker.
