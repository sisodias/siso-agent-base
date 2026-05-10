# Decision: Split SISO/Pi Prompt Into Manifested Lazy Layers

## Status

Accepted draft for prototype.

## Decision

SISO/Pi should not copy Claude as one large prompt. It should translate Claude’s useful parts into a manifest-driven layered architecture:

1. tiny always-loaded kernel,
2. Shaan/user profile rules,
3. repo project overlays,
4. small capability router,
5. lazy coding/build/design/delegation/memory skills,
6. role-agent prompts only for children,
7. runtime hooks/telemetry outside prompt text.

## Rationale

Always-loaded prompt text should only include rules needed before the first tool call. Build frameworks, coding frameworks, UI frameworks, feature workflows, LSP workflows, delegation workflows, and memory procedures are valuable but task-conditional, so they should be lazy-loaded.

## Prototype Artifacts

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/PROMPT_MANIFEST.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/SYSTEM.v2.draft.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/siso-capabilities.v2.draft.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/skills/siso-coding-discipline.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/skills/siso-bugfix-framework.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/skills/siso-feature-framework.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/prototypes/prompt-architecture/skills/siso-ui-craft.md`

## Consequences

- Prompt bloat becomes visible and controllable.
- Claude parts remain a source library, not runtime dependency.
- Pi can imitate Claude’s modularity while using SISO naming, Bifrost routing, and explicit loader telemetry.
- Next implementation should copy drafts into an isolated profile only, not mutate real `~/.siso` or `~/.pi` yet.
