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
 * Route after llm_call: continue tool loop or compress findings.
 * Mirrors should_continue from research_agent.py, plus an iteration cap.
 */
function shouldContinue(
  state: ResearcherState,
): "toolNode" | "compressResearch" {
  if (state.toolCallIterations >= MAX_RESEARCH_TOOL_ITERATIONS) {
    return "compressResearch";
  }

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
  .addEdge("toolNode", "llmCall")
  .addEdge("compressResearch", END);

export const researcherAgent = researcherWorkflow.compile();
