# Inbox Task: Activate persistence skill MVP

Date: 2026-05-10
Status: assigned
Priority: high

## Goal

Turn the persistent-agent MVP from static files into an activatable workhorse loop.

## Assignment

Use the new `persistence` skill model:

- current/main chat agent remains the user's interface
- background child agents become workhorses
- durable files keep identity, goals, memory, run reports, worklogs, changelogs, metrics
- TUI can later watch these files

## Deliverable

Review the current persistent-agent files and recommend the smallest next implementation step to make this more real.

Write output as a run report under `runs/` and update worklog/metrics as appropriate.
