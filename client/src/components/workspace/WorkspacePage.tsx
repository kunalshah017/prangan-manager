import type { ReactNode } from "react";

import DoodleBackground from "@/components/DoodleBackground";
import { PageTitle } from "@/components/navigation/PageTitle";
import { cn } from "@/lib/utils";

interface WorkspacePageProps {
    children: ReactNode;
    className?: string;
    withMobileAction?: boolean;
}

interface WorkspacePageHeaderProps {
    title: string;
    description: ReactNode;
    badge?: string;
    action?: ReactNode;
    compact?: boolean;
}

export function WorkspacePage({ children, className, withMobileAction = false }: WorkspacePageProps) {
    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={6} />
            <div
                className={cn(
                    "relative z-10 mx-auto w-full max-w-6xl pb-8",
                    withMobileAction && "pb-28 sm:pb-8",
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}

// The title shows in the top navigation bar. Plain-text descriptions are
// explanatory copy and are left out; a description built from data (dates, an
// address, a level) stays as one compact line with the badge and actions.
export function WorkspacePageHeader({
    title,
    description,
    badge,
    action,
}: WorkspacePageHeaderProps) {
    const meta = typeof description === "string" ? null : description;
    if (!meta && !badge && !action) return <PageTitle title={title} />;

    return (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PageTitle title={title} />
            {(meta || badge) && (
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm leading-5 text-muted-foreground">
                    {badge && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.8125rem] font-semibold text-primary">
                            {badge}
                        </span>
                    )}
                    {meta && <div className="min-w-0">{meta}</div>}
                </div>
            )}
            {action}
        </header>
    );
}
