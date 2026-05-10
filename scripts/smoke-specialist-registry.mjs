#!/usr/bin/env node
import assert from "node:assert/strict";

import { PROFILE_REGISTRY } from "../extensions/siso-agent-router/profile-registry.js";
import { chooseRoute, formatDecision } from "../extensions/siso-agent-router/route-policy.js";
import {
  SPECIALIST_REGISTRY,
  detectTaskDomains,
  rankSpecialistsForTask,
  specialistAllocationForTask,
} from "../extensions/siso-agent-router/specialist-registry.js";

const specialists = Object.values(SPECIALIST_REGISTRY);
assert.ok(specialists.length >= 12, "registry should cover the existing route-policy specialist labels");
assert.equal(new Set(specialists.map((item) => item.id)).size, specialists.length, "specialist ids must be unique");

for (const specialist of specialists) {
  assert.match(specialist.id, /^specialist\./);
  assert.ok(specialist.alias);
  assert.ok(["scout", "worker", "reviewer", "verifier", "planner"].includes(specialist.role));
  assert.ok(["low", "medium", "high", "critical"].includes(specialist.riskTier));
  assert.ok(PROFILE_REGISTRY[specialist.executionProfile], `${specialist.id} executionProfile must exist`);
  assert.ok(specialist.contextTier);
  assert.ok(specialist.permissionProfile);
  assert.ok(Array.isArray(specialist.verification));
  assert.ok(Object.keys(specialist.domains).length > 0);
}

const stripeTask = "Implement Stripe subscription checkout, webhook idempotency, and billing portal in the Next.js app";
const stripeDomains = detectTaskDomains(stripeTask);
assert.ok(stripeDomains.includes("payments"));
assert.ok(stripeDomains.includes("backend"));
assert.ok(stripeDomains.includes("security"));
assert.ok(stripeDomains.includes("database"));

const stripeRanked = rankSpecialistsForTask(stripeTask);
assert.equal(stripeRanked[0].id, "specialist.payments.stripe");
assert.equal(stripeRanked[0].executionProfile, "spark.worker");
assert.equal(stripeRanked[0].riskTier, "high");

const route = chooseRoute(stripeTask, { controllerFirst: true });
assert.equal(route.profile, "gpt55.planner");
assert.equal(route.routing, "controller_allocation");
assert.ok(route.specialistCandidates.some((item) => item.id === "specialist.payments.stripe"));
assert.match(formatDecision(stripeTask, route), /specialist_candidates=.*specialist\.payments\.stripe/);

const authAllocation = specialistAllocationForTask("Patch auth middleware route guards and harden session cookies.", { agent: "worker" });
assert.equal(authAllocation.specialistId, "specialist.auth.security");
assert.equal(authAllocation.specialistAlias, "auth-security");
assert.equal(authAllocation.riskTier, "high");
assert.ok(authAllocation.domains.includes("auth"));
assert.ok(authAllocation.verification.some((item) => /cookie|auth|route/i.test(item)));

console.log("SISO_SPECIALIST_REGISTRY_SMOKE_OK");
