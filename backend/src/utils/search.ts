import { HumanMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/llm.js";
import { getTavilyClient } from "../config/tavily.js";
import summarizeWebpagePrompt from "../prompts/summarizeWebpage.js";
import { summarySchema } from "../schemas/research.js";
import { getTodayStr } from "./date.js";

export type SearchTopic = "general" | "news" | "finance";

/** Normalized Tavily result shape used by the search pipeline. */
export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
  rawContent?: string | null;
}

export interface TavilySearchResponse {
  results: SearchResultItem[];
}

export interface ProcessedSearchResult {
  title: string;
  content: string;
}

/**
 * Perform search using Tavily API for multiple queries.
 * Mirrors tavily_search_multiple from utils.py
 */
export async function tavilySearchMultiple(
  searchQueries: string[],
  maxResults = 3,
  topic: SearchTopic = "general",
  includeRawContent: false | "markdown" | "text" = "markdown",
): Promise<TavilySearchResponse[]> {
  const tavilyClient = getTavilyClient();
  const searchDocs: TavilySearchResponse[] = [];

  // Sequential searches; can parallelize later with Promise.all if needed.
  for (const query of searchQueries) {
    const result = await tavilyClient.search(query, {
      maxResults,
      includeRawContent,
      topic,
    });

    searchDocs.push({
      results: result.results.map((item) => ({
        title: item.title,
        url: item.url,
        content: item.content,
        rawContent: item.rawContent ?? null,
      })),
    });
  }

  return searchDocs;
}

/**
 * Summarize webpage content using the configured chat model.
 * Mirrors summarize_webpage_content from utils.py
 *
 * Nested LLM calls intentionally use empty callbacks so they do not
 * inherit Studio's EventStreamCallbackHandler (avoids "Run ID not found").
 */
export async function summarizeWebpageContent(
  webpageContent: string,
): Promise<string> {
  try {
    const structuredModel = getChatModel().withStructuredOutput(summarySchema);

    const prompt = summarizeWebpagePrompt
      .replace("{webpage_content}", webpageContent)
      .replace("{date}", getTodayStr());

    const summary = await structuredModel.invoke(
      [new HumanMessage({ content: prompt })],
      {
        // Isolate from parent stream/tracer handlers.
        callbacks: [],
        runName: "summarize_webpage",
      },
    );

    return (
      `<summary>\n${summary.summary}\n</summary>\n\n` +
      `<key_excerpts>\n${summary.key_excerpts}\n</key_excerpts>`
    );
  } catch (error) {
    console.error(
      `Failed to summarize webpage: ${error instanceof Error ? error.message : String(error)}`,
    );
    return webpageContent.length > 1000
      ? `${webpageContent.slice(0, 1000)}...`
      : webpageContent;
  }
}

/**
 * Deduplicate search results by URL.
 * Mirrors deduplicate_search_results from utils.py
 */
export function deduplicateSearchResults(
  searchResults: TavilySearchResponse[],
): Record<string, SearchResultItem> {
  const uniqueResults: Record<string, SearchResultItem> = {};

  for (const response of searchResults) {
    for (const result of response.results) {
      if (!(result.url in uniqueResults)) {
        uniqueResults[result.url] = result;
      }
    }
  }

  return uniqueResults;
}

/**
 * Process search results by summarizing raw content where available.
 * Mirrors process_search_results from utils.py
 */
export async function processSearchResults(
  uniqueResults: Record<string, SearchResultItem>,
): Promise<Record<string, ProcessedSearchResult>> {
  const summarizedResults: Record<string, ProcessedSearchResult> = {};

  for (const [url, result] of Object.entries(uniqueResults)) {
    const content = result.rawContent
      ? await summarizeWebpageContent(result.rawContent)
      : result.content;

    summarizedResults[url] = {
      title: result.title,
      content,
    };
  }

  return summarizedResults;
}

/**
 * Format search results into a structured string for the research agent.
 * Mirrors format_search_output from utils.py
 */
export function formatSearchOutput(
  summarizedResults: Record<string, ProcessedSearchResult>,
): string {
  if (Object.keys(summarizedResults).length === 0) {
    return "No valid search results found. Please try different search queries or use a different search API.";
  }

  let formattedOutput = "Search results: \n\n";
  let index = 1;

  for (const [url, result] of Object.entries(summarizedResults)) {
    formattedOutput += `\n\n--- SOURCE ${index}: ${result.title} ---\n`;
    formattedOutput += `URL: ${url}\n\n`;
    formattedOutput += `SUMMARY:\n${result.content}\n\n`;
    formattedOutput += `${"-".repeat(80)}\n`;
    index += 1;
  }

  return formattedOutput;
}
