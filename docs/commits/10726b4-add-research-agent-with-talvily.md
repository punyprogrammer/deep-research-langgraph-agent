# Commit feature brief: `10726b4` — add-research-agent-with-talvily

**Date:** 2026-07-11  
**Author:** Amardeep Ganguly  
**Scope:** 26 files — research agent subgraph, Tavily tools, search utils, parent-graph wiring

## Summary

Extends the scoping graph past `generateBrief` into a full research loop: a researcher subgraph searches the web with Tavily, reflects with `think_tool`, then compresses findings into `notes` / `compressedResearch`. The parent graph mounts that subgraph after `prepareResearch` and finishes with `finalizeResearch`. Completes the path from clarified brief → gathered evidence.

## Features

### Parent graph wiring

- Flow: `generateBrief` → `prepareResearch` → `researcher` (subgraph) → `finalizeResearch` → `END`
- `prepareResearch` seeds `researchTopic` + initial `researcherMessages` from `researchBrief`
- `finalizeResearch` maps `compressedResearch` → `notes` and sets `status: "complete"`
- Shared researcher channels on parent state: `researcherMessages`, `researchTopic`, `toolCallIterations`, `compressedResearch`, `rawNotes`
- Studio export compiles without a local checkpointer; Express uses `createResearchGraph(checkpointer)`
- Default `recursionLimit` of 100 (research loops exceed the prior 25)

### Researcher subgraph

- Tool-calling loop: `llmCall` ↔ `toolNode`, then `compressResearch`
- `shouldContinue` routes on tool calls; hard stop after `MAX_RESEARCH_TOOL_ITERATIONS` (10)
- Bound tools: `tavily_search`, `think_tool`
- Compress step preserves sources/citations into `compressedResearch` + `rawNotes`

### Search tools & utils

- `@tavily/core` client via `TAVILY_API_KEY` (`config/tavily.ts`)
- `tavily_search` — search → dedupe by URL → summarize raw pages → formatted sources
- `think_tool` — records strategic reflection between searches
- Webpage summarization with Zod `summarySchema` (`summary`, `key_excerpts`) and `summarizeWebpage` prompt
- Nested summarization LLMs use isolated callbacks to avoid Studio stream/tracer clashes

### Prompts & schemas

- Research agent system prompt (`researchBrief.ts`) with tool budgets and think-after-search rules
- `compressResearchSystem` / `compressResearchHuman` for findings cleanup
- `schemas/research.ts` — `Summary` structured output

### HTTP API

- Complete responses include `notes`, `raw_notes`, and `compressed_research`
- Invoke config sets `recursionLimit: 100` for long research runs

## Not in this commit

- Final report generation from compressed notes
- Multi-agent supervisor / parallel sub-researchers
- Research-stage LangSmith evaluations (scoping eval unchanged aside from state defaults)
