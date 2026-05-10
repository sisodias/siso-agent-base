# Decision: Track jcode As A Top-Tier Harness Reference

## Decision

Track `1jehuang/jcode` as a top-tier harness reference, not just another backend candidate.

Do not adopt it wholesale into the default Pi Harness Lab path. Mine it for patterns:

- structure-aware grep
- memory graph and memory sidecar verification
- shared-server multi-session coordination
- swarm file-touch notifications
- provider profile UX
- MCP config import and dynamic tool registration
- memory/performance budgets

## Why

The repo is current, MIT licensed, popular, and directly targets the same problem space: a faster, more customizable coding-agent harness.

The most immediately useful idea is `agentgrep`: search results enriched with file structure and adaptive truncation. That is the natural next upgrade after our new `pi-brain-grep.mjs` wrapper.

## Status

Accepted as a research/design reference. Next implementation target is structured grep, not full jcode integration.
