# Agent Tooling Roadmap

Purpose: preserve the high-leverage tool ideas that would make SISO coding agents much faster at codebase navigation, context gathering, safe edits, documentation, and validation.

## Priority 1: Fast repo search

Native structured search should replace noisy `find | grep | rg` shell loops.

Suggested surface:

```ts
repo_search({
  query: string,
  mode?: "text" | "regex" | "symbol" | "filename",
  path?: string,
  globs?: string[],
  maxResults?: number,
  contextLines?: number
})
```

Expected return: compact path/line/preview matches with bounded output.

Impact: very high. This is the biggest day-to-day speedup for codebase interaction.

## Priority 2: Multi-file read and context packs

Agents often need several related files at once, not one `read` call per file.

Suggested surfaces:

```ts
read_many({
  paths: string[],
  maxBytesPerFile?: number,
  includeLineNumbers?: boolean
})

context_pack({
  paths?: string[],
  query?: string,
  purpose: string,
  maxTokens?: number
})
```

Impact: very high for repo understanding, implementation planning, and documentation updates.

## Priority 3: Project tree and project map

Native tree/map output should ignore noisy directories and explain repo structure.

Suggested surfaces:

```ts
project_tree({
  path?: string,
  depth?: number,
  includeFiles?: boolean,
  exclude?: string[]
})

project_map({
  maxDepth?: number,
  includeScripts?: boolean,
  includeDocs?: boolean,
  includeTests?: boolean
})
```

Impact: high, especially at session start or when entering unfamiliar repos.

## Priority 4: Symbol and outline tools

Text search is not enough for code navigation.

Suggested surfaces:

```ts
symbol_search({
  name: string,
  kind?: "function" | "class" | "const" | "script" | "any"
})

file_outline({ path: string })
```

Expected return: exports, functions, classes, top-level constants, CLI commands, route handlers, and other structural landmarks.

Impact: high for JavaScript/TypeScript/Python-heavy repos.

## Priority 5: Atomic multi-file patching

Existing exact-replacement editing is safe but one-file-at-a-time. Coordinated changes need atomic validation.

Suggested surface:

```ts
apply_patch({
  patches: Array<{
    path: string,
    oldText: string,
    newText: string
  }>,
  dryRun?: boolean
})
```

Requirements:

- Validate every replacement before changing any file.
- Fail without side effects when one patch does not match.
- Return a concise diff/stat summary.
- Optionally support follow-up formatting or smoke checks.

Impact: high for implementation loops and safe refactors.

## Priority 6: Workspace diff and status

Agents need cheap before/after verification without raw `git diff` noise.

Suggested surfaces:

```ts
workspace_status()

workspace_diff({
  paths?: string[],
  stat?: boolean,
  maxChars?: number
})
```

Impact: medium-high for review, final summaries, and accidental-change detection.

## Priority 7: Test and smoke runner

Command execution should be summarized around validation outcomes.

Suggested surface:

```ts
run_check({
  name?: string,
  command?: string,
  timeoutMs?: number,
  summarize?: boolean
})
```

Expected return: pass/fail, elapsed time, failing lines, relevant stderr, and a full-log pointer instead of giant output.

Impact: high for reliable verification.

## Priority 8: Documentation helpers

Markdown/changelog/capability edits should be section-aware.

Suggested surfaces:

```ts
markdown_outline({ path: string })

doc_update({
  path: string,
  section: string,
  mode: "append" | "replace-section" | "insert-after-heading",
  content: string
})
```

Impact: medium-high for docs-heavy SISO work.

## Priority 9: Capability registry tools

The registry exists, but agents should not have to manually parse JSON/Markdown.

Suggested surfaces:

```ts
capability_search({ query: string })
capability_show({ id: string })
capability_add({ ... })
capability_update({ id: string, ... })
capability_audit()
```

Impact: high for SISO Agent Base because it prevents duplicate infrastructure and keeps changelog candidates accurate.

## Priority 10: Codebase briefing

A single task-aware briefing should gather the right repo context before work begins.

Suggested surface:

```ts
brief_repo({
  task: string,
  maxTokens?: number
})
```

Expected return:

- likely relevant files
- existing conventions
- available scripts/checks
- risky files
- prior capability entries
- suggested implementation path

Impact: very high when built on search, registry, project map, and context-pack primitives.

## Recommended first implementation batch

1. `repo_search`
2. `read_many`
3. `project_tree`
4. `workspace_diff`
5. `run_check`
6. `capability_search` / `capability_show`

This first batch should produce the largest practical speedup with relatively low implementation risk. The remaining tools can layer on top of these primitives.
