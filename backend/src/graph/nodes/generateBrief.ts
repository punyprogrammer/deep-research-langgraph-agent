import { getChatModel } from "../../config/llm.js";
import generateBriefPrompt from "../../prompts/generateBrief.js";
import { researchQuestionSchema } from "../../schemas/researchScope.js";
import { formatMessages } from "../utils/messages.js";
import type { ResearchState } from "../state.js";

function buildMessagesBlock(state: ResearchState): string {
  const formatted = formatMessages(state.messages);

  if (state.verification) {
    return `${formatted}\n\nassistant (verification): ${state.verification}`;
  }

  return formatted;
}

function buildPrompt(state: ResearchState): string {
  const today = new Date().toISOString().split("T")[0];

  return generateBriefPrompt
    .replace("{messages}", buildMessagesBlock(state))
    .replace("{date}", today);
}

export async function generateBrief(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  const model = getChatModel().withStructuredOutput(researchQuestionSchema);

  const result = await model.invoke([
    {
      role: "system",
      content: buildPrompt(state),
    },
  ]);

  return {
    researchBrief: result.research_brief,
    status: "complete",
  };
}
