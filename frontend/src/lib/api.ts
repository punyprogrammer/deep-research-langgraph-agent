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
};

export type ResearchResponse = ClarificationResponse | CompleteResponse | {
  status: ResearchStatus;
  threadId: string;
  query: string;
  assessmentReason?: string;
  need_clarification?: boolean;
  question?: string;
  verification?: string;
  research_brief?: string;
  error?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    console.error("[deep-research api]", res.status, data);
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  console.info("[deep-research api] response", {
    status: (data as { status?: string }).status,
    keys: Object.keys(data as object),
    hasBrief: Boolean((data as { research_brief?: string }).research_brief),
    hasNotes: Boolean((data as { notes?: unknown }).notes),
    hasReport: Boolean((data as { finalReport?: string; final_report?: string }).finalReport
      ?? (data as { final_report?: string }).final_report),
    threadId: (data as { threadId?: string }).threadId,
  });
  return data;
}

export async function startResearch(query: string): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return parseJson<ResearchResponse>(res);
}

export async function resumeResearch(
  threadId: string,
  clarificationResponse: string,
): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, clarificationResponse }),
  });
  return parseJson<ResearchResponse>(res);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}
