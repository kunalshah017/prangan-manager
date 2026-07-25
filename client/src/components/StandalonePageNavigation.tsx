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
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl text-sm font-semibold text-orange-800 transition-colors hover:text-orange-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sm:hidden">Back</span>
        <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 text-sm text-gray-600"
      >
        <Link
          to={parentHref}
          className="shrink-0 hover:text-orange-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          {parentLabel}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span
          aria-current="page"
          className="min-w-0 truncate font-medium text-gray-900"
          title={currentLabel}
        >
          {currentLabel}
        </span>
      </nav>
    </div>
  );
}
