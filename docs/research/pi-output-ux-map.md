# PI/SISO Output UX Map

## Where output comes from

- Assistant final/message rendering: `node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/assistant-message.js`
- Custom extension messages: `node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/custom-message.js`
- Tool cards/output rendering: `node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/tool-execution.js`
- SISO pre-agent hook: `extensions/siso-agent-router/index.js` via `pi.on("before_agent_start", ...)`
- SISO style/preflight policy: `extensions/siso-agent-router/output-style.js`

## UX strategy

Do not narrate every tool call. Use phase-level communication:

1. Before a large tool batch, show a short phase/direction card.
2. During work, show compact progress only at strategy transitions or validation milestones.
3. Final answer should be an operator summary: what changed, validation, risks/next.

## Implementation stages

1. Prompt/preflight layer — implemented.
2. Phase card renderer — next.
3. Auto phase detection from tool clusters — later.
4. Native assistant/tool renderer polish — later if `TXT`/ugly labels are renderer-generated.
