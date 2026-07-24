import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { ProjectFormLayout } from '@/components/projects/ProjectFormLayout';
import { useCreateProject } from '@/hooks/useProjectQueries';

const CreateProject = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const navigate = useNavigate();
    const { mutate: createProject, isPending } = useCreateProject();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (!trimmedName || !trimmedDescription) {
            toast.error('Enter a project name and description.');
            return;
        }

        createProject(
            {
                name: trimmedName,
                description: trimmedDescription,
                projectType: 'Educational Project',
                imageUrl: imageUrl || undefined,
            },
            {
                onSuccess: () => {
                    toast.success('Project created.');
                    navigate('/projects');
                },
                onError: (error) => {
                    toast.error(error instanceof Error ? error.message : 'Unable to create project. Try again.');
                },
            },
        );
    };

    return (
        <ProjectFormLayout
            mode="create"
            name={name}
            description={description}
            imageUrl={imageUrl}
            isPending={isPending}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onImageChange={setImageUrl}
            onImageRemove={() => setImageUrl('')}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/projects')}
        />
    );
};

export default CreateProject;
