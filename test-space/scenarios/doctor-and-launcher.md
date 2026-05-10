# Scenario: Doctor and Launcher

Goal: prove SISO entry points and local install diagnostics behave.

Run:

```bash
npm run smoke:doctor
npm run smoke:wrapper
npm run smoke:where
```

Pass criteria:

- launcher reports sane version/install/profile paths
- doctor completes without fatal diagnostics in normal local setup
