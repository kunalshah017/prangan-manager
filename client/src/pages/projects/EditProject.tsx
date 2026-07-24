import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { ProjectFormLayout } from '@/components/projects/ProjectFormLayout';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useDeleteProject, useProject, useUpdateProject } from '@/hooks/useProjectQueries';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import type { UpdateProjectRequest } from '@/types/api';

const EditProject = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [imageUrl, setImageUrl] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { data: project, isLoading, error, refetch } = useProject(id || '');
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();

    useEffect(() => {
        if (!project) return;
        setName(project.name);
        setDescription(project.description);
        setStatus(project.status || 'ACTIVE');
        setImageUrl(project.imageUrl || '');
    }, [project]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id) return;

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();
        if (!trimmedName || !trimmedDescription) {
            toast.error('Enter a project name and description.');
            return;
        }

        const updateData: UpdateProjectRequest = {
            name: trimmedName,
            description: trimmedDescription,
            status,
            projectType: 'Educational Project',
            imageUrl: imageUrl || null,
        };

        try {
            await updateProjectMutation.mutateAsync({ id, data: updateData });
            toast.success('Project changes saved.');
            navigate('/projects');
        } catch {
            toast.error('Unable to save project changes. Try again.');
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        try {
            await deleteProjectMutation.mutateAsync(id);
            toast.success('Project deleted.');
            navigate('/projects');
        } catch {
            toast.error('Unable to delete this project. Remove dependent records first and try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-6xl animate-pulse py-4 motion-reduce:animate-none" aria-live="polite" aria-busy="true">
                <div className="mb-7 h-11 w-36 rounded-md bg-muted" />
                <div className="mb-8 space-y-3 border-b border-border pb-6">
                    <div className="h-9 w-56 rounded-md bg-muted" />
                    <div className="h-5 w-96 max-w-full rounded bg-muted" />
                </div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="h-[34rem] rounded-lg border border-border bg-card" />
                    <div className="space-y-5">
                        <div className="h-48 rounded-lg border border-border bg-card" />
                        <div className="h-72 rounded-lg border border-border bg-card" />
                    </div>
                </div>
                <span className="sr-only">Loading project</span>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
                <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <RefreshCw className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">Project could not be loaded</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        The project may no longer exist, or the request could not be completed.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link to="/projects" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-2')}>
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to projects
                        </Link>
                        <button type="button" onClick={() => refetch()} className={cn(buttonVariants(), 'min-h-11 gap-2')}>
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete project"
                message={`Delete "${project.name}"? This cannot be undone and will remove its centers and semesters when no protected enrollment history remains.`}
                confirmText="Delete project"
                cancelText="Cancel"
                isLoading={deleteProjectMutation.isPending}
                loadingMessage="Deleting project..."
                variant="danger"
            />

            <ProjectFormLayout
                mode="edit"
                name={name}
                description={description}
                status={status}
                imageUrl={imageUrl}
                isPending={updateProjectMutation.isPending}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onStatusChange={setStatus}
                onImageChange={setImageUrl}
                onImageRemove={() => setImageUrl('')}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/projects')}
                onDelete={() => setShowDeleteConfirm(true)}
                isDeletePending={deleteProjectMutation.isPending}
            />
        </>
    );
};

export default EditProject;
