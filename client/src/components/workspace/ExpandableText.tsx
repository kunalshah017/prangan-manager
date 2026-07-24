import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ExpandableText({
  text,
  collapseAfter = 140,
  leadingIcon,
  className,
}: {
  text: string;
  collapseAfter?: number;
  leadingIcon?: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const canExpand = text.length > collapseAfter;

  return (
    <span className={cn("block", className)}>
      <span className="flex items-start gap-2">
        {leadingIcon}
        <span
          id={contentId}
          className={cn(
            "min-w-0",
            canExpand && !expanded && "line-clamp-3 sm:line-clamp-2",
          )}
        >
          {text}
        </span>
      </span>
      {canExpand && (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </span>
  );
}
