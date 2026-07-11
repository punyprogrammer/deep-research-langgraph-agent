import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

function appendMessages(
  left: BaseMessage[],
  right: BaseMessage | BaseMessage[],
): BaseMessage[] {
  return left.concat(Array.isArray(right) ? right : [right]);
}

/**
 * Mirrors ResearcherState from state_research.py
 */
export const ResearcherStateAnnotation = Annotation.Root({
  researcherMessages: Annotation<BaseMessage[]>({
    reducer: appendMessages,
    default: () => [],
  }),
  toolCallIterations: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  researchTopic: Annotation<string>,
  compressedResearch: Annotation<string>,
  rawNotes: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

export type ResearcherState = typeof ResearcherStateAnnotation.State;

/**
 * Mirrors ResearcherOutputState from state_research.py
 */
export type ResearcherOutput = {
  compressedResearch: string;
  rawNotes: string[];
  researcherMessages: BaseMessage[];
};
