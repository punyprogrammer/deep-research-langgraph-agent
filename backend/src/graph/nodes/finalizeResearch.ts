import type { ResearchState } from "../state.js";

/**
 * Map compressed researcher output onto parent notes and mark the run complete.
 */
export async function finalizeResearch(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  if (!state.compressedResearch?.trim()) {
    throw new Error("finalizeResearch expected compressedResearch from researcher subgraph");
  }

  return {
    notes: [state.compressedResearch],
    status: "complete",
  };
}
