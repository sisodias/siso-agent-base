# Decision: Start Code Brain With Pack And Grep

## Decision

The first code-brain implementation slice should use:

- `rg` as the zero-setup retrieval baseline.
- Repomix-style packing as the `pi context pack` baseline.
- A Pi-native adapter contract for future graph/retrieval engines.

Do not start by embedding GitNexus, Vera, Codemem, Project RAG, or qmd directly into the default harness path.

## Why

The lab bakeoff showed:

- `rg` answered the key query across the scoped lab repo in about `0.011s`.
- Repomix packed 42 scoped files into a 58,335-token artifact and compressed that to 35,480 tokens with `--compress`.
- Repomix included useful token accounting and passed its secret scan.
- Vera has excellent command design, but this machine needed model/API setup before indexing; the local CPU attempt created a roughly `419M` `/Users/shaansisodia/.vera` footprint and did not finish quickly enough to be a default path.
- GitNexus is rich, but its npm help command hung during this pass and its license/setup behavior make it unsuitable as the first default dependency.
- `pi-gitnexus` is the best reference for Pi augmentation hooks, but the harness should generalize its pattern around our own adapter contract.

## Immediate Build Shape

```text
scripts/pi-brain-grep.mjs
scripts/pi-context-pack.mjs
docs/code-brain-adapter-contract.md
```

Initial commands:

```text
node scripts/pi-brain-grep.mjs "Bifrost route"
node scripts/pi-context-pack.mjs --compress
```

Future commands:

```text
pi brain retrieve "auth flow"
pi brain context SomeSymbol
pi brain impact SomeSymbol
pi brain detect-changes --scope staged
```

## Status

Accepted for the next implementation slice.
