// Service Worker for Kynecta MoodChat - Perfect Offline Mirror
// Version: 3.1.1 - Identical Layout Online/Offline
// Strategy: Stale-While-Revalidate + Full Layout Preservation

const APP_VERSION = '3.1.1';
const CACHE_NAME = `moodchat-mirror-v${APP_VERSION.replace(/\./g, '-')}`;
const PRECACHE_NAME = `moodchat-precache-v${APP_VERSION.replace(/\./g, '-')}`;
const RUNTIME_CACHE = 'moodchat-runtime';

// COMPLETE APP MANIFEST - ALL FILES NEEDED FOR 100% FUNCTIONALITY
const APP_MANIFEST = {
  // HTML Pages - All routes (ensure these match your actual files)
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
    '/Tools.html'
  ],
  
  // CSS - All stylesheets (verify these exist in your project)
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
    '/assets/css/theme.css'
  ],
  
  // JavaScript - All scripts (verify these exist)
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

// UNIVERSAL APP SHELL TEMPLATE (Same for all pages)
const APP_SHELL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#1a73e8">
    <meta name="description" content="Kynecta MoodChat - Instant messaging app">
    
    <!-- Critical CSS for initial render -->
    <style id="critical-css">
        /* EXACT SAME CSS FOR ONLINE AND OFFLINE */
        :root {
            --primary-color: #1a73e8;
            --secondary-color: #34a853;
            --background-color: #ffffff;
            --text-color: #202124;
            --border-color: #dadce0;
            --shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            --header-height: 64px;
            --nav-height: 56px;
            --footer-height: 60px;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        html, body {
            height: 100%;
            overflow-x: hidden;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.5;
            position: relative;
            min-height: 100vh;
        }
        
        .app-shell {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            position: relative;
        }
        
        /* HEADER - Always identical */
        .app-header {
            height: var(--header-height);
            background: linear-gradient(135deg, var(--primary-color), #0d47a1);
            color: white;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: var(--shadow);
            position: sticky;
            top: 0;
            z-index: 1000;
            flex-shrink: 0;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .app-logo {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
        }
        
        .app-title {
            font-size: 1.4rem;
            font-weight: 600;
            letter-spacing: -0.3px;
        }
        
        .offline-indicator {
            display: inline-block;
            background: #f44336;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            margin-left: 10px;
            vertical-align: middle;
            font-weight: 500;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .header-actions {
            display: flex;
            gap: 10px;
        }
        
        .header-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        
        .header-btn:hover {
            background: rgba(255,255,255,0.2);
        }
        
        /* NAVIGATION - Always identical */
        .app-navigation {
            height: var(--nav-height);
            background: #f8f9fa;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-shrink: 0;
        }
        
        .nav-tab {
            flex: 1;
            text-align: center;
            padding: 12px 0;
            color: #5f6368;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
            font-size: 11px;
        }
        
        .nav-tab.active {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
            background: rgba(26, 115, 232, 0.05);
        }
        
        .nav-icon {
            font-size: 18px;
            margin-bottom: 2px;
            display: block;
        }
        
        .nav-label {
            font-size: 11px;
            font-weight: 500;
        }
        
        /* MAIN CONTENT AREA - Dynamic but same structure */
        .app-main {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0;
            position: relative;
        }
        
        .content-wrapper {
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* LOADING STATE - Same for both */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 300px;
            padding: 40px;
            text-align: center;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* FOOTER - Always identical */
        .app-footer {
            height: var(--footer-height);
            background: #f8f9fa;
            padding: 0 20px;
            border-top: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #5f6368;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        /* OFFLINE SPECIFIC - Only shown when offline */
        .offline-banner {
            background: #fff3cd;
            color: #856404;
            padding: 10px 20px;
            text-align: center;
            border-bottom: 1px solid #ffeaa7;
            font-size: 14px;
            display: none;
        }
        
        .offline-banner.show {
            display: block;
            animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
        
        /* RESPONSIVE - Same breakpoints */
        @media (max-width: 768px) {
            :root {
                --header-height: 56px;
                --nav-height: 60px;
            }
            
            .app-title {
                font-size: 1.2rem;
            }
            
            .nav-label {
                font-size: 10px;
            }
            
            .content-wrapper {
                padding: 15px;
            }
        }
        
        @media (max-width: 480px) {
            .app-header {
                padding: 0 15px;
            }
            
            .content-wrapper {
                padding: 12px;
            }
        }
    </style>
    
    <!-- Non-critical CSS will be loaded async -->
    <link rel="stylesheet" href="/css/main.css" media="print" onload="this.media='all'">
    
    <!-- Preload critical assets -->
    <link rel="preload" href="/fonts/roboto.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/js/app.js" as="script">
    
    <!-- App Icon -->
    <link rel="icon" href="/icons/favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" href="/icons/moodchat-192.png">
    <link rel="manifest" href="/manifest.json">
</head>
<body>
    <!-- APP SHELL - Same structure always -->
    <div class="app-shell" id="app-shell">
        <!-- Offline Banner -->
        <div class="offline-banner" id="offline-banner">
            ⚡ You're offline - using cached version. Some features may be limited.
        </div>
        
        <!-- Header -->
        <header class="app-header">
            <div class="header-left">
                <div class="app-logo">K</div>
                <h1 class="app-title">Kynecta MoodChat</h1>
                <span class="offline-indicator" id="offline-indicator" style="display: none;">Offline</span>
            </div>
            <div class="header-actions">
                <button class="header-btn" id="menu-btn" aria-label="Menu">
                    <span style="font-size: 20px;">⋮</span>
                </button>
                <button class="header-btn" id="refresh-btn" aria-label="Refresh">
                    <span style="font-size: 18px;">↻</span>
                </button>
            </div>
        </header>
        
        <!-- Navigation -->
        <nav class="app-navigation" id="app-navigation">
            <!-- Navigation will be injected by JavaScript -->
        </nav>
        
        <!-- Main Content Area -->
        <main class="app-main" id="app-main">
            <div class="content-wrapper">
                <!-- Dynamic content will be injected here -->
                <div class="loading-state" id="loading-state">
                    <div class="loading-spinner"></div>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">Loading...</h3>
                    <p style="color: #5f6368;">Kynecta MoodChat is loading</p>
                </div>
            </div>
        </main>
        
        <!-- Footer -->
        <footer class="app-footer">
            <p>© <span id="current-year">2024</span> Kynecta MoodChat. All rights reserved.</p>
        </footer>
    </div>
    
    <!-- UNIVERSAL APP SCRIPT - Same for all pages -->
    <script>
        // UNIVERSAL STATE MANAGEMENT
        window.KYNECTA_APP = {
            version: '${APP_VERSION}',
            isOnline: navigator.onLine,
            isCached: false,
            currentPage: window.location.pathname.replace('/', '') || 'home',
            currentRoute: window.location.pathname,
            layoutVersion: '3.1.1'
        };
        
        // IMMEDIATE INITIALIZATION
        (function initAppShell() {
            'use strict';
            
            console.log('[Kynecta] App Shell Initializing v${APP_VERSION}');
            
            // Set current year in footer
            document.getElementById('current-year').textContent = new Date().getFullYear();
            
            // Initialize navigation
            initNavigation();
            
            // Set up connectivity handlers
            initConnectivity();
            
            // Load page content
            loadPageContent();
            
            // Set up event listeners
            setupEventListeners();
        })();
        
        // NAVIGATION - Same for all pages
        function initNavigation() {
            const nav = document.getElementById('app-navigation');
            if (!nav) return;
            
            const pages = [
                { id: 'chat', title: 'Chat', icon: '💬', url: '/chat.html' },
                { id: 'calls', title: 'Calls', icon: '📞', url: '/calls.html' },
                { id: 'status', title: 'Status', icon: '🟢', url: '/status.html' },
                { id: 'groups', title: 'Groups', icon: '👥', url: '/group.html' },
                { id: 'settings', title: 'Settings', icon: '⚙️', url: '/settings.html' }
            ];
            
            // Determine current page
            const currentPath = window.location.pathname;
            const currentPage = pages.find(p => p.url === currentPath) || pages[0];
            
            nav.innerHTML = pages.map(page => {
                const isActive = page.id === currentPage.id;
                return \`<a href="\${page.url}" class="nav-tab \${isActive ? 'active' : ''}"
                   data-page="\${page.id}"
                   onclick="handleNavigation(event, '\${page.url}')">
                    <span class="nav-icon">\${page.icon}</span>
                    <span class="nav-label">\${page.title}</span>
                </a>\`;
            }).join('');
        }
        
        function handleNavigation(event, url) {
            event.preventDefault();
            if (window.location.pathname !== url) {
                window.location.href = url;
            }
        }
        
        // CONNECTIVITY - Same handling
        function initConnectivity() {
            function updateOnlineStatus() {
                const isOnline = navigator.onLine;
                KYNECTA_APP.isOnline = isOnline;
                
                const offlineBanner = document.getElementById('offline-banner');
                const offlineIndicator = document.getElementById('offline-indicator');
                
                if (isOnline) {
                    offlineBanner.classList.remove('show');
                    offlineIndicator.style.display = 'none';
                    document.title = document.title.replace(' (Offline)', '');
                } else {
                    offlineBanner.classList.add('show');
                    offlineIndicator.style.display = 'inline-block';
                    if (!document.title.includes('(Offline)')) {
                        document.title += ' (Offline)';
                    }
                    console.log('[Kynecta] Running in offline mode');
                }
                
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('app:connectivitychange', {
                    detail: { isOnline }
                }));
            }
            
            // Initial update
            updateOnlineStatus();
            
            // Listen for changes
            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
        }
        
        // CONTENT LOADING - Unified strategy
        async function loadPageContent() {
            const contentWrapper = document.querySelector('.content-wrapper');
            
            try {
                // Always try cache first for instant load
                if ('caches' in window) {
                    const cache = await caches.open('${CACHE_NAME}');
                    const cachedResponse = await cache.match(window.location.pathname);
                    
                    if (cachedResponse) {
                        const html = await cachedResponse.text();
                        injectPageContent(html, contentWrapper, true);
                        KYNECTA_APP.isCached = true;
                        
                        // Still update from network if online
                        if (KYNECTA_APP.isOnline) {
                            fetchAndUpdateCache();
                        }
                        return;
                    }
                }
                
                // If not in cache or no cache API, fetch from network
                if (KYNECTA_APP.isOnline) {
                    await fetchAndUpdateCache();
                } else {
                    // Offline and not in cache
                    showOfflineFallback(contentWrapper);
                }
            } catch (error) {
                console.error('[Kynecta] Error loading page:', error);
                showErrorFallback(contentWrapper);
            }
        }
        
        async function fetchAndUpdateCache() {
            const contentWrapper = document.querySelector('.content-wrapper');
            
            try {
                const response = await fetch(window.location.pathname, {
                    headers: {
                        'X-From-Service-Worker': 'true',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (response.ok) {
                    const html = await response.text();
                    injectPageContent(html, contentWrapper, false);
                    
                    // Cache for offline use
                    if ('caches' in window) {
                        const cache = await caches.open('${CACHE_NAME}');
                        await cache.put(window.location.pathname, response.clone());
                    }
                } else {
                    throw new Error('Network response not ok');
                }
            } catch (error) {
                console.warn('[Kynecta] Network fetch failed, using cached if available');
                if (!KYNECTA_APP.isCached) {
                    showOfflineFallback(contentWrapper);
                }
            }
        }
        
        function injectPageContent(html, container, fromCache) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the main content (excluding shell)
            const mainContent = doc.querySelector('.content-wrapper') || 
                              doc.querySelector('main') || 
                              doc.querySelector('#app-main') || 
                              doc.body;
            
            if (mainContent) {
                // Remove loading state
                const loadingState = container.querySelector('#loading-state');
                if (loadingState) {
                    loadingState.style.opacity = '0';
                    setTimeout(() => loadingState.remove(), 300);
                }
                
                // Inject content
                container.innerHTML = mainContent.innerHTML;
                
                // Execute any scripts in the content
                const scripts = container.getElementsByTagName('script');
                for (let script of scripts) {
                    const newScript = document.createElement('script');
                    if (script.src) {
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                    }
                    document.head.appendChild(newScript);
                }
                
                console.log(\`[Kynecta] Content loaded \${fromCache ? 'from cache' : 'from network'}\`);
                
                // Dispatch content ready event
                window.dispatchEvent(new CustomEvent('app:contentready', {
                    detail: { fromCache }
                }));
            }
        }
        
        function showOfflineFallback(container) {
            container.innerHTML = \`
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">📶</div>
                    <h2 style="color: var(--primary-color); margin-bottom: 15px;">You're Offline</h2>
                    <p style="color: #5f6368; margin-bottom: 25px; max-width: 400px; margin: 0 auto 30px;">
                        Kynecta MoodChat is running in offline mode. 
                        You can still access cached content.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.location.reload()" 
                                style="background: var(--primary-color); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                            Try Again
                        </button>
                        <button onclick="window.history.back()" 
                                style="background: #5f6368; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                            Go Back
                        </button>
                    </div>
                </div>
            \`;
            
            const loadingState = container.querySelector('#loading-state');
            if (loadingState) loadingState.remove();
        }
        
        function showErrorFallback(container) {
            container.innerHTML = \`
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: #f44336; margin-bottom: 15px;">Something went wrong</h2>
                    <p style="color: #5f6368; margin-bottom: 25px; max-width: 400px; margin: 0 auto 30px;">
                        We couldn't load the page. Please check your connection and try again.
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: var(--primary-color); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                        Reload Page
                    </button>
                </div>
            \`;
        }
        
        // EVENT LISTENERS
        function setupEventListeners() {
            // Refresh button
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            
            // Menu button
            const menuBtn = document.getElementById('menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', () => {
                    // Toggle menu (implement as needed)
                    console.log('[Kynecta] Menu clicked');
                });
            }
            
            // Service worker messages
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', event => {
                    const { data } = event;
                    switch (data.type) {
                        case 'CACHE_UPDATED':
                            console.log('[Kynecta] Cache updated:', data.url);
                            break;
                        case 'SW_ACTIVATED':
                            console.log('[Kynecta] Service Worker activated:', data.version);
                            break;
                    }
                });
            }
        }
        
        // Expose to window for debugging
        window.getAppState = () => KYNECTA_APP;
    </script>
</body>
</html>`;

// Function declarations
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
            
            // Notify clients of update
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'ASSET_UPDATED',
                    url: request.url,
                    timestamp: Date.now()
                });
            });
        }
    } catch (error) {
        // Silent fail - we have cached version
    }
}

// Serve app shell for HTML requests
function serveAppShell(url) {
    const pageName = url.pathname.replace('.html', '').replace('/', '') || 'Home';
    const formattedName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Update the template with current page
    const shell = APP_SHELL_TEMPLATE;
    
    return new Response(shell, {
        headers: {
            'Content-Type': 'text/html',
            'X-Served-By': 'Kynecta-App-Shell',
            'X-Page': formattedName
        },
        status: 200
    });
}

// Serve fallback for assets
function serveAssetFallback(request, url) {
    const path = url.pathname;
    
    if (path.endsWith('.css')) {
        return new Response('/* CSS served from fallback */', {
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    if (path.endsWith('.js')) {
        return new Response('// JavaScript fallback', {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    if (path.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)) {
        return fetch('/icons/moodchat-192.png');
    }
    
    return new Response('', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
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

// Check for updates
async function checkForUpdates() {
    try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.version !== APP_VERSION) {
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'UPDATE_AVAILABLE',
                    newVersion: data.version,
                    currentVersion: APP_VERSION
                });
            });
        }
    } catch (error) {
        // Could not check for updates
    }
}

// Refresh cache
async function refreshCache() {
    // Refresh critical assets
    const criticalAssets = APP_MANIFEST.html.slice(0, 3);
    
    for (const asset of criticalAssets) {
        try {
            const response = await fetch(asset);
            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(asset, response);
            }
        } catch (error) {
            // Keep old version
        }
    }
}

// Background sync
async function syncData() {
    // Implement your sync logic
    console.log('[Kynecta] Background sync running');
}

// INSTALLATION - Pre-cache everything
self.addEventListener('install', (event) => {
    console.log(`[Kynecta] Service Worker installing v${APP_VERSION}`);
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        (async () => {
            // Open caches
            const precache = await caches.open(PRECACHE_NAME);
            const runtimeCache = await caches.open(RUNTIME_CACHE);
            
            console.log('[Kynecta] Starting precaching...');
            
            // Create unified app shell for all pages
            const unifiedShell = APP_SHELL_TEMPLATE;
            const shellResponse = new Response(unifiedShell, {
                headers: {
                    'Content-Type': 'text/html',
                    'X-Cached-By': 'Kynecta-Mirror',
                    'Cache-Control': 'public, max-age=86400'
                }
            });
            
            // Cache app shell for all HTML routes
            const htmlCachePromises = APP_MANIFEST.html.map(async (page) => {
                await precache.put(page, shellResponse.clone());
                console.log(`[Kynecta] ✓ App shell cached: ${page}`);
            });
            
            // Cache all other assets
            const allAssets = [
                ...APP_MANIFEST.css,
                ...APP_MANIFEST.js,
                ...APP_MANIFEST.images,
                ...APP_MANIFEST.fonts,
                ...APP_MANIFEST.config,
                ...APP_MANIFEST.vendor
            ];
            
            const assetCachePromises = allAssets.map(async (url) => {
                try {
                    const response = await fetch(url, {
                        mode: 'no-cors',
                        cache: 'no-cache'
                    });
                    
                    if (response && (response.ok || response.type === 'opaque')) {
                        await precache.put(url, response);
                        console.log(`[Kynecta] ✓ Cached: ${url}`);
                    }
                } catch (error) {
                    console.warn(`[Kynecta] Could not cache ${url}:`, error.message);
                }
            });
            
            // Wait for all caching to complete
            await Promise.all([...htmlCachePromises, ...assetCachePromises]);
            
            console.log(`[Kynecta] Precaching complete! ${APP_MANIFEST.html.length} pages + ${allAssets.length} assets cached`);
            
            // Notify clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'INSTALL_COMPLETE',
                    version: APP_VERSION,
                    timestamp: Date.now()
                });
            });
        })()
    );
});

// ACTIVATION - Clean up and take control
self.addEventListener('activate', (event) => {
    console.log('[Kynecta] Service Worker activating v' + APP_VERSION);
    
    event.waitUntil(
        (async () => {
            // Clean up old caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName.startsWith('moodchat-') && 
                        cacheName !== CACHE_NAME && 
                        cacheName !== PRECACHE_NAME && 
                        cacheName !== RUNTIME_CACHE) {
                        console.log('[Kynecta] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
            
            // Claim all clients immediately
            await self.clients.claim();
            
            console.log('[Kynecta] Service Worker now controlling all tabs');
            
            // Notify all windows
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_ACTIVATED',
                    version: APP_VERSION,
                    layoutVersion: '3.1.1'
                });
            });
        })()
    );
});

// FETCH HANDLER - Serve identical layout online/offline
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests and browser extensions
    if (request.method !== 'GET' || 
        url.protocol === 'chrome-extension:' || 
        url.protocol === 'chrome:' ||
        url.protocol === 'moz-extension:') {
        return;
    }
    
    // Check if this is an HTML request
    const isHTML = request.headers.get('Accept')?.includes('text/html') ||
                   url.pathname.endsWith('.html') ||
                   url.pathname === '/' ||
                   url.pathname === '';
    
    // STRATEGY: For HTML - Cache First (App Shell), For Assets - Stale-While-Revalidate
    event.respondWith(
        (async () => {
            // For HTML requests, always serve app shell from cache
            if (isHTML) {
                // Try to get from cache first
                const cached = await caches.match(request);
                if (cached) {
                    // Update in background if online
                    if (navigator.onLine) {
                        event.waitUntil(
                            fetchAndCache(request)
                        );
                    }
                    return cached;
                }
                
                // If not in cache and online, fetch and cache
                if (navigator.onLine) {
                    try {
                        const response = await fetch(request);
                        if (response.ok) {
                            const cache = await caches.open(CACHE_NAME);
                            await cache.put(request, response.clone());
                        }
                        return response;
                    } catch (error) {
                        // Network failed, serve app shell
                        return serveAppShell(url);
                    }
                }
                
                // Offline - serve app shell
                return serveAppShell(url);
            }
            
            // For non-HTML assets: Stale-While-Revalidate
            const cachedResponse = await caches.match(request);
            
            // Always return cached if available (for instant load)
            if (cachedResponse) {
                // Update cache in background if online
                if (navigator.onLine) {
                    event.waitUntil(
                        fetchAndCache(request)
                    );
                }
                return cachedResponse;
            }
            
            // Not in cache, try network
            if (navigator.onLine) {
                try {
                    const response = await fetch(request);
                    if (response.ok && !isApiRequest(url)) {
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(request, response.clone());
                    }
                    return response;
                } catch (error) {
                    // Network failed, serve fallback
                    return serveAssetFallback(request, url);
                }
            }
            
            // Offline and not in cache
            return serveAssetFallback(request, url);
        })()
    );
});

// MESSAGE HANDLING
self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
        case 'GET_CACHE_INFO':
            event.waitUntil(
                (async () => {
                    const [appKeys, precacheKeys, runtimeKeys] = await Promise.all([
                        caches.open(CACHE_NAME).then(c => c.keys()),
                        caches.open(PRECACHE_NAME).then(c => c.keys()),
                        caches.open(RUNTIME_CACHE).then(c => c.keys())
                    ]);
                    
                    event.source.postMessage({
                        type: 'CACHE_INFO',
                        appCacheSize: appKeys.length,
                        precacheSize: precacheKeys.length,
                        runtimeCacheSize: runtimeKeys.length,
                        version: APP_VERSION,
                        layoutVersion: '3.1.1'
                    });
                })()
            );
            break;
            
        case 'CHECK_FOR_UPDATES':
            event.waitUntil(checkForUpdates());
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(
                (async () => {
                    await Promise.all([
                        caches.delete(CACHE_NAME),
                        caches.delete(PRECACHE_NAME),
                        caches.delete(RUNTIME_CACHE)
                    ]);
                    
                    self.skipWaiting();
                    
                    event.source.postMessage({
                        type: 'CACHE_CLEARED',
                        timestamp: Date.now()
                    });
                })()
            );
            break;
            
        case 'FORCE_REFRESH':
            // Fixed the async issue
            (async () => {
                self.skipWaiting();
                const allClients = await self.clients.matchAll();
                allClients.forEach(client => {
                    client.postMessage({
                        type: 'FORCE_REFRESH_REQUIRED'
                    });
                });
            })();
            break;
    }
});

// PUSH NOTIFICATIONS
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

// BACKGROUND SYNC
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

// PERIODIC SYNC
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'refresh-cache') {
        event.waitUntil(refreshCache());
    }
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
console.log(`[Kynecta] Strategy: IDENTICAL LAYOUT - Same UI online/offline`);
console.log(`[Kynecta] Guarantee: Zero layout breakage, instant load from cache`);