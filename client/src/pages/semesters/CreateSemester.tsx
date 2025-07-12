import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useNavigate, useParams } from 'react-router-dom';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/button';
import { useCreateSemester } from '@/hooks/useSemesterQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useAuth } from '@/hooks/useAuth';

const CreateSemester = () => {
    const { projectId, centerId } = useParams<{ projectId: string; centerId: string }>();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const { mutate: createSemester, isPending, error } = useCreateSemester();
    const { data: center } = useCenter(centerId!);

    // Check if user is admin - redirect if not
    useEffect(() => {
        if (!isAdmin()) {
            navigate(`/projects/${projectId}/centers/${centerId}/semesters`);
        }
    }, [isAdmin, navigate, projectId, centerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        createSemester(
            {
                name,
                startDate,
                endDate,
                centerId: centerId!,
            },
            {
                onSuccess: () => {
                    // Navigate to semesters list with success message
                    navigate(`/projects/${projectId}/centers/${centerId}/semesters`, {
                        state: {
                            message: 'Semester created successfully!',
                            type: 'success'
                        }
                    });
                },
                onError: (err) => {
                    console.error('Failed to create semester:', err);
                }
            }
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] w-full relative">
            <DoodleBackground numElements={8} />
            <div className="w-full max-w-lg bg-white/80 rounded-lg border shadow-md p-6 relative z-10">
                <h1 className="text-2xl font-bold mb-2">Create Semester</h1>
                <p className="text-muted-foreground mb-6 text-sm">
                    Fill in the details to create a new semester for <strong>{center?.name || 'this center'}</strong>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            {error?.message}
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
                            isLoading={isPending}
                            loadingMessage="Creating..."
                            className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                        >
                            Create Semester
                        </CustomButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSemester;
