import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import express, { Request, Response } from "express";

import { port } from "./config/llm.js";
import { graph } from "./graph/researchGraph.js";
import type { ResearchState } from "./graph/state.js";

type GraphResult = ResearchState & {
  __interrupt__?: Array<{ id?: string; value?: unknown }>;
};

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

function sendGraphResult(res: Response, result: GraphResult, threadId: string) {
  if (result.__interrupt__?.length) {
    res.json({
      status: "needs_clarification",
      threadId,
      query: result.query,
      assessmentReason: result.assessmentReason,
      need_clarification: result.needClarification,
      question: result.question,
      verification: result.verification,
      interrupt: result.__interrupt__[0],
    });
    return;
  }

  if (result.status === "complete") {
    res.json({
      status: result.status,
      threadId,
      query: result.query,
      enrichedQuery: result.enrichedQuery || undefined,
      assessmentReason: result.assessmentReason,
      need_clarification: result.needClarification,
      question: result.question || undefined,
      verification: result.verification || undefined,
      research_brief: result.researchBrief,
    });
    return;
  }

  res.json({
    status: result.status,
    threadId,
    query: result.query,
    assessmentReason: result.assessmentReason,
    need_clarification: result.needClarification,
    question: result.question,
    verification: result.verification,
  });
}

app.post("/research", async (req: Request, res: Response) => {
  const threadId =
    typeof req.body?.threadId === "string" && req.body.threadId.trim()
      ? req.body.threadId.trim()
      : randomUUID();
  const config = { configurable: { thread_id: threadId } };

  const clarificationResponse = req.body?.clarificationResponse;
  if (clarificationResponse !== undefined) {
    if (typeof clarificationResponse !== "string" || !clarificationResponse.trim()) {
      res.status(400).json({
        error: "clarificationResponse must be a non-empty string when resuming",
      });
      return;
    }

    try {
      const result = (await graph.invoke(
        new Command({ resume: clarificationResponse.trim() }),
        config,
      )) as GraphResult;

      sendGraphResult(res, result, threadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Research graph resume failed:", message);
      res.status(500).json({ error: message });
    }
    return;
  }

  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";

  if (!query) {
    res.status(400).json({
      error: "Missing required field: query",
    });
    return;
  }

  try {
    const result = (await graph.invoke(
      {
        query,
        messages: [new HumanMessage(query)],
        supervisorMessages: [],
        rawNotes: [],
        notes: [],
        researchBrief: undefined,
        finalReport: "",
        sufficient: false,
        assessmentReason: "",
        needClarification: false,
        question: "",
        verification: "",
        humanResponse: "",
        enrichedQuery: "",
        status: "needs_clarification",
      },
      config,
    )) as GraphResult;

    sendGraphResult(res, result, threadId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Research graph failed:", message);
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Deep research API listening on http://localhost:${port}`);
});
