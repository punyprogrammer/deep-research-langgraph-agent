import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { ResearchHero } from "@/components/ResearchHero";
import {
  ResearchWorkspace,
  type FeedItem,
  type WorkspaceSession,
} from "@/components/ResearchWorkspace";
import {
  ApiError,
  resumeResearch,
  startResearch,
  type ResearchResponse,
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

export default function App() {
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  const applyResponse = useCallback(
    (response: ResearchResponse, current: WorkspaceSession) => {
      if (!("threadId" in response) || !response.threadId) {
        setError("Unexpected response from research API");
        setSession({ ...current, loading: false });
        return;
      }

      if (response.status === "needs_clarification") {
        const feed = [...current.feed];
        if (response.assessmentReason) {
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

        setSession({
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
        });
        return;
      }

      if (response.status === "complete") {
        const feed = [...current.feed];
        const skipped =
          current.skippedClarification ||
          (!current.clarified && !current.awaitingClarification);

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
        feed.push(feedItem("status", "Research brief ready"));

        setSession({
          ...current,
          threadId: response.threadId,
          query: response.query || current.query,
          loading: false,
          awaitingClarification: false,
          clarified: current.clarified,
          skippedClarification: skipped && !current.clarified,
          assessmentReason:
            response.assessmentReason ?? current.assessmentReason,
          verification: response.verification,
          enrichedQuery: enriched,
          researchBrief:
            "research_brief" in response ? response.research_brief : undefined,
          feed,
        });
        return;
      }

      setError(`Unhandled status: ${response.status}`);
      setSession({ ...current, loading: false });
    },
    [],
  );

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
        feed: [
          feedItem("user_query", query, "Your question"),
          feedItem("status", "Starting research agent"),
        ],
      };
      setSession(next);

      try {
        const response = await startResearch(query);
        applyResponse(response, next);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong";
        setError(message);
        setSession({ ...next, loading: false });
      }
    },
    [applyResponse],
  );

  const handleClarify = useCallback(
    async (answer: string) => {
      if (!session?.threadId) return;
      setError(null);

      const next: WorkspaceSession = {
        ...session,
        loading: true,
        awaitingClarification: false,
        clarified: true,
        feed: [
          ...session.feed,
          feedItem("clarification_answer", answer, "Your answers"),
          feedItem("status", "Continuing with your answers"),
        ],
      };
      setSession(next);

      try {
        const response = await resumeResearch(session.threadId, answer);
        applyResponse(response, next);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong";
        setError(message);
        setSession({
          ...next,
          loading: false,
          awaitingClarification: true,
        });
      }
    },
    [session, applyResponse],
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
