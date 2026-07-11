import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function Header({
  onReset,
  showReset,
}: {
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
      <button
        type="button"
        onClick={onReset}
        className="font-display text-lg tracking-tight text-ink transition hover:text-teal dark:text-paper dark:hover:text-teal-bright sm:text-xl"
      >
        Deep Research
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className={cn(
              "rounded-full border border-teal/25 px-3 py-1.5 text-xs font-medium text-ink/80 transition hover:border-teal hover:text-teal dark:border-teal-bright/25 dark:text-paper/80 dark:hover:border-teal-bright dark:hover:text-teal-bright sm:text-sm",
            )}
          >
            New research
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
