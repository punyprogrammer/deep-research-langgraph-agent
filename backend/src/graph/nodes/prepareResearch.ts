import { HumanMessage } from "@langchain/core/messages";

import type { ResearchState } from "../state.js";

/**
 * Seed researcher subgraph channels from the generated research brief.
 */
export async function prepareResearch(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  const researchTopic = state.researchBrief?.trim();

  if (!researchTopic) {
    throw new Error("prepareResearch requires researchBrief from generateBrief");
  }

  return {
    researchTopic,
    researcherMessages: [new HumanMessage(researchTopic)],
    toolCallIterations: 0,
    compressedResearch: "",
  };
}
