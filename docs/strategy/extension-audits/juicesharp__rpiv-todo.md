# @juicesharp/rpiv-todo Extension Audit

Generated: 2026-05-10T05:41:51.499Z

## Catalog

- Package: `@juicesharp/rpiv-todo`
- Pi URL: https://pi.dev/packages/@juicesharp/rpiv-todo
- npm URL: https://www.npmjs.com/package/@juicesharp/rpiv-todo
- Repo: https://github.com/juicesharp/rpiv-mono
- Types: extension
- Downloads/month: 11500
- SISO score: 96
- Catalog risk: 15
- Catalog recommendation: install-candidate

## npm Registry

- Registry status: ok
- Latest version: 1.3.1
- License: MIT
- Dependencies: 0
- Peer dependencies: 5
- Optional dependencies: 0
- Bin entrypoints: none

## npm Scripts

- `test`: `vitest run`

## Pi Manifest

```json
{
  "extensions": [
    "./index.ts"
  ]
}
```

## SISO Baseline

SISO has durable task store and scoped task records, but the visible todo/task UX is still basic.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions chrome
- Pi manifest declares extension entrypoints

## Recommendation

Watch or copy selected ideas.

## Required Before Install

```bash
npm view @juicesharp/rpiv-todo --json
npm pack @juicesharp/rpiv-todo
tar -tf @juicesharp-rpiv-todo-*.tgz | sed -n '1,200p'
```
