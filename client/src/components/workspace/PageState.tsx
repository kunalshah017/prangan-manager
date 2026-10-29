import type { ReactNode } from "react";
import { ArrowLeft, RefreshCw, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
  backHref?: string;
  backLabel?: string;
}

export function ErrorState({ title, description, onRetry, backHref, backLabel }: ErrorStateProps) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center py-8" aria-live="polite">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-base leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={onRetry} className={cn(buttonVariants(), "min-h-12 gap-2 text-base")}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          {backHref && backLabel && (
            <Link to={backHref} className={cn(buttonVariants({ variant: "ghost" }), "min-h-12 gap-2 text-base")}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center" aria-live="polite">
      <Icon className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-base leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ListPageSkeleton({ label, rows = 3, hero = false }: { label: string; rows?: number; hero?: boolean }) {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      {hero && <Skeleton className="aspect-[16/9] w-full rounded-xl sm:aspect-[3/1]" />}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 p-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
