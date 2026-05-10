#!/usr/bin/env node
import assert from "node:assert/strict";

import { formatDuplicateRequestReport } from "../extensions/siso-status/bifrost-metrics.js";

const entries = [
  {
    timestamp: "2026-05-09T00:00:00.000Z",
    model: "gpt-5.5",
    body_chars: 360000,
    body_without_tools_chars: 341000,
    tool_chars: 19000,
    tool_count: 8,
    text_categories: { large_other_text: 145000, small_other_text: 52000, pi_kernel: 3000 },
    top_text_blocks: [
      { category: "pi_kernel", chars: 22000, preview: "SISO kernel should not be selected when large_other_text dominates the group" },
      { category: "large_other_text", chars: 16000, preview: "Repeated child result and tool transcript block" },
    ],
    top_tools: [{ name: "subagent", chars: 12000 }, { name: "siso", chars: 2700 }],
    siso: { profile: "minimax.scout", lane: "minimax" },
  },
  {
    timestamp: "2026-05-09T00:00:04.000Z",
    model: "gpt-5.5",
    body_chars: 359200,
    body_without_tools_chars: 340300,
    tool_chars: 19000,
    tool_count: 8,
    text_categories: { large_other_text: 144500, small_other_text: 51500, pi_kernel: 3000 },
    top_text_blocks: [{ category: "large_other_text", chars: 15900, preview: "Repeated child result and tool transcript block" }],
    top_tools: [{ name: "subagent", chars: 12000 }, { name: "siso", chars: 2700 }],
    siso: { profile: "minimax.scout", lane: "minimax" },
  },
  {
    timestamp: "2026-05-09T00:00:08.000Z",
    model: "gpt-5.5",
    body_chars: 358900,
    body_without_tools_chars: 340000,
    tool_chars: 19000,
    tool_count: 8,
    text_categories: { large_other_text: 144200, small_other_text: 51500, pi_kernel: 3000 },
    top_text_blocks: [{ category: "large_other_text", chars: 15800, preview: "Repeated child result and tool transcript block" }],
    top_tools: [{ name: "subagent", chars: 12000 }, { name: "siso", chars: 2700 }],
    siso: { profile: "minimax.scout", lane: "minimax" },
  },
  {
    timestamp: "2026-05-09T00:02:00.000Z",
    model: "gpt-5.4-mini",
    body_chars: 80000,
    body_without_tools_chars: 70000,
    tool_chars: 9000,
    tool_count: 4,
    text_categories: { user_prompt: 5000, pi_kernel: 3000 },
    top_tools: [{ name: "read", chars: 1000 }],
    siso: { profile: "gpt54mini.worker", lane: "gpt54mini" },
  },
];

const report = formatDuplicateRequestReport(entries, 20);

assert.match(report, /^SISO Bifrost duplicate request report/m);
assert.match(report, /duplicate_groups=1/);
assert.match(report, /group 1 · 3 requests/);
assert.match(report, /shape=[a-z0-9]{8}/);
assert.match(report, /window=8s/);
assert.match(report, /model=gpt-5.5/);
assert.match(report, /body≈340\.4k/);
assert.match(report, /largest=large_other_text/);
assert.match(report, /times=2026-05-09T00:00:00.000Z, 2026-05-09T00:00:04.000Z, 2026-05-09T00:00:08.000Z/);
assert.match(report, /profiles=minimax.scout:3/);
assert.match(report, /top_text=large_other_text:16k:Repeated child result and tool transcript block/);
assert.doesNotMatch(report, /top_text=pi_kernel/);
assert.match(report, /top_tools=subagent:12k,siso:2\.7k/);
assert.match(report, /hint=Repeated large_other_text/);
assert.doesNotMatch(report, /gpt-5.4-mini.*group 2/s);

console.log("SISO_BIFROST_DUPLICATES_SMOKE_OK");
