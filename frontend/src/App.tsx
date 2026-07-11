import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { ResearchHero } from "@/components/ResearchHero";
import type { ActivityItem } from "@/components/ResearchActivityFeed";
import type { LoadingPhase } from "@/components/ResearchTimeline";
import {
  ResearchWorkspace,
  type FeedItem,
  type WorkspaceSession,
} from "@/components/ResearchWorkspace";
import {
  ApiError,
  extractFindings,
  resumeResearchStream,
  startResearchStream,
  type ResearchResponse,
  type ResearchStreamEvent,
} from "@/lib/api";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function feedItem(
  kind: FeedItem["kind"],
  body: string,
  title?: string,
): FeedItem {
  return { id: uid(), kind, body, title };
}

function phaseFromNode(phase: string): LoadingPhase | null {
  if (phase === "assessQuery" || phase === "requestClarification") {
    return "assess";
  }
  if (
    phase === "generateBrief" ||
    phase === "incorporateClarification" ||
    phase === "humanClarification"
  ) {
    return "brief";
  }
  if (
    phase === "prepareResearch" ||
    phase === "researcher" ||
    phase === "llmCall" ||
    phase === "toolNode"
  ) {
    return "search";
  }
  if (phase === "compressResearch" || phase === "finalizeResearch") {
    return "report";
  }
  return null;
}

function activityFromEvent(event: ResearchStreamEvent): ActivityItem | null {
  const timestamp = Date.now();
  if (event.type === "phase") {
    if (event.phase === "toolNode" || event.phase === "llmCall") return null;
    return {
      id: uid(),
      kind: "phase",
      title: "Step",
      body: event.label,
      timestamp,
    };
  }
  if (event.type === "thinking") {
    return {
      id: uid(),
      kind: "thinking",
      title: "Thinking",
      body: event.content,
      timestamp,
    };
  }
  if (event.type === "tool_call") {
    if (event.tool === "tavily_search") {
      return {
        id: uid(),
        kind: "search",
        title: "Search query",
        body: event.query ?? "Running web search…",
        timestamp,
      };
    }
    if (event.tool === "think_tool") {
      return {
        id: uid(),
        kind: "thinking",
        title: "Reflection",
        body: event.reflection ?? "Recording reflection…",
        timestamp,
      };
    }
    return {
      id: uid(),
      kind: "tool",
      title: event.tool,
      body: event.query ?? event.reflection,
      timestamp,
    };
  }
  if (event.type === "tool_result" && event.tool === "tavily_search") {
    return {
      id: uid(),
      kind: "tool_result",
      title: "Search results",
      body: event.preview,
      timestamp,
    };
  }
  return null;
}

function mergeFinalResponse(
  current: WorkspaceSession,
  response: ResearchResponse,
): WorkspaceSession {
  if (response.status === "needs_clarification") {
    const feed = [...current.feed];
    if (response.assessmentReason && !current.assessmentReason) {
      feed.push(
        feedItem("assessment", response.assessmentReason, "Assessment"),
      );
    }
    feed.push(feedItem("status", "Clarification needed"));
    if (response.question) {
      feed.push(
        feedItem(
          "clarification_question",
          response.question,
          "Questions for you",
        ),
      );
    }

    return {
      ...current,
      threadId: response.threadId,
      query: response.query || current.query,
      loading: false,
      awaitingClarification: true,
      clarified: false,
      skippedClarification: false,
      question: response.question,
      assessmentReason: response.assessmentReason,
      verification: response.verification,
      feed,
    };
  }

  if (response.status === "complete") {
    const feed = [...current.feed];
    const skipped =
      current.skippedClarification ||
      (!current.clarified && !current.awaitingClarification);
    const { brief, notes, compressedResearch, findings } =
      extractFindings(response);

    if (response.assessmentReason && !current.assessmentReason) {
      feed.push(
        feedItem("assessment", response.assessmentReason, "Assessment"),
      );
    }
    if (skipped && !current.clarified) {
      feed.push(
        feedItem("status", "Question was clear — skipped clarification"),
      );
    }
    if (response.verification) {
      feed.push(
        feedItem("verification", response.verification, "Verification"),
      );
    }
    const enriched =
      "enrichedQuery" in response ? response.enrichedQuery : undefined;
    if (enriched) {
      feed.push(feedItem("assessment", enriched, "Enriched query"));
    }
    if (brief && !current.researchBrief) {
      feed.push(feedItem("status", "Research brief ready"));
    }
    if (findings) {
      feed.push(feedItem("status", "Deep research complete"));
      feed.push(feedItem("status", "Findings ready"));
    }

    return {
      ...current,
      threadId: response.threadId,
      query: response.query || current.query,
      loading: false,
      awaitingClarification: false,
      clarified: current.clarified,
      skippedClarification: skipped && !current.clarified,
      assessmentReason: response.assessmentReason ?? current.assessmentReason,
      verification: response.verification,
      enrichedQuery: enriched,
      researchBrief: brief ?? current.researchBrief,
      notes,
      compressedResearch,
      findings,
      feed,
    };
  }

  return { ...current, loading: false };
}

export default function App() {
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<WorkspaceSession | null>(null);
  sessionRef.current = session;

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  const handleStreamEvent = useCallback((event: ResearchStreamEvent) => {
    setSession((prev) => {
      if (!prev) return prev;
      let next = { ...prev };

      if (event.type === "phase") {
        const mapped = phaseFromNode(event.phase);
        if (mapped) next = { ...next, livePhase: mapped };
      }

      if (event.type === "brief") {
        const already = next.feed.some(
          (item) => item.body === "Research brief ready",
        );
        next = {
          ...next,
          researchBrief: event.research_brief,
          feed: already
            ? next.feed
            : [...next.feed, feedItem("status", "Research brief ready")],
        };
      }

      const activity = activityFromEvent(event);
      if (activity) {
        next = {
          ...next,
          activity: [...next.activity, activity].slice(-80),
        };
      }

      return next;
    });
  }, []);

  const handleStart = useCallback(
    async (query: string) => {
      setError(null);
      const next: WorkspaceSession = {
        threadId: "",
        query,
        loading: true,
        awaitingClarification: false,
        clarified: false,
        skippedClarification: false,
        activity: [],
        livePhase: "assess",
        feed: [
          feedItem("user_query", query, "Your question"),
          feedItem("status", "Starting research agent"),
        ],
      };
      setSession(next);
      sessionRef.current = next;

      try {
        const response = await startResearchStream(query, handleStreamEvent);
        setSession((prev) =>
          mergeFinalResponse(prev ?? next, response),
        );
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong";
        setError(message);
        setSession((prev) =>
          prev ? { ...prev, loading: false } : { ...next, loading: false },
        );
      }
    },
    [handleStreamEvent],
  );

  const handleClarify = useCallback(
    async (answer: string) => {
      const current = sessionRef.current;
      if (!current?.threadId) return;
      setError(null);

      const next: WorkspaceSession = {
        ...current,
        loading: true,
        awaitingClarification: false,
        clarified: true,
        livePhase: "brief",
        feed: [
          ...current.feed,
          feedItem("clarification_answer", answer, "Your answers"),
          feedItem("status", "Continuing with your answers"),
        ],
      };
      setSession(next);
      sessionRef.current = next;

      try {
        const response = await resumeResearchStream(
          current.threadId,
          answer,
          handleStreamEvent,
        );
        setSession((prev) => mergeFinalResponse(prev ?? next, response));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong";
        setError(message);
        setSession((prev) =>
          prev
            ? { ...prev, loading: false, awaitingClarification: true }
            : { ...next, loading: false, awaitingClarification: true },
        );
      }
    },
    [handleStreamEvent],
  );

  return (
    <div className="relative min-h-dvh bg-paper text-ink transition-colors dark:bg-ink dark:text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.12),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.16),_transparent_50%)]"
      />

      <Header onReset={reset} showReset={Boolean(session)} />

      <main className="relative">
        {!session ? (
          <ResearchHero onSubmit={handleStart} />
        ) : (
          <ResearchWorkspace
            session={session}
            error={error}
            onClarify={handleClarify}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
