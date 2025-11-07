/**
 * UniConnect - Firebase Authentication Module
 * Handles user authentication with Firebase
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHHyGgsSV18BcXrGgzi4C8frzDAE1C1zo",
  authDomain: "uniconnect-ee95c.firebaseapp.com",
  projectId: "uniconnect-ee95c",
  storageBucket: "uniconnect-ee95c.firebasestorage.app",
  messagingSenderId: "1003264444309",
  appId: "1:1003264444309:web:9f0307516e44d21e97d89c"
};

class FirebaseAuthService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initializes Firebase authentication
     */
    async init() {
        try {
            // Update connection status
            this.updateConnectionStatus('connecting', 'Connecting to Firebase...');
            
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }
            
            console.log('🔥 Firebase SDK loaded, initializing app...');
            
            // Initialize Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Set Firestore settings
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });
            
            // Test connection with timeout
            await new Promise((resolve, reject) => {
                const unsubscribe = this.auth.onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                }, (error) => {
                    unsubscribe();
                    reject(error);
                });
                
                // Timeout after 8 seconds
                setTimeout(() => reject(new Error('Connection timeout')), 8000);
            });
            
            this.isInitialized = true;
            this.updateConnectionStatus('connected', 'Secure Connection Established');
            
            // Show security status
            this.showSecurityStatus(true);
            
            console.log('✅ Firebase initialized successfully!');
            console.log('📊 Project: uniconnect-ee95c');
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.updateConnectionStatus('disconnected', 'Connection Failed');
            this.showSecurityStatus(false);
            this.handleFirebaseError(error, 'Firebase initialization');
        }
    }

    /**
     * Enhanced Firebase error handling
     */
    handleFirebaseError(error, context = 'operation') {
        let userMessage = 'An unexpected error occurred';
        
        if (error.code) {
            switch (error.code) {
                // Authentication errors
                case 'auth/email-already-in-use':
                    userMessage = 'This email is already registered. Please try logging in.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'Password must be at least 6 characters. Please use a stronger password.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'The email address is not valid.';
                    break;
                case 'auth/operation-not-allowed':
                    userMessage = 'Email/password accounts are not enabled. Please contact support.';
                    break;
                case 'auth/network-request-failed':
                    userMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'auth/user-disabled':
                    userMessage = 'This account has been disabled. Please contact support.';
                    break;
                case 'auth/too-many-requests':
                    userMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/user-not-found':
                    userMessage = 'No account found with this email. Please register first.';
                    break;
                case 'auth/wrong-password':
                    userMessage = 'Incorrect password. Please try again.';
                    break;
                    
                // Firestore errors
                case 'permission-denied':
                    userMessage = 'You do not have permission to perform this action.';
                    break;
                case 'unavailable':
                    userMessage = 'Service is temporarily unavailable. Please try again later.';
                    break;
                case 'failed-precondition':
                    userMessage = 'Operation cannot be completed in the current state.';
                    break;
                case 'not-found':
                    userMessage = 'The requested resource was not found.';
                    break;
                    
                // Network and system errors
                case 'auth/internal-error':
                    userMessage = 'Internal server error. Please try again later.';
                    break;
                case 'auth/app-not-authorized':
                    userMessage = 'Application not authorized to use Firebase Authentication.';
                    break;
                case 'auth/unauthorized-domain':
                    userMessage = 'This domain is not authorized for login.';
                    break;
                    
                default:
                    userMessage = `Error during ${context}: ${error.message || 'Please try again'}`;
            }
        } else {
            userMessage = `Error during ${context}: ${error.message || 'Unknown error occurred'}`;
        }
        
        console.error(`❌ Firebase error in ${context}:`, error.code, error.message);
        
        // Show error to user if possible
        if (window.uniConnectApp && typeof window.uniConnectApp.showMessage === 'function') {
            window.uniConnectApp.showMessage(userMessage, 'error');
        }
        
        return userMessage;
    }

    /**
     * Shows security status with appropriate icons
     */
    showSecurityStatus(isConnected) {
        const securityStatus = document.getElementById('securityStatus');
        if (!securityStatus) return;
        
        securityStatus.classList.remove('hidden');
        
        if (isConnected) {
            securityStatus.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-check-circle text-green-400 text-lg"></i>
                        <div>
                            <span class="text-sm font-medium text-green-400">Secure Connection Established</span>
                            <p class="text-xs text-blue-300 mt-1">All data is encrypted and secure</p>
                        </div>
                    </div>
                    <div class="flex space-x-1">
                        <span class="security-badge">
                            <i class="fas fa-lock mr-1"></i> HTTPS
                        </span>
                        <span class="security-badge">
                            <i class="fas fa-shield-alt mr-1"></i> Encrypted
                        </span>
                    </div>
                </div>
            `;
        } else {
            securityStatus.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-times-circle text-red-400 text-lg"></i>
                        <div>
                            <span class="text-sm font-medium text-red-400">Connection Failed</span>
                            <p class="text-xs text-blue-300 mt-1">Please check your internet connection</p>
                        </div>
                    </div>
                    <div class="flex space-x-1">
                        <span class="security-badge" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #fca5a5;">
                            <i class="fas fa-unlock mr-1"></i> Offline
                        </span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Registers a new user with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {string} displayName - User's display name
     * @returns {Promise<Object>} - User credentials
     */
    async registerUser(email, password, displayName) {
        if (!this.isInitialized || !this.auth) {
            throw new Error('Firebase not initialized. Please try again.');
        }

        try {
            // Create user with email and password
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update user profile with display name
            await user.updateProfile({
                displayName: displayName
            });
            
            // Create comprehensive user document in Firestore
            const userDocRef = this.db.collection('users').doc(user.uid);
            await userDocRef.set({
                uid: user.uid,
                displayName: displayName,
                email: user.email,
                avatar: this.getDefaultAvatar(displayName),
                status: 'Online',
                statusType: 'online',
                streak: 1,
                unicoins: 100,
                level: 1,
                experience: 0,
                posts: 0,
                followers: 0,
                following: 0,
                isAnonymous: false,
                isGuest: false,
                authProvider: 'email',
                emailVerified: user.emailVerified,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    language: 'en'
                },
                gameStats: {
                    gamesPlayed: 0,
                    totalCoinsEarned: 0,
                    favoriteGame: null
                }
            });
            
            // Store user info in localStorage
            localStorage.setItem('uniconnect-user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                isNewUser: true
            }));
            
            console.log('✅ User registered successfully:', user.email);
            return userCredential;
            
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw new Error(this.handleFirebaseError(error, 'user registration'));
        }
    }

    /**
     * Logs in a user with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<Object>} - User credentials
     */
    async loginUser(email, password) {
        if (!this.isInitialized || !this.auth) {
            throw new Error('Firebase not initialized. Please try again.');
        }

        try {
            // Sign in user
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update last login timestamp and status in Firestore
            const userDocRef = this.db.collection('users').doc(user.uid);
            await userDocRef.update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'Online',
                statusType: 'online'
            });
            
            // Store user info in localStorage
            localStorage.setItem('uniconnect-user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                isNewUser: false
            }));
            
            console.log('✅ User logged in successfully:', user.email);
            return userCredential;
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw new Error(this.handleFirebaseError(error, 'user login'));
        }
    }

    /**
     * Signs out the current user
     * @returns {Promise<void>}
     */
    async signOut() {
        if (!this.isInitialized || !this.auth) {
            throw new Error('Firebase not initialized.');
        }

        try {
            // Update user status to offline before signing out
            const user = this.getCurrentUser();
            if (user && user.uid) {
                await this.db.collection('users').doc(user.uid).update({
                    status: 'Offline',
                    statusType: 'offline',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            await firebase.auth().signOut();
            
            // Remove user data from localStorage
            localStorage.removeItem('uniconnect-user');
            localStorage.removeItem('uniconnect-email');
            localStorage.removeItem('uniconnect-remember');
            
            console.log('✅ User signed out successfully');
            
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            throw new Error(this.handleFirebaseError(error, 'user sign out'));
        }
    }

    /**
     * Gets the current authenticated user
     * @returns {Object|null} - The current user or null if not authenticated
     */
    getCurrentUser() {
        if (!this.isInitialized || !this.auth) {
            return null;
        }

        try {
            // Check Firebase auth first
            const firebaseUser = this.auth.currentUser;
            if (firebaseUser) {
                return {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    emailVerified: firebaseUser.emailVerified,
                    isNewUser: false
                };
            }
            
            // Fallback to localStorage
            const userData = localStorage.getItem('uniconnect-user');
            return userData ? JSON.parse(userData) : null;
            
        } catch (error) {
            console.error('❌ Error getting current user:', error);
            return null;
        }
    }

    /**
     * Checks if user is authenticated
     * @returns {boolean} - True if user is authenticated
     */
    isAuthenticated() {
        const user = this.getCurrentUser();
        return user !== null;
    }

    /**
     * Updates the connection status display
     * @param {string} status - The connection status (connected, connecting, disconnected)
     * @param {string} message - The status message to display
     */
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        const textElement = document.getElementById('connectionText');
        
        if (statusElement && textElement) {
            statusElement.className = `connection-status ${status}`;
            
            // Update icon and text based on status
            if (status === 'connected') {
                statusElement.innerHTML = '<i class="fas fa-check-circle mr-2"></i><span id="connectionText">' + message + '</span>';
            } else if (status === 'connecting') {
                statusElement.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i><span id="connectionText">' + message + '</span>';
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle mr-2"></i><span id="connectionText">' + message + '</span>';
            }
        }
    }

    /**
     * Sends password reset email
     * @param {string} email - User's email
     * @returns {Promise<void>}
     */
    async sendPasswordResetEmail(email) {
        if (!this.isInitialized || !this.auth) {
            throw new Error('Firebase not initialized.');
        }

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            
            console.log('✅ Password reset email sent successfully');
            
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            throw new Error(this.handleFirebaseError(error, 'send password reset'));
        }
    }

    /**
     * Get default avatar URL
     */
    getDefaultAvatar(name) {
        const colors = ['6366f1', 'ef4444', '10b981', 'f59e0b', '8b5cf6'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${randomColor}&color=fff&size=150&bold=true`;
    }
}

// Initialize Firebase Auth Service
window.firebaseAuth = new FirebaseAuthService();

// Make Firebase available globally for debugging
window.getFirebaseAuth = () => window.firebaseAuth;