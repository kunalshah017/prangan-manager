import { Plus, Clock, GanttChart, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useProjects } from '@/hooks/useProjectQueries';
import { useCentersByProject } from '@/hooks/useCenterQueries';
import { useSemestersByCenter } from '@/hooks/useSemesterQueries';
import { useAuth } from '@/hooks/useAuth';

const Projects = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Fetch projects using TanStack Query
    const { data: projects, isLoading, error, refetch } = useProjects();

    // Gate auto-navigation to only run once per session using sessionStorage
    const autoNavHandledRef = useRef<boolean>(
        typeof window !== 'undefined' && sessionStorage.getItem('pm:autoNavHandled') === '1'
    );
    const autoNavEnabled = !autoNavHandledRef.current;

    // Prefetch centers and semesters here to enable smart redirects (only if auto-nav is enabled)
    const singleProjectId = autoNavEnabled && projects && projects.length === 1 ? projects[0].id : '';
    const { data: centers, isLoading: centersLoading } = useCentersByProject(singleProjectId);
    const singleCenterId = autoNavEnabled && centers && centers.length === 1 ? centers[0].id : '';
    const { data: semesters, isLoading: semestersLoading } = useSemestersByCenter(singleCenterId);

    // Auto-redirect logic when there's exactly one at each level
    const hasRedirectedRef = useRef(false);

    useEffect(() => {
        if (hasRedirectedRef.current) return;
        if (!autoNavEnabled) return; // only once per session
        if (isLoading || !projects) return;

        // If multiple projects, stay on this page.
        if (projects.length > 1) return;

        const projectId = projects[0]?.id;
        // Wait for centers of the single project
        if (centersLoading || !centers) return;

        if (centers.length === 0) {
            // Navigate to centers list for this project (empty list state will show)
            hasRedirectedRef.current = true;
            autoNavHandledRef.current = true;
            sessionStorage.setItem('pm:autoNavHandled', '1');
            navigate(`/projects/${projectId}/centers`, { replace: true });
            return;
        }

        if (centers.length > 1) {
            hasRedirectedRef.current = true;
            autoNavHandledRef.current = true;
            sessionStorage.setItem('pm:autoNavHandled', '1');
            navigate(`/projects/${projectId}/centers`, { replace: true });
            return;
        }

        // Exactly one center; check semesters next
        const centerId = centers[0]?.id;
        if (semestersLoading || !semesters) return;

        if (semesters.length === 0) {
            hasRedirectedRef.current = true;
            autoNavHandledRef.current = true;
            sessionStorage.setItem('pm:autoNavHandled', '1');
            navigate(`/projects/${projectId}/centers/${centerId}/semesters`, { replace: true });
            return;
        }

        if (semesters.length > 1) {
            hasRedirectedRef.current = true;
            autoNavHandledRef.current = true;
            sessionStorage.setItem('pm:autoNavHandled', '1');
            navigate(`/projects/${projectId}/centers/${centerId}/semesters`, { replace: true });
            return;
        }

        // Exactly one semester; go to dashboard
        const semesterId = semesters[0]?.id;
        if (projectId && centerId && semesterId) {
            hasRedirectedRef.current = true;
            autoNavHandledRef.current = true;
            sessionStorage.setItem('pm:autoNavHandled', '1');
            navigate(
                `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard`,
                { replace: true }
            );
        }
    }, [isLoading, projects, centersLoading, centers, semestersLoading, semesters, navigate, autoNavEnabled]);

    const handleProjectClick = (projectId: string) => {
        // Navigate to centers for this project
        navigate(`/projects/${projectId}/centers`);
    };

    // Show loading state
    if (isLoading) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    // Show error state
    if (error) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load projects</h2>
                    <p className="text-gray-600 mb-4">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </>
        );
    }

    // Sort projects by updatedAt in descending order (most recent first)
    const projectList = (projects || []).sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // If there's exactly one project, and we're resolving centers/semesters, keep a brief loading state
    const resolvingSinglePath =
        autoNavEnabled && !!projects && projects.length === 1 && (centersLoading || (centers && centers.length === 1 && semestersLoading));

    if (resolvingSinglePath) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    return (
        <>
            <DoodleBackground numElements={12} />
            <div className="flex flex-col space-y-4 w-full relative z-1">
                {/* Search and filters bar */}
                <div className="flex gap-3 sm:flex-row sm:items-center sm:gap-4 pb-6 w-full justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <div className="flex gap-2 sm:w-auto justify-end">
                        {isAdmin() && (
                            <Link
                                to="/projects/new"
                                className={cn(
                                    buttonVariants({ size: "default" }),
                                    "flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                                )}
                            >
                                <Plus className="h-4 w-4" />
                                <span>New Project</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Project grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Project cards */}
                    {projectList.map((project) => (
                        <div
                            key={project.id}
                            className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer"
                            onClick={() => handleProjectClick(project.id)}
                        >
                            {/* Project Banner */}
                            <div className="w-full h-32 overflow-hidden">
                                <img
                                    src={project.imageUrl || "/images/default_project_banner.jpg"}
                                    alt={`${project.name} Banner`}
                                    className="w-full h-full object-cover object-center bg-gray-200"
                                />
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium">{project.name}</h3>
                                    <div className="flex items-center">
                                        <span
                                            className={cn(
                                                "inline-flex h-2 w-2 rounded-full mr-2",
                                                (project.status || 'ACTIVE') === 'ACTIVE' ? "bg-green-500" : "bg-yellow-500"
                                            )}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {(project.status || 'ACTIVE') === 'ACTIVE' ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                    {project.description}
                                </p>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center text-xs text-muted-foreground">
                                        <Clock className="mr-1 h-3 w-3" />
                                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {isAdmin() && (
                                            <Link
                                                to={`/projects/${project.id}/edit`}
                                                className={cn(
                                                    buttonVariants({ variant: 'outline', size: 'sm' }),
                                                    'h-8 px-2'
                                                )}
                                                onClick={e => e.stopPropagation()}
                                                title="Edit Project"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Link>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProjectClick(project.id);
                                            }}
                                            className={cn(
                                                buttonVariants({ size: 'sm' }),
                                                'h-8 px-3 bg-orange-600 hover:bg-orange-700 text-white'
                                            )}
                                        >
                                            Centers
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No projects found message */}
                {projectList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10">
                        <GanttChart className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                        <h3 className="font-medium text-lg">No projects found</h3>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin() ? "Get started by creating your first project" : "No projects available to view"}
                        </p>
                        {isAdmin() && (
                            <Link
                                to="/projects/new"
                                className={cn(
                                    buttonVariants({ size: "default" }),
                                    "mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                                )}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Project
                            </Link>
                        )}
                    </div>
                )}
            </div></>
    );
};

export default Projects; 