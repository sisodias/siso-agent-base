# Current Findings

## Pi Through Bifrost Works

Temporary config path:

```text
/tmp/pi-bifrost-test
```

Confirmed routes:

| Pi model ID | Bifrost target | Result |
| --- | --- | --- |
| `claude-haiku-4-5-20251001` | `MiniMax-M2.7-highspeed` | works |
| `claude-sonnet-4-6` | `gpt-5.3-codex-spark` | works |
| `claude-opus-4-7` | `gpt-5.5` | configured in test profile |

Measured through Bifrost:

| Test | Prompt tokens | Tool chars |
| --- | ---: | ---: |
| Pi no tools | ~378 | 0 |
| Pi `ls/read` only | ~799 initial, ~1,013 after tool result | ~1,154 |
| Pi default tools | ~1,360 | ~2,864 |
| Claude Code optimized `claude-codex-code` | ~2,889 | ~43,045 request-row tools before final upstream slimming context |

## What Makes Claude Good

Claude Code quality comes from the whole control plane:

- global behavior profile: `/Users/shaansisodia/.claude/CLAUDE.md`
- global settings/hooks: `/Users/shaansisodia/.claude/settings.json`
- lazy skills: `/Users/shaansisodia/.claude/skills`
- hooks: `/Users/shaansisodia/.claude/hooks`
- role agents: `/Users/shaansisodia/.claude/agents`
- ops ledger: `/Users/shaansisodia/.claude/ops`
- project memory: `/Users/shaansisodia/.claude/projects`
- workspace Agent OS: `/Users/shaansisodia/SISO_Workspace/agent_os`
- central DB: `/Users/shaansisodia/SISO_Workspace/.SystemDB/sisosystem.db`

## Migration Implication

The Pi harness needs a layered translation:

1. compact always-loaded kernel,
2. lazy skill catalog,
3. Pi extensions replacing important Claude hooks,
4. worker profiles and subagent orchestration,
5. Bifrost-backed telemetry and comparison.

Do not copy the full Claude folder into Pi. That would recreate the bloat.

## Known Footguns

- `/Users/shaansisodia/SISO_Workspace/AGENTS.md` points to missing `/Users/shaansisodia/SISO_Workspace/CLAUDE.md`.
- Existing Pi real config points directly at MiniMax, not Bifrost.
- Pi `0.67.68` is installed while npm latest observed was `0.72.1`.
- No global Pi extensions are installed yet.
- Pi has subagent and plan-mode examples, not active local capabilities.
- Some Agent OS docs are stale: old `os.health` / `os.bifrost-ops` references remain.
- Claude Code native `ToolSearch` stalled through Bifrost/GPT, so it should not be the migration foundation.

## Best First Slice

Build an isolated `pi-codex` profile under this lab or `~/.pi-bifrost`, not in the live `~/.pi/agent` profile.

First slice:

- Bifrost models config
- compact SISO kernel
- explicit skills paths
- one metrics extension
- one worker-spawn experiment
- Bifrost comparison report
