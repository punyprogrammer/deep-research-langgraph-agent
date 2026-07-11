# End-to-End Data Flow — Deep Research Agent

This document explains **how data moves** from the browser to the backend agent and back again — including payloads, schemas, agent state changes, and streaming.

It uses one concrete example so even a beginner can follow along.

---

## The story we will simulate

1. User types: **"Agentic Coding Trends"**
2. Agent decides the question is too vague → asks for clarification
3. User answers the clarification questions
4. Agent writes a **research brief**
5. Agent runs **deep research** (web search + thinking tools)
6. Agent returns **findings** to the frontend

Throughout this, the frontend does **not** wait for one big JSON blob. It opens a **stream** (Server-Sent Events / SSE) and receives many small events as the agent works.

---

## Big picture (one glance)

```text
┌─────────────┐     POST /research (stream:true)      ┌──────────────┐
│  Frontend   │ ───────────────────────────────────► │   Express    │
│  (React)    │                                      │   API        │
│             │ ◄───── SSE events (phase, tool…) ─── │              │
└─────────────┘                                      └──────┬───────┘
                                                            │
                                                            ▼
                                                     ┌──────────────┐
                                                     │  LangGraph   │
                                                     │  research    │
                                                     │  graph       │
                                                     └──────────────┘
```

**Two HTTP requests** happen in our story:

| Request | When | Body |
|---------|------|------|
| **#1 Start** | User submits the query | `{ query, stream: true }` |
| **#2 Resume** | User answers clarification | `{ threadId, clarificationResponse, stream: true }` |

The `threadId` is a conversation ID. The backend stores graph progress in memory (checkpointer) under that ID so resume can continue from the pause.

---

## Glossary (simple words)

| Term | Meaning |
|------|---------|
| **Payload** | The JSON object sent in an HTTP request or response |
| **Schema** | The shape/rules of that JSON (TypeScript types on frontend, Zod on backend) |
| **Graph state** | The agent’s notebook — fields like `query`, `researchBrief`, `notes` |
| **Node** | One step in the agent (e.g. `assessQuery`, `generateBrief`) |
| **Interrupt** | Agent pauses and waits for a human (clarification) |
| **SSE / stream** | Server keeps the connection open and pushes many small events |
| **threadId** | Unique ID for this research run (needed to resume after pause) |

---

## Frontend schemas (what the UI expects)

Defined in `frontend/src/lib/api.ts`.

### Request bodies

**Start research**

```ts
{ query: string; stream: true }
```

**Resume after clarification**

```ts
{
  threadId: string;
  clarificationResponse: string; // user's free-text answers
  stream: true;
}
```

### Final response shapes (inside stream events)

**Needs clarification**

```ts
{
  status: "needs_clarification";
  threadId: string;
  query: string;
  assessmentReason?: string;
  need_clarification: boolean;
  question: string;          // markdown questions for the user
  verification?: string;
  interrupt?: unknown;
}
```

**Complete (research finished)**

```ts
{
  status: "complete";
  threadId: string;
  query: string;
  enrichedQuery?: string;    // original query + user clarification
  assessmentReason?: string;
  need_clarification: boolean;
  question?: string;
  verification?: string;
  research_brief: string;
  notes?: string[];
  raw_notes?: string[];
  compressed_research?: string;  // main findings text
}
```

### Stream event types (live progress)

While the agent works, the frontend receives events like:

| `type` | Meaning | Example fields |
|--------|---------|----------------|
| `status` | Log line | `message` |
| `phase` | Graph node started/finished | `phase`, `label` |
| `brief` | Research brief just produced | `research_brief` |
| `thinking` | Model reasoning text | `content` |
| `tool_call` | Agent called a tool | `tool`, `query` or `reflection` |
| `tool_result` | Tool returned something | `tool`, `preview` |
| `needs_clarification` | Pause — ask user | `payload` (final clarify object) |
| `complete` | Done — full result | `payload` (complete object) |
| `error` | Something failed | `message` |
| `done` | Stream closed | — |

SSE wire format (each event):

```text
data: {"type":"phase","phase":"assessQuery","label":"Understanding your question"}

```

Frontend parsing (`readSseStream`):

1. Read chunks from `response.body`
2. Split on blank lines (`\n\n`)
3. Find lines starting with `data:`
4. `JSON.parse` → call `onEvent(event)`
5. When `type === "complete"` or `"needs_clarification"`, keep that `payload` as the final result
6. When stream ends, return that final payload to the app

How the app uses events:

- `phase` → update progress step (assess / brief / search / report)
- `brief` → show research brief early (before findings finish)
- `tool_call` with `tavily_search` → add to “Queries & tool calls” list
- `tool_call` with `think_tool` → show reflection / thinking
- `complete` → set `findings` from `compressed_research` (or joined `notes`)

---

## Backend agent state (the notebook)

Defined in `backend/src/graph/state.ts`.

Think of state as a shared notebook every node can read/write.

### Scoping fields

| Field | Purpose |
|-------|---------|
| `query` | Current research question text |
| `messages` | Chat history (user + assistant messages) |
| `sufficient` | Is the query specific enough? |
| `assessmentReason` | Why yes/no |
| `needClarification` | Should we ask the user? |
| `question` | Clarifying questions (markdown) |
| `verification` | “Got it, starting research…” message |
| `humanResponse` | User’s clarification answers |
| `enrichedQuery` | Original query + clarification merged |
| `researchBrief` | Scoped research question for the researcher |
| `status` | `"needs_clarification"` or `"complete"` |

### Research fields

| Field | Purpose |
|-------|---------|
| `researchTopic` | Topic passed into the researcher (usually the brief) |
| `researcherMessages` | Researcher chat + tool messages |
| `toolCallIterations` | How many LLM↔tool loops so far |
| `compressedResearch` | Final compressed findings markdown |
| `rawNotes` | Raw tool/AI notes before compression |
| `notes` | Final notes list (usually `[compressedResearch]`) |
| `finalReport` | Reserved for a future report writer |

### Backend Zod schemas (LLM structured outputs)

**ClarifyWithUser** (`clarifyWithUserSchema`):

```ts
{
  need_clarification: boolean;
  question: string;
  verification: string;
}
```

**ResearchQuestion** (`researchQuestionSchema`):

```ts
{
  research_brief: string;
}
```

---

## Agent graph map

```text
START
  │
  ▼
assessQuery
  │
  ├─ sufficient=true ──────────────────────────────► generateBrief
  │
  └─ sufficient=false ─► requestClarification
                              │
                              ├─ needClarification=true ─► humanClarification
                              │                                │
                              │                                ▼
                              │                         (INTERRUPT — wait for user)
                              │                                │
                              │                     (resume with clarificationResponse)
                              │                                ▼
                              │                      incorporateClarification
                              │                                │
                              │                                ▼
                              │                      requestClarification  (loop)
                              │
                              └─ needClarification=false ─► generateBrief
                                                              │
                                                              ▼
                                                       prepareResearch
                                                              │
                                                              ▼
                                                         researcher
                                                    (llmCall ↔ toolNode loop
                                                     → compressResearch)
                                                              │
                                                              ▼
                                                      finalizeResearch
                                                              │
                                                              ▼
                                                             END
```

---

# Simulated run: “Agentic Coding Trends”

Below is a **walkthrough with example payloads**. Values are realistic examples (wording may vary run-to-run because LLMs are non-deterministic).

Assume:

- Frontend API base: `/api` → proxied to `http://localhost:3001`
- Streaming enabled: `stream: true` + `Accept: text/event-stream`

---

## Phase A — User asks the first question

### A1. Frontend sends Request #1

```http
POST /api/research
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "query": "Agentic Coding Trends",
  "stream": true
}
```

### A2. Backend creates initial graph state

Express generates a `threadId`, e.g. `11111111-aaaa-bbbb-cccc-222222222222`.

Initial notebook:

```json
{
  "query": "Agentic Coding Trends",
  "messages": [{ "type": "human", "content": "Agentic Coding Trends" }],
  "sufficient": false,
  "assessmentReason": "",
  "needClarification": false,
  "question": "",
  "verification": "",
  "humanResponse": "",
  "enrichedQuery": "",
  "researchBrief": null,
  "status": "needs_clarification",
  "researcherMessages": [],
  "toolCallIterations": 0,
  "researchTopic": "",
  "compressedResearch": "",
  "notes": [],
  "rawNotes": [],
  "finalReport": ""
}
```

### A3. Stream begins

Frontend starts reading SSE. Early events:

```json
{ "type": "status", "message": "Thread 11111111-aaaa-bbbb-cccc-222222222222" }
```

```json
{ "type": "status", "message": "Starting research graph" }
```

---

## Phase B — Assess the query

### B1. Node: `assessQuery`

LLM decides: query is too vague (no audience, timeframe, what “trends” means).

**State changes after this node:**

```json
{
  "sufficient": false,
  "assessmentReason": "The query lacks audience, timeframe, geography, and what aspects of agentic coding to cover."
}
```

**Stream events:**

```json
{
  "type": "phase",
  "phase": "assessQuery",
  "label": "Understanding your question"
}
```

```json
{
  "type": "status",
  "message": "The query lacks audience, timeframe, geography, and what aspects of agentic coding to cover."
}
```

**Routing:** `sufficient === false` → go to `requestClarification`.

**Frontend parse:** maps `assessQuery` → progress step “Understand question” = active/done.

---

## Phase C — Ask for clarification

### C1. Node: `requestClarification`

LLM returns structured ClarifyWithUser:

```json
{
  "need_clarification": true,
  "question": "To scope this properly:\n1. Timeframe (e.g. 2024–2026)?\n2. Audience (engineers, CTOs, beginners)?\n3. Focus (tools, org adoption, productivity, risks)?",
  "verification": ""
}
```

**State changes:**

```json
{
  "needClarification": true,
  "question": "To scope this properly:\n1. Timeframe...",
  "verification": "",
  "status": "needs_clarification",
  "messages": [/* previous */, { "type": "ai", "content": "<question markdown>" }]
}
```

**Routing:** `needClarification === true` → `humanClarification`.

### C2. Node: `humanClarification` → INTERRUPT

Graph calls `interrupt(...)` and **pauses**. No more nodes run until resume.

**Stream final event for Request #1:**

```json
{
  "type": "needs_clarification",
  "payload": {
    "status": "needs_clarification",
    "threadId": "11111111-aaaa-bbbb-cccc-222222222222",
    "query": "Agentic Coding Trends",
    "assessmentReason": "The query lacks audience, timeframe...",
    "need_clarification": true,
    "question": "To scope this properly:\n1. Timeframe (e.g. 2024–2026)?\n2. Audience (engineers, CTOs, beginners)?\n3. Focus (tools, org adoption, productivity, risks)?",
    "verification": "",
    "interrupt": {
      "value": {
        "action": "await_clarification",
        "need_clarification": true,
        "query": "Agentic Coding Trends",
        "assessmentReason": "...",
        "question": "..."
      }
    }
  }
}
```

Then:

```json
{ "type": "done" }
```

### C3. How frontend parses Request #1 ending

1. Sees `type: "needs_clarification"`
2. Saves `payload` as the final response
3. Sets session:
   - `loading = false`
   - `awaitingClarification = true`
   - `threadId = payload.threadId`  ← **must keep this**
   - `question = payload.question`
   - `assessmentReason = payload.assessmentReason`
4. Shows clarification form; waits for user

**Important:** Deep research has **not** started yet. Graph is frozen mid-run on the server under `threadId`.

---

## Phase D — User answers clarification

User types something like:

> Focus on 2025–2026, for software engineering leaders. Cover tools being adopted, org case studies, and productivity impact.

### D1. Frontend sends Request #2 (resume)

```json
{
  "threadId": "11111111-aaaa-bbbb-cccc-222222222222",
  "clarificationResponse": "Focus on 2025–2026, for software engineering leaders. Cover tools being adopted, org case studies, and productivity impact.",
  "stream": true
}
```

Backend resumes with:

```ts
new Command({ resume: clarificationResponse })
```

Stream opens again.

### D2. `humanClarification` finishes

**State change:**

```json
{
  "humanResponse": "Focus on 2025–2026, for software engineering leaders..."
}
```

### D3. `incorporateClarification`

Merges answer into the query:

```json
{
  "enrichedQuery": "Agentic Coding Trends\n\nUser clarification:\nFocus on 2025–2026...",
  "query": "Agentic Coding Trends\n\nUser clarification:\nFocus on 2025–2026...",
  "messages": [/* ... */, { "type": "human", "content": "<clarificationResponse>" }]
}
```

### D4. `requestClarification` again (loop)

Now the LLM may decide enough info exists:

```json
{
  "need_clarification": false,
  "question": "",
  "verification": "Thanks — I’ll research agentic coding trends for engineering leaders (2025–2026), covering tools, adoption case studies, and productivity impact."
}
```

**State changes:**

```json
{
  "needClarification": false,
  "verification": "Thanks — I’ll research...",
  "status": "complete"
}
```

Note: `status: "complete"` here is set by the clarification node’s schema path, but the **graph is not finished** — research still runs. The true “finished for the client” moment is after `finalizeResearch`.

**Routing:** `needClarification === false` → `generateBrief`.

**Stream events (examples):**

```json
{ "type": "phase", "phase": "incorporateClarification", "label": "Incorporating your answers" }
```

```json
{ "type": "phase", "phase": "requestClarification", "label": "Checking if clarification is needed" }
```

```json
{ "type": "phase", "phase": "generateBrief", "label": "Drafting research brief" }
```

---

## Phase E — Research brief

### E1. Node: `generateBrief`

LLM returns:

```json
{
  "research_brief": "What are the major agentic coding trends in 2025–2026 for software engineering leaders, including tools being adopted, organizational case studies, and measured productivity impact?"
}
```

**State change:**

```json
{
  "researchBrief": "What are the major agentic coding trends..."
}
```

**Stream event (frontend can show brief immediately):**

```json
{
  "type": "brief",
  "research_brief": "What are the major agentic coding trends..."
}
```

**Frontend parse:**

- Store `researchBrief`
- Mark timeline step “Research brief” done
- Keep `loading = true` (research continues)

Next edge: `prepareResearch`.

---

## Phase F — Prepare + deep research

### F1. `prepareResearch`

**State changes:**

```json
{
  "researchTopic": "<same as researchBrief>",
  "researcherMessages": [
    { "type": "human", "content": "<researchBrief>" }
  ],
  "toolCallIterations": 0,
  "compressedResearch": ""
}
```

### F2. Researcher subgraph loop

Inside `researcher`:

```text
llmCall → (if tool_calls) toolNode → llmCall → ... → compressResearch
```

#### Example loop 1 — search

`llmCall` decides to search:

**Stream:**

```json
{
  "type": "tool_call",
  "tool": "tavily_search",
  "query": "agentic coding trends 2025 2026 tools adoption"
}
```

`toolNode` runs Tavily → returns summarized pages.

**Stream:**

```json
{
  "type": "tool_result",
  "tool": "tavily_search",
  "preview": "Source 1: ... Source 2: ..."
}
```

**State (append):**

- `researcherMessages` gains AIMessage (with tool_calls) + ToolMessage(s)
- `toolCallIterations` increments

#### Example loop 2 — think

```json
{
  "type": "tool_call",
  "tool": "think_tool",
  "reflection": "I have tool landscape coverage but still need org case studies and productivity metrics. Next search those specifically."
}
```

#### Example loop 3 — more searches

```json
{
  "type": "tool_call",
  "tool": "tavily_search",
  "query": "agentic coding case studies enterprises 2026"
}
```

```json
{
  "type": "tool_call",
  "tool": "tavily_search",
  "query": "AI coding agents productivity impact statistics 2025 2026"
}
```

**Frontend parse during this phase:**

- Each `tavily_search` → list under “Queries & tool calls”
- Each `think_tool` → “Reflection” in agent activity
- Timeline “Deep research” = active

Loop ends when the model stops calling tools (or hits max iterations) → `compressResearch`.

### F3. `compressResearch`

Produces a long markdown findings document (sections + citations + source list).

**State changes:**

```json
{
  "compressedResearch": "## Fully Comprehensive Findings\n\n### Recent Developments...\n\n[1] Title: https://...\n...",
  "rawNotes": ["<concatenated tool/ai message contents>"]
}
```

---

## Phase G — Finalize and return complete

### G1. `finalizeResearch`

**State changes:**

```json
{
  "notes": ["<same as compressedResearch>"],
  "status": "complete"
}
```

Graph hits `END`.

### G2. Stream final event

```json
{
  "type": "complete",
  "payload": {
    "status": "complete",
    "threadId": "11111111-aaaa-bbbb-cccc-222222222222",
    "query": "Agentic Coding Trends\n\nUser clarification:\nFocus on 2025–2026...",
    "enrichedQuery": "Agentic Coding Trends\n\nUser clarification:\nFocus on 2025–2026...",
    "assessmentReason": "The query lacks audience, timeframe...",
    "need_clarification": false,
    "verification": "Thanks — I’ll research...",
    "research_brief": "What are the major agentic coding trends...",
    "notes": ["## Fully Comprehensive Findings\n..."],
    "raw_notes": ["..."],
    "compressed_research": "## Fully Comprehensive Findings\n..."
  }
}
```

```json
{ "type": "done" }
```

### G3. How frontend parses completion

From `extractFindings(payload)`:

```ts
findings = compressed_research  // preferred
         || notes joined
```

Session ends as:

| Field | Value |
|-------|--------|
| `loading` | `false` |
| `researchBrief` | from payload / earlier `brief` event |
| `findings` | markdown report |
| `notes` | array from payload |
| Timeline | brief / search / findings all **done** |

Frontend renders findings as markdown with clickable links.

---

## End-to-end sequence (cheat sheet)

```text
1) FE → BE   POST { query: "Agentic Coding Trends", stream: true }
2) BE state  initialize notebook + threadId
3) BE node   assessQuery        → sufficient=false
4) BE node   requestClarification → needClarification=true + question
5) BE node   humanClarification → INTERRUPT
6) BE → FE   SSE needs_clarification { threadId, question, ... }
7) FE        show form; store threadId

8) FE → BE   POST { threadId, clarificationResponse, stream: true }
9) BE        resume Command
10) BE node  humanClarification exit → humanResponse
11) BE node  incorporateClarification → enrichedQuery/query/messages
12) BE node  requestClarification → needClarification=false + verification
13) BE node  generateBrief → researchBrief
14) BE → FE  SSE brief { research_brief }
15) BE node  prepareResearch → researchTopic + researcherMessages
16) BE sub   researcher loops:
               llmCall → tool_call (search/think) → tool_result → ...
               compressResearch → compressedResearch
17) BE node  finalizeResearch → notes + status=complete
18) BE → FE  SSE complete { research_brief, compressed_research, notes, ... }
19) FE       findings = compressed_research; stop loading; render report
```

---

## Mental model: two “conversations”

1. **HTTP conversation** (frontend ↔ Express)
   - Request payloads in
   - SSE events out
   - Final `needs_clarification` or `complete` payload

2. **Agent conversation** (inside LangGraph state)
   - `messages` = user scoping chat
   - `researcherMessages` = researcher tool loop
   - Checkpointer keeps state keyed by `threadId` across the HITL pause

If you forget `threadId` on resume, the backend cannot continue the paused graph — it would look like a brand-new run.

---

## Related code

| Layer | File |
|-------|------|
| Frontend request/response + stream parse | `frontend/src/lib/api.ts` |
| Frontend session merge after stream | `frontend/src/App.tsx` |
| Express + SSE | `backend/src/index.ts` |
| Stream event mapping | `backend/src/utils/researchStream.ts` |
| Graph wiring | `backend/src/graph/researchGraph.ts` |
| Shared agent state | `backend/src/graph/state.ts` |
| Clarify / brief Zod schemas | `backend/src/schemas/researchScope.ts` |
| Researcher loop | `backend/src/graph/researcher/graph.ts` |

---

## What this simulation intentionally simplifies

- Exact LLM wording differs every run
- Number of search/think loops varies
- `status: "complete"` can appear on state before research finishes (set during clarification path); the **client-facing complete** is the SSE `complete` event after `finalizeResearch`
- Non-stream JSON mode (`stream: false`) still works, but you lose live tool/thinking visibility

If you can follow this one story — vague query → clarify → resume → brief → tools → findings — you understand the whole product data flow.
