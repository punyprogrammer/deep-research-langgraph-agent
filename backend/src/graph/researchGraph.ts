import type { BaseMessage } from "@langchain/core/messages";
import {
  END,
  START,
  StateGraph,
  type BaseCheckpointSaver,
} from "@langchain/langgraph";

<<<<<<< HEAD
import { log } from "../utils/logger.js";
import { checkpointer } from "./checkpointer.js";
=======
>>>>>>> bd343f7be41c70cc0042c9162c2f174294c1ab1a
import { assessQuery } from "./nodes/assessQuery.js";
import { finalizeResearch } from "./nodes/finalizeResearch.js";
import { generateBrief } from "./nodes/generateBrief.js";
import { humanClarification } from "./nodes/humanClarification.js";
import { incorporateClarification } from "./nodes/incorporateClarification.js";
import { prepareResearch } from "./nodes/prepareResearch.js";
import { requestClarification } from "./nodes/requestClarification.js";
import { researcherAgent } from "./researcher/graph.js";
import { ResearchStateAnnotation } from "./state.js";

// Keep BaseMessage in this module's type scope for LangGraph CLI declaration emit.
export type { BaseMessage };

function routeAfterAssessment(state: typeof ResearchStateAnnotation.State) {
  const next = state.sufficient ? "generateBrief" : "requestClarification";
  log.node("assessQuery", "route", {
    sufficient: state.sufficient,
    next,
  });
  return next;
}

function routeAfterClarification(state: typeof ResearchStateAnnotation.State) {
  const next = state.needClarification ? "humanClarification" : "generateBrief";
  log.node("requestClarification", "route", {
    needClarification: state.needClarification,
    next,
  });
  return next;
}

function buildWorkflow() {
  return new StateGraph(ResearchStateAnnotation)
    .addNode("assessQuery", assessQuery)
    .addNode("requestClarification", requestClarification)
    .addNode("humanClarification", humanClarification)
    .addNode("incorporateClarification", incorporateClarification)
    .addNode("generateBrief", generateBrief)
    .addNode("prepareResearch", prepareResearch)
    // Compiled subgraph as a node (shared channels) so Studio streaming/tracing work.
    .addNode("researcher", researcherAgent)
    .addNode("finalizeResearch", finalizeResearch)
    .addEdge(START, "assessQuery")
    .addConditionalEdges("assessQuery", routeAfterAssessment, [
      "generateBrief",
      "requestClarification",
    ])
    .addConditionalEdges("requestClarification", routeAfterClarification, [
      "humanClarification",
      "generateBrief",
    ])
    .addEdge("humanClarification", "incorporateClarification")
    .addEdge("incorporateClarification", "requestClarification")
    .addEdge("generateBrief", "prepareResearch")
    .addEdge("prepareResearch", "researcher")
    .addEdge("researcher", "finalizeResearch")
    .addEdge("finalizeResearch", END);
}

<<<<<<< HEAD
log.info("Research graph compiled", {
  nodes: [
    "assessQuery",
    "requestClarification",
    "humanClarification",
    "incorporateClarification",
    "generateBrief",
  ],
  terminalEdge: "generateBrief → END",
  deepResearchWired: false,
});

export const graph = workflow.compile({ checkpointer });
=======
/**
 * Default superstep budget for the full scoping + research graph.
 * Research loops (llmCall ↔ toolNode) consume many steps; 25 is too low.
 */
export const DEFAULT_RECURSION_LIMIT = 100;

/**
 * Studio / langgraph.json export — no local checkpointer.
 * The LangGraph API server attaches its own persistence.
 */
export const graph = buildWorkflow()
  .compile()
  .withConfig({ recursionLimit: DEFAULT_RECURSION_LIMIT });

/**
 * Express API graph with an explicit checkpointer for HITL interrupt/resume.
 */
export function createResearchGraph(checkpointer: BaseCheckpointSaver) {
  return buildWorkflow()
    .compile({ checkpointer })
    .withConfig({ recursionLimit: DEFAULT_RECURSION_LIMIT });
}
>>>>>>> bd343f7be41c70cc0042c9162c2f174294c1ab1a
