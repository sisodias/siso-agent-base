# pi-web-access Extension Audit

Generated: 2026-05-10T05:41:51.578Z

## Catalog

- Package: `pi-web-access`
- Pi URL: https://pi.dev/packages/pi-web-access
- npm URL: https://www.npmjs.com/package/pi-web-access
- Repo: https://github.com/nicobailon/pi-web-access
- Types: extension, skill
- Downloads/month: 34300
- SISO score: 89
- Catalog risk: 35
- Catalog recommendation: fork-candidate

## npm Registry

- Registry status: ok
- Latest version: 0.10.7
- License: MIT
- Dependencies: 5
- Peer dependencies: 0
- Optional dependencies: 0
- Bin entrypoints: none

## npm Scripts

- `test`: `node --test`

## Pi Manifest

```json
{
  "extensions": [
    "./index.ts"
  ],
  "skills": [
    "./skills"
  ],
  "video": "https://github.com/nicobailon/pi-web-access/raw/refs/heads/main/pi-web-fetch-demo.mp4"
}
```

## SISO Baseline

SISO can use available web/browser tools, but does not own a Pi-native all-in-one web/PDF/GitHub/YouTube package.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions browser
- mentions chrome
- mentions server
- mentions mcp
- mentions token
- Pi manifest declares extension entrypoints

## Recommendation

Copy pattern or fork only after deeper source review.

## Required Before Install

```bash
npm view pi-web-access --json
npm pack pi-web-access
tar -tf pi-web-access-*.tgz | sed -n '1,200p'
```
