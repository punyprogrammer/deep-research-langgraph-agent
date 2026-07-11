import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export type ResearchStatus = "needs_clarification" | "complete";

function appendMessages(
  left: BaseMessage[],
  right: BaseMessage | BaseMessage[],
): BaseMessage[] {
  return left.concat(Array.isArray(right) ? right : [right]);
}

/**
 * Parent graph state: scoping fields + researcher subgraph channels.
 *
 * Researcher channels (shared with researcher subgraph for Studio/xray):
 * - researcherMessages, researchTopic, toolCallIterations, compressedResearch, rawNotes
 */
export const ResearchStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: appendMessages,
    default: () => [],
  }),
  researchBrief: Annotation<string | undefined>,
  supervisorMessages: Annotation<BaseMessage[]>({
    reducer: appendMessages,
    default: () => [],
  }),
  rawNotes: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  notes: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  finalReport: Annotation<string>,

  needClarification: Annotation<boolean>,

  question: Annotation<string>,

  verification: Annotation<string>,

  query: Annotation<string>,

  sufficient: Annotation<boolean>,

  assessmentReason: Annotation<string>,

  humanResponse: Annotation<string>,

  enrichedQuery: Annotation<string>,

  status: Annotation<ResearchStatus>,

  // Shared with researcher subgraph
  researcherMessages: Annotation<BaseMessage[]>({
    reducer: appendMessages,
    default: () => [],
  }),
  toolCallIterations: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  researchTopic: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  compressedResearch: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
