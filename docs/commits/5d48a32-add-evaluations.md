# Commit feature brief: `5d48a32` — add-evaluations

**Date:** 2026-07-11  
**Author:** Amardeep Ganguly  
**Scope:** 10 files — LangSmith scoping eval pipeline under `backend/src/eval/`

## Summary

Adds a LangSmith experiment that scores research briefs from clarified conversations. The target runs `generateBrief` only (not the full HITL graph), then two LLM-as-judge evaluators measure criteria capture and unwarranted assumptions. Runnable via `npm run eval:scoping`.

## Features

### LangSmith experiment runner

- CLI entry `runScopingEval.ts` creates/uses dataset `deep_research_scoping` and runs `evaluate()` with prefix `Deep Research Scoping`
- Idempotent dataset bootstrap (`ensureScopingDataset`) with two fixture conversations (retirement investing, NYC apartment)
- Direct `langsmith` dependency and `eval:scoping` npm script

### Evaluation target

- `scopingTarget` rebuilds serializable `{ type, content }` messages into LangChain messages and calls `generateBrief`
- Returns `{ research_brief }` for LangSmith scoring

### LLM-as-judge evaluators

- `evaluateSuccessCriteria` — per-criterion structured batch judge → `success_criteria_score` (fraction captured)
- `evaluateNoAssumptions` — hallucination/assumption auditor → `no_assumptions_score` (0/1)
- Judge model via `EVAL_MODEL` (default `gpt-4o`); prompts in `briefCriteria.ts` and `briefHallucination.ts`

### Config

- `.env.example` documents `EVAL_MODEL=gpt-4o`

## Not in this commit

- Full-graph / HITL evaluation
- CI automation for the eval run
- Docs updates to `testing.md` (present in working tree only if uncommitted)
