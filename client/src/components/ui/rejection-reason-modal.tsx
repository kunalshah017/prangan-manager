import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { CustomButton } from './custom-button';

interface RejectionReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    userEmail: string;
    isRejecting: boolean;
}

const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    userEmail,
    isRejecting,
}) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!rejectionReason.trim()) {
            setError('Please provide a rejection reason');
            return;
        }

        try {
            await onConfirm(rejectionReason.trim());
            setRejectionReason('');
            setError('');
            onClose();
        } catch (error) {
            console.error('Failed to reject user:', error);
        }
    };

    const handleClose = () => {
        if (!isRejecting) {
            setRejectionReason('');
            setError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0  bg-opacity-50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Reject Registration</h2>
                            <p className="text-sm text-gray-600">Please provide a reason for rejection</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 p-2"
                        disabled={isRejecting}
                        title="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rejection Reason *
                        </label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => {
                                setRejectionReason(e.target.value);
                                setError('');
                            }}
                            placeholder="Please explain why this registration is being rejected..."
                            className={cn(
                                "w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
                                error ? "border-red-300" : "border-gray-300"
                            )}
                            rows={4}
                            disabled={isRejecting}
                        />
                        {error && (
                            <p className="mt-1 text-sm text-red-600">{error}</p>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> This rejection reason will be sent to the user at{' '}
                                    <span className="font-medium">{userEmail}</span> via email notification.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={handleClose}
                        className={cn(buttonVariants({ variant: 'outline' }))}
                        disabled={isRejecting}
                    >
                        Cancel
                    </button>
                    <CustomButton
                        onClick={handleConfirm}
                        variant="destructive"
                        isLoading={isRejecting}
                        loadingMessage="Rejecting..."
                        disabled={isRejecting || !rejectionReason.trim()}
                    >
                        Confirm Rejection
                    </CustomButton>
                </div>
            </div>
        </div>
    );
};

export default RejectionReasonModal;
