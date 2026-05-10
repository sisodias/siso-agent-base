# pi-subagents Extension Audit

Generated: 2026-05-10T05:41:49.182Z

## Catalog

- Package: `pi-subagents`
- Pi URL: https://pi.dev/packages/pi-subagents
- npm URL: https://www.npmjs.com/package/pi-subagents
- Repo: https://github.com/nicobailon/pi-subagents
- Types: extension, skill, prompt
- Downloads/month: 70600
- SISO score: 92
- Catalog risk: 25
- Catalog recommendation: fork-candidate

## npm Registry

- Registry status: ok
- Latest version: 0.24.0
- License: MIT
- Dependencies: 1
- Peer dependencies: 4
- Optional dependencies: 0
- Bin entrypoints: {"pi-subagents":"install.mjs"}

## npm Scripts

- `test`: `npm run test:unit`
- `test:unit`: `node --experimental-strip-types --test test/unit/*.test.ts`
- `test:integration`: `node --experimental-transform-types --import ./test/support/register-loader.mjs --test test/integration/*.test.ts`
- `test:all`: `npm run test:unit && npm run test:integration`

## Pi Manifest

```json
{
  "extensions": [
    "./src/extension/index.ts"
  ],
  "skills": [
    "./skills"
  ],
  "prompts": [
    "./prompts"
  ]
}
```

## SISO Baseline

SISO already owns Bifrost profile routing, scoped child records, task registry, native subagent bridge, and workflow-layer fan-out.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions exec
- mentions execute
- mentions write
- declares CLI/bin entrypoints
- Pi manifest declares extension entrypoints

## Recommendation

Fork/copy patterns. Do not let it own SISO child routing.

## Required Before Install

```bash
npm view pi-subagents --json
npm pack pi-subagents
tar -tf pi-subagents-*.tgz | sed -n '1,200p'
```
