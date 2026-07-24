import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebApp = (window.navigator as NavigatorWithStandalone).standalone === true;
    const hasBeenInstalled = localStorage.getItem('pwa-installed');

    if (hasBeenInstalled || isStandalone || isInWebApp) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true');
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  // Don't show button if already installed or no prompt available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Install Prangan Manager App"
    >
      <Smartphone className="h-4 w-4" aria-hidden="true" />
      <span>Install app</span>
    </button>
  );
};

export default PWAInstallButton; 