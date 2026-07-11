import "dotenv/config";
import { tavily, type TavilyClient } from "@tavily/core";

let client: TavilyClient | undefined;

/**
 * Lazily create a shared Tavily client from TAVILY_API_KEY.
 */
export function getTavilyClient(): TavilyClient {
  if (client) {
    return client;
  }

  if (!process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is required for web search");
  }

  client = tavily({ apiKey: process.env.TAVILY_API_KEY });
  return client;
}
