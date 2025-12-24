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
  browserSessionPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { getDatabase, enableLogging } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// "Remember User" System - Auto login with stored credentials
const rememberUserSystem = () => {
  // Check if credentials are stored in localStorage
  const storedUser = localStorage.getItem('firebase_remembered_user');
  
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      
      // Only auto-login if credentials exist and are valid
      if (userData.email && userData.password) {
        console.log("Auto-login attempt with remembered user");
        
        return signInWithEmailAndPassword(auth, userData.email, userData.password)
          .then((userCredential) => {
            console.log("Auto-login successful for:", userData.email);
            return userCredential.user;
          })
          .catch((error) => {
            console.warn("Auto-login failed, clearing stored credentials:", error.code);
            // Clear invalid credentials
            localStorage.removeItem('firebase_remembered_user');
            return null;
          });
      }
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      localStorage.removeItem('firebase_remembered_user');
    }
  }
  return Promise.resolve(null);
};

// Store user credentials for "remember me" functionality
const storeUserCredentials = (email, password) => {
  const userData = { email, password };
  localStorage.setItem('firebase_remembered_user', JSON.stringify(userData));
  console.log("User credentials stored for auto-login");
};

// Clear stored credentials
const clearUserCredentials = () => {
  localStorage.removeItem('firebase_remembered_user');
  console.log("Stored user credentials cleared");
};

// Set auth persistence to LOCAL for offline support and cross-reload persistence
// This ensures auth state persists across page reloads, iframes, and offline mode
const initializeAuthPersistence = () => {
  // Use a promise to handle async persistence setting
  return setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Firebase Auth persistence set to LOCAL");
      
      // Try auto-login with remembered user after persistence is set
      return rememberUserSystem();
    })
    .then(() => {
      return auth;
    })
    .catch((error) => {
      console.error("Error setting auth persistence:", error);
      // Fallback to inMemoryPersistence if LOCAL fails (for iframe compatibility)
      return setPersistence(auth, inMemoryPersistence)
        .then(() => {
          console.log("Fallback to inMemory persistence");
          return auth;
        });
    });
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

// Monitor auth state changes
const monitorAuthState = () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User authenticated:", user.email);
      // User is signed in, Firestore/Realtime Database permissions will work automatically
      // Security Rules will handle authorization based on auth.uid
    } else {
      console.log("User signed out");
      // User is signed out
    }
  });
};

// Initialize all Firebase services with persistence
const initializeAllServices = async () => {
  try {
    // Initialize auth with persistence
    await initializeAuthPersistence();
    
    // Initialize Firestore offline persistence
    await initializeFirestoreOfflinePersistence();
    
    // Start monitoring auth state
    monitorAuthState();
    
    console.log("All Firebase services initialized with persistence");
    return { app, auth, db, storage, realtimeDb };
  } catch (error) {
    console.error("Error initializing Firebase services:", error);
    throw error;
  }
};

// Initialize services
const firebaseInitialized = initializeAllServices();

// Export services and utility functions
export { 
  app, 
  auth, 
  db, 
  storage, 
  realtimeDb,
  firebaseInitialized,
  storeUserCredentials,
  clearUserCredentials
};

// Export default app
export default app;