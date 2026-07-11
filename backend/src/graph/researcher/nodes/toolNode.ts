import { ToolMessage, isAIMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredToolInterface } from "@langchain/core/tools";

import { log } from "../../../utils/logger.js";
import { researchTools } from "../../../tools/index.js";
import type { ResearcherState } from "../state.js";

const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
  researchTools.map((researchTool) => [researchTool.name, researchTool]),
);

/**
 * Execute all tool calls from the previous LLM response.
 * Always emits one ToolMessage per tool_call_id so the next LLM invoke
 * never sees unpaired assistant tool_calls.
 */
export async function toolNode(
  state: ResearcherState,
  config: RunnableConfig,
): Promise<Partial<ResearcherState>> {
  const lastMessage = state.researcherMessages.at(-1);

  if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
    return {};
  }

  const toolCalls = lastMessage.tool_calls;
  const toolOutputs: ToolMessage[] = [];

  for (const [index, toolCall] of toolCalls.entries()) {
    const toolCallId = toolCall.id ?? `${toolCall.name}-${index}`;
    const selectedTool = toolsByName[toolCall.name];

    if (!selectedTool) {
      toolOutputs.push(
        new ToolMessage({
          content: `Unknown tool: ${toolCall.name}`,
          name: toolCall.name,
          tool_call_id: toolCallId,
        }),
      );
      continue;
    }

    try {
      const result = await selectedTool.invoke(toolCall.args, config);
      toolOutputs.push(
        new ToolMessage({
          content: typeof result === "string" ? result : JSON.stringify(result),
          name: toolCall.name,
          tool_call_id: toolCallId,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool error";
      log.warn("Research tool call failed", {
        tool: toolCall.name,
        toolCallId,
        message,
      });
      toolOutputs.push(
        new ToolMessage({
          content: `Tool error (${toolCall.name}): ${message}`,
          name: toolCall.name,
          tool_call_id: toolCallId,
        }),
      );
    }
  }

  return {
    researcherMessages: toolOutputs,
  };
}
