import {
    BookOpen,
    CalendarCheck,
    CalendarDays,
    ClipboardList,
    GraduationCap,
    Inbox,
    LayoutDashboard,
    Layers,
    Library,
    UserCheck,
    UserCog,
    Users,
    WalletCards,
    type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { NavigationIcon, NavigationLink } from "@/lib/navigation";

const ICON_COMPONENTS: Record<NavigationIcon, LucideIcon> = {
    "layout-dashboard": LayoutDashboard,
    "graduation-cap": GraduationCap,
    "book-open": BookOpen,
    "clipboard-list": ClipboardList,
    "calendar-check": CalendarCheck,
    "calendar-days": CalendarDays,
    users: Users,
    "user-check": UserCheck,
    "wallet-cards": WalletCards,
    library: Library,
    layers: Layers,
    "user-cog": UserCog,
    inbox: Inbox,
};

interface NavItemProps {
    item: NavigationLink;
    onNavigate?: () => void;
    compact?: boolean;
}
export function NavItem({ item, onNavigate, compact = false }: NavItemProps) {
    const location = useLocation();
    const isDashboard = item.icon === "layout-dashboard";
    const isActive = isDashboard
        ? location.pathname === item.href
        : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
    const Icon = ICON_COMPONENTS[item.icon];

    return (
        <Link
            to={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
                "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
                isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                compact && "px-2.5 text-xs",
            )}
        >
            <span
                className={cn(
                    "absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0",
                    isActive && "opacity-100",
                )}
                aria-hidden="true"
            />
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </Link>
    );
}
