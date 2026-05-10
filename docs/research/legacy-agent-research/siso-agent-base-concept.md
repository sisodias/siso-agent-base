# SISO Agent Base Concept

Date: 2026-05-07
Status: draft

## Bottom Line

`~/.siso/agent-base` should be the new SISO source-of-truth for reusable agent assets: agents, skills, hooks, prompts, policies, templates, registries, and lifecycle metadata.

`~/.siso/agent` is the runtime.
`~/.siso/agent-base` is the factory/library.

Do not think of Agent Base as only “agents”. It is the curated capability base that powers SISO Agent.

## Naming

Recommended name: **SISO Agent Base**.

Why:

- matches package `@siso/agent-base`;
- clear successor to old `agent_os` hubs;
- can include agents, skills, hooks, templates, policies, docs, and experiments;
- sounds less like a deployed agent and more like the base/library/factory.

Runtime distinction:

```text
~/.siso/agent/       # live runtime: sessions, profile, child-runs, tasks
~/.siso/agent-base/  # reusable assets: catalogs, templates, candidates, active assets
```

## What Goes In Agent Base

Agent Base should contain assets that can be discovered, reviewed, promoted, installed, and improved.

Examples:

- agent role definitions;
- full agent folders with identity/persona/memory templates;
- skills;
- hooks;
- prompt templates;
- route policies;
- permission profiles;
- lifecycle/checkpoint patterns;
- sourcegraph/gitsearch/websearch research capabilities;
- evals/smokes for agents and skills;
- import manifests from Claude, Agent OS, SISO Library, repo-local `.claude`, `.agents`, `.codex`.

It should not contain high-churn runtime state by default:

- live sessions;
- child run outputs;
- transcripts;
- cache;
- file-history;
- paste-cache;
- raw quarantine dumps.

## Lifecycle Tiers

Use lifecycle tiers instead of one flat folder.

```text
~/.siso/agent-base/
  registry/
    agents.json
    skills.json
    hooks.json
    sources.json

  active/
    agents/
    skills/
    hooks/
    prompts/
    policies/

  candidate/
    agents/
    skills/
    hooks/
    prompts/
    policies/

  lab/
    agents/
    skills/
    hooks/
    experiments/

  archive/
    agents/
    skills/
    hooks/

  templates/
    agent/
    skill/
    hook/

  reviews/
    imports/
    audits/
    scorecards/

  docs/
    design/
    promotion-workflow.md
    standards.md
```

## Tier Meanings

### `active/`

Trusted and available to SISO by default or via lazy lookup.

Rules:

- reviewed;
- known owner/source;
- no secret leakage;
- has short description;
- has status metadata;
- compatible with Pi/SISO or wrapped safely.

### `candidate/`

Promising imports not yet active.

Examples:

- Claude global `planner.md`;
- `sourcegraph` skill;
- Agent OS `skills_hub` entries;
- SISO Library pipeline agents.

### `lab/`

New designs or rewrites. Good place for “agent being improved”.

### `archive/`

Deprecated but retained for reference.

### `registry/`

Machine-readable source of truth. Every active/candidate/lab item should have an entry.

## Agent OS Lessons

Agent OS already had the right idea:

- central hubs for agents/skills/hooks;
- registries with IDs, status, health, capabilities, source paths;
- lifecycle commands: list, search, info, audit, create, update;
- standard agent folder shape with identity, persona, inbox/outbox, workspace, memory;
- template versions;
- promotion workflow.

What we should keep:

- registry-first design;
- active/candidate/deprecated statuses;
- health/audit fields;
- standard asset structures;
- templates;
- promotion workflow.

What we should simplify:

- avoid over-engineered memory DBs in the boot path;
- avoid always-loaded huge context;
- keep runtime under `~/.siso/agent`, library under `~/.siso/agent-base`;
- make everything lazy and searchable.

## Standard Registry Fields

Minimum for agents:

```text
id
name
type
status: active|candidate|lab|archived
sourcePath
basePath
summary
capabilities
tags
runtime: pi|claude|codex|generic
healthScore
lastReviewedAt
promotionNotes
```

Minimum for skills:

```text
id
name
status
sourcePath
basePath
summary
tags
allowedTools
runtime
installState
lastReviewedAt
```

## Recommended Promotion Workflow

1. inventory source;
2. create registry entry as `candidate`;
3. review content for secrets, bloat, overlap, usefulness;
4. adapt to SISO/Pi format if needed;
5. add minimal smoke/test if executable;
6. promote to `active`;
7. install/link into `~/.siso/agent` only if runtime needs it.

## Source Pools To Inventory

Start with:

```text
~/.claude
~/SISO_Workspace/.claude
~/SISO_Workspace/agent_os
~/SISO_Workspace/SISO_Library/agents
~/SISO_Workspace/SISO_Agency/agents
~/SISO_Workspace/SISO_Internal_Lab/agents
~/SISO_Workspace/paperclip
~/SISO_Workspace/siso-agentlabs
repo-local .claude/skills
repo-local .agents/skills
repo-local .codex/skills
```

## Immediate Recommendation

Do not manually browse every Claude folder first.

Build an inventory scanner that writes candidates into:

```text
~/.siso/agent-base/registry/agents.json
~/.siso/agent-base/registry/skills.json
~/.siso/agent-base/reviews/inventory-<date>.json
```

Then review top candidates by source and category.
