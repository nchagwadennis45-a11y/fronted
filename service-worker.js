// Service Worker for Kynecta MoodChat - Firebase Web Application
// Version: 1.2.2
// Project: kynecta-ee95c
// Firebase: 9.22.1 (Compact)

const APP_VERSION = '1.2.2';
const CACHE_NAME = 'kynecta-moodchat-cache-v1';
const CACHE_NAMES = {
  static: `kynecta-moodchat-static-v${APP_VERSION}`,
  dynamic: `kynecta-moodchat-dynamic-v${APP_VERSION}`,
  firebase: `kynecta-moodchat-firebase-v${APP_VERSION}`,
  app: 'kynecta-moodchat-cache-v1',
  moods: `kynecta-moodchat-moods-v${APP_VERSION}`
};

// CRITICAL FIX: Only cache files that definitely exist
// Use relative paths that match your actual file structure
const CRITICAL_ASSETS = [
  '/',  // This will resolve to index.html
  '/index.html'
];

// Firebase SDK 9.22.1 - Compact Version (Modular)
const FIREBASE_ASSETS = [
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-performance-compat.js'
];

// Install Event - Cache ONLY what exists
self.addEventListener('install', (event) => {
  console.log(`[Kynecta MoodChat Service Worker] Installing version ${APP_VERSION}...`);
  
  // Force activation of new service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      // Cache only critical HTML files that we KNOW exist
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('[Kynecta MoodChat Service Worker] Caching critical assets');
          // Only cache the root URL and index.html
          return cache.add('/').catch(err => {
            console.log('Failed to cache /, trying /index.html:', err);
            return cache.add('/index.html');
          });
        }),
      // Cache Firebase SDK separately - these URLs always exist
      caches.open(CACHE_NAMES.firebase)
        .then(cache => {
          console.log('[Kynecta MoodChat Service Worker] Caching Firebase SDK 9.22.1');
          return Promise.all(
            FIREBASE_ASSETS.map(asset => 
              cache.add(asset).catch(err => {
                console.warn(`Failed to cache Firebase asset ${asset}:`, err.message);
                return null;
              })
            )
          );
        })
    ]).then(() => {
      console.log('[Kynecta MoodChat Service Worker] Installation completed');
      
      // Initialize offline storage for mood selections
      return initializeOfflineStorage();
    }).then(() => {
      console.log('[Kynecta MoodChat Service Worker] Service Worker installed successfully');
    }).catch(error => {
      console.error('[Kynecta MoodChat Service Worker] Installation error:', error);
      // Continue installation even with errors
    })
  );
});

// Initialize IndexedDB for offline storage
async function initializeOfflineStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for offline mood selections
      if (!db.objectStoreNames.contains('moodSelections')) {
        const moodStore = db.createObjectStore('moodSelections', { keyPath: 'id', autoIncrement: true });
        moodStore.createIndex('timestamp', 'timestamp', { unique: false });
        moodStore.createIndex('synced', 'synced', { unique: false });
        console.log('[Kynecta MoodChat Service Worker] Created moodSelections object store');
      }
      
      // Create object store for offline interest selections
      if (!db.objectStoreNames.contains('interestSelections')) {
        const interestStore = db.createObjectStore('interestSelections', { keyPath: 'id', autoIncrement: true });
        interestStore.createIndex('timestamp', 'timestamp', { unique: false });
        interestStore.createIndex('synced', 'synced', { unique: false });
        console.log('[Kynecta MoodChat Service Worker] Created interestSelections object store');
      }
      
      // Create object store for offline queue (existing)
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      console.log('[Kynecta MoodChat Service Worker] Offline storage initialized');
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      console.error('[Kynecta MoodChat Service Worker] Failed to initialize offline storage:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Kynecta MoodChat Service Worker] Activating new version...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const deletions = cacheNames.map(cacheName => {
        // Delete old caches that don't match current version
        if ((cacheName.startsWith('uniconnect-') || cacheName.startsWith('kynecta-')) && 
            !Object.values(CACHE_NAMES).includes(cacheName) && 
            cacheName !== CACHE_NAME) {
          console.log('[Kynecta MoodChat Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
      });
      return Promise.all(deletions);
    }).then(() => {
      console.log('[Kynecta MoodChat Service Worker] Activation completed');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Enhanced Fetch Event - Cache as you go strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }

  const url = new URL(request.url);

  // HTML pages - Cache First for offline, update when online
  if (request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(handleHtmlWithCacheFirst(request));
    return;
  }

  // CSS and JS - Cache First for offline
  if (request.destination === 'style' || request.destination === 'script' ||
      url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(handleStaticWithCacheFirst(request));
    return;
  }

  // Images and icons - Cache First for offline
  if (request.destination === 'image' || url.pathname.includes('/icons/')) {
    event.respondWith(handleImageWithCacheFirst(request));
    return;
  }

  // Manifest file
  if (url.pathname.endsWith('manifest.json')) {
    event.respondWith(handleManifestWithCacheFirst(request));
    return;
  }

  // Firebase services - Network First with aggressive caching
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.pathname.includes('/__/') ||
      url.pathname.includes('/firestore/') ||
      url.pathname.includes('/identitytoolkit/')) {
    event.respondWith(handleFirebaseRequest(request));
  }
  // Firebase SDK files - Cache First (versioned URLs)
  else if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    event.respondWith(handleFirebaseSdkRequest(request));
  }
  else {
    // Default strategy - Network First
    event.respondWith(handleDefaultNetworkFirst(request));
  }
});

// HTML handler - Cache First with network update
async function handleHtmlWithCacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background if online
    updateCacheInBackground(request);
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future offline use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails and not in cache, return index.html
    const indexResponse = await caches.match('/index.html') || 
                          await caches.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    return new Response('Offline - No cached page available', {
      status: 408,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Static assets handler - Cache First with network update
async function handleStaticWithCacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background if online
    updateCacheInBackground(request);
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future offline use (if successful)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return appropriate offline response based on file type
    if (request.url.endsWith('.css')) {
      return new Response('/* Offline - CSS not available */', {
        status: 408,
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    if (request.url.endsWith('.js')) {
      return new Response('// Offline - JavaScript not available', {
        status: 408,
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    return new Response('Offline - Resource not available', {
      status: 408
    });
  }
}

// Image handler - Cache First with network update
async function handleImageWithCacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background if online
    updateCacheInBackground(request);
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future offline use (if successful)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // For missing images, return a transparent 1x1 pixel
    return new Response(
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PC9zdmc+',
      {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// Manifest handler
async function handleManifestWithCacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return basic manifest
    const basicManifest = {
      "name": "Kynecta MoodChat",
      "short_name": "MoodChat",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#1a73e8"
    };
    
    return new Response(JSON.stringify(basicManifest), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Default handler - Network First
async function handleDefaultNetworkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 408 });
  }
}

// Helper function to update cache in background
async function updateCacheInBackground(request) {
  // Only update if we're online
  if (navigator.onLine === false) return;
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silently fail - we already served from cache
  }
}

// Strategy for Firebase services - Network First with offline queue
async function handleFirebaseRequest(request) {
  const cache = await caches.open(CACHE_NAMES.firebase);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful Firebase responses (except real-time streams)
    if (networkResponse.ok && !request.url.includes('/channels/')) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Kynecta MoodChat Service Worker] Firebase request offline:', request.url);
    
    // Try to return cached version
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For Firestore, return offline structure
    if (request.url.includes('firestore.googleapis.com')) {
      return new Response(
        JSON.stringify({ 
          error: 'offline', 
          message: 'Firestore is offline',
          timestamp: Date.now()
        }),
        { 
          status: 408, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response('{ "status": "offline" }', {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Strategy for Firebase SDK - Cache First (versioned, so safe to cache)
async function handleFirebaseSdkRequest(request) {
  const cache = await caches.open(CACHE_NAMES.firebase);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('', { status: 408 });
  }
}

// Background Sync for Kynecta MoodChat with Firebase offline support
self.addEventListener('sync', (event) => {
  console.log('[Kynecta MoodChat Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'firebase-auth-sync') {
    event.waitUntil(syncFirebaseAuth());
  } else if (event.tag === 'firestore-sync') {
    event.waitUntil(syncFirestoreData());
  } else if (event.tag === 'kynecta-messages') {
    event.waitUntil(syncPendingMessages());
  } else if (event.tag === 'sync-mood-selections') {
    event.waitUntil(syncOfflineMoodSelections());
  } else if (event.tag === 'sync-interest-selections') {
    event.waitUntil(syncOfflineInterestSelections());
  }
});

// Sync offline mood selections when back online
async function syncOfflineMoodSelections() {
  console.log('[Kynecta MoodChat Service Worker] Syncing offline mood selections...');
  
  try {
    const unsyncedMoods = await getUnsyncedMoodSelections();
    
    if (unsyncedMoods.length === 0) {
      console.log('[Kynecta MoodChat Service Worker] No unsynced mood selections');
      return;
    }
    
    console.log(`[Kynecta MoodChat Service Worker] Found ${unsyncedMoods.length} unsynced mood selections`);
    
    // Notify app to sync with Firebase
    await self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_MOOD_SELECTIONS',
          moods: unsyncedMoods,
          timestamp: Date.now()
        });
      });
    });
    
    // Mark as synced after successful notification
    await markMoodSelectionsAsSynced(unsyncedMoods);
    
  } catch (error) {
    console.error('[Kynecta MoodChat Service Worker] Mood selection sync failed:', error);
  }
}

// Sync offline interest selections when back online
async function syncOfflineInterestSelections() {
  console.log('[Kynecta MoodChat Service Worker] Syncing offline interest selections...');
  
  try {
    const unsyncedInterests = await getUnsyncedInterestSelections();
    
    if (unsyncedInterests.length === 0) {
      console.log('[Kynecta MoodChat Service Worker] No unsynced interest selections');
      return;
    }
    
    console.log(`[Kynecta MoodChat Service Worker] Found ${unsyncedInterests.length} unsynced interest selections`);
    
    // Notify app to sync with Firebase
    await self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_INTEREST_SELECTIONS',
          interests: unsyncedInterests,
          timestamp: Date.now()
        });
      });
    });
    
    // Mark as synced after successful notification
    await markInterestSelectionsAsSynced(unsyncedInterests);
    
  } catch (error) {
    console.error('[Kynecta MoodChat Service Worker] Interest selection sync failed:', error);
  }
}

// Get unsynced mood selections from IndexedDB
async function getUnsyncedMoodSelections() {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['moodSelections'], 'readonly');
      const store = transaction.objectStore('moodSelections');
      const index = store.index('synced');
      const range = IDBKeyRange.only(false);
      const getAll = index.getAll(range);
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    
    request.onerror = () => resolve([]);
  });
}

// Get unsynced interest selections from IndexedDB
async function getUnsyncedInterestSelections() {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['interestSelections'], 'readonly');
      const store = transaction.objectStore('interestSelections');
      const index = store.index('synced');
      const range = IDBKeyRange.only(false);
      const getAll = index.getAll(range);
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    
    request.onerror = () => resolve([]);
  });
}

// Mark mood selections as synced
async function markMoodSelectionsAsSynced(selections) {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['moodSelections'], 'readwrite');
      const store = transaction.objectStore('moodSelections');
      
      selections.forEach(selection => {
        selection.synced = true;
        store.put(selection);
      });
      
      transaction.oncomplete = () => {
        console.log(`[Kynecta MoodChat Service Worker] Marked ${selections.length} mood selections as synced`);
        resolve();
      };
    };
    
    request.onerror = () => resolve();
  });
}

// Mark interest selections as synced
async function markInterestSelectionsAsSynced(selections) {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['interestSelections'], 'readwrite');
      const store = transaction.objectStore('interestSelections');
      
      selections.forEach(selection => {
        selection.synced = true;
        store.put(selection);
      });
      
      transaction.oncomplete = () => {
        console.log(`[Kynecta MoodChat Service Worker] Marked ${selections.length} interest selections as synced`);
        resolve();
      };
    };
    
    request.onerror = () => resolve();
  });
}

async function syncFirebaseAuth() {
  console.log('[Kynecta MoodChat Service Worker] Syncing Firebase Auth state...');
  // Sync authentication state when back online
  try {
    await self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FIREBASE_AUTH_SYNC',
          timestamp: Date.now()
        });
      });
    });
  } catch (error) {
    console.error('[Kynecta MoodChat Service Worker] Auth sync failed:', error);
  }
}

async function syncFirestoreData() {
  console.log('[Kynecta MoodChat Service Worker] Syncing Firestore data...');
  // Trigger Firestore offline data sync
  try {
    await self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FIRESTORE_SYNC',
          action: 'syncPendingWrites'
        });
      });
    });
  } catch (error) {
    console.error('[Kynecta MoodChat Service Worker] Firestore sync failed:', error);
  }
}

async function syncPendingMessages() {
  console.log('[Kynecta MoodChat Service Worker] Syncing pending messages...');
  // Sync unsent chat messages when back online
  try {
    await self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'MESSAGE_SYNC',
          timestamp: Date.now()
        });
      });
    });
  } catch (error) {
    console.error('[Kynecta MoodChat Service Worker] Message sync failed:', error);
  }
}

// Push Notifications for Kynecta MoodChat with Firebase Cloud Messaging
self.addEventListener('push', (event) => {
  console.log('[Kynecta MoodChat Service Worker] Push received from FCM');

  let notificationData = {
    title: 'Kynecta MoodChat',
    body: 'New notification',
    icon: '/icons/moodchat-192.png',
    image: '/icons/moodchat-512.png',
    badge: '/icons/moodchat-192.png'
  };
  
  if (event.data) {
    try {
      const fcmData = event.data.json();
      const data = fcmData.data || fcmData;
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.log('[Kynecta MoodChat Service Worker] FCM data parsing error:', error);
    }
  }
  
  const options = {
    body: notificationData.body || 'New update from Kynecta MoodChat',
    icon: notificationData.icon,
    badge: notificationData.badge,
    image: notificationData.image,
    vibrate: [100, 50, 100],
    data: {
      click_url: notificationData.url || '/',
      firebase_project: 'kynecta-ee95c',
      message_id: notificationData.messageId || Date.now(),
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    tag: 'kynecta-moodchat-fcm',
    renotify: true,
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .catch(error => {
        console.error('[Kynecta MoodChat Service Worker] Notification failed:', error);
      })
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('[Kynecta MoodChat Service Worker] FCM notification click');
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.click_url || '/';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      // Focus existing Kynecta MoodChat window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to specific page if needed
          if (urlToOpen !== '/') {
            client.postMessage({
              type: 'NAVIGATE_TO',
              url: urlToOpen,
              source: 'fcm_notification'
            });
          }
          return;
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message event for communication with Firebase app
self.addEventListener('message', (event) => {
  console.log('[Kynecta MoodChat Service Worker] Message received:', event.data);
  
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ 
        version: APP_VERSION,
        firebase: '9.22.1-compat',
        cache: CACHE_NAME,
        moodsCache: CACHE_NAMES.moods
      });
      break;
      
    case 'FIREBASE_OFFLINE_QUEUE':
      // Handle Firebase offline queue messages
      handleFirebaseOfflineQueue(data.payload);
      break;
      
    case 'SAVE_MOOD_OFFLINE':
      // Save mood selection offline
      saveMoodSelectionOffline(data.payload);
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'SAVE_INTEREST_OFFLINE':
      // Save interest selection offline
      saveInterestSelectionOffline(data.payload);
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'GET_OFFLINE_MOODS':
      // Get offline mood selections
      getOfflineMoodSelections().then(moods => {
        event.ports[0]?.postMessage({ moods });
      });
      break;
      
    case 'GET_OFFLINE_INTERESTS':
      // Get offline interest selections
      getOfflineInterestSelections().then(interests => {
        event.ports[0]?.postMessage({ interests });
      });
      break;
      
    case 'CLEAR_CACHE':
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.startsWith('uniconnect-') || cacheName.startsWith('kynecta-')) {
            caches.delete(cacheName);
          }
        });
      });
      break;
      
    case 'CHECK_OFFLINE_CACHE':
      caches.open(CACHE_NAME).then(cache => {
        cache.keys().then(keys => {
          event.ports[0]?.postMessage({
            cachedItems: keys.length,
            cacheName: CACHE_NAME,
            offlineReady: keys.length > 0
          });
        });
      });
      break;
      
    case 'REGISTER_MOOD_SYNC':
      // Register background sync for mood selections
      self.registration.sync.register('sync-mood-selections').then(() => {
        console.log('[Kynecta MoodChat Service Worker] Mood sync registered');
        event.ports[0]?.postMessage({ registered: true });
      }).catch(err => {
        console.error('[Kynecta MoodChat Service Worker] Mood sync registration failed:', err);
        event.ports[0]?.postMessage({ registered: false, error: err.message });
      });
      break;
      
    case 'REGISTER_INTEREST_SYNC':
      // Register background sync for interest selections
      self.registration.sync.register('sync-interest-selections').then(() => {
        console.log('[Kynecta MoodChat Service Worker] Interest sync registered');
        event.ports[0]?.postMessage({ registered: true });
      }).catch(err => {
        console.error('[Kynecta MoodChat Service Worker] Interest sync registration failed:', err);
        event.ports[0]?.postMessage({ registered: false, error: err.message });
      });
      break;
  }
});

// Save mood selection offline
async function saveMoodSelectionOffline(payload) {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['moodSelections'], 'readwrite');
      const store = transaction.objectStore('moodSelections');
      
      const moodSelection = {
        ...payload,
        timestamp: Date.now(),
        synced: false
      };
      
      const addRequest = store.add(moodSelection);
      
      addRequest.onsuccess = () => {
        console.log('[Kynecta MoodChat Service Worker] Mood selection saved offline:', moodSelection);
        resolve();
      };
      
      addRequest.onerror = (error) => {
        console.error('[Kynecta MoodChat Service Worker] Failed to save mood selection:', error);
        resolve();
      };
    };
    
    request.onerror = () => resolve();
  });
}

// FIXED: Added missing arrow function syntax
async function saveInterestSelectionOffline(payload) {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['interestSelections'], 'readwrite');
      const store = transaction.objectStore('interestSelections');
      
      const interestSelection = {
        ...payload,
        timestamp: Date.now(),
        synced: false
      };
      
      const addRequest = store.add(interestSelection);
      
      addRequest.onsuccess = () => {
        console.log('[Kynecta MoodChat Service Worker] Interest selection saved offline:', interestSelection);
        resolve();
      };
      
      addRequest.onerror = (error) => {
        console.error('[Kynecta MoodChat Service Worker] Failed to save interest selection:', error);
        resolve();
      };
    };
    
    request.onerror = () => resolve();
  });
}

// Get offline mood selections
async function getOfflineMoodSelections() {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['moodSelections'], 'readonly');
      const store = transaction.objectStore('moodSelections');
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    
    request.onerror = () => resolve([]);
  });
}

// Get offline interest selections
async function getOfflineInterestSelections() {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaMoodChatOfflineStorage', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['interestSelections'], 'readonly');
      const store = transaction.objectStore('interestSelections');
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    
    request.onerror = () => resolve([]);
  });
}

// Handle Firebase offline operations
async function handleFirebaseOfflineQueue(payload) {
  const { operation, collection, data } = payload;
  
  // Store offline operations in IndexedDB or cache for later sync
  const offlineQueue = await getOfflineQueue();
  offlineQueue.push({
    operation,
    collection,
    data,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  });
  
  await saveOfflineQueue(offlineQueue);
}

// IndexedDB for offline queue (simplified)
async function getOfflineQueue() {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaOffline', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
    };
    request.onerror = () => resolve([]);
  });
}

async function saveOfflineQueue(queue) {
  return new Promise((resolve) => {
    const request = indexedDB.open('kynectaOffline', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      queue.forEach(item => store.put(item));
      transaction.oncomplete = () => resolve();
    };
  });
}

// Firebase performance monitoring (if using performance compat)
self.addEventListener('fetch', (event) => {
  // Measure Firebase SDK load times
  if (event.request.url.includes('firebasejs')) {
    const startTime = Date.now();
    
    event.respondWith(
      fetch(event.request).then(response => {
        const loadTime = Date.now() - startTime;
        console.log(`[Kynecta Performance] Firebase SDK loaded in ${loadTime}ms`);
        return response;
      })
    );
  }
});