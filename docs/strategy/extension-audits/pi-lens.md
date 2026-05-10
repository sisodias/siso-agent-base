# pi-lens Extension Audit

Generated: 2026-05-10T05:41:50.565Z

## Catalog

- Package: `pi-lens`
- Pi URL: https://pi.dev/packages/pi-lens
- npm URL: https://www.npmjs.com/package/pi-lens
- Repo: https://github.com/apmantza/pi-lens
- Types: extension, skill
- Downloads/month: 13200
- SISO score: 89
- Catalog risk: 35
- Catalog recommendation: fork-candidate

## npm Registry

- Registry status: ok
- Latest version: 3.8.42
- License: MIT
- Dependencies: 6
- Peer dependencies: 1
- Optional dependencies: 2
- Bin entrypoints: none

## npm Scripts

- `build`: `tsc --project tsconfig.build.json`
- `lint`: `tsc --project tsconfig.json`
- `watch`: `tsc --watch`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `check`: `node scripts/check-extensions.mjs`
- `audit:tree-sitter`: `node scripts/audit-tree-sitter-rules.mjs`
- `audit:rule-catalog`: `node scripts/validate-rule-catalog.mjs`
- `download-grammars`: `node scripts/download-grammars.js`
- `harness:poc`: `node scripts/run-harness.mjs cases/ts/pipeline-dispatch-poc --pi-bin "C:\Users\R3LiC\AppData\Roaming\npm\pi.cmd"`
- `harness:python-poc`: `node scripts/run-harness.mjs cases/python/pipeline-dispatch-poc --pi-bin "C:\Users\R3LiC\AppData\Roaming\npm\pi.cmd"`
- `harness:ts-format-poc`: `node scripts/run-harness.mjs cases/ts/format-default-poc --pi-bin "C:\Users\R3LiC\AppData\Roaming\npm\pi.cmd"`
- `harness:python-autofix-poc`: `node scripts/run-harness.mjs cases/python/autofix-default-poc --pi-bin "C:\Users\R3LiC\AppData\Roaming\npm\pi.cmd"`
- `harness:go-poc`: `node scripts/run-harness.mjs cases/go/pipeline-dispatch-poc --pi-bin "C:\Users\R3LiC\AppData\Roaming\npm\pi.cmd"`
- `postinstall`: `node scripts/download-grammars.js`

## Pi Manifest

```json
{
  "extensions": [
    "./index.ts"
  ],
  "skills": [
    "./skills"
  ]
}
```

## SISO Baseline

SISO has repo search, repo index, code query, file outlines, and public code search, but not live LSP/lint/typecheck diagnostics.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions shell
- mentions write
- mentions server
- mentions token
- mentions secret
- npm lifecycle scripts: build, lint, watch, test, test:watch, check, audit:tree-sitter, audit:rule-catalog, download-grammars, harness:poc, harness:python-poc, harness:ts-format-poc, harness:python-autofix-poc, harness:go-poc, postinstall
- Pi manifest declares extension entrypoints

## Recommendation

Copy pattern or fork only after deeper source review.

## Required Before Install

```bash
npm view pi-lens --json
npm pack pi-lens
tar -tf pi-lens-*.tgz | sed -n '1,200p'
```
