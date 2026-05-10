# SISO Capability Registry

This directory is SISO's feature memory.

Agents should check it before building new infrastructure so they can answer:

- Do we already have this?
- Is it partial, missing, or validated?
- Where is it implemented?
- What smoke proves it works?
- Should it be included in the next changelog?

## Files

- `registry.json` — machine-readable source of truth.
- `current.md` — human-readable current capability list.
- `ideas.md` — inbox for proposed/missing capabilities.
- `changelog-candidates.md` — pending release notes generated from completed capabilities.
- `../tui/catalog.md` — dedicated SISO terminal UI improvement catalog.

## Agent workflow

1. Search `registry.json` before starting capability work.
2. Add new ideas as `status: "idea"` with `exists: false`.
3. When building, move to `in-progress`/`implemented`.
4. After validation, add `validatedBy` and mark `validated`.
5. If user-facing/release-worthy, set `changelogCandidate: true` and add a note to `changelog-candidates.md`.
6. Release agents consume candidates when updating `CHANGELOG.md`.

Validate with:

```bash
npm run smoke:capabilities
```
