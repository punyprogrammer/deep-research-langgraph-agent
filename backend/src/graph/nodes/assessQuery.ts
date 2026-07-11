import { z } from "zod";

import { getChatModel } from "../../config/llm.js";
import { log } from "../../utils/logger.js";
import type { ResearchState } from "../state.js";

const assessmentSchema = z.object({
  sufficient: z
    .boolean()
    .describe(
      "True when the query has enough scope, audience, constraints, and desired outcome to produce a research brief.",
    ),
  reason: z
    .string()
    .describe("Short explanation of why the query is or is not sufficient."),
});

export async function assessQuery(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  log.node("assessQuery", "enter", {
    queryPreview: state.query.slice(0, 120),
  });

  const model = getChatModel().withStructuredOutput(assessmentSchema);

  const assessment = await model.invoke([
    {
      role: "system",
      content: `You evaluate whether a user research query is specific enough to begin deep research.

A sufficient query typically includes:
- A clear topic or question
- Intended audience or use case (when relevant)
- Scope boundaries (timeframe, geography, industry, etc.)
- Desired output or depth when implied

Mark sufficient=true when a reasonable research brief can be drafted without guessing critical constraints.
Mark sufficient=false when key details are missing and clarification would materially improve the research.`,
    },
    {
      role: "user",
      content: `Evaluate this research query:\n\n${state.query}`,
    },
  ]);

  log.node("assessQuery", "exit", {
    sufficient: assessment.sufficient,
    reasonPreview: assessment.reason.slice(0, 160),
  });

  return {
    sufficient: assessment.sufficient,
    assessmentReason: assessment.reason,
  };
}
