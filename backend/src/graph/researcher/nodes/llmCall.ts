import { AIMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import { getChatModel } from "../../../config/llm.js";
import researchAgentPrompt from "../../../prompts/researchBrief.js";
import { researchTools } from "../../../tools/index.js";
import { getTodayStr } from "../../../utils/date.js";
import type { ResearcherState } from "../state.js";

function getModelWithTools() {
  const model = getChatModel();
  if (!model.bindTools) {
    throw new Error("Configured chat model does not support tool binding");
  }
  return model.bindTools([...researchTools]);
}

/**
 * Analyze current state and decide on next actions (search tools or finish).
 * Mirrors llm_call from research_agent.py
 */
export async function llmCall(
  state: ResearcherState,
  config: RunnableConfig,
): Promise<Partial<ResearcherState>> {
  const systemPrompt = researchAgentPrompt.replace("{date}", getTodayStr());
  const response = await getModelWithTools().invoke(
    [new SystemMessage(systemPrompt), ...state.researcherMessages],
    config,
  );

  return {
    researcherMessages: [response as AIMessage],
    toolCallIterations: state.toolCallIterations + 1,
  };
}
