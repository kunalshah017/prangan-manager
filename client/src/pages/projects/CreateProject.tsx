import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { Link, useNavigate } from 'react-router-dom';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useCreateProject } from '@/hooks/useProjectQueries';

const CreateProject = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [projectType, setProjectType] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const navigate = useNavigate();

    const { mutate: createProject, isPending, error } = useCreateProject();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        createProject(
            {
                name,
                description,
                projectType: projectType || undefined,
                imageUrl: imageUrl || undefined,
            },
            {
                onSuccess: () => {
                    // Navigate to projects list with success message
                    navigate('/projects', {
                        state: {
                            message: 'Project created successfully!',
                            type: 'success'
                        }
                    });
                },
                onError: (err) => {
                    console.error('Failed to create project:', err);
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
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            {error?.message}
                        </div>
                    )}

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
                        <label htmlFor="projectType" className="block text-sm font-medium mb-1">Project Type (Optional)</label>
                        <input
                            id="projectType"
                            type="text"
                            value={projectType}
                            onChange={e => setProjectType(e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="e.g., Education, Health, Environment"
                        />
                    </div>
                    <div>
                        <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">Project Image URL (Optional)</label>
                        <input
                            id="imageUrl"
                            type="url"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Link
                            to="/projects"
                            className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[100px]')}
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isPending}
                            className={cn(
                                buttonVariants({ size: 'default' }),
                                'bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]',
                                isPending && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {isPending ? (
                                <LoadingButterfly size="sm" message="Creating..." />
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProject; 