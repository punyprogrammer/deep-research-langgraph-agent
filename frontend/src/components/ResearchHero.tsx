import { useState } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { Spotlight } from "@/components/ui/spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

const PLACEHOLDERS = [
  "Compare solid-state vs lithium-ion battery advances in 2025",
  "What are the open problems in multi-agent research systems?",
  "Map the regulatory landscape for AI in healthcare EU vs US",
  "Summarize evidence on intermittent fasting and metabolic health",
];

export function ResearchHero({
  onSubmit,
  disabled,
}: {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  return (
    <section className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-6 sm:px-8">
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="oklch(0.75 0.12 180)"
      />
      <BackgroundBeams className="opacity-60 dark:opacity-80" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-teal dark:text-teal-bright sm:text-sm">
          Deep Research
        </p>

        <h1 className="font-display text-balance text-4xl font-bold leading-[1.1] tracking-tight text-ink dark:text-paper sm:text-5xl md:text-6xl">
          Ask deeper questions.
          <span className="mt-2 block text-teal dark:text-teal-bright">
            Scope research with clarity.
          </span>
        </h1>

        <div className="mt-5 max-w-xl">
          <TextGenerateEffect
            words="Turn a rough curiosity into a precise research brief — with clarification when your question needs sharpening."
            className="font-normal"
            duration={0.35}
          />
        </div>

        <div className="mt-10 w-full max-w-xl">
          <PlaceholdersAndVanishInput
            placeholders={PLACEHOLDERS}
            onChange={(e) => setQuery(e.target.value)}
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = query.trim();
              if (!trimmed || disabled) return;
              onSubmit(trimmed);
            }}
          />
          <p className="mt-3 text-xs text-slate-muted dark:text-paper/50">
            Press Enter to start. The agent may ask clarifying questions first.
          </p>
        </div>

        <div className="mt-8">
          <HoverBorderGradient
            as="button"
            type="button"
            disabled={disabled || !query.trim()}
            onClick={() => {
              const trimmed = query.trim();
              if (!trimmed || disabled) return;
              onSubmit(trimmed);
            }}
            containerClassName="rounded-full disabled:opacity-50"
            className="flex items-center gap-2 bg-ink px-6 py-2.5 text-sm font-semibold text-paper dark:bg-paper dark:text-ink"
          >
            Start research
          </HoverBorderGradient>
        </div>
      </div>
    </section>
  );
}
