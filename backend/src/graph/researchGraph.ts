import { END, START, StateGraph } from "@langchain/langgraph";

import { checkpointer } from "./checkpointer.js";
import { assessQuery } from "./nodes/assessQuery.js";
import { generateBrief } from "./nodes/generateBrief.js";
import { humanClarification } from "./nodes/humanClarification.js";
import { incorporateClarification } from "./nodes/incorporateClarification.js";
import { requestClarification } from "./nodes/requestClarification.js";
import { ResearchStateAnnotation } from "./state.js";

function routeAfterAssessment(state: typeof ResearchStateAnnotation.State) {
  return state.sufficient ? "generateBrief" : "requestClarification";
}

function routeAfterClarification(state: typeof ResearchStateAnnotation.State) {
  return state.needClarification ? "humanClarification" : "generateBrief";
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

export const graph = workflow.compile({ checkpointer });
