// firebase-config.js
/**
 * Firebase Configuration Module
 * Only handles Firebase app initialization and service exports
 * No business logic - just setup and configuration
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

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// Session Cache Keys
const SESSION_CACHE_KEY = 'firebase_session_cache';
const CREDENTIALS_CACHE_KEY = 'firebase_credentials_cache';

// Cache user session data
const cacheUserSession = (user) => {
  if (!user) {
    localStorage.removeItem(SESSION_CACHE_KEY);
    return;
  }
  
  const sessionData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    lastLogin: Date.now(),
    // Add other relevant user data
  };
  
  localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessionData));
  console.log("User session cached");
};

// Get cached user session
const getCachedUserSession = () => {
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (!cached) return null;
    
    const sessionData = JSON.parse(cached);
    // Check if cache is still valid (e.g., less than 7 days old)
    const cacheAge = Date.now() - sessionData.lastLogin;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (cacheAge < maxAge) {
      console.log("Valid cached session found");
      return sessionData;
    } else {
      console.log("Cached session expired");
      localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error("Error reading cached session:", error);
    return null;
  }
};

// Store user credentials for "remember me" functionality
const storeUserCredentials = (email, password) => {
  try {
    const credentials = { email, password, timestamp: Date.now() };
    localStorage.setItem(CREDENTIALS_CACHE_KEY, JSON.stringify(credentials));
    console.log("User credentials stored");
  } catch (error) {
    console.error("Error storing credentials:", error);
  }
};

// Get stored credentials
const getStoredCredentials = () => {
  try {
    const stored = localStorage.getItem(CREDENTIALS_CACHE_KEY);
    if (!stored) return null;
    
    const credentials = JSON.parse(stored);
    // Check if credentials are still valid (e.g., less than 30 days old)
    const cacheAge = Date.now() - credentials.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (cacheAge < maxAge) {
      return credentials;
    } else {
      localStorage.removeItem(CREDENTIALS_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error("Error reading stored credentials:", error);
    return null;
  }
};

// Clear stored credentials and session
const clearUserCredentials = () => {
  localStorage.removeItem(CREDENTIALS_CACHE_KEY);
  localStorage.removeItem(SESSION_CACHE_KEY);
  console.log("Stored user credentials and session cleared");
};

// Background Firebase verification
const verifyUserInBackground = async () => {
  try {
    // Get stored credentials
    const credentials = getStoredCredentials();
    if (!credentials) {
      console.log("No stored credentials for background verification");
      return;
    }
    
    // Try to sign in with Firebase (this will fail if offline)
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      credentials.email, 
      credentials.password
    );
    
    // Update cache with fresh data
    cacheUserSession(userCredential.user);
    console.log("Background verification successful for:", credentials.email);
    
  } catch (error) {
    // Silently handle errors - user stays logged in with cached session
    if (error.code === 'auth/network-request-failed') {
      console.log("Background verification skipped (offline)");
    } else if (error.code === 'auth/invalid-credential') {
      console.log("Stored credentials invalid, clearing cache");
      clearUserCredentials();
    } else {
      console.log("Background verification error (non-critical):", error.code);
    }
  }
};

// Initialize auth with offline support
const initializeAuthPersistence = async () => {
  try {
    // Set persistence to LOCAL for offline support
    await setPersistence(auth, browserLocalPersistence);
    console.log("Firebase Auth persistence set to LOCAL");
    
    // Check for cached session immediately
    const cachedUser = getCachedUserSession();
    
    if (cachedUser) {
      console.log("Using cached user session for immediate UI display");
      
      // IMPORTANT: We don't wait for Firebase verification here
      // UI should show based on cached session immediately
      
      // Start background verification
      setTimeout(verifyUserInBackground, 1000);
    }
    
    return auth;
  } catch (error) {
    console.error("Error setting auth persistence:", error);
    
    // Fallback to inMemory persistence
    try {
      await setPersistence(auth, inMemoryPersistence);
      console.log("Fallback to inMemory persistence");
    } catch (fallbackError) {
      console.error("Failed to set any persistence:", fallbackError);
    }
    
    return auth;
  }
};

// Initialize Firestore offline persistence
const initializeFirestoreOfflinePersistence = () => {
  return enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore offline persistence enabled");
      return db;
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code === 'unimplemented') {
        console.warn("The current browser doesn't support offline persistence.");
      }
      return db;
    });
};

// Monitor auth state changes (background only)
const monitorAuthState = () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Firebase auth state: User authenticated", user.email);
      // Cache the fresh Firebase user data
      cacheUserSession(user);
      
      // Dispatch custom event for UI to update if needed
      document.dispatchEvent(new CustomEvent('firebase-auth-changed', {
        detail: { user, source: 'firebase' }
      }));
    } else {
      console.log("Firebase auth state: User signed out");
      // Clear cache when Firebase confirms sign out
      cacheUserSession(null);
      
      // Dispatch custom event for UI to update if needed
      document.dispatchEvent(new CustomEvent('firebase-auth-changed', {
        detail: { user: null, source: 'firebase' }
      }));
    }
  });
};

// Helper function for UI to check authentication state
const getCurrentAuthState = () => {
  // First check Firebase auth (if available online)
  const firebaseUser = auth.currentUser;
  
  if (firebaseUser) {
    return {
      user: firebaseUser,
      isOnline: true,
      source: 'firebase'
    };
  }
  
  // If no Firebase user, check cache
  const cachedUser = getCachedUserSession();
  
  if (cachedUser) {
    return {
      user: cachedUser,
      isOnline: false,
      source: 'cache'
    };
  }
  
  // No user at all
  return {
    user: null,
    isOnline: false,
    source: 'none'
  };
};

// Initialize all Firebase services with persistence
const initializeAllServices = async () => {
  try {
    // Initialize auth with persistence (non-blocking)
    const authPromise = initializeAuthPersistence();
    
    // Initialize Firestore offline persistence
    const firestorePromise = initializeFirestoreOfflinePersistence();
    
    // Wait for both
    await Promise.all([authPromise, firestorePromise]);
    
    // Start monitoring auth state in background
    monitorAuthState();
    
    console.log("Firebase services initialized with offline support");
    
    return { 
      app, 
      auth, 
      db, 
      storage, 
      realtimeDb,
      getCurrentAuthState,
      cacheUserSession,
      getCachedUserSession
    };
  } catch (error) {
    console.error("Error initializing Firebase services:", error);
    
    // Even if initialization fails, return services
    return { 
      app, 
      auth, 
      db, 
      storage, 
      realtimeDb,
      getCurrentAuthState,
      cacheUserSession,
      getCachedUserSession
    };
  }
};

// Initialize services (non-blocking - doesn't wait for completion)
const firebaseInitialized = initializeAllServices().catch(error => {
  console.error("Failed to initialize Firebase:", error);
  // Return services anyway for offline operation
  return { 
    app, 
    auth, 
    db, 
    storage, 
    realtimeDb,
    getCurrentAuthState,
    cacheUserSession,
    getCachedUserSession
  };
});

// Export services and utility functions
export { 
  app, 
  auth, 
  db, 
  storage, 
  realtimeDb,
  firebaseInitialized,
  storeUserCredentials,
  clearUserCredentials,
  getCurrentAuthState,
  cacheUserSession,
  getCachedUserSession
};

// Export default app
export default app;