import { AIMessage } from "@langchain/core/messages";

import { getChatModel } from "../../config/llm.js";
import requestClarificationPrompt from "../../prompts/requestClarification.js";
import { clarifyWithUserSchema } from "../../schemas/researchScope.js";
import { log } from "../../utils/logger.js";
import { formatMessages } from "../utils/messages.js";
import type { ResearchState } from "../state.js";

function buildPrompt(state: ResearchState): string {
  const today = new Date().toISOString().split("T")[0];

  return requestClarificationPrompt
    .replace("{messages}", formatMessages(state.messages))
    .replace("{date}", today);
}

export async function requestClarification(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  log.node("requestClarification", "enter", {
    queryPreview: state.query.slice(0, 120),
  });

  const model = getChatModel().withStructuredOutput(clarifyWithUserSchema);

  const result = await model.invoke([
    {
      role: "system",
      content: buildPrompt(state),
    },
  ]);

  const updates: Partial<ResearchState> = {
    needClarification: result.need_clarification,
    question: result.question,
    verification: result.verification,
    status: result.need_clarification ? "needs_clarification" : "complete",
  };

  if (result.need_clarification && result.question) {
    updates.messages = [new AIMessage(result.question)];
  }

  log.node("requestClarification", "exit", {
    needClarification: result.need_clarification,
    hasQuestion: Boolean(result.question),
    hasVerification: Boolean(result.verification),
    next: result.need_clarification ? "humanClarification" : "generateBrief",
  });

  return updates;
}
