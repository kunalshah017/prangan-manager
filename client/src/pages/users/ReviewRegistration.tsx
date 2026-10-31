import { useEffect, useRef, useState } from 'react';
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
import { useUser, useVerifyUser } from '@/hooks/useUserQueries';
import { buttonVariants } from '@/lib/button-variants';
import { cn } from '@/lib/utils';
import type { RoleAssignment } from '@/types/api';
import { formatCalendarDate, formatMoment } from '@/lib/dates';

const REQUESTS = '/users?view=requests';

// One page per application: who they are, what access to give, and a decision.
// Rejecting happens on the same page, so nothing stacks on a phone.
const ReviewRegistration = () => {
    const { userId = '' } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: applicant, isLoading, error, refetch } = useUser(userId);
    const verifyUser = useVerifyUser();
    const [role, setRole] = useState<SystemRole>('USER');
    const [assignments, setAssignments] = useState<RoleAssignment[]>([{ subRole: 'EDUCATOR' }]);
    const [assignmentsValid, setAssignmentsValid] = useState(false);
    const [attemptedApprove, setAttemptedApprove] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const reasonRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (rejecting) reasonRef.current?.focus();
    }, [rejecting]);

    if (isLoading) {
        return <WorkspacePage><PageTitle title="Review registration" /><ListPageSkeleton label="Loading application" rows={3} /></WorkspacePage>;
    }
    if (error || !applicant) {
        return (
            <WorkspacePage>
                <PageTitle title="Review registration" />
                <ErrorState
                    title="Application could not be loaded"
                    description="It may already have been reviewed, or the request could not be completed."
                    onRetry={() => void refetch()}
                    backHref={REQUESTS}
                    backLabel="Back to requests"
                />
            </WorkspacePage>
        );
    }
    if (applicant.status !== 'PENDING') {
        return (
            <WorkspacePage>
                <PageTitle title="Review registration" />
                <EmptyState
                    icon={Check}
                    title="Already reviewed"
                    description={`${applicant.name}'s application has already been decided.`}
                    action={<Link to={REQUESTS} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-12')}>Back to requests</Link>}
                />
            </WorkspacePage>
        );
    }

    const isBusy = verifyUser.isPending;
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
        try {
            await verifyUser.mutateAsync({
                userId,
                status: 'APPROVED',
                role,
                roleAssignments: role === 'USER' ? assignments : undefined,
            });
            toast.success(`${applicant.name} is approved. They'll get an email to set a password.`);
            navigate(REQUESTS);
        } catch (failure) {
            toast.error(failure instanceof Error ? failure.message : 'Unable to approve. Try again.');
        }
    };

    const reject = async () => {
        if (!reason.trim()) return;
        try {
            await verifyUser.mutateAsync({ userId, status: 'REJECTED', role: 'USER', rejectionReason: reason.trim() });
            toast.success(`${applicant.name}'s application was rejected.`);
            navigate(REQUESTS);
        } catch (failure) {
            toast.error(failure instanceof Error ? failure.message : 'Unable to reject. Try again.');
        }
    };

    return (
        <WorkspacePage className="space-y-5 lg:max-w-4xl" withMobileAction>
            <PageTitle title="Review registration" />
            <ProfileHeader user={applicant} />

            <DetailList items={[
                { label: 'Applied', value: formatMoment(applicant.createdAt, { dateStyle: 'medium' }) },
                { label: 'Qualification', value: applicant.qualification || 'Not given' },
                { label: 'Date of birth', value: applicant.dob ? formatCalendarDate(applicant.dob) : 'Not given' },
                { label: 'Address', value: applicant.address || 'Not given', wide: true },
            ]} />

            {rejecting ? (
                <FormSection id="reject-heading" title="Reject application">
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
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Goes to {applicant.email}. Their application is then removed.</span>
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
                            />
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
                            disabled={!reason.trim()}
                            className="min-h-12 flex-1 text-base sm:flex-none"
                        >
                            <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                            Send rejection
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
