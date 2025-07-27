import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Shield, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import UserApprovalModal from '@/components/ui/user-approval-modal';
import { ProfilePicture } from '@/components/ui';
import { useRegistrationRequests, useVerifyUser } from '@/hooks/useUserQueries';
import type { User, RoleAssignment } from '@/types/api';

const RegistrationRequests = () => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // API hooks
    const { data: requests = [], isLoading, error } = useRegistrationRequests();
    const verifyUser = useVerifyUser();

    // Check if any operation is pending
    const isOperationPending = verifyUser.isPending;

    const toggleRowExpansion = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const openApprovalModal = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const closeApprovalModal = () => {
        setSelectedUser(null);
        setIsModalOpen(false);
    };

    const handleApprove = async (user: User, roleAssignments?: RoleAssignment[]) => {
        try {
            await verifyUser.mutateAsync({
                userId: user.id,
                status: 'APPROVED',
                role: roleAssignments ? 'USER' : 'ADMIN',
                email: user.email,
                name: user.name,
                roleAssignments,
            });
            toast.success(`${user.name} has been approved successfully!`);
        } catch (error) {
            console.error('Failed to approve user:', error);
            toast.error('Failed to approve user. Please try again.');
            throw error;
        }
    };

    const handleReject = async (user: User, rejectionReason: string) => {
        try {
            await verifyUser.mutateAsync({
                userId: user.id,
                status: 'REJECTED',
                role: user.role || 'USER',
                email: user.email,
                name: user.name,
                rejectionReason,
            });
            toast.success(`${user.name}'s request has been rejected.`);
        } catch (error) {
            console.error('Failed to reject user:', error);
            toast.error('Failed to reject user. Please try again.');
            throw error;
        }
    };

    const quickReject = async (user: User) => {
        const defaultReason = "Application does not meet the minimum requirements.";
        try {
            await handleReject(user, defaultReason);
        } catch (error) {
            // Error already handled in handleReject
            console.error('Quick reject failed:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Since the endpoint specifically returns unverified/pending users, no need to filter
    const pendingRequests = requests;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingButterfly size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="text-red-600 text-lg font-medium mb-2">Failed to load registration requests</div>
                <div className="text-gray-600">Please try refreshing the page</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 w-full relative">
            <DoodleBackground numElements={10} />

            <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Registration Requests</h1>
                        <p className="text-muted-foreground mt-1">
                            Review and manage volunteer registration requests
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex gap-2">
                        <div className="bg-white/80 rounded-lg px-3 py-2 border text-sm">
                            <span className="font-medium">{pendingRequests.length}</span> pending
                        </div>
                    </div>
                </div>

                {/* Pending Requests */}
                {pendingRequests.length > 0 ? (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-orange-700">Pending Requests</h2>

                        {/* Mobile View */}
                        <div className="block md:hidden space-y-4">
                            {pendingRequests.map((request) => (
                                <div key={request.id} className="bg-white/80 rounded-lg border shadow-sm p-4">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleRowExpansion(request.id)}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Profile Image */}
                                            <ProfilePicture
                                                imageUrl={request.profileImageUrl}
                                                name={request.name}
                                                size="xl"
                                                colorScheme="orange"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate">{request.name}</div>
                                                <div className="text-sm text-gray-500 truncate">{request.email}</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {formatDate(request.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex-shrink-0">
                                            {expandedRows.has(request.id) ? (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {expandedRows.has(request.id) && (
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-700">Phone:</span>
                                                    <span className="ml-2 text-gray-900">{request.phone || 'Not provided'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Date of Birth:</span>
                                                    <span className="ml-2 text-gray-900">
                                                        {request.dob ? new Date(request.dob).toLocaleDateString('en-IN') : 'Not provided'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Qualification:</span>
                                                    <span className="ml-2 text-gray-900">{request.qualification || 'Not provided'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Address:</span>
                                                    <span className="ml-2 text-gray-900">{request.address || 'Not provided'}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openApprovalModal(request)}
                                                        disabled={isOperationPending}
                                                        className={cn(
                                                            buttonVariants({ size: 'sm' }),
                                                            'bg-orange-600 hover:bg-orange-700 text-white flex-1 h-9 disabled:opacity-50'
                                                        )}
                                                    >
                                                        <Settings className="h-3 w-3 mr-2" />
                                                        {isOperationPending ? 'Loading...' : 'Configure & Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => quickReject(request)}
                                                        disabled={isOperationPending}
                                                        className={cn(
                                                            buttonVariants({ variant: 'outline', size: 'sm' }),
                                                            'text-red-600 border-red-200 hover:bg-red-50 h-9 px-3 disabled:opacity-50'
                                                        )}
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        {isOperationPending ? 'Loading...' : 'Reject'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block bg-white/80 rounded-lg border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Applicant
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Contact Info
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Submitted
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                            <th className="w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {pendingRequests.map((request) => (
                                            <React.Fragment key={request.id}>
                                                <tr
                                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                    onClick={() => toggleRowExpansion(request.id)}
                                                >
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {/* Profile Image */}
                                                            <ProfilePicture
                                                                imageUrl={request.profileImageUrl}
                                                                name={request.name}
                                                                size="lg"
                                                                colorScheme="orange"
                                                            />

                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium text-gray-900 truncate">{request.name}</div>
                                                                <div className="text-sm text-gray-500 truncate">{request.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">
                                                        <div>
                                                            <div>{request.phone || 'No phone'}</div>
                                                            <div className="text-xs text-gray-400">{request.qualification || 'No qualification'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">
                                                        {formatDate(request.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => openApprovalModal(request)}
                                                                disabled={isOperationPending}
                                                                className={cn(
                                                                    buttonVariants({ size: 'sm' }),
                                                                    'bg-orange-600 hover:bg-orange-700 text-white h-8 px-3 disabled:opacity-50'
                                                                )}
                                                            >
                                                                <Settings className="h-3 w-3 mr-1" />
                                                                {isOperationPending ? 'Loading...' : 'Configure'}
                                                            </button>
                                                            <button
                                                                onClick={() => quickReject(request)}
                                                                disabled={isOperationPending}
                                                                className={cn(
                                                                    buttonVariants({ variant: 'outline', size: 'sm' }),
                                                                    'text-red-600 border-red-200 hover:bg-red-50 h-8 px-3 disabled:opacity-50'
                                                                )}
                                                            >
                                                                <X className="h-3 w-3 mr-1" />
                                                                {isOperationPending ? 'Loading...' : 'Reject'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {expandedRows.has(request.id) ? (
                                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </td>
                                                </tr>
                                                {expandedRows.has(request.id) && (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-4 bg-gray-50">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="font-medium text-gray-700">Phone:</span>
                                                                    <span className="ml-2 text-gray-900">{request.phone || 'Not provided'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium text-gray-700">Date of Birth:</span>
                                                                    <span className="ml-2 text-gray-900">
                                                                        {request.dob ? new Date(request.dob).toLocaleDateString('en-IN') : 'Not provided'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium text-gray-700">Qualification:</span>
                                                                    <span className="ml-2 text-gray-900">{request.qualification || 'Not provided'}</span>
                                                                </div>
                                                                <div className="md:col-span-2">
                                                                    <span className="font-medium text-gray-700">Address:</span>
                                                                    <span className="ml-2 text-gray-900">{request.address || 'Not provided'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/80 rounded-lg border shadow-sm p-12 text-center">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="font-medium text-lg text-gray-900 mb-2">No registration requests</h3>
                        <p className="text-gray-500">
                            When users submit registration forms, they will appear here for review.
                        </p>
                    </div>
                )}
            </div>

            {/* User Approval Modal */}
            {selectedUser && (
                <UserApprovalModal
                    user={selectedUser}
                    isOpen={isModalOpen}
                    onClose={closeApprovalModal}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
};

export default RegistrationRequests;
