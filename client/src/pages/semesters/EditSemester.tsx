import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { CustomButton } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useSemester, useUpdateSemester, useDeleteSemester } from '@/hooks/useSemesterQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useAuth } from '@/hooks/useAuth';
import type { UpdateSemesterRequest } from '@/types/api';

const EditSemester = () => {
    const { projectId, centerId, id } = useParams<{ projectId: string; centerId: string; id: string }>();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // API hooks
    const { data: semester, isLoading: isSemesterLoading, error: semesterError } = useSemester(id!);
    const { data: center } = useCenter(centerId!);
    const updateSemesterMutation = useUpdateSemester();
    const deleteSemesterMutation = useDeleteSemester();

    // Check if user is admin - redirect if not
    useEffect(() => {
        if (!isAdmin()) {
            navigate(`/projects/${projectId}/centers/${centerId}/semesters`);
        }
    }, [isAdmin, navigate, projectId, centerId]);

    // Load semester data into form when available
    useEffect(() => {
        if (semester) {
            setName(semester.name);
            setStartDate(semester.startDate.split('T')[0]); // Extract date part from ISO string
            setEndDate(semester.endDate.split('T')[0]); // Extract date part from ISO string
        }
    }, [semester]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            const updateData: UpdateSemesterRequest = {
                name,
                startDate,
                endDate,
            };

            await updateSemesterMutation.mutateAsync({ id, data: updateData });

            navigate(`/projects/${projectId}/centers/${centerId}/semesters`, {
                state: {
                    message: 'Semester updated successfully!',
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('Failed to update semester:', error);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        try {
            await deleteSemesterMutation.mutateAsync(id);
            navigate(`/projects/${projectId}/centers/${centerId}/semesters`, {
                state: {
                    message: 'Semester deleted successfully!',
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('Failed to delete semester:', error);
        }
    };

    // Show loading state
    if (isSemesterLoading) {
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
    if (semesterError) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load semester</h2>
                    <p className="text-gray-600 mb-4">{semesterError.message}</p>
                </div>
            </>
        );
    }

    // Show not found state
    if (!semester) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <span className="text-gray-600 text-2xl">📅</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Semester not found</h2>
                    <p className="text-gray-600 mb-4">The semester you're looking for doesn't exist.</p>
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
                        <h1 className="text-2xl font-bold">Edit Semester</h1>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                            )}
                            title="Delete Semester"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-muted-foreground mb-6 text-sm">
                        Update the semester information for <strong>{center?.name || 'this center'}</strong>.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error message */}
                        {(updateSemesterMutation.error || deleteSemesterMutation.error) && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                {updateSemesterMutation.error?.message || deleteSemesterMutation.error?.message}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Semester Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="e.g., Fall 2024, Spring 2025"
                            />
                        </div>

                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium mb-1">Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                required
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium mb-1">End Date</label>
                            <input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                required
                                min={startDate} // Ensure end date is not before start date
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters`)}
                                className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[100px]')}
                            >
                                Cancel
                            </button>
                            <CustomButton
                                type="submit"
                                isLoading={updateSemesterMutation.isPending}
                                loadingMessage="Updating..."
                                className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                            >
                                Update Semester
                            </CustomButton>
                        </div>
                    </form>
                </div>

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    title="Delete Semester"
                    message={`Are you sure you want to delete "${semester.name}"? This action cannot be undone and will also delete all associated data.`}
                    confirmText="Delete Semester"
                    isLoading={deleteSemesterMutation.isPending}
                    loadingMessage="Deleting..."
                    variant="danger"
                />
            </div>
        </>
    );
};

export default EditSemester;
