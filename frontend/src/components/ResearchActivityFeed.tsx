import { Brain, Search, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  kind: "phase" | "thinking" | "search" | "tool" | "tool_result";
  title: string;
  body?: string;
  timestamp: number;
};

export function ResearchActivityFeed({
  items,
  loading,
}: {
  items: ActivityItem[];
  loading?: boolean;
}) {
  if (!items.length && !loading) return null;

  return (
    <section className="rounded-3xl border border-teal/15 bg-white/70 p-4 dark:border-teal-bright/15 dark:bg-white/5 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal dark:text-teal-bright">
          Agent activity
        </p>
        {loading ? (
          <span className="text-[11px] font-medium text-slate-muted dark:text-paper/45">
            Live
          </span>
        ) : null}
      </div>

      <div className="flex max-h-[28rem] flex-col gap-2.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border px-3 py-2.5",
                item.kind === "search" &&
                  "border-teal/25 bg-teal/5 dark:border-teal-bright/25 dark:bg-teal-bright/10",
                item.kind === "thinking" &&
                  "border-amber/25 bg-amber/5 dark:border-amber/30 dark:bg-amber/10",
                item.kind === "phase" &&
                  "border-ink/8 bg-white/80 dark:border-paper/10 dark:bg-white/5",
                (item.kind === "tool" || item.kind === "tool_result") &&
                  "border-ink/8 bg-mist/50 dark:border-paper/10 dark:bg-white/5",
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <ActivityIcon kind={item.kind} />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-muted dark:text-paper/50">
                  {item.title}
                </p>
              </div>
              {item.body ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90 dark:text-paper/85">
                  {item.body}
                </p>
              ) : null}
            </motion.article>
          ))}
        </AnimatePresence>

        {loading && items.length === 0 ? (
          <p className="text-sm text-slate-muted dark:text-paper/50">
            Waiting for the first agent step…
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const className = "h-3.5 w-3.5 shrink-0 text-teal dark:text-teal-bright";
  if (kind === "search") return <Search className={className} />;
  if (kind === "thinking") return <Brain className={className} />;
  return <Wrench className={className} />;
}
