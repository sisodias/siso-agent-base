# SISO Extension Audit Matrix

Generated: 2026-05-10T05:41:51.578Z

| Package | Area | Score | Risk | Downloads | Decision | What to take |
|---|---|---:|---:|---:|---|---|
| [pi-subagents](https://pi.dev/packages/pi-subagents) | agent-orchestration, memory-context | 92 | 25 | 70600 | Fork/copy patterns. Do not let it own SISO child routing. | SISO already owns Bifrost profile routing, scoped child records, task registry, native subagent bridge, and workflow-layer fan-out. |
| [context-mode](https://pi.dev/packages/context-mode) | memory-context, code-intelligence | 87 | 40 | 57800 | Fork/copy retrieval and FTS ideas after source review. Keep provider filtering in SISO core. | SISO already owns provider-payload filtering, context capture, typed memory, librarian distillation, and retrieval pointers. |
| [pi-hermes-memory](https://pi.dev/packages/pi-hermes-memory) | memory-context, code-intelligence | 87 | 35 | 3659 | Copy pattern or fork only after deeper source review. | SISO already has JSONL event capture, memory items, typed central memory, project memory promotion, and retrieval pointers. |
| [@samfp/pi-memory](https://pi.dev/packages/@samfp/pi-memory) | memory-context, code-intelligence | 96 | 15 | 8013 | Watch or copy selected ideas. | SISO has memory capture and project memory, but does not yet have a polished preference-learning product surface. |
| [pi-mcp-adapter](https://pi.dev/packages/pi-mcp-adapter) | web-research, memory-context | 87 | 40 | 59800 | Audit as compatibility adapter. Keep permissions and tool exposure in SISO core. | SISO has router tools and Codex app/plugin access, but no broad Pi MCP import compatibility layer. |
| [pi-lens](https://pi.dev/packages/pi-lens) | code-intelligence, developer-tools | 89 | 35 | 13200 | Copy pattern or fork only after deeper source review. | SISO has repo search, repo index, code query, file outlines, and public code search, but not live LSP/lint/typecheck diagnostics. |
| [@juicesharp/rpiv-todo](https://pi.dev/packages/@juicesharp/rpiv-todo) | task-workflow, code-intelligence | 96 | 15 | 11500 | Watch or copy selected ideas. | SISO has durable task store and scoped task records, but the visible todo/task UX is still basic. |
| [pi-web-access](https://pi.dev/packages/pi-web-access) | web-research, memory-context | 89 | 35 | 34300 | Copy pattern or fork only after deeper source review. | SISO can use available web/browser tools, but does not own a Pi-native all-in-one web/PDF/GitHub/YouTube package. |

## Harness Rule

Index thousands of packages, audit hundreds, install tens, activate single digits per session.
