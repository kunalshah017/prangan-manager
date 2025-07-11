import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { Link, useNavigate } from 'react-router-dom';
import DoodleBackground from '@/components/DoodleBackground';

const CreateProject = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            // In a real app, redirect to the new project or projects list
            navigate('/projects');
        }, 1200);
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
                                <span className="flex items-center justify-center"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />Creating...</span>
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