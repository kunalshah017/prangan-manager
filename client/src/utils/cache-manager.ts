// Cache management utilities for PWA updates
export class CacheManager {
  static async clearAllCaches(): Promise<void> {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
        console.log("All caches cleared successfully");
      }
    } catch (error) {
      console.error("Error clearing caches:", error);
    }
  }

  static async clearOldCaches(currentCacheNames: string[]): Promise<void> {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(
          (cacheName) => !currentCacheNames.includes(cacheName)
        );

        await Promise.all(
          oldCaches.map((cacheName) => {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }
    } catch (error) {
      console.error("Error clearing old caches:", error);
    }
  }

  static forceReload(): void {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Unregister service worker and reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });

        // Hard reload after unregistering
        window.location.replace(window.location.href);
      });
    } else {
      // Fallback hard reload
      window.location.replace(window.location.href);
    }
  }

  static async checkForUpdates(): Promise<boolean> {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        return registration.waiting !== null;
      } catch (error) {
        console.error("Error checking for updates:", error);
        return false;
      }
    }
    return false;
  }
}
