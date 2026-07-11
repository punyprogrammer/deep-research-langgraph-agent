import { END, START, StateGraph } from "@langchain/langgraph";
import { isAIMessage } from "@langchain/core/messages";

import { compressResearch } from "./nodes/compressResearch.js";
import { llmCall } from "./nodes/llmCall.js";
import { toolNode } from "./nodes/toolNode.js";
import {
  ResearcherStateAnnotation,
  type ResearcherState,
} from "./state.js";

/**
 * Hard stop for the research tool loop.
 * Prompt budget is ~5 searches + think_tool after each ≈ 10 LLM turns.
 */
export const MAX_RESEARCH_TOOL_ITERATIONS = 10;

/**
 * After llmCall: always execute pending tool_calls first.
 * Never jump to compress while tool_call_ids are unanswered — that causes
 * OpenAI 400 INVALID_TOOL_RESULTS.
 */
function shouldContinue(
  state: ResearcherState,
): "toolNode" | "compressResearch" {
  const lastMessage = state.researcherMessages.at(-1);

  if (
    lastMessage &&
    isAIMessage(lastMessage) &&
    lastMessage.tool_calls?.length
  ) {
    return "toolNode";
  }

  return "compressResearch";
}

/**
 * After tools run: stop the loop at the iteration cap, otherwise call the LLM again.
 */
function afterTools(
  state: ResearcherState,
): "llmCall" | "compressResearch" {
  if (state.toolCallIterations >= MAX_RESEARCH_TOOL_ITERATIONS) {
    return "compressResearch";
  }
  return "llmCall";
}

/**
 * Research agent subgraph: llm ↔ tools loop, then compress findings.
 * Mirrors researcher_agent from research_agent.py
 */
const researcherWorkflow = new StateGraph(ResearcherStateAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addNode("compressResearch", compressResearch)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, [
    "toolNode",
    "compressResearch",
  ])
  .addConditionalEdges("toolNode", afterTools, [
    "llmCall",
    "compressResearch",
  ])
  .addEdge("compressResearch", END);

export const researcherAgent = researcherWorkflow.compile();
