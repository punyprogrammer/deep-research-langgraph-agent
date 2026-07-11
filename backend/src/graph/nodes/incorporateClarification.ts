import { HumanMessage } from "@langchain/core/messages";

import { log } from "../../utils/logger.js";
import type { ResearchState } from "../state.js";

export async function incorporateClarification(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  log.node("incorporateClarification", "enter", {
    humanResponsePreview: state.humanResponse.slice(0, 160),
  });

  const enrichedQuery = `${state.query}\n\nUser clarification:\n${state.humanResponse}`;

  log.node("incorporateClarification", "exit", {
    enrichedQueryPreview: enrichedQuery.slice(0, 160),
  });

  return {
    enrichedQuery,
    query: enrichedQuery,
    messages: [new HumanMessage(state.humanResponse)],
  };
}
