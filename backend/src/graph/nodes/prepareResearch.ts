import { HumanMessage } from "@langchain/core/messages";

import { log } from "../../utils/logger.js";
import type { ResearchState } from "../state.js";

/**
 * Seed researcher subgraph channels from the generated research brief.
 */
export async function prepareResearch(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  const researchTopic = state.researchBrief?.trim();

  log.node("prepareResearch", "enter", {
    hasBrief: Boolean(researchTopic),
    briefPreview: researchTopic?.slice(0, 160),
  });

  if (!researchTopic) {
    throw new Error("prepareResearch requires researchBrief from generateBrief");
  }

  log.node("prepareResearch", "exit", {
    nextEdge: "researcher",
    researchTopicPreview: researchTopic.slice(0, 160),
  });

  return {
    researchTopic,
    researcherMessages: [new HumanMessage(researchTopic)],
    toolCallIterations: 0,
    compressedResearch: "",
  };
}
