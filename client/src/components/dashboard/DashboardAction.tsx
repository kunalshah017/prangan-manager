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

// A launcher tile: icon over a short label, the whole tile is the target.
export function DashboardAction({ action }: { action: DashboardActionItem }) {
    const Icon = icons[action.icon];

    return (
        <Link
            to={action.href}
            aria-label={action.label}
            className="group grid h-[4.5rem] min-w-0 grid-rows-[1.5rem_2rem] content-center items-start justify-items-center gap-1 rounded-xl border border-border bg-card px-2 text-center transition-colors hover:border-primary/30 hover:bg-accent/60 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-20 motion-reduce:transition-none"
        >
            <span className="flex h-6 w-6 items-center justify-center self-start text-muted-foreground transition-colors group-hover:text-primary group-active:text-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="line-clamp-2 flex h-8 items-center justify-center text-xs font-semibold leading-4 text-foreground sm:text-[0.8125rem]">
                {action.mobileLabel}
            </span>
        </Link>
    );
}
