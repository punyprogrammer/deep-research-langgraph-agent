import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Tool for strategic reflection on research progress and decision-making.
 *
 * Use after each search to analyze results and plan next steps systematically.
 * This creates a deliberate pause in the research workflow for quality decisions.
 *
 * When to use:
 * - After receiving search results: What key information did I find?
 * - Before deciding next steps: Do I have enough to answer comprehensively?
 * - When assessing research gaps: What specific information am I still missing?
 * - Before concluding research: Can I provide a complete answer now?
 *
 * Reflection should address:
 * 1. Analysis of current findings
 * 2. Gap assessment
 * 3. Quality evaluation
 * 4. Strategic decision (continue searching vs answer)
 */
export const thinkTool = tool(
  async ({ reflection }: { reflection: string }): Promise<string> => {
    return `Reflection recorded: ${reflection}`;
  },
  {
    name: "think_tool",
    description:
      "Tool for strategic reflection on research progress and decision-making. " +
      "Use this tool after each search to analyze results and plan next steps systematically. " +
      "Reflection should cover findings, gaps, evidence quality, and whether to continue searching.",
    schema: z.object({
      reflection: z
        .string()
        .describe(
          "Your detailed reflection on research progress, findings, gaps, and next steps",
        ),
    }),
  },
);
