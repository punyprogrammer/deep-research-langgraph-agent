export type ResearchStatus = "needs_clarification" | "complete" | string;

export type ClarificationResponse = {
  status: "needs_clarification";
  threadId: string;
  query: string;
  assessmentReason?: string;
  need_clarification: boolean;
  question: string;
  verification?: string;
  interrupt?: unknown;
};

export type CompleteResponse = {
  status: "complete";
  threadId: string;
  query: string;
  enrichedQuery?: string;
  assessmentReason?: string;
  need_clarification: boolean;
  question?: string;
  verification?: string;
  research_brief: string;
  notes?: string[];
  raw_notes?: string[];
  compressed_research?: string;
};

export type ResearchResponse =
  | ClarificationResponse
  | CompleteResponse
  | {
      status: ResearchStatus;
      threadId: string;
      query: string;
      assessmentReason?: string;
      need_clarification?: boolean;
      question?: string;
      verification?: string;
      research_brief?: string;
      notes?: string[];
      raw_notes?: string[];
      compressed_research?: string;
      error?: string;
    };

export type ResearchStreamEvent =
  | { type: "phase"; phase: string; label: string }
  | { type: "thinking"; content: string }
  | {
      type: "tool_call";
      tool: string;
      query?: string;
      reflection?: string;
      args?: Record<string, unknown>;
    }
  | { type: "tool_result"; tool: string; preview: string }
  | { type: "brief"; research_brief: string }
  | { type: "status"; message: string }
  | { type: "needs_clarification"; payload: ClarificationResponse }
  | { type: "complete"; payload: CompleteResponse }
  | { type: "error"; message: string }
  | { type: "done" };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export function extractFindings(response: ResearchResponse): {
  brief?: string;
  notes: string[];
  compressedResearch?: string;
  findings?: string;
} {
  const brief =
    "research_brief" in response ? response.research_brief : undefined;
  const notes =
    "notes" in response && Array.isArray(response.notes) ? response.notes : [];
  const compressedResearch =
    "compressed_research" in response
      ? response.compressed_research
      : undefined;
  const findings =
    compressedResearch?.trim() ||
    notes.map((n) => n.trim()).filter(Boolean).join("\n\n") ||
    undefined;

  return { brief, notes, compressedResearch, findings };
}

async function readSseStream(
  res: Response,
  onEvent: (event: ResearchStreamEvent) => void,
): Promise<ResearchResponse> {
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(
      data.error ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: ResearchResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const dataLine = part
        .split("\n")
        .find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const raw = dataLine.slice(5).trim();
      if (!raw) continue;

      let event: ResearchStreamEvent;
      try {
        event = JSON.parse(raw) as ResearchStreamEvent;
      } catch {
        continue;
      }

      onEvent(event);

      if (event.type === "complete") {
        finalResponse = event.payload;
      } else if (event.type === "needs_clarification") {
        finalResponse = event.payload;
      } else if (event.type === "error") {
        throw new ApiError(event.message, 500);
      }
    }
  }

  if (!finalResponse) {
    throw new ApiError("Stream ended without a final research result", 500);
  }

  console.info("[deep-research api] stream complete", {
    status: finalResponse.status,
    keys: Object.keys(finalResponse),
  });

  return finalResponse;
}

export async function startResearchStream(
  query: string,
  onEvent: (event: ResearchStreamEvent) => void,
): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ query, stream: true }),
  });
  return readSseStream(res, onEvent);
}

export async function resumeResearchStream(
  threadId: string,
  clarificationResponse: string,
  onEvent: (event: ResearchStreamEvent) => void,
): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      threadId,
      clarificationResponse,
      stream: true,
    }),
  });
  return readSseStream(res, onEvent);
}
