import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
    closeOnBackdrop = true,
    closeOnEscape = closeOnBackdrop,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previouslyFocusedElement = useRef<HTMLElement | null>(null);
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) return;

        previouslyFocusedElement.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        closeButtonRef.current?.focus();

        return () => {
            previouslyFocusedElement.current?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape" && closeOnEscape) {
            event.preventDefault();
            onClose();
        }

        if (event.key !== "Tab" || !dialogRef.current) return;

        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (!firstFocusable || !lastFocusable) return;

        if (event.shiftKey && document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                className={cn(
                    "bg-white/95 backdrop-blur-md p-6 rounded-lg shadow-xl border border-white/20 max-w-md w-full mx-4 relative",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Modal Content */}
                <div>{children}</div>
            </div>
        </div>
    );
};

export default Modal;
