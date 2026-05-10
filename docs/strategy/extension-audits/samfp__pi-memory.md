# @samfp/pi-memory Extension Audit

Generated: 2026-05-10T05:41:50.384Z

## Catalog

- Package: `@samfp/pi-memory`
- Pi URL: https://pi.dev/packages/@samfp/pi-memory
- npm URL: https://www.npmjs.com/package/@samfp/pi-memory
- Repo: https://github.com/samfoy/pi-memory
- Types: extension
- Downloads/month: 8013
- SISO score: 96
- Catalog risk: 15
- Catalog recommendation: install-candidate

## npm Registry

- Registry status: ok
- Latest version: 1.0.4
- License: MIT
- Dependencies: 0
- Peer dependencies: 2
- Optional dependencies: 0
- Bin entrypoints: none

## npm Scripts

- `test`: `node --test --import tsx src/**/*.test.ts`
- `typecheck`: `tsc --noEmit`

## Pi Manifest

```json
{
  "extensions": [
    "./src/index.ts"
  ]
}
```

## SISO Baseline

SISO has memory capture and project memory, but does not yet have a polished preference-learning product surface.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions system prompt
- Pi manifest declares extension entrypoints

## Recommendation

Watch or copy selected ideas.

## Required Before Install

```bash
npm view @samfp/pi-memory --json
npm pack @samfp/pi-memory
tar -tf @samfp-pi-memory-*.tgz | sed -n '1,200p'
```
