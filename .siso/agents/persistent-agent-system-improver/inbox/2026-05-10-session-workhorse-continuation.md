# Inbox Task: Session workhorse continuation model

Date: 2026-05-10
Status: assigned
Priority: high

## Goal

Design and validate the session-owned persistent workhorse pattern.

## Context

Shaan wants any agent/session to be able to spin up its own persistent agent. The user talks to the main/session agent; the main/session agent talks to the persistent workhorse. The workhorse continues working across runs until the spec is done or it needs input/permission.

## Assignment

Review the new workflow/template:

- `.siso/agents/workflows/session-persistent-workhorse.md`
- `.siso/agents/templates/session-workhorse-template.md`

Then recommend the smallest implementation step to make continuation real, not just documented.

Expected output:

- run report in `runs/`
- update worklog/metrics
- if useful, create a tiny pilot session workhorse for this exact project
