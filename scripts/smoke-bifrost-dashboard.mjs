#!/usr/bin/env node
import assert from "node:assert/strict";

import { formatMetricsDashboard } from "../extensions/siso-status/bifrost-metrics.js";

const entries = [
  {
    timestamp: "2026-05-09T00:00:00.000Z",
    model: "gpt-5.5",
    body_chars: 360000,
    body_without_tools_chars: 341000,
    tool_chars: 19000,
    tool_count: 8,
    text_block_chars: 200000,
    text_categories: { large_other_text: 145000, small_other_text: 52000, pi_kernel: 3000 },
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
    text_block_chars: 199000,
    text_categories: { large_other_text: 144500, small_other_text: 51500, pi_kernel: 3000 },
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
    text_block_chars: 198700,
    text_categories: { large_other_text: 144200, small_other_text: 51500, pi_kernel: 3000 },
    top_tools: [{ name: "subagent", chars: 12000 }, { name: "siso", chars: 2700 }],
    siso: { profile: "minimax.scout", lane: "minimax" },
  },
];

const dashboard = formatMetricsDashboard(entries, 20);

assert.match(dashboard, /^SISO Bifrost dashboard/m);
assert.match(dashboard, /Warnings/);
assert.match(dashboard, /request burst/);
assert.match(dashboard, /near-duplicate prompt shape/);
assert.match(dashboard, /largest_section=large_other_text/);

console.log("SISO_BIFROST_DASHBOARD_SMOKE_OK");
