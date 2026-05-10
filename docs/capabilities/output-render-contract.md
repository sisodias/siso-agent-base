# SISO Output Render Contract

## Surfaces

- StartupHeader
- AssistantText
- PhaseCard
- ToolGroup
- ToolDetail
- AgentCard
- StatusLine
- Widget
- CommandOverlay
- Notice

## Budgets

- startup: 2 lines
- phase: 3 lines
- tool group: 1 header + up to 4 child lines
- agent card compact: 2-3 lines
- footer: 1 line
- widgets: max 4 total lines

## Banned Raw Output

- Recon
- kind=
- runtime=native-subagent
- child_id=
- raw diagnostic prefixes
- raw long task labels
- timeout/limit suffixes
