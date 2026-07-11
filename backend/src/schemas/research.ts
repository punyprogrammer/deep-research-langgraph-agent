import { z } from "zod";

/**
 * Mirrors Summary from state_research.py
 * Schema for webpage content summarization.
 */
export const summarySchema = z.object({
  summary: z.string().describe("Concise summary of the webpage content"),
  key_excerpts: z
    .string()
    .describe("Important quotes and excerpts from the content"),
});

export type Summary = z.infer<typeof summarySchema>;
