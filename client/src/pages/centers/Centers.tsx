import { ArrowLeft, Building2, MapPin, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { useCentersByProject } from '@/hooks/useCenterQueries';
import { useProject } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard';
import { centerCardDestination } from '@/lib/workspace-hierarchy';

const Centers = () => {
    const { projectId = '' } = useParams<{ projectId: string }>();
    const { isAdmin } = useAuth();
    const { data: centers, isLoading, error, refetch } = useCentersByProject(projectId || '');
    const {
        data: project,
        isLoading: projectLoading,
        error: projectError,
        refetch: refetchProject,
    } = useProject(projectId || '');

    if (isLoading || projectLoading) {
        return (
            <div className="relative w-full" aria-live="polite" aria-busy="true">
                <div className="mx-auto w-full max-w-6xl animate-pulse py-2 motion-reduce:animate-none">
                    <div className="mb-8 space-y-3 border-b border-border pb-7">
                        <div className="h-9 w-64 rounded-md bg-muted" />
                        <div className="h-5 w-96 max-w-full rounded bg-muted" />
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                        {[0, 1].map((item) => (
                            <div key={item} className="h-56 rounded-lg border border-border bg-card" />
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading centers</span>
            </div>
        );
    }

    if (error || projectError || !project) {
        return (
            <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
                <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <RefreshCw className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">Centers could not be loaded</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        Check your connection and try again. Your center access has not changed.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link to="/projects" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-2')}>
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to projects
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                void refetch();
                                void refetchProject();
                            }}
                            className={cn(buttonVariants(), 'min-h-11 gap-2')}
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const centerList = [...(centers || [])].sort(
        (firstCenter, secondCenter) =>
            new Date(secondCenter.updatedAt).getTime() - new Date(firstCenter.updatedAt).getTime(),
    );

    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={6} />
            <section className="relative z-10 mx-auto w-full max-w-6xl py-2 sm:py-4">
                <header className="mb-7 flex flex-col gap-5 border-b border-border pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Centers</h1>
                        <p className="mt-3 text-base leading-7 text-muted-foreground">
                            {project.name} · Choose a center to continue to its semesters and current academic work.
                        </p>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Link
                            to={`/projects/${projectId}/dashboard`}
                            aria-label="Back to project dashboard"
                            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 flex-1 gap-2 sm:flex-none")}
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span className="sm:hidden">Dashboard</span>
                            <span className="hidden sm:inline">Back to project dashboard</span>
                        </Link>
                        {isAdmin() && (
                            <Link
                                to={`/projects/${projectId}/centers/new`}
                                className={cn(buttonVariants(), 'min-h-11 flex-1 gap-2 sm:flex-none')}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                New center
                            </Link>
                        )}
                    </div>
                </header>

                {centerList.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {centerList.map((center) => (
                            <WorkspaceCard
                                key={center.id}
                                title={center.name}
                                entityLabel="Center"
                                mediaSrc="/images/default_center_banner.jpg"
                                mediaAlt={`${center.name} learning center`}
                                href={centerCardDestination(projectId, center.id)}
                                openLabel="Open center"
                                detail={
                                    <div className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                        <span className="line-clamp-2">{center.address || 'Address not added'}</span>
                                    </div>
                                }
                                updatedAt={new Date(center.updatedAt).toLocaleDateString('en-GB')}
                                editHref={isAdmin() ? `/projects/${projectId}/centers/${center.id}/edit` : undefined}
                                editLabel={isAdmin() ? `Edit ${center.name}` : undefined}
                            />
                        ))}
                    </div>
                )}

                {centerList.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center" aria-live="polite">
                        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            {isAdmin() ? <Building2 className="h-6 w-6" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" aria-hidden="true" />}
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {isAdmin() ? 'Create the first center' : 'No center access yet'}
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                            {isAdmin()
                                ? `Add the first center for ${project.name}, then create its semesters.`
                                : 'Ask an administrator to assign you to a center in this project.'}
                        </p>
                        {isAdmin() && (
                            <Link
                                to={`/projects/${projectId}/centers/new`}
                                className={cn(buttonVariants(), 'mt-6 min-h-11 gap-2')}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Create center
                            </Link>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Centers;
