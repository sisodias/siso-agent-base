export type SisoExtensionRisk = "low" | "medium" | "high";

export interface SisoExtensionAdapter {
  id: string;
  name: string;
  version?: string;
  packageName?: string;
  risk?: SisoExtensionRisk;
  capabilities: string[];
  setup?: () => Promise<unknown> | unknown;
  run: (input: unknown) => Promise<unknown> | unknown;
  benchmark?: (fixture: unknown) => Promise<unknown> | unknown;
}

export interface ExtensionAdapterValidation {
  valid: boolean;
  errors: string[];
}

export interface ExtensionAdapterManifest {
  id: string;
  name: string;
  version: string;
  packageName: string;
  risk: SisoExtensionRisk;
  capabilities: string[];
  hasSetup: boolean;
  hasRun: boolean;
  hasBenchmark: boolean;
}

export interface ExtensionAdapterResult {
  ok: boolean;
  summary: string;
  data: unknown;
  evidence: string[];
  error: string | null;
}

export function validateExtensionAdapter(adapter?: Partial<SisoExtensionAdapter>): ExtensionAdapterValidation;
export function isExtensionAdapter(adapter?: Partial<SisoExtensionAdapter>): boolean;
export function createExtensionAdapterManifest(adapter?: Partial<SisoExtensionAdapter>): ExtensionAdapterManifest;
export function normalizeExtensionAdapterResult(result?: Partial<ExtensionAdapterResult>): ExtensionAdapterResult;
