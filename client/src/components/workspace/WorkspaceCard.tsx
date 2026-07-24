import type { ReactNode } from "react";
import { ArrowUpRight, Clock3, Pencil } from "lucide-react";
import { Link } from "react-router-dom";

interface WorkspaceCardProps {
    title: string;
    entityLabel: string;
    mediaSrc: string;
    mediaAlt: string;
    href: string;
    openLabel: string;
    detail: ReactNode;
    updatedAt: string;
    status?: ReactNode;
    editHref?: string;
    editLabel?: string;
}

export function WorkspaceCard({
    title,
    entityLabel,
    mediaSrc,
    mediaAlt,
    href,
    openLabel,
    detail,
    updatedAt,
    status,
    editHref,
    editLabel,
}: WorkspaceCardProps) {
    return (
        <article className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:flex sm:min-h-56 motion-reduce:transform-none motion-reduce:transition-none">
            <div className="relative h-[6.5rem] shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-44">
                <img
                    src={mediaSrc}
                    alt={mediaAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
                />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-12 sm:bg-gradient-to-l" aria-hidden="true" />
                <span className="absolute left-3 top-3 rounded-md border border-white/35 bg-black/45 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                    {entityLabel}
                </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-foreground">{title}</h2>
                            {status && <div className="mt-2">{status}</div>}
                        </div>
                        {editHref && editLabel && (
                            <Link
                                to={editHref}
                                aria-label={editLabel}
                                title={editLabel}
                                className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
                            >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                    <div className="mt-3 text-sm leading-5 text-muted-foreground sm:mt-4 sm:leading-6">
                        {detail}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border px-4 py-3 sm:px-5">
                    <div className="flex items-center text-xs text-muted-foreground">
                        <Clock3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        <span className="tabular-nums">Updated {updatedAt}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold leading-5 text-primary">
                        {openLabel}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                </div>
            </div>

            <Link
                to={href}
                aria-label={`${openLabel}: ${title}`}
                className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
                <span className="sr-only">{openLabel}: {title}</span>
            </Link>
        </article>
    );
}
