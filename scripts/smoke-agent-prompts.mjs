#!/usr/bin/env node
import assert from "node:assert/strict";

import { rolePrompt } from "../extensions/siso-agent-router/agent-prompts.js";

const scoutPrompt = rolePrompt({
  kind: "scout",
  profile: "minimax.scout",
});

assert.doesNotMatch(
  scoutPrompt,
  /Prefer \.siso-wiki\/repomap if present/,
  "scout prompt should not encourage direct optional .siso-wiki probing",
);
assert.match(
  scoutPrompt,
  /only after .*test -f \.siso-wiki\/index\.md/i,
  "scout prompt should require a non-erroring file existence check before reading optional .siso-wiki",
);
assert.match(
  scoutPrompt,
  /do not run `?ls \.siso-wiki`?/i,
  "scout prompt should explicitly avoid noisy ls .siso-wiki probes",
);
assert.match(
  scoutPrompt,
  /Do not assume conventional src\/ or lib\/ folders exist/,
  "scout prompt should discourage noisy src/lib probes in repos with different layouts",
);
assert.match(
  scoutPrompt,
  /discover directories with `rg --files`/,
  "scout prompt should provide a non-erroring repo layout discovery path",
);
assert.match(
  scoutPrompt,
  /never append pipes or redirects to the closing `PY` line/,
  "scout prompt should prevent noisy heredoc syntax mistakes",
);

const workerPrompt = rolePrompt({
  kind: "worker",
  profile: "minimax.worker",
});

assert.match(
  workerPrompt,
  /re-read the target hunk/,
  "worker prompt should prevent stale edit hunk retries",
);
assert.match(
  workerPrompt,
  /test -f \.claude\/feedback\/phase_<PHASE>_fixes\.md/,
  "worker prompt should treat phase feedback as an optional file, not a required directory search",
);
assert.match(
  workerPrompt,
  /never append pipes or redirects to the closing `PY` line/,
  "worker prompt should prevent noisy heredoc syntax mistakes",
);

console.log("SISO_AGENT_PROMPTS_SMOKE_OK");
