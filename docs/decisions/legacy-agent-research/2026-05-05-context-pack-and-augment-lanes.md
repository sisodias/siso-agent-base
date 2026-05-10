# Decision: Split Context Packing From Graph Augmentation

## Decision

Treat context packing and graph augmentation as two separate Pi harness lanes.

- `pi context pack` produces explicit bounded repo snapshots for first-pass ingestion, handoff, comparison, and emergency context loading.
- `pi graph augment` or `pi brain augment` enriches normal read/search results with bounded graph or retrieval context.

## Why

The Wave 8 research found that these tools solve different problems:

- `yamadashy/repomix` is excellent at turning a repo into an AI-friendly artifact with token counts, ignore handling, compression, and secret scanning.
- `tintinweb/pi-gitnexus` is excellent at showing how a Pi extension can enrich existing tool results with graph context without changing files on disk.
- `cogniplex/codemem`, `lemon07r/Vera`, `Brainwires/project-rag`, `qntx-labs/qmd`, and `abhigyanpatwari/GitNexus` all support a local-first indexed retrieval direction, but they should plug into a stable adapter rather than dictate the whole harness shape.

## Initial UX

```text
pi context pack --budget 12000 --format markdown
pi context pack --include "src/**/*.ts,docs/**/*.md" --compress
pi context pack-remote yamadashy/repomix --budget 20000

pi brain retrieve "auth session validation flow"
pi brain context AuthService.validate
pi brain impact AuthService.validate --direction upstream
pi brain detect-changes --scope staged
```

## Implementation Notes

- Keep Bifrost as the model boundary.
- Keep packers deterministic and local where possible.
- Do not let packers silently include secrets; use Secretlint-style checks before output.
- Keep graph augmentation bounded by output chars, timeouts, max patterns per tool result, and per-session deduplication.
- Put all prototypes under `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/`.

## Status

Accepted as a lab direction. Next step is a prototype spike, not direct adoption of any single upstream tool.
