import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { CustomButton } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import ImageUpload from '@/components/ui/image-upload';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';
import type { UpdateProjectRequest } from '@/types/api';

const EditProject = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [projectType, setProjectType] = useState('Educational Project');
    const [imageUrl, setImageUrl] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // API hooks
    const { data: project, isLoading: isProjectLoading, error: projectError } = useProject(id!);
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();

    // Check if user is admin - redirect if not
    useEffect(() => {
        if (!isAdmin()) {
            navigate('/projects');
        }
    }, [isAdmin, navigate]);

    // Load project data into form when available
    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description);
            setStatus(project.status || 'ACTIVE');
            setProjectType('Educational Project'); // Always set to Educational Project
            setImageUrl(project.imageUrl || '');
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            const updateData: UpdateProjectRequest = {
                name,
                description,
                status,
                projectType: 'Educational Project',
                imageUrl: imageUrl || undefined,
            };

            await updateProjectMutation.mutateAsync({ id, data: updateData });

            navigate('/projects', {
                state: {
                    message: 'Project updated successfully!',
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        try {
            await deleteProjectMutation.mutateAsync(id);
            navigate('/projects', {
                state: {
                    message: 'Project deleted successfully!',
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    };

    // Show loading state
    if (isProjectLoading) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    // Show error state or project not found
    if (projectError || !project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full relative">
                <DoodleBackground numElements={6} />
                <div className="text-center relative z-10">
                    <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
                    <p className="text-muted-foreground mb-4">
                        {projectError?.message || "The project you're looking for doesn't exist."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full relative">
            <DoodleBackground numElements={8} />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Project"
                message={`Are you sure you want to delete "${project.name}"? This action cannot be undone & will delete all associated centers and semesters.`}
                confirmText="Delete Project"
                cancelText="Cancel"
                isLoading={deleteProjectMutation.isPending}
                loadingMessage="Deleting..."
                variant="danger"
            />

            <div className="w-full max-w-lg bg-white/80 rounded-lg border shadow-md p-6 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Edit Project</h1>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Project"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">Update the project details below.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">Project Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Enter project name"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                            className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Describe the project"
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                        <select
                            id="status"
                            value={status}
                            onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium mb-1">Project Type</label>
                        <select
                            id="type"
                            value={projectType}
                            onChange={e => setProjectType(e.target.value)}
                            disabled
                            className="w-full h-10 rounded-md border border-input bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-not-allowed opacity-60"
                        >
                            <option value="Educational Project">Educational Project</option>
                        </select>
                    </div>

                    <div>
                        <ImageUpload
                            label="Project Image"
                            value={imageUrl}
                            onChange={setImageUrl}
                            placeholder="Click to upload project banner image"
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/projects')}
                            className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[100px]')}
                        >
                            Cancel
                        </button>
                        <CustomButton
                            type="submit"
                            isLoading={updateProjectMutation.isPending}
                            loadingMessage="Updating..."
                            className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                        >
                            Update Project
                        </CustomButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProject;
