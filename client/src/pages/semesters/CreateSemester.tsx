import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import DoodleBackground from '@/components/DoodleBackground';
import { SemesterFormLayout } from '@/components/semesters/SemesterFormLayout';
import { useAcademicLevels } from '@/hooks/useAcademicLevelQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useCreateSemester } from '@/hooks/useSemesterQueries';
import { useSemestersByCenter } from '@/hooks/useSemesterQueries';
import { buttonVariants } from '@/lib/button-variants';
import { cn } from '@/lib/utils';

const CreateSemester = () => {
    const { projectId, centerId } = useParams<{ projectId: string; centerId: string }>();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [academicLevelIds, setAcademicLevelIds] = useState<string[]>([]);
    const [levelsInitialized, setLevelsInitialized] = useState(false);
    const [sourceSemesterId, setSourceSemesterId] = useState('');
    const navigate = useNavigate();
    const { mutate: createSemester, isPending } = useCreateSemester();
    const { data: center, isLoading, error, refetch } = useCenter(centerId || '');
    const levelsQuery = useAcademicLevels();
    const semestersQuery = useSemestersByCenter(centerId || '');
    const semestersUrl = `/projects/${projectId}/centers/${centerId}/semesters`;

    useEffect(() => {
        if (!levelsQuery.data || levelsInitialized) return;
        const levels = levelsQuery.data;
        setAcademicLevelIds(levels.map((level) => level.id));
        setLevelsInitialized(true);
    }, [levelsInitialized, levelsQuery.data]);

    useEffect(() => {
        if (sourceSemesterId || !semestersQuery.data?.length) return;
        const latest = [...semestersQuery.data]
            .filter((semester) => semester.status !== 'DRAFT')
            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
        if (latest) setSourceSemesterId(latest.id);
    }, [semestersQuery.data, sourceSemesterId]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!centerId) return;

        const trimmedName = name.trim();
        if (!trimmedName || !startDate || !endDate) {
            toast.error('Enter a semester name and schedule.');
            return;
        }
        if (endDate < startDate) {
            toast.error('End date must be on or after the start date.');
            return;
        }
        if (academicLevelIds.length === 0) {
            toast.error('Select at least one academic level.');
            return;
        }

        createSemester(
            {
                name: trimmedName,
                startDate,
                endDate,
                centerId,
                academicLevelIds,
                ...(sourceSemesterId && { sourceSemesterId }),
            },
            {
                onSuccess: (response) => {
                    toast.success('Semester draft created. Review its setup before activation.');
                    navigate(`${semestersUrl}/${response.semester.id}/setup`);
                },
                onError: () => {
                    toast.error('Unable to create semester. Try again.');
                },
            },
        );
    };

    if (isLoading) {
        return <SemesterSkeleton message="Loading center" />;
    }

    if (error || !center || !centerId) {
        return (
            <SemesterRecovery
                title="Center could not be loaded"
                message="Return to Centers or try loading this center again."
                returnUrl={`/projects/${projectId}/centers`}
                onRetry={() => void refetch()}
            />
        );
    }

    return (
        <SemesterFormLayout
            mode="create"
            centerName={center.name}
            name={name}
            startDate={startDate}
            endDate={endDate}
            academicLevels={levelsQuery.data ?? []}
            academicLevelIds={academicLevelIds}
            sourceSemesters={semestersQuery.data ?? []}
            sourceSemesterId={sourceSemesterId}
            onSourceSemesterIdChange={setSourceSemesterId}
            academicLevelsLoading={levelsQuery.isLoading}
            academicLevelError={!!levelsQuery.error}
            isPending={isPending}
            onNameChange={setName}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onAcademicLevelIdsChange={setAcademicLevelIds}
            onRetryAcademicLevels={() => void levelsQuery.refetch()}
            onSubmit={handleSubmit}
            onCancel={() => navigate(semestersUrl)}
        />
    );
};

interface SemesterRecoveryProps {
    title: string;
    message: string;
    returnUrl: string;
    onRetry?: () => void;
}

export const SemesterRecovery = ({ title, message, returnUrl, onRetry }: SemesterRecoveryProps) => (
    <div className="relative mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
        <DoodleBackground animated={false} numElements={6} />
        <div className="relative z-10 w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
            <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to={returnUrl} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-2')}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
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

export const SemesterSkeleton = ({ message }: { message: string }) => (
    <div className="relative mx-auto w-full max-w-6xl py-4" aria-live="polite" aria-busy="true">
        <DoodleBackground animated={false} numElements={6} />
        <div className="relative z-10 animate-pulse motion-reduce:animate-none">
            <div className="mb-8 h-28 rounded-lg bg-muted" />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="h-[30rem] rounded-lg border border-border bg-card" />
                <div className="h-64 rounded-lg border border-border bg-card" />
            </div>
        </div>
        <span className="sr-only">{message}</span>
    </div>
);

export default CreateSemester;
