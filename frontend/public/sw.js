// Service Worker for TaskFlow
const CACHE_NAME = 'taskflow-v1';
const STATIC_CACHE = 'taskflow-static-v1';
const DYNAMIC_CACHE = 'taskflow-dynamic-v1';

// Resources to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// API endpoints that can be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/tasks/,
  /\/api\/auth\/profile/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return cached shell if offline
          return caches.match('/');
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy for real-time data
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );

  if (!shouldCache || request.method !== 'GET') {
    // Don't cache non-GET requests or uncacheable endpoints
    try {
      const response = await fetch(request);
      return response;
    } catch (error) {
      // Return offline message for failed requests
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'You are currently offline. Please check your connection.' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Network-first strategy for cacheable GET requests
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Returning cached API response for', request.url);
      return cachedResponse;
    }
    
    // Return offline message if no cache available
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Unable to load data. Please check your connection.' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('Service Worker: Returning cached response for', request.url);
    return cachedResponse;
  }

  // If not in cache, fetch from network and cache
  try {
    const response = await fetch(request);
    
    // Only cache GET requests with successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Failed to fetch', request.url, error);
    
    // Return offline fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#666">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event', event.tag);
  
  if (event.tag === 'task-sync') {
    event.waitUntil(syncTasks());
  }
});

// Sync tasks when back online
async function syncTasks() {
  try {
    // Get pending actions from IndexedDB or localStorage
    const pendingActions = JSON.parse(localStorage.getItem('pendingTaskActions') || '[]');
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/tasks', {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${action.token}`
          },
          body: JSON.stringify(action.data)
        });
        
        console.log('Service Worker: Synced action', action.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync action', action.id, error);
      }
    }
    
    // Clear synced actions
    localStorage.removeItem('pendingTaskActions');
    
    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
    
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}
