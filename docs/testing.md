# Testing Guide

## 1. Health check

```bash
curl http://localhost:3001/health
```

Expected:

```json
{"status":"ok"}
```

## 2. Vague query (should pause for human clarification)

```bash
curl -s -X POST http://localhost:3001/research \
  -H "Content-Type: application/json" \
  -d '{"query":"AI trends"}' | jq
```

Expected:

- `status` is `needs_clarification`
- `threadId` is returned (save this for resume)
- `need_clarification` is `true`
- `question` is a non-empty string (`ClarifyWithUser.question`)
- `verification` is `""`
- `interrupt` is present (graph paused at human-in-the-loop step)
- `research_brief` is absent

## 2b. Resume after clarification

Use the `threadId` from step 2:

```bash
curl -s -X POST http://localhost:3001/research \
  -H "Content-Type: application/json" \
  -d '{"threadId":"<threadId>","clarificationResponse":"Focus on generative AI adoption in US healthcare for 2025-2026. Audience: product strategy team. Output: executive brief with 3-5 actionable recommendations."}' | jq
```

Expected:

- `status` is `complete`
- `need_clarification` is `false`
- `verification` is populated (`ClarifyWithUser.verification`)
- `research_brief` is populated (`ResearchQuestion.research_brief`)
- `enrichedQuery` includes the original query plus your clarification

## 3. Detailed query (fast path)

```bash
curl -s -X POST http://localhost:3001/research \
  -H "Content-Type: application/json" \
  -d '{"query":"For a mid-size fintech in the EU, analyze the regulatory and technical implications of adopting real-time AML transaction monitoring using graph databases versus traditional rule engines. Focus on PSD2/AML6 compliance, implementation cost over 18 months, and false-positive rates. Audience: CTO and compliance lead."}' | jq
```

Expected:

- `status` is `complete`
- `research_brief` is a detailed research question
- No `interrupt` (HITL not triggered)

## 4. Validation error

```bash
curl -s -X POST http://localhost:3001/research \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

Expected:

```json
{
  "error": "Missing required field: query"
}
```

## LangSmith tracing

Tracing is enabled in `backend/.env`:

```env
LANGSMITH_TRACING_V2=true
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=deep_research_nodejs
```

### Verify traces

1. Start the API: `cd backend && npm run dev`
2. Send a `/research` request (see examples above)
3. Open [LangSmith](https://smith.langchain.com)
4. Go to **Projects** → **deep_research_nodejs**
5. Confirm a new trace appears for each LLM call in the graph

Each graph run produces multiple spans:

- `assessQuery` structured output call
- `requestClarification` (`ClarifyWithUser`) and/or `generateBrief` (`ResearchQuestion`) structured output calls

### Studio + LangSmith together

When using `npm run langgraph:dev`, runs initiated from LangGraph Studio also appear in the same LangSmith project if tracing env vars are set.

## Scoping evaluation (LangSmith)

Evaluates `generateBrief` quality against success criteria and no-assumptions judges.

### Prerequisites

- `LANGSMITH_API_KEY` set in `backend/.env`
- `OPENAI_API_KEY` set (used for brief generation when `LLM_PROVIDER=openai`, and always for LLM-as-judge)
- Optional: `EVAL_MODEL` (default `gpt-4o`) for the judge models

### Run

```bash
cd backend
npm run eval:scoping
```

This will:

1. Create or sync the `deep_research_scoping` dataset in LangSmith (5 conversation examples across investing, housing, CRM, travel, and infrastructure)
2. Run `generateBrief` on each example
3. Score with `success_criteria_score` and `no_assumptions_score`
4. Upload an experiment prefixed `Deep Research Scoping`

### View results

1. Open [LangSmith](https://smith.langchain.com)
2. Go to **Datasets & Experiments** → `deep_research_scoping`
3. Open the latest experiment under the `Deep Research Scoping` prefix

## Manual checklist

- [ ] `npm install` succeeds in `backend`
- [ ] `npm run dev` starts without errors
- [ ] `GET /health` returns 200
- [ ] Vague query returns `need_clarification: true` with `question`
- [ ] Resume returns `research_brief`
- [ ] Detailed query returns `research_brief` without HITL
- [ ] LangSmith project shows traces after test requests
- [ ] `npm run eval:scoping` completes and shows an experiment in LangSmith

## Dry run reference

See [graph-dry-run.md](./graph-dry-run.md) for four full scenarios with state at each checkpoint.
