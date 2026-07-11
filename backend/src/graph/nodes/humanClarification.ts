import { interrupt } from "@langchain/langgraph";

import { log } from "../../utils/logger.js";
import type { ResearchState } from "../state.js";

export async function humanClarification(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  log.node("humanClarification", "enter", {
    questionPreview: state.question.slice(0, 160),
  });
  log.info("Graph interrupting for human clarification (HITL)");

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

  log.node("humanClarification", "exit", {
    responsePreview: humanResponse.slice(0, 160),
  });

  return { humanResponse };
}
