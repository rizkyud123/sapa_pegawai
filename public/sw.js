const CACHE_NAME = 'sapa-dinkes-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and core assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Service Worker activated.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Required for Chrome PWA Installation prompt)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests from the same origin to avoid CSP connect-src issues with third-party assets
  if (
    event.request.method !== 'GET' || 
    !event.request.url.startsWith(self.location.origin) || 
    event.request.url.includes('/api/') || 
    event.request.url.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, but fetch fresh in background to update cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => { /* ignore */ });
        return cachedResponse;
      }
      
      return fetch(event.request).catch(() => {
        // Fallback for document navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Message Listener for trigger-notifications from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NATIVE_NOTIFICATION') {
    const { title, body, icon, badge, data } = event.data.payload;
    const options = {
      body: body || '',
      icon: icon || '/icon.svg',
      badge: badge || '/icon.svg',
      tag: 'sapa-notif-tag',
      renotify: true,
      data: data || {},
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Buka SAPA' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Notification Click Handler (Focuses existing tab or opens a new one)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
