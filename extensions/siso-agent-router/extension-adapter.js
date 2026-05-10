const VALID_RISKS = new Set(["low", "medium", "high"]);

function isSafeId(value) {
  return /^[A-Za-z0-9._@/-]+$/.test(String(value ?? ""));
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function validateExtensionAdapter(adapter = {}) {
  const errors = [];
  if (!adapter || typeof adapter !== "object") errors.push("adapter must be an object");
  if (!isSafeId(adapter.id)) errors.push("id must be a non-empty safe identifier");
  if (!String(adapter.name ?? "").trim()) errors.push("name is required");
  if (adapter.version != null && !String(adapter.version).trim()) errors.push("version must be non-empty when provided");
  if (adapter.packageName != null && !String(adapter.packageName).trim()) errors.push("packageName must be non-empty when provided");
  if (!VALID_RISKS.has(String(adapter.risk ?? "low"))) errors.push("risk must be low, medium, or high");
  if (!Array.isArray(adapter.capabilities) || adapter.capabilities.some((entry) => !String(entry ?? "").trim())) {
    errors.push("capabilities must be an array of non-empty strings");
  }
  if (adapter.setup != null && typeof adapter.setup !== "function" && adapter.hasSetup !== true) errors.push("setup must be a function when provided");
  if (typeof adapter.run !== "function" && adapter.hasRun !== true) errors.push("run must be a function");
  if (adapter.benchmark != null && typeof adapter.benchmark !== "function" && adapter.hasBenchmark !== true) errors.push("benchmark must be a function when provided");
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isExtensionAdapter(adapter = {}) {
  return validateExtensionAdapter(adapter).valid;
}

export function createExtensionAdapterManifest(adapter = {}) {
  const capabilities = normalizeStringList(adapter.capabilities);
  return {
    id: String(adapter.id ?? "").trim(),
    name: String(adapter.name ?? "").trim(),
    version: String(adapter.version ?? "0.0.0").trim(),
    packageName: String(adapter.packageName ?? adapter.id ?? "").trim(),
    risk: VALID_RISKS.has(String(adapter.risk ?? "low")) ? String(adapter.risk ?? "low") : "low",
    capabilities,
    hasSetup: typeof adapter.setup === "function" || adapter.hasSetup === true,
    hasRun: typeof adapter.run === "function" || adapter.hasRun === true,
    hasBenchmark: typeof adapter.benchmark === "function" || adapter.hasBenchmark === true,
  };
}

export function normalizeExtensionAdapterResult(result = {}) {
  const ok = Boolean(result.ok);
  const summary = String(result.summary ?? (ok ? "ok" : "failed"));
  const evidence = normalizeStringList(result.evidence);
  return {
    ok,
    summary,
    data: result.data ?? null,
    evidence,
    error: result.error == null ? null : String(result.error),
  };
}
