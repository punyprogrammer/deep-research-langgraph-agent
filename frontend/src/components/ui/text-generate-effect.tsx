import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");

  useEffect(() => {
    void animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration ? duration : 1,
        delay: stagger(0.08),
      },
    );
  }, [animate, duration, filter, words]);

  return (
    <div className={cn("font-medium", className)}>
      <motion.div ref={scope} className="leading-relaxed tracking-wide">
        {wordsArray.map((word, idx) => (
          <motion.span
            key={word + idx}
            className="text-ink/75 opacity-0 dark:text-paper/75"
            style={{
              filter: filter ? "blur(8px)" : "none",
            }}
          >
            {word}{" "}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};
