# Scenario: Output Style and Preflight

Goal: improve PI/SISO interaction output before, during, and after tool-heavy work.

Run:

```bash
npm run smoke:output-style
```

Pass criteria:

- before-agent-start returns a SISO preflight custom message
- system prompt includes concise output style guidance
- final-answer guidance avoids raw `TXT`/code dumps unless requested
- chain-of-thought is not exposed; only concise progress summaries are requested
