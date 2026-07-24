import React, { useState } from 'react';
import { CustomButton } from '@/components/ui/custom-button';
import { Modal } from '@/components/ui/modal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import toast from 'react-hot-toast';

interface CacheManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CacheManagementModal: React.FC<CacheManagementModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [isClearing, setIsClearing] = useState(false);
    const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
    const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

    const handleClearCache = async () => {
        setIsClearing(true);

        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            // Clear localStorage and sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // Unregister service worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
            }

            toast.success('Cache cleared. Reloading with fresh app data...');
            window.location.replace(window.location.href);
        } catch (error) {
            console.error('Error clearing cache:', error);
            toast.error('Could not clear cached app data.');
            setIsClearing(false);
        }
    };

    const handleForceReload = () => {
        // Hard reload bypassing cache
        window.location.replace(window.location.href);
    };

    const handleCheckUpdates = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.update();

                if (registration.waiting) {
                    setWaitingRegistration(registration);
                    setShowUpdateConfirmation(true);
                } else {
                    toast.success('You are already using the latest version.');
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
                toast.error('Could not check for updates.');
            }
        } else {
            toast.error('Updates are not supported in this browser.');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="App Management">
            <div className="space-y-6">
                <div className="text-sm text-gray-600">
                    <p>If you're experiencing issues with the app, try one of these options:</p>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">Check for Updates</h3>
                        <p className="text-sm text-blue-700 mb-3">
                            Check if a new version of the app is available and apply it.
                        </p>
                        <CustomButton
                            onClick={handleCheckUpdates}
                            variant="outline"
                            className="w-full"
                        >
                            Check for Updates
                        </CustomButton>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                        <h3 className="font-semibold text-yellow-900 mb-2">Force Reload</h3>
                        <p className="text-sm text-yellow-700 mb-3">
                            Reload the app bypassing the browser cache. This often fixes loading issues.
                        </p>
                        <CustomButton
                            onClick={handleForceReload}
                            variant="outline"
                            className="w-full"
                        >
                            Force Reload
                        </CustomButton>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg">
                        <h3 className="font-semibold text-red-900 mb-2">Clear All Data</h3>
                        <p className="text-sm text-red-700 mb-3">
                            Clear all cached data, settings, and force a complete refresh.
                            Use this if other options don't work.
                        </p>
                        <CustomButton
                            onClick={handleClearCache}
                            isLoading={isClearing}
                            loadingMessage="Clearing..."
                            variant="destructive"
                            className="w-full"
                        >
                            Clear Cache & Reload
                        </CustomButton>
                    </div>
                </div>

                <div className="text-xs text-gray-500">
                    <p>
                        <strong>Note:</strong> Clearing cache will log you out and remove any
                        offline data. You'll need to log in again.
                    </p>
                </div>
            </div>
            <ConfirmationModal
                isOpen={showUpdateConfirmation}
                onClose={() => setShowUpdateConfirmation(false)}
                onConfirm={() => {
                    waitingRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
                    setShowUpdateConfirmation(false);
                    toast.success('Applying the update...');
                }}
                title="Update available"
                message="A newer version is ready. Apply it now to reload with the latest changes."
                confirmText="Update now"
            />
        </Modal>
    );
};
