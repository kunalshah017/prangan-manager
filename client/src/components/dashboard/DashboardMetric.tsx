import type { LucideIcon } from "lucide-react";

export function DashboardMetric({
    label,
    value,
    detail,
    icon: Icon,
    compact = false,
}: {
    label: string;
    value: number | string;
    detail?: string;
    icon: LucideIcon;
    compact?: boolean;
}) {
    return (
        <div className={compact ? "py-3 sm:py-4" : "border-b border-border py-4 last:border-b-0"}>
            <div className={compact ? "flex items-start justify-between gap-2" : "flex items-start justify-between gap-4"}>
                <div className="min-w-0">
                    <p className={compact ? "text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs" : "text-xs font-semibold uppercase text-muted-foreground"}>{label}</p>
                    <p className={compact ? "mt-1 truncate text-xl font-semibold tabular-nums text-foreground sm:text-3xl" : "mt-1 text-3xl font-semibold tabular-nums text-foreground"}>{value}</p>
                    {detail && <p className={compact ? "mt-1 hidden text-xs leading-5 text-muted-foreground sm:block" : "mt-1 text-xs leading-5 text-muted-foreground"}>{detail}</p>}
                </div>
                <span className={compact ? "hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex" : "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>
        </div>
    );
}
