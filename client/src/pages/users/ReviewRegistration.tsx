import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Mail, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageTitle } from '@/components/navigation/PageTitle';
import { CustomButton, RoleAssignmentForm } from '@/components/ui';
import { Textarea } from '@/components/ui/form-controls';
import { SystemRoleChoice, type SystemRole } from '@/components/users/SystemRoleChoice';
import { DetailList, ProfileHeader } from '@/components/users/UserProfileView';
import { FormField, FormSection } from '@/components/workspace/FormParts';
import { EmptyState, ErrorState, ListPageSkeleton } from '@/components/workspace/PageState';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { useSemesters } from '@/hooks/useSemesterQueries';
import { useRestoreUserAccess, useUser, useVerifyUser } from '@/hooks/useUserQueries';
import { buttonVariants } from '@/lib/button-variants';
import { cn } from '@/lib/utils';
import type { RoleAssignment } from '@/types/api';
import { formatCalendarDate, formatMoment, indiaToday } from '@/lib/dates';
import { rateChanges, type RateDraft, type RatePeriod } from '@/lib/semester-rates';

// A new volunteer has no saved rates yet.
const NO_PERIODS: RatePeriod[] = [];

const REQUESTS = '/users?view=requests';
const REVOKED = '/users?view=revoked';

// One page per application: who they are, what access to give, and a decision.
// Rejecting happens on the same page, so nothing stacks on a phone. Restoring a
// revoked person's access uses the same page: roles, rates, then restore.
const ReviewRegistration = ({ mode = 'review' }: { mode?: 'review' | 'restore' }) => {
    const restoring = mode === 'restore';
    const pageTitle = restoring ? 'Restore access' : 'Review registration';
    const backHref = restoring ? REVOKED : REQUESTS;
    const { userId = '' } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: applicant, isLoading, error, refetch } = useUser(userId);
    const verifyUser = useVerifyUser();
    const restoreAccess = useRestoreUserAccess();
    const [role, setRole] = useState<SystemRole>('USER');
    const [assignments, setAssignments] = useState<RoleAssignment[]>([{ subRole: 'EDUCATOR' }]);
    const [assignmentsValid, setAssignmentsValid] = useState(false);
    const [rateDrafts, setRateDrafts] = useState<Record<string, RateDraft>>({});
    const { data: semesters = [] } = useSemesters();
    // A returning person may have had rates before; a new applicant has none.
    const periods = applicant?.remunerationPeriods ?? NO_PERIODS;
    const changeRate = useCallback((semesterId: string, draft: RateDraft) => {
        setRateDrafts((current) => ({ ...current, [semesterId]: draft }));
    }, []);
    // Kept stable: the role form re-checks its errors whenever this changes.
    const rates = useMemo(() => ({ periods, drafts: rateDrafts, onChange: changeRate }), [periods, rateDrafts, changeRate]);
    const [attemptedApprove, setAttemptedApprove] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    // Some applications (spam, duplicates) are removed without writing back.
    const [emailApplicant, setEmailApplicant] = useState(true);
    const reasonRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (rejecting) reasonRef.current?.focus();
    }, [rejecting]);

    if (isLoading) {
        return <WorkspacePage><PageTitle title={pageTitle} /><ListPageSkeleton label={restoring ? 'Loading person' : 'Loading application'} rows={3} /></WorkspacePage>;
    }
    if (error || !applicant) {
        return (
            <WorkspacePage>
                <PageTitle title={pageTitle} />
                <ErrorState
                    title={restoring ? 'This person could not be loaded' : 'Application could not be loaded'}
                    description={restoring ? 'Check your connection and try again.' : 'It may already have been reviewed, or the request could not be completed.'}
                    onRetry={() => void refetch()}
                    backHref={backHref}
                    backLabel={restoring ? 'Back to revoked users' : 'Back to requests'}
                />
            </WorkspacePage>
        );
    }
    if (applicant.status !== (restoring ? 'REJECTED' : 'PENDING')) {
        return (
            <WorkspacePage>
                <PageTitle title={pageTitle} />
                <EmptyState
                    icon={Check}
                    title={restoring ? 'Access is not revoked' : 'Already reviewed'}
                    description={restoring ? `${applicant.name} can already sign in.` : `${applicant.name}'s application has already been decided.`}
                    action={<Link to={backHref} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-12')}>{restoring ? 'Back to revoked users' : 'Back to requests'}</Link>}
                />
            </WorkspacePage>
        );
    }

    const isBusy = verifyUser.isPending || restoreAccess.isPending;
    const canApprove = role === 'ADMIN' || (assignments.length > 0 && assignmentsValid);

    const approve = async () => {
        if (!canApprove) {
            // Say what is missing instead of leaving a mystery disabled button.
            setAttemptedApprove(true);
            window.requestAnimationFrame(() =>
                document.getElementById('assignment-errors')?.scrollIntoView({ block: 'start' }),
            );
            return;
        }
        // Rates go with the roles, so both are saved together and both are in the email.
        const roleAssignments = role === 'USER' ? assignments : undefined;
        const remunerationPeriods = role === 'USER' ? rateChanges({ assignments, periods, drafts: rateDrafts, semesters, today: indiaToday() }) : [];
        try {
            if (restoring) {
                await restoreAccess.mutateAsync({ userId, role, roleAssignments, remunerationPeriods, sendEmail: emailApplicant });
            } else {
                await verifyUser.mutateAsync({ userId, status: 'APPROVED', role, roleAssignments, remunerationPeriods });
            }
        } catch (failure) {
            toast.error(failure instanceof Error ? failure.message : restoring ? 'Unable to restore access. Try again.' : 'Unable to approve. Try again.');
            return;
        }
        if (restoring) {
            toast.success(emailApplicant ? `${applicant.name}'s access is restored. They'll get an email.` : `${applicant.name}'s access is restored.`);
            navigate(`/users/${userId}/details`);
            return;
        }
        toast.success(`${applicant.name} is approved. They'll get an email to set a password.`);
        navigate(REQUESTS);
    };

    const reject = async () => {
        if (emailApplicant && !reason.trim()) return;
        try {
            await verifyUser.mutateAsync({
                userId,
                status: 'REJECTED',
                role: 'USER',
                rejectionReason: emailApplicant ? reason.trim() : undefined,
                sendEmail: emailApplicant,
            });
            toast.success(emailApplicant ? `${applicant.name}'s application was rejected.` : `${applicant.name}'s application was removed. No email was sent.`);
            navigate(REQUESTS);
        } catch (failure) {
            toast.error(failure instanceof Error ? failure.message : 'Unable to reject. Try again.');
        }
    };

    return (
        <WorkspacePage className="space-y-5 lg:max-w-4xl" withMobileAction>
            <PageTitle title={pageTitle} />
            <ProfileHeader user={applicant} />

            <DetailList items={[
                { label: restoring ? 'Joined' : 'Applied', value: formatMoment(applicant.createdAt, { dateStyle: 'medium' }) },
                { label: 'Qualification', value: applicant.qualification || 'Not given' },
                { label: 'Date of birth', value: applicant.dob ? formatCalendarDate(applicant.dob) : 'Not given' },
                { label: 'Address', value: applicant.address || 'Not given', wide: true },
            ]} />

            {rejecting ? (
                <FormSection id="reject-heading" title="Reject application">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground">
                        <input
                            type="checkbox"
                            checked={emailApplicant}
                            disabled={isBusy}
                            onChange={(event) => setEmailApplicant(event.target.checked)}
                            className="h-5 w-5 shrink-0 accent-primary"
                        />
                        Email them the reason
                    </label>
                    {emailApplicant && (
                        <FormField htmlFor="rejection-reason" label="Reason" required hint="Sent to the applicant by email, so write it to them.">
                            <Textarea
                                ref={reasonRef}
                                id="rejection-reason"
                                rows={4}
                                value={reason}
                                disabled={isBusy}
                                aria-describedby="rejection-reason-hint"
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="For example: we're not taking new volunteers in your area this semester."
                            />
                        </FormField>
                    )}
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            {emailApplicant
                                ? `Goes to ${applicant.email}. Their application is then removed.`
                                : 'No email is sent. Their application is removed.'}
                        </span>
                    </p>
                </FormSection>
            ) : (
                <>
                    <FormSection id="access-heading" title="Access">
                        <SystemRoleChoice name="review-role" value={role} onChange={setRole} disabled={isBusy} />
                    </FormSection>
                    {role === 'USER' && (
                        <FormSection id="assignments-heading" title="Assignments" description="Volunteers need at least one.">
                            <RoleAssignmentForm
                                roleAssignments={assignments}
                                onChange={setAssignments}
                                userRole={role}
                                onValidationChange={(isValid: boolean) => setAssignmentsValid(isValid)}
                                showErrors={attemptedApprove}
                                rates={rates}
                            />
                        </FormSection>
                    )}
                    {restoring && (
                        <FormSection id="restore-email-heading" title="Email">
                            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground">
                                <input
                                    type="checkbox"
                                    checked={emailApplicant}
                                    disabled={isBusy}
                                    onChange={(event) => setEmailApplicant(event.target.checked)}
                                    className="h-5 w-5 shrink-0 accent-primary"
                                />
                                Email them that their access is back
                            </label>
                            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                    {emailApplicant
                                        ? `Goes to ${applicant.email}, with their roles and daily rate.`
                                        : 'No email is sent. They can sign in with their old password.'}
                                </span>
                            </p>
                        </FormSection>
                    )}
                </>
            )}

            <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                {rejecting ? (
                    <>
                        <button type="button" onClick={() => setRejecting(false)} disabled={isBusy} className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-12 px-5 text-base')}>
                            Back
                        </button>
                        <CustomButton
                            type="button"
                            variant="destructive"
                            onClick={() => void reject()}
                            isLoading={isBusy}
                            loadingMessage="Rejecting..."
                            disabled={emailApplicant && !reason.trim()}
                            className="min-h-12 flex-1 text-base sm:flex-none"
                        >
                            <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                            {emailApplicant ? 'Send rejection' : 'Reject without email'}
                        </CustomButton>
                    </>
                ) : restoring ? (
                    <>
                        <Link to={backHref} className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-12 px-5 text-base')}>
                            Cancel
                        </Link>
                        <CustomButton
                            type="button"
                            onClick={() => void approve()}
                            isLoading={isBusy}
                            loadingMessage="Restoring..."
                            className="min-h-12 flex-1 text-base sm:flex-none"
                        >
                            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                            Restore access
                        </CustomButton>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setRejecting(true)}
                            disabled={isBusy}
                            className="inline-flex min-h-12 items-center justify-center rounded-md border border-destructive/40 px-4 text-base font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
                        >
                            Reject
                        </button>
                        <CustomButton
                            type="button"
                            onClick={() => void approve()}
                            isLoading={isBusy}
                            loadingMessage="Approving..."
                            className="min-h-12 flex-1 text-base sm:flex-none"
                        >
                            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                            Approve
                            {/* The full label needs more room than the smallest phones have. */}
                            <span className="sr-only min-[360px]:not-sr-only min-[360px]:ml-1">as {role === 'ADMIN' ? 'administrator' : 'volunteer'}</span>
                        </CustomButton>
                    </>
                )}
            </div>
        </WorkspacePage>
    );
};

export default ReviewRegistration;
