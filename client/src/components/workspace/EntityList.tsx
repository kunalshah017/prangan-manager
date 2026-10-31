import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface EntityListProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function EntityList({ label, children, className }: EntityListProps) {
  return (
    <ul
      aria-label={label}
      className={cn("divide-y divide-border overflow-hidden rounded-xl border border-border bg-card", className)}
    >
      {children}
    </ul>
  );
}

interface EntityRowProps {
  href?: string;
  title: string;
  leading?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
}

// A row opens its entity; the whole row is the target and the chevron says so.
// Editing lives on the entity's own page, so rows never look like form fields.
// Without href the row is shown for reference only: muted, with nothing to tap.
export function EntityRow({ href, title, leading, meta, status }: EntityRowProps) {
  if (!href) {
    return (
      <li className="flex min-h-[4.5rem] items-center gap-3 px-3 py-3 opacity-60 sm:gap-4 sm:px-4">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-base font-semibold text-foreground">{title}</span>
            {status}
          </div>
          {meta && <div className="mt-0.5 text-sm leading-5 text-muted-foreground">{meta}</div>}
        </div>
      </li>
    );
  }

  return (
    <li className="group relative flex min-h-[4.5rem] items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/60 focus-within:bg-accent/60 active:bg-accent sm:gap-4 sm:px-4 motion-reduce:transition-none">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={href}
            className="truncate text-base font-semibold text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {title}
          </Link>
          {status}
        </div>
        {meta && <div className="mt-0.5 text-sm leading-5 text-muted-foreground">{meta}</div>}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary group-focus-within:text-primary motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden="true"
      />
    </li>
  );
}
