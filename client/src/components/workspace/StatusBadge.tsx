import { cn } from "@/lib/utils";

export type StatusTone = "running" | "draft" | "inactive" | "ended";

const toneClasses: Record<StatusTone, { badge: string; dot: string }> = {
  running: { badge: "bg-success/12 text-success-foreground", dot: "bg-success" },
  draft: { badge: "bg-warning/20 text-warning-foreground", dot: "bg-warning" },
  inactive: { badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  ended: { badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/40" },
};

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  const classes = toneClasses[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5",
        classes.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

