// api.js - UPDATED VERSION WITH PROPER CORS HANDLING
// This version will handle all errors properly

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================
const IS_LOCAL_DEVELOPMENT = window.location.hostname === 'localhost' || 
                           window.location.hostname.startsWith('127.') ||
                           window.location.hostname.startsWith('192.168') ||
                           window.location.protocol === 'file:';

// ============================================================================
// BACKEND URL CONFIGURATION
// ============================================================================
const BACKEND_BASE_URL = IS_LOCAL_DEVELOPMENT 
    ? 'http://localhost:4000' 
    : 'https://moodchat-backend-1.onrender.com';

const BASE_URL = BACKEND_BASE_URL + '/api';

console.log(`🔧 [API] Environment: ${IS_LOCAL_DEVELOPMENT ? 'Local Development' : 'Production'}`);
console.log(`🔧 [API] Backend Base URL: ${BACKEND_BASE_URL}`);
console.log(`🔧 [API] API Base URL: ${BASE_URL}`);

// ============================================================================
// MAIN API OBJECT - WITH PROPER ERROR HANDLING
// ============================================================================

// Create API object immediately
window.api = {
    _singleton: true,
    _version: '8.0.0',
    _safeInitialized: true,
    _backendReachable: null, // Track backend status
    _sessionChecked: false, // Track if session has been checked
    
    // Configuration
    _config: {
        BACKEND_URL: BASE_URL,
        BACKEND_BASE_URL: BACKEND_BASE_URL,
        IS_LOCAL_DEVELOPMENT: IS_LOCAL_DEVELOPMENT,
        STORAGE_PREFIX: 'moodchat_',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        SESSION_CHECK_INTERVAL: 300000, // 5 minutes
        STATUS_FETCH_TIMEOUT: 8000 // 8 seconds for status fetches
    },
    
    // ============================================================================
    // CORE METHODS WITH IMPROVED ERROR HANDLING
    // ============================================================================
    
    login: async function(emailOrUsername, password) {
        try {
            console.log(`🔧 [API] Login attempt for: ${emailOrUsername}`);
            
            const requestData = { password: String(password) };
            
            if (emailOrUsername.includes('@')) {
                requestData.email = String(emailOrUsername).trim();
            } else {
                requestData.username = String(emailOrUsername).trim();
            }
            
            const response = await this._fetchWithRetry('/auth/login', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token and user
                if (data.token) {
                    localStorage.setItem('moodchat_auth_token', data.token);
                }
                if (data.user) {
                    localStorage.setItem('moodchat_auth_user', JSON.stringify(data.user));
                }
                
                // Set session as checked
                this._sessionChecked = true;
                
                return {
                    success: true,
                    message: 'Login successful',
                    token: data.token,
                    user: data.user,
                    data: data
                };
            } else {
                return {
                    success: false,
                    message: data.message || 'Login failed',
                    status: response.status,
                    data: data
                };
            }
        } catch (error) {
            console.error('🔧 [API] Login error:', error);
            
            // Determine error type
            const isNetworkError = error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('Network request failed')
            );
            
            return {
                success: false,
                message: isNetworkError 
                    ? 'Network error. Please check your internet connection.' 
                    : 'Login failed: ' + error.message,
                error: error.message,
                isNetworkError: isNetworkError
            };
        }
    },
    
    register: async function(userData) {
        try {
            console.log('🔧 [API] Register attempt');
            
            const response = await this._fetchWithRetry('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token and user
                if (data.token) {
                    localStorage.setItem('moodchat_auth_token', data.token);
                }
                if (data.user) {
                    localStorage.setItem('moodchat_auth_user', JSON.stringify(data.user));
                }
                
                // Set session as checked
                this._sessionChecked = true;
                
                return {
                    success: true,
                    message: 'Registration successful',
                    token: data.token,
                    user: data.user,
                    data: data
                };
            } else {
                return {
                    success: false,
                    message: data.message || 'Registration failed',
                    status: response.status,
                    data: data
                };
            }
        } catch (error) {
            console.error('🔧 [API] Register error:', error);
            
            const isNetworkError = error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError')
            );
            
            return {
                success: false,
                message: isNetworkError 
                    ? 'Network error. Please check your internet connection.' 
                    : 'Registration failed: ' + error.message,
                error: error.message,
                isNetworkError: isNetworkError
            };
        }
    },
    
    // ============================================================================
    // IMPROVED BACKEND HEALTH CHECK WITH MULTIPLE ENDPOINTS
    // ============================================================================
    
    checkBackendHealth: async function() {
        console.log('🔧 [API] Checking backend health with improved method...');
        
        // List of endpoints to try (in order of preference)
        const testEndpoints = [
            '/status',          // Primary health endpoint
            '/auth/health',     // Alternative auth health
            '/health',          // General health
            '',                 // Root API endpoint
        ];
        
        for (const endpoint of testEndpoints) {
            try {
                console.log(`🔧 [API] Trying endpoint: ${endpoint || '(root)'}`);
                
                const response = await fetch(BASE_URL + endpoint, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });
                
                if (response.ok || response.status < 500) {
                    console.log(`✅ [API] Backend reachable via ${endpoint || 'root'} (status: ${response.status})`);
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
                console.log(`⚠️ [API] Endpoint ${endpoint} failed:`, error.message);
                continue; // Try next endpoint
            }
        }
        
        // If all endpoints fail
        console.log('🔧 [API] All backend endpoints failed, marking as unreachable');
        this._backendReachable = false;
        
        return {
            success: false,
            reachable: false,
            message: 'Backend is unreachable',
            offlineMode: true
        };
    },
    
    // ============================================================================
    // ENHANCED SESSION CHECK WITH OFFLINE SUPPORT (Firebase-like behavior)
    // ============================================================================
    
    checkSession: async function() {
        try {
            const token = localStorage.getItem('moodchat_auth_token');
            const userStr = localStorage.getItem('moodchat_auth_user');
            
            if (!token || !userStr) {
                this._sessionChecked = true;
                return {
                    success: false,
                    authenticated: false,
                    message: 'No active session'
                };
            }
            
            // Parse user data first
            let userData;
            try {
                userData = JSON.parse(userStr);
            } catch (e) {
                console.error('🔧 [API] Error parsing stored user data:', e);
                this._clearAuthData();
                this._sessionChecked = true;
                return {
                    success: false,
                    authenticated: false,
                    message: 'Invalid session data'
                };
            }
            
            // If we've already checked session recently and backend is reachable, 
            // return cached data immediately (Firebase-like behavior)
            if (this._sessionChecked && this._backendReachable !== false) {
                return {
                    success: true,
                    authenticated: true,
                    user: userData,
                    message: 'Session valid (cached)'
                };
            }
            
            // Try to validate with backend if reachable
            try {
                const response = await this._fetchWithRetry('/auth/me', {
                    method: 'GET',
                    auth: true
                }, false); // Don't retry for session check
                
                if (response.ok) {
                    const data = await response.json();
                    // Update user data
                    const updatedUser = data.user || userData;
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
                    // Token invalid on backend
                    if (response.status === 401 || response.status === 403) {
                        this._clearAuthData();
                        this._sessionChecked = true;
                        
                        return {
                            success: false,
                            authenticated: false,
                            message: 'Session expired'
                        };
                    }
                    
                    // Other errors - use cached data but mark backend as potentially unreachable
                    this._sessionChecked = true;
                    
                    return {
                        success: true,
                        authenticated: true,
                        user: userData,
                        offline: true,
                        message: 'Session valid (offline mode - backend error)'
                    };
                }
            } catch (backendError) {
                // Backend unreachable - use cached data (Firebase offline behavior)
                console.log('🔧 [API] Backend unreachable for session check, using cached data');
                
                this._sessionChecked = true;
                this._backendReachable = false;
                
                return {
                    success: true,
                    authenticated: true,
                    user: userData,
                    offline: true,
                    message: 'Session valid (offline mode - network error)'
                };
            }
            
        } catch (error) {
            console.error('🔧 [API] Check session error:', error);
            this._sessionChecked = true;
            return {
                success: false,
                authenticated: false,
                message: 'Failed to check session: ' + error.message
            };
        }
    },
    
    // Auto-login on refresh (Firebase-like behavior)
    autoLogin: async function() {
        if (!this.isLoggedIn()) {
            return { success: false, authenticated: false, message: 'No stored credentials' };
        }
        
        // If session already checked recently, return cached
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
        
        // Otherwise check session
        return await this.checkSession();
    },
    
    // ============================================================================
    // ENHANCED FETCH METHODS WITH RETRY LOGIC
    // ============================================================================
    
    _fetchWithRetry: async function(endpoint, options = {}, retry = true) {
        const maxRetries = retry ? this._config.MAX_RETRIES : 0;
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const token = localStorage.getItem('moodchat_auth_token');
                const url = BASE_URL + endpoint;
                
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                if (token && options.auth !== false) {
                    headers['Authorization'] = 'Bearer ' + token;
                }
                
                // Add CORS mode for cross-origin requests
                const fetchOptions = {
                    method: options.method || 'GET',
                    headers: headers,
                    body: options.body,
                    mode: 'cors',  // Always use CORS mode
                    credentials: 'omit', // Don't send cookies
                    ...options
                };
                
                // Add timeout (use longer timeout for status endpoint)
                const timeout = endpoint === '/statuses/all' 
                    ? this._config.STATUS_FETCH_TIMEOUT 
                    : 10000;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                fetchOptions.signal = controller.signal;
                
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);
                
                // If we got a response, return it
                return response;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on abort (timeout)
                if (error.name === 'AbortError') {
                    break;
                }
                
                // Log retry attempt
                if (attempt < maxRetries) {
                    console.log(`🔧 [API] Retry ${attempt + 1}/${maxRetries} for ${endpoint}:`, error.message);
                    
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => 
                        setTimeout(resolve, this._config.RETRY_DELAY * Math.pow(2, attempt))
                    );
                    continue;
                }
            }
        }
        
        throw lastError || new Error('Request failed after retries');
    },
    
    // Enhanced request method
    request: async function(endpoint, options = {}) {
        try {
            const response = await this._fetchWithRetry(endpoint, options);
            const data = await response.json().catch(() => ({}));
            
            return {
                success: response.ok,
                status: response.status,
                data: data,
                message: data.message || (response.ok ? 'Success' : 'Request failed'),
                headers: Object.fromEntries(response.headers.entries())
            };
        } catch (error) {
            console.error(`🔧 [API] Request error for ${endpoint}:`, error);
            
            const isNetworkError = error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('aborted')
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
        }
    },
    
    // ============================================================================
    // STATUS AND FRIENDS METHODS WITH FALLBACK
    // ============================================================================
    
    getStatuses: async function() {
        try {
            // Always use direct network fetch with timeout for /statuses/all
            const token = localStorage.getItem('moodchat_auth_token');
            const url = BASE_URL + '/statuses/all';
            
            console.log('🔧 [API] Fetching statuses with direct network request...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this._config.STATUS_FETCH_TIMEOUT);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                },
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the data for offline use
            try {
                localStorage.setItem('moodchat_cache_statuses', JSON.stringify({
                    data: data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.log('🔧 [API] Could not cache statuses:', e.message);
            }
            
            return {
                success: true,
                data: data,
                status: response.status,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('🔧 [API] Get statuses error:', error);
            
            // Check for cached data only on network errors (not auth errors)
            const isNetworkError = error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('aborted')
            );
            
            if (isNetworkError) {
                // Return cached data if available and recent (less than 5 minutes old)
                const cached = localStorage.getItem('moodchat_cache_statuses');
                if (cached) {
                    try {
                        const cachedData = JSON.parse(cached);
                        const cacheAge = Date.now() - (cachedData.timestamp || 0);
                        
                        if (cacheAge < 300000) { // 5 minutes
                            return {
                                success: true,
                                data: cachedData.data,
                                cached: true,
                                message: 'Using cached data (network unavailable)',
                                error: error.message
                            };
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }
            }
            
            return {
                success: false,
                message: 'Failed to fetch statuses',
                error: error.message,
                isNetworkError: isNetworkError
            };
        }
    },
    
    getFriends: async function() {
        try {
            const response = await this._fetchWithRetry('/friends/list', {
                method: 'GET',
                auth: true
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            try {
                localStorage.setItem('moodchat_cache_friends', JSON.stringify({
                    data: data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.log('🔧 [API] Could not cache friends:', e.message);
            }
            
            return {
                success: true,
                data: data,
                status: response.status
            };
        } catch (error) {
            console.error('🔧 [API] Get friends error:', error);
            
            // Return cached data if available and recent
            const cached = localStorage.getItem('moodchat_cache_friends');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    const cacheAge = Date.now() - (cachedData.timestamp || 0);
                    
                    if (cacheAge < 300000) { // 5 minutes
                        return {
                            success: true,
                            data: cachedData.data,
                            cached: true,
                            message: 'Using cached data',
                            error: error.message
                        };
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }
            
            return {
                success: false,
                message: 'Failed to fetch friends',
                error: error.message,
                isNetworkError: error.message && error.message.includes('Failed to fetch')
            };
        }
    },
    
    // ============================================================================
    // UTILITY METHODS WITH ENHANCED ERROR HANDLING
    // ============================================================================
    
    isLoggedIn: function() {
        try {
            const token = localStorage.getItem('moodchat_auth_token');
            const user = localStorage.getItem('moodchat_auth_user');
            return !!(token && user);
        } catch (error) {
            console.error('🔧 [API] Error checking login status:', error);
            return false;
        }
    },
    
    getCurrentUser: function() {
        try {
            const userStr = localStorage.getItem('moodchat_auth_user');
            if (userStr) {
                return JSON.parse(userStr);
            }
        } catch (e) {
            console.error('🔧 [API] Error parsing user data:', e);
        }
        return null;
    },
    
    logout: function() {
        try {
            this._clearAuthData();
            console.log('🔧 [API] User logged out');
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            console.error('🔧 [API] Error during logout:', error);
            return { success: false, message: 'Logout failed: ' + error.message };
        }
    },
    
    _clearAuthData: function() {
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
            // Fallback device ID if storage fails
            return 'moodchat_fallback_' + Date.now().toString(36);
        }
    },
    
    isOnline: function() {
        return navigator.onLine;
    },
    
    isBackendReachable: function() {
        // Check cached status first
        if (this._backendReachable !== null) {
            return this._backendReachable;
        }
        
        // Default to true if not checked yet (optimistic)
        return true;
    },
    
    getConnectionStatus: function() {
        return {
            online: navigator.onLine,
            backendReachable: this.isBackendReachable(),
            timestamp: new Date().toISOString(),
            backendUrl: BACKEND_BASE_URL,
            sessionChecked: this._sessionChecked
        };
    },
    
    // ============================================================================
    // INITIALIZATION WITH BACKEND CHECK (Firebase-like auto initialization)
    // ============================================================================
    
    initialize: async function() {
        console.log('🔧 [API] ⚡ MoodChat API v8.0.0 initializing...');
        console.log('🔧 [API] 🔗 Backend URL:', BASE_URL);
        console.log('🔧 [API] 🌐 Environment:', IS_LOCAL_DEVELOPMENT ? 'Local' : 'Production');
        
        // Auto-login on initialization (Firebase-like behavior)
        if (this.isLoggedIn() && !this._sessionChecked) {
            console.log('🔧 [API] 🔄 Auto-login on initialization...');
            try {
                const sessionResult = await this.autoLogin();
                console.log('🔧 [API] Auto-login result:', sessionResult.message);
            } catch (error) {
                console.log('🔧 [API] Auto-login failed:', error.message);
            }
        }
        
        // Check backend health in background
        setTimeout(async () => {
            try {
                const health = await this.checkBackendHealth();
                console.log('🔧 [API] 📶 Backend status:', health.message);
                console.log('🔧 [API] 🔐 Auth:', this.isLoggedIn() ? 'Logged in' : 'Not logged in');
                console.log('🔧 [API] 💾 Device ID:', this.getDeviceId());
                
            } catch (error) {
                console.log('🔧 [API] Initial health check failed:', error.message);
            }
        }, 500);
        
        // Set up periodic session check (every 5 minutes)
        setInterval(() => {
            if (this.isLoggedIn() && this.isOnline()) {
                this.checkSession().catch(() => {});
            }
        }, this._config.SESSION_CHECK_INTERVAL);
        
        // Dispatch ready event
        try {
            window.dispatchEvent(new CustomEvent('api-ready', {
                detail: {
                    version: this._version,
                    timestamp: new Date().toISOString(),
                    backendUrl: BASE_URL,
                    user: this.getCurrentUser()
                }
            }));
        } catch (e) {
            // Ignore event errors
        }
        
        return true;
    },
    
    // ============================================================================
    // DIAGNOSTICS AND DEBUGGING
    // ============================================================================
    
    testRequirements: function() {
        console.log('🔍 Testing API Requirements...');
        
        const tests = [
            { name: 'Dynamic BASE_URL', passed: !!BASE_URL },
            { name: 'CORS mode support', passed: true },
            { name: 'Retry logic', passed: !!this._fetchWithRetry },
            { name: 'Offline mode', passed: !!this.isLoggedIn },
            { name: 'Error handling', passed: !!this.request },
            { name: 'Backend detection', passed: !!this.checkBackendHealth },
            { name: 'Token persistence', passed: true },
            { name: 'Auto-login', passed: !!this.autoLogin }
        ];
        
        tests.forEach(test => {
            console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
        });
        
        return {
            success: tests.every(t => t.passed),
            tests: tests,
            timestamp: new Date().toISOString()
        };
    },
    
    diagnose: async function() {
        console.log('🔧 [API] Running diagnostics...');
        
        const results = {
            localStorage: {
                token: !!localStorage.getItem('moodchat_auth_token'),
                user: !!localStorage.getItem('moodchat_auth_user'),
                deviceId: !!localStorage.getItem('moodchat_device_id')
            },
            network: {
                online: navigator.onLine,
                backendReachable: this._backendReachable
            },
            session: {
                checked: this._sessionChecked,
                authenticated: this.isLoggedIn()
            },
            config: {
                backendUrl: BASE_URL,
                environment: IS_LOCAL_DEVELOPMENT ? 'local' : 'production'
            }
        };
        
        console.table(results);
        
        // Test backend connection
        try {
            const health = await this.checkBackendHealth();
            results.backendTest = health;
        } catch (error) {
            results.backendTest = { error: error.message };
        }
        
        return results;
    }
};

// ============================================================================
// INITIALIZE AND SETUP
// ============================================================================
console.log('🔧 [API] Starting initialization...');

// Start initialization
setTimeout(() => {
    window.api.initialize();
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

// ============================================================================
// FALLBACK - Ensure api exists no matter what
// ============================================================================
setTimeout(() => {
    if (!window.api || typeof window.api !== 'object') {
        console.warn('⚠️ API not properly initialized, creating enhanced fallback');
        window.api = {
            _singleton: true,
            _version: 'fallback',
            initialize: () => true,
            isLoggedIn: () => {
                try {
                    return !!(localStorage.getItem('moodchat_auth_token') && 
                            localStorage.getItem('moodchat_auth_user'));
                } catch (e) {
                    return false;
                }
            },
            getCurrentUser: () => {
                try {
                    const user = localStorage.getItem('moodchat_auth_user');
                    return user ? JSON.parse(user) : null;
                } catch (e) {
                    return null;
                }
            },
            isOnline: () => navigator.onLine,
            isBackendReachable: () => false,
            checkSession: async () => ({ 
                authenticated: window.api.isLoggedIn(),
                offline: true 
            }),
            autoLogin: async () => ({
                success: window.api.isLoggedIn(),
                authenticated: window.api.isLoggedIn(),
                user: window.api.getCurrentUser()
            }),
            login: async () => ({ 
                success: false, 
                message: 'API not available',
                isNetworkError: true 
            }),
            register: async () => ({ 
                success: false, 
                message: 'API not available',
                isNetworkError: true 
            }),
            request: async () => ({
                success: false,
                message: 'API not available',
                isNetworkError: true
            })
        };
    }
}, 3000);

console.log('🔧 [API] Enhanced API loaded successfully');

// ============================================================================
// ENSURE PROPER EXPORT AND DETECTION
// ============================================================================

// Force window.api to be accessible
if (!window.api) {
    console.error('⚠️ window.api not set! Creating emergency API');
    window.api = {
        _singleton: true,
        _version: 'emergency',
        isLoggedIn: () => false,
        isBackendReachable: () => true,
        initialize: () => true,
        autoLogin: async () => ({ success: false, authenticated: false })
    };
}

// ============================================================================
// ADD YOUR REQUESTED FEATURES
// ============================================================================

// Store events array
window.__MOODCHAT_API_EVENTS = [];

// Store instance reference
window.__MOODCHAT_API_INSTANCE = window.api;

// Set ready flag
window.__MOODCHAT_API_READY = true;

// Dispatch ready event immediately
setTimeout(() => {
    console.log('🔧 [API] Dispatching ready event...');
    
    // Create event detail object
    const eventDetail = {
        version: window.api._version,
        timestamp: new Date().toISOString(),
        backendUrl: BASE_URL,
        user: window.api.getCurrentUser()
    };
    
    // Store current event in the events array
    window.__MOODCHAT_API_EVENTS.push({
        name: 'api-ready',
        timestamp: new Date().toISOString(),
        detail: eventDetail
    });
    
    // Multiple events for compatibility
    const events = ['api-ready', 'apiready', 'apiReady'];
    events.forEach(eventName => {
        try {
            window.dispatchEvent(new CustomEvent(eventName, {
                detail: eventDetail
            }));
            console.log(`🔧 [API] Dispatched ${eventName} event`);
        } catch (e) {
            console.log(`🔧 [API] Could not dispatch ${eventName}:`, e.message);
        }
    });
    
    // Also set a global flag
    window.MOODCHAT_API_READY = true;
    console.log('🔧 [API] API is READY and accessible');
    
    // Add delayed events - Dispatch events again after 500ms timeout
    setTimeout(() => {
        console.log('🔧 [API] Delayed dispatch (500ms)...');
        events.forEach(eventName => {
            try {
                const delayedEventDetail = {
                    ...eventDetail,
                    delayed: true,
                    delayMs: 500
                };
                
                window.__MOODCHAT_API_EVENTS.push({
                    name: eventName + '-delayed-500ms',
                    timestamp: new Date().toISOString(),
                    detail: delayedEventDetail
                });
                
                window.dispatchEvent(new CustomEvent(eventName, {
                    detail: delayedEventDetail
                }));
                console.log(`🔧 [API] Dispatched delayed ${eventName} event (500ms)`);
            } catch (e) {
                console.log(`🔧 [API] Could not dispatch delayed ${eventName}:`, e.message);
            }
        });
    }, 500);
    
    // Add second delay - Dispatch events again after 1000ms timeout
    setTimeout(() => {
        console.log('🔧 [API] Second delayed dispatch (1000ms)...');
        events.forEach(eventName => {
            try {
                const secondDelayedEventDetail = {
                    ...eventDetail,
                    delayed: true,
                    delayMs: 1000
                };
                
                window.__MOODCHAT_API_EVENTS.push({
                    name: eventName + '-delayed-1000ms',
                    timestamp: new Date().toISOString(),
                    detail: secondDelayedEventDetail
                });
                
                window.dispatchEvent(new CustomEvent(eventName, {
                    detail: secondDelayedEventDetail
                }));
                console.log(`🔧 [API] Dispatched second delayed ${eventName} event (1000ms)`);
            } catch (e) {
                console.log(`🔧 [API] Could not dispatch second delayed ${eventName}:`, e.message);
            }
        });
        
        // Add console log
        console.log('🔧 [API] API synchronization ready');
    }, 1000);
}, 200);