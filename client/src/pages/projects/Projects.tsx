import { Plus, FolderOpen, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard';
import { useProjects } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';
import { projectCardDestination } from '@/lib/workspace-hierarchy';

const Projects = () => {
    const { isAdmin } = useAuth();

    // Fetch projects using TanStack Query
    const { data: projects, isLoading, error, refetch } = useProjects();

    // Show loading state
    if (isLoading) {
        return (
            <div className="relative w-full" aria-live="polite" aria-busy="true">
                <div className="mx-auto w-full max-w-6xl animate-pulse py-2 motion-reduce:animate-none">
                    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-3">
                            <div className="h-9 w-44 rounded-md bg-muted" />
                            <div className="h-5 w-80 max-w-full rounded bg-muted" />
                        </div>
                        <div className="h-11 w-36 rounded-md bg-muted" />
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                        {[0, 1].map((item) => (
                            <div key={item} className="h-64 rounded-lg border border-border bg-card sm:h-60" />
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading projects</span>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
                <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <RefreshCw className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">Projects could not be loaded</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        Check your connection and try again. Your project access has not changed.
                    </p>
                    <button
                        onClick={() => refetch()}
                        className={cn(buttonVariants(), 'mt-6 min-h-11 gap-2')}
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Sort projects by updatedAt in descending order (most recent first)
    const projectList = [...(projects || [])].sort((firstProject, secondProject) =>
        new Date(secondProject.updatedAt).getTime() - new Date(firstProject.updatedAt).getTime()
    );

    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={6} />
            <section className="relative z-10 mx-auto w-full max-w-6xl py-2 sm:py-4">
                <header className="mb-7 flex flex-col gap-5 border-b border-border pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Projects</h1>
                        <p className="mt-3 text-base leading-7 text-muted-foreground">
                            Choose a project to continue to its centers and current work.
                        </p>
                    </div>
                    {isAdmin() && (
                        <Link
                            to="/projects/new"
                            className={cn(buttonVariants({ size: 'default' }), 'min-h-11 w-full gap-2 sm:w-auto')}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            New project
                        </Link>
                    )}
                </header>

                {isAdmin() && (
                    <Link
                        to="/administration"
                        className="group mb-5 flex min-h-20 items-center gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 shadow-sm transition-colors hover:border-primary/35 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:p-4"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-foreground">Administration</span>
                            <span className="mt-0.5 hidden text-xs leading-5 text-muted-foreground sm:block">
                                Manage people, requests, academic levels, and projects.
                            </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-primary">
                            <span className="sm:hidden">Open</span>
                            <span className="hidden sm:inline">Open administration</span>
                        </span>
                    </Link>
                )}

                {projectList.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {projectList.map((project) => (
                            <WorkspaceCard
                                key={project.id}
                                title={project.name}
                                entityLabel="Project"
                                mediaSrc={project.imageUrl || "/images/default_project_banner.jpg"}
                                mediaAlt={`${project.name} project`}
                                href={projectCardDestination(project.id)}
                                openLabel="Open workspace"
                                detail={
                                    <p className="line-clamp-2">
                                        {project.description || 'Open this project to view its centers and current work.'}
                                    </p>
                                }
                                updatedAt={new Date(project.updatedAt).toLocaleDateString()}
                                status={
                                    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                        <span
                                            className={cn(
                                                'mr-2 inline-flex h-2 w-2 rounded-full',
                                                (project.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {(project.status || 'ACTIVE') === 'ACTIVE' ? 'Active' : 'Inactive'}
                                    </span>
                                }
                                editHref={isAdmin() ? `/projects/${project.id}/edit` : undefined}
                                editLabel={isAdmin() ? `Edit ${project.name}` : undefined}
                            />
                        ))}
                    </div>
                )}

                {projectList.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center" aria-live="polite">
                        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            {isAdmin() ? <FolderOpen className="h-6 w-6" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" aria-hidden="true" />}
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {isAdmin() ? 'Create your first project' : 'No project access yet'}
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                            {isAdmin()
                                ? 'Set up a project, then add its centers and semesters.'
                                : 'Ask an administrator to assign you to a project workspace.'}
                        </p>
                        {isAdmin() && (
                            <Link
                                to="/projects/new"
                                className={cn(buttonVariants(), 'mt-6 min-h-11 gap-2')}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Create project
                            </Link>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Projects;
