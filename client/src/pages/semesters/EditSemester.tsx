import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { SemesterFormLayout } from '@/components/semesters/SemesterFormLayout';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAcademicLevels, useSemesterLevels } from '@/hooks/useAcademicLevelQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useDeleteSemester, useSemester, useUpdateSemester } from '@/hooks/useSemesterQueries';
import { SemesterRecovery, SemesterSkeleton } from '@/pages/semesters/CreateSemester';
import type { UpdateSemesterRequest } from '@/types/api';
import { sortByJourneyOrder } from '@/lib/levels';

const EditSemester = () => {
    const { projectId, centerId, id } = useParams<{ projectId: string; centerId: string; id: string }>();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [academicLevelIds, setAcademicLevelIds] = useState<string[]>([]);
    const [levelsInitialized, setLevelsInitialized] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { data: semester, isLoading: semesterLoading, error: semesterError, refetch: refetchSemester } = useSemester(id || '');
    const { data: center, isLoading: centerLoading, error: centerError, refetch: refetchCenter } = useCenter(centerId || '');
    const catalogQuery = useAcademicLevels({ includeArchived: true });
    const semesterLevelsQuery = useSemesterLevels(id || "", { includeInactive: true });
    const updateSemesterMutation = useUpdateSemester();
    const deleteSemesterMutation = useDeleteSemester();
    const semestersUrl = `/projects/${projectId}/centers/${centerId}/semesters`;

    useEffect(() => {
        if (!semester) return;
        setName(semester.name);
        setStartDate(semester.startDate.split('T')[0]);
        setEndDate(semester.endDate.split('T')[0]);
    }, [semester]);

    useEffect(() => {
        if (!semesterLevelsQuery.data || levelsInitialized) return;
        const levels = semesterLevelsQuery.data;
        setAcademicLevelIds(levels.map((level) => level.academicLevelId));
        setLevelsInitialized(true);
    }, [levelsInitialized, semesterLevelsQuery.data]);

    const catalogLevels = catalogQuery.data ?? [];
    const membershipLevels = semesterLevelsQuery.data?.map((level) => level.academicLevel) ?? [];
    const membershipIds = new Set(membershipLevels.map((level) => level.id));
    const availableAcademicLevels = sortByJourneyOrder([
        ...catalogLevels.filter((level) => level.isActive || membershipIds.has(level.id)),
        ...membershipLevels.filter((level) => !catalogLevels.some((candidate) => candidate.id === level.id)),
    ]);

    const contextMismatch = Boolean(semester?.centerId && semester.centerId !== centerId);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || contextMismatch) return;

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

        const updateData: UpdateSemesterRequest = { name: trimmedName, startDate, endDate, academicLevelIds };
        try {
            await updateSemesterMutation.mutateAsync({ id, data: updateData });
            toast.success('Semester changes saved.');
            navigate(semestersUrl);
        } catch {
            toast.error('Unable to save semester changes. Try again.');
        }
    };

    const handleDelete = async () => {
        if (!id || contextMismatch) return;
        try {
            await deleteSemesterMutation.mutateAsync(id);
            toast.success('Semester deleted.');
            navigate(semestersUrl);
        } catch {
            toast.error('Unable to delete this semester. Remove dependent records first and try again.');
        }
    };

    if (semesterLoading || centerLoading) {
        return <SemesterSkeleton message="Loading semester" />;
    }

    if (semesterError || centerError || !semester || !center || !centerId) {
        return (
            <SemesterRecovery
                title="Semester could not be loaded"
                message="The semester may no longer exist, or the request could not be completed."
                returnUrl={semestersUrl}
                onRetry={() => {
                    void refetchSemester();
                    void refetchCenter();
                }}
            />
        );
    }

    if (semester.centerId && semester.centerId !== centerId) {
        return (
            <SemesterRecovery
                title="Semester does not belong to this center"
                message={`This semester belongs to another center and cannot be edited from ${center.name}.`}
                returnUrl={semestersUrl}
            />
        );
    }

    return (
        <>
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete semester"
                message={`Delete "${semester.name}"? This cannot be undone and may be blocked while enrollment history exists.`}
                confirmText="Delete semester"
                cancelText="Cancel"
                isLoading={deleteSemesterMutation.isPending}
                loadingMessage="Deleting semester..."
                variant="danger"
            />

            <SemesterFormLayout
                mode="edit"
                centerName={center.name}
                name={name}
                startDate={startDate}
                endDate={endDate}
                academicLevels={availableAcademicLevels}
                academicLevelIds={academicLevelIds}
                academicLevelsLoading={catalogQuery.isLoading || semesterLevelsQuery.isLoading}
                academicLevelError={!!catalogQuery.error || !!semesterLevelsQuery.error}
                isPending={updateSemesterMutation.isPending}
                onNameChange={setName}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onAcademicLevelIdsChange={setAcademicLevelIds}
                onRetryAcademicLevels={() => {
                    void catalogQuery.refetch();
                    void semesterLevelsQuery.refetch();
                }}
                onSubmit={handleSubmit}
                onCancel={() => navigate(semestersUrl)}
                onDelete={() => setShowDeleteConfirm(true)}
                isDeletePending={deleteSemesterMutation.isPending}
            />
        </>
    );
};

export default EditSemester;
