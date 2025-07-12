import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';
import { useProject } from '@/hooks/useProjectQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useSemester } from '@/hooks/useSemesterQueries';

interface BreadcrumbItem {
    label: string;
    href?: string;
    isCurrentPage?: boolean;
    isEllipsis?: boolean;
}

const BreadcrumbNavigation: React.FC = () => {
    const location = useLocation();
    const params = useParams();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const breadcrumbRef = useRef<HTMLElement>(null);

    // Fetch data for dynamic breadcrumbs
    const projectId = params.projectId || params.id;
    const centerId = params.centerId || (params.id && params.projectId ? params.id : undefined);
    const semesterId = params.id && params.centerId ? params.id : undefined;

    const { data: project } = useProject(projectId || '');
    const { data: center } = useCenter(centerId || '');
    const { data: semester } = useSemester(semesterId || '');

    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];

        // Always start with Projects
        breadcrumbs.push({
            label: 'Projects',
            href: '/projects'
        });

        // Handle different route patterns
        if (pathSegments.includes('projects')) {
            const projectIndex = pathSegments.indexOf('projects');

            // Handle /projects/new
            if (pathSegments[projectIndex + 1] === 'new') {
                breadcrumbs.push({
                    label: 'New Project',
                    isCurrentPage: true
                });
            }
            // Handle /projects/:id/edit
            else if (pathSegments[projectIndex + 2] === 'edit') {
                const projectName = project?.name || 'Project';
                breadcrumbs.push({
                    label: projectName,
                    href: `/projects/${params.id}`
                });
                breadcrumbs.push({
                    label: 'Edit',
                    isCurrentPage: true
                });
            }
            // Handle /projects/:projectId/centers
            else if (pathSegments.includes('centers')) {
                const centerIndex = pathSegments.indexOf('centers');
                const projectName = project?.name || 'Project';

                breadcrumbs.push({
                    label: projectName,
                    href: `/projects/${params.projectId}/centers`
                });

                // Handle /projects/:projectId/centers/new
                if (pathSegments[centerIndex + 1] === 'new') {
                    breadcrumbs.push({
                        label: 'Centers',
                        href: `/projects/${params.projectId}/centers`
                    });
                    breadcrumbs.push({
                        label: 'New Center',
                        isCurrentPage: true
                    });
                }
                // Handle /projects/:projectId/centers/:id/edit
                else if (pathSegments[centerIndex + 2] === 'edit') {
                    const centerName = center?.name || 'Center';
                    breadcrumbs.push({
                        label: 'Centers',
                        href: `/projects/${params.projectId}/centers`
                    });
                    breadcrumbs.push({
                        label: centerName,
                        href: `/projects/${params.projectId}/centers/${params.id}`
                    });
                    breadcrumbs.push({
                        label: 'Edit',
                        isCurrentPage: true
                    });
                }
                // Handle semester routes /projects/:projectId/centers/:centerId/semesters
                else if (pathSegments.includes('semesters')) {
                    const semesterIndex = pathSegments.indexOf('semesters');
                    const centerName = center?.name || 'Center';

                    breadcrumbs.push({
                        label: 'Centers',
                        href: `/projects/${params.projectId}/centers`
                    });
                    breadcrumbs.push({
                        label: centerName,
                        href: `/projects/${params.projectId}/centers/${params.centerId}/semesters`
                    });

                    // Handle /projects/:projectId/centers/:centerId/semesters/new
                    if (pathSegments[semesterIndex + 1] === 'new') {
                        breadcrumbs.push({
                            label: 'Semesters',
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters`
                        });
                        breadcrumbs.push({
                            label: 'New Semester',
                            isCurrentPage: true
                        });
                    }
                    // Handle /projects/:projectId/centers/:centerId/semesters/:id/edit
                    else if (pathSegments[semesterIndex + 2] === 'edit') {
                        const semesterName = semester?.name || 'Semester';
                        breadcrumbs.push({
                            label: 'Semesters',
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters`
                        });
                        breadcrumbs.push({
                            label: semesterName,
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.id}`
                        });
                        breadcrumbs.push({
                            label: 'Edit',
                            isCurrentPage: true
                        });
                    }
                    // Handle /projects/:projectId/centers/:centerId/semesters (current page)
                    else {
                        breadcrumbs.push({
                            label: 'Semesters',
                            isCurrentPage: true
                        });
                    }
                }
                // Handle /projects/:projectId/centers (current page)
                else {
                    breadcrumbs.push({
                        label: 'Centers',
                        isCurrentPage: true
                    });
                }
            }
        }
        // Handle /registration-requests
        else if (pathSegments.includes('registration-requests')) {
            breadcrumbs.push({
                label: 'Registration Requests',
                isCurrentPage: true
            });
        }

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    // Function to determine if breadcrumbs should be collapsed
    const shouldCollapse = (breadcrumbs: BreadcrumbItem[]) => {
        // Always collapse if more than 5 items, or on smaller screens with more than 3 items
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        if (screenWidth < 768) {
            return breadcrumbs.length > 3; // Mobile: collapse if more than 3 items
        } else if (screenWidth < 1024) {
            return breadcrumbs.length > 4; // Tablet: collapse if more than 4 items
        } else {
            return breadcrumbs.length > 5; // Desktop: collapse if more than 5 items
        }
    };

    // Function to get collapsed breadcrumbs
    const getCollapsedBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
        if (!shouldCollapse(breadcrumbs)) {
            return breadcrumbs;
        }

        // Show first item, ellipsis, and last three items
        const firstItem = breadcrumbs[0];
        const lastTwoItems = breadcrumbs.slice(-3);

        return [
            firstItem,
            { label: '...', isEllipsis: true },
            ...lastTwoItems
        ];
    };

    const displayBreadcrumbs = shouldCollapse(breadcrumbs) && isCollapsed
        ? getCollapsedBreadcrumbs(breadcrumbs)
        : breadcrumbs;

    // Check if we should auto-collapse on mount and window resize
    useEffect(() => {
        const checkWidth = () => {
            if (breadcrumbRef.current && shouldCollapse(breadcrumbs)) {
                const containerWidth = breadcrumbRef.current.parentElement?.clientWidth || 0;
                const breadcrumbWidth = breadcrumbRef.current.scrollWidth;

                // Auto-collapse if breadcrumb is wider than container or meets collapse criteria
                const shouldAutoCollapse = breadcrumbWidth > containerWidth - 100 || shouldCollapse(breadcrumbs);
                setIsCollapsed(shouldAutoCollapse);
            } else {
                setIsCollapsed(false);
            }
        };

        // Check on mount and route changes with a delay to ensure DOM is rendered
        const timeoutId = setTimeout(checkWidth, 150);

        const handleResize = () => {
            setTimeout(checkWidth, 50); // Small delay for resize
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [breadcrumbs, location.pathname]);

    // Don't show breadcrumbs if we're just on the projects page
    if (breadcrumbs.length <= 1) {
        return null;
    }

    return (
        <Breadcrumb className="mb-4 w-full" ref={breadcrumbRef}>
            <BreadcrumbList className="flex-nowrap">
                {displayBreadcrumbs.map((breadcrumb, index) => (
                    <React.Fragment key={index}>
                        <BreadcrumbItem className="flex-shrink-0">
                            {breadcrumb.isEllipsis ? (
                                <BreadcrumbEllipsis
                                    className="cursor-pointer hover:bg-muted rounded px-1"
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    title={isCollapsed ? "Show all breadcrumbs" : "Collapse breadcrumbs"}
                                />
                            ) : breadcrumb.isCurrentPage ? (
                                <BreadcrumbPage className="max-w-[150px] truncate">
                                    {breadcrumb.label}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link
                                        to={breadcrumb.href!}
                                        className="max-w-[150px] truncate block"
                                        title={breadcrumb.label}
                                    >
                                        {breadcrumb.label}
                                    </Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {index < displayBreadcrumbs.length - 1 && <BreadcrumbSeparator className="flex-shrink-0" />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default BreadcrumbNavigation;
