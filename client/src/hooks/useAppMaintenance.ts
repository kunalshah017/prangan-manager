import { useState } from "react";
import toast from "react-hot-toast";

// Keeping the app current and recovering it when something is stuck.
export function useAppMaintenance() {
  const [isChecking, setIsChecking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [waitingUpdate, setWaitingUpdate] = useState<ServiceWorkerRegistration | null>(null);

  const checkForUpdates = async () => {
    if (!("serviceWorker" in navigator)) {
      toast.error("This browser can't install app updates.");
      return;
    }
    setIsChecking(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      if (registration.waiting) setWaitingUpdate(registration);
      else toast.success("You're on the latest version.");
    } catch (error) {
      console.error("Error checking for updates:", error);
      toast.error("Couldn't check for updates. Try again when you're online.");
    } finally {
      setIsChecking(false);
    }
  };

  const applyUpdate = () => {
    waitingUpdate?.waiting?.postMessage({ type: "SKIP_WAITING" });
    setWaitingUpdate(null);
    toast.success("Updating…");
  };

  const reload = () => window.location.replace(window.location.href);

  // Signs the person out and resets every saved setting, so the page asks
  // for confirmation before calling this.
  const clearAppData = async () => {
    setIsClearing(true);
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      localStorage.clear();
      sessionStorage.clear();
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      toast.success("App data cleared. Reloading…");
      window.location.replace(window.location.href);
    } catch (error) {
      console.error("Error clearing app data:", error);
      toast.error("Couldn't clear app data.");
      setIsClearing(false);
    }
  };

  return {
    checkForUpdates,
    isChecking,
    updateReady: waitingUpdate !== null,
    applyUpdate,
    dismissUpdate: () => setWaitingUpdate(null),
    reload,
    clearAppData,
    isClearing,
  };
}
