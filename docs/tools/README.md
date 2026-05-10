# SISO Tool Scenario Cards

This directory stores compact, searchable tool-selection metadata.

Scenario cards are **retrieval data**, not default prompt data. Agents should see only a tiny discovery API plus a handful of ranked cards for the current task. Full schemas and long examples should be loaded only on demand.

Use scenario cards to answer:

- When should this tool be used?
- When should it be avoided?
- What workflow stage does it support?
- What shell habit or manual loop does it replace?
- What validation proves it still works?

Current source of truth: `docs/tools/scenario-cards.json`.
