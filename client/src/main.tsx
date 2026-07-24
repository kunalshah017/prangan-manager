import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

let reloadAfterServiceWorkerUpdate = false;
let recoveryPrompted = false;

const requestPwaRecovery = (kind: 'update' | 'recovery', registration?: ServiceWorkerRegistration) => {
  window.dispatchEvent(new CustomEvent('prangan:pwa-update', {
    detail: { kind, registration },
  }));
};

if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
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
        registration.update();
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
