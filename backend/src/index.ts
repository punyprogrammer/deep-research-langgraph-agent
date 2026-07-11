import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import cors from "cors";
import express, { Request, Response } from "express";

import { port } from "./config/llm.js";
import { graph } from "./graph/researchGraph.js";
import type { ResearchState } from "./graph/state.js";
import { log } from "./utils/logger.js";

type GraphResult = ResearchState & {
  __interrupt__?: Array<{ id?: string; value?: unknown }>;
};

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_ORIGIN,
    ].filter(Boolean) as string[],
  }),
);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

function summarizeResult(result: GraphResult) {
  return {
    status: result.status,
    interrupted: Boolean(result.__interrupt__?.length),
    hasBrief: Boolean(result.researchBrief),
    briefPreview: result.researchBrief?.slice(0, 120),
    notesCount: result.notes?.length ?? 0,
    rawNotesCount: result.rawNotes?.length ?? 0,
    hasFinalReport: Boolean(result.finalReport),
    needClarification: result.needClarification,
    sufficient: result.sufficient,
  };
}

function sendGraphResult(res: Response, result: GraphResult, threadId: string) {
  if (result.__interrupt__?.length) {
    log.info("Responding: needs_clarification (interrupt)", {
      threadId,
      ...summarizeResult(result),
    });
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
    log.info("Responding: complete (scoping finished)", {
      threadId,
      ...summarizeResult(result),
      responseKeys: [
        "status",
        "threadId",
        "query",
        "enrichedQuery",
        "assessmentReason",
        "need_clarification",
        "question",
        "verification",
        "research_brief",
      ],
      note: "notes/rawNotes/finalReport are not returned — deep research is not wired on this branch",
    });
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

  log.warn("Responding: unexpected non-complete status", {
    threadId,
    ...summarizeResult(result),
  });
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
      log.warn("Bad resume request: empty clarificationResponse", { threadId });
      res.status(400).json({
        error: "clarificationResponse must be a non-empty string when resuming",
      });
      return;
    }

    log.info("POST /research resume", {
      threadId,
      clarificationPreview: clarificationResponse.trim().slice(0, 160),
    });

    try {
      const started = Date.now();
      const result = (await graph.invoke(
        new Command({ resume: clarificationResponse.trim() }),
        config,
      )) as GraphResult;

      log.info("Graph resume finished", {
        threadId,
        durationMs: Date.now() - started,
        ...summarizeResult(result),
      });
      sendGraphResult(res, result, threadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log.error("Research graph resume failed", { threadId, message });
      res.status(500).json({ error: message });
    }
    return;
  }

  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";

  if (!query) {
    log.warn("Bad start request: missing query");
    res.status(400).json({
      error: "Missing required field: query",
    });
    return;
  }

  log.info("POST /research start", {
    threadId,
    queryPreview: query.slice(0, 160),
  });

  try {
    const started = Date.now();
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

    log.info("Graph invoke finished", {
      threadId,
      durationMs: Date.now() - started,
      ...summarizeResult(result),
    });
    sendGraphResult(res, result, threadId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Research graph failed", { threadId, message });
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  log.info(`Deep research API listening on http://localhost:${port}`);
});
