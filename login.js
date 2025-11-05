// login.js - User Login with Firebase Auth
console.log('🔐 Login script loaded');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDHHyGgsSV18BcXrGgzi4C8frzDAE1C1zo",
    authDomain: "uniconnect-ee95c.firebaseapp.com",
    projectId: "uniconnect-ee95c",
    storageBucket: "uniconnect-ee95c.firebasestorage.app",
    messagingSenderId: "1003264444309",
    appId: "1:1003264444309:web:9f0307516e44d21e97d89c"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const statusMessage = document.getElementById('statusMessage');
const guestLoginBtn = document.getElementById('guestLogin');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Login page loaded');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', handleGuestLogin);
    }
});

// Handle user login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showStatus('Please enter both email and password', 'error');
        return;
    }

    try {
        showStatus('Signing in...', 'info');
        
        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ User signed in:', user.uid);
        
        // Update user's last seen timestamp
        await updateUserLastSeen(user.uid);
        
        showStatus('Login successful! Redirecting...', 'success');
        
        // Redirect to profile page
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1500);

    } catch (error) {
        console.error('❌ Login error:', error);
        
        let errorMessage = 'Login failed. ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage += 'This account has been disabled.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showStatus(errorMessage, 'error');
    }
}

// Handle guest login (anonymous authentication)
async function handleGuestLogin() {
    try {
        showStatus('Creating guest account...', 'info');
        
        const userCredential = await auth.signInAnonymously();
        const user = userCredential.user;
        
        console.log('✅ Guest user signed in:', user.uid);
        
        // Create guest user document
        await createGuestUserDocument(user.uid);
        
        showStatus('Guest login successful! Redirecting...', 'success');
        
        // Redirect to profile page
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1500);

    } catch (error) {
        console.error('❌ Guest login error:', error);
        showStatus(`Guest login failed: ${error.message}`, 'error');
    }
}

// Create guest user document in Firestore
async function createGuestUserDocument(uid) {
    try {
        const userData = {
            displayName: 'Guest User',
            email: null,
            avatar: getDefaultAvatar('Guest User'),
            status: 'Online',
            statusType: 'online',
            streak: 1,
            unicoins: 50,
            level: 1,
            posts: 0,
            followers: 0,
            following: 0,
            isAnonymous: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: {
                theme: 'dark-theme',
                notifications: true
            }
        };

        await db.collection('users').doc(uid).set(userData, { merge: true });
        console.log('✅ Guest user document created');
        
    } catch (error) {
        console.error('❌ Error creating guest user document:', error);
    }
}

// Update user's last seen timestamp
async function updateUserLastSeen(uid) {
    try {
        await db.collection('users').doc(uid).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'Online',
            statusType: 'online'
        });
    } catch (error) {
        console.error('❌ Error updating last seen:', error);
    }
}

// Get default avatar
function getDefaultAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=150`;
}

// Show status messages
function showStatus(message, type = 'info') {
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 5000);
    }
}

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        console.log('ℹ️ User already logged in, redirecting to profile...');
        window.location.href = 'profile.html';
    }
});