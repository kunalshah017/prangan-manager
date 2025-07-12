import { Plus, Clock, GanttChart, Edit } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useEffect, useState } from 'react';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useProjects } from '@/hooks/useProjectQueries';

const Projects = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch projects using TanStack Query
    const { data: projects, isLoading, error, refetch } = useProjects();

    useEffect(() => {
        // Check if there's a success message from navigation state
        if (location.state?.message && location.state?.type === 'success') {
            setSuccessMessage(location.state.message);
            // Clear the message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
            // Clear the navigation state
            navigate(location.pathname, { replace: true });
            // Refetch projects after a successful operation
            refetch();
        }
    }, [location.state, navigate, location.pathname, refetch]);

    const handleProjectClick = (projectId: string) => {
        navigate(`/projects/${projectId}/edit`);
    };

    // Show loading state
    if (isLoading) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly message="Loading projects..." size="md" />
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

    const projectList = projects || [];

    return (
        <>
            <DoodleBackground numElements={12} />
            <div className="flex flex-col space-y-4 w-full relative z-1">
                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md animate-fade-in">
                        {successMessage}
                    </div>
                )}
                {/* Search and filters bar */}
                <div className="flex gap-3 sm:flex-row sm:items-center sm:gap-4 pb-6 w-full justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <div className="flex gap-2 sm:w-auto justify-end">
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
                                                project.status === 'ACTIVE' ? "bg-green-500" :
                                                    project.status === 'INACTIVE' ? "bg-yellow-500" : "bg-gray-300"
                                            )}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {project.status === 'ACTIVE' ? 'Active' :
                                                project.status === 'INACTIVE' ? 'Inactive' : 'Archived'}
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
                                            View
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
                            Get started by creating your first project
                        </p>
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
                    </div>
                )}
            </div></>
    );
};

export default Projects; 