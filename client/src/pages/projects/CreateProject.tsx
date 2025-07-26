import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { useCreateProject } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';

const CreateProject = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [projectType, setProjectType] = useState('Educational Project');
    const [imageUrl, setImageUrl] = useState('');
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const { mutate: createProject, isPending } = useCreateProject();

    // Check if user is admin - redirect if not
    useEffect(() => {
        if (!isAdmin()) {
            navigate('/projects');
        }
    }, [isAdmin, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        createProject(
            {
                name,
                description,
                projectType: 'Educational Project',
                imageUrl: imageUrl || undefined,
            },
            {
                onSuccess: () => {
                    toast.success('Project created successfully!');
                    navigate('/projects');
                },
                onError: (err) => {
                    console.error('Failed to create project:', err);
                    toast.error(err?.message || 'Failed to create project. Please try again.');
                }
            }
        );
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative">
            <DoodleBackground numElements={8} />
            <div className="w-full max-w-lg bg-white/80 rounded-lg border shadow-md p-6 relative z-10">
                <h1 className="text-2xl font-bold mb-2">Create Project</h1>
                <p className="text-muted-foreground mb-6 text-sm">Fill in the details to create a new project for your organization.</p>

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
                        <label htmlFor="projectType" className="block text-sm font-medium mb-1">Project Type</label>
                        <select
                            id="projectType"
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
                            isLoading={isPending}
                            loadingMessage="Creating..."
                            className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                        >
                            Create Project
                        </CustomButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProject; 