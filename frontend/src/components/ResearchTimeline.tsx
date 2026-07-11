import {
  Check,
  Circle,
  FileSearch,
  FileText,
  Loader2,
  MessageCircleQuestion,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StepId =
  | "query"
  | "assess"
  | "clarify"
  | "brief"
  | "search"
  | "report";

export type StepStatus =
  | "pending"
  | "active"
  | "done"
  | "needs_input"
  | "upcoming";

export type ResearchStep = {
  id: StepId;
  label: string;
  description: string;
  status: StepStatus;
};

const ICONS: Record<StepId, typeof Sparkles> = {
  query: Sparkles,
  assess: FileSearch,
  clarify: MessageCircleQuestion,
  brief: FileText,
  search: Search,
  report: FileText,
};

export function ResearchTimeline({
  steps,
  className,
}: {
  steps: ResearchStep[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Research progress"
      className={cn("flex flex-col gap-0", className)}
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-muted dark:text-paper/45">
        Progress
      </p>
      <ol className="relative flex flex-col">
        {steps.map((step, index) => {
          const Icon = ICONS[step.id];
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px",
                    step.status === "done"
                      ? "bg-teal/50 dark:bg-teal-bright/40"
                      : "bg-ink/10 dark:bg-paper/15",
                  )}
                />
              ) : null}

              <StatusGlyph status={step.status} Icon={Icon} />

              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    step.status === "active" || step.status === "needs_input"
                      ? "text-teal dark:text-teal-bright"
                      : step.status === "done"
                        ? "text-ink dark:text-paper"
                        : "text-slate-muted dark:text-paper/40",
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs leading-relaxed",
                    step.status === "upcoming" || step.status === "pending"
                      ? "text-slate-muted/70 dark:text-paper/30"
                      : "text-slate-muted dark:text-paper/55",
                  )}
                >
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StatusGlyph({
  status,
  Icon,
}: {
  status: StepStatus;
  Icon: typeof Sparkles;
}) {
  if (status === "done") {
    return (
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal text-white dark:bg-teal-bright dark:text-ink">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal dark:border-teal-bright dark:bg-teal-bright/15 dark:text-teal-bright">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  if (status === "needs_input") {
    return (
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-amber bg-amber/15 text-amber">
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/10 text-slate-muted dark:border-paper/15 dark:text-paper/35",
        status === "upcoming" && "opacity-50",
      )}
    >
      {status === "upcoming" ? (
        <Circle className="h-3.5 w-3.5" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
    </span>
  );
}

/** Derive Gemini-style step statuses from session phase. */
export function buildSteps(args: {
  loading: boolean;
  awaitingClarification: boolean;
  clarified: boolean;
  hasBrief: boolean;
  skippedClarification: boolean;
}): ResearchStep[] {
  const {
    loading,
    awaitingClarification,
    clarified,
    hasBrief,
    skippedClarification,
  } = args;

  const assess: StepStatus = (() => {
    if (awaitingClarification || clarified || hasBrief || skippedClarification) {
      return "done";
    }
    if (loading) return "active";
    return "pending";
  })();

  const clarify: StepStatus = (() => {
    if (awaitingClarification) return "needs_input";
    if (clarified) return loading && !hasBrief ? "active" : "done";
    if (skippedClarification || hasBrief) return "done";
    if (loading && assess === "active") return "pending";
    return "pending";
  })();

  const brief: StepStatus = (() => {
    if (hasBrief) return "done";
    if (awaitingClarification) return "pending";
    if (loading && (clarified || skippedClarification || assess === "done")) {
      return "active";
    }
    if (loading && assess === "active") return "pending";
    return "pending";
  })();

  return [
    {
      id: "query",
      label: "Your question",
      description: "Captured research intent",
      status: "done",
    },
    {
      id: "assess",
      label: "Understand question",
      description:
        assess === "active" ? "Checking specificity…" : "Assessed clarity and scope",
      status: assess,
    },
    {
      id: "clarify",
      label: "Clarify details",
      description:
        clarify === "needs_input"
          ? "Waiting for your answers"
          : clarify === "active"
            ? "Incorporating your answers…"
            : clarify === "done"
              ? clarified
                ? "Answers incorporated"
                : "No clarification needed"
              : "May ask follow-ups",
      status: clarify,
    },
    {
      id: "brief",
      label: "Research brief",
      description:
        brief === "active"
          ? "Drafting scoped brief…"
          : brief === "done"
            ? "Scope ready"
            : "Define research plan",
      status: brief,
    },
    {
      id: "search",
      label: "Deep research",
      description: "Coming soon — multi-source search",
      status: "upcoming",
    },
    {
      id: "report",
      label: "Final report",
      description: "Coming soon — synthesized findings",
      status: "upcoming",
    },
  ];
}
