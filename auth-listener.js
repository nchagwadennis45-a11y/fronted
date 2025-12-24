// auth-listener.js
/**
 * UniConnect - Authentication State Listener
 * Handles real-time authentication state changes and user session management
 * Offline-first design with cached sessions
 */

import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    doc, 
    updateDoc, 
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

class AuthStateListener {
    constructor() {
        this.currentUser = null;
        this.authStateSubscribers = [];
        this.isListening = false;
        this.isOfflineMode = false;
        this.init();
    }

    /**
     * Initializes the authentication state listener
     */
    async init() {
        if (this.isListening) return;

        try {
            console.log('🔐 Initializing Auth State Listener...');
            
            // Set persistence to local storage
            await setPersistence(auth, browserLocalPersistence);
            
            // First: Try to load cached user for immediate UI display
            await this.loadCachedUser();
            
            // Then: Start listening to auth state changes in background
            this.unsubscribe = onAuthStateChanged(auth, 
                (user) => this.handleAuthStateChange(user),
                (error) => this.handleAuthError(error)
            );
            
            this.isListening = true;
            console.log('✅ Auth State Listener initialized successfully');
            
        } catch (error) {
            console.error('❌ Auth State Listener initialization failed:', error);
            // Even if Firebase fails, show UI with cached user
            await this.loadCachedUser();
            this.isListening = true;
        }
    }

    /**
     * Loads cached user from localStorage for immediate UI display
     */
    async loadCachedUser() {
        try {
            const cachedUser = localStorage.getItem('uniconnect-user');
            const lastAuth = localStorage.getItem('uniconnect-last-auth');
            
            if (cachedUser && lastAuth) {
                const user = JSON.parse(cachedUser);
                const lastAuthDate = new Date(lastAuth);
                const now = new Date();
                const hoursDiff = (now - lastAuthDate) / (1000 * 60 * 60);
                
                // Use cached user if less than 24 hours old
                if (hoursDiff < 24) {
                    console.log('📱 Loading cached user session:', user.email);
                    this.currentUser = user;
                    this.isOfflineMode = true;
                    
                    // Apply cached preferences immediately
                    await this.loadCachedPreferences();
                    
                    // Update UI immediately (don't wait for Firebase)
                    this.updateUILoggedIn(this.currentUser);
                    
                    // Notify subscribers with cached user
                    this.notifySubscribers(this.currentUser);
                    
                    return true;
                } else {
                    console.log('🕐 Cached session expired, clearing...');
                    this.clearCachedSession();
                }
            }
        } catch (error) {
            console.error('❌ Error loading cached user:', error);
        }
        
        // No cached user or error - show logged out UI
        this.updateUILoggedOut();
        return false;
    }

    /**
     * Loads cached preferences from localStorage
     */
    async loadCachedPreferences() {
        try {
            const cachedPrefs = localStorage.getItem('uniconnect-preferences');
            if (cachedPrefs) {
                const preferences = JSON.parse(cachedPrefs);
                this.applyUserSelections(preferences);
                console.log('✅ Applied cached preferences');
            }
        } catch (error) {
            console.error('❌ Error loading cached preferences:', error);
        }
    }

    /**
     * Clears cached session data
     */
    clearCachedSession() {
        localStorage.removeItem('uniconnect-user');
        localStorage.removeItem('uniconnect-last-auth');
        this.isOfflineMode = false;
    }

    /**
     * Handles authentication state changes (runs in background)
     */
    async handleAuthStateChange(user) {
        try {
            if (user) {
                // User authenticated with Firebase
                await this.handleFirebaseUserSignedIn(user);
            } else {
                // No user in Firebase - check if we have cached user
                if (this.isOfflineMode) {
                    console.log('🌐 Offline mode: Keeping cached user session');
                    // Keep showing cached user, don't sign out
                    return;
                }
                await this.handleUserSignedOut();
            }
            
        } catch (error) {
            console.error('❌ Error handling auth state change:', error);
            // Don't break UI on Firebase errors
            this.handleAuthError(error);
        }
    }

    /**
     * Handles Firebase user sign-in (background verification)
     */
    async handleFirebaseUserSignedIn(user) {
        console.log('✅ Firebase verification successful:', user.email);
        
        try {
            // Update user status in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                status: 'Online',
                statusType: 'online',
                lastSeen: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // Get complete user data from Firestore
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : null;

            // Store updated user in memory
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                photoURL: user.photoURL,
                ...userData
            };

            // Update localStorage with fresh data
            localStorage.setItem('uniconnect-user', JSON.stringify(this.currentUser));
            localStorage.setItem('uniconnect-last-auth', new Date().toISOString());

            // Exit offline mode
            this.isOfflineMode = false;

            // Load fresh user selections
            await this.loadUserSelections();

            // Sync with UserData manager
            await this.syncWithUserDataManager();

            // Apply theme colors
            this.applyThemeColors();

            // Update UI with fresh data
            this.updateUILoggedIn(this.currentUser);
            
            // Notify subscribers with updated user
            this.notifySubscribers(this.currentUser);
            
            console.log('✅ User session synchronized:', user.email);

        } catch (error) {
            console.error('❌ Error during Firebase sync:', error);
            // If Firebase fails, keep using cached data
            if (this.isOfflineMode) {
                console.log('🌐 Staying in offline mode due to sync error');
            }
        }
    }

    /**
     * Handles user sign-out
     */
    async handleUserSignedOut() {
        console.log('👤 User signed out');
        
        try {
            // Update user status in Firestore if we have a previous user and online
            if (this.currentUser && this.currentUser.uid && !this.isOfflineMode) {
                const userDocRef = doc(db, 'users', this.currentUser.uid);
                await updateDoc(userDocRef, {
                    status: 'Offline',
                    statusType: 'offline',
                    lastSeen: serverTimestamp()
                }).catch(error => {
                    console.warn('⚠️ Could not update offline status:', error);
                });
            }

            // Clear user data
            this.currentUser = null;
            this.isOfflineMode = false;
            
            // Clear localStorage (keep theme preference)
            const theme = localStorage.getItem('uniconnect-theme');
            
            localStorage.clear();
            
            // Restore theme if exists
            if (theme) localStorage.setItem('uniconnect-theme', theme);
            
            localStorage.setItem('uniconnect-last-auth', new Date().toISOString());

            // Reset theme to default
            this.resetThemeToDefault();

            // Update UI
            this.updateUILoggedOut();
            
            // Notify subscribers
            this.notifySubscribers(null);
            
            console.log('✅ User session cleared');

        } catch (error) {
            console.error('❌ Error handling user sign-out:', error);
            throw error;
        }
    }

    /**
     * 🔄 NEW: Load user selections after authentication
     */
    async loadUserSelections() {
        try {
            if (!this.currentUser || !this.currentUser.uid) return;

            console.log('📥 Loading user selections...');
            
            // Try to load from Firestore first
            try {
                const preferencesRef = doc(db, 'userPreferences', this.currentUser.uid);
                const preferencesDoc = await getDoc(preferencesRef);
                
                if (preferencesDoc.exists()) {
                    const preferences = preferencesDoc.data();
                    
                    // Apply user selections to UI
                    this.applyUserSelections(preferences);
                    
                    // Store in local storage for offline use
                    localStorage.setItem('uniconnect-preferences', JSON.stringify(preferences));
                    
                    console.log('✅ User selections loaded from Firestore');
                    return;
                }
            } catch (firestoreError) {
                console.log('🌐 Could not reach Firestore, using cached preferences');
            }
            
            // Fallback to cached preferences
            await this.loadCachedPreferences();
            
        } catch (error) {
            console.error('❌ Error loading user selections:', error);
        }
    }

    /**
     * 🔄 NEW: Apply user selections to UI elements
     */
    applyUserSelections(preferences) {
        try {
            // Apply theme selection if exists
            if (preferences.theme) {
                document.documentElement.setAttribute('data-theme', preferences.theme);
                this.applyThemeSpecificColors(preferences.theme);
            }

            // Apply language selection if exists
            if (preferences.language && window.i18n) {
                window.i18n.changeLanguage(preferences.language);
            }

            // Apply notification preferences
            if (preferences.notifications) {
                if (window.notificationManager) {
                    window.notificationManager.setPreferences(preferences.notifications);
                }
            }

            // Apply UI density preference
            if (preferences.uiDensity) {
                document.body.classList.add(`density-${preferences.uiDensity}`);
            }

            // Apply specific component preferences
            if (preferences.components) {
                Object.keys(preferences.components).forEach(componentId => {
                    const componentPrefs = preferences.components[componentId];
                    this.applyComponentPreferences(componentId, componentPrefs);
                });
            }

            console.log('✅ User selections applied to UI');
            
        } catch (error) {
            console.error('❌ Error applying user selections:', error);
        }
    }

    /**
     * 🔄 NEW: Apply preferences to specific components
     */
    applyComponentPreferences(componentId, preferences) {
        const component = document.getElementById(componentId);
        if (!component) return;

        // Apply visibility preferences
        if (preferences.visible !== undefined) {
            component.style.display = preferences.visible ? 'block' : 'none';
        }

        // Apply collapsed state
        if (preferences.collapsed !== undefined && component.classList) {
            if (preferences.collapsed) {
                component.classList.add('collapsed');
            } else {
                component.classList.remove('collapsed');
            }
        }

        // Apply order/index if applicable
        if (preferences.order !== undefined && component.style) {
            component.style.order = preferences.order;
        }
    }

    /**
     * 🔄 NEW: Sync with UserData manager
     */
    async syncWithUserDataManager() {
        try {
            if (!this.currentUser || !this.currentUser.uid) return;

            console.log('🔄 Syncing with UserData manager...');
            
            // Check if UserData manager exists
            if (window.userDataManager && typeof window.userDataManager.sync === 'function') {
                await window.userDataManager.sync(this.currentUser.uid);
                console.log('✅ Synced with UserData manager');
            } else if (window.UserDataManager) {
                // Initialize UserData manager if not already initialized
                window.userDataManager = new window.UserDataManager(this.currentUser.uid);
                await window.userDataManager.loadData();
                console.log('✅ UserData manager initialized and synced');
            } else {
                console.log('ℹ️ UserData manager not available, skipping sync');
            }
            
        } catch (error) {
            console.error('❌ Error syncing with UserData manager:', error);
        }
    }

    /**
     * 🔄 NEW: Apply theme colors on login
     */
    applyThemeColors() {
        try {
            // Get theme from preferences or localStorage or default
            const storedPreferences = localStorage.getItem('uniconnect-preferences');
            let theme = localStorage.getItem('uniconnect-theme') || 'light';
            
            if (storedPreferences) {
                const preferences = JSON.parse(storedPreferences);
                if (preferences.theme) {
                    theme = preferences.theme;
                }
            }
            
            // Apply theme to document
            document.documentElement.setAttribute('data-theme', theme);
            
            // Apply theme-specific colors
            this.applyThemeSpecificColors(theme);
            
            // Store theme separately for logout persistence
            localStorage.setItem('uniconnect-theme', theme);
            
            // Trigger theme change event for other components
            this.dispatchThemeChangeEvent(theme);
            
            console.log(`🎨 Applied ${theme} theme colors`);
            
        } catch (error) {
            console.error('❌ Error applying theme colors:', error);
        }
    }

    /**
     * 🔄 NEW: Apply theme-specific color styles
     */
    applyThemeSpecificColors(theme) {
        const themes = {
            light: {
                '--primary-color': '#6366f1',
                '--secondary-color': '#8b5cf6',
                '--background-color': '#ffffff',
                '--surface-color': '#f8fafc',
                '--text-color': '#1e293b',
                '--text-secondary': '#64748b'
            },
            dark: {
                '--primary-color': '#818cf8',
                '--secondary-color': '#a78bfa',
                '--background-color': '#0f172a',
                '--surface-color': '#1e293b',
                '--text-color': '#f1f5f9',
                '--text-secondary': '#94a3b8'
            },
            blue: {
                '--primary-color': '#3b82f6',
                '--secondary-color': '#60a5fa',
                '--background-color': '#eff6ff',
                '--surface-color': '#dbeafe',
                '--text-color': '#1e40af',
                '--text-secondary': '#3b82f6'
            }
        };

        const colors = themes[theme] || themes.light;
        
        // Apply colors to root element
        const root = document.documentElement;
        Object.entries(colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }

    /**
     * 🔄 NEW: Dispatch theme change event
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: { theme },
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * 🔄 NEW: Reset theme to default on logout
     */
    resetThemeToDefault() {
        document.documentElement.setAttribute('data-theme', 'light');
        this.applyThemeSpecificColors('light');
        this.dispatchThemeChangeEvent('light');
        localStorage.setItem('uniconnect-theme', 'light');
    }

    /**
     * Handles authentication errors
     */
    handleAuthError(error) {
        console.error('🔐 Auth Error:', error);
        
        // Don't break UI on auth errors
        if (this.isOfflineMode) {
            console.log('🌐 Offline mode: Ignoring Firebase auth error');
            return;
        }
        
        const errorHandlers = {
            'auth/network-request-failed': () => {
                this.showNetworkError();
                // Switch to offline mode on network failure
                this.isOfflineMode = true;
            },
            'auth/too-many-requests': () => {
                this.showMessage('Too many attempts. Please try again later.', 'error');
            },
            'auth/user-token-expired': () => {
                this.handleTokenExpired();
            },
            'auth/user-not-found': () => {
                this.handleUserNotFound();
            },
            'default': () => {
                this.showMessage('Authentication error. Please try again.', 'error');
            }
        };

        const handler = errorHandlers[error?.code] || errorHandlers.default;
        handler();
    }

    /**
     * Handles token expiration
     */
    async handleTokenExpired() {
        console.warn('🔄 Auth token expired, refreshing...');
        
        try {
            // Only sign out if not in offline mode
            if (!this.isOfflineMode) {
                await signOut(auth);
                this.showMessage('Session expired. Please sign in again.', 'warning');
            } else {
                console.log('🌐 Offline mode: Keeping cached session despite expired token');
            }
        } catch (error) {
            console.error('❌ Error handling token expiration:', error);
        }
    }

    /**
     * Handles user not found scenario
     */
    handleUserNotFound() {
        console.warn('👤 User not found in auth system');
        // Only clear if not in offline mode
        if (!this.isOfflineMode) {
            this.clearInvalidSession();
        }
    }

    /**
     * Clears invalid session data
     */
    clearInvalidSession() {
        this.currentUser = null;
        this.isOfflineMode = false;
        localStorage.removeItem('uniconnect-user');
        this.updateUILoggedOut();
    }

    /**
     * Subscribes to auth state changes
     */
    subscribe(callback) {
        this.authStateSubscribers.push(callback);
        
        // Immediately call with current state (cached or null)
        if (this.currentUser !== undefined) {
            callback(this.currentUser);
        }
        
        // Return unsubscribe function
        return () => {
            this.authStateSubscribers = this.authStateSubscribers.filter(
                sub => sub !== callback
            );
        };
    }

    /**
     * Notifies all subscribers of auth state changes
     */
    notifySubscribers(user) {
        this.authStateSubscribers.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('❌ Error in auth state subscriber:', error);
            }
        });
    }

    /**
     * Gets current user data
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Checks if user is authenticated (cached or online)
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Checks if user email is verified
     */
    isEmailVerified() {
        return this.currentUser?.emailVerified || false;
    }

    /**
     * Checks if app is in offline mode
     */
    isOffline() {
        return this.isOfflineMode;
    }

    /**
     * Forces refresh of user data from Firestore
     */
    async refreshUserData() {
        if (!this.currentUser || this.isOfflineMode) {
            console.log('🌐 Offline mode: Cannot refresh user data');
            return this.currentUser;
        }

        try {
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                this.currentUser = {
                    ...this.currentUser,
                    ...userDoc.data()
                };
                
                // Update localStorage
                localStorage.setItem('uniconnect-user', JSON.stringify(this.currentUser));
                localStorage.setItem('uniconnect-last-auth', new Date().toISOString());
                
                // Reload user selections
                await this.loadUserSelections();
                
                // Notify subscribers
                this.notifySubscribers(this.currentUser);
                
                return this.currentUser;
            }
        } catch (error) {
            console.error('❌ Error refreshing user data:', error);
            // Stay in offline mode on error
            this.isOfflineMode = true;
        }
        
        return null;
    }

    /**
     * Updates UI for logged-in state
     */
    updateUILoggedIn(user) {
        // Update navigation
        this.updateNavigation(true, user);
        
        // Update user profile elements
        this.updateUserProfileElements(user);
        
        // Show authenticated content
        this.showAuthenticatedContent();
        
        // Update page title with user info
        document.title = `${user.displayName || 'User'} - UniConnect`;
        
        // Show offline indicator if applicable
        this.updateOfflineIndicator();
    }

    /**
     * Updates UI for logged-out state
     */
    updateUILoggedOut() {
        // Update navigation
        this.updateNavigation(false);
        
        // Clear user profile elements
        this.clearUserProfileElements();
        
        // Show unauthenticated content
        this.showUnauthenticatedContent();
        
        // Reset page title
        document.title = 'UniConnect - University Social Platform';
        
        // Hide offline indicator
        this.updateOfflineIndicator();
    }

    /**
     * Updates offline indicator
     */
    updateOfflineIndicator() {
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            if (this.isOfflineMode) {
                connectionStatus.innerHTML = '<i class="fas fa-wifi-slash mr-2"></i><span>Offline Mode</span>';
                connectionStatus.className = 'connection-status offline';
                connectionStatus.style.display = 'flex';
            } else {
                connectionStatus.style.display = 'none';
            }
        }
    }

    /**
     * Updates navigation based on auth state
     */
    updateNavigation(isLoggedIn, user = null) {
        // Show/hide login/logout buttons
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileBtn = document.getElementById('profileBtn');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');

        if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'block';
        if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
        if (profileBtn) profileBtn.style.display = isLoggedIn ? 'block' : 'none';

        // Update user info in navigation
        if (isLoggedIn && user) {
            if (userAvatar) {
                userAvatar.src = user.avatar || user.photoURL || this.getDefaultAvatar(user.displayName);
                userAvatar.alt = user.displayName;
            }
            if (userName) {
                userName.textContent = user.displayName || user.email.split('@')[0];
            }
        }
    }

    /**
     * Updates user profile elements across the app
     */
    updateUserProfileElements(user) {
        // Update all elements with data-user-field attributes
        const userFields = document.querySelectorAll('[data-user-field]');
        userFields.forEach(element => {
            const field = element.getAttribute('data-user-field');
            const value = user[field] || '';
            
            if (element.tagName === 'IMG') {
                element.src = value || this.getDefaultAvatar(user.displayName);
                element.alt = user.displayName;
            } else {
                element.textContent = value;
            }
        });

        // Update elements with specific IDs
        if (user.displayName) {
            const displayNameElements = document.querySelectorAll('.user-display-name, .user-name');
            displayNameElements.forEach(el => {
                el.textContent = user.displayName;
            });
        }

        if (user.email) {
            const emailElements = document.querySelectorAll('.user-email');
            emailElements.forEach(el => {
                el.textContent = user.email;
            });
        }
    }

    /**
     * Clears user profile elements
     */
    clearUserProfileElements() {
        // Clear all elements with data-user-field attributes
        const userFields = document.querySelectorAll('[data-user-field]');
        userFields.forEach(element => {
            if (element.tagName === 'IMG') {
                element.src = '/images/default-avatar.png';
                element.alt = 'User';
            } else {
                element.textContent = '';
            }
        });

        // Clear specific elements
        const displayNameElements = document.querySelectorAll('.user-display-name, .user-name');
        displayNameElements.forEach(el => {
            el.textContent = 'Guest';
        });

        const emailElements = document.querySelectorAll('.user-email');
        emailElements.forEach(el => {
            el.textContent = '';
        });
    }

    /**
     * Shows authenticated content areas
     */
    showAuthenticatedContent() {
        // Show authenticated-only sections
        const authSections = document.querySelectorAll('.auth-only, [data-auth-required]');
        authSections.forEach(section => {
            section.style.display = 'block';
        });

        // Hide unauthenticated sections
        const unauthSections = document.querySelectorAll('.unauth-only, [data-auth-hide]');
        unauthSections.forEach(section => {
            section.style.display = 'none';
        });
    }

    /**
     * Shows unauthenticated content areas
     */
    showUnauthenticatedContent() {
        // Hide authenticated-only sections
        const authSections = document.querySelectorAll('.auth-only, [data-auth-required]');
        authSections.forEach(section => {
            section.style.display = 'none';
        });

        // Show unauthenticated sections
        const unauthSections = document.querySelectorAll('.unauth-only, [data-auth-hide]');
        unauthSections.forEach(section => {
            section.style.display = 'block';
        });
    }

    /**
     * Shows network error message
     */
    showNetworkError() {
        this.showMessage('Network connection lost. Using offline mode.', 'warning');
        
        // Show offline indicator
        this.updateOfflineIndicator();
    }

    /**
     * Shows message to user
     */
    showMessage(message, type = 'info') {
        // Use existing app message system or create one
        if (window.uniConnectApp && typeof window.uniConnectApp.showMessage === 'function') {
            window.uniConnectApp.showMessage(message, type);
        } else {
            // Fallback message display
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Create temporary message element
            const messageEl = document.createElement('div');
            messageEl.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${type === 'error' ? 'bg-red-500 text-white' : type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'}`;
            messageEl.textContent = message;
            
            document.body.appendChild(messageEl);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 5000);
        }
    }

    /**
     * Get default avatar URL
     */
    getDefaultAvatar(name) {
        const colors = ['6366f1', 'ef4444', '10b981', 'f59e0b', '8b5cf6'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${randomColor}&color=fff&size=150&bold=true`;
    }

    /**
     * Manual sign out for user action
     */
    async manualSignOut() {
        try {
            // Clear offline mode
            this.isOfflineMode = false;
            
            // Sign out from Firebase
            await signOut(auth);
            
            // Handle sign out
            await this.handleUserSignedOut();
            
            console.log('✅ Manual sign out completed');
        } catch (error) {
            console.error('❌ Error during manual sign out:', error);
            // Still clear local session even if Firebase fails
            await this.handleUserSignedOut();
        }
    }

    /**
     * Attempt to reconnect to Firebase when back online
     */
    async attemptReconnect() {
        if (!this.isOfflineMode) return;
        
        console.log('🌐 Attempting to reconnect to Firebase...');
        
        try {
            // Force auth state check
            const user = auth.currentUser;
            if (user) {
                await this.handleFirebaseUserSignedIn(user);
                this.showMessage('Reconnected to server', 'success');
            }
        } catch (error) {
            console.log('🌐 Reconnect failed, staying in offline mode');
        }
    }

    /**
     * Clean up listener when needed
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.isListening = false;
            console.log('🔐 Auth State Listener destroyed');
        }
    }
}

// Initialize and export the auth listener
window.authListener = new AuthStateListener();

// Listen for online/offline events
window.addEventListener('online', () => {
    if (window.authListener) {
        window.authListener.attemptReconnect();
    }
});

// Export for module usage
export default window.authListener;