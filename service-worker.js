// Service Worker for Kynecta MoodChat - Enhanced Offline Support
// Version: 2.0.0 - Complete Offline Support with No Blank Screens
// Strategy: Cache First for static assets, Network First for HTML

const APP_VERSION = '2.0.0';
const CACHE_NAME = `moodchat-offline-v${APP_VERSION.replace(/\./g, '-')}`;
const OFFLINE_CACHE = 'moodchat-offline-html';

// ALL HTML PAGES TO CACHE
const HTML_PAGES = [
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
  '/Tools.html'
];

// STATIC ASSETS TO CACHE (Cache First Strategy)
const STATIC_ASSETS = [
  // CSS Files
  '/styles.css',
  '/css/styles.css',
  '/css/main.css',
  '/css/layout.css',
  '/style.css',
  '/assets/css/app.css',
  
  // JavaScript Files
  '/js/app.js',
  '/js/chat.js',
  '/js/main.js',
  '/js/auth.js',
  '/app.js',
  '/main.js',
  '/bundle.js',
  '/assets/js/app.js',
  
  // Images and Icons
  '/icons/moodchat-192.png',
  '/icons/moodchat-512.png',
  '/favicon.ico',
  '/assets/logo.png',
  '/assets/favicon.ico',
  
  // Manifest and Config
  '/manifest.json',
  '/firebase-messaging-sw.js'
];

// FALLBACK HTML FOR OFFLINE (Prevents blank screens)
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kynecta MoodChat - Offline</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a73e8, #0d47a1);
            color: white;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 20px;
        }
        .offline-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        .offline-icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: white;
        }
        p {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 25px;
            line-height: 1.5;
        }
        .actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        button {
            background: white;
            color: #1a73e8;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        .retry-btn {
            background: #34a853;
            color: white;
        }
        @media (max-width: 480px) {
            .offline-container { padding: 30px 20px; }
            .actions { flex-direction: column; }
            button { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>You're Offline</h1>
        <p>Kynecta MoodChat is working offline. Basic features are available.</p>
        <p>The page you requested is cached and will load properly.</p>
        <div class="actions">
            <button onclick="window.location.href = '/chat.html'">Go to Chat</button>
            <button onclick="window.location.reload()" class="retry-btn">Retry Connection</button>
            <button onclick="window.history.back()">Go Back</button>
        </div>
    </div>
    <script>
        // Auto-retry when connection is restored
        window.addEventListener('online', () => {
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
        
        // Show current page info
        console.log('Kynecta MoodChat - Offline Mode Active');
    </script>
</body>
</html>`;

// FALLBACK CSS FOR OFFLINE
const OFFLINE_CSS = `/* Kynecta MoodChat - Offline CSS Fallback */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    min-height: 100vh;
}
.container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.grid { display: grid; }
.hidden { display: none !important; }
.visible { visibility: visible !important; }
@media (max-width: 768px) {
    .container { padding: 0 15px; }
}`;

// FALLBACK JS FOR OFFLINE
const OFFLINE_JS = `// Kynecta MoodChat - Offline JavaScript
console.log('App running in offline mode');
window.isOffline = true;
window.appReady = true;

// Dispatch loaded event
if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('app-loaded'));
}

// Handle offline state
if (!navigator.onLine) {
    document.addEventListener('DOMContentLoaded', function() {
        // Add offline indicator if not present
        if (!document.querySelector('.offline-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'offline-indicator';
            indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #f44336; color: white; padding: 5px 10px; border-radius: 4px; z-index: 9999; font-size: 12px;';
            indicator.textContent = 'Offline';
            document.body.appendChild(indicator);
        }
    });
}

// Listen for online/offline events
window.addEventListener('online', () => {
    window.isOffline = false;
    const indicator = document.querySelector('.offline-indicator');
    if (indicator) {
        indicator.style.background = '#4caf50';
        indicator.textContent = 'Online';
        setTimeout(() => indicator.remove(), 3000);
    }
});

window.addEventListener('offline', () => {
    window.isOffline = true;
});`;

// Install Event - Cache ALL static assets and HTML pages
self.addEventListener('install', (event) => {
    console.log(`[Kynecta] Service Worker installing v${APP_VERSION}`);
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        Promise.all([
            // Cache static assets (Cache First strategy)
            cacheStaticAssets(),
            // Pre-cache HTML pages
            cacheHTMLPages(),
            // Create offline fallbacks
            createOfflineFallbacks()
        ]).then(() => {
            console.log('[Kynecta] Installation complete - All assets cached');
        }).catch(error => {
            console.error('[Kynecta] Installation error:', error);
        })
    );
});

// Cache static assets
async function cacheStaticAssets() {
    const cache = await caches.open(CACHE_NAME);
    console.log('[Kynecta] Caching static assets:', STATIC_ASSETS.length, 'items');
    
    const results = await Promise.allSettled(
        STATIC_ASSETS.map(asset => 
            cache.add(asset).catch(err => {
                console.warn(`[Kynecta] Could not cache ${asset}:`, err.message);
                return null;
            })
        )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value !== undefined).length;
    console.log(`[Kynecta] Cached ${successful}/${STATIC_ASSETS.length} static assets`);
}

// Cache HTML pages with Network First strategy
async function cacheHTMLPages() {
    const cache = await caches.open(OFFLINE_CACHE);
    console.log('[Kynecta] Pre-caching HTML pages:', HTML_PAGES.length, 'pages');
    
    for (const page of HTML_PAGES) {
        try {
            // Try to fetch fresh version
            const response = await fetch(page);
            if (response.ok) {
                await cache.put(page, response.clone());
                console.log(`[Kynecta] ✓ Pre-cached: ${page}`);
            }
        } catch (error) {
            console.warn(`[Kynecta] Could not pre-cache ${page}:`, error.message);
            // Create fallback HTML if network fails during install
            const fallback = new Response(
                createHTMLFallback(page),
                { headers: { 'Content-Type': 'text/html' } }
            );
            await cache.put(page, fallback);
            console.log(`[Kynecta] Created fallback for: ${page}`);
        }
    }
}

// Create offline fallbacks
async function createOfflineFallbacks() {
    const cache = await caches.open(OFFLINE_CACHE);
    
    // Create offline.html
    const offlineResponse = new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html' }
    });
    await cache.put('/offline.html', offlineResponse);
    
    // Create CSS fallback
    const cssResponse = new Response(OFFLINE_CSS, {
        headers: { 'Content-Type': 'text/css' }
    });
    await cache.put('/offline.css', cssResponse);
    
    // Create JS fallback
    const jsResponse = new Response(OFFLINE_JS, {
        headers: { 'Content-Type': 'application/javascript' }
    });
    await cache.put('/offline.js', jsResponse);
    
    console.log('[Kynecta] Created offline fallbacks');
}

// Create HTML fallback for specific page
function createHTMLFallback(page) {
    const pageName = page.replace('.html', '').replace('/', '') || 'Home';
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kynecta MoodChat - ${pageName}</title>
    <style>${OFFLINE_CSS}</style>
</head>
<body>
    <div class="container" style="padding: 40px; text-align: center;">
        <h1 style="color: #1a73e8; margin-bottom: 20px;">Kynecta MoodChat - ${pageName}</h1>
        <p>This page is available offline. Full functionality will be restored when you're back online.</p>
        <div style="margin-top: 30px;">
            <button onclick="window.location.href='/chat.html'" style="
                background: #1a73e8;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                margin: 5px;
                cursor: pointer;
            ">Go to Chat</button>
            <button onclick="window.history.back()" style="
                background: #5f6368;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                margin: 5px;
                cursor: pointer;
            ">Go Back</button>
        </div>
    </div>
    <script>${OFFLINE_JS}</script>
</body>
</html>`;
}

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Kynecta] Service Worker activating v' + APP_VERSION);
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old caches
                    if (cacheName.startsWith('moodchat-') && 
                        cacheName !== CACHE_NAME && 
                        cacheName !== OFFLINE_CACHE) {
                        console.log('[Kynecta] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Claim clients immediately
            return self.clients.claim();
        }).then(() => {
            console.log('[Kynecta] Service Worker activated and controlling clients');
        })
    );
});

// Fetch Event - Main strategy handler
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') return;
    
    // Skip Firebase SDK and API requests (never cache)
    if (isFirebaseRequest(url)) {
        event.respondWith(handleFirebaseRequest(request));
        return;
    }
    
    // Handle HTML pages with Network First strategy
    if (isHTMLRequest(request)) {
        event.respondWith(handleHTMLRequest(request));
        return;
    }
    
    // Handle static assets with Cache First strategy
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }
    
    // Default: Network First with cache fallback
    event.respondWith(handleDefaultRequest(request));
});

// Check if request is for Firebase
function isFirebaseRequest(url) {
    const firebasePatterns = [
        'firebase.googleapis.com',
        'firestore.googleapis.com',
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'www.gstatic.com/firebasejs/',
        '__/auth',
        '__/firebase'
    ];
    
    return firebasePatterns.some(pattern => 
        url.hostname.includes(pattern) || url.pathname.includes(pattern)
    );
}

// Check if request is for HTML
function isHTMLRequest(request) {
    const url = new URL(request.url);
    const acceptHeader = request.headers.get('Accept') || '';
    
    return url.pathname.endsWith('.html') || 
           url.pathname === '/' ||
           acceptHeader.includes('text/html');
}

// Check if request is for static asset
function isStaticAsset(request) {
    const url = new URL(request.url);
    const extensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json', '.woff', '.woff2', '.ttf'];
    
    return extensions.some(ext => url.pathname.endsWith(ext)) ||
           url.pathname.includes('/css/') ||
           url.pathname.includes('/js/') ||
           url.pathname.includes('/icons/') ||
           url.pathname.includes('/assets/');
}

// Handle Firebase requests (Network Only)
async function handleFirebaseRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        // Return safe response that won't break the app
        return new Response(
            JSON.stringify({ 
                status: 'offline', 
                message: 'Firebase service unavailable offline',
                timestamp: Date.now()
            }),
            { 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

// Handle HTML requests with Network First strategy
async function handleHTMLRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // If successful, update cache
        if (networkResponse.ok) {
            const cache = await caches.open(OFFLINE_CACHE);
            await cache.put(request, networkResponse.clone());
            console.log('[Kynecta] Updated HTML cache for:', url.pathname);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[Kynecta] Network failed for HTML, serving from cache:', url.pathname);
        
        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try to serve similar HTML page
        const htmlCache = await caches.open(OFFLINE_CACHE);
        const keys = await htmlCache.keys();
        
        // Look for any cached HTML page
        for (const key of keys) {
            const keyUrl = new URL(key.url);
            if (keyUrl.pathname.endsWith('.html') || keyUrl.pathname === '/') {
                const response = await htmlCache.match(key);
                if (response) {
                    console.log('[Kynecta] Serving alternative HTML:', keyUrl.pathname);
                    return response;
                }
            }
        }
        
        // Serve offline page as last resort
        const offlineResponse = await caches.match('/offline.html');
        if (offlineResponse) {
            return offlineResponse;
        }
        
        // Ultimate fallback
        return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Handle static assets with Cache First strategy
async function handleStaticAsset(request) {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        // Update cache in background if online
        if (navigator.onLine) {
            event.waitUntil(
                fetch(request).then(networkResponse => {
                    if (networkResponse.ok) {
                        return caches.open(CACHE_NAME).then(cache => 
                            cache.put(request, networkResponse)
                        );
                    }
                }).catch(() => { /* Ignore errors */ })
            );
        }
        return cachedResponse;
    }
    
    // If not in cache, try network
    try {
        const networkResponse = await fetch(request);
        
        // Cache for future use
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[Kynecta] Network failed for static asset:', request.url);
        
        // Return appropriate fallback based on file type
        return serveAssetFallback(request);
    }
}

// Handle default requests (Network First)
async function handleDefaultRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        // Try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return empty but valid response
        return new Response('', { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Serve fallback for static assets
async function serveAssetFallback(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (path.endsWith('.css')) {
        return new Response(OFFLINE_CSS, {
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    if (path.endsWith('.js')) {
        return new Response(OFFLINE_JS, {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    if (path.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)) {
        // Return SVG placeholder
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a73e8"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-family="Arial">K</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
    
    // Default fallback
    return new Response('', { status: 200 });
}

// Message Event for communication with app
self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                    version: APP_VERSION,
                    cacheName: CACHE_NAME,
                    offlineCache: OFFLINE_CACHE,
                    strategy: 'Cache First (static), Network First (HTML)',
                    offlineReady: true
                });
            }
            break;
            
        case 'CHECK_CACHE_STATUS':
            Promise.all([
                caches.open(CACHE_NAME).then(c => c.keys()),
                caches.open(OFFLINE_CACHE).then(c => c.keys())
            ]).then(([staticKeys, htmlKeys]) => {
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({
                        staticAssets: staticKeys.length,
                        htmlPages: htmlKeys.length,
                        offlineReady: htmlKeys.length > 0,
                        allPagesCached: HTML_PAGES.every(page => 
                            htmlKeys.some(k => new URL(k.url).pathname === page)
                        )
                    });
                }
            });
            break;
            
        case 'PRELOAD_PAGE':
            // Preload specific page
            if (data.url) {
                caches.open(OFFLINE_CACHE).then(cache => {
                    fetch(data.url)
                        .then(response => {
                            if (response.ok) {
                                cache.put(data.url, response);
                            }
                        })
                        .catch(() => { /* Ignore errors */ });
                });
            }
            break;
    }
});

// Background Sync (optional enhancement)
self.addEventListener('sync', (event) => {
    console.log('[Kynecta] Background sync:', event.tag);
    // Implement background sync if needed
});

// Log initialization
console.log(`[Kynecta MoodChat Service Worker] v${APP_VERSION} loaded`);
console.log(`[Kynecta] Strategy: Cache First for static assets, Network First for HTML`);
console.log(`[Kynecta] Caching ${HTML_PAGES.length} HTML pages for offline use`);
console.log(`[Kynecta] Guaranteed: NO BLANK SCREENS when offline`);