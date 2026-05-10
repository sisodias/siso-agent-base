#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  createExtensionAdapterManifest,
  isExtensionAdapter,
  normalizeExtensionAdapterResult,
  validateExtensionAdapter,
} from "../extensions/siso-agent-router/extension-adapter.js";

const adapter = {
  id: "browser-use",
  name: "Browser Use Adapter",
  version: "0.1.0",
  packageName: "browser-use",
  risk: "medium",
  capabilities: ["browser-automation", "visual-verification"],
  async setup() {
    return { ready: true };
  },
  async run(input) {
    return {
      ok: true,
      summary: `visited ${input.url}`,
      data: { url: input.url },
      evidence: ["screenshot.png"],
    };
  },
  async benchmark() {
    return { score: 0.82 };
  },
};

const validation = validateExtensionAdapter(adapter);
assert.equal(validation.valid, true);
assert.deepEqual(validation.errors, []);
assert.equal(isExtensionAdapter(adapter), true);

const manifest = createExtensionAdapterManifest(adapter);
assert.deepEqual(manifest, {
  id: "browser-use",
  name: "Browser Use Adapter",
  version: "0.1.0",
  packageName: "browser-use",
  risk: "medium",
  capabilities: ["browser-automation", "visual-verification"],
  hasSetup: true,
  hasRun: true,
  hasBenchmark: true,
});

const result = normalizeExtensionAdapterResult({
  ok: true,
  summary: "done",
  data: { count: 1 },
  evidence: "artifact.txt",
});
assert.deepEqual(result, {
  ok: true,
  summary: "done",
  data: { count: 1 },
  evidence: ["artifact.txt"],
  error: null,
});

const invalid = validateExtensionAdapter({
  id: "bad adapter",
  capabilities: "browser",
  run: "nope",
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some((error) => error.includes("id")));
assert.ok(invalid.errors.some((error) => error.includes("run")));
assert.ok(invalid.errors.some((error) => error.includes("capabilities")));

console.log("SISO_EXTENSION_ADAPTER_CONTRACT_SMOKE_OK");
