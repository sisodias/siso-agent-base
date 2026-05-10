#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const required = [
  "apps/siso-opentui/src/main.tsx",
  "apps/siso-opentui/src/siso/adapter.ts",
  "apps/siso-opentui/src/siso/orchestrator.ts",
  "apps/siso-opentui/src/siso/session-runtime.ts",
  "apps/siso-opentui/LICENSE.opencode",
  "bin/siso-opentui-live",
];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`missing ${path}`);
}
console.log("SISO_OPENTUI_APP_SMOKE_OK");
