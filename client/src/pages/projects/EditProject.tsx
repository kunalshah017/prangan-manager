import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';

// Mock function to get project by ID - in a real app, this would be an API call
const getProjectById = (id: string) => {
    const mockProjects = [
        {
            id: '1',
            name: 'Project Chanchalmann',
            status: 'active',
            description: 'Started with only one center, 25 volunteers and 40 children in the latter half of 2018, we are now two centers strong, and 100+ dedicated and compassionate volunteers working with us with more than 80 kids learning at us. We are working very actively in Dombivli (west) and are situated in the community to get the best possible results.',
            lastUpdated: '2 days ago',
        },
    ];
    return mockProjects.find(project => project.id === id);
};

const EditProject = () => {
    const { id } = useParams<{ id: string }>();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('active');
    const [isLoading, setIsLoading] = useState(false);
    const [projectNotFound, setProjectNotFound] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            const project = getProjectById(id);
            if (project) {
                setName(project.name);
                setDescription(project.description);
                setStatus(project.status);
            } else {
                setProjectNotFound(true);
            }
        }
    }, [id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            // In a real app, this would update the project via API
            // Show success message and redirect
            navigate('/projects', {
                state: {
                    message: 'Project updated successfully!',
                    type: 'success'
                }
            });
        }, 1200);
    };

    if (projectNotFound) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full relative">
                <DoodleBackground numElements={6} />
                <div className="text-center relative z-10">
                    <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
                    <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
                    <Link to="/projects" className={cn(buttonVariants())}>
                        Back to Projects
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full relative">
            <DoodleBackground numElements={8} />
            <div className="w-full max-w-lg bg-white/80 rounded-lg border shadow-md p-6 relative z-10">
                <h1 className="text-2xl font-bold mb-2">Edit Project</h1>
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
                            onChange={e => setStatus(e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium mb-1">Project Type</label>
                        <input
                            id="type"
                            type="text"
                            value="Education Project"
                            disabled
                            className="w-full h-10 rounded-md border border-input bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Link to="/projects" className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[100px]')}>Cancel</Link>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(buttonVariants({ size: 'default' }), 'bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]')}
                        >
                            {isLoading ? (
                                <LoadingButterfly size="sm" message="Updating..." />
                            ) : (
                                'Update Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProject;
