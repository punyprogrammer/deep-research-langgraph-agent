import { HumanMessage } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";

import type { ResearchState } from "../state.js";

export async function humanClarification(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  const clarificationResponse = interrupt({
    action: "await_clarification",
    need_clarification: state.needClarification,
    query: state.query,
    assessmentReason: state.assessmentReason,
    question: state.question,
  });

  const humanResponse =
    typeof clarificationResponse === "string"
      ? clarificationResponse
      : JSON.stringify(clarificationResponse);

  return { humanResponse };
}
