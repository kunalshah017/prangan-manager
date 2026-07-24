import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { CenterFormLayout } from '@/components/centers/CenterFormLayout';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useCenter, useDeleteCenter, useUpdateCenter } from '@/hooks/useCenterQueries';
import { useProject } from '@/hooks/useProjectQueries';
import { buttonVariants } from '@/lib/button-variants';
import { cn } from '@/lib/utils';
import type { UpdateCenterRequest } from '@/types/api';

const EditCenter = () => {
    const { projectId, id } = useParams<{ projectId: string; id: string }>();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { data: center, isLoading: centerLoading, error: centerError, refetch: refetchCenter } = useCenter(id || '');
    const { data: project, isLoading: projectLoading, error: projectError, refetch: refetchProject } = useProject(projectId || '');
    const updateCenterMutation = useUpdateCenter();
    const deleteCenterMutation = useDeleteCenter();
    const centersUrl = `/projects/${projectId}/centers`;

    useEffect(() => {
        if (!center) return;
        setName(center.name);
        setAddress(center.address);
    }, [center]);

    const contextMismatch = Boolean(center?.projectId && center.projectId !== projectId);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || contextMismatch) return;

        const trimmedName = name.trim();
        const trimmedAddress = address.trim();
        if (!trimmedName || !trimmedAddress) {
            toast.error('Enter a center name and address.');
            return;
        }

        const updateData: UpdateCenterRequest = {
            name: trimmedName,
            address: trimmedAddress,
        };

        try {
            await updateCenterMutation.mutateAsync({ id, data: updateData });
            toast.success('Center changes saved.');
            navigate(centersUrl);
        } catch {
            toast.error('Unable to save center changes. Try again.');
        }
    };

    const handleDelete = async () => {
        if (!id || contextMismatch) return;

        try {
            await deleteCenterMutation.mutateAsync(id);
            toast.success('Center deleted.');
            navigate(centersUrl);
        } catch {
            toast.error('Unable to delete this center. Remove dependent records first and try again.');
        }
    };

    if (centerLoading || projectLoading) {
        return (
            <div className="mx-auto w-full max-w-6xl animate-pulse py-4 motion-reduce:animate-none" aria-live="polite" aria-busy="true">
                <div className="mb-7 h-11 w-36 rounded-md bg-muted" />
                <div className="mb-8 h-28 rounded-lg bg-muted" />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="h-[28rem] rounded-lg border border-border bg-card" />
                    <div className="h-64 rounded-lg border border-border bg-card" />
                </div>
                <span className="sr-only">Loading center</span>
            </div>
        );
    }

    if (centerError || projectError || !center || !project || !projectId) {
        return (
            <CenterRecovery
                title="Center could not be loaded"
                message="The center may no longer exist, or the request could not be completed."
                returnUrl={centersUrl}
                onRetry={() => {
                    void refetchCenter();
                    void refetchProject();
                }}
            />
        );
    }

    if (center.projectId && center.projectId !== projectId) {
        return (
            <CenterRecovery
                title="Center does not belong to this project"
                message={`This center belongs to another project and cannot be edited from ${project.name}.`}
                returnUrl={centersUrl}
            />
        );
    }

    return (
        <>
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete center"
                message={`Delete "${center.name}"? This cannot be undone and will remove its semesters when no protected enrollment history remains.`}
                confirmText="Delete center"
                cancelText="Cancel"
                isLoading={deleteCenterMutation.isPending}
                loadingMessage="Deleting center..."
                variant="danger"
            />

            <CenterFormLayout
                mode="edit"
                projectName={project.name}
                name={name}
                address={address}
                isPending={updateCenterMutation.isPending}
                onNameChange={setName}
                onAddressChange={setAddress}
                onSubmit={handleSubmit}
                onCancel={() => navigate(centersUrl)}
                onDelete={() => setShowDeleteConfirm(true)}
                isDeletePending={deleteCenterMutation.isPending}
            />
        </>
    );
};

interface CenterRecoveryProps {
    title: string;
    message: string;
    returnUrl: string;
    onRetry?: () => void;
}

const CenterRecovery = ({ title, message, returnUrl, onRetry }: CenterRecoveryProps) => (
    <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
        <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
            <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to={returnUrl} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-2')}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to centers
                </Link>
                {onRetry && (
                    <button type="button" onClick={onRetry} className={cn(buttonVariants(), 'min-h-11 gap-2')}>
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </button>
                )}
            </div>
        </div>
    </div>
);

export default EditCenter;
