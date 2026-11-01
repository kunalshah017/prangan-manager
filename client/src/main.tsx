import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// iOS Safari ignores user-scalable=no for pinch gestures; cancel them here.
for (const gesture of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(gesture, (event) => event.preventDefault(), { passive: false })
}

let reloadAfterServiceWorkerUpdate = false;
let recoveryPrompted = false;

const requestPwaRecovery = (kind: 'update' | 'recovery', registration?: ServiceWorkerRegistration) => {
  window.dispatchEvent(new CustomEvent('prangan:pwa-update', {
    detail: { kind, registration },
  }));
};

if (import.meta.env.DEV) {
  // Push needs a service worker; ?dev keeps it from caching anything locally.
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw.js?dev').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  }
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames
        .filter((cacheName) => cacheName.startsWith('prangan-static') || cacheName.startsWith('prangan-runtime'))
        .forEach((cacheName) => void caches.delete(cacheName));
    });
  }
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          requestPwaRecovery('update', registration);
        }
        registration.update();
        // Installed apps resume from the background rather than reloading, so
        // also look for a new version on return to the app and every 30 minutes.
        const checkForUpdate = () => {
          if (navigator.onLine) void registration.update().catch(() => undefined);
        };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
        window.setInterval(checkForUpdate, 30 * 60 * 1000);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                requestPwaRecovery('update', registration);
              }
            });
          }
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloadAfterServiceWorkerUpdate) window.location.reload();
        });

        window.addEventListener('error', (event: ErrorEvent) => {
          if (event.message && (
            event.message.includes('Loading chunk') ||
            event.message.includes('Loading CSS chunk') ||
            event.message.includes('Failed to fetch')
          ) && !recoveryPrompted) {
            recoveryPrompted = true;
            requestPwaRecovery('recovery');
          }
        });
      })
      .catch((registrationError) => {
        console.warn('Service worker registration failed:', registrationError);
        requestPwaRecovery('recovery');
      });
  });
}

window.addEventListener('prangan:pwa-apply-update', ((event: Event) => {
  const registration = (event as CustomEvent<{ registration?: ServiceWorkerRegistration }>).detail.registration;
  if (!registration?.waiting) return;
  reloadAfterServiceWorkerUpdate = true;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}) as EventListener);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
