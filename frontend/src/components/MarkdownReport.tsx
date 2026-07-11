import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

const components: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-teal underline decoration-teal/40 underline-offset-2 transition hover:decoration-teal dark:text-teal-bright dark:decoration-teal-bright/40 dark:hover:decoration-teal-bright"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 font-display text-2xl font-semibold text-ink first:mt-0 dark:text-paper">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 font-display text-xl font-semibold text-ink first:mt-0 dark:text-paper">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold text-ink first:mt-0 dark:text-paper">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-ink/90 last:mb-0 dark:text-paper/90">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-ink/90 last:mb-0 dark:text-paper/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-ink/90 last:mb-0 dark:text-paper/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink dark:text-paper">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-teal/40 pl-4 text-ink/80 italic dark:border-teal-bright/40 dark:text-paper/75">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-xl bg-ink/5 p-3 text-sm dark:bg-white/10">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-ink/5 px-1.5 py-0.5 text-[0.9em] dark:bg-white/10">
        {children}
      </code>
    );
  },
  hr: () => <hr className="my-5 border-teal/15 dark:border-teal-bright/15" />,
};

/**
 * Turn common citation lines into markdown links when the model emits
 * `[1] Title: https://example.com` instead of `[Title](url)`.
 */
export function enhanceReportMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      const citation = line.match(
        /^(\s*(?:[-*]\s+)?(?:\[\d+\]\s*)?)(.+?):\s+(https?:\/\/\S+)\s*$/,
      );
      if (citation) {
        const [, prefix, title, url] = citation;
        return `${prefix}[${title.trim()}](${url})`;
      }

      const bareUrl = line.match(/^(https?:\/\/\S+)\s*$/);
      if (bareUrl) {
        return `[${bareUrl[1]}](${bareUrl[1]})`;
      }

      return line;
    })
    .join("\n");
}

export function MarkdownReport({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown-report text-[0.95rem] sm:text-base", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {enhanceReportMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
