#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSisoPreflightMessage, buildSisoPhaseMessage, SISO_OUTPUT_STYLE_PROMPT, renderSisoPhaseCard } from "../extensions/siso-agent-router/output-style.js";
import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";

const renderContract = readFileSync(new URL("../docs/tui/render-contract.md", import.meta.url), "utf8");
for (const surface of ["StartupHeader", "AssistantText", "PhaseCard", "ToolGroup", "ToolDetail", "AgentCard", "StatusLine", "Widget", "CommandOverlay", "Notice"]) {
  assert.match(renderContract, new RegExp(`\\b${surface}\\b`), `render contract should name ${surface}`);
}
for (const budget of ["startup: 2 lines", "phase: 3 lines", "tool group: 1 header + up to 4 child lines", "agent card compact: 2-3 lines", "footer: 1 line", "widgets: max 4 total lines"]) {
  assert.match(renderContract, new RegExp(budget.replace(/[+]/g, "\\+")), `render contract should include budget: ${budget}`);
}
for (const banned of ["Recon", "kind=", "runtime=native-subagent", "child_id=", "raw diagnostic prefixes", "raw long task labels", "timeout/limit suffixes"]) {
  assert.match(renderContract, new RegExp(banned.replace(/[=]/g, "\\=")), `render contract should ban ${banned}`);
}

assert.match(SISO_OUTPUT_STYLE_PROMPT, /Before tool-heavy work/);
assert.match(SISO_OUTPUT_STYLE_PROMPT, /Do not expose hidden chain-of-thought/);
assert.match(SISO_OUTPUT_STYLE_PROMPT, /Do not prefix normal final answers/);

const msg = buildSisoPreflightMessage("The PI output text looks bad and I want the final answer style fixed");
assert.equal(msg.customType, "siso-preflight");
assert.match(msg.content, /UI\/output polish/);
assert.match(msg.content, /inspect the relevant files/);
const phaseMsg = buildSisoPhaseMessage("validate", "Running focused smokes now.");
const phaseCard = renderSisoPhaseCard(phaseMsg, { expanded: false }, { fg: (_key, text) => text });
assert.match(phaseCard, /◇ Validate/);
const card = renderSisoPhaseCard(msg, { expanded: false }, { fg: (_key, text) => text });
assert.match(card, /◇ Plan/);
assert.doesNotMatch(card, /Recon/);
assert.match(card, /inspect the relevant files/);
assert.ok(card.split(/\r?\n/).length <= 3, "collapsed PhaseCard should stay within the 3-line render budget");

const listeners = new Map();
const pi = {
  on(name, handler) { listeners.set(name, handler); },
  registerCommand() {},
  registerTool() {},
  registerMessageRenderer(type, renderer) { if (type === "siso-preflight") this._renderer = renderer; if (type === "siso-phase") this._phaseRenderer = renderer; },
  sendUserMessage() {},
  getAllTools: () => []
};
sisoAgentRouterExtension(pi);
const appended = [];
const result = listeners.get("before_agent_start")?.({ prompt: "fix the ugly TXT final output", systemPrompt: "base" }, { appendEntry(type, data) { appended.push({ type, data }); }, ui: { setStatus() {}, setChildren() {} } });
assert.equal(appended[0]?.type, "siso-phase");
assert.match(appended[0]?.data?.content ?? "", /inspect the relevant files/);
assert.ok(result?.message, "before_agent_start should return preflight message");
assert.equal(result.message.customType, "siso-preflight");
assert.match(result.systemPrompt, /SISO interaction style/);
assert.match(result.systemPrompt, /Avoid dumping code/);
assert.equal(typeof pi._renderer, "function");
assert.equal(typeof pi._phaseRenderer, "function");
const rendered = pi._renderer(result.message, { expanded: false }, { fg: (_key, text) => text });
assert.match(String(rendered), /Text|object/);

console.log("SISO_OUTPUT_STYLE_SMOKE_OK");
