# pi-mcp-adapter Extension Audit

Generated: 2026-05-10T05:41:50.463Z

## Catalog

- Package: `pi-mcp-adapter`
- Pi URL: https://pi.dev/packages/pi-mcp-adapter
- npm URL: https://www.npmjs.com/package/pi-mcp-adapter
- Repo: https://github.com/nicobailon/pi-mcp-adapter
- Types: extension
- Downloads/month: 59800
- SISO score: 87
- Catalog risk: 40
- Catalog recommendation: fork-candidate

## npm Registry

- Registry status: ok
- Latest version: 2.5.4
- License: MIT
- Dependencies: 6
- Peer dependencies: 1
- Optional dependencies: 0
- Bin entrypoints: {"pi-mcp-adapter":"cli.js"}

## npm Scripts

- `test`: `vitest run`
- `test:watch`: `vitest`
- `test:coverage`: `vitest run --coverage`
- `test:oauth-provider`: `node --import tsx --test mcp-oauth-provider.test.ts`

## Pi Manifest

```json
{
  "extensions": [
    "./index.ts"
  ],
  "video": "https://github.com/nicobailon/pi-mcp-adapter/raw/refs/heads/main/pi-mcp.mp4"
}
```

## SISO Baseline

SISO has router tools and Codex app/plugin access, but no broad Pi MCP import compatibility layer.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions exec
- mentions write
- mentions browser
- mentions chrome
- mentions server
- mentions mcp
- mentions token
- mentions system prompt
- declares CLI/bin entrypoints
- Pi manifest declares extension entrypoints

## Recommendation

Audit as compatibility adapter. Keep permissions and tool exposure in SISO core.

## Required Before Install

```bash
npm view pi-mcp-adapter --json
npm pack pi-mcp-adapter
tar -tf pi-mcp-adapter-*.tgz | sed -n '1,200p'
```
