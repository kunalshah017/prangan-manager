import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCenter } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { cn } from "@/lib/utils";
import {
    buildBreadcrumbs,
    getBreadcrumbBackTarget,
    type AppBreadcrumb,
} from "@/lib/breadcrumbs";

const shouldCollapse = (breadcrumbCount: number) => {
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (screenWidth < 480) return breadcrumbCount > 4;
    if (screenWidth < 768) return breadcrumbCount > 6;
    return breadcrumbCount > 8;
};

const getCollapsedBreadcrumbs = (breadcrumbs: AppBreadcrumb[]) => [
    { label: "...", isEllipsis: true },
    ...breadcrumbs.slice(-2),
];

export default function BreadcrumbNavigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const projectId =
        params.projectId ||
        (location.pathname.match(/^\/projects\/[^/]+\/edit$/) ? params.id : undefined);
    const centerId =
        params.centerId ||
        (location.pathname.match(/\/centers\/[^/]+\/edit$/) ? params.id : undefined);
    const semesterId =
        params.semesterId ||
        (location.pathname.match(/\/semesters\/[^/]+\/edit$/) ? params.id : undefined);

    const { data: project } = useProject(projectId || "");
    const { data: center } = useCenter(centerId || "");
    const { data: semester } = useSemester(semesterId || "");

    const breadcrumbs = buildBreadcrumbs({
        pathname: location.pathname,
        params,
        names: {
            projectName: project?.name,
            centerName: center?.name,
            semesterName: semester?.name,
        },
    });
    const breadcrumbCount = breadcrumbs.length;
    const backTarget = getBreadcrumbBackTarget(breadcrumbs);
    const backLabel = backTarget
        ? `Back to ${backTarget.label}`
        : "Go back";
    const collapsible = shouldCollapse(breadcrumbCount);
    const displayBreadcrumbs =
        collapsible && isCollapsed ? getCollapsedBreadcrumbs(breadcrumbs) : breadcrumbs;
    const breadcrumbSignature = displayBreadcrumbs
        .map((breadcrumb) => breadcrumb.label)
        .join("|");

    const scrollToEnd = () => {
        scrollContainerRef.current?.scrollTo({
            left: scrollContainerRef.current.scrollWidth,
            behavior: "auto",
        });
    };

    useEffect(() => {
        const updateCollapse = () => {
            setIsCollapsed(shouldCollapse(breadcrumbCount));
            window.requestAnimationFrame(scrollToEnd);
        };
        const timeoutId = window.setTimeout(updateCollapse, 150);
        window.addEventListener("resize", updateCollapse);
        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener("resize", updateCollapse);
        };
    }, [breadcrumbCount, location.pathname]);

    useEffect(() => {
        const timeoutId = window.setTimeout(scrollToEnd, 100);
        return () => window.clearTimeout(timeoutId);
    }, [breadcrumbSignature, location.pathname]);

    if (!breadcrumbs.length) return null;

    return (
        <Breadcrumb
            aria-label="Page navigation"
            // Phones navigate back through the trail itself; a lone crumb only
            // repeats the page title, so it is hidden there.
            className={cn(
                "relative z-20 mb-3 min-w-0 items-center gap-1 sm:mb-4 sm:flex",
                "max-sm:w-fit max-sm:max-w-full max-sm:rounded-full max-sm:bg-background/70 max-sm:px-3 max-sm:shadow-sm max-sm:backdrop-blur-md",
                breadcrumbCount > 1 ? "flex" : "hidden",
            )}
        >
            {backTarget?.href ? (
                <Link
                    to={backTarget.href}
                    aria-label={backLabel}
                    className="hidden h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex motion-reduce:transition-none"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span className="max-w-40 truncate">{backLabel}</span>
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label={backLabel}
                    className="hidden h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex motion-reduce:transition-none"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                </button>
            )}
            <div
                ref={scrollContainerRef}
                className="flex min-h-9 min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                <BreadcrumbList className="flex-nowrap">
                    {displayBreadcrumbs.map((breadcrumb, index) => (
                        <Fragment key={`${breadcrumb.label}-${index}`}>
                            <BreadcrumbItem className={cn("flex-shrink-0", breadcrumb.isCurrentPage && "max-sm:hidden")}>
                                {breadcrumb.isEllipsis ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsCollapsed(false)}
                                        className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="Show all breadcrumbs"
                                    >
                                        <BreadcrumbEllipsis />
                                    </button>
                                ) : breadcrumb.isCurrentPage ? (
                                    <BreadcrumbPage className="max-w-[120px] sm:max-w-[150px] truncate" title={breadcrumb.label}>
                                        {breadcrumb.label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link
                                            to={breadcrumb.href!}
                                            className="block max-w-[120px] sm:max-w-[150px] truncate"
                                            title={breadcrumb.label}
                                        >
                                            {breadcrumb.label}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {index < displayBreadcrumbs.length - 1 && (
                                <BreadcrumbSeparator
                                    className={cn(
                                        "flex-shrink-0",
                                        index === displayBreadcrumbs.length - 2 && "max-sm:hidden",
                                    )}
                                />
                            )}
                        </Fragment>
                    ))}
                </BreadcrumbList>
            </div>
        </Breadcrumb>
    );
}
