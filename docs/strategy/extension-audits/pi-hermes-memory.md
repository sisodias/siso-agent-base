# pi-hermes-memory Extension Audit

Generated: 2026-05-10T05:41:49.564Z

## Catalog

- Package: `pi-hermes-memory`
- Pi URL: https://pi.dev/packages/pi-hermes-memory
- npm URL: https://www.npmjs.com/package/pi-hermes-memory
- Repo: https://github.com/chandra447/pi-hermes-memory
- Types: extension
- Downloads/month: 3659
- SISO score: 87
- Catalog risk: 35
- Catalog recommendation: fork-candidate

## npm Registry

- Registry status: ok
- Latest version: 0.6.9
- License: MIT
- Dependencies: 1
- Peer dependencies: 1
- Optional dependencies: 0
- Bin entrypoints: none

## npm Scripts

- `check`: `tsc --noEmit`
- `test`: `tests/run-all.sh`

## Pi Manifest

```json
{
  "extensions": [
    "./src/index.ts"
  ]
}
```

## SISO Baseline

SISO already has JSONL event capture, memory items, typed central memory, project memory promotion, and retrieval pointers.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions exec
- mentions write
- mentions token
- mentions secret
- mentions system prompt
- Pi manifest declares extension entrypoints

## Recommendation

Copy pattern or fork only after deeper source review.

## Required Before Install

```bash
npm view pi-hermes-memory --json
npm pack pi-hermes-memory
tar -tf pi-hermes-memory-*.tgz | sed -n '1,200p'
```
