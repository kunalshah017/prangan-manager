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
            className="mb-3 flex min-w-0 items-center gap-2"
        >
            {backTarget?.href ? (
                <Link
                    to={backTarget.href}
                    aria-label={backLabel}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span className="sm:hidden">Back</span>
                    <span className="hidden max-w-40 truncate sm:inline">
                        {backLabel}
                    </span>
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label={backLabel}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                            <BreadcrumbItem className="flex-shrink-0">
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
                                <BreadcrumbSeparator className="flex-shrink-0" />
                            )}
                        </Fragment>
                    ))}
                </BreadcrumbList>
            </div>
        </Breadcrumb>
    );
}
