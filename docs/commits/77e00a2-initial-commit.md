# Commit feature brief: `77e00a2` — initial-commit

**Date:** 2026-07-11  
**Author:** Amardeep Ganguly  
**Scope:** Greenfield scaffold for the deep-research backend (26 files)

## Summary

First commit stands up an Express + LangGraph TypeScript backend that scopes a research query, optionally clarifies with the user (human-in-the-loop), and produces a structured research brief. Frontend is reserved; docs cover setup, dry-runs, Studio, and testing.

## Features

### Research graph (LangGraph)

- Five-node workflow: `assessQuery` → (`requestClarification` ↔ HITL loop) → `generateBrief`
- Conditional routing: sufficient queries skip clarification; insufficient ones enter the clarify loop
- Clarification loop: `requestClarification` → `humanClarification` (`interrupt`) → `incorporateClarification` → back to `requestClarification`
- In-memory checkpointer for thread persistence across interrupts/resumes
- State annotation aligned with `AgentState` / `ClarifyWithUser` / `ResearchQuestion` (reserved fields for later research/report stages)

### LLM-backed nodes

- **assessQuery** — structured sufficiency check (`sufficient`, `reason`)
- **requestClarification** — Zod `ClarifyWithUser` output (`need_clarification`, `question`, `verification`)
- **generateBrief** — Zod `ResearchQuestion` output (`research_brief`)
- Shared chat model config with OpenAI or Anthropic via `LLM_PROVIDER`

### HTTP API

- `GET /health` — liveness
- `POST /research` — start a run with `{ query }` or resume with `{ threadId, clarificationResponse }`
- Returns `needs_clarification` (with interrupt payload) or `complete` (with `research_brief`)
- Auto-generated `threadId` when not supplied

### Tooling & docs

- LangGraph Studio entry via `langgraph.json` and npm scripts (`langgraph:dev`, `langgraph:up`)
- Env template (`.env.example`), TypeScript build, `tsx` watch for local API
- Docs: getting started, graph dry-run scenarios, LangGraph Studio, testing
- Empty `frontend/` placeholder

## Not in this commit

- Actual multi-agent research / note-taking / final report generation (state fields reserved only)
- Frontend UI
- Durable checkpointer (e.g. Postgres) — memory only
