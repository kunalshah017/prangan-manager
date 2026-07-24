import type { ReactNode } from "react";

import DoodleBackground from "@/components/DoodleBackground";
import { cn } from "@/lib/utils";

interface WorkspacePageProps {
    children: ReactNode;
    className?: string;
}

interface WorkspacePageHeaderProps {
    title: string;
    description: ReactNode;
    badge?: string;
    action?: ReactNode;
    compact?: boolean;
}

export function WorkspacePage({ children, className }: WorkspacePageProps) {
    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={6} />
            <div
                className={cn(
                    "relative z-10 mx-auto w-full max-w-6xl pb-8",
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}

export function WorkspacePageHeader({
    title,
    description,
    badge,
    action,
    compact = false,
}: WorkspacePageHeaderProps) {
    return (
        <header className={cn("border-b border-border", compact ? "pb-4 sm:pb-5" : "pb-6")}>
            <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between", compact ? "gap-3 sm:gap-4" : "gap-5")}>
                <div className="min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className={cn("font-semibold text-foreground", compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl")}>
                            {title}
                        </h1>
                        {badge && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                {badge}
                            </span>
                        )}
                    </div>
                    <div className={cn("text-sm text-muted-foreground", compact ? "mt-1 leading-5" : "mt-2 leading-6")}>
                        {description}
                    </div>
                </div>
                {action}
            </div>
        </header>
    );
}
