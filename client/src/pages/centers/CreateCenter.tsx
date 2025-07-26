import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/button';
import { useCreateCenter } from '@/hooks/useCenterQueries';
import { useProject } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';

const CreateCenter = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const { mutate: createCenter, isPending } = useCreateCenter();
    const { data: project } = useProject(projectId!);

    // Check if user is admin - redirect if not
    useEffect(() => {
        if (!isAdmin()) {
            navigate(`/projects/${projectId}/centers`);
        }
    }, [isAdmin, navigate, projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        createCenter(
            {
                name,
                address,
                projectId: projectId!,
                metadata: {},
            },
            {
                onSuccess: () => {
                    toast.success('Center created successfully!');
                    navigate(`/projects/${projectId}/centers`);
                },
                onError: (err) => {
                    console.error('Failed to create center:', err);
                    toast.error(err?.message || 'Failed to create center. Please try again.');
                }
            }
        );
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative">
            <DoodleBackground numElements={8} />
            <div className="w-full max-w-lg bg-white/80 rounded-lg border shadow-md p-6 relative z-10">
                <h1 className="text-2xl font-bold mb-2">Create Center</h1>
                <p className="text-muted-foreground mb-6 text-sm">
                    Fill in the details to create a new center for <strong>{project?.name || 'this project'}</strong>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
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
                            isLoading={isPending}
                            loadingMessage="Creating..."
                            className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                        >
                            Create Center
                        </CustomButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCenter;
