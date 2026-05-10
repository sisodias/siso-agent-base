#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  "apps/siso-tui/package.json",
  "apps/siso-tui/README.md",
  "apps/siso-tui/src/main.tsx",
  "packages/siso-tui/src/contract/events.ts",
  "packages/siso-tui/src/components/rows.ts",
  "packages/siso-tui/src/adapters/local-snapshot.ts",
  "packages/siso-tui/src/runtime/session-runtime.ts",
  "packages/siso-tui/src/theme/siso-theme.ts",
  "bin/siso-tui",
];

for (const path of required) {
  if (!existsSync(path)) throw new Error(`missing ${path}`);
}

if ((statSync("bin/siso-tui").mode & 0o111) === 0) {
  throw new Error("bin/siso-tui is not executable");
}

const binSiso = readFileSync("bin/siso", "utf8");
if (!binSiso.includes('"${1:-}" == "tui"') || !binSiso.includes("siso-tui")) {
  throw new Error("bin/siso does not route tui/ui to siso-tui");
}
if (!binSiso.includes('"${1:-}" == "preview"') || !binSiso.includes("siso-tui-preview")) {
  throw new Error("bin/siso does not keep preview on siso-tui-preview");
}

const installer = readFileSync("scripts/install-local.sh", "utf8");
if (!installer.includes("siso-tui ")) {
  throw new Error("install-local.sh does not install bin/siso-tui");
}

const pkg = readFileSync("package.json", "utf8");
if (!pkg.includes('"smoke:siso-tui-app"')) {
  throw new Error("package.json missing smoke:siso-tui-app");
}

const app = readFileSync("apps/siso-tui/src/main.tsx", "utf8");
for (const token of [
  "loadLocalSisoSnapshot",
  "headerLine",
  "transcriptRows",
  "renderWelcomePanelRows",
  "createCliRenderer",
  "createSisoTuiRuntime",
  "submitPrompt",
]) {
  if (!app.includes(token)) throw new Error(`main app missing ${token}`);
}
for (const noisyToken of ["drawLoading", "loading local status", "OpenTUI shell ready"]) {
  if (app.includes(noisyToken)) throw new Error(`main app still contains startup noise: ${noisyToken}`);
}

if (process.env.SISO_TUI_SKIP_BUN_CHECK !== "1") {
  const bun = spawnSync("bash", ["-lc", "command -v bun"], { encoding: "utf8" });
  if (bun.status === 0) {
    const check = spawnSync(
      "bun",
      ["build", "apps/siso-tui/src/main.tsx", "--target=bun", "--outdir=/tmp/siso-tui-smoke-build"],
      { encoding: "utf8" },
    );
    if (check.status !== 0) {
      process.stderr.write(check.stdout || "");
      process.stderr.write(check.stderr || "");
      throw new Error("apps/siso-tui/src/main.tsx failed bun build");
    }
  }
}

console.log("SISO_TUI_APP_SMOKE_OK");
