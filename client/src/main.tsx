import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register service worker for PWA functionality with robust update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Force check for updates on app load
        registration.update();
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready, prompt user to refresh
                const userChoice = confirm(
                  'A new version of the app is available. Refresh to update?\n\n' +
                  'Click "Cancel" if you want to continue with the current version.'
                );
                
                if (userChoice) {
                  // Tell the new service worker to skip waiting
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  
                  // Add a small delay to ensure message is processed
                  setTimeout(() => {
                    window.location.reload();
                  }, 100);
                } else {
                  console.log('User chose to continue with current version');
                }
              }
            });
          }
        });

        // Handle service worker controlling
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // New service worker has taken control, reload the page
          console.log('New service worker taking control, reloading...');
          window.location.reload();
        });

        // Add error recovery mechanism
        window.addEventListener('error', (event: ErrorEvent) => {
          // If we get critical errors that might be cache-related
          if (event.message && (
            event.message.includes('Loading chunk') ||
            event.message.includes('Loading CSS chunk') ||
            event.message.includes('Failed to fetch')
          )) {
            console.warn('Detected potential cache-related error, attempting recovery...');
            
            // Show user a recovery option
            const shouldClearCache = confirm(
              'The app encountered a loading error. This might be due to an outdated cache.\n\n' +
              'Would you like to clear the app cache and reload? This will fix most loading issues.'
            );
            
            if (shouldClearCache) {
              // Clear all caches and force reload
              if ('caches' in window) {
                caches.keys().then(cacheNames => {
                  Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                  ).then(() => {
                    console.log('All caches cleared, reloading...');
                    (window as Window).location.replace((window as Window).location.href);
                  });
                });
              } else {
                (window as Window).location.replace((window as Window).location.href);
              }
            }
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
        
        // If service worker registration fails, it might be due to cache issues
        // Provide recovery option
        console.warn('Service worker registration failed, providing recovery option...');
        
        // Only show this after a delay to avoid immediate popup on first visit
        setTimeout(() => {
          if (!navigator.serviceWorker.controller) {
            const shouldReload = confirm(
              'The app failed to initialize properly. This might be due to cached files.\n\n' +
              'Would you like to reload and clear the cache?'
            );
            
            if (shouldReload) {
              window.location.replace(window.location.href);
            }
          }
        }, 2000);
      });
  });
}ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
