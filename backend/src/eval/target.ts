import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

import { generateBrief } from "../graph/nodes/generateBrief.js";
import type { ResearchState } from "../graph/state.js";
import type { SerializedMessage } from "./fixtures.js";

function toBaseMessages(messages: SerializedMessage[]): BaseMessage[] {
  return messages.map((message) => {
    if (message.type === "human") {
      return new HumanMessage(message.content);
    }
    return new AIMessage(message.content);
  });
}

function emptyState(messages: BaseMessage[]): ResearchState {
  return {
    messages,
    researchBrief: undefined,
    supervisorMessages: [],
    rawNotes: [],
    notes: [],
    finalReport: "",
    needClarification: false,
    question: "",
    verification: "",
    query: "",
    sufficient: true,
    assessmentReason: "",
    humanResponse: "",
    enrichedQuery: "",
    status: "needs_clarification",
  };
}

export type ScopingTargetInputs = {
  messages: SerializedMessage[];
};

export type ScopingTargetOutputs = {
  research_brief: string;
};

/**
 * Evaluation target: generate a research brief from a clarified conversation.
 * Does not run the full HITL graph — dataset examples already include clarification.
 */
export async function scopingTarget(
  inputs: ScopingTargetInputs,
): Promise<ScopingTargetOutputs> {
  const messages = toBaseMessages(inputs.messages ?? []);
  const result = await generateBrief(emptyState(messages));

  if (!result.researchBrief) {
    throw new Error("generateBrief did not return a research_brief");
  }

  return { research_brief: result.researchBrief };
}
