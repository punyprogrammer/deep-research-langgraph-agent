import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import type { EvaluationResult } from "langsmith/evaluation";
import { z } from "zod";

import briefCriteriaPrompt from "../prompts/briefCriteria.js";
import briefHallucinationPrompt from "../prompts/briefHallucination.js";

const criteriaSchema = z.object({
  criteria_text: z
    .string()
    .describe(
      "The specific success criteria being evaluated (e.g., 'Current age is 25', 'Monthly rent below 7k')",
    ),
  reasoning: z
    .string()
    .describe(
      "Detailed explanation of why this criteria is or isn't captured in the research brief, including specific evidence from the brief",
    ),
  is_captured: z
    .boolean()
    .describe(
      "Whether this specific criteria is adequately captured in the research brief (True) or missing/inadequately addressed (False)",
    ),
});

const noAssumptionsSchema = z.object({
  no_assumptions: z
    .boolean()
    .describe(
      "Whether the research brief avoids making unwarranted assumptions. True if the brief only includes information explicitly provided by the user, False if it makes assumptions beyond what was stated.",
    ),
  reasoning: z
    .string()
    .describe(
      "Detailed explanation of the evaluation decision, including specific examples of any assumptions found or confirmation that no assumptions were made beyond the user's explicit statements.",
    ),
});

function getJudgeModel() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run LLM-as-judge evaluators");
  }

  return new ChatOpenAI({
    model: process.env.EVAL_MODEL ?? "gpt-4o",
    temperature: 0,
  });
}

type EvaluatorArgs = {
  outputs?: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
};

function getResearchBrief(outputs?: Record<string, unknown>): string {
  const brief = outputs?.research_brief;
  if (typeof brief !== "string" || !brief.trim()) {
    throw new Error("Missing outputs.research_brief for evaluation");
  }
  return brief;
}

function getCriteria(referenceOutputs?: Record<string, unknown>): string[] {
  const criteria = referenceOutputs?.criteria;
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error("Missing referenceOutputs.criteria for evaluation");
  }
  return criteria.map(String);
}

export async function evaluateSuccessCriteria(
  args: EvaluatorArgs,
): Promise<EvaluationResult> {
  const researchBrief = getResearchBrief(args.outputs);
  const successCriteria = getCriteria(args.referenceOutputs);

  const structured = getJudgeModel().withStructuredOutput(criteriaSchema);

  const responses = await structured.batch(
    successCriteria.map((criterion) => [
      new HumanMessage(
        briefCriteriaPrompt
          .replace("{research_brief}", researchBrief)
          .replace("{criterion}", criterion),
      ),
    ]),
  );

  const individualEvaluations = successCriteria.map((criterion, index) => ({
    criteria: criterion,
    captured: responses[index].is_captured,
    reasoning: responses[index].reasoning,
  }));

  const capturedCount = individualEvaluations.filter((e) => e.captured).length;
  const totalCount = individualEvaluations.length;

  return {
    key: "success_criteria_score",
    score: totalCount > 0 ? capturedCount / totalCount : 0,
    comment: JSON.stringify(individualEvaluations),
  };
}

export async function evaluateNoAssumptions(
  args: EvaluatorArgs,
): Promise<EvaluationResult> {
  const researchBrief = getResearchBrief(args.outputs);
  const successCriteria = getCriteria(args.referenceOutputs);

  const structured = getJudgeModel().withStructuredOutput(noAssumptionsSchema);

  const response = await structured.invoke([
    new HumanMessage(
      briefHallucinationPrompt
        .replace("{research_brief}", researchBrief)
        .replace("{success_criteria}", JSON.stringify(successCriteria)),
    ),
  ]);

  return {
    key: "no_assumptions_score",
    score: response.no_assumptions ? 1 : 0,
    comment: response.reasoning,
  };
}
