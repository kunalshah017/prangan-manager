import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface StandalonePageNavigationProps {
  parentHref: string;
  parentLabel: string;
  currentLabel: string;
  backLabel: string;
  className?: string;
}

export function StandalonePageNavigation({
  parentHref,
  parentLabel,
  currentLabel,
  backLabel,
  className,
}: StandalonePageNavigationProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Link
        to={parentHref}
        aria-label={backLabel}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sm:hidden">{parentLabel}</span>
        <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground sm:flex"
      >
        <Link
          to={parentHref}
          className="shrink-0 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {parentLabel}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span
          aria-current="page"
          className="min-w-0 truncate font-medium text-foreground"
          title={currentLabel}
        >
          {currentLabel}
        </span>
      </nav>
    </div>
  );
}
