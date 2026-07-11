export { tavilySearch } from "./tavilySearch.js";
export { thinkTool } from "./thinkTool.js";

import { tavilySearch } from "./tavilySearch.js";
import { thinkTool } from "./thinkTool.js";

/** Research agent tools: web search + strategic reflection. */
export const researchTools = [tavilySearch, thinkTool] as const;
