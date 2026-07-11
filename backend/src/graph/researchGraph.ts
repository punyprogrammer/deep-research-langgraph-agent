import { END, START, StateGraph } from "@langchain/langgraph";

import { log } from "../utils/logger.js";
import { checkpointer } from "./checkpointer.js";
import { assessQuery } from "./nodes/assessQuery.js";
import { generateBrief } from "./nodes/generateBrief.js";
import { humanClarification } from "./nodes/humanClarification.js";
import { incorporateClarification } from "./nodes/incorporateClarification.js";
import { requestClarification } from "./nodes/requestClarification.js";
import { ResearchStateAnnotation } from "./state.js";

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

const workflow = new StateGraph(ResearchStateAnnotation)
  .addNode("assessQuery", assessQuery)
  .addNode("requestClarification", requestClarification)
  .addNode("humanClarification", humanClarification)
  .addNode("incorporateClarification", incorporateClarification)
  .addNode("generateBrief", generateBrief)
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
  .addEdge("generateBrief", END);

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
