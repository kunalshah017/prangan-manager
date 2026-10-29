import React from 'react';
import { cn } from '@/lib/utils';
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
                return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
            case 'warning':
                return 'bg-warning text-warning-foreground hover:bg-warning/90';
            default:
                return 'bg-primary text-primary-foreground hover:bg-primary/90';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} closeOnBackdrop={!isLoading} closeOnEscape={!isLoading}>
            <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">{message}</p>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-md border border-input px-4 text-foreground transition-colors hover:bg-muted"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <CustomButton
                        onClick={onConfirm}
                        isLoading={isLoading}
                        loadingMessage={loadingMessage}
                        className={cn('min-h-11', getConfirmButtonStyles())}
                    >
                        {confirmText}
                    </CustomButton>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
