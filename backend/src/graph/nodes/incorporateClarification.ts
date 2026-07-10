import { HumanMessage } from "@langchain/core/messages";

import type { ResearchState } from "../state.js";

export async function incorporateClarification(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  const enrichedQuery = `${state.query}\n\nUser clarification:\n${state.humanResponse}`;

  return {
    enrichedQuery,
    query: enrichedQuery,
    messages: [new HumanMessage(state.humanResponse)],
  };
}
