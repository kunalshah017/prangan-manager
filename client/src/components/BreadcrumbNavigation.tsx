import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

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
import { buildBreadcrumbs, type AppBreadcrumb } from "@/lib/breadcrumbs";

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

    if (breadcrumbs.length <= 1) return null;

    return (
        <div
            ref={scrollContainerRef}
            className="mb-2 flex min-h-9 w-full items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
            <Breadcrumb className="w-max min-w-full">
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
            </Breadcrumb>
        </div>
    );
}
