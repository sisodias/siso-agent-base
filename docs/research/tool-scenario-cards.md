# Tool Scenario Cards Research Notes

Date: 2026-05-09

Tool discovery must teach **selection judgment**, not just availability. Claude Code-style tool descriptions, IDE command palettes, MCP registries, Sourcegraph/Cody search affordances, and modern tool-routing research all point toward compact scenario metadata:

- use when / avoid when
- workflow stage
- trigger and anti-trigger phrases
- expected outputs
- failure modes
- validation commands
- related capabilities/contracts/benchmark suites

The registry should stay outside live prompt context. Agents should retrieve a few ranked cards for the current task, then load exact schemas only if needed.

Initial implementation seeds cards for SISO's current deterministic code-intelligence primitives and nearby validation tools. Future work should add ranking telemetry and a `tool_recommend` runtime action over these cards.
