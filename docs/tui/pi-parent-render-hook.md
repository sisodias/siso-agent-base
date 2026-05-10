# Pi Parent Render Hook for Assistant-Turn Tool Batching

Status: research note only. No live renderer changes.

## Owner Files

- Installed Pi transcript owner: `~/.siso-agent-base/node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/interactive-mode.js`
- Assistant text/thinking renderer: `dist/modes/interactive/components/assistant-message.js`, `AssistantMessageComponent`
- Per-tool renderer: `dist/modes/interactive/components/tool-execution.js`, `ToolExecutionComponent`
- Current SISO patch source: `packages/siso-tui/src/pi-native/tool-renderer.js`
- Current patch installer: `scripts/patch-pi-native-renderers.mjs`

## Exact Render Path

Streaming path:

- `InteractiveMode.handleAgentEvent`, `message_start`: creates `this.streamingComponent = new AssistantMessageComponent(...)`, stores `this.streamingMessage`, and appends it to `this.chatContainer`.
- `InteractiveMode.handleAgentEvent`, `message_update`: calls `this.streamingComponent.updateContent(...)`, then iterates `this.streamingMessage.content`; each `content.type === "toolCall"` creates or updates a `new ToolExecutionComponent(...)` and appends it directly to `this.chatContainer`.
- `InteractiveMode.handleAgentEvent`, `tool_execution_start/update/end`: finds the component in `this.pendingTools`, marks execution started, streams partial result, and finalizes/removes it from `pendingTools`.

Resume/rebuild path:

- `InteractiveMode.renderSessionContext(sessionContext, options)`: iterates `sessionContext.messages`.
- For `message.role === "assistant"`, calls `this.addMessageToChat(message)`, then iterates `message.content` and appends one `ToolExecutionComponent` per `toolCall`.
- For `message.role === "toolResult"`, matches the component from `renderedPendingTools` by `message.toolCallId` and calls `component.updateResult(message)`.
- `InteractiveMode.renderInitialMessages()` calls `this.sessionManager.buildSessionContext()` and then `renderSessionContext(...)`.
- `InteractiveMode.rebuildChatFromMessages()` routes back through `renderInitialMessages()`/session context rebuilding.

## Batching Verdict

Real assistant-turn-level batching should be implemented in the parent transcript/turn layer, not inside `ToolExecutionComponent`.

`ToolExecutionComponent` can only see itself plus nearby components. The current SISO patch uses a `WeakMap` registry and `sisoRenderAggregatedToolGroup(...)` to hide later adjacent components in a same-phase run. That is useful for cosmetic adjacent grouping, but it does not own assistant turn boundaries, interleaved assistant text, durable resume ordering, or the tool-result join. It can produce local groups, not a true `Explored · N tools` / `Verified · N commands` assistant turn summary.

The best hook is a parent component/factory inserted where `interactive-mode.js` currently appends assistant messages and tool components:

- streaming: the `message_start`/`message_update`/`tool_execution_*` cases in `InteractiveMode.handleAgentEvent`
- persisted sessions: `InteractiveMode.renderSessionContext(...)`

## Minimal Implementation Path

1. Add a parent `AssistantTurnComponent` or `ToolBatchComponent` in Pi native renderer patch sources, preferably under `packages/siso-tui/src/pi-native/`.
2. For streaming assistant turns, create the parent component at `message_start` and append the existing `AssistantMessageComponent` and child tool rows to it instead of appending each child directly to `chatContainer`.
3. On `message_update`, route each new/updated `toolCall` through the parent. The parent can maintain ordered child tool entries and summarize by phase: Explore, Verify, Modify, Delegate.
4. On `tool_execution_start/update/end`, update the child component and ask the parent to recompute its header text, such as `Exploring · 3 tools` while running and `Explored · 3 tools` when complete.
5. Mirror the same parent assembly in `renderSessionContext(...)`, where assistant `toolCall`s and later `toolResult`s are already joined by `toolCallId`.
6. Keep `ToolExecutionComponent` responsible for individual expanded details. Parent owns collapsed assistant-turn batching and phase summaries.

## Risks

- `interactive-mode.js` is a large bundled dist file patched by string replacement; parent-level changes are higher drift risk than the current isolated `ToolExecutionComponent` patch.
- Streaming and resume paths must be kept behaviorally identical or sessions will render differently after restart.
- Tool calls can arrive before execution events; the parent must support pending, running, partial, done, and error states.
- Interleaved assistant text around tool calls matters. A parent must not hide final assistant text or thinking blocks when batching tools.
- Existing expansion toggles walk `chatContainer.children` and call `setExpanded(...)`; parent components must implement `setExpanded` and forward it to child tool components.
