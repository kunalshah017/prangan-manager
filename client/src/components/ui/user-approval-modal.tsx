import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import RoleAssignmentForm from './role-assignment-form';
import RejectionReasonModal from './rejection-reason-modal';
import { CustomButton } from './custom-button';
import { ProfilePicture } from './profile-picture';
import type { User as UserType, RoleAssignment } from '@/types/api';

interface UserApprovalModalProps {
    user: UserType;
    isOpen: boolean;
    onClose: () => void;
    onApprove: (user: UserType, role: 'USER' | 'ADMIN', roleAssignments?: RoleAssignment[]) => Promise<void>;
    onReject: (user: UserType, rejectionReason: string) => Promise<void>;
}

const UserApprovalModal: React.FC<UserApprovalModalProps> = ({
    user,
    isOpen,
    onClose,
    onApprove,
    onReject,
}) => {
    const [selectedRole, setSelectedRole] = useState<'USER' | 'ADMIN'>('USER');
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([{ subRole: 'TRAINING_DEVELOPMENT' }]);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isValidRoles, setIsValidRoles] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);

    if (!isOpen) return null;

    const handleValidationChange = (isValid: boolean) => {
        setIsValidRoles(isValid);
    };

    const handleApprove = async () => {
        if (selectedRole === 'USER' && !isValidRoles) {
            return; // Don't submit if there are validation errors
        }

        setIsApproving(true);
        try {
            await onApprove(user, selectedRole, selectedRole === 'USER' ? roleAssignments : undefined);
            onClose();
        } catch (error) {
            console.error('Failed to approve user:', error);
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        setShowRejectionModal(true);
    };

    const handleConfirmReject = async (rejectionReason: string) => {
        setIsRejecting(true);
        try {
            await onReject(user, rejectionReason);
            onClose();
        } catch (error) {
            console.error('Failed to reject user:', error);
        } finally {
            setIsRejecting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <button type="button" className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close registration review" disabled={isApproving || isRejecting} />

            {/* Modal */}
            <div role="dialog" aria-modal="true" aria-labelledby="review-registration-title" className="relative flex h-full max-h-[100dvh] flex-col w-full max-w-4xl overflow-hidden border border-border bg-card shadow-xl sm:h-auto sm:max-h-[90dvh] sm:rounded-lg">
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 sm:items-center sm:p-6">
                    <div className="min-w-0">
                            <h2 id="review-registration-title" className="text-xl font-semibold text-foreground">Review registration</h2>
                            <p className="text-sm text-muted-foreground">Confirm the account type and access scope before approving.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={isApproving || isRejecting}
                        aria-label="Close review"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    {/* User Information */}
                    <div className="mb-5 sm:mb-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">Applicant details</h3>
                        <div className="rounded-lg border border-border bg-muted/40 p-4">
                            {/* Profile Image Section */}
                            <div className="mb-4 hidden justify-center sm:flex">
                                <ProfilePicture
                                    imageUrl={user.profileImageUrl}
                                    name={user.name}
                                    size="w-24 h-24"
                                    colorScheme="orange"
                                />
                            </div>

                            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                                    <dd className="mt-1 text-foreground">{user.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                                    <dd className="mt-1 break-all text-foreground">{user.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                                    <dd className="mt-1 text-foreground">{user.phone || 'Not provided'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Qualification</dt>
                                    <dd className="mt-1 text-foreground">{user.qualification || 'Not provided'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Date of birth</dt>
                                    <dd className="mt-1 text-foreground">{user.dob ? formatDate(user.dob) : 'Not provided'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Submitted</dt>
                                    <dd className="mt-1 text-foreground">{formatDate(user.createdAt)}</dd>
                                </div>
                                {user.address && (
                                    <div className="md:col-span-2">
                                        <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                                        <dd className="mt-1 text-foreground">{user.address}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="mb-5 sm:mb-6">
                        <fieldset>
                        <legend className="text-lg font-semibold text-foreground">Account type</legend>
                        <p className="mt-1 text-sm text-muted-foreground">Volunteers need at least one scoped assignment. Administrators receive full portal access.</p>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className={cn("cursor-pointer rounded-lg border-2 p-4 transition-colors", selectedRole === 'USER' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                                <input type="radio" name="account-role" value="USER" checked={selectedRole === 'USER'} onChange={() => setSelectedRole('USER')} className="sr-only" />
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        selectedRole === 'USER' ? "border-primary bg-primary" : "border-muted-foreground"
                                    )}>
                                        {selectedRole === 'USER' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-5 h-5 text-primary" />
                                            <span className="font-medium text-foreground">Volunteer</span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Scoped access through the assignments below.
                                        </p>
                                    </div>
                                </div>
                            </label>

                            <label className={cn("cursor-pointer rounded-lg border-2 p-4 transition-colors", selectedRole === 'ADMIN' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                                <input type="radio" name="account-role" value="ADMIN" checked={selectedRole === 'ADMIN'} onChange={() => setSelectedRole('ADMIN')} className="sr-only" />
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        selectedRole === 'ADMIN' ? "border-primary bg-primary" : "border-muted-foreground"
                                    )}>
                                        {selectedRole === 'ADMIN' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-primary" />
                                            <span className="font-medium text-foreground">Administrator</span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Full access across the portal; no scoped assignments.
                                        </p>
                                    </div>
                                </div>
                            </label>
                        </div>
                        </fieldset>
                    </div>

                    {/* Role Assignments - Only for USER role */}
                    <div className="mb-6">
                        <RoleAssignmentForm
                            roleAssignments={roleAssignments}
                            onChange={setRoleAssignments}
                            userRole={selectedRole}
                            onValidationChange={handleValidationChange}
                        />
                        {selectedRole === 'USER' && !isValidRoles && (
                            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                                Complete the assignment fields to approve this volunteer.
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 gap-2 border-t border-border bg-card px-3 pt-3 sm:flex sm:items-center sm:justify-end sm:p-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    <button
                        onClick={onClose}
                        className={cn(buttonVariants({ variant: 'outline' }), "min-h-11")}
                        disabled={isApproving || isRejecting}
                    >
                        Cancel
                    </button>
                    <CustomButton
                        onClick={handleReject}
                        variant="destructive"
                        disabled={isApproving || isRejecting}
                        className="min-h-11 bg-destructive text-white hover:text-white hover:bg-destructive/90"
                    >
                        Reject application
                    </CustomButton>
                    <CustomButton
                        onClick={handleApprove}
                        isLoading={isApproving}
                        loadingMessage="Approving..."
                        disabled={
                            isApproving ||
                            isRejecting ||
                            (selectedRole === 'USER' && (roleAssignments.length === 0 || !isValidRoles))
                        }
                        className="col-span-2 min-h-11 sm:col-auto"
                    >
                        Approve as {selectedRole === 'ADMIN' ? 'Administrator' : 'Volunteer'}
                    </CustomButton>
                </div>

                {/* Rejection Reason Modal */}
                <RejectionReasonModal
                    isOpen={showRejectionModal}
                    onClose={() => setShowRejectionModal(false)}
                    onConfirm={handleConfirmReject}
                    userEmail={user.email}
                    isRejecting={isRejecting}
                />
            </div>
        </div>,
        document.body,
    );
};

export default UserApprovalModal;
