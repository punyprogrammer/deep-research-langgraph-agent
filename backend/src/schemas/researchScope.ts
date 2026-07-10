import { z } from "zod";

/**
 * Mirrors ClarifyWithUser from state_scope.py
 * Schema for user clarification decision and questions.
 */
export const clarifyWithUserSchema = z.object({
  need_clarification: z
    .boolean()
    .describe("Whether the user needs to be asked a clarifying question."),
  question: z
    .string()
    .describe("A question to ask the user to clarify the report scope"),
  verification: z
    .string()
    .describe(
      "Verify message that we will start research after the user has provided the necessary information.",
    ),
});

export type ClarifyWithUser = z.infer<typeof clarifyWithUserSchema>;

/**
 * Mirrors ResearchQuestion from state_scope.py
 * Schema for structured research brief generation.
 */
export const researchQuestionSchema = z.object({
  research_brief: z
    .string()
    .describe("A research question that will be used to guide the research."),
});

export type ResearchQuestion = z.infer<typeof researchQuestionSchema>;
