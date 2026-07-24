import {
    BookOpen,
    CalendarCheck,
    CalendarDays,
    ClipboardList,
    Inbox,
    Library,
    UserCheck,
    UserCog,
    Users,
    WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { DashboardAction as DashboardActionItem } from "@/lib/dashboard";

const icons = {
    users: Users,
    "calendar-check": CalendarCheck,
    "calendar-days": CalendarDays,
    "book-open": BookOpen,
    "clipboard-list": ClipboardList,
    library: Library,
    "user-check": UserCheck,
    "wallet-cards": WalletCards,
    "user-cog": UserCog,
    inbox: Inbox,
};

export function DashboardAction({
    action,
    compact = false,
    variant = "row",
}: {
    action: DashboardActionItem;
    compact?: boolean;
    variant?: "row" | "tile";
}) {
    const Icon = icons[action.icon];

    if (variant === "tile") {
        return (
            <Link
                to={action.href}
                aria-label={action.label}
                className="group grid h-[4.5rem] min-w-0 grid-rows-[1.5rem_2rem] content-center items-start justify-items-center gap-1 rounded-lg border border-border bg-card px-2 text-center shadow-sm transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <span className="flex h-6 w-6 items-center justify-center self-start text-muted-foreground transition-colors group-active:text-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="line-clamp-2 flex h-8 items-center justify-center text-[0.6875rem] font-semibold leading-4 text-foreground min-[380px]:text-xs">
                    {action.mobileLabel}
                </span>
            </Link>
        );
    }

    return (
        <Link
            to={action.href}
            className="group flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                {!compact && (
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {action.description}
                    </span>
                )}
            </span>
        </Link>
    );
}