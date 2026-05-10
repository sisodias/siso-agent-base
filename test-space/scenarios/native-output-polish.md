# Scenario: Native PI Output Polish

Goal: reduce ugly native PI rendering artifacts in assistant and tool output.

Run:

```bash
npm run smoke:native-output-polish
```

Pass criteria:

- assistant renderer has `sisoPolishAssistantText`
- assistant text strips standalone TXT/text fenced wrappers
- tool fallback renderer has compact execution helpers such as `sisoCompactToolExecution`
- tool fallback output strips TXT/TEXT prefix and truncates noisy output
