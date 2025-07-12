import React from 'react';
import { Modal } from './modal';
import { CustomButton } from './custom-button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    loadingMessage?: string;
    variant?: 'danger' | 'warning' | 'default';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    loadingMessage = 'Processing...',
    variant = 'default',
}) => {
    const getConfirmButtonStyles = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'warning':
                return 'bg-yellow-600 hover:bg-yellow-700 text-white';
            default:
                return 'bg-orange-600 hover:bg-orange-700 text-white';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} closeOnBackdrop={!isLoading}>
            <div className="space-y-6">
                <p className="text-gray-600 leading-relaxed">{message}</p>

                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <CustomButton
                        onClick={onConfirm}
                        isLoading={isLoading}
                        loadingMessage={loadingMessage}
                        className={getConfirmButtonStyles()}
                    >
                        {confirmText}
                    </CustomButton>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
