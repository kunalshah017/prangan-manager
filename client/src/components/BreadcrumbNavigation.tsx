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
import { useStudent } from '@/hooks/useStudentQueries';

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Fetch data for dynamic breadcrumbs
    const projectId = params.projectId || params.id;
    const centerId = params.centerId || (params.id && params.projectId ? params.id : undefined);
    const semesterId = params.semesterId || (params.id && params.centerId ? params.id : undefined);
    const studentId = params.id && location.pathname.includes('/students/') ? params.id : undefined;

    // Get dashboard context for student pages and attendance pages
    const dashboardContext = (location.pathname.includes('/students') || location.pathname.includes('/attendance') || location.pathname.includes('/student-attendance') || location.pathname.includes('/registration-requests')) ?
        (() => {
            try {
                const stored = sessionStorage.getItem('dashboardContext');
                return stored ? JSON.parse(stored) : null;
            } catch {
                return null;
            }
        })() : null;

    // Use context project ID if available for student pages
    const contextProjectId = dashboardContext?.projectId;
    const contextCenterId = dashboardContext?.centerId;
    const contextSemesterId = dashboardContext?.semesterId;

    const { data: project } = useProject(projectId || contextProjectId || '');
    const { data: center } = useCenter(centerId || contextCenterId || '');
    const { data: semester } = useSemester(semesterId || contextSemesterId || '');
    const { data: student } = useStudent(studentId || '');

    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];

        // Handle different route patterns
        if (pathSegments.includes('projects')) {
            const projectIndex = pathSegments.indexOf('projects');

            // Handle /projects (root projects page)
            if (pathSegments.length === 1 || (pathSegments.length === 2 && pathSegments[1] === 'new')) {
                if (pathSegments[projectIndex + 1] === 'new') {
                    breadcrumbs.push({
                        label: 'Projects',
                        href: '/projects'
                    });
                    breadcrumbs.push({
                        label: 'New Project',
                        isCurrentPage: true
                    });
                } else {
                    breadcrumbs.push({
                        label: 'Projects',
                        isCurrentPage: true
                    });
                }
            }
            // Handle /projects/:id/edit
            else if (pathSegments[projectIndex + 2] === 'edit') {
                const projectName = project?.name || 'Project';
                breadcrumbs.push({
                    label: 'Projects',
                    href: '/projects'
                });
                breadcrumbs.push({
                    label: projectName,
                    href: `/projects/${params.id}`
                });
                breadcrumbs.push({
                    label: 'Edit Project',
                    isCurrentPage: true
                });
            }
            // Handle /projects/:projectId/centers
            else if (pathSegments.includes('centers')) {
                const centerIndex = pathSegments.indexOf('centers');
                const projectName = project?.name || 'Project';

                breadcrumbs.push({
                    label: 'Projects',
                    href: '/projects'
                });

                // Handle /projects/:projectId/centers/new
                if (pathSegments[centerIndex + 1] === 'new') {
                    breadcrumbs.push({
                        label: projectName,
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
                        label: projectName,
                        href: `/projects/${params.projectId}/centers`
                    });
                    breadcrumbs.push({
                        label: centerName,
                        href: `/projects/${params.projectId}/centers/${params.id}`
                    });
                    breadcrumbs.push({
                        label: 'Edit Center',
                        isCurrentPage: true
                    });
                }
                // Handle semester routes /projects/:projectId/centers/:centerId/semesters
                else if (pathSegments.includes('semesters')) {
                    const semesterIndex = pathSegments.indexOf('semesters');
                    const centerName = center?.name || 'Center';

                    breadcrumbs.push({
                        label: projectName,
                        href: `/projects/${params.projectId}/centers`
                    });

                    // Handle /projects/:projectId/centers/:centerId/semesters/new
                    if (pathSegments[semesterIndex + 1] === 'new') {
                        breadcrumbs.push({
                            label: centerName,
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
                            label: centerName,
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters`
                        });
                        breadcrumbs.push({
                            label: semesterName,
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.id}`
                        });
                        breadcrumbs.push({
                            label: 'Edit Semester',
                            isCurrentPage: true
                        });
                    }
                    // Handle /projects/:projectId/centers/:centerId/semesters/:semesterId/dashboard
                    else if (pathSegments[semesterIndex + 2] === 'dashboard') {
                        const semesterName = semester?.name || 'Semester';
                        breadcrumbs.push({
                            label: centerName,
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters`
                        });
                        breadcrumbs.push({
                            label: semesterName,
                            href: `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.semesterId}/dashboard`
                        });

                        // Handle dashboard sub-routes (students)
                        if (pathSegments[semesterIndex + 4] === 'students') {
                            const studentIndex = semesterIndex + 4;

                            // Handle /dashboard/students/new
                            if (pathSegments[studentIndex + 1] === 'new') {
                                breadcrumbs.push({
                                    label: 'Students',
                                    href: `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.semesterId}/dashboard/students`
                                });
                                breadcrumbs.push({
                                    label: 'New Student',
                                    isCurrentPage: true
                                });
                            }
                            // Handle /dashboard/students/:id/edit
                            else if (pathSegments[studentIndex + 2] === 'edit') {
                                const studentName = student?.name || 'Student';
                                breadcrumbs.push({
                                    label: 'Students',
                                    href: `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.semesterId}/dashboard/students`
                                });
                                breadcrumbs.push({
                                    label: studentName,
                                    href: `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.semesterId}/dashboard/students/${params.id}`
                                });
                                breadcrumbs.push({
                                    label: 'Edit Student',
                                    isCurrentPage: true
                                });
                            }
                            // Handle /dashboard/students (current page)
                            else {
                                breadcrumbs.push({
                                    label: 'Students',
                                    isCurrentPage: true
                                });
                            }
                        }
                        // Handle dashboard sub-routes (attendance)
                        else if (pathSegments[semesterIndex + 4] === 'attendance') {
                            // Handle /dashboard/attendance/view
                            if (pathSegments[semesterIndex + 5] === 'view') {
                                breadcrumbs.push({
                                    label: 'View Attendance',
                                    isCurrentPage: true
                                });
                            }
                            // Handle /dashboard/attendance/mark
                            else if (pathSegments[semesterIndex + 5] === 'mark') {
                                breadcrumbs.push({
                                    label: 'Mark Attendance',
                                    isCurrentPage: true
                                });
                            }
                        }
                        // Handle dashboard sub-routes (student-attendance)
                        else if (pathSegments[semesterIndex + 4] === 'student-attendance') {
                            // Handle /dashboard/student-attendance/view
                            if (pathSegments[semesterIndex + 5] === 'view') {
                                breadcrumbs.push({
                                    label: 'View Student Attendance',
                                    isCurrentPage: true
                                });
                            }
                            // Handle /dashboard/student-attendance/mark
                            else if (pathSegments[semesterIndex + 5] === 'mark') {
                                breadcrumbs.push({
                                    label: 'Mark Student Attendance',
                                    isCurrentPage: true
                                });
                            }
                        }
                        // Handle /dashboard (current page)
                        else {
                            breadcrumbs.push({
                                label: 'Dashboard',
                                isCurrentPage: true
                            });
                        }
                    }
                    // Handle /projects/:projectId/centers/:centerId/semesters (current page)
                    else {
                        breadcrumbs.push({
                            label: centerName,
                            isCurrentPage: true
                        });
                    }
                }
                // Handle /projects/:projectId/centers (current page)
                else {
                    breadcrumbs.push({
                        label: projectName,
                        isCurrentPage: true
                    });
                }
            }
        }
        // Handle /registration-requests
        else if (pathSegments.includes('registration-requests')) {
            // Check if we have dashboard context for registration requests
            if (dashboardContext && dashboardContext.projectId && dashboardContext.centerId && dashboardContext.semesterId) {
                // Use actual data if available, otherwise fall back to context data
                const projectName = project?.name || dashboardContext.projectName || 'Project';
                const centerName = center?.name || dashboardContext.centerName || 'Center';
                const semesterName = semester?.name || dashboardContext.semesterName || 'Semester';

                breadcrumbs.push({
                    label: 'Projects',
                    href: '/projects'
                });
                breadcrumbs.push({
                    label: projectName,
                    href: `/projects/${dashboardContext.projectId}/centers`
                });
                breadcrumbs.push({
                    label: centerName,
                    href: `/projects/${dashboardContext.projectId}/centers/${dashboardContext.centerId}/semesters`
                });
                breadcrumbs.push({
                    label: semesterName,
                    href: `/projects/${dashboardContext.projectId}/centers/${dashboardContext.centerId}/semesters/${dashboardContext.semesterId}/dashboard`
                });
            }

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
        // With horizontal scrolling, we can be more lenient with collapsing
        // Only collapse on very small screens or with very long breadcrumb trails
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        if (screenWidth < 480) {
            return breadcrumbs.length > 4; // Very small mobile: collapse if more than 4 items
        } else if (screenWidth < 768) {
            return breadcrumbs.length > 6; // Mobile: collapse if more than 6 items
        } else {
            return breadcrumbs.length > 8; // Larger screens: collapse if more than 8 items
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

    // Function to scroll to the right end
    const scrollToEnd = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                left: scrollContainerRef.current.scrollWidth,
                behavior: 'smooth'
            });
        }
    };

    // Check if we should auto-collapse on mount and window resize
    useEffect(() => {
        const checkWidth = () => {
            // With horizontal scrolling, we primarily rely on the shouldCollapse logic
            // rather than measuring container width
            const shouldAutoCollapse = shouldCollapse(breadcrumbs);
            setIsCollapsed(shouldAutoCollapse);
        };

        // Check on mount and route changes with a delay to ensure DOM is rendered
        const timeoutId = setTimeout(() => {
            checkWidth();
            // Scroll to right end after breadcrumbs are rendered
            setTimeout(scrollToEnd, 100);
        }, 150);

        const handleResize = () => {
            setTimeout(() => {
                checkWidth();
                scrollToEnd();
            }, 50); // Small delay for resize
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [breadcrumbs, location.pathname]);

    // Scroll to end when breadcrumbs change
    useEffect(() => {
        const timeoutId = setTimeout(scrollToEnd, 100);
        return () => clearTimeout(timeoutId);
    }, [displayBreadcrumbs.length, location.pathname]);

    // Don't show breadcrumbs if we're on the root projects page or there are no breadcrumbs
    if (breadcrumbs.length === 0 || (breadcrumbs.length === 1 && breadcrumbs[0].label === 'Projects' && breadcrumbs[0].isCurrentPage)) {
        return null;
    }

    return (
        <div
            ref={scrollContainerRef}
            className="mb-4 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            <Breadcrumb className="w-max min-w-full" ref={breadcrumbRef}>
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
                                    <BreadcrumbPage className="max-w-[150px] truncate" title={breadcrumb.label}>
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
        </div>
    );
};

export default BreadcrumbNavigation;
