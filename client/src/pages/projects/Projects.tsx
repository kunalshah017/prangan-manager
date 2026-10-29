import { FolderOpen, Plus, ShieldCheck } from 'lucide-react';

import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { PageTitle } from '@/components/navigation/PageTitle';
import { EmptyState, ErrorState, ListPageSkeleton } from '@/components/workspace/PageState';
import { PrimaryAction } from '@/components/workspace/PrimaryAction';
import { ProjectTile } from '@/components/workspace/ProjectTile';
import { useProjects } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';
import { projectCardDestination } from '@/lib/workspace-hierarchy';

const Projects = () => {
    const { isAdmin } = useAuth();
    const { data: projects, isLoading, error, refetch } = useProjects();

    if (isLoading) {
        return (
            <WorkspacePage>
                <ListPageSkeleton label="Loading projects" hero />
            </WorkspacePage>
        );
    }

    if (error) {
        return (
            <WorkspacePage>
                <ErrorState
                    title="Projects could not be loaded"
                    description="Check your connection and try again. Your project access has not changed."
                    onRetry={() => void refetch()}
                />
            </WorkspacePage>
        );
    }

    // Copy before sorting so the cached query data keeps its order.
    const projectList = [...(projects || [])].sort((firstProject, secondProject) =>
        new Date(secondProject.updatedAt).getTime() - new Date(firstProject.updatedAt).getTime()
    );

    return (
        <WorkspacePage className="space-y-6" withMobileAction={isAdmin()}>
            <PageTitle title="Projects" />
            <header className="flex justify-end empty:hidden">
                {isAdmin() && (
                    <PrimaryAction
                        to="/projects/new"
                        icon={<Plus className="h-5 w-5" aria-hidden="true" />}
                        secondary={{
                            to: '/administration',
                            label: 'Administration',
                            icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" />,
                        }}
                    >
                        New project
                    </PrimaryAction>
                )}
            </header>

            {projectList.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projectList.map((project) => (
                        <ProjectTile
                            key={project.id}
                            project={project}
                            href={projectCardDestination(project.id)}
                            editHref={isAdmin() ? `/projects/${project.id}/edit` : undefined}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={isAdmin() ? FolderOpen : ShieldCheck}
                    title={isAdmin() ? 'Create your first project' : 'No project access yet'}
                    description={
                        isAdmin()
                            ? 'Set up a project, then add its centres and semesters.'
                            : 'Ask an administrator to assign you to a project.'
                    }
                />
            )}
        </WorkspacePage>
    );
};

export default Projects;
