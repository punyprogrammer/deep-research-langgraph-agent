import "dotenv/config";
import { randomUUID } from "node:crypto";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import cors from "cors";
import express, { Request, Response } from "express";

import { port } from "./config/llm.js";
import { checkpointer } from "./graph/checkpointer.js";
import { createResearchGraph } from "./graph/researchGraph.js";
import type { ResearchState } from "./graph/state.js";
import { log } from "./utils/logger.js";
import {
  buildClarificationPayload,
  buildCompletePayload,
  streamResearchGraph,
  type ResearchStreamEvent,
} from "./utils/researchStream.js";

const graph = createResearchGraph(checkpointer);

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

function wantsStream(req: Request): boolean {
  if (req.body?.stream === true) return true;
  const accept = req.headers.accept ?? "";
  return accept.includes("text/event-stream");
}

function writeSse(res: Response, event: ResearchStreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function initialGraphState(query: string) {
  return {
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
    status: "needs_clarification" as const,
    researcherMessages: [],
    toolCallIterations: 0,
    researchTopic: "",
    compressedResearch: "",
  };
}

function sendGraphResult(res: Response, result: GraphResult, threadId: string) {
  if (result.__interrupt__?.length) {
    log.info("Responding: needs_clarification (interrupt)", { threadId });
    res.json(buildClarificationPayload(result, threadId));
    return;
  }

  if (result.status === "complete") {
    log.info("Responding: complete (scoping + research finished)", {
      threadId,
      notesCount: result.notes?.length ?? 0,
      compressedLength: result.compressedResearch?.length ?? 0,
    });
    res.json(buildCompletePayload(result, threadId));
    return;
  }

  log.warn("Responding: unexpected non-complete status", {
    threadId,
    status: result.status,
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

async function runStreamingResearch(options: {
  res: Response;
  threadId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  config: Record<string, unknown>;
}) {
  const { res, threadId, input, config } = options;

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  writeSse(res, {
    type: "status",
    message: `Thread ${threadId}`,
  });

  try {
    await streamResearchGraph({
      graph,
      input,
      config,
      threadId,
      emit: (event) => writeSse(res, event),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Research stream failed", { threadId, message });
    writeSse(res, { type: "error", message });
  } finally {
    res.write("data: {\"type\":\"done\"}\n\n");
    res.end();
  }
}

app.post("/research", async (req: Request, res: Response) => {
  const threadId =
    typeof req.body?.threadId === "string" && req.body.threadId.trim()
      ? req.body.threadId.trim()
      : randomUUID();
  const config = {
    configurable: { thread_id: threadId },
    recursionLimit: 100,
  };
  const stream = wantsStream(req);

  const clarificationResponse = req.body?.clarificationResponse;
  if (clarificationResponse !== undefined) {
    if (
      typeof clarificationResponse !== "string" ||
      !clarificationResponse.trim()
    ) {
      log.warn("Bad resume request: empty clarificationResponse", { threadId });
      res.status(400).json({
        error: "clarificationResponse must be a non-empty string when resuming",
      });
      return;
    }

    log.info("POST /research resume", {
      threadId,
      stream,
      clarificationPreview: clarificationResponse.trim().slice(0, 160),
    });

    const input = new Command({ resume: clarificationResponse.trim() });

    if (stream) {
      await runStreamingResearch({ res, threadId, input, config });
      return;
    }

    try {
      const started = Date.now();
      const result = (await graph.invoke(input as never, config)) as GraphResult;
      log.info("Graph resume finished", {
        threadId,
        durationMs: Date.now() - started,
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
    stream,
    queryPreview: query.slice(0, 160),
  });

  const input = initialGraphState(query);

  if (stream) {
    await runStreamingResearch({ res, threadId, input, config });
    return;
  }

  try {
    const started = Date.now();
    const result = (await graph.invoke(input, config)) as GraphResult;
    log.info("Graph invoke finished", {
      threadId,
      durationMs: Date.now() - started,
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
