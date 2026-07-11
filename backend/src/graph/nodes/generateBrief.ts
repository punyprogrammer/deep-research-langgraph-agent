import { getChatModel } from "../../config/llm.js";
import generateBriefPrompt from "../../prompts/generateBrief.js";
import { researchQuestionSchema } from "../../schemas/researchScope.js";
import { log } from "../../utils/logger.js";
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
  log.node("generateBrief", "enter", {
    queryPreview: state.query.slice(0, 120),
    messageCount: state.messages.length,
  });

  const model = getChatModel().withStructuredOutput(researchQuestionSchema);

  const result = await model.invoke([
    {
      role: "system",
      content: buildPrompt(state),
    },
  ]);

  log.node("generateBrief", "exit", {
    briefPreview: result.research_brief.slice(0, 200),
    status: "complete",
  });
  log.warn(
    "Pipeline ends after generateBrief on this branch (feat/scaffold-frontend). Deep research (prepareResearch → researcher → finalizeResearch) lives on feat/implement-research-agent and is NOT wired here.",
    {
      notesCount: state.notes?.length ?? 0,
      rawNotesCount: state.rawNotes?.length ?? 0,
      hasFinalReport: Boolean(state.finalReport),
      nextEdge: "END",
    },
  );

  return {
    researchBrief: result.research_brief,
  };
}
