import { isAIMessage, isToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

import type { ResearchState } from "../graph/state.js";
import { log } from "./logger.js";

export type ResearchStreamEvent =
  | {
      type: "phase";
      phase: string;
      label: string;
    }
  | {
      type: "thinking";
      content: string;
    }
  | {
      type: "tool_call";
      tool: string;
      query?: string;
      reflection?: string;
      args?: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool: string;
      preview: string;
    }
  | {
      type: "brief";
      research_brief: string;
    }
  | {
      type: "status";
      message: string;
    }
  | {
      type: "needs_clarification";
      payload: Record<string, unknown>;
    }
  | {
      type: "complete";
      payload: Record<string, unknown>;
    }
  | {
      type: "error";
      message: string;
    };

const NODE_LABELS: Record<string, string> = {
  assessQuery: "Understanding your question",
  requestClarification: "Checking if clarification is needed",
  humanClarification: "Waiting for your answers",
  incorporateClarification: "Incorporating your answers",
  generateBrief: "Drafting research brief",
  prepareResearch: "Preparing deep research",
  researcher: "Deep research agent",
  llmCall: "Researcher reasoning",
  toolNode: "Running tools",
  compressResearch: "Compressing findings",
  finalizeResearch: "Finalizing research",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content == null) return "";
  return String(content);
}

function emitFromMessages(
  messages: BaseMessage[],
  emit: (event: ResearchStreamEvent) => void,
) {
  for (const message of messages) {
    if (isAIMessage(message)) {
      const text = messageContentToString(message.content).trim();
      if (text) {
        emit({ type: "thinking", content: text });
      }
      for (const toolCall of message.tool_calls ?? []) {
        const args = (toolCall.args ?? {}) as Record<string, unknown>;
        if (toolCall.name === "tavily_search") {
          emit({
            type: "tool_call",
            tool: "tavily_search",
            query: typeof args.query === "string" ? args.query : undefined,
            args,
          });
        } else if (toolCall.name === "think_tool") {
          emit({
            type: "tool_call",
            tool: "think_tool",
            reflection:
              typeof args.reflection === "string" ? args.reflection : undefined,
            args,
          });
        } else {
          emit({
            type: "tool_call",
            tool: toolCall.name,
            args,
          });
        }
      }
    }

    if (isToolMessage(message)) {
      const preview = messageContentToString(message.content).slice(0, 280);
      emit({
        type: "tool_result",
        tool: message.name ?? "tool",
        preview,
      });
    }
  }
}

function emitFromNodeUpdate(
  nodeName: string,
  update: unknown,
  emit: (event: ResearchStreamEvent) => void,
) {
  const label = NODE_LABELS[nodeName] ?? nodeName;
  emit({ type: "phase", phase: nodeName, label });

  const data = asRecord(update);
  if (!data) return;

  if (typeof data.researchBrief === "string" && data.researchBrief.trim()) {
    emit({ type: "brief", research_brief: data.researchBrief });
  }

  if (typeof data.assessmentReason === "string" && data.assessmentReason.trim()) {
    emit({
      type: "status",
      message: data.assessmentReason.slice(0, 240),
    });
  }

  const researcherMessages = data.researcherMessages;
  if (Array.isArray(researcherMessages)) {
    emitFromMessages(researcherMessages as BaseMessage[], emit);
  }

  const messages = data.messages;
  if (Array.isArray(messages) && nodeName === "requestClarification") {
    // clarification question is handled via interrupt / final payload
  }
}

/**
 * Normalize LangGraph stream chunks (with or without subgraphs) into [ns, updates].
 */
function normalizeChunk(
  chunk: unknown,
): { namespace: string[]; updates: Record<string, unknown> } | null {
  if (Array.isArray(chunk) && chunk.length === 2) {
    const [maybeNs, maybeUpdates] = chunk;
    if (Array.isArray(maybeNs) && maybeUpdates && typeof maybeUpdates === "object") {
      return {
        namespace: maybeNs as string[],
        updates: maybeUpdates as Record<string, unknown>,
      };
    }
  }

  if (chunk && typeof chunk === "object" && !Array.isArray(chunk)) {
    return { namespace: [], updates: chunk as Record<string, unknown> };
  }

  return null;
}

export function buildCompletePayload(
  result: ResearchState,
  threadId: string,
): Record<string, unknown> {
  return {
    status: result.status,
    threadId,
    query: result.query,
    enrichedQuery: result.enrichedQuery || undefined,
    assessmentReason: result.assessmentReason,
    need_clarification: result.needClarification,
    question: result.question || undefined,
    verification: result.verification || undefined,
    research_brief: result.researchBrief,
    notes: result.notes,
    raw_notes: result.rawNotes,
    compressed_research: result.compressedResearch || undefined,
  };
}

export function buildClarificationPayload(
  result: ResearchState & {
    __interrupt__?: Array<{ id?: string; value?: unknown }>;
  },
  threadId: string,
): Record<string, unknown> {
  return {
    status: "needs_clarification",
    threadId,
    query: result.query,
    assessmentReason: result.assessmentReason,
    need_clarification: result.needClarification,
    question: result.question,
    verification: result.verification,
    interrupt: result.__interrupt__?.[0],
  };
}

type StreamableGraph = {
  // LangGraph's stream/getState generics are verbose; keep this adapter loose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: (input: any, config: any) => Promise<AsyncIterable<unknown>> | AsyncIterable<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState: (config: any) => Promise<{
    values: ResearchState;
    next: string[];
    tasks?: Array<{ interrupts?: Array<{ id?: string; value?: unknown }> }>;
  }>;
};

/**
 * Stream a research graph run and emit UI-friendly progress events.
 */
export async function streamResearchGraph(options: {
  graph: StreamableGraph;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  threadId: string;
  emit: (event: ResearchStreamEvent) => void;
}): Promise<void> {
  const { graph, input, config, threadId, emit } = options;

  emit({ type: "status", message: "Starting research graph" });

  const stream = await graph.stream(input, {
    ...config,
    streamMode: "updates",
    subgraphs: true,
  });

  for await (const chunk of stream) {
    const normalized = normalizeChunk(chunk);
    if (!normalized) continue;

    for (const [nodeName, update] of Object.entries(normalized.updates)) {
      if (nodeName.startsWith("__")) continue;
      log.node(nodeName, "exit", {
        threadId,
        namespace: normalized.namespace,
      });
      emitFromNodeUpdate(nodeName, update, emit);
    }
  }

  const snapshot = await graph.getState(config);
  const values = snapshot.values as ResearchState & {
    __interrupt__?: Array<{ id?: string; value?: unknown }>;
  };

  const interrupts =
    snapshot.tasks?.flatMap((task) => task.interrupts ?? []) ??
    values.__interrupt__ ??
    [];

  if (interrupts.length > 0) {
    values.__interrupt__ = interrupts;
    emit({
      type: "needs_clarification",
      payload: buildClarificationPayload(values, threadId),
    });
    return;
  }

  if (values.status === "complete" || snapshot.next.length === 0) {
    emit({
      type: "complete",
      payload: buildCompletePayload(values, threadId),
    });
    return;
  }

  emit({
    type: "error",
    message: `Graph stopped unexpectedly (next: ${snapshot.next.join(", ") || "none"})`,
  });
}
