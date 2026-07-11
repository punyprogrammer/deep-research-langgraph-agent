import { log } from "../../utils/logger.js";
import type { ResearchState } from "../state.js";

/**
 * Map compressed researcher output onto parent notes and mark the run complete.
 */
export async function finalizeResearch(
  state: ResearchState,
): Promise<Partial<ResearchState>> {
  log.node("finalizeResearch", "enter", {
    compressedPreview: state.compressedResearch?.slice(0, 160),
    compressedLength: state.compressedResearch?.length ?? 0,
    rawNotesCount: state.rawNotes?.length ?? 0,
  });

  if (!state.compressedResearch?.trim()) {
    throw new Error("finalizeResearch expected compressedResearch from researcher subgraph");
  }

  log.node("finalizeResearch", "exit", {
    status: "complete",
    notesCount: 1,
    nextEdge: "END",
  });

  return {
    notes: [state.compressedResearch],
    status: "complete",
  };
}
