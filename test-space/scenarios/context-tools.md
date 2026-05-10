# Scenario: Context Tools

Goal: prevent raw large context payloads from leaking through compact tool details.

Run:

```bash
npm run smoke:context
npm run smoke:context-details
npm run smoke:context-explain
npm run smoke:context-tier
```

Pass criteria:

- large/noisy outputs are summarized
- raw output is retrievable only through explicit retrieval paths
