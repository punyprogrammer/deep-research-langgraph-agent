import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MarkdownReport } from "@/components/MarkdownReport";
import {
  ResearchActivityFeed,
  type ActivityItem,
} from "@/components/ResearchActivityFeed";
import {
  buildSteps,
  ResearchTimeline,
  type LoadingPhase,
} from "@/components/ResearchTimeline";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  kind:
    | "user_query"
    | "status"
    | "assessment"
    | "clarification_question"
    | "clarification_answer"
    | "verification"
    | "brief";
  title?: string;
  body: string;
};

export type WorkspaceSession = {
  threadId: string;
  query: string;
  loading: boolean;
  awaitingClarification: boolean;
  clarified: boolean;
  skippedClarification: boolean;
  question?: string;
  assessmentReason?: string;
  verification?: string;
  enrichedQuery?: string;
  researchBrief?: string;
  notes?: string[];
  compressedResearch?: string;
  findings?: string;
  activity: ActivityItem[];
  livePhase?: LoadingPhase;
  feed: FeedItem[];
};

const LOADING_COPY: Record<LoadingPhase, string> = {
  assess: "Assessing your question and deciding next steps…",
  brief: "Drafting the research brief…",
  search: "Running deep research — watch tool calls below…",
  report: "Compressing notes into findings…",
};

function deriveLoadingPhase(
  elapsedMs: number,
  fromClarify: boolean,
): LoadingPhase {
  if (fromClarify) {
    if (elapsedMs < 12_000) return "brief";
    if (elapsedMs < 45_000) return "search";
    return "report";
  }
  if (elapsedMs < 8_000) return "assess";
  if (elapsedMs < 20_000) return "brief";
  if (elapsedMs < 55_000) return "search";
  return "report";
}

export function ResearchWorkspace({
  session,
  error,
  onClarify,
  onReset,
}: {
  session: WorkspaceSession;
  error: string | null;
  onClarify: (answer: string) => void;
  onReset: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedFindings, setCopiedFindings] = useState(false);
  const [fallbackPhase, setFallbackPhase] = useState<LoadingPhase>("assess");
  const feedEndRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const loadStartedAt = useRef<number | null>(null);

  const hasFindings = Boolean(session.findings?.trim());
  const loadingPhase = session.livePhase ?? fallbackPhase;

  const steps = buildSteps({
    loading: session.loading,
    awaitingClarification: session.awaitingClarification,
    clarified: session.clarified,
    hasBrief: Boolean(session.researchBrief),
    hasFindings,
    skippedClarification: session.skippedClarification,
    loadingPhase: session.loading ? loadingPhase : undefined,
  });

  useEffect(() => {
    if (!session.loading || session.livePhase) {
      if (!session.loading) loadStartedAt.current = null;
      return;
    }
    if (loadStartedAt.current == null) {
      loadStartedAt.current = Date.now();
    }
    const fromClarify = session.clarified;
    const tick = () => {
      const started = loadStartedAt.current ?? Date.now();
      setFallbackPhase(deriveLoadingPhase(Date.now() - started, fromClarify));
    };
    tick();
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, [session.loading, session.clarified, session.livePhase]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [
    session.feed.length,
    session.loading,
    session.awaitingClarification,
    session.findings,
    session.activity.length,
    loadingPhase,
  ]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.activity.length]);

  useEffect(() => {
    if (session.awaitingClarification) setAnswer("");
  }, [session.awaitingClarification, session.question]);

  async function copyText(text: string, which: "brief" | "findings") {
    await navigator.clipboard.writeText(text);
    if (which === "brief") {
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 1800);
    } else {
      setCopiedFindings(true);
      window.setTimeout(() => setCopiedFindings(false), 1800);
    }
  }

  const headline = hasFindings
    ? "Research complete"
    : session.researchBrief && !session.loading
      ? "Scoping complete"
      : session.awaitingClarification
        ? "Needs your input"
        : "Working on your research";

  const searchQueries = session.activity.filter((item) => item.kind === "search");

  return (
    <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 pt-2 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:px-8">
      <div className="lg:hidden">
        <MobileStepStrip steps={steps} />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 rounded-3xl border border-teal/15 bg-white/70 p-5 backdrop-blur dark:border-teal-bright/15 dark:bg-white/5">
          <ResearchTimeline steps={steps} />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal dark:text-teal-bright">
              Research session
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink dark:text-paper sm:text-3xl">
              {headline}
            </h2>
          </div>
          {session.loading ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/5 px-3 py-1.5 text-xs font-medium text-teal dark:border-teal-bright/25 dark:bg-teal-bright/10 dark:text-teal-bright">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Researching…
            </span>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-red-400/40 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {session.feed.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </AnimatePresence>

          {session.loading ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-dashed border-teal/30 bg-teal/5 px-4 py-4 dark:border-teal-bright/25 dark:bg-teal-bright/5"
            >
              <div className="flex items-center gap-3 text-sm text-teal dark:text-teal-bright">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>{LOADING_COPY[loadingPhase]}</span>
              </div>
            </motion.div>
          ) : null}

          {(session.loading || session.activity.length > 0) && (
            <>
              {searchQueries.length > 0 ? (
                <section className="rounded-3xl border border-teal/15 bg-white/70 p-4 dark:border-teal-bright/15 dark:bg-white/5 sm:p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal dark:text-teal-bright">
                    Queries & tool calls
                  </p>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/90 dark:text-paper/85">
                    {searchQueries.map((item) => (
                      <li key={item.id} className="leading-relaxed">
                        {item.body}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              <div>
                <ResearchActivityFeed
                  items={session.activity}
                  loading={session.loading}
                />
                <div ref={activityEndRef} />
              </div>
            </>
          )}

          {session.awaitingClarification && session.question ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-amber/35 bg-amber/5 p-4 sm:p-5 dark:border-amber/30 dark:bg-amber/10"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber">
                Your turn
              </p>
              <MarkdownReport content={session.question} className="mb-4" />
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={session.loading}
                rows={4}
                placeholder="Answer the clarifying questions…"
                className="mb-3 w-full resize-y rounded-2xl border border-teal/20 bg-white/90 px-4 py-3 text-sm text-ink outline-none ring-teal/30 transition placeholder:text-slate-muted/70 focus:ring-2 dark:border-teal-bright/20 dark:bg-ink/40 dark:text-paper dark:placeholder:text-paper/40"
              />
              <HoverBorderGradient
                as="button"
                type="button"
                disabled={session.loading || !answer.trim()}
                onClick={() => {
                  const trimmed = answer.trim();
                  if (!trimmed) return;
                  onClarify(trimmed);
                }}
                containerClassName="rounded-full disabled:opacity-50"
                className="bg-ink px-5 py-2 text-sm font-semibold text-paper dark:bg-paper dark:text-ink"
              >
                Continue
              </HoverBorderGradient>
            </motion.div>
          ) : null}

          {session.researchBrief ? (
            <ResultCard
              label="Research brief"
              onCopy={() => copyText(session.researchBrief!, "brief")}
              copied={copiedBrief}
            >
              <p className="text-base leading-relaxed text-ink dark:text-paper sm:text-lg">
                {session.researchBrief}
              </p>
            </ResultCard>
          ) : null}

          {hasFindings ? (
            <ResultCard
              label="Fully comprehensive findings"
              onCopy={() => copyText(session.findings!, "findings")}
              copied={copiedFindings}
              accent="findings"
            >
              <MarkdownReport content={session.findings!} />
            </ResultCard>
          ) : null}

          {(session.researchBrief || hasFindings) && !session.loading ? (
            <div className="pt-2">
              <HoverBorderGradient
                as="button"
                type="button"
                onClick={onReset}
                containerClassName="rounded-full"
                className="bg-ink px-5 py-2 text-sm font-semibold text-paper dark:bg-paper dark:text-ink"
              >
                New research
              </HoverBorderGradient>
            </div>
          ) : null}

          <div ref={feedEndRef} />
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  children,
  onCopy,
  copied,
  accent = "brief",
}: {
  label: string;
  children: ReactNode;
  onCopy: () => void;
  copied: boolean;
  accent?: "brief" | "findings";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-3xl border p-5 sm:p-6",
        accent === "brief"
          ? "border-teal/20 bg-gradient-to-br from-white via-mist/50 to-teal/10 dark:border-teal-bright/20 dark:from-white/10 dark:via-white/5 dark:to-teal/10"
          : "border-teal/25 bg-white/80 dark:border-teal-bright/25 dark:bg-white/5",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal dark:text-teal-bright">
          {label}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 px-3 py-1 text-xs font-medium text-ink transition hover:border-teal dark:border-teal-bright/25 dark:text-paper dark:hover:border-teal-bright"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-teal" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {children}
    </motion.div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const styles: Record<FeedItem["kind"], string> = {
    user_query:
      "border-teal/15 bg-white/80 dark:border-teal-bright/15 dark:bg-white/5",
    status: "border-transparent bg-transparent px-1 py-1 shadow-none",
    assessment:
      "border-ink/8 bg-white/60 dark:border-paper/10 dark:bg-white/5",
    clarification_question:
      "border-amber/30 bg-amber/5 dark:border-amber/25 dark:bg-amber/10",
    clarification_answer:
      "border-teal/20 bg-teal/5 dark:border-teal-bright/20 dark:bg-teal-bright/10",
    verification:
      "border-teal/20 bg-teal/5 dark:border-teal-bright/20 dark:bg-teal-bright/5",
    brief: "border-teal/25 bg-mist/80 dark:border-teal-bright/25 dark:bg-white/5",
  };

  if (item.kind === "status") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-medium uppercase tracking-[0.16em] text-slate-muted dark:text-paper/45"
      >
        {item.body}
      </motion.p>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl border px-4 py-3 sm:px-5 sm:py-4",
        styles[item.kind],
      )}
    >
      {item.title ? (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-muted dark:text-paper/45">
          {item.title}
        </p>
      ) : null}
      {item.kind === "clarification_question" ? (
        <MarkdownReport content={item.body} />
      ) : (
        <p className="text-sm leading-relaxed text-ink/90 dark:text-paper/90 sm:text-[0.95rem]">
          {item.body}
        </p>
      )}
    </motion.article>
  );
}

function MobileStepStrip({
  steps,
}: {
  steps: ReturnType<typeof buildSteps>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {steps.map((step) => (
        <div
          key={step.id}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
            step.status === "done" &&
              "border-teal/30 bg-teal/10 text-teal dark:border-teal-bright/30 dark:bg-teal-bright/10 dark:text-teal-bright",
            (step.status === "active" || step.status === "needs_input") &&
              "border-teal bg-teal/15 text-teal dark:border-teal-bright dark:text-teal-bright",
            (step.status === "pending" || step.status === "upcoming") &&
              "border-ink/10 text-slate-muted dark:border-paper/15 dark:text-paper/40",
          )}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}
