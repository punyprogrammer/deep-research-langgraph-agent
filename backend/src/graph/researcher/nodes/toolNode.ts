import { ToolMessage, isAIMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredToolInterface } from "@langchain/core/tools";

import { researchTools } from "../../../tools/index.js";
import type { ResearcherState } from "../state.js";

const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
  researchTools.map((researchTool) => [researchTool.name, researchTool]),
);

/**
 * Execute all tool calls from the previous LLM response.
 * Mirrors tool_node from research_agent.py (sequential — parallel tool+LLM
 * races Studio's EventStreamCallbackHandler run map).
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
  const observations: string[] = [];

  for (const toolCall of toolCalls) {
    const selectedTool = toolsByName[toolCall.name];
    if (!selectedTool) {
      observations.push(`Unknown tool: ${toolCall.name}`);
      continue;
    }

    const result = await selectedTool.invoke(toolCall.args, config);
    observations.push(
      typeof result === "string" ? result : JSON.stringify(result),
    );
  }

  const toolOutputs = toolCalls.map(
    (toolCall, index) =>
      new ToolMessage({
        content: observations[index] ?? "",
        name: toolCall.name,
        tool_call_id: toolCall.id ?? `${toolCall.name}-${index}`,
      }),
  );

  return {
    researcherMessages: toolOutputs,
  };
}
