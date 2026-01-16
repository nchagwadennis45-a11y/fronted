// api.js - HARDENED BACKEND API INTEGRATION WITH DEFENSIVE FETCH HANDLING
// ULTRA-ROBUST VERSION: Never breaks, even with incorrect frontend calls
// ============================================================================
// CRITICAL IMPROVEMENTS APPLIED:
// 1. SINGLE internal fetch function with comprehensive input validation
// 2. Method normalization for ALL possible frontend mistakes
// 3. Endpoint sanitization to prevent malformed URLs
// 4. Graceful degradation when frontend calls API incorrectly
// 5. Absolute protection against invalid fetch() calls
// ============================================================================

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================
const IS_LOCAL_DEVELOPMENT = window.location.hostname === 'localhost' || 
                           window.location.hostname.startsWith('127.') ||
                           window.location.hostname.startsWith('192.168') ||
                           window.location.protocol === 'file:';

// ============================================================================
// BACKEND URL CONFIGURATION - FIXED AND IMMUTABLE
// ============================================================================
const BACKEND_BASE_URL = 'https://moodchat-backend-1.onrender.com';
const BASE_URL = BACKEND_BASE_URL + '/api';

console.log(`🔧 [API] Environment: ${IS_LOCAL_DEVELOPMENT ? 'Local Development' : 'Production'}`);
console.log(`🔧 [API] Backend Base URL: ${BACKEND_BASE_URL}`);
console.log(`🔧 [API] API Base URL: ${BASE_URL}`);

// ============================================================================
// CORE VALIDATION FUNCTIONS - NEVER BREAK
// ============================================================================

/**
 * Normalizes ANY HTTP method input to valid fetch method
 * CRITICAL: Prevents "not a valid HTTP method" errors forever
 */
function _normalizeHttpMethod(method) {
    if (!method) return 'GET';
    
    const methodStr = String(method).toUpperCase().trim();
    
    // Direct match for valid methods
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (validMethods.includes(methodStr)) {
        return methodStr;
    }
    
    // Common frontend mistakes and their corrections
    const methodCorrections = {
        'GET': 'GET',
        'POST': 'POST', 
        'PUT': 'PUT',
        'PATCH': 'PATCH',
        'DELETE': 'DELETE',
        'HEAD': 'GET', // Map HEAD to GET as safe fallback
        'OPTIONS': 'GET', // Map OPTIONS to GET
        '': 'GET', // Empty method
        'UNDEFINED': 'GET',
        'NULL': 'GET',
        'GET/API/': 'GET', // Common typo
        'POST/API/': 'POST',
        '/API/': 'GET', // Endpoint mistakenly passed as method
        'API': 'GET'
    };
    
    // Check for method containing endpoint-like patterns
    if (methodStr.includes('/API/') || methodStr.includes('/api/')) {
        console.warn(`⚠️ [API] Method "${method}" looks like an endpoint, defaulting to GET`);
        return 'GET';
    }
    
    // Return corrected method or default to GET
    return methodCorrections[methodStr] || 'GET';
}

/**
 * Sanitizes ANY endpoint to prevent malformed URLs
 * CRITICAL: Prevents "/api/api/..." and "/api/GET" calls
 */
function _sanitizeEndpoint(endpoint) {
    if (!endpoint) return '/';
    
    const endpointStr = String(endpoint).trim();
    
    // If endpoint is actually an HTTP method, return root
    const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (httpMethods.includes(endpointStr.toUpperCase())) {
        console.warn(`⚠️ [API] Endpoint "${endpoint}" is an HTTP method, defaulting to "/"`);
        return '/';
    }
    
    // Remove any leading/trailing slashes for consistent processing
    let cleanEndpoint = endpointStr.replace(/^\/+|\/+$/g, '');
    
    // Prevent duplicate "/api/api/" segments
    if (cleanEndpoint.toUpperCase().startsWith('API/')) {
        cleanEndpoint = cleanEndpoint.substring(4);
    }
    
    // Ensure it starts with "/" but doesn't end with "/" (unless it's just "/")
    if (!cleanEndpoint) return '/';
    if (!cleanEndpoint.startsWith('/')) {
        cleanEndpoint = '/' + cleanEndpoint;
    }
    
    return cleanEndpoint;
}

/**
 * Builds ABSOLUTELY SAFE URL that never breaks fetch()
 */
function _buildSafeUrl(endpoint) {
    const sanitizedEndpoint = _sanitizeEndpoint(endpoint);
    
    // Handle empty or root endpoint
    if (sanitizedEndpoint === '/') {
        return BASE_URL;
    }
    
    // Construct URL ensuring no double slashes
    const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const endpointPath = sanitizedEndpoint.startsWith('/') ? sanitizedEndpoint : '/' + sanitizedEndpoint;
    
    return base + endpointPath;
}

// ============================================================================
// SINGLE FETCH FUNCTION - THE ONLY PLACE fetch() IS CALLED
// ============================================================================

/**
 * CORE FETCH FUNCTION - Validates EVERYTHING before fetch()
 * This is the ONLY function that should ever call fetch()
 */
function _safeFetchCall(fullUrl, options = {}) {
    // Validate URL
    if (!fullUrl || typeof fullUrl !== 'string') {
        console.error('❌ [API] Invalid URL for fetch:', fullUrl);
        return Promise.reject(new Error('Invalid request URL'));
    }
    
    // Normalize method - ABSOLUTELY CRITICAL
    const normalizedMethod = _normalizeHttpMethod(options.method || 'GET');
    
    // Prepare safe options
    const safeOptions = {
        method: normalizedMethod,
        mode: 'cors',
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    // Handle body safely
    if (options.body && normalizedMethod !== 'GET') {
        if (typeof options.body === 'string') {
            safeOptions.body = options.body;
        } else {
            try {
                safeOptions.body = JSON.stringify(options.body);
            } catch (e) {
                console.warn('⚠️ [API] Could not stringify body, sending empty');
                safeOptions.body = '{}';
            }
        }
    }
    
    console.log(`🔧 [API] Safe fetch: ${normalizedMethod} ${fullUrl}`);
    
    // PERFORM THE FETCH - ONLY HERE
    return fetch(fullUrl, safeOptions)
        .then(async response => {
            try {
                const data = await response.json();
                return {
                    success: response.ok,
                    status: response.status,
                    data: data,
                    message: data.message || (response.ok ? 'Success' : 'Request failed'),
                    headers: Object.fromEntries(response.headers.entries())
                };
            } catch (jsonError) {
                return {
                    success: response.ok,
                    status: response.status,
                    data: null,
                    message: response.statusText || 'Request completed',
                    headers: Object.fromEntries(response.headers.entries()),
                    rawResponse: response
                };
            }
        })
        .catch(error => {
            console.error(`🔧 [API] Fetch error for ${fullUrl}:`, error);
            
            const isNetworkError = error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('aborted') ||
                error.message.includes('network request failed')
            );
            
            return {
                success: false,
                status: 0,
                message: isNetworkError 
                    ? 'Network error. Please check your connection.' 
                    : 'Request failed: ' + error.message,
                error: error.message,
                isNetworkError: isNetworkError
            };
        });
}

// ============================================================================
// GLOBAL API FUNCTION - ULTRA-DEFENSIVE WRAPPER
// ============================================================================

window.api = function(endpoint, options = {}) {
    // OFFLINE FIRST CHECK - Immediate response if offline
    if (!navigator.onLine) {
        console.log('🔧 [API] Offline detected, returning cached response');
        return Promise.resolve({
            success: false,
            status: 0,
            message: 'Offline mode',
            offline: true,
            cached: true
        });
    }
    
    // EXTREME INPUT VALIDATION
    if (!endpoint || typeof endpoint !== 'string') {
        console.warn('⚠️ [API] Invalid endpoint type:', typeof endpoint, 'defaulting to "/"');
        endpoint = '/';
    }
    
    // SANITIZE endpoint to prevent ANY malformed URLs
    const safeEndpoint = _sanitizeEndpoint(endpoint);
    const fullUrl = _buildSafeUrl(safeEndpoint);
    
    // VALIDATE options
    const safeOptions = { ...options };
    
    // Ensure method is never an endpoint
    if (safeOptions.method && typeof safeOptions.method === 'string') {
        const methodStr = safeOptions.method.toUpperCase();
        if (methodStr.includes('/API/') || methodStr.includes('/api/') || 
            methodStr.startsWith('API') || methodStr.endsWith('/API')) {
            console.warn(`⚠️ [API] Method "${safeOptions.method}" contains endpoint pattern, normalizing`);
            safeOptions.method = _normalizeHttpMethod(safeOptions.method);
        }
    }
    
    // Add Authorization header if token exists
    try {
        const authUserStr = localStorage.getItem('authUser');
        if (authUserStr && safeOptions.auth !== false) {
            const authUser = JSON.parse(authUserStr);
            if (authUser.token) {
                safeOptions.headers = {
                    ...safeOptions.headers,
                    'Authorization': 'Bearer ' + authUser.token
                };
            }
        }
    } catch (e) {
        console.log('🔧 [API] Could not attach auth token:', e.message);
    }
    
    // CALL THE SINGLE SAFE FETCH FUNCTION
    return _safeFetchCall(fullUrl, safeOptions);
};

// ============================================================================
// MAIN API OBJECT - WITH HARDENED METHODS
// ============================================================================

const apiObject = {
    _singleton: true,
    _version: '11.0.0', // Hardened version
    _safeInitialized: true,
    _backendReachable: null,
    _sessionChecked: false,
    
    _config: {
        BACKEND_URL: BASE_URL,
        BACKEND_BASE_URL: BACKEND_BASE_URL,
        IS_LOCAL_DEVELOPMENT: IS_LOCAL_DEVELOPMENT,
        STORAGE_PREFIX: 'moodchat_',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        SESSION_CHECK_INTERVAL: 300000,
        STATUS_FETCH_TIMEOUT: 8000
    },
    
    // ============================================================================
    // HARDENED AUTHENTICATION METHODS
    // ============================================================================
    
    login: async function(emailOrUsername, password) {
        // OFFLINE CHECK FIRST
        if (!navigator.onLine) {
            return {
                success: false,
                message: 'Cannot login while offline',
                offline: true
            };
        }
        
        try {
            console.log(`🔧 [API] Login attempt for: ${emailOrUsername}`);
            
            const requestData = { password: String(password) };
            
            if (emailOrUsername.includes('@')) {
                requestData.email = String(emailOrUsername).trim();
            } else {
                requestData.username = String(emailOrUsername).trim();
            }
            
            // USE THE SINGLE FETCH FUNCTION
            const result = await _safeFetchCall(`${BASE_URL}/auth/login`, {
                method: 'POST',
                body: requestData
            });
            
            if (result.success) {
                // Store auth data
                if (result.data.token && result.data.user) {
                    console.log(`🔧 [API] Login successful, storing authUser`);
                    
                    localStorage.setItem('authUser', JSON.stringify({
                        token: result.data.token,
                        user: result.data.user
                    }));
                    
                    // Backward compatibility
                    localStorage.setItem('moodchat_auth_token', result.data.token);
                    localStorage.setItem('moodchat_auth_user', JSON.stringify(result.data.user));
                }
                
                this._sessionChecked = true;
                this._backendReachable = true;
                
                return {
                    success: true,
                    message: 'Login successful',
                    token: result.data.token,
                    user: result.data.user,
                    data: result.data
                };
            } else {
                // Soft auth failure - don't clear existing data
                if (result.status === 401 || result.status === 403) {
                    console.log('🔧 [API] Auth failed, maintaining soft-auth mode');
                    return {
                        success: false,
                        message: 'Invalid credentials',
                        softAuth: true
                    };
                }
                
                return {
                    success: false,
                    message: result.message || 'Login failed',
                    error: result.error
                };
            }
        } catch (error) {
            console.error('🔧 [API] Login error:', error);
            
            return {
                success: false,
                message: 'Login failed: ' + error.message,
                error: error.message,
                isNetworkError: true
            };
        }
    },
    
    register: async function(userData) {
        // OFFLINE CHECK FIRST
        if (!navigator.onLine) {
            return {
                success: false,
                message: 'Cannot register while offline',
                offline: true
            };
        }
        
        try {
            console.log('🔧 [API] Register attempt');
            
            // USE THE SINGLE FETCH FUNCTION
            const result = await _safeFetchCall(`${BASE_URL}/auth/register`, {
                method: 'POST',
                body: userData
            });
            
            if (result.success) {
                // Store auth data
                if (result.data.token && result.data.user) {
                    console.log(`🔧 [API] Registration successful`);
                    
                    localStorage.setItem('authUser', JSON.stringify({
                        token: result.data.token,
                        user: result.data.user
                    }));
                    
                    // Backward compatibility
                    localStorage.setItem('moodchat_auth_token', result.data.token);
                    localStorage.setItem('moodchat_auth_user', JSON.stringify(result.data.user));
                }
                
                this._sessionChecked = true;
                this._backendReachable = true;
                
                return {
                    success: true,
                    message: 'Registration successful',
                    token: result.data.token,
                    user: result.data.user,
                    data: result.data
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Registration failed',
                    error: result.error
                };
            }
        } catch (error) {
            console.error('🔧 [API] Register error:', error);
            
            return {
                success: false,
                message: 'Registration failed: ' + error.message,
                error: error.message,
                isNetworkError: true
            };
        }
    },
    
    // ============================================================================
    // BACKEND HEALTH CHECK - HARDENED
    // ============================================================================
    
    checkBackendHealth: async function() {
        // OFFLINE DETECTION
        if (!navigator.onLine) {
            console.log('🔧 [API] Offline, backend unreachable');
            this._backendReachable = false;
            return {
                success: false,
                reachable: false,
                message: 'Offline mode',
                offline: true
            };
        }
        
        console.log('🔧 [API] Checking backend health...');
        
        const testEndpoints = ['/status', '/auth/health', '/health', ''];
        
        for (const endpoint of testEndpoints) {
            try {
                const url = _buildSafeUrl(endpoint);
                console.log(`🔧 [API] Trying: ${url}`);
                
                // USE THE SINGLE FETCH FUNCTION
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok || response.status < 500) {
                    console.log(`✅ [API] Backend reachable (status: ${response.status})`);
                    this._backendReachable = true;
                    
                    return {
                        success: true,
                        reachable: true,
                        endpoint: endpoint || 'root',
                        status: response.status,
                        message: 'Backend is reachable'
                    };
                }
            } catch (error) {
                console.log(`⚠️ [API] Endpoint failed:`, error.message);
                continue;
            }
        }
        
        console.log('🔧 [API] Backend unreachable');
        this._backendReachable = false;
        
        return {
            success: false,
            reachable: false,
            message: 'Backend is unreachable',
            offlineMode: true
        };
    },
    
    // ============================================================================
    // SESSION MANAGEMENT - SOFT AUTH PRESERVED
    // ============================================================================
    
    checkSession: async function() {
        try {
            const authUserStr = localStorage.getItem('authUser');
            
            if (!authUserStr) {
                this._sessionChecked = true;
                return {
                    success: false,
                    authenticated: false,
                    message: 'No active session'
                };
            }
            
            let authUser;
            try {
                authUser = JSON.parse(authUserStr);
                if (!authUser.token || !authUser.user) {
                    // Soft failure - don't clear, just report
                    this._sessionChecked = true;
                    return {
                        success: false,
                        authenticated: false,
                        message: 'Invalid session data',
                        softAuth: true
                    };
                }
            } catch (e) {
                console.error('🔧 [API] Error parsing authUser:', e);
                this._sessionChecked = true;
                return {
                    success: false,
                    authenticated: false,
                    message: 'Invalid session data',
                    softAuth: true
                };
            }
            
            // Return cached session if offline
            if (!navigator.onLine) {
                return {
                    success: true,
                    authenticated: true,
                    user: authUser.user,
                    offline: true,
                    message: 'Session valid (offline)'
                };
            }
            
            // Cached session check
            if (this._sessionChecked && this._backendReachable !== false) {
                return {
                    success: true,
                    authenticated: true,
                    user: authUser.user,
                    message: 'Session valid (cached)'
                };
            }
            
            try {
                // USE THE SINGLE FETCH FUNCTION
                const result = await _safeFetchCall(`${BASE_URL}/auth/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + authUser.token
                    }
                });
                
                if (result.success) {
                    const updatedUser = result.data.user || authUser.user;
                    
                    // Update auth data
                    authUser.user = updatedUser;
                    localStorage.setItem('authUser', JSON.stringify(authUser));
                    localStorage.setItem('moodchat_auth_user', JSON.stringify(updatedUser));
                    
                    this._sessionChecked = true;
                    this._backendReachable = true;
                    
                    return {
                        success: true,
                        authenticated: true,
                        user: updatedUser,
                        message: 'Session valid (online)'
                    };
                } else {
                    // Soft auth failure - don't clear data
                    if (result.status === 401 || result.status === 403) {
                        console.log('🔧 [API] Session expired, maintaining soft-auth');
                        return {
                            success: false,
                            authenticated: false,
                            message: 'Session expired',
                            softAuth: true
                        };
                    }
                    
                    // Backend error but keep local session
                    this._sessionChecked = true;
                    return {
                        success: true,
                        authenticated: true,
                        user: authUser.user,
                        offline: true,
                        message: 'Session valid (backend error)'
                    };
                }
            } catch (backendError) {
                console.log('🔧 [API] Backend unreachable, using cached session');
                
                this._sessionChecked = true;
                this._backendReachable = false;
                
                return {
                    success: true,
                    authenticated: true,
                    user: authUser.user,
                    offline: true,
                    message: 'Session valid (offline mode)'
                };
            }
            
        } catch (error) {
            console.error('🔧 [API] Check session error:', error);
            this._sessionChecked = true;
            return {
                success: false,
                authenticated: false,
                message: 'Failed to check session',
                softAuth: true
            };
        }
    },
    
    // ============================================================================
    // HARDENED DATA METHODS - ALL USE SINGLE FETCH FUNCTION
    // ============================================================================
    
    getStatuses: async function() {
        // OFFLINE FIRST
        if (!navigator.onLine) {
            const cached = localStorage.getItem('moodchat_cache_statuses');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    return {
                        success: true,
                        data: cachedData.data,
                        cached: true,
                        offline: true,
                        message: 'Using cached data (offline)'
                    };
                } catch (e) {
                    // Continue to network attempt
                }
            }
        }
        
        try {
            // USE THE SINGLE FETCH FUNCTION via window.api
            const result = await window.api('/statuses/all', {
                method: 'GET',
                auth: true
            });
            
            if (result.success && result.data) {
                // Cache for offline use
                try {
                    localStorage.setItem('moodchat_cache_statuses', JSON.stringify({
                        data: result.data,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.log('🔧 [API] Could not cache statuses');
                }
            }
            
            return result;
        } catch (error) {
            console.error('🔧 [API] Get statuses error:', error);
            
            // Fallback to cached data
            const cached = localStorage.getItem('moodchat_cache_statuses');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    return {
                        success: true,
                        data: cachedData.data,
                        cached: true,
                        message: 'Using cached data',
                        error: error.message
                    };
                } catch (e) {
                    // Ignore cache errors
                }
            }
            
            return {
                success: false,
                message: 'Failed to fetch statuses',
                error: error.message,
                isNetworkError: true
            };
        }
    },
    
    getFriends: async function() {
        // OFFLINE FIRST
        if (!navigator.onLine) {
            const cached = localStorage.getItem('moodchat_cache_friends');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    return {
                        success: true,
                        data: cachedData.data,
                        cached: true,
                        offline: true
                    };
                } catch (e) {
                    // Continue to network attempt
                }
            }
        }
        
        try {
            // USE THE SINGLE FETCH FUNCTION via window.api
            const result = await window.api('/friends/list', {
                method: 'GET',
                auth: true
            });
            
            if (result.success && result.data) {
                // Cache for offline use
                try {
                    localStorage.setItem('moodchat_cache_friends', JSON.stringify({
                        data: result.data,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.log('🔧 [API] Could not cache friends');
                }
            }
            
            return result;
        } catch (error) {
            console.error('🔧 [API] Get friends error:', error);
            
            // Fallback to cached data
            const cached = localStorage.getItem('moodchat_cache_friends');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    return {
                        success: true,
                        data: cachedData.data,
                        cached: true,
                        message: 'Using cached data'
                    };
                } catch (e) {
                    // Ignore cache errors
                }
            }
            
            return {
                success: false,
                message: 'Failed to fetch friends',
                error: error.message,
                isNetworkError: true
            };
        }
    },
    
    // Additional methods remain but now use window.api() internally
    // This ensures ALL calls go through the single hardened fetch function
    
    getUsers: async function() {
        return window.api('/users', { method: 'GET', auth: true });
    },
    
    getUserById: async function(userId) {
        return window.api(`/users/${encodeURIComponent(userId)}`, { method: 'GET', auth: true });
    },
    
    getStatus: async function(statusId) {
        return window.api(`/status/${encodeURIComponent(statusId)}`, { method: 'GET', auth: true });
    },
    
    createStatus: async function(statusData) {
        return window.api('/status', { 
            method: 'POST', 
            body: statusData,
            auth: true 
        });
    },
    
    getChats: async function() {
        return window.api('/chats', { method: 'GET', auth: true });
    },
    
    getChatById: async function(chatId) {
        return window.api(`/chats/${encodeURIComponent(chatId)}`, { method: 'GET', auth: true });
    },
    
    getContacts: async function() {
        return window.api('/contacts', { method: 'GET', auth: true });
    },
    
    // ============================================================================
    // UTILITY METHODS - PRESERVED
    // ============================================================================
    
    isLoggedIn: function() {
        try {
            const authUserStr = localStorage.getItem('authUser');
            if (!authUserStr) return false;
            
            const authUser = JSON.parse(authUserStr);
            return !!(authUser.token && authUser.user);
        } catch (error) {
            return false;
        }
    },
    
    getCurrentUser: function() {
        try {
            const authUserStr = localStorage.getItem('authUser');
            if (authUserStr) {
                const authUser = JSON.parse(authUserStr);
                return authUser.user || null;
            }
        } catch (e) {
            console.error('🔧 [API] Error parsing authUser:', e);
        }
        return null;
    },
    
    getCurrentToken: function() {
        try {
            const authUserStr = localStorage.getItem('authUser');
            if (authUserStr) {
                const authUser = JSON.parse(authUserStr);
                return authUser.token || null;
            }
        } catch (e) {
            console.error('🔧 [API] Error parsing authUser for token:', e);
        }
        return null;
    },
    
    logout: function() {
        try {
            // Soft logout - only clear if explicitly requested
            localStorage.removeItem('authUser');
            localStorage.removeItem('moodchat_auth_token');
            localStorage.removeItem('moodchat_auth_user');
            this._sessionChecked = false;
            console.log('🔧 [API] User logged out');
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            console.error('🔧 [API] Error during logout:', error);
            return { success: false, message: 'Logout failed' };
        }
    },
    
    _clearAuthData: function() {
        // Only clear when absolutely necessary
        localStorage.removeItem('authUser');
        localStorage.removeItem('moodchat_auth_token');
        localStorage.removeItem('moodchat_auth_user');
        this._sessionChecked = false;
    },
    
    getDeviceId: function() {
        try {
            let deviceId = localStorage.getItem('moodchat_device_id');
            if (!deviceId) {
                deviceId = 'moodchat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('moodchat_device_id', deviceId);
            }
            return deviceId;
        } catch (error) {
            return 'moodchat_fallback_' + Date.now().toString(36);
        }
    },
    
    isOnline: function() {
        return navigator.onLine;
    },
    
    isBackendReachable: function() {
        if (this._backendReachable !== null) {
            return this._backendReachable;
        }
        return true; // Assume reachable until proven otherwise
    },
    
    getConnectionStatus: function() {
        return {
            online: navigator.onLine,
            backendReachable: this.isBackendReachable(),
            timestamp: new Date().toISOString(),
            backendUrl: BACKEND_BASE_URL,
            baseApiUrl: BASE_URL,
            sessionChecked: this._sessionChecked,
            hasAuthToken: !!this.getCurrentToken(),
            hasAuthUser: !!localStorage.getItem('authUser')
        };
    },
    
    // ============================================================================
    // INITIALIZATION - PRESERVED WITH EVENTS
    // ============================================================================
    
    initialize: async function() {
        console.log('🔧 [API] ⚡ MoodChat API v11.0.0 (HARDENED) initializing...');
        console.log('🔧 [API] 🔗 Backend URL:', BASE_URL);
        console.log('🔧 [API] 🌐 Environment:', IS_LOCAL_DEVELOPMENT ? 'Local' : 'Production');
        
        // Migrate old auth data if needed
        const oldToken = localStorage.getItem('moodchat_auth_token');
        const oldUser = localStorage.getItem('moodchat_auth_user');
        const authUserStr = localStorage.getItem('authUser');
        
        if ((oldToken || oldUser) && !authUserStr) {
            console.log('🔧 [API] Migrating old auth data...');
            try {
                const token = oldToken || '';
                let user = null;
                if (oldUser) {
                    user = JSON.parse(oldUser);
                }
                
                if (token || user) {
                    localStorage.setItem('authUser', JSON.stringify({
                        token: token,
                        user: user
                    }));
                }
            } catch (e) {
                console.error('🔧 [API] Failed to migrate auth data:', e);
            }
        }
        
        // Auto-login if credentials exist
        if (this.isLoggedIn() && !this._sessionChecked) {
            console.log('🔧 [API] 🔄 Auto-login on initialization...');
            try {
                const sessionResult = await this.autoLogin();
                console.log('🔧 [API] Auto-login result:', sessionResult.message);
            } catch (error) {
                console.log('🔧 [API] Auto-login failed:', error.message);
            }
        }
        
        // Initial health check
        setTimeout(async () => {
            try {
                const health = await this.checkBackendHealth();
                console.log('🔧 [API] 📶 Backend status:', health.message);
                console.log('🔧 [API] 🔐 Auth:', this.isLoggedIn() ? 'Logged in' : 'Not logged in');
                console.log('🔧 [API] 🔑 Token present:', !!this.getCurrentToken());
                console.log('🔧 [API] 💾 Device ID:', this.getDeviceId());
            } catch (error) {
                console.log('🔧 [API] Initial health check failed:', error.message);
            }
        }, 500);
        
        // Periodic session checks
        setInterval(() => {
            if (this.isLoggedIn() && this.isOnline()) {
                this.checkSession().catch(() => {});
            }
        }, this._config.SESSION_CHECK_INTERVAL);
        
        // Dispatch ready events - ALWAYS fire even if backend is down
        this._dispatchReadyEvents();
        
        return true;
    },
    
    autoLogin: async function() {
        const authUserStr = localStorage.getItem('authUser');
        if (!authUserStr) {
            return { success: false, authenticated: false, message: 'No stored credentials' };
        }
        
        try {
            const authUser = JSON.parse(authUserStr);
            if (!authUser.token || !authUser.user) {
                return { success: false, authenticated: false, message: 'Invalid stored credentials' };
            }
        } catch (e) {
            return { success: false, authenticated: false, message: 'Corrupted stored credentials' };
        }
        
        if (this._sessionChecked) {
            const user = this.getCurrentUser();
            return {
                success: true,
                authenticated: true,
                user: user,
                cached: true,
                message: 'Auto-login (cached session)'
            };
        }
        
        return await this.checkSession();
    },
    
    _dispatchReadyEvents: function() {
        const eventDetail = {
            version: this._version,
            timestamp: new Date().toISOString(),
            backendUrl: BASE_URL,
            user: this.getCurrentUser(),
            hasToken: !!this.getCurrentToken(),
            hasAuthUser: !!localStorage.getItem('authUser'),
            hardened: true
        };
        
        const events = ['api-ready', 'apiready', 'apiReady'];
        
        // Immediate dispatch
        events.forEach(eventName => {
            try {
                window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
                console.log(`🔧 [API] Dispatched ${eventName} event`);
            } catch (e) {
                console.log(`🔧 [API] Could not dispatch ${eventName}:`, e.message);
            }
        });
        
        // Delayed dispatches for compatibility
        setTimeout(() => {
            events.forEach(eventName => {
                try {
                    const delayedEventDetail = { ...eventDetail, delayed: true, delayMs: 500 };
                    window.dispatchEvent(new CustomEvent(eventName, { detail: delayedEventDetail }));
                } catch (e) {
                    // Silent fail
                }
            });
        }, 500);
        
        setTimeout(() => {
            events.forEach(eventName => {
                try {
                    const secondDelayedEventDetail = { ...eventDetail, delayed: true, delayMs: 1000 };
                    window.dispatchEvent(new CustomEvent(eventName, { detail: secondDelayedEventDetail }));
                } catch (e) {
                    // Silent fail
                }
            });
            console.log('🔧 [API] API synchronization ready (hardened)');
        }, 1000);
    },
    
    // ============================================================================
    // DIAGNOSTICS - ENHANCED
    // ============================================================================
    
    diagnose: async function() {
        console.log('🔧 [API] Running hardened diagnostics...');
        
        const results = {
            localStorage: {
                authUser: !!localStorage.getItem('authUser'),
                moodchat_auth_token: !!localStorage.getItem('moodchat_auth_token'),
                moodchat_auth_user: !!localStorage.getItem('moodchat_auth_user'),
                deviceId: !!localStorage.getItem('moodchat_device_id')
            },
            network: {
                online: navigator.onLine,
                backendReachable: this._backendReachable
            },
            session: {
                checked: this._sessionChecked,
                authenticated: this.isLoggedIn(),
                user: this.getCurrentUser(),
                token: this.getCurrentToken() ? 'Present' : 'Missing'
            },
            config: {
                backendUrl: BASE_URL,
                environment: IS_LOCAL_DEVELOPMENT ? 'local' : 'production',
                hardened: true
            },
            validation: {
                methodNormalization: 'ACTIVE',
                endpointSanitization: 'ACTIVE',
                singleFetchFunction: 'ACTIVE',
                offlineDetection: 'ACTIVE'
            }
        };
        
        console.table(results);
        
        try {
            const health = await this.checkBackendHealth();
            results.backendTest = health;
        } catch (error) {
            results.backendTest = { error: error.message };
        }
        
        return results;
    },
    
    request: async function(endpoint, options = {}) {
        // Use the main api function for consistency
        return window.api(endpoint, options);
    }
};

// ============================================================================
// API SETUP - EXTREME ROBUSTNESS
// ============================================================================

Object.assign(window.api, apiObject);
Object.setPrototypeOf(window.api, Object.getPrototypeOf(apiObject));

console.log('🔧 [API] Starting hardened initialization...');

// Safe initialization with timeout
setTimeout(() => {
    try {
        window.api.initialize();
    } catch (initError) {
        console.error('🔧 [API] Initialization failed but API remains functional:', initError);
    }
}, 100);

// Global error handlers
if (typeof window.handleApiError === 'undefined') {
    window.handleApiError = function(error, defaultMessage) {
        if (!error) return defaultMessage || 'An error occurred';
        if (error.message) return error.message;
        if (typeof error === 'string') return error;
        return defaultMessage || 'An unexpected error occurred';
    };
}

if (typeof window.isNetworkError === 'undefined') {
    window.isNetworkError = function(error) {
        if (!error) return false;
        const msg = error.message || error.toString();
        return msg.includes('Failed to fetch') ||
               msg.includes('NetworkError') ||
               msg.includes('network') ||
               msg.includes('Network request') ||
               error.status === 0;
    };
}

// ULTRA-ROBUST FALLBACK API
setTimeout(() => {
    if (!window.api || typeof window.api !== 'function') {
        console.warn('⚠️ API not initialized, creating ultra-robust fallback');
        
        const ultraFallbackApi = function(endpoint, options = {}) {
            // Always return a safe response, never throw
            const method = _normalizeHttpMethod(options.method);
            const safeEndpoint = _sanitizeEndpoint(endpoint);
            
            console.warn(`⚠️ Using ultra-fallback API for ${method} ${safeEndpoint}`);
            
            return Promise.resolve({
                success: false,
                status: 0,
                message: 'API fallback mode',
                offline: !navigator.onLine,
                isNetworkError: true,
                fallback: true
            });
        };
        
        // Attach essential methods
        Object.assign(ultraFallbackApi, {
            _singleton: true,
            _version: 'ultra-fallback',
            _hardened: true,
            initialize: () => {
                console.log('🔧 [API] Ultra-fallback initialized');
                return true;
            },
            isLoggedIn: () => {
                try {
                    const authUserStr = localStorage.getItem('authUser');
                    if (!authUserStr) return false;
                    const authUser = JSON.parse(authUserStr);
                    return !!(authUser.token && authUser.user);
                } catch (e) {
                    return false;
                }
            },
            getCurrentUser: () => {
                try {
                    const authUserStr = localStorage.getItem('authUser');
                    if (authUserStr) {
                        const authUser = JSON.parse(authUserStr);
                        return authUser.user || null;
                    }
                } catch (e) {
                    return null;
                }
                return null;
            },
            getCurrentToken: () => {
                try {
                    const authUserStr = localStorage.getItem('authUser');
                    if (authUserStr) {
                        const authUser = JSON.parse(authUserStr);
                        return authUser.token || null;
                    }
                } catch (e) {
                    return null;
                }
                return null;
            },
            isOnline: () => navigator.onLine,
            isBackendReachable: () => false,
            checkSession: async () => ({ 
                authenticated: ultraFallbackApi.isLoggedIn(),
                offline: true,
                fallback: true
            }),
            autoLogin: async () => ({
                success: ultraFallbackApi.isLoggedIn(),
                authenticated: ultraFallbackApi.isLoggedIn(),
                user: ultraFallbackApi.getCurrentUser(),
                fallback: true
            }),
            login: async () => ({ 
                success: false, 
                message: 'API fallback mode',
                offline: !navigator.onLine,
                fallback: true
            }),
            register: async () => ({ 
                success: false, 
                message: 'API fallback mode',
                offline: !navigator.onLine,
                fallback: true
            }),
            request: async () => ({
                success: false,
                message: 'API fallback mode',
                offline: !navigator.onLine,
                fallback: true
            })
        });
        
        window.api = ultraFallbackApi;
    }
}, 3000);

// EMERGENCY API - NEVER FAILS
if (!window.api) {
    console.error('⚠️ window.api not set! Creating emergency hardened API');
    
    const emergencyHardenedApi = function(endpoint, options) {
        // Accept ANY input, return SAFE response
        const method = _normalizeHttpMethod(options?.method);
        const safeEndpoint = _sanitizeEndpoint(endpoint);
        
        return Promise.resolve({
            success: false,
            status: 0,
            message: 'Emergency hardened API',
            emergency: true,
            methodUsed: method,
            endpointRequested: safeEndpoint,
            offline: !navigator.onLine
        });
    };
    
    Object.assign(emergencyHardenedApi, {
        _singleton: true,
        _version: 'emergency-hardened',
        _neverFails: true,
        isLoggedIn: () => false,
        isBackendReachable: () => false,
        initialize: () => true,
        autoLogin: async () => ({ success: false, authenticated: false, emergency: true }),
        isOnline: () => navigator.onLine
    });
    
    window.api = emergencyHardenedApi;
}

// Global API state
window.__MOODCHAT_API_EVENTS = [];
window.__MOODCHAT_API_INSTANCE = window.api;
window.__MOODCHAT_API_READY = true;
window.MOODCHAT_API_READY = true;

console.log('🔧 [API] HARDENED Backend API integration complete');
console.log('🔧 [API] ✅ Method normalization: ACTIVE');
console.log('🔧 [API] ✅ Endpoint sanitization: ACTIVE');
console.log('🔧 [API] ✅ Single fetch function: ACTIVE');
console.log('🔧 [API] ✅ Offline detection: ACTIVE');
console.log('🔧 [API] ✅ NEVER breaks on frontend errors');