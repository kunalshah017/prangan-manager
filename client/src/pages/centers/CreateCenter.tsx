import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { CenterFormLayout } from '@/components/centers/CenterFormLayout';
import { useCreateCenter } from '@/hooks/useCenterQueries';
import { useProject } from '@/hooks/useProjectQueries';
import { buttonVariants } from '@/lib/button-variants';
import { cn } from '@/lib/utils';

const CreateCenter = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const navigate = useNavigate();
    const { mutate: createCenter, isPending } = useCreateCenter();
    const { data: project, isLoading, error, refetch } = useProject(projectId || '');
    const centersUrl = `/projects/${projectId}/centers`;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!projectId) return;

        const trimmedName = name.trim();
        const trimmedAddress = address.trim();
        if (!trimmedName || !trimmedAddress) {
            toast.error('Enter a center name and address.');
            return;
        }

        createCenter(
            {
                name: trimmedName,
                address: trimmedAddress,
                projectId,
                metadata: {},
            },
            {
                onSuccess: () => {
                    toast.success('Center created.');
                    navigate(centersUrl);
                },
                onError: () => {
                    toast.error('Unable to create center. Try again.');
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-6xl animate-pulse py-4 motion-reduce:animate-none" aria-live="polite" aria-busy="true">
                <div className="mb-7 h-11 w-36 rounded-md bg-muted" />
                <div className="mb-8 h-28 rounded-lg bg-muted" />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="h-[28rem] rounded-lg border border-border bg-card" />
                    <div className="h-64 rounded-lg border border-border bg-card" />
                </div>
                <span className="sr-only">Loading project</span>
            </div>
        );
    }

    if (error || !project || !projectId) {
        return (
            <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
                <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
                    <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
                    <h1 className="mt-4 text-2xl font-semibold text-foreground">Project could not be loaded</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Return to Projects or try loading this project again.</p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link to="/projects" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-2')}>
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to projects
                        </Link>
                        <button type="button" onClick={() => refetch()} className={cn(buttonVariants(), 'min-h-11 gap-2')}>
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <CenterFormLayout
            mode="create"
            projectName={project.name}
            name={name}
            address={address}
            isPending={isPending}
            onNameChange={setName}
            onAddressChange={setAddress}
            onSubmit={handleSubmit}
            onCancel={() => navigate(centersUrl)}
        />
    );
};

export default CreateCenter;
