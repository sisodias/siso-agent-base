# Agent: session-persistent-workhorse-mvp

ID: session-persistent-workhorse-mvp
Status: live
Created: 2026-05-10 01:37
Owner: current session/main agent
Role: session persistent workhorse

## Purpose

Build the activatable persistent workhorse system where a session agent delegates to a durable background agent that continues until done or blocked

## Relationship

Shaan talks to the session/main agent. The session/main agent talks to this workhorse. This workhorse asks questions through the session/main agent.
