# context-mode Extension Audit

Generated: 2026-05-10T05:41:49.293Z

## Catalog

- Package: `context-mode`
- Pi URL: https://pi.dev/packages/context-mode
- npm URL: https://www.npmjs.com/package/context-mode
- Repo: https://github.com/mksglu/context-mode
- Types: extension, skill
- Downloads/month: 57800
- SISO score: 87
- Catalog risk: 40
- Catalog recommendation: fork-candidate

## npm Registry

- Registry status: ok
- Latest version: 1.0.111
- License: Elastic-2.0
- Dependencies: 7
- Peer dependencies: 0
- Optional dependencies: 1
- Bin entrypoints: {"context-mode":"cli.bundle.mjs"}

## npm Scripts

- `build`: `tsc && node -e "if(process.platform!=='win32'){require('fs').chmodSync('build/cli.js',0o755)}" && npm run bundle`
- `bundle`: `esbuild src/server.ts --bundle --platform=node --target=node18 --format=esm --outfile=server.bundle.mjs --external:better-sqlite3 --external:turndown --external:turndown-plugin-gfm --external:@mixmark-io/domino --minify && esbuild src/cli.ts --bundle --platform=node --target=node18 --format=esm --outfile=cli.bundle.mjs --external:better-sqlite3 --minify && esbuild src/session/extract.ts --bundle --platform=node --target=node18 --format=esm --outfile=hooks/session-extract.bundle.mjs --minify && esbuild src/session/snapshot.ts --bundle --platform=node --target=node18 --format=esm --outfile=hooks/session-snapshot.bundle.mjs --minify && esbuild src/session/db.ts --bundle --platform=node --target=node18 --format=esm --outfile=hooks/session-db.bundle.mjs --external:better-sqlite3 --minify`
- `version-sync`: `node scripts/version-sync.mjs`
- `version`: `node scripts/version-sync.mjs && git add .claude-plugin/plugin.json .claude-plugin/marketplace.json .openclaw-plugin/openclaw.plugin.json .openclaw-plugin/package.json openclaw.plugin.json .pi/extensions/context-mode/package.json`
- `prepublishOnly`: `npm run build`
- `dev`: `npx tsx src/server.ts`
- `setup`: `npx tsx src/cli.ts setup`
- `doctor`: `npx tsx src/cli.ts doctor`
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `benchmark`: `npx tsx tests/benchmark.ts`
- `test:use-cases`: `npx tsx tests/use-cases.ts`
- `test:compare`: `npx tsx tests/context-comparison.ts`
- `test:ecosystem`: `npx tsx tests/ecosystem-benchmark.ts`
- `install:openclaw`: `node -e "if(process.platform==='win32'){console.error('OpenClaw install requires bash (Git Bash or WSL)');process.exit(1)}else{require('child_process').execSync('bash scripts/install-openclaw-plugin.sh',{stdio:'inherit'})}"`
- `postinstall`: `node scripts/postinstall.mjs`

## Pi Manifest

```json
{
  "extensions": [
    "./build/pi-extension.js"
  ],
  "skills": [
    "./skills"
  ]
}
```

## SISO Baseline

SISO already owns provider-payload filtering, context capture, typed memory, librarian distillation, and retrieval pointers.

## Risks

- can influence agent runtime
- declares executable extension entrypoints
- mentions shell
- mentions exec
- mentions execute
- mentions write
- mentions server
- mentions mcp
- mentions token
- npm lifecycle scripts: build, bundle, version-sync, version, prepublishOnly, dev, setup, doctor, typecheck, test, test:watch, benchmark, test:use-cases, test:compare, test:ecosystem, install:openclaw, postinstall
- declares CLI/bin entrypoints
- Pi manifest declares extension entrypoints

## Recommendation

Fork/copy retrieval and FTS ideas after source review. Keep provider filtering in SISO core.

## Required Before Install

```bash
npm view context-mode --json
npm pack context-mode
tar -tf context-mode-*.tgz | sed -n '1,200p'
```
