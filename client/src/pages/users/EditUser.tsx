import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { PageTitle } from '@/components/navigation/PageTitle';
import { ConfirmationModal, RoleAssignmentForm } from '@/components/ui';
import { PersonDetailsFields, type PersonDetails, type PersonDetailsField } from '@/components/users/PersonDetailsFields';
import { SystemRoleChoice, type SystemRole } from '@/components/users/SystemRoleChoice';
import { ProfileHeader } from '@/components/users/UserProfileView';
import { DangerZone, FormActions, FormSection } from '@/components/workspace/FormParts';
import { ErrorState, ListPageSkeleton } from '@/components/workspace/PageState';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { Input } from '@/components/ui/form-controls';
import { FormField } from '@/components/workspace/FormParts';
import { useSemesters } from '@/hooks/useSemesterQueries';
import { useRevokeUserAccess, useSaveRemunerationPeriod, useUpdateUser, useUpdateUserBankDetails, useUser, type BankDetailsPatch } from '@/hooks/useUserQueries';
import { indiaToday } from '@/lib/dates';
import { rateChanges, type RateDraft, type RatePeriod } from '@/lib/semester-rates';
import type { RoleAssignment } from '@/types/api';

const NO_PERIODS: RatePeriod[] = [];

const BANK_FIELDS: Array<{ field: keyof BankDetailsPatch | 'confirmAccountNumber'; label: string }> = [
    { field: 'bankAccountNumber', label: 'New account number' },
    { field: 'confirmAccountNumber', label: 'Confirm new account number' },
    { field: 'bankAccountName', label: 'Name on account' },
    { field: 'bankIfsc', label: 'IFSC code' },
    { field: 'bankName', label: 'Bank name' },
    { field: 'bankBranch', label: 'Branch' },
    { field: 'upiId', label: 'UPI ID' },
];

const emptyDetails: PersonDetails = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    qualification: '',
    dob: '',
    address: '',
};

const EditUser = () => {
    const { userId = '' } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: user, isLoading, error, refetch } = useUser(userId);
    const updateUserMutation = useUpdateUser();
    const revokeUserAccess = useRevokeUserAccess();
    const updateBank = useUpdateUserBankDetails();
    const saveRate = useSaveRemunerationPeriod();
    const { data: semesters = [] } = useSemesters();
    const [rateDrafts, setRateDrafts] = useState<Record<string, RateDraft>>({});
    const periods = user?.remunerationPeriods ?? NO_PERIODS;
    const changeRate = useCallback((semesterId: string, draft: RateDraft) => {
        setRateDrafts((current) => ({ ...current, [semesterId]: draft }));
    }, []);
    // Kept stable: the role form re-checks its errors whenever this changes.
    const rates = useMemo(() => ({ periods, drafts: rateDrafts, onChange: changeRate }), [periods, rateDrafts, changeRate]);
    const [bank, setBank] = useState<Record<string, string>>({});
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [details, setDetails] = useState<PersonDetails>(emptyDetails);
    const [role, setRole] = useState<SystemRole>('USER');
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
    const [assignmentErrors, setAssignmentErrors] = useState<string[]>([]);
    const [isAssignmentValid, setIsAssignmentValid] = useState(true);
    const [errors, setErrors] = useState<Partial<Record<PersonDetailsField, string>>>({});
    const userPage = `/users/${userId}/details`;

    useEffect(() => {
        if (!user) return;
        setDetails({
            firstName: user.firstName || '',
            middleName: user.middleName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            qualification: user.qualification || '',
            dob: user.dob ? user.dob.slice(0, 10) : '',
            address: user.address || '',
        });
        setRole(user.role || 'USER');
        setRoleAssignments((user.roleAssignments ?? []).map((assignment) => ({
            subRole: assignment.subRole,
            projectId: assignment.projectId || '',
            centerId: assignment.centerId || '',
            semesterId: assignment.semesterId || '',
            semesterLevelId: assignment.semesterLevelId,
            semesterLevel: assignment.semesterLevel,
            committedDays: assignment.committedDays,
        })));
    }, [user]);

    const changeDetail = (field: PersonDetailsField, value: string) => {
        setDetails((current) => ({ ...current, [field]: value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const changeRole = (nextRole: SystemRole) => {
        setRole(nextRole);
        // Administrators work across everything, so they hold no assignments.
        if (nextRole === 'ADMIN') setRoleAssignments([]);
    };

    const validate = () => {
        const nextErrors: Partial<Record<PersonDetailsField, string>> = {};
        if (!details.firstName.trim()) nextErrors.firstName = 'Enter a first name.';
        if (!details.email.trim()) nextErrors.email = 'Enter an email address.';
        else if (!/\S+@\S+\.\S+/.test(details.email)) nextErrors.email = 'Enter a valid email address.';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0 && isAssignmentValid;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!validate()) return;
        const bankPatch = Object.fromEntries(
            Object.entries(bank).filter(([field, value]) => field !== 'confirmAccountNumber' && value.trim()),
        ) as BankDetailsPatch;
        if ((bank.bankAccountNumber ?? '').trim() !== (bank.confirmAccountNumber ?? '').trim()) {
            toast.error('The new account numbers do not match.');
            return;
        }
        if (bankPatch.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bankPatch.bankIfsc.trim())) {
            toast.error('Enter a valid IFSC code.');
            return;
        }
        try {
            await updateUserMutation.mutateAsync({
                userId,
                userData: {
                    ...details,
                    role,
                    firstName: details.firstName.trim(),
                    middleName: details.middleName.trim() || null,
                    lastName: details.lastName.trim() || null,
                    dob: details.dob || null,
                },
                roleAssignments: role === 'ADMIN' ? [] : roleAssignments.map((assignment) => ({
                    subRole: assignment.subRole,
                    projectId: assignment.projectId,
                    centerId: assignment.centerId,
                    semesterId: assignment.semesterId,
                    semesterLevelId: assignment.semesterLevelId ?? undefined,
                    committedDays: assignment.committedDays,
                })),
            });
            if (Object.keys(bankPatch).length > 0) {
                await updateBank.mutateAsync({ userId, bank: bankPatch });
            }
        } catch {
            toast.error('Unable to save changes. Try again.');
            return;
        }
        // Rates need the roles saved first: only paid roles can have one.
        const changes = role === 'ADMIN' ? [] : rateChanges({ assignments: roleAssignments, periods, drafts: rateDrafts, semesters, today: indiaToday() });
        try {
            for (const change of changes) await saveRate.mutateAsync({ ...change, userId });
        } catch (failure) {
            toast.error(`Roles saved, but the daily rate wasn't: ${failure instanceof Error ? failure.message : 'try again'}.`);
            return;
        }
        toast.success('Changes saved.');
        navigate(userPage);
    };

    const currentBankValue = (field: string) => {
        const summary = user?.bankSummary;
        if (field === 'bankAccountNumber') return summary?.accountLast4 ? `Current: •••• ${summary.accountLast4}` : 'Not added';
        if (field === 'bankIfsc') return summary?.bankIfsc ?? 'Not added';
        if (field === 'bankName') return summary?.bankName ?? 'Not added';
        if (field === 'upiId') return summary?.hasUpi ? 'Added (hidden)' : 'Not added';
        return '';
    };

    if (isLoading) {
        return <WorkspacePage><PageTitle title="Edit user" /><ListPageSkeleton label="Loading user" rows={3} /></WorkspacePage>;
    }
    if (error || !user) {
        return (
            <WorkspacePage>
                <PageTitle title="Edit user" />
                <ErrorState
                    title="User could not be loaded"
                    description="The account may no longer exist, or the request could not be completed."
                    onRetry={() => void refetch()}
                    backHref="/users"
                    backLabel="Back to users"
                />
            </WorkspacePage>
        );
    }

    return (
        <WorkspacePage className="space-y-5 lg:max-w-4xl" withMobileAction>
            <PageTitle title="Edit user" />
            <ProfileHeader user={user} />

            <form onSubmit={handleSubmit} className="space-y-5">
                <FormSection id="edit-user-details" title="Details">
                    <PersonDetailsFields
                        idPrefix="edit-user"
                        values={details}
                        onChange={changeDetail}
                        errors={errors}
                        disabled={updateUserMutation.isPending}
                    />
                </FormSection>

                <FormSection id="edit-user-access" title="Access">
                    <SystemRoleChoice name="system-role" value={role} onChange={changeRole} disabled={updateUserMutation.isPending} />
                </FormSection>

                {role === 'USER' && (
                    <FormSection id="edit-user-assignments" title="Assignments" description="What this volunteer does, and where.">
                        <RoleAssignmentForm
                            roleAssignments={roleAssignments}
                            onChange={setRoleAssignments}
                            userRole={role}
                            rates={rates}
                            onValidationChange={(isValid: boolean, messages: string[]) => {
                                setIsAssignmentValid(isValid);
                                setAssignmentErrors(messages);
                            }}
                        />
                        {assignmentErrors.length > 0 && (
                            <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                                {assignmentErrors.map((message) => <li key={message}>{message}</li>)}
                            </ul>
                        )}
                    </FormSection>
                )}

                <FormSection
                    id="edit-user-bank"
                    title="Bank details"
                    description="Fill in only what should change. Blank fields keep their current value."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {BANK_FIELDS.map(({ field, label }) => (
                            <FormField key={field} htmlFor={`edit-user-${field}`} label={label}>
                                <Input
                                    id={`edit-user-${field}`}
                                    value={bank[field] ?? ''}
                                    inputMode={field.includes('ccountNumber') ? 'numeric' : undefined}
                                    autoComplete="off"
                                    placeholder={currentBankValue(field)}
                                    onChange={(event) => setBank((current) => ({ ...current, [field]: field === 'bankIfsc' ? event.target.value.toUpperCase() : event.target.value }))}
                                />
                            </FormField>
                        ))}
                    </div>
                </FormSection>

                <FormActions
                    submitLabel="Save changes"
                    pendingLabel="Saving changes..."
                    isPending={updateUserMutation.isPending || updateBank.isPending || saveRate.isPending}
                    onCancel={() => navigate(userPage)}
                />
            </form>

            {user.status === 'APPROVED' && (
                <DangerZone
                    description="Signs this user out, stops new sign-ins and ends their active assignments. Their record and history are kept."
                    actionLabel="Revoke access"
                    onAction={() => setConfirmRevoke(true)}
                    isPending={revokeUserAccess.isPending}
                />
            )}
            <ConfirmationModal
                isOpen={confirmRevoke}
                onClose={() => setConfirmRevoke(false)}
                onConfirm={async () => {
                    try {
                        await revokeUserAccess.mutateAsync(user.id);
                        toast.success(`${user.name}'s access was revoked.`);
                        setConfirmRevoke(false);
                        navigate('/users');
                    } catch {
                        toast.error('Unable to revoke access. Try again.');
                    }
                }}
                title="Revoke access?"
                message={`This immediately signs ${user.name} out, prevents new sign-ins and removes all active role assignments. Their record and assignment history are kept.`}
                confirmText="Revoke access"
                loadingMessage="Revoking access..."
                isLoading={revokeUserAccess.isPending}
                variant="danger"
            />
        </WorkspacePage>
    );
};

export default EditUser;
