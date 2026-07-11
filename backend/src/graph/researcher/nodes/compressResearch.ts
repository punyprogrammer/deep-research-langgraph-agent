import {
  HumanMessage,
  SystemMessage,
  filterMessages,
} from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import { getChatModel } from "../../../config/llm.js";
import compressResearchHumanMessage from "../../../prompts/compressResearchHuman.js";
import compressResearchSystemPrompt from "../../../prompts/compressResearchSystem.js";
import { getTodayStr } from "../../../utils/date.js";
import type { ResearcherState } from "../state.js";

function contentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  return JSON.stringify(content);
}

/**
 * Compress research findings into a concise, source-preserving summary.
 * Mirrors compress_research from research_agent.py
 */
export async function compressResearch(
  state: ResearcherState,
  config: RunnableConfig,
): Promise<Partial<ResearcherState>> {
  const systemMessage = compressResearchSystemPrompt.replace(
    "{date}",
    getTodayStr(),
  );
  const humanMessage = compressResearchHumanMessage.replace(
    "{research_topic}",
    state.researchTopic,
  );

  const response = await getChatModel().invoke(
    [
      new SystemMessage(systemMessage),
      ...state.researcherMessages,
      new HumanMessage(humanMessage),
    ],
    config,
  );

  const rawNoteMessages = filterMessages(state.researcherMessages, {
    includeTypes: ["tool", "ai"],
  });

  const rawNotes = [
    rawNoteMessages.map((message) => contentToString(message.content)).join("\n"),
  ];

  return {
    compressedResearch: contentToString(response.content),
    rawNotes,
  };
}
