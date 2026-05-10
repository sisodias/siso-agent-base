# Code Brain Adapter Contract

## Goal

The Pi harness should expose stable code-brain verbs without hard-coding one backend.

The bakeoff result is:

- `rg` is the zero-setup retrieval floor.
- `agentgrep` / structure-aware grep is the next retrieval upgrade to test.
- Repomix is the first `context pack` backend.
- Vera, GitNexus, Codemem, Project RAG, and qmd are opt-in adapters after setup.

## Verbs

Every backend should implement as many of these verbs as it can, and clearly report unsupported verbs.

```ts
export interface CodeBrainAdapter {
  readonly name: string;
  readonly version?: string;

  status(): Promise<CodeBrainStatus>;
  grep(request: GrepRequest): Promise<GrepResult>;
  pack?(request: PackRequest): Promise<PackResult>;
  retrieve?(request: RetrieveRequest): Promise<RetrieveResult>;
  context?(request: ContextRequest): Promise<ContextResult>;
  impact?(request: ImpactRequest): Promise<ImpactResult>;
  detectChanges?(request: DetectChangesRequest): Promise<DetectChangesResult>;
}
```

## Shared Rules

- Default to local deterministic behavior.
- Keep Bifrost as the only model boundary for summarization or wiki generation.
- Never index `research/sources/**` unless the caller explicitly asks for ecosystem-corpus search.
- Always support result limits.
- Always report whether results are truncated.
- Keep generated indexes and packs inside the lab repo or an explicit cache path.
- Do not mutate global Pi or Claude profiles.
- Do not run tool setup that installs models, hooks, or agent config unless the caller explicitly asks for setup.

## Default Scope

Default targets for this lab:

```text
packages/
docs/
decisions/
tasks/
agents/
experiments/
README.md
AGENTS.md
package.json
tsconfig.json
```

Default excludes:

```text
research/**
node_modules/**
packages/**/dist/**
.git/**
```

## Status

```ts
export interface CodeBrainStatus {
  ok: boolean;
  backend: string;
  cwd: string;
  indexed: boolean;
  setupRequired?: boolean;
  setupHint?: string;
  indexPath?: string;
  cachePath?: string;
  warnings: string[];
}
```

## Grep

`grep` is exact retrieval. It should be instant and should not require an index.

```ts
export interface GrepRequest {
  query: string;
  targets?: string[];
  excludes?: string[];
  limit?: number;
  ignoreCase?: boolean;
  fixed?: boolean;
  memory?: boolean;
  memoryPath?: string;
  resetMemory?: boolean;
  sessionId?: string;
}

export interface GrepResult {
  backend: string;
  query: string;
  elapsedMs: number;
  totalMatches: number;
  returnedMatches: number;
  truncated: boolean;
  structured: boolean;
  memory: {
    enabled: boolean;
    path: string | null;
    sessionId: string | null;
    knownFilesBefore: number;
    knownFilesAfter: number;
    reset: boolean;
  };
  files?: Array<{
    path: string;
    alreadySeen: boolean;
    matchCount: number;
    symbolCount: number;
    omittedSymbolCount: number;
    symbols: Array<{
      name: string;
      kind: string;
      startLine: number;
      endLine: number;
    }>;
    matchedRegions: Array<{
      startLine: number;
      endLine: number;
      matchLines: number[];
      containingSymbol?: string;
      alreadySeen: boolean;
    }>;
  }>;
  matches: Array<{
    path: string;
    line: number;
    absoluteOffset?: number;
    text: string;
    structure?: {
      containingSymbol?: string;
      symbolKind?: string;
      startLine?: number;
      endLine?: number;
      fileAlreadySeen?: boolean;
      regionAlreadySeen?: boolean;
    };
    submatches?: Array<{
      text: string;
      start: number;
      end: number;
    }>;
  }>;
}
```

Initial implementation:

```bash
node scripts/pi-brain-grep.mjs "Bifrost route" --pretty
```

Current structured `rg` implementation:

- Defaults to symbol/file summaries.
- Adds containing class/function/method/test/heading context to each match when available.
- Returns per-file match regions, symbol counts, and omitted symbol counts.
- Keeps `research/**` excluded unless the caller explicitly targets it.
- Persists session grep memory to `.pi/brain-grep-known.json` by default.
- Marks repeated files/regions with `fileAlreadySeen`, `regionAlreadySeen`, and `files[].alreadySeen`.
- Shrinks repeated-file symbol summaries to two symbols while preserving full match rows.

Next upgrade:

- Test `agentgrep`-style output from `1jehuang/jcode`.
- Add `mode=outline|trace` and agent-facing query fields from the JCode handoff.

## Pack

`pack` creates a bounded context artifact for handoff, review, and first-pass repo ingestion.

```ts
export interface PackRequest {
  include?: string;
  ignore?: string;
  output?: string;
  style?: "markdown" | "xml" | "json" | "plain";
  compress?: boolean;
  includeDiffs?: boolean;
  includeLogsCount?: number;
  remote?: string;
}

export interface PackResult {
  backend: string;
  output: string;
  style: string;
  include: string;
  ignore: string;
  compress: boolean;
  remote?: string | null;
}
```

Initial implementation:

```bash
node scripts/pi-context-pack.mjs --compress
```

## Retrieve

`retrieve` is semantic or hybrid search. It may require setup.

```ts
export interface RetrieveRequest {
  query: string;
  intent?: string;
  targets?: string[];
  excludes?: string[];
  limit?: number;
  scope?: "source" | "docs" | "runtime" | "all";
}

export interface RetrieveResult {
  backend: string;
  query: string;
  setupRequired?: boolean;
  elapsedMs?: number;
  results: Array<{
    path: string;
    startLine?: number;
    endLine?: number;
    symbol?: string;
    score?: number;
    text: string;
  }>;
  truncated: boolean;
}
```

Candidate backends:

- Vera for local hybrid code search.
- Project RAG for local code RAG with definitions/references.
- qmd for docs and markdown knowledge collections.

## Context

`context` returns a bounded view around a symbol or file.

```ts
export interface ContextRequest {
  target: string;
  includeContent?: boolean;
  maxChars?: number;
}

export interface ContextResult {
  backend: string;
  target: string;
  summary?: string;
  files: string[];
  symbols: string[];
  content?: string;
  truncated: boolean;
}
```

Candidate backends:

- GitNexus for graph context.
- Codemem for persistent graph memory.
- A custom tree-sitter adapter for the lean local default.

## Impact

`impact` estimates what may break if a symbol, file, or diff changes.

```ts
export interface ImpactRequest {
  target: string;
  direction?: "upstream" | "downstream" | "both";
  depth?: number;
  includeTests?: boolean;
}

export interface ImpactResult {
  backend: string;
  target: string;
  risk?: "low" | "medium" | "high" | "unknown";
  directDependents: string[];
  transitiveDependents: string[];
  notes: string[];
  truncated: boolean;
}
```

Candidate backends:

- GitNexus for call chains and execution flows.
- Codemem for temporal graph and diff review.
- Project RAG for lightweight definitions/references/call graph.

## Detect Changes

```ts
export interface DetectChangesRequest {
  scope?: "unstaged" | "staged" | "all" | "compare";
  baseRef?: string;
}

export interface DetectChangesResult {
  backend: string;
  changedFiles: string[];
  changedSymbols: string[];
  affectedFlows: string[];
  notes: string[];
  truncated: boolean;
}
```

## Adapter Ranking From Bakeoff

| Lane | First backend | Why |
| --- | --- | --- |
| `grep` | `rg` | Zero setup, instant, deterministic. |
| `structured grep` | `agentgrep` pattern | Adds function/class structure to search hits without reading whole files. |
| `pack` | Repomix | Good artifact format, token counts, compression, secret scan. |
| `augment` | pi-gitnexus pattern | Best Pi-native hook shape found. |
| `retrieve` | Vera later | Good UX, but setup-gated on this machine. |
| `graph` | GitNexus later | Rich graph, but license/setup gated. |

## Next Step

Wrap these scripts as Pi extension tools after the CLI behavior stabilizes.
