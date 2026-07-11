import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  deduplicateSearchResults,
  formatSearchOutput,
  processSearchResults,
  tavilySearchMultiple,
  type SearchTopic,
} from "../utils/search.js";

/**
 * Fetch results from Tavily search API with content summarization.
 *
 * max_results and topic are fixed defaults (mirroring Python InjectedToolArg)
 * so the model only chooses the query.
 */
export const tavilySearch = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const maxResults = 3;
    const topic: SearchTopic = "general";

    const searchResults = await tavilySearchMultiple(
      [query],
      maxResults,
      topic,
      "markdown",
    );

    const uniqueResults = deduplicateSearchResults(searchResults);
    const summarizedResults = await processSearchResults(uniqueResults);

    return formatSearchOutput(summarizedResults);
  },
  {
    name: "tavily_search",
    description:
      "Fetch results from Tavily search API with content summarization.",
    schema: z.object({
      query: z.string().describe("A single search query to execute"),
    }),
  },
);
