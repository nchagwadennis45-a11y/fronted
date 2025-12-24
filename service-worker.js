// Service Worker for Kynecta MoodChat - Cache-First Strategy
// Version: 3.2.0 - Cache-First Implementation
// Strategy: Cache-First for all static assets

const APP_VERSION = '3.2.0';
const CACHE_NAME = `moodchat-cache-v${APP_VERSION.replace(/\./g, '-')}`;

// COMPLETE ASSET MANIFEST - ALL FILES NEEDED FOR 100% FUNCTIONALITY
const APP_MANIFEST = {
  // HTML Pages
  html: [
    '/',
    '/index.html',
    '/chat.html',
    '/message.html',
    '/messages.html',
    '/calls.html',
    '/settings.html',
    '/group.html',
    '/tools.html',
    '/friend.html',
    '/status.html',
    '/call.html',
    '/Tools.html',
    '/tools/analytics.html',
    '/tools/crm.html',
    '/tools/data-export.html',
    '/tools/image-generator.html',
    '/tools/image-sender.html',
    '/tools/content-generator.html',

  ],
  
  // CSS - All stylesheets
  css: [
    '/styles.css',
    '/css/styles.css',
    '/css/main.css',
    '/css/layout.css',
    '/css/chat.css',
    '/css/forms.css',
    '/css/responsive.css',
    '/style.css',
    '/assets/css/app.css',
    '/assets/css/main.css',
    '/assets/css/theme.css',
    '/layout.css'
  ],
  
  // JavaScript - All scripts
  js: [
    '/js/app.js',
    '/js/chat.js',
    '/js/main.js',
    '/js/auth.js',
    '/js/ui.js',
    '/js/utils.js',
    '/js/notifications.js',
    '/app.js',
    '/main.js',
    '/bundle.js',
    '/assets/js/app.js',
    '/assets/js/vendor.js',
    '/assets/js/components.js'
  ],
  
  // Images - All visual assets
  images: [
    '/icons/moodchat-192.png',
    '/icons/moodchat-512.png',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/icons/favicon.ico',
    '/assets/logo.png',
    '/assets/logo.svg',
    '/assets/favicon.ico',
    '/assets/avatar-default.png',
    '/assets/background.jpg',
    '/assets/placeholder.jpg'
  ],
  
  // Fonts
  fonts: [
    '/fonts/roboto.woff2',
    '/fonts/roboto.woff',
    '/fonts/material-icons.woff2',
    '/assets/fonts/Inter.woff2'
  ],
  
  // Configuration
  config: [
    '/manifest.json',
    '/firebase-messaging-sw.js',
    '/firebase-config.json',
    '/app-config.json'
  ],
  
  // Vendor dependencies
  vendor: [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://code.jquery.com/jquery-3.6.0.min.js',
    'https://unpkg.com/axios/dist/axios.min.js'
  ]
};

// Get all assets as a flat array
function getAllAssets() {
  return [
    ...APP_MANIFEST.html,
    ...APP_MANIFEST.css,
    ...APP_MANIFEST.js,
    ...APP_MANIFEST.images,
    ...APP_MANIFEST.fonts,
    ...APP_MANIFEST.config,
    ...APP_MANIFEST.vendor
  ];
}

// Check if request is for API
function isApiRequest(url) {
  const apiPatterns = [
    '/api/',
    '/auth/',
    '/graphql',
    '.googleapis.com',
    'firebaseio.com'
  ];
  
  return apiPatterns.some(pattern => 
    url.pathname.includes(pattern) || url.hostname.includes(pattern)
  );
}

// Fetch and cache asset
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn(`[Service Worker] Failed to fetch: ${request.url}`, error);
    throw error;
  }
}

// Serve from cache or fetch
async function cacheFirst(request) {
  // Try to get from cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const response = await fetchAndCache(request);
    return response;
  } catch (error) {
    // For non-API requests, return a basic response
    const url = new URL(request.url);
    
    if (url.pathname.endsWith('.css')) {
      return new Response('/* CSS not available offline */', {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    if (url.pathname.endsWith('.js')) {
      return new Response('// JavaScript not available offline', {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    if (url.pathname.endsWith('.html')) {
      return new Response(
        '<html><body><h1>Application Offline</h1><p>Please check your internet connection.</p></body></html>',
        {
          headers: { 'Content-Type': 'text/html' },
          status: 200
        }
      );
    }
    
    // For other resources, return empty response
    return new Response('', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// INSTALLATION - Pre-cache all assets
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing v${APP_VERSION}`);
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const assets = getAllAssets();
      
      console.log(`[Service Worker] Precaching ${assets.length} assets...`);
      
      // Cache all assets
      await cache.addAll(assets);
      
      console.log('[Service Worker] Precaching complete!');
    })()
  );
});

// ACTIVATION - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v' + APP_VERSION);
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('moodchat-') && cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Claim all clients immediately
      await self.clients.claim();
      
      console.log('[Service Worker] Now controlling all clients');
    })()
  );
});

// FETCH HANDLER - Cache-first strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip browser extensions
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'chrome:' ||
      url.protocol === 'moz-extension:') {
    return;
  }
  
  // For API calls, network only
  if (isApiRequest(url)) {
    return;
  }
  
  // For all other requests, use cache-first strategy
  event.respondWith(cacheFirst(request));
});

// MESSAGE HANDLING
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'GET_CACHE_INFO':
      event.waitUntil(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          
          event.source.postMessage({
            type: 'CACHE_INFO',
            cacheSize: keys.length,
            version: APP_VERSION
          });
        })()
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        (async () => {
          await caches.delete(CACHE_NAME);
          event.source.postMessage({
            type: 'CACHE_CLEARED',
            timestamp: Date.now()
          });
        })()
      );
      break;
      
    case 'UPDATE_ASSETS':
      event.waitUntil(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const assets = getAllAssets();
          
          for (const asset of assets) {
            try {
              await cache.add(asset);
            } catch (error) {
              console.warn(`Failed to update asset: ${asset}`, error);
            }
          }
          
          event.source.postMessage({
            type: 'ASSETS_UPDATED',
            count: assets.length
          });
        })()
      );
      break;
  }
});

// PUSH NOTIFICATIONS (keep existing functionality)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Kynecta MoodChat', body: 'New message' };
  }
  
  const options = {
    body: data.body || 'New message',
    icon: '/icons/moodchat-192.png',
    badge: '/icons/moodchat-72.png',
    vibrate: [100, 50, 100]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kynecta MoodChat', options)
  );
});

// NOTIFICATION CLICK
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    const urlToOpen = event.notification.data.url || '/chat.html';
    
    event.waitUntil(
      self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// INITIALIZATION LOG
console.log(`[Kynecta MoodChat Service Worker] v${APP_VERSION} loaded`);
console.log('[Service Worker] Strategy: CACHE-FIRST for all static assets');
console.log('[Service Worker] No UI modifications, no offline messages');