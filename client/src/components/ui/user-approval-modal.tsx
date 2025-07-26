import React, { useState } from 'react';
import { X, UserCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import RoleAssignmentForm from './role-assignment-form';
import RejectionReasonModal from './rejection-reason-modal';
import { CustomButton } from './custom-button';
import type { User as UserType, RoleAssignment } from '@/types/api';

interface UserApprovalModalProps {
    user: UserType;
    isOpen: boolean;
    onClose: () => void;
    onApprove: (user: UserType, roleAssignments?: RoleAssignment[]) => Promise<void>;
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
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isValidRoles, setIsValidRoles] = useState(true);
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
            await onApprove(user, selectedRole === 'USER' ? roleAssignments : undefined);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-opacity-50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Review Registration</h2>
                            <p className="text-sm text-gray-600">Approve or reject this user registration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2"
                        disabled={isApproving || isRejecting}
                        title="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* User Information */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            {/* Profile Image Section */}
                            {user.profileImageUrl && (
                                <div className="mb-4 flex justify-center">
                                    <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden">
                                        <img
                                            src={user.profileImageUrl}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Name</label>
                                    <p className="text-gray-900">{user.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Email</label>
                                    <p className="text-gray-900">{user.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Phone</label>
                                    <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Qualification</label>
                                    <p className="text-gray-900">{user.qualification || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                                    <p className="text-gray-900">{user.dob ? formatDate(user.dob) : 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Registration Date</label>
                                    <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                                </div>
                                {user.address && (
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-gray-600">Address</label>
                                        <p className="text-gray-900">{user.address}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Assignment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                className={cn(
                                    "border-2 rounded-lg p-4 cursor-pointer transition-all",
                                    selectedRole === 'USER'
                                        ? "border-orange-500 bg-orange-50"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setSelectedRole('USER')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        selectedRole === 'USER' ? "border-orange-500 bg-orange-500" : "border-gray-300"
                                    )}>
                                        {selectedRole === 'USER' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-5 h-5 text-gray-600" />
                                            <span className="font-medium text-gray-900">Regular User</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Volunteer with specific role assignments and permissions
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    "border-2 rounded-lg p-4 cursor-pointer transition-all",
                                    selectedRole === 'ADMIN'
                                        ? "border-orange-500 bg-orange-50"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setSelectedRole('ADMIN')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        selectedRole === 'ADMIN' ? "border-orange-500 bg-orange-500" : "border-gray-300"
                                    )}>
                                        {selectedRole === 'ADMIN' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-gray-600" />
                                            <span className="font-medium text-gray-900">Administrator</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Full access to all features and management capabilities
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role Assignments - Only for USER role */}
                    <div className="mb-6">
                        <RoleAssignmentForm
                            roleAssignments={roleAssignments}
                            onChange={setRoleAssignments}
                            userRole={selectedRole}
                            onValidationChange={handleValidationChange}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className={cn(buttonVariants({ variant: 'outline' }))}
                        disabled={isApproving || isRejecting}
                    >
                        Cancel
                    </button>
                    <CustomButton
                        onClick={handleReject}
                        variant="destructive"
                        disabled={isApproving || isRejecting}
                    >
                        Reject
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
                    >
                        Approve as {selectedRole === 'ADMIN' ? 'Administrator' : 'User'}
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
        </div>
    );
};

export default UserApprovalModal;
