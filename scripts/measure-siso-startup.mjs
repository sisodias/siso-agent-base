#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const baseEnv = {
  ...process.env,
  SISO_STATUS_UI: "off",
  SISO_AGENT_ROUTER_UI: "off",
  SISO_LIFECYCLE_UI: "off",
};

function measure(name, command, args) {
  const start = performance.now();
  const result = spawnSync(command, args, {
    env: baseEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ms = Math.round(performance.now() - start);
  return {
    name,
    ms,
    status: result.status,
    signal: result.signal,
    stdoutFirstLine: (result.stdout ?? "").split(/\r?\n/).find(Boolean) ?? "",
    stderrFirstLine: (result.stderr ?? "").split(/\r?\n/).find(Boolean) ?? "",
  };
}

const cases = [
  ["siso version", "bin/siso", ["--version"]],
  ["siso help", "bin/siso", ["--help"]],
  ["pi direct help", "node", ["node_modules/@mariozechner/pi-coding-agent/dist/cli.js", "--help"]],
];

const rows = cases.map(([name, command, args]) => measure(name, command, args));

for (const row of rows) {
  console.log(`${row.name}: ${row.ms}ms status=${row.status}${row.signal ? ` signal=${row.signal}` : ""}`);
  if (row.stdoutFirstLine) console.log(`  stdout: ${row.stdoutFirstLine}`);
  if (row.stderrFirstLine) console.log(`  stderr: ${row.stderrFirstLine}`);
}
