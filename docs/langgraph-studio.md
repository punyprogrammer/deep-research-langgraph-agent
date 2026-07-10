# LangGraph Studio

LangGraph Studio lets you visualize, step through, and debug the research graph without calling the Express API.

## Prerequisites

- Node.js 20+
- Backend dependencies installed (`cd backend && npm install`)
- `backend/.env` configured with your API keys
- LangSmith account (free tier works) — [https://smith.langchain.com](https://smith.langchain.com)

## Option A: Dev server (recommended)

From the `backend` directory:

```bash
npm run langgraph:dev
```

This runs:

```bash
npx @langchain/langgraph-cli dev
```

`langgraph dev` starts a lightweight local LangGraph server with hot reload. No Docker is required.

When the server starts, the CLI prints a Studio URL (typically pointing to [smith.langchain.com](https://smith.langchain.com)). Open that URL to connect Studio to your local graph.

## Option B: LangGraph Studio desktop app

1. Download LangGraph Studio from the LangChain docs: [LangGraph Studio](https://langchain-ai.github.io/langgraph/concepts/langgraph_studio/)
2. Open the `backend` folder as your project (it must contain `langgraph.json`)
3. Start the dev server in a terminal:

```bash
cd backend
npm run langgraph:dev
```

4. In Studio, select the `research` graph defined in `langgraph.json`

## Configuration

`backend/langgraph.json`:

```json
{
  "node_version": "20",
  "graphs": {
    "research": "./src/graph/researchGraph.ts:graph"
  },
  "env": ".env",
  "dependencies": ["."]
}
```

The exported `graph` symbol in `src/graph/researchGraph.ts` is the compiled LangGraph workflow Studio loads.

## Sample input in Studio

Use this state when invoking the graph:

```json
{
  "query": "Compare vector databases for a production RAG system",
  "messages": [{ "role": "user", "content": "Compare vector databases for a production RAG system" }],
  "supervisorMessages": [],
  "rawNotes": [],
  "notes": [],
  "researchBrief": null,
  "finalReport": "",
  "sufficient": false,
  "assessmentReason": "",
  "needClarification": false,
  "question": "",
  "verification": "",
  "humanResponse": "",
  "enrichedQuery": "",
  "status": "needs_clarification"
}
```

Try a vague query to route to clarification and pause for human input:

```json
{
  "query": "Tell me about AI",
  "messages": [{ "role": "user", "content": "Tell me about AI" }],
  "supervisorMessages": [],
  "rawNotes": [],
  "notes": [],
  "researchBrief": null,
  "finalReport": "",
  "sufficient": false,
  "assessmentReason": "",
  "needClarification": false,
  "question": "",
  "verification": "",
  "humanResponse": "",
  "enrichedQuery": "",
  "status": "needs_clarification"
}
```

When the graph interrupts at `humanClarification`, Studio will prompt you to provide a response. After resuming, the graph continues through `incorporateClarification` → `requestClarification` → `generateBrief`.

Try a detailed query to route to brief generation:

```json
{
  "query": "For a B2B SaaS startup in healthcare (US market), compare Pinecone vs Weaviate vs pgvector for a HIPAA-aware RAG pipeline handling 2M documents, focusing on latency, cost at 50k monthly queries, and operational complexity. Output should guide an architecture decision by Q3 2026.",
  "messages": [{ "role": "user", "content": "For a B2B SaaS startup in healthcare (US market), compare Pinecone vs Weaviate vs pgvector..." }],
  "supervisorMessages": [],
  "rawNotes": [],
  "notes": [],
  "researchBrief": null,
  "finalReport": "",
  "sufficient": false,
  "assessmentReason": "",
  "needClarification": false,
  "question": "",
  "verification": "",
  "humanResponse": "",
  "enrichedQuery": "",
  "status": "needs_clarification"
}
```

## Docker-based server (optional)

If you prefer the full LangGraph API server in Docker:

```bash
cd backend
npm run langgraph:up
```

This requires Docker Desktop running and a valid `LANGSMITH_API_KEY` in `.env`.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Studio cannot connect | Ensure `npm run langgraph:dev` is running from `backend` |
| Missing API key errors | Verify `backend/.env` has `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` |
| Graph not listed | Confirm `langgraph.json` points to `./src/graph/researchGraph.ts:graph` |
| Safari/Brave blocks local URL | Run `npx @langchain/langgraph-cli dev --tunnel` for an HTTPS tunnel |
