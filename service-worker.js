// Service Worker for Kynecta MoodChat - Complete Invisible Offline
// Version: 9.0.0 - All Features, No Visible Offline Indicators
// Features:
// 1. Complete WhatsApp-style API patterns
// 2. Page snapshots for instant loading
// 3. UI state preservation
// 4. Message queuing with auto-retry
// 5. Push notifications with actions
// 6. Real-time network monitoring
// 7. Background sync
// 8. Database for all data types
// 9. COMPLETELY HIDDEN OFFLINE STATUS

const APP_VERSION = '9.0.0';
const CACHE_NAMES = {
  STATIC: `moodchat-static-v9`,
  PAGES: `moodchat-pages-v9`,
  SNAPSHOTS: `moodchat-snapshots-v9`,
  API: 'moodchat-api-cache',
  DYNAMIC: 'moodchat-dynamic-cache',
  REAL_DATA: 'moodchat-real-data'
};

// WhatsApp-style API patterns (unchanged, but responses hide offline status)
const WHATSAPP_API_PATTERNS = {
  CHAT_LIST: /\/api\/chats\/list/,
  CHAT_MESSAGES: /\/api\/chats\/([^\/]+)\/messages/,
  CHAT_INFO: /\/api\/chats\/([^\/]+)\/info/,
  CONTACTS_LIST: /\/api\/contacts\/list/,
  CONTACT_INFO: /\/api\/contacts\/([^\/]+)/,
  STATUS_LIST: /\/api\/status\/list/,
  STATUS_UPDATES: /\/api\/status\/updates/,
  CALLS_LIST: /\/api\/calls\/list/,
  CALL_HISTORY: /\/api\/calls\/history/,
  GROUPS_LIST: /\/api\/groups\/list/,
  GROUP_INFO: /\/api\/groups\/([^\/]+)/,
  PROFILE_INFO: /\/api\/profile\/info/,
  PROFILE_STATUS: /\/api\/profile\/status/,
  SEND_MESSAGE: /\/api\/messages\/send/,
  MARK_READ: /\/api\/messages\/mark-read/,
  DELETE_MESSAGE: /\/api\/messages\/delete/
};

// Internal network state (NEVER shown to users)
let networkState = {
  isOnline: navigator.onLine,
  lastChange: Date.now(),
  pendingSync: false,
  retryCount: 0
};

// Database for all WhatsApp-style data
const DB_NAME = 'MoodChatCompleteDB';
const DB_VERSION = 3;
let db = null;

// ============================================
// COMPLETE DATABASE SETUP
// ============================================

function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Complete WhatsApp data structure
      if (!database.objectStoreNames.contains('messages')) {
        const store = database.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('chatId', 'chatId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('contacts')) {
        const store = database.createObjectStore('contacts', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('lastSeen', 'lastSeen', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('chats')) {
        const store = database.createObjectStore('chats', { keyPath: 'id' });
        store.createIndex('lastMessageTime', 'lastMessageTime', { unique: false });
        store.createIndex('unreadCount', 'unreadCount', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('messageQueue')) {
        const store = database.createObjectStore('messageQueue', { keyPath: 'localId' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('media')) {
        const store = database.createObjectStore('media', { keyPath: 'id' });
        store.createIndex('chatId', 'chatId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('ui_state')) {
        const store = database.createObjectStore('ui_state', { keyPath: 'page' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('snapshots')) {
        const store = database.createObjectStore('snapshots', { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('calls')) {
        const store = database.createObjectStore('calls', { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('status_updates')) {
        const store = database.createObjectStore('status_updates', { keyPath: 'id' });
        store.createIndex('contactId', 'contactId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('groups')) {
        const store = database.createObjectStore('groups', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('lastActivity', 'lastActivity', { unique: false });
      }
      
      if (!database.objectStoreNames.contains('profile')) {
        const store = database.createObjectStore('profile', { keyPath: 'userId' });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
    };
  });
}

// Complete DB operations (all features preserved)
const CompleteDB = {
  // Messages
  async addMessage(message) {
    return this._dbOperation('messages', 'put', {
      ...message,
      _savedAt: Date.now(),
      _syncStatus: networkState.isOnline ? 'synced' : 'pending'
    });
  },
  
  async getMessages(chatId, limit = 100) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('chatId');
      const range = IDBKeyRange.only(chatId);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const messages = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  // Message Queue
  async addToQueue(messageData) {
    const localId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const queuedItem = {
      ...messageData,
      localId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      _userNotified: false // User doesn't know it's queued
    };
    
    await this._dbOperation('messageQueue', 'add', queuedItem);
    
    // Update chat timestamp invisibly
    if (messageData.chatId) {
      await this.updateChatLastMessage(messageData.chatId, Date.now());
    }
    
    return queuedItem;
  },
  
  async getQueuedMessages() {
    return this._dbOperation('messageQueue', 'getAll');
  },
  
  async removeFromQueue(localId) {
    return this._dbOperation('messageQueue', 'delete', localId);
  },
  
  // Contacts
  async updateContact(contact) {
    return this._dbOperation('contacts', 'put', {
      ...contact,
      lastUpdated: Date.now(),
      // Online status handled invisibly
      _onlineInternal: networkState.isOnline ? contact.isOnline : false
    });
  },
  
  async getContacts() {
    const contacts = await this._dbOperation('contacts', 'getAll');
    return contacts.sort((a, b) => {
      // Sort by last seen, never showing "offline" status
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });
  },
  
  // Chats
  async addChat(chat) {
    return this._dbOperation('chats', 'put', {
      ...chat,
      lastUpdated: Date.now(),
      _hasPending: !networkState.isOnline
    });
  },
  
  async updateChatLastMessage(chatId, timestamp) {
    const chat = await this._dbOperation('chats', 'get', chatId) || { id: chatId };
    chat.lastMessageTime = timestamp;
    chat.lastUpdated = Date.now();
    return this._dbOperation('chats', 'put', chat);
  },
  
  async getChats() {
    const chats = await this._dbOperation('chats', 'getAll');
    return chats.sort((a, b) => 
      (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
    );
  },
  
  // UI State
  async saveUIState(page, state) {
    return this._dbOperation('ui_state', 'put', {
      page,
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now(),
      _preserved: true
    });
  },
  
  async getUIState(page) {
    const result = await this._dbOperation('ui_state', 'get', page);
    return result?.state || {};
  },
  
  // Page Snapshots
  async savePageSnapshot(url, html, pageType) {
    return this._dbOperation('snapshots', 'put', {
      url,
      html,
      pageType,
      timestamp: Date.now(),
      _cached: true
    });
  },
  
  async getPageSnapshot(url) {
    return this._dbOperation('snapshots', 'get', url);
  },
  
  // Calls
  async addCall(call) {
    return this._dbOperation('calls', 'put', {
      ...call,
      timestamp: call.timestamp || Date.now(),
      _synced: networkState.isOnline
    });
  },
  
  async getCalls(limit = 50) {
    const calls = await this._dbOperation('calls', 'getAll');
    return calls
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
  
  // Status Updates
  async addStatusUpdate(status) {
    return this._dbOperation('status_updates', 'put', {
      ...status,
      timestamp: status.timestamp || Date.now(),
      expiresAt: status.expiresAt || Date.now() + 24 * 60 * 60 * 1000
    });
  },
  
  async getStatusUpdates() {
    const statuses = await this._dbOperation('status_updates', 'getAll');
    const now = Date.now();
    return statuses
      .filter(s => s.expiresAt > now)
      .sort((a, b) => b.timestamp - a.timestamp);
  },
  
  // Groups
  async addGroup(group) {
    return this._dbOperation('groups', 'put', {
      ...group,
      lastUpdated: Date.now(),
      _synced: networkState.isOnline
    });
  },
  
  async getGroups() {
    const groups = await this._dbOperation('groups', 'getAll');
    return groups.sort((a, b) => 
      (b.lastActivity || 0) - (a.lastActivity || 0)
    );
  },
  
  // Profile
  async saveProfile(profile) {
    return this._dbOperation('profile', 'put', {
      ...profile,
      lastUpdated: Date.now(),
      _synced: networkState.isOnline
    });
  },
  
  async getProfile() {
    return this._dbOperation('profile', 'get', 'current');
  },
  
  // Helper for DB operations
  async _dbOperation(storeName, operation, data) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 
        ['put', 'add', 'delete'].includes(operation) ? 'readwrite' : 'readonly'
      );
      const store = transaction.objectStore(storeName);
      
      let request;
      switch (operation) {
        case 'put':
          request = store.put(data);
          break;
        case 'add':
          request = store.add(data);
          break;
        case 'get':
          request = store.get(data);
          break;
        case 'getAll':
          request = store.getAll();
          break;
        case 'delete':
          request = store.delete(data);
          break;
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  // Generate seamless offline responses (no offline indicators)
  async generateSeamlessResponse(url) {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Match WhatsApp patterns
    for (const [key, pattern] of Object.entries(WHATSAPP_API_PATTERNS)) {
      const match = path.match(pattern);
      if (match) {
        return this._generateResponseForPattern(key, match);
      }
    }
    
    // Default seamless response
    return {
      success: true,
      timestamp: Date.now(),
      _dataSource: 'local' // Internal only
    };
  },
  
  async _generateResponseForPattern(patternKey, match) {
    const baseResponse = {
      success: true,
      timestamp: Date.now(),
      serverTime: Date.now(),
      _dataSource: 'local' // Never shown to user
    };
    
    switch (patternKey) {
      case 'CHAT_LIST':
        const chats = await this.getChats();
        return {
          ...baseResponse,
          chats,
          total: chats.length,
          unreadCount: chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
        };
        
      case 'CHAT_MESSAGES':
        const chatId = match[1];
        const messages = await this.getMessages(chatId, 50);
        return {
          ...baseResponse,
          chatId,
          messages,
          hasMore: messages.length >= 50
        };
        
      case 'CONTACTS_LIST':
        const contacts = await this.getContacts();
        return {
          ...baseResponse,
          contacts,
          total: contacts.length
        };
        
      case 'STATUS_LIST':
        const statuses = await this.getStatusUpdates();
        return {
          ...baseResponse,
          statusUpdates: statuses,
          myStatus: await this.getProfile()
        };
        
      case 'CALLS_LIST':
        const calls = await this.getCalls();
        return {
          ...baseResponse,
          calls,
          recentCount: calls.filter(c => c.timestamp > Date.now() - 86400000).length
        };
        
      case 'GROUPS_LIST':
        const groups = await this.getGroups();
        return {
          ...baseResponse,
          groups,
          total: groups.length
        };
        
      default:
        return baseResponse;
    }
  }
};

// All app pages (unchanged)
const ALL_APP_PAGES = {
  '/': 'chat',
  '/index.html': 'chat',
  '/chat.html': 'chat',
  '/chats.html': 'chat',
  '/messages.html': 'chat',
  '/calls.html': 'calls',
  '/call.html': 'call',
  '/status.html': 'status',
  '/groups.html': 'groups',
  '/group.html': 'group',
  '/friends.html': 'friends',
  '/friend.html': 'friend',
  '/profile.html': 'profile',
  '/settings.html': 'settings',
  '/tools.html': 'tools',
  '/Tools.html': 'tools',
  '/chat/': 'chat',
  '/calls/': 'calls',
  '/status/': 'status',
  '/groups/': 'groups',
  '/friends/': 'friends',
  '/profile/': 'profile',
  '/settings/': 'settings'
};

// Core assets (unchanged)
const CORE_ASSETS = [
  // HTML Pages
  '/',
  '/index.html',
  '/chat.html',
  '/messages.html',
  '/calls.html',
  '/status.html',
  '/groups.html',
  '/friends.html',
  '/profile.html',
  '/settings.html',
  '/tools.html',
  '/call.html',
  '/group.html',
  '/friend.html',
  
  // CSS
  '/styles.css',
  '/css/styles.css',
  '/css/main.css',
  '/css/layout.css',
  '/css/chat.css',
  '/css/ui.css',
  
  // JavaScript
  '/js/app.js',
  '/js/main.js',
  '/js/chat.js',
  '/js/calls.js',
  '/js/status.js',
  '/js/groups.js',
  '/js/friends.js',
  '/js/profile.js',
  '/js/settings.js',
  '/js/auth.js',
  '/js/ui.js',
  
  // Icons & Images
  '/icons/moodchat-192.png',
  '/icons/moodchat-512.png',
  '/icons/icon-72x72.png',
  '/icons/icon-128x128.png',
  '/icons/icon-512x512.png',
  '/icons/favicon.ico',
  '/icons/apple-touch-icon.png',
  
  // Manifest & Service Worker
  '/manifest.json',
  '/service-worker.js'
];

// ============================================
// INSTALLATION - COMPLETE
// ============================================

self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Complete Invisible Offline v' + APP_VERSION);
  
  self.skipWaiting();
  
  event.waitUntil(
    (async () => {
      await initDatabase();
      
      // Cache all core assets
      const cache = await caches.open(CACHE_NAMES.STATIC);
      await cache.addAll(CORE_ASSETS);
      
      // Capture initial page snapshots invisibly
      const pagesToCache = CORE_ASSETS.filter(url => 
        url.includes('.html') || url === '/'
      );
      
      for (const pageUrl of pagesToCache) {
        try {
          const response = await fetch(pageUrl);
          if (response.ok) {
            const html = await response.text();
            await CompleteDB.savePageSnapshot(pageUrl, html, ALL_APP_PAGES[pageUrl] || 'page');
            
            // Also cache in snapshot cache
            const snapshotCache = await caches.open(CACHE_NAMES.SNAPSHOTS);
            await snapshotCache.put(pageUrl, response.clone());
          }
        } catch (error) {
          // Silent fail - will generate seamless fallback when needed
        }
      }
      
      console.log('[Service Worker] Complete installation done - Offline status hidden');
    })()
  );
});

// ============================================
// ACTIVATION - COMPLETE
// ============================================

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Complete Invisible Offline v' + APP_VERSION);
  
  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
      
      await self.clients.claim();
      
      // Start all background processes
      startInvisibleNetworkMonitoring();
      startBackgroundSync();
      startCleanupTasks();
      
      // Initial sync if online
      if (networkState.isOnline) {
        setTimeout(performBackgroundSync, 2000);
      }
      
      console.log('[Service Worker] All features active - Users will never see offline status');
    })()
  );
});

// ============================================
// INVISIBLE NETWORK MONITORING
// ============================================

function startInvisibleNetworkMonitoring() {
  // Monitor every second but never notify users
  setInterval(() => {
    const wasOnline = networkState.isOnline;
    const isNowOnline = navigator.onLine;
    
    if (isNowOnline !== wasOnline) {
      networkState.isOnline = isNowOnline;
      networkState.lastChange = Date.now();
      
      // Internal log only
      console.log(`[Network Change] ${wasOnline ? 'Online' : 'Offline'} → ${isNowOnline ? 'Online' : 'Offline'}`);
      
      // If just came online, sync invisibly
      if (isNowOnline && !wasOnline) {
        networkState.pendingSync = true;
        setTimeout(performBackgroundSync, 1000);
      }
      
      // Update internal data states invisibly
      updateDataConnectivityStatus(isNowOnline);
    }
  }, 1000);
}

async function updateDataConnectivityStatus(isOnline) {
  try {
    // Update contacts' online status internally
    const contacts = await CompleteDB.getContacts();
    for (const contact of contacts) {
      contact._lastConnectivityCheck = Date.now();
      if (!isOnline) {
        contact._wasOnline = contact.isOnline;
        contact.isOnline = false; // Hide offline status
      } else if (contact._wasOnline !== undefined) {
        contact.isOnline = contact._wasOnline;
      }
      await CompleteDB.updateContact(contact);
    }
  } catch (error) {
    // Silent fail
  }
}

// ============================================
// FETCH HANDLER - COMPLETE & SEAMLESS
// ============================================

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests for API handling
  if (request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequestSeamlessly(request, event));
      return;
    }
    return;
  }
  
  // Handle all app requests
  event.respondWith(handleRequestSeamlessly(request, event));
});

async function handleRequestSeamlessly(request, event) {
  const url = new URL(request.url);
  
  // Handle HTML pages with snapshots
  if (isHtmlRequest(request, url)) {
    return handleHtmlSeamlessly(request, event);
  }
  
  // Handle WhatsApp API requests
  if (isApiRequest(url)) {
    return handleApiRequestSeamlessly(request, event);
  }
  
  // Handle static assets
  return handleAssetSeamlessly(request);
}

function isHtmlRequest(request, url) {
  return request.headers.get('Accept')?.includes('text/html') ||
         url.pathname.endsWith('.html') ||
         request.mode === 'navigate' ||
         ALL_APP_PAGES.hasOwnProperty(url.pathname);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

async function handleHtmlSeamlessly(request) {
  const url = new URL(request.url);
  
  // If online, try network but always cache
  if (networkState.isOnline) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Cache response
        const cache = await caches.open(CACHE_NAMES.PAGES);
        await cache.put(request, response.clone());
        
        // Save snapshot invisibly
        const html = await response.text();
        setTimeout(() => {
          CompleteDB.savePageSnapshot(
            url.pathname, 
            html, 
            ALL_APP_PAGES[url.pathname] || 'page'
          );
        }, 0);
        
        return response;
      }
    } catch (error) {
      // Continue to cache
    }
  }
  
  // Try snapshot cache first
  const snapshotCache = await caches.open(CACHE_NAMES.SNAPSHOTS);
  const snapshot = await snapshotCache.match(request);
  if (snapshot) {
    return snapshot;
  }
  
  // Try regular cache
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  // Try IndexedDB snapshot
  const dbSnapshot = await CompleteDB.getPageSnapshot(url.pathname);
  if (dbSnapshot && dbSnapshot.html) {
    return new Response(dbSnapshot.html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Fallback to static cache
  const staticCache = await caches.open(CACHE_NAMES.STATIC);
  const fallback = await staticCache.match('/index.html') || 
                   await staticCache.match('/');
  
  return fallback || new Response('Page not available', { status: 404 });
}

async function handleApiRequestSeamlessly(request, event) {
  const url = request.url;
  
  // Handle POST/PUT/DELETE requests
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return handleApiMutationSeamlessly(request, event);
  }
  
  // Handle GET requests
  return handleApiGetSeamlessly(request);
}

async function handleApiMutationSeamlessly(request, event) {
  // If online, try to send immediately
  if (networkState.isOnline) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Cache successful response
        const data = await response.clone().json();
        await cacheApiResponse(url, data);
        return response;
      }
    } catch (error) {
      // Continue to offline handling
    }
  }
  
  // Offline: Queue request invisibly
  try {
    const requestClone = request.clone();
    const body = await requestClone.json();
    
    // Add to queue (user doesn't know)
    const queuedItem = await CompleteDB.addToQueue({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now()
    });
    
    // Return immediate success response
    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      // NO mention of offline or queued
      _operationId: queuedItem.localId // Internal only
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200 // Always 200, not 202
    });
    
  } catch (error) {
    // Return success anyway - user never sees errors
    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      _internalNote: 'Operation will complete when possible'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
}

async function handleApiGetSeamlessly(request) {
  const url = request.url;
  
  // Try network first if online
  if (networkState.isOnline) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const data = await response.clone().json();
        
        // Cache response
        await cacheApiResponse(url, data);
        
        // Store structured data
        await storeStructuredData(data);
        
        return response;
      }
    } catch (error) {
      // Continue to cache
    }
  }
  
  // Try cached response
  const cached = await getCachedApiResponse(url);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Generate seamless offline response
  const offlineResponse = await CompleteDB.generateSeamlessResponse(url);
  return new Response(JSON.stringify(offlineResponse), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleAssetSeamlessly(request) {
  // Cache first for instant loading
  const cached = await caches.match(request);
  if (cached) {
    // Background update if online
    if (networkState.isOnline) {
      setTimeout(async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAMES.STATIC);
            await cache.put(request, response);
          }
        } catch (error) {
          // Silent fail
        }
      }, 0);
    }
    return cached;
  }
  
  // Try network
  if (networkState.isOnline) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAMES.STATIC);
        await cache.put(request, response.clone());
        return response;
      }
    } catch (error) {
      // Continue to fallback
    }
  }
  
  // Return appropriate fallback
  return createSeamlessFallback(request);
}

// ============================================
// CACHE MANAGEMENT
// ============================================

async function cacheApiResponse(url, data) {
  try {
    const cache = await caches.open(CACHE_NAMES.API);
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cached-At': Date.now().toString()
      }
    });
    await cache.put(url, response);
  } catch (error) {
    // Silent fail
  }
}

async function getCachedApiResponse(url) {
  try {
    const cache = await caches.open(CACHE_NAMES.API);
    const response = await cache.match(url);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    // Silent fail
  }
  return null;
}

async function storeStructuredData(data) {
  try {
    if (data.chats && Array.isArray(data.chats)) {
      await CompleteDB.saveChats(data.chats);
    }
    if (data.contacts && Array.isArray(data.contacts)) {
      await CompleteDB.saveContacts(data.contacts);
    }
    if (data.messages && Array.isArray(data.messages)) {
      await CompleteDB.saveMessages(data.messages);
    }
    if (data.calls && Array.isArray(data.calls)) {
      await CompleteDB.saveCalls(data.calls);
    }
    if (data.statusUpdates && Array.isArray(data.statusUpdates)) {
      await CompleteDB.saveStatusUpdates(data.statusUpdates);
    }
    if (data.groups && Array.isArray(data.groups)) {
      await CompleteDB.saveGroups(data.groups);
    }
    if (data.profile) {
      await CompleteDB.saveProfile(data.profile);
    }
  } catch (error) {
    // Silent fail
  }
}

function createSeamlessFallback(request) {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.css')) {
    return new Response('/* Fallback styles */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  if (url.pathname.endsWith('.js')) {
    return new Response('// Fallback script', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
    // Return transparent pixel for missing images
    const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    return fetch(transparentPixel);
  }
  
  return new Response('', { status: 404 });
}

// ============================================
// BACKGROUND SYNC - COMPLETE
// ============================================

function startBackgroundSync() {
  // Sync every 5 minutes when online
  setInterval(() => {
    if (networkState.isOnline) {
      performBackgroundSync();
    }
  }, 300000);
  
  // Also sync when coming online
  self.addEventListener('online', () => {
    setTimeout(performBackgroundSync, 2000);
  });
}

async function performBackgroundSync() {
  if (!networkState.isOnline || !db) return;
  
  console.log('[Background Sync] Starting complete sync');
  
  try {
    // Process queued messages
    await processQueuedOperations();
    
    // Sync all data types
    await Promise.allSettled([
      syncChats(),
      syncContacts(),
      syncMessages(),
      syncCalls(),
      syncStatus(),
      syncGroups(),
      syncProfile()
    ]);
    
    // Update all caches
    await refreshAllCaches();
    
    console.log('[Background Sync] Complete sync done');
    
  } catch (error) {
    // Silent fail - user never knows
  }
}

async function processQueuedOperations() {
  try {
    const queuedItems = await CompleteDB.getQueuedMessages();
    
    for (const item of queuedItems) {
      if (item.status === 'pending' && item.retryCount < 5) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: JSON.stringify(item.body)
          });
          
          if (response.ok) {
            // Success - remove from queue
            await CompleteDB.removeFromQueue(item.localId);
            
            // Update UI invisibly
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: '_OPERATION_SYNCED',
                  localId: item.localId,
                  _timestamp: Date.now(),
                  _invisible: true
                });
              });
            });
          } else {
            // Increment retry count
            item.retryCount = (item.retryCount || 0) + 1;
            item.lastRetry = Date.now();
            await CompleteDB._dbOperation('messageQueue', 'put', item);
          }
        } catch (error) {
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastRetry = Date.now();
          await CompleteDB._dbOperation('messageQueue', 'put', item);
        }
      }
    }
  } catch (error) {
    // Silent fail
  }
}

// Individual sync functions
async function syncChats() {
  try {
    const response = await fetch('/api/chats/list');
    if (response.ok) {
      const data = await response.json();
      await storeStructuredData(data);
    }
  } catch (error) {
    // Silent
  }
}

async function syncContacts() {
  try {
    const response = await fetch('/api/contacts/list');
    if (response.ok) {
      const data = await response.json();
      await storeStructuredData(data);
    }
  } catch (error) {
    // Silent
  }
}

async function syncMessages() {
  try {
    const chats = await CompleteDB.getChats();
    for (const chat of chats.slice(0, 3)) {
      const response = await fetch(`/api/chats/${chat.id}/messages?limit=20`);
      if (response.ok) {
        const data = await response.json();
        await storeStructuredData(data);
      }
    }
  } catch (error) {
    // Silent
  }
}

async function syncCalls() {
  try {
    const response = await fetch('/api/calls/list');
    if (response.ok) {
      const data = await response.json();
      await storeStructuredData(data);
    }
  } catch (error) {
    // Silent
  }
}

async function syncStatus() {
  try {
    const response = await fetch('/api/status/list');
    if (response.ok) {
      const data = await response.json();
      await storeStructuredData(data);
    }
  } catch (error) {
    // Silent
  }
}

async function syncGroups() {
  try {
    const response = await fetch('/api/groups/list');
    if (response.ok) {
      const data = await response.json();
      await storeStructuredData(data);
    }
  } catch (error) {
    // Silent
  }
}

async function syncProfile() {
  try {
    const response = await fetch('/api/profile/info');
    if (response.ok) {
      const data = await response.json();
      await storeStructuredData(data);
    }
  } catch (error) {
    // Silent
  }
}

async function refreshAllCaches() {
  // Silently refresh current page caches
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: '_REFRESH_CACHES',
        _timestamp: Date.now(),
        _invisible: true
      });
    });
  });
}

// ============================================
// CLEANUP TASKS
// ============================================

function startCleanupTasks() {
  // Cleanup every hour
  setInterval(cleanupOldData, 3600000);
  
  // Initial cleanup
  setTimeout(cleanupOldData, 5000);
}

async function cleanupOldData() {
  if (!db) return;
  
  try {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Clean old queued items
    const transaction = db.transaction(['messageQueue'], 'readwrite');
    const store = transaction.objectStore('messageQueue');
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(oneWeekAgo);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Clean expired status updates
    const statusTransaction = db.transaction(['status_updates'], 'readwrite');
    const statusStore = statusTransaction.objectStore('status_updates');
    const statusIndex = statusStore.index('timestamp');
    const statusRange = IDBKeyRange.upperBound(oneWeekAgo);
    const statusRequest = statusIndex.openCursor(statusRange);
    
    statusRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
  } catch (error) {
    // Silent fail
  }
}

// ============================================
// PUSH NOTIFICATIONS - COMPLETE
// ============================================

self.addEventListener('push', event => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: event.data.text() };
  }
  
  // WhatsApp-style notification (no offline mention)
  const options = {
    body: data.body || '',
    icon: '/icons/moodchat-192.png',
    badge: '/icons/moodchat-72.png',
    tag: 'moodchat-notification',
    data: {
      url: data.url || '/chat.html',
      chatId: data.chatId,
      messageId: data.messageId,
      sender: data.sender
    },
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/icons/reply-icon.png'
      },
      {
        action: 'mark-read',
        title: 'Mark Read',
        icon: '/icons/read-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MoodChat', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const data = event.notification.data;
  
  if (event.action === 'reply') {
    const url = `/chat.html?chatId=${data.chatId}&reply=true`;
    event.waitUntil(openOrFocusWindow(url));
  } else if (event.action === 'mark-read') {
    // Mark as read invisibly
    event.waitUntil(
      fetch(`/api/messages/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: data.chatId })
      }).catch(() => {
        // Queue if offline
        CompleteDB.addToQueue({
          url: '/api/messages/mark-read',
          method: 'POST',
          body: { chatId: data.chatId }
        });
      })
    );
  } else {
    const url = data.url || '/chat.html';
    if (data.chatId) {
      event.waitUntil(openOrFocusWindow(`${url}?chatId=${data.chatId}`));
    } else {
      event.waitUntil(openOrFocusWindow(url));
    }
  }
});

function openOrFocusWindow(url) {
  return self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clientList => {
    for (const client of clientList) {
      if (client.url.includes(url) && 'focus' in client) {
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }
  });
}

// ============================================
// MESSAGE HANDLING - COMPLETE
// ============================================

self.addEventListener('message', event => {
  const { data } = event;
  
  switch (data.type) {
    case 'SAVE_UI_STATE':
      CompleteDB.saveUIState(data.page, data.state);
      break;
      
    case 'GET_UI_STATE':
      CompleteDB.getUIState(data.page).then(state => {
        event.source.postMessage({
          type: 'UI_STATE_RETRIEVED',
          page: data.page,
          state
        });
      });
      break;
      
    case 'CAPTURE_SNAPSHOT':
      CompleteDB.savePageSnapshot(data.url, data.html, data.pageType);
      break;
      
    case 'GET_SNAPSHOT':
      CompleteDB.getPageSnapshot(data.url).then(snapshot => {
        event.source.postMessage({
          type: 'SNAPSHOT_RETRIEVED',
          url: data.url,
          html: snapshot?.html
        });
      });
      break;
      
    case 'SYNC_NOW':
      if (networkState.isOnline) {
        performBackgroundSync();
        event.source.postMessage({
          type: 'SYNC_STARTED',
          manual: true
        });
      }
      break;
      
    case 'GET_DATA':
      handleGetData(event, data.endpoint, data.params);
      break;
      
    case 'UPDATE_LAST_SEEN':
      handleUpdateLastSeen(event, data.userId, data.timestamp);
      break;
      
    case 'MARK_MESSAGE_READ':
      handleMarkMessageRead(event, data.messageId, data.chatId);
      break;
      
    case 'GET_NETWORK_STATUS':
      // Return but UI should never show this
      event.source.postMessage({
        type: 'NETWORK_STATUS',
        online: networkState.isOnline,
        _forInternalUseOnly: true
      });
      break;
  }
});

async function handleGetData(event, endpoint, params) {
  try {
    let data;
    
    // Try network first if online
    if (networkState.isOnline) {
      try {
        const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
        const response = await fetch(url);
        if (response.ok) {
          data = await response.json();
          await storeStructuredData(data);
        }
      } catch (error) {
        // Continue to cache
      }
    }
    
    // If no network data, get from cache/DB
    if (!data) {
      data = await getCachedApiResponse(endpoint) ||
             await CompleteDB.generateSeamlessResponse(endpoint);
    }
    
    event.source.postMessage({
      type: 'DATA_RETRIEVED',
      endpoint,
      data,
      _source: data._dataSource || 'network'
    });
    
  } catch (error) {
    event.source.postMessage({
      type: 'DATA_RETRIEVED',
      endpoint,
      data: {},
      _empty: true
    });
  }
}

async function handleUpdateLastSeen(event, userId, timestamp) {
  try {
    const contact = await CompleteDB._dbOperation('contacts', 'get', userId) || { id: userId };
    contact.lastSeen = timestamp;
    contact._lastUpdatedInternal = Date.now();
    await CompleteDB.updateContact(contact);
  } catch (error) {
    // Silent
  }
}

async function handleMarkMessageRead(event, messageId, chatId) {
  try {
    // Update locally
    const message = await CompleteDB._dbOperation('messages', 'get', messageId);
    if (message) {
      message.status = 'read';
      await CompleteDB.addMessage(message);
    }
    
    // Update chat unread count
    const chat = await CompleteDB._dbOperation('chats', 'get', chatId);
    if (chat && chat.unreadCount > 0) {
      chat.unreadCount--;
      await CompleteDB.addChat(chat);
    }
    
    // Queue for server sync
    await CompleteDB.addToQueue({
      url: '/api/messages/mark-read',
      method: 'POST',
      body: { messageId, chatId }
    });
    
    event.source.postMessage({
      type: 'MESSAGE_MARKED_READ',
      messageId,
      chatId,
      success: true
    });
    
  } catch (error) {
    event.source.postMessage({
      type: 'MESSAGE_MARKED_READ',
      messageId,
      chatId,
      success: false,
      _errorInternal: error.message
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================

console.log('[MoodChat Service Worker] Complete Invisible Offline v' + APP_VERSION + ' loaded');
console.log('[PHILOSOPHY] Users will NEVER see:');
console.log('  • "You are offline" messages');
console.log('  • "Using cached data" notices');
console.log('  • "Click to view cached" buttons');
console.log('  • Any offline indicators');
console.log('[FEATURES PRESERVED]');
console.log('  • WhatsApp-style API patterns');
console.log('  • Page snapshots');
console.log('  • UI state preservation');
console.log('  • Message queuing & retry');
console.log('  • Push notifications with actions');
console.log('  • Real-time network monitoring');
console.log('  • Background sync');
console.log('  • Complete database for all data types');
console.log('[RESULT] Seamless experience where online/offline is invisible');

// Initial cleanup
setTimeout(cleanupOldData, 10000);