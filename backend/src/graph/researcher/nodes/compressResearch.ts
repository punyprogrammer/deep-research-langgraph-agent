import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  filterMessages,
  isAIMessage,
  isToolMessage,
  type BaseMessage,
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
 * Ensure every assistant tool_call has a matching ToolMessage before invoking
 * the chat model (OpenAI rejects unpaired tool_call_ids).
 */
function ensureToolCallResponses(messages: BaseMessage[]): BaseMessage[] {
  const answeredIds = new Set<string>();
  for (const message of messages) {
    if (isToolMessage(message) && message.tool_call_id) {
      answeredIds.add(message.tool_call_id);
    }
  }

  const repaired: BaseMessage[] = [];
  for (const [index, message] of messages.entries()) {
    repaired.push(message);

    if (!isAIMessage(message) || !message.tool_calls?.length) {
      continue;
    }

    for (const [toolIndex, toolCall] of message.tool_calls.entries()) {
      const toolCallId = toolCall.id ?? `${toolCall.name}-${index}-${toolIndex}`;
      if (answeredIds.has(toolCallId)) {
        continue;
      }

      repaired.push(
        new ToolMessage({
          content:
            "Tool call was not executed before compression (loop ended). Proceed with available evidence.",
          name: toolCall.name,
          tool_call_id: toolCallId,
        }),
      );
      answeredIds.add(toolCallId);
    }
  }

  return repaired;
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

  const safeResearcherMessages = ensureToolCallResponses(
    state.researcherMessages,
  );

  const response = await getChatModel().invoke(
    [
      new SystemMessage(systemMessage),
      ...safeResearcherMessages,
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
