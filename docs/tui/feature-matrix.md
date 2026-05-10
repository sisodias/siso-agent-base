# SISO TUI Feature Matrix

Status: working matrix
Last reviewed: 2026-05-10

This matrix tracks the terminal UI features SISO should own, copy as patterns, or ignore. It is not a clone checklist. The product direction is now:

```txt
siso -> Pi native TUI -> SISO-owned polish/extensions
siso tui -> fresh SISO-owned OpenTUI renderer -> shared packages/siso-tui contract/components
```

## Legend

- `Done` - available in plain `siso` today.
- `Partial` - exists, but not at the quality/shape we want.
- `Gap` - should be built or researched.
- `Reference` - useful competitor behavior, not necessarily a direct requirement.

## Comparison

| Area | SISO status | Codex CLI reference | Claude Code reference | OpenCode reference | SISO direction |
| --- | --- | --- | --- | --- | --- |
| Render contract | Done | Clean named surfaces and compact status rows | Minimal chat/tool/status separation | Componentized message/status surfaces | Enforce SISO surfaces, line budgets, and telemetry bans with focused smokes. |
| Chat-first launch | Done | Clean terminal app launch | Clean chat-first CLI | Startup loading + chat route | `siso tui` opens straight into chat; plain `siso` keeps Pi native startup polish. |
| Prompt composer | Partial | Dense composer, command UX | Polished prompt flow, modes | Prompt component | Improve spacing, mode hints, and model/status visibility. |
| Model selector | Partial | Model/reasoning controls | Model and agent config | Model selection in TUI/config | Keep SISO labels, add grouping/current/default markers. |
| Footer/status line | Done | Approval/sandbox/model/status visibility | Context and mode visibility | Theme/status surfaces | Keep clean footer; add better activity wording. |
| Compact tool rows | Done | Collapsed activity rows | Compact tool/task progress | Tool/message rendering | Keep single-line rows as default. |
| Grouped tool activity | Partial | Shows grouped phases like explored work | Task/subagent summaries | Session/tool timeline patterns | Disclosure-style grouped rows ship now; true multi-tool parent groups remain next. |
| Tool expand/collapse | Partial | Expandable detail lines | Tool logs available on demand | Tool call/result UI | Add reliable per-group and per-tool disclosure. |
| Permission cards | Partial | Strong approval/sandbox workflow | Tool permission modes/hooks | Configurable permissions | Make approval prompts compact and grouped by risk. |
| Child agents | Partial | Multi-agent progress patterns | Subagents with tools/model/isolation | Primary/subagents with model/tool config | Show child agents as first-class chat/status cards. |
| Child result summaries | Partial | Agent handoff/progress summaries | Subagent returns summarized result | Agent session summaries | Hide child telemetry by default; show final summary + expand. |
| Agent panel/overlay | Partial | Agent activity/progress UI | `/agents` management | Agent config and TUI | Keep `/agents`; add focused overlay when needed. |
| Slash commands | Partial | Slash commands/settings flows | Built-in/custom slash commands and skills | Custom commands | Normalize `/agents`, `/status`, `/context`, `/model`, `/sessions`. |
| Session management | Partial | Resume/thread flows | Resume/session files | Export/import/session selection | Improve resume/fork/rename/delete from inside `siso`. |
| Context visibility | Done | Context/progress visibility | Compaction/session awareness | Compaction config | Keep context bar; add compaction event cards. |
| Artifacts/files touched | Gap | Shows interacted files/artifacts | Summaries via tools/hooks | Session export/stats | Add compact “files touched / sources / artifacts” chips. |
| Theme quality | Partial | Dense dark TUI style | Dense minimal terminal style | Strong theme base | Keep black/dense style; avoid decorative panels. |
| Startup performance | Partial | Fast native binary baseline | Fast CLI startup expectation | Native TUI startup | Measure and reduce wrapper/patch overhead where possible. |
| TUI gallery/docs | Partial | Screenshots/tests in repo | Docs-focused feature surface | Component/theme source | Keep `docs/tui` + `packages/siso-tui/gallery` as source of truth. |
| OpenTUI app shell | Partial | Terminal app with custom renderer | Terminal-native chat app | OpenTUI/Solid app architecture | `siso tui` points to fresh `apps/siso-tui` and streams real Pi/SISO runtime events. |
| Hooks/extensions | Done | Config/hooks/plugin direction | Hooks, skills, MCP, plugins | Plugins/hooks/MCP | Keep SISO extensions as the main customization layer. |
| Headless/API mode | Done | `codex exec`, app server patterns | SDK/headless usage | `opencode serve`, export/import | Keep runtime separate from TUI; don't bake UI into agent core. |

## Highest-Value Gaps

1. True multi-tool parent containers:
   - Target:

```txt
▾ Explored · 7 tools · read 4 files · searched 2 patterns · 00:18
  └ Read docs/tui/catalog.md
```

2. Child-agent cards:
   - Target:

```txt
● Agent running · ui-worker · compacting tool timeline
✓ Agent complete · verifier · 4 checks · 01:03
```

3. First-chat layout:
   - Target:

```txt
SISO
Model: Spark  Context: 12%

> prompt starts focused here
```

4. Model selector:
   - Target:

```txt
Default
  ✓ Spark                 fast coding
    Oracle GPT-5.5        deep reasoning

Specialists
    MiniMax M2.7          quick side tasks
```

5. Artifacts/sources row:
   - Target:

```txt
Touched: docs/tui/catalog.md, packages/siso-tui/src/pi-native/tool-renderer.js
```

## Source References

- SISO catalog: `docs/tui/catalog.md`
- SISO render contract: `docs/tui/render-contract.md`
- SISO-owned TUI package: `packages/siso-tui/`
- Fresh SISO OpenTUI shell: `apps/siso-tui/`
- Codex CLI public repo/docs: https://github.com/openai/codex
- Claude Code public docs: https://code.claude.com/docs
- OpenCode docs: https://dev.opencode.ai/docs
- OpenCode vendored TUI reference: `apps/siso-opentui/src/opencode/`

## Update Rule

When a TUI feature ships, update:

1. This matrix.
2. `docs/tui/catalog.md`.
3. The relevant smoke command.
4. `packages/siso-tui/gallery/` if the change has a visual pattern.
