# Context Hygiene and Codex Case Packets

Date: 2026-05-07
Status: active handoff / operational runbook
Owner layer: `packages/siso-context-manager`, `packages/siso-agent-router`

## Problem

Pi Codex was burning huge input context by replaying raw tool/function outputs into later Codex calls.

Observed in Bifrost `CodexOpenAI / gpt-5.5` logs for 2026-05-07:

- Successful Codex traffic: ~319M input tokens, ~0.84M output tokens.
- Worst calls were ~270k prompt tokens with tiny outputs.
- Largest request sample contained:
  - 428 input items
  - 186 `function_call`
  - 186 `function_call_output`
  - ~925k raw chars of `function_call_output`

This is a context replay bug, not useful intelligence. Context is gold; raw logs, sourcemaps, event deltas, `.jsonl`, `node_modules`, and giant grep/find output are not hot context.

## Fixes implemented

### 1. Live context filtering

File: `packages/siso-context-manager/src/filter.ts`

Behavior:

- Recognizes Pi/Codex Responses API outputs:
  - `type: "function_call_output"`
  - `output: [{ type: "input_text", text: "..." }]`
- Replaces large/noisy tool outputs with tombstones:
  - short summary
  - reason
  - original char/token estimate
  - retrieval pointer: `siso_context op=retrieve ...`
- Recent large outputs are **not protected** from filtering.
- Default large-output threshold is ~1000 estimated tokens.
- Noisy outputs are filtered even if short.

Noisy patterns currently filtered:

- `node_modules/`
- `.jsonl:` transcript grep output
- raw session/message JSON (`"type":"session"`, `"type":"message"`, `"type":"message_start"`)
- `message_update`
- `toolcall_delta`
- `.d.ts.map`
- `.js.map`
- `/.git/`

### 2. Filter enabled by default

File: `packages/agent-base/bin/siso.mjs`

Default env now includes:

```sh
SISO_CONTEXT_FILTER=1
```

A fresh Pi/SISO process is required for this to take effect.

### 3. Librarian distillation / memory

Files:

- `packages/siso-context-manager/src/librarian.ts`
- `packages/siso-context-manager/src/index.ts`
- `packages/siso-context-manager/src/distill.ts`
- `packages/siso-context-manager/src/store.ts`

Behavior:

- Captures events into local context store.
- Distills pending events into memory items.
- Memory categories include:
  - summary
  - decision
  - preference
  - fact
  - error
  - file
  - command
  - open_question
  - next_action
  - project_context
  - task_context
  - working_rule
  - routing_rule
  - skill_rule
  - retrieval_pointer
- Semantic distillation is opt-in with `SISO_CONTEXT_MINIMAX=1`; local deterministic distillation remains default.

Tool surface:

```text
siso_context op=status
siso_context op=distill
siso_context op=memory
siso_context op=central
siso_context op=supersede
siso_context op=pointers
siso_context op=retrieve
siso_context op=case_packet
```

### 4. Codex case packet path

File: `packages/siso-agent-router/src/codex-case-packet.ts`

Behavior:

- Loads latest context-manager run from:
  - `~/.siso/pi-harness-lab/context-manager/runs/*.jsonl`
  - `~/.siso/pi-harness-lab/context-manager/memory/*.jsonl`
  - `~/.siso/pi-harness-lab/context-manager/project-memory.jsonl`
- Builds bounded `# Codex Case Packet` containing distilled useful context.
- Excludes raw noisy context.
- Includes recent small signals only.

File: `packages/siso-agent-router/src/spawn-layer.ts`

Codex prompts now:

- load the case packet when available,
- explicitly instruct Codex to use it as source of truth,
- prohibit raw transcript / `node_modules` / sourcemap / `.git` / giant output replay unless narrowly required.

## Verification run

Passed:

```sh
npm --prefix packages/siso-context-manager test
npm --prefix packages/siso-context-manager run typecheck
npm --prefix packages/siso-context-manager run build
npm --prefix packages/siso-agent-router test -- --run test/codex-case-packet.test.ts test/spawn-layer.test.ts
npm --prefix packages/siso-agent-router run typecheck
npm --prefix packages/siso-agent-router run build
npm run smoke:siso-context-manager
npm run smoke:agent-router:lean
```

Observed test counts at implementation time:

- context-manager: 6 files / 13 tests passed
- agent-router targeted: 2 files / 39 tests passed

## Expected impact

The proven dominant leak was `function_call_output` replay. The fix should reduce tool-heavy Codex prompt blowups by roughly 60-90% compared to the pathological 2026-05-07 pattern.

This does not guarantee tiny prompts if:

- the live session is already bloated before restart,
- user pastes huge raw text,
- Codex is given huge file contents intentionally,
- old `function_call` history remains large,
- encrypted reasoning blobs or message history dominate.

## How a new agent should pick up

1. Read this document first.
2. Inspect current files:
   - `packages/siso-context-manager/src/filter.ts`
   - `packages/siso-context-manager/src/librarian.ts`
   - `packages/siso-context-manager/src/index.ts`
   - `packages/siso-agent-router/src/codex-case-packet.ts`
   - `packages/siso-agent-router/src/spawn-layer.ts`
3. Run verification commands above.
4. Start/restart Pi/SISO so runtime loads built `dist` files.
5. Run a representative Codex-routed task.
6. Query Bifrost logs and compare latest prompt size against old ~270k-token calls.

Useful Bifrost query:

```sh
sqlite3 ~/.config/bifrost/logs.db "
select created_at, status, provider, model, prompt_tokens, completion_tokens, total_tokens, length(raw_request)
from logs
where provider='CodexOpenAI' and model='gpt-5.5'
order by created_at desc
limit 20;
"
```

Request decomposition helper:

```sh
python3 - <<'PY'
import sqlite3,json,collections
conn=sqlite3.connect('/Users/shaansisodia/.config/bifrost/logs.db')
raw=conn.execute("select raw_request from logs where provider='CodexOpenAI' and model='gpt-5.5' and status='success' order by created_at desc limit 1").fetchone()[0]
d=json.loads(raw)
chars=collections.Counter(); counts=collections.Counter()
for it in d.get('input',[]):
    typ=it.get('type') or it.get('role') or 'unknown'
    s=json.dumps(it,ensure_ascii=False)
    chars[typ]+=len(s); counts[typ]+=1
for typ,n in chars.most_common():
    print(typ, 'count=', counts[typ], 'chars=', n)
PY
```

## Known follow-up work

1. Compact old paired `function_call` arguments after their outputs are summarized.
2. Add a `siso context forensic` command that classifies hot context by waste type.
3. Add live post-restart measurement to prove prompt-token reduction in Bifrost.
4. Consider summarizing encrypted/reasoning/message history if Pi exposes safe hooks.
5. Add a persistent session handoff command that writes current task, root cause, changed files, verification, and next action into this doc or a generated handoff file.
