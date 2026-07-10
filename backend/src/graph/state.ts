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
 * Mirrors AgentState from state_scope.py, extended with scoping workflow fields.
 *
 * AgentState fields:
 * - messages: user conversation (MessagesState)
 * - researchBrief: research question generated from conversation
 * - supervisorMessages: supervisor coordination messages (reserved)
 * - rawNotes: unprocessed research notes (reserved)
 * - notes: processed notes (reserved)
 * - finalReport: final formatted report (reserved)
 *
 * ClarifyWithUser fields (set by requestClarification):
 * - needClarification, question, verification
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
});

export type ResearchState = typeof ResearchStateAnnotation.State;
