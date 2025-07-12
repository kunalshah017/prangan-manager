import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { CustomButton } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useCenter, useUpdateCenter, useDeleteCenter } from '@/hooks/useCenterQueries';
import { useProject } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';
import type { UpdateCenterRequest } from '@/types/api';

const EditCenter = () => {
    const { projectId, id } = useParams<{ projectId: string; id: string }>();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // API hooks
    const { data: center, isLoading: isCenterLoading, error: centerError } = useCenter(id!);
    const { data: project } = useProject(projectId!);
    const updateCenterMutation = useUpdateCenter();
    const deleteCenterMutation = useDeleteCenter();

    // Check if user is admin - redirect if not
    useEffect(() => {
        if (!isAdmin()) {
            navigate(`/projects/${projectId}/centers`);
        }
    }, [isAdmin, navigate, projectId]);

    // Load center data into form when available
    useEffect(() => {
        if (center) {
            setName(center.name);
            setAddress(center.address);
        }
    }, [center]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            const updateData: UpdateCenterRequest = {
                name,
                address,
            };

            await updateCenterMutation.mutateAsync({ id, data: updateData });

            navigate(`/projects/${projectId}/centers`, {
                state: {
                    message: 'Center updated successfully!',
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('Failed to update center:', error);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        try {
            await deleteCenterMutation.mutateAsync(id);
            navigate(`/projects/${projectId}/centers`, {
                state: {
                    message: 'Center deleted successfully!',
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('Failed to delete center:', error);
        }
    };

    // Show loading state
    if (isCenterLoading) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    // Show error state
    if (centerError) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load center</h2>
                    <p className="text-gray-600 mb-4">{centerError.message}</p>
                </div>
            </>
        );
    }

    // Show not found state
    if (!center) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <span className="text-gray-600 text-2xl">🏢</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Center not found</h2>
                    <p className="text-gray-600 mb-4">The center you're looking for doesn't exist.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <DoodleBackground numElements={8} />
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full relative">
                <div className="w-full max-w-lg bg-white/80 rounded-lg border shadow-md p-6 relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">Edit Center</h1>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                            )}
                            title="Delete Center"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-muted-foreground mb-6 text-sm">
                        Update the center information for <strong>{project?.name || 'this project'}</strong>.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error message */}
                        {(updateCenterMutation.error || deleteCenterMutation.error) && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                {updateCenterMutation.error?.message || deleteCenterMutation.error?.message}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Center Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Enter center name"
                            />
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
                            <textarea
                                id="address"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                required
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Enter complete address"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => navigate(`/projects/${projectId}/centers`)}
                                className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[100px]')}
                            >
                                Cancel
                            </button>
                            <CustomButton
                                type="submit"
                                isLoading={updateCenterMutation.isPending}
                                loadingMessage="Updating..."
                                className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                            >
                                Update Center
                            </CustomButton>
                        </div>
                    </form>
                </div>

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    title="Delete Center"
                    message={`Are you sure you want to delete "${center.name}"? This action cannot be undone and will also delete all associated semesters.`}
                    confirmText="Delete Center"
                    isLoading={deleteCenterMutation.isPending}
                    loadingMessage="Deleting..."
                    variant="danger"
                />
            </div>
        </>
    );
};

export default EditCenter;
