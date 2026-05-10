# Scenario: Release Metadata

Goal: catch version/release/changelog drift before shipping.

Run:

```bash
npm run smoke:release
```

Pass criteria:

- release metadata is parseable
- current version metadata is internally consistent
