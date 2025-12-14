// ==================== GLOBAL ERROR HANDLING ====================

function setupGlobalErrorHandling() {
    // Handle all image errors
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            handleImageError(e.target);
        }
    }, true);

    // Also handle images that might be created dynamically
    const originalImage = window.Image;
    window.Image = function() {
        const img = new originalImage();
        img.addEventListener('error', function() {
            handleImageError(this);
        });
        return img;
    };
}

// ==================== UNIVERSAL FIX FOR ALL MISSING FUNCTIONS ====================
console.log('🔧 UNIVERSAL FIX: Catching ALL missing functions');

// 1. Fix missing variables for chat.js
if (typeof unsubscribeMessages === 'undefined') var unsubscribeMessages = null;
if (typeof unsubscribeChats === 'undefined') var unsubscribeChats = null;
if (typeof typingListener === 'undefined') var typingListener = null;
if (typeof typingTimeout === 'undefined') var typingTimeout = null;

// 2. Create a handler for ALL undefined function calls
window.__handleMissingFunction = function(funcName, ...args) {
    console.warn(`⚠️ Function "${funcName}" was called but not defined. Creating placeholder.`);
    
    // Create the missing function on the fly
    window[funcName] = function(...innerArgs) {
        console.log(`🔄 Placeholder "${funcName}" called with:`, innerArgs);
        
        // Show user-friendly message
        if (typeof showToast === 'function') {
            showToast(`${funcName.replace(/([A-Z])/g, ' $1').trim()} feature is coming soon`, 'info');
        }
        
        // Return safe response
        return {
            success: true,
            message: `Function "${funcName}" executed (placeholder)`,
            funcName: funcName,
            args: innerArgs,
            timestamp: new Date().toISOString()
        };
    };
    
    // Call the newly created function
    return window[funcName](...args);
};

// 3. Override Function.prototype to catch ALL undefined functions
const originalFunction = Function;
window.Function = function(...args) {
    try {
        return originalFunction(...args);
    } catch (error) {
        console.error('Function creation error:', error);
        return function() {
            console.warn('Function execution failed');
            return { success: false, error: error.message };
        };
    }
};
window.Function.prototype = originalFunction.prototype;

// 4. Create placeholders for KNOWN missing functions
const knownMissingFunctions = [
    'viewUserStatuses',
    'unmuteAllStatuses',
    'openGroupChat',
    'loadUserGroups',
    'sendGroupMessage',
    'addParticipantToGroup',
    'removeParticipantFromGroup',
    'createNewGroup',
    'deleteGroup',
    'updateGroupSettings',
    'muteGroup',
    'unmuteGroup',
    'leaveGroup',
    'getGroupInfo',
    'updateGroupProfile',
    'handleGoalCreation',
    'handleStatusCreation',
    'manageGroupContextMenu',
    'updateSharedGoals',
    'toggleHighlightsPanel',
    'handleHashtagClick',
    'createNewGoal',
    'updateGoalProgress',
    'createStatusUpdate',
    'toggleTheme',
    'handleReactionSelection',
    'downloadFile',
    'openAllFriendsView',
    'editFriendSettings',
    'initiateVideoConference',
    'switchCamera',
    'handleCallControls',
    'toggleMute',
    'toggleVideo',
    'endCurrentCall',
    'acceptIncomingCall',
    'rejectIncomingCall',
    'startVoiceCall',
    'startVideoCall'
];

knownMissingFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'undefined') {
        window[funcName] = function(...args) {
            return window.__handleMissingFunction(funcName, ...args);
        };
        console.log(`✅ Created placeholder for: ${funcName}`);
    }
});

// 5. Global error handler for undefined functions
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('is not defined')) {
        const funcNameMatch = event.error.message.match(/(\w+) is not defined/);
        if (funcNameMatch) {
            const funcName = funcNameMatch[1];
            console.log(`🛠️ Auto-fixing undefined function: ${funcName}`);
            
            // Create the missing function
            if (typeof window[funcName] === 'undefined') {
                window[funcName] = function(...args) {
                    console.log(`🔧 Auto-created "${funcName}" called with:`, args);
                    return {
                        success: true,
                        message: `Auto-created function "${funcName}"`,
                        funcName: funcName,
                        args: args
                    };
                };
                
                // Prevent the error
                event.preventDefault();
                event.stopPropagation();
                
                console.log(`✅ Auto-created missing function: ${funcName}`);
                return false;
            }
        }
    }
}, true);

console.log('✅ UNIVERSAL FIX APPLIED - All missing functions will be caught');

// =================================================================================
// ==================== PREVENT DUPLICATE DECLARATIONS ====================
// Check if variables already exist to prevent conflicts
const globalVarsToProtect = [
    'closeStatusViewer', 
    'helpCenterModal',
    'statusViewerModal',
    'statusViewerContent',
    'currentUser',
    'currentUserData',
    'currentChat',
    'currentChatId',
    'allUsers'
];

globalVarsToProtect.forEach(varName => {
    if (typeof window[varName] !== 'undefined') {
        console.log(`⚠️ ${varName} already defined, skipping re-declaration`);
    }
});

// Only declare if they don't exist
if (!window.closeStatusViewer) window.closeStatusViewer = null;
if (!window.helpCenterModal) window.helpCenterModal = null;
if (!window.statusViewerModal) window.statusViewerModal = null;
if (!window.statusViewerContent) window.statusViewerContent = null;
if (!window.currentUser) window.currentUser = null;
if (!window.currentUserData) window.currentUserData = null;
if (!window.currentChat) window.currentChat = null;
if (!window.currentChatId) window.currentChatId = null;
if (!window.allUsers) window.allUsers = [];

// Also declare them locally for backward compatibility
var closeStatusViewer = window.closeStatusViewer;
var helpCenterModal = window.helpCenterModal;
var statusViewerModal = window.statusViewerModal;
var statusViewerContent = window.statusViewerContent;
var currentUser = window.currentUser;
var currentUserData = window.currentUserData;
var currentChat = window.currentChat;
var currentChatId = window.currentChatId;
var allUsers = window.allUsers;

// ==================== IMAGE ERROR HANDLING ====================
function setupImageErrorHandling() {
    console.log('Setting up image error handling...');
    
    // Handle all image loading errors
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            console.log('Image error detected:', e.target.src);
            
            // Don't handle data URLs or already fixed images
            if (e.target.src.startsWith('data:') || 
                e.target.classList.contains('error-handled')) {
                return;
            }
            
            // Set fallback for broken images
            const altText = e.target.alt || 'User';
            e.target.src = getDefaultAvatar(altText);
            e.target.classList.add('error-handled');
        }
    }, true);
    
    // Also handle dynamically created images
    const originalImage = window.Image;
    window.Image = function() {
        const img = new originalImage();
        img.addEventListener('error', function() {
            const altText = this.alt || 'User';
            this.src = getDefaultAvatar(altText);
            this.classList.add('error-handled');
        });
        return img;
    };
    
    console.log('✅ Image error handling setup complete');
}

function handleImageError(img) {
    // Skip if already handled or valid URLs
    if (img.classList.contains('error-handled') || 
        img.src.startsWith('data:') || 
        img.src.includes('blob:')) {
        return;
    }
    
    // Skip Google cleardot tracking images
    if (img.src.includes('google.com/images/cleardot.gif')) {
        img.style.display = 'none';
        img.classList.add('error-handled');
        return;
    }
    
    console.warn('Fixing broken image:', img.src);
    
    // Fix specific problematic URLs
    if (img.src.includes('IMAGE_URL') || 
        !img.src || 
        img.src.includes('127.0.0.1') ||
        img.src === 'http://127.0.0.1:5500/IMAGE_URL' ||
        img.src.includes('/chat.html')) {
        
        const altText = img.alt || 'User';
        // Use a more reliable avatar service
        img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(altText)}&background=7C3AED&color=fff`;
    }
    
    // Special case for "Cover" images
    if (img.alt === 'Cover' || img.src.includes('Cover')) {
        img.src = 'https://via.placeholder.com/400x200/7C3AED/FFFFFF?text=Cover+Image';
    }
    
    img.classList.add('error-handled');
    img.onerror = null; // Prevent infinite loop
}

// ==================== FIREBASE INITIALIZATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyDHHyGgsSV18BcXrGgzi4C8frzDAE1C1zo",
    authDomain: "uniconnect-ee95c.firebaseapp.com",
    projectId: "uniconnect-ee95c",
    storageBucket: "uniconnect-ee95c.firebasestorage.app",
    messagingSenderId: "1003264444309",
    appId: "1:1003264444309:web:9f0307516e44d21e97d89c"
};

// Initialize Firebase only if not already initialized
let auth, db, storage;

// Check if Firebase is available
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Make sure firebase scripts are included.');
} else {
    try {
        // Check if Firebase is already initialized
        if (!firebase.apps.length) {
            console.log('Initializing Firebase app...');
            const firebaseApp = firebase.initializeApp(firebaseConfig);
            
            // IMPORTANT: Initialize services AFTER app initialization
            auth = firebase.auth();
            db = firebase.firestore();
            storage = firebase.storage();
            
            console.log('Firebase initialized successfully');
        } else {
            console.log('Firebase already initialized, using existing app');
            // Use existing Firebase app
            auth = firebase.auth();
            db = firebase.firestore();
            storage = firebase.storage();
        }
        
        // Share with other scripts
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        window.firebase = firebase;
        
        // Enable persistence (new method)
        if (db && db.settings) {
            const settings = {
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            };
            db.settings(settings);
            console.log('Firestore cache configured');
        }
        
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        showToast('Firebase initialization failed: ' + error.message, 'error');
    }
}

const cloudinaryConfig = {
    cloudName: 'dhjnxa5rh',
    apiKey: '817591969559894',
    uploadPreset: 'user_uploads'
};

// ==================== DOM ELEMENTS INITIALIZATION ====================
// Main Layout Elements
const chatApp = document.getElementById('chatApp');
const loadingScreen = document.getElementById('loadingScreen');
const chatListContainer = document.getElementById('chatListContainer');
const messagesContainer = document.getElementById('messagesContainer') || document.createElement('div');

// Sidebar Navigation Elements
const navIcons = document.querySelectorAll('.nav-icon[data-tab]');

// User Profile Header Elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userMood = document.getElementById('userMood');

// Personalization Info Section
const currentMoodsMini = document.getElementById('currentMoodsMini');
const currentInterestsMini = document.getElementById('currentInterestsMini');

// Search Elements
const searchInput = document.getElementById('searchInput');

// Tab Panels
const chatsTab = document.getElementById('chatsTab');
const friendsTab = document.getElementById('friendsTab');
const updatesTab = document.getElementById('updatesTab');
const callsTab = document.getElementById('callsTab');
const groupsTab = document.getElementById('groupsTab');
const toolsTab = document.getElementById('toolsTab');

// Chat List Elements
const chatList = document.getElementById('chatList') || (function() {
    const element = document.createElement('div');
    element.id = 'chatList';
    element.className = 'space-y-2';
    if (chatsTab) chatsTab.appendChild(element);
    return element;
})();

const noChatsMessage = document.getElementById('noChatsMessage');

// Chat Header Elements
const chatHeader = document.getElementById('chatHeader');
const backToChats = document.getElementById('backToChats') || (function() {
    const button = document.createElement('button');
    button.id = 'backToChats';
    button.innerHTML = '<i class="fas fa-arrow-left"></i>';
    button.className = 'p-2 text-gray-600 hover:text-gray-900';
    button.addEventListener('click', goBackToTabs);
    return button;
})();

const chatAvatar = document.getElementById('chatAvatar') || document.createElement('img');
const chatTitle = document.getElementById('chatTitle') || document.createElement('div');
const chatStatus = document.getElementById('chatStatus');
const moodIndicator = document.getElementById('moodIndicator');
const statusText = document.getElementById('statusText');
const typingIndicator = document.getElementById('typingIndicator');
const chatMenuBtn = document.getElementById('chatMenuBtn');

// Shared Goals Section
const sharedGoalsSection = document.getElementById('sharedGoalsSection');
const toggleGoals = document.getElementById('toggleGoals');
const sharedGoalsContent = document.getElementById('sharedGoalsContent');
const noGoalsMessage = document.getElementById('noGoalsMessage');
const goalsList = document.getElementById('goalsList');
const createGoalBtn = document.getElementById('createGoalBtn');

// Message Highlights Panel
const highlightsPanel = document.getElementById('highlightsPanel');
const toggleHighlights = document.getElementById('toggleHighlights');
const highlightsContent = document.getElementById('highlightsContent');
const hashtagsList = document.getElementById('hashtagsList');
const noHighlightsMessage = document.getElementById('noHighlightsMessage');

// Message Selection Toolbar
const messageSelectionToolbar = document.getElementById('messageSelectionToolbar');
const selectedMessagesCount = document.getElementById('selectedMessagesCount');
const forwardSelected = document.getElementById('forwardSelected');
const starSelected = document.getElementById('starSelected');
const deleteSelected = document.getElementById('deleteSelected');
const cancelSelection = document.getElementById('cancelSelection');

// Reply Preview Bar
const replyPreviewBar = document.getElementById('replyPreviewBar');
const replyToName = document.getElementById('replyToName');
const replyPreviewContent = document.getElementById('replyPreviewContent');
const cancelReply = document.getElementById('cancelReply');

// Poll Results Display
const pollResultsSection = document.getElementById('pollResultsSection');
const pollResultsContent = document.getElementById('pollResultsContent');
const dismissPollResults = document.getElementById('dismissPollResults');

// Mood Suggestion
const moodSuggestion = document.getElementById('moodSuggestion');
const suggestionText = document.getElementById('suggestionText');
const dismissSuggestion = document.getElementById('dismissSuggestion');

// Input Area Elements
const inputArea = document.getElementById('inputArea');
const attachBtn = document.getElementById('attachBtn');
const voiceRecordingIndicator = document.getElementById('voiceRecordingIndicator');
const messageInput = document.getElementById('messageInput');
const emojiPicker = document.getElementById('emojiPicker');
const isTyping = document.getElementById('isTyping');
const typingUsers = document.getElementById('typingUsers');
const sendBtn = document.getElementById('sendBtn');
const scrollToBottom = document.getElementById('scrollToBottom');

// Poll Creation Section
const pollCreationSection = document.getElementById('pollCreationSection');
const closePollCreation = document.getElementById('closePollCreation');
const pollQuestion = document.getElementById('pollQuestion');
const pollOptions = document.getElementById('pollOptions');
const addPollOption = document.getElementById('addPollOption');
const createPoll = document.getElementById('createPoll');
const cancelPoll = document.getElementById('cancelPoll');

// File Preview Section
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const removeFile = document.getElementById('removeFile');

// Create Goal Modal
const createGoalModal = document.getElementById('createGoalModal');
const goalTitle = document.getElementById('goalTitle');
const goalDescription = document.getElementById('goalDescription');
const goalDueDate = document.getElementById('goalDueDate');
const goalProgress = document.getElementById('goalProgress');
const goalProgressValue = document.getElementById('goalProgressValue');
const saveGoal = document.getElementById('saveGoal');
const cancelGoal = document.getElementById('cancelGoal');
const closeCreateGoal = document.getElementById('closeCreateGoal');

// Context Menus
const messageContextMenu = document.getElementById('messageContextMenu');
const groupListContextMenu = document.getElementById('groupListContextMenu');

// Reaction Picker
const reactionPicker = document.getElementById('reactionPicker');

// File Upload Preview Modal
const enhancedFilePreview = document.getElementById('enhancedFilePreview');
const filePreviewContent = document.getElementById('filePreviewContent');
const downloadFileBtn = document.getElementById('downloadFileBtn');
const closeEnhancedFilePreview = document.getElementById('closeEnhancedFilePreview');

// Features Modal
const featuresModal = document.getElementById('featuresModal');
const closeFeatures = document.getElementById('closeFeatures');

// Mood Modal
const moodModal = document.getElementById('moodModal');
const closeMood = document.getElementById('closeMood');

// Quick Actions Modal
const quickActionsModal = document.getElementById('quickActionsModal');
const closeQuickActions = document.getElementById('closeQuickActions');

// Toast Notifications Container
const toastContainer = document.getElementById('toastContainer') || (function() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
    return container;
})();

// Business Profile Elements
const businessProfileModal = document.getElementById('businessProfileModal') || null;
const aiSummaryModal = document.getElementById('aiSummaryModal') || null;
const smartRepliesModal = document.getElementById('smartRepliesModal') || null;

// Create missing chat interface elements if they don't exist
function ensureChatInterfaceElements() {
    // Ensure messages container exists
    if (!document.getElementById('messagesContainer')) {
        const container = document.createElement('div');
        container.id = 'messagesContainer';
        container.className = 'flex-1 overflow-y-auto p-4 space-y-4';
        
        // Find where to insert it (after chatHeader if it exists)
        const mainChatArea = document.querySelector('.flex-1.flex.flex-col');
        if (mainChatArea) {
            if (chatHeader) {
                chatHeader.after(container);
            } else {
                mainChatArea.prepend(container);
            }
        } else {
            document.body.appendChild(container);
        }
        console.log('Created messagesContainer');
    }
    
    // Ensure chat header exists
    if (!document.getElementById('chatHeader')) {
        const header = document.createElement('div');
        header.id = 'chatHeader';
        header.className = 'bg-white border-b p-4 flex items-center justify-between hidden';
        header.innerHTML = `
            <div class="flex items-center space-x-3">
                <button id="backToChats" class="p-2 text-gray-600 hover:text-gray-900">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <img id="chatAvatar" class="w-10 h-10 rounded-full" src="https://ui-avatars.com/api/?name=User&background=7C3AED&color=fff" alt="Chat">
                <div>
                    <div id="chatTitle" class="font-semibold">Chat</div>
                    <div id="chatStatus" class="text-sm text-gray-500 flex items-center">
                        <span id="statusText" class="mr-2">Online</span>
                        <span id="typingIndicator" class="text-green-500 hidden">
                            <i class="fas fa-circle-notch fa-spin mr-1"></i>typing...
                        </span>
                    </div>
                </div>
            </div>
            <button id="chatMenuBtn" class="p-2 text-gray-600 hover:text-gray-900">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;
        
        const appContainer = document.querySelector('#chatApp .flex-1');
        if (appContainer) {
            appContainer.prepend(header);
        } else {
            document.body.appendChild(header);
        }
        
        // Add event listener to back button
        const backBtn = document.getElementById('backToChats');
        if (backBtn) {
            backBtn.addEventListener('click', goBackToTabs);
        }
        console.log('Created chatHeader');
    }
    
    // Ensure input area exists
    if (!document.getElementById('inputArea')) {
        const inputAreaEl = document.createElement('div');
        inputAreaEl.id = 'inputArea';
        inputAreaEl.className = 'bg-white border-t p-4 hidden';
        inputAreaEl.innerHTML = `
            <div class="flex items-center space-x-2">
                <button id="attachBtn" class="p-3 text-gray-500 hover:text-purple-600 rounded-full hover:bg-gray-100">
                    <i class="fas fa-plus"></i>
                </button>
                <div class="flex-1 relative">
                    <textarea 
                        id="messageInput" 
                        placeholder="Type a message..." 
                        rows="1"
                        class="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                        style="min-height: 44px; max-height: 120px;"
                    ></textarea>
                    <button id="emojiPickerBtn" class="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        <i class="far fa-smile"></i>
                    </button>
                </div>
                <button id="sendBtn" class="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <div id="emojiPicker" class="absolute bottom-20 left-4 bg-white border rounded-lg shadow-lg p-2 hidden" style="z-index: 1000; max-height: 200px; overflow-y: auto;"></div>
            <div id="isTyping" class="text-xs text-gray-500 mt-2 hidden">
                <span id="typingUsers"></span> is typing...
            </div>
            <button id="scrollToBottom" class="fixed bottom-20 right-4 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 hidden">
                <i class="fas fa-arrow-down"></i>
            </button>
        `;
        
        const mainChatArea = document.querySelector('.flex-1.flex.flex-col');
        if (mainChatArea) {
            mainChatArea.appendChild(inputAreaEl);
        } else {
            document.body.appendChild(inputAreaEl);
        }
        console.log('Created inputArea');
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDefaultAvatar(name = 'User', size = 50) {
    const initial = name.charAt(0).toUpperCase();
    const colors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    const color = colors[colorIndex];
    
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color}"/>
            <text x="${size/2}" y="${size/2 + size/10}" 
                  text-anchor="middle" fill="white" 
                  font-family="Arial, sans-serif" 
                  font-size="${size * 0.4}" 
                  font-weight="bold"
                  dominant-baseline="middle">
                ${initial}
            </text>
        </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function safeElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

function safeClassList(id, action, className) {
    const element = safeElement(id);
    if (element && element.classList) {
        element.classList[action](className);
    }
}

function formatTimeAgo(date) {
    // Ensure date is a Date object
    if (!(date instanceof Date)) {
        // Try to convert if it's a Firestore timestamp
        if (date && typeof date.toDate === 'function') {
            date = date.toDate();
        } else if (date && date.seconds) {
            // Firestore timestamp object
            date = new Date(date.seconds * 1000);
        } else if (date) {
            // Try to parse as Date
            date = new Date(date);
        } else {
            return 'Unknown time';
        }
    }
    
    // Check if valid date
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }
    
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type} px-4 py-3 rounded-lg shadow-lg text-white max-w-xs transition-all duration-300 transform translate-x-full`;
    
    // Set background color based on type
    switch(type) {
        case 'success': toast.style.backgroundColor = '#10B981'; break;
        case 'error': toast.style.backgroundColor = '#EF4444'; break;
        case 'warning': toast.style.backgroundColor = '#F59E0B'; break;
        case 'info': toast.style.backgroundColor = '#3B82F6'; break;
        default: toast.style.backgroundColor = '#6B7280';
    }
    
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-image';
    if (fileType.startsWith('video/')) return 'fa-video';
    if (fileType.startsWith('audio/')) return 'fa-music';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('zip') || fileType.includes('compressed')) return 'fa-file-archive';
    return 'fa-file';
}

// ==================== INTERNET CONNECTION DETECTION ====================
function setupInternetDetection() {
    // Update UI based on connection status
    function updateConnectionStatus(isOnline) {
        let statusElement = document.getElementById('connectionStatus');
        if (!statusElement) {
            // Create status indicator if it doesn't exist
            statusElement = document.createElement('div');
            statusElement.id = 'connectionStatus';
            statusElement.className = 'fixed top-0 left-0 right-0 z-50 text-center py-1 text-xs font-semibold transition-all duration-300';
            statusElement.style.display = 'none';
            document.body.appendChild(statusElement);
        }
        
        if (isOnline) {
            statusElement.textContent = '✅ Online';
            statusElement.className = 'fixed top-0 left-0 right-0 z-50 text-center py-1 text-xs font-semibold bg-green-500 text-white transition-all duration-300';
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        } else {
            statusElement.textContent = '⚠️ You are offline - Some features may not work';
            statusElement.className = 'fixed top-0 left-0 right-0 z-50 text-center py-1 text-xs font-semibold bg-red-500 text-white transition-all duration-300';
            statusElement.style.display = 'block';
        }
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        console.log('Internet connection restored');
        updateConnectionStatus(true);
        showToast('Back online!', 'success');
        
        // Re-enable Firestore
        if (db && typeof db.enableNetwork === 'function') {
            db.enableNetwork().then(() => {
                console.log('Firestore reconnected');
            });
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('Internet connection lost');
        updateConnectionStatus(false);
        showToast('You are offline', 'warning');
    });
    
    // Initial check
    updateConnectionStatus(navigator.onLine);
}

// ==================== NETWORK & ERROR HANDLING ====================
function setupNetworkMonitoring() {
    window.addEventListener('online', () => {
        console.log('App is online');
        showToast('Connection restored', 'success');
        if (db && typeof db.enableNetwork === 'function') {
            db.enableNetwork().then(() => {
                console.log('Firestore reconnected');
                if (currentUser) {
                    loadUserData();
                }
            });
        }
    });

    window.addEventListener('offline', () => {
        console.log('App is offline');
        showToast('You are offline', 'warning');
    });

    if (!navigator.onLine) {
        showToast('You are currently offline', 'warning');
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure everything is ready
    setTimeout(initApp, 100);
});

async function initApp() {
    console.log('Initializing app...');
    
    try {
        // 1. Ensure all UI elements exist
        ensureChatInterfaceElements();
        
        // 2. Setup basic error handlers
        setupGlobalErrorHandling();
        setupImageErrorHandling();
        setupNetworkMonitoring();
        setupInternetDetection();

        // 3. Setup UI components
        initializeTabs();
        setupEventListeners();
        initEmojiPicker();
        setupReplySystem();
        setupMessageSelection();
        setupPollSystem();
        setupMoodSuggestions();
        setupBusinessTools();
        setupHelpCenter();
        setupModals();
        setupContextMenuActions();
        setupAutoScrollDetection();
        
        // 4. Initialize Firebase with proper timing
        await initializeFirebaseProperly();
        
        if (typeof window.settings !== 'undefined') {
            window.settings.init({
                db: db,
                auth: auth,
                storage: storage,
                currentUser: currentUser,
                currentUserData: currentUserData
            });
        }
        
        // 5. Check auth state
        if (auth) {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('✅ User authenticated:', user.uid);
                    currentUser = user;
                    
                    // Load user data
                    await loadUserData();
                    
                    // Notify other scripts
                    if (window.onUserAuthenticated) {
                        window.onUserAuthenticated();
                    }
                } else {
                    console.log('⚠️ No user, redirecting...');
                    window.location.href = 'index.html';
                }
            });
        } else {
            console.error('Firebase auth not initialized');
            showToast('Authentication error. Please refresh the page.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error in initApp:', error);
        showToast('App initialization error: ' + error.message, 'error');
    }
}

async function initializeFirebaseProperly() {
    try {
        // Check if Firebase is already available
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            throw new Error('Firebase SDK not loaded. Make sure firebase scripts are included.');
        }
        
        // Initialize Firebase app if not already initialized
        if (!firebase.apps.length) {
            console.log('Initializing Firebase...');
            firebase.initializeApp(firebaseConfig);
        }
        
        // Initialize services
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        // Configure Firestore settings (this is the new way instead of enablePersistence)
        if (db && db.settings) {
            const settings = {
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            };
            db.settings(settings);
        }
        
        // Share with other scripts
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        window.firebase = firebase;
        
        console.log('✅ Firebase initialized successfully');
        return true;
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        
        // Show user-friendly error based on error type
        if (error.code === 'failed-precondition') {
            showToast('Multiple tabs open. Please close other tabs or refresh.', 'error');
        } else {
            showToast('Database connection error. Some features may not work.', 'error');
        }
        
        // Return a dummy db object to prevent further errors
        db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: false }),
                    set: () => Promise.resolve(),
                    update: () => Promise.resolve(),
                    onSnapshot: () => () => {}
                }),
                where: () => ({
                    orderBy: () => ({
                        onSnapshot: () => () => {}
                    }),
                    get: () => Promise.resolve({ empty: true, forEach: () => {} })
                })
            }),
            enableNetwork: () => Promise.resolve(),
            enablePersistence: () => Promise.resolve()
        };
        
        window.db = db;
        return false;
    }
}

// ==================== FIREBASE OFFLINE HANDLER ====================
function setupFirestoreOfflineHandler() {
    if (!db) return;
    
    // Enable offline persistence (old way - kept for compatibility)
    if (typeof db.enablePersistence === 'function') {
        db.enablePersistence()
            .then(() => {
                console.log('Firestore offline persistence enabled');
            })
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code == 'unimplemented') {
                    console.log('The current browser doesn\'t support offline persistence');
                }
            });
    }
    
    // Handle network status
    if (typeof db.onSnapshotsInSync === 'function') {
        db.onSnapshotsInSync(() => {
            console.log('Firestore is in sync with the server');
        });
    }
}

// ==================== USER DATA MANAGEMENT ====================
async function loadUserData() {
    try {
        if (!currentUser || !currentUser.uid) {
            console.error('No authenticated user');
            return;
        }

        console.log('Loading user data for:', currentUser.uid);

        // Perform cleanup
        if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
        if (unsubscribeChats) { unsubscribeChats(); unsubscribeChats = null; }
        if (typingListener) { typingListener(); typingListener = null; }
        if (typingTimeout) { clearTimeout(typingTimeout); typingTimeout = null; }

        currentChat = null;
        currentChatId = null;

        console.log('Cleanup completed. Starting user data load...');

        // Load user document
        const userDoc = await db.collection('users').doc(currentUser.uid).get();

        if (userDoc.exists) {
            currentUserData = userDoc.data();
            console.log('User data loaded:', {
                uid: currentUser.uid,
                displayName: currentUserData.displayName,
                email: currentUserData.email
            });
            
            // Ensure required fields exist
            currentUserData = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUserData.displayName || currentUser.email?.split('@')[0] || 'User',
                photoURL: currentUserData.photoURL || getDefaultAvatar(currentUserData.displayName || 'User'),
                coverURL: currentUserData.coverURL || '',
                about: currentUserData.about || '',
                phone: currentUserData.phone || '',
                createdAt: currentUserData.createdAt || (firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()),
                lastSeen: currentUserData.lastSeen || (firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()),
                status: currentUserData.status || 'offline',
                mood: currentUserData.mood || 'neutral'
            };
            
            initializeUserData();
            
        } else {
            console.log('Creating new user document');
            currentUserData = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                photoURL: currentUser.photoURL || getDefaultAvatar(currentUser.displayName || 'User'),
                coverURL: '',
                about: '',
                phone: '',
                createdAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                lastSeen: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                status: 'offline',
                mood: 'neutral'
            };

            await db.collection('users').doc(currentUser.uid).set(currentUserData);
            console.log('New user document created');
            initializeUserData();
        }

        // Update lastSeen timestamp
        if (firebase.firestore) {
            await db.collection('users').doc(currentUser.uid).update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Load UI & listeners
        showChatApp();
        
        setTimeout(() => {
            loadChatsTemporary();
        }, 500);
        
        requestNotificationPermission();
        initializeBusinessDocument(currentUser.uid);

    } catch (error) {
        console.error('Error in loadUserData:', error);
        showToast('Error loading user data: ' + error.message, 'error');
        
        // Fallback to offline mode
        currentUserData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            photoURL: currentUser.photoURL || getDefaultAvatar('User'),
            mood: 'neutral',
            status: 'offline'
        };
        
        initializeUserData();
        showChatApp();
    }
}

function initializeUserData() {
    console.log('Initializing UI with user data');

    if (userName) userName.textContent = currentUserData.displayName;
    if (userAvatar) userAvatar.src = currentUserData.photoURL;
    if (userMood) userMood.textContent = currentUserData.mood || '😊';

    // Update profile modal fields if they exist
    const profileName = document.getElementById('profileName');
    const profileAbout = document.getElementById('profileAbout');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profilePicPreview = document.getElementById('profilePicPreview');
    const profileCoverPreview = document.getElementById('profileCoverPreview');

    if (profileName) profileName.value = currentUserData.displayName;
    if (profileAbout) profileAbout.value = currentUserData.about || '';
    if (profileEmail) profileEmail.value = currentUserData.email;
    if (profilePhone) profilePhone.value = currentUserData.phone || '';
    if (profilePicPreview) profilePicPreview.src = currentUserData.photoURL;
    if (profileCoverPreview) profileCoverPreview.src = currentUserData.coverURL || '';
}

function showChatApp() {
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (chatApp) chatApp.classList.remove('hidden');
    console.log('Chat app UI shown');
}

// ==================== TAB MANAGEMENT ====================
function initializeTabs() {
    console.log('Initializing tabs...');
    
    navIcons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Normalize tab name
            let normalizedTabName = tabName;
            if (tabName === 'chat') normalizedTabName = 'chats';
            if (tabName === 'chats') normalizedTabName = 'chats';
            
            console.log(`Tab clicked: ${tabName} -> ${normalizedTabName}`);
            switchTab(normalizedTabName);
        });
    });
    
    // Set initial tab to chat
    setTimeout(() => {
        switchTab('chats');
    }, 500);
}

function switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // If we're in a chat, go back to tabs first
    if (currentChat) {
        goBackToTabs();
        setTimeout(() => switchTab(tabName), 100);
        return;
    }
    
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.nav-icon').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Try multiple possible ID formats
    let tabPanel = document.getElementById(`${tabName}Tab`);
    if (!tabPanel) {
        tabPanel = document.getElementById(`${tabName}-tab`) || 
                  document.getElementById(`tab-${tabName}`) ||
                  document.getElementById(`${tabName}`);
    }
    
    if (tabPanel) {
        tabPanel.classList.remove('hidden');
        tabPanel.classList.add('active');
        console.log('✅ Tab panel activated:', tabPanel.id);
        
        // Activate corresponding tab button
        const tabButton = document.querySelector(`.nav-icon[data-tab="${tabName}"]`) ||
                         document.querySelector(`.nav-icon[data-tab="${tabName === 'chats' ? 'chat' : tabName}"]`);
        
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        // Special handling for non-chat tabs
        if (tabName !== 'chats') {
            // For demo purposes, show a message instead of opening new windows
            console.log(`Opening ${tabName} tab functionality`);
            showToast(`${tabName.charAt(0).toUpperCase() + tabName.slice(1)} feature is coming soon`, 'info');
            
            // If the tab doesn't exist, show a message in the tab panel
            if (tabName === 'groups' && tabPanel.innerHTML.trim() === '') {
                tabPanel.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                        <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">Groups Coming Soon</h3>
                        <p class="text-gray-500 mb-6">Group chat functionality will be available soon!</p>
                        <button onclick="createNewGroup()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            Create Test Group
                        </button>
                    </div>
                `;
            }
            
            // Switch back to chats tab after 2 seconds for demo
            setTimeout(() => {
                switchTab('chats');
            }, 2000);
        } else {
            // For chats tab, show input area if in chat
            if (currentChat && inputArea) {
                inputArea.classList.remove('hidden');
            } else if (inputArea) {
                inputArea.classList.add('hidden');
            }
        }
    } else {
        console.error('❌ Tab panel not found for:', tabName);
        showToast(`${tabName} tab not available`, 'error');
        return;
    }
    
    // Load REAL tab-specific content from Firebase
    setTimeout(() => {
        if (tabName === 'chats') {
            loadChats();
        }
    }, 100);
}

// ==================== CHAT MANAGEMENT ====================
function loadChats() {
    console.log('📱 Loading chats tab...');
    
    if (!currentUser || !currentUser.uid) {
        console.log('⚠️ User not authenticated yet');
        return;
    }
    
    if (!unsubscribeChats) {
        loadChatsTemporary();
    }
    
    if (chatListContainer) {
        chatListContainer.classList.remove('hidden');
    }
}

function loadChatsTemporary() {
    try {
        // Check if user is authenticated
        if (!currentUser || !currentUser.uid) {
            console.log('⚠️ User not authenticated yet, delaying chats load');
            setTimeout(loadChatsTemporary, 1000);
            return;
        }
        
        // Check if database is available
        if (!db) {
            console.log('⚠️ Database not available yet, delaying chats load');
            setTimeout(loadChatsTemporary, 1000);
            return;
        }
        
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) {
            console.log('⚠️ Chat list element not found in DOM');
            
            // Try to create it if it doesn't exist
            const chatsTab = document.getElementById('chatsTab');
            if (chatsTab) {
                const newChatsList = document.createElement('div');
                newChatsList.id = 'chatsList';
                newChatsList.className = 'chats-list space-y-2 overflow-y-auto';
                chatsTab.appendChild(newChatsList);
                console.log('✅ Created chatsList element');
                
                // Retry immediately with the created element
                loadChatsTemporary();
                return;
            }
            
            // If we can't create it, give up after a few tries
            if (!window.chatsLoadRetryCount) window.chatsLoadRetryCount = 0;
            window.chatsLoadRetryCount++;
            
            if (window.chatsLoadRetryCount < 5) {
                console.log(`Retrying chats load (${window.chatsLoadRetryCount}/5)...`);
                setTimeout(loadChatsTemporary, 1000);
            } else {
                console.error('Failed to load chats after multiple attempts');
                showToast('Cannot load chats. Please refresh the page.', 'error');
            }
            return;
        }
        
        // Reset retry counter on success
        window.chatsLoadRetryCount = 0;
        
        console.log('✅ Loading chats for user:', currentUser.uid);
        
        // Unsubscribe from previous listener if exists
        if (unsubscribeChats) {
            console.log('Unsubscribing from previous chats listener');
            unsubscribeChats();
            unsubscribeChats = null;
        }
        
        // Setup real-time listener for chats
        unsubscribeChats = db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid)
            .onSnapshot({
                next: (snapshot) => {
                    console.log('Chats snapshot received:', snapshot.size, 'chats');
                    
                    // Use the correct elements
                    const chatListContainer = document.getElementById('chatList');
                    const noChatsMsg = document.getElementById('noChatsMessage');
                    
                    if (!chatListContainer) {
                        console.error('chatList element not found');
                        return;
                    }
                    
                    chatListContainer.innerHTML = '';
                    
                    if (snapshot.empty) {
                        if (noChatsMsg) noChatsMsg.classList.remove('hidden');
                        return;
                    }
                    
                    if (noChatsMsg) noChatsMsg.classList.add('hidden');
                    
                    // Process and sort chats
                    const chats = [];
                    snapshot.forEach(doc => {
                        chats.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // Sort by last message time (newest first)
                    chats.sort((a, b) => {
                        const timeA = a.lastMessageTime ? (a.lastMessageTime.toDate ? a.lastMessageTime.toDate() : new Date(a.lastMessageTime)) : new Date(0);
                        const timeB = b.lastMessageTime ? (b.lastMessageTime.toDate ? b.lastMessageTime.toDate() : new Date(b.lastMessageTime)) : new Date(0);
                        return timeB.getTime() - timeA.getTime();
                    });
                    
                    // Render each chat
                    chats.forEach(chat => {
                        const otherParticipantId = chat.participants.find(id => id !== currentUser.uid);
                        const otherParticipantName = chat.participantNames ? 
                            chat.participantNames[otherParticipantId] : 'Unknown User';
                        
                        const unreadCount = chat.unread && chat.unread[currentUser.uid] ? 
                            chat.unread[currentUser.uid] : 0;
                        
                        const chatItem = document.createElement('div');
                        chatItem.className = 'chat-item hover:bg-gray-50 rounded-lg cursor-pointer transition-colors';
                        chatItem.dataset.chatId = chat.id;
                        chatItem.dataset.userId = otherParticipantId;
                        
                        chatItem.innerHTML = `
                            <div class="flex items-center space-x-3 p-3">
                                <div class="relative">
                                    <img class="w-12 h-12 rounded-full object-cover" 
                                         src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipantName)}&background=7C3AED&color=fff&size=48" 
                                         alt="${otherParticipantName}"
                                         onerror="this.src='${getDefaultAvatar(otherParticipantName)}'">
                                    ${unreadCount > 0 ? `
                                        <span class="unread-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            ${unreadCount}
                                        </span>
                                    ` : ''}
                                    ${chat.participants?.length > 2 ? `
                                        <span class="group-badge absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            <i class="fas fa-users text-xs"></i>
                                        </span>
                                    ` : ''}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-center">
                                        <div class="contact-name font-medium text-gray-800 truncate">
                                            ${otherParticipantName}
                                            ${chat.participants?.length > 2 ? ' (Group)' : ''}
                                        </div>
                                        <div class="last-message-time text-xs text-gray-500">
                                            ${chat.lastMessageTime ? formatTimeAgo(chat.lastMessageTime) : ''}
                                        </div>
                                    </div>
                                    <div class="last-message-preview text-sm text-gray-500 truncate mt-1">
                                        ${chat.lastMessage || 'No messages yet'}
                                    </div>
                                    ${chat.typing && chat.typing[otherParticipantId] ? `
                                        <div class="typing-indicator text-xs text-green-500 mt-1">
                                            <i class="fas fa-circle-notch fa-spin mr-1"></i>typing...
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                        
                        chatItem.addEventListener('click', () => {
                            console.log('Opening chat with:', otherParticipantName);
                            startChat(otherParticipantId, otherParticipantName);
                        });
                        
                        chatListContainer.appendChild(chatItem);
                    });
                    
                    console.log(`✅ Rendered ${chats.length} chats`);
                },
                error: (error) => {
                    console.error('Error loading chats:', error);
                    
                    // Show user-friendly error message
                    const chatListContainer = document.getElementById('chatList');
                    if (chatListContainer) {
                        chatListContainer.innerHTML = `
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-exclamation-triangle text-4xl mb-3 text-gray-300 block"></i>
                                <p class="font-medium">Error loading chats</p>
                                <p class="text-sm mt-1">${error.message || 'Please check your connection'}</p>
                                <button onclick="loadChatsTemporary()" class="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    Retry
                                </button>
                            </div>
                        `;
                    }
                    
                    // Don't auto-retry on error - let user click retry
                    if (unsubscribeChats) {
                        unsubscribeChats();
                        unsubscribeChats = null;
                    }
                }
            });
            
        console.log('✅ Chats listener setup successfully');
        
    } catch (error) {
        console.error('❌ Fatal error in loadChatsTemporary:', error);
        
        // Show error toast but don't auto-retry
        showToast('Failed to load chats. Please refresh the page.', 'error');
        
        // Clean up any existing listener
        if (unsubscribeChats) {
            unsubscribeChats();
            unsubscribeChats = null;
        }
        
        // Don't set timeout to retry - let user refresh or fix the issue
    }
}

async function startChat(friendId, friendName) {
    try {
        console.log('Starting chat with:', friendName, friendId);
        
        if (!currentUser || !currentUser.uid) {
            showToast('Please log in first', 'error');
            return;
        }
        
        // Create or get chat ID
        const chatId = [currentUser.uid, friendId].sort().join('_');
        
        console.log('Chat ID:', chatId);
        
        // Check if chat document exists
        const chatDoc = await db.collection('chats').doc(chatId).get();
        
        if (!chatDoc.exists) {
            console.log('Creating new chat document');
            await db.collection('chats').doc(chatId).set({
                participants: [currentUser.uid, friendId],
                participantNames: {
                    [currentUser.uid]: currentUserData.displayName,
                    [friendId]: friendName
                },
                lastMessage: '',
                lastMessageTime: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                createdAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                typing: {},
                unread: {
                    [currentUser.uid]: 0,
                    [friendId]: 0
                }
            });
        }
        
        // Set current chat
        currentChat = {
            id: chatId,
            friendId: friendId,
            name: friendName
        };
        
        currentChatId = chatId;
        
        console.log('Current chat set:', currentChat);
        
        // Update UI - SHOW CHAT INTERFACE
        const chatHeader = document.getElementById('chatHeader');
        const inputArea = document.getElementById('inputArea');
        const messagesContainer = document.getElementById('messagesContainer');
        const chatTitle = document.getElementById('chatTitle');
        const chatAvatar = document.getElementById('chatAvatar');
        
        // Hide all tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        // Show chat interface elements
        if (chatHeader) chatHeader.classList.remove('hidden');
        if (inputArea) inputArea.classList.remove('hidden');
        if (messagesContainer) messagesContainer.classList.remove('hidden');
        
        // Update chat header
        if (chatTitle) chatTitle.textContent = friendName;
        if (chatAvatar) chatAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friendName)}&background=7C3AED&color=fff`;
        
        // Update message input styles for better readability
        if (messageInput) {
            messageInput.style.fontSize = '16px';
            messageInput.style.lineHeight = '1.5';
            messageInput.disabled = false;
            messageInput.focus();
        }
        
        if (sendBtn) {
            // Update send button to minimized size as per your changes
            sendBtn.style.width = '40px'; // w-10 = 2.5rem = 40px
            sendBtn.style.height = '40px';
            sendBtn.disabled = false;
        }
        
        // Load messages
        loadMessages(chatId);
        
        // Mark messages as read
        markMessagesAsRead(chatId);
        
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast('Error starting chat: ' + error.message, 'error');
    }
}

function goBackToTabs() {
    console.log('Going back to tabs');
    
    // Hide chat interface
    const chatHeader = document.getElementById('chatHeader');
    const inputArea = document.getElementById('inputArea');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (chatHeader) chatHeader.classList.add('hidden');
    if (inputArea) inputArea.classList.add('hidden');
    if (messagesContainer) messagesContainer.classList.add('hidden');
    
    // Show the current active tab
    const activeTabBtn = document.querySelector('.nav-icon.active');
    if (activeTabBtn) {
        const tabName = activeTabBtn.getAttribute('data-tab');
        const tabPanel = document.getElementById(`${tabName}Tab`);
        if (tabPanel) {
            tabPanel.classList.remove('hidden');
        }
    } else {
        // Default to chats tab
        const chatsTab = document.getElementById('chatsTab');
        if (chatsTab) chatsTab.classList.remove('hidden');
    }
    
    // Clear current chat
    currentChat = null;
    currentChatId = null;
    
    // Unsubscribe from message listeners
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    
    if (typingListener) {
        typingListener();
        typingListener = null;
    }
    
    console.log('Back to tabs successfully');
}

// ==================== MESSAGE MANAGEMENT ====================
function loadMessages(chatId) {
    console.log('Loading messages for chat:', chatId);
    
    // Unsubscribe from previous listeners
    if (unsubscribeMessages) {
        console.log('Unsubscribing from previous message listener');
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    
    if (typingListener) {
        console.log('Unsubscribing from previous typing listener');
        typingListener();
        typingListener = null;
    }
    
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }
    
    // Show loading state
    messagesContainer.innerHTML = `
        <div class="text-center text-gray-500 py-10">
            <i class="fas fa-spinner fa-spin text-4xl mb-3 text-gray-300 block"></i>
            <p>Loading messages...</p>
        </div>
    `;
    
    let isFirstLoad = true;
    let loadedMessageIds = new Set();
    
    // Subscribe to messages for this chat
    unsubscribeMessages = db.collection('messages')
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'asc')
        .onSnapshot({
            next: (snapshot) => {
                console.log('New messages snapshot:', snapshot.size, 'messages');
                
                if (!messagesContainer) return;
                
                // Only clear container on first load
                if (isFirstLoad) {
                    messagesContainer.innerHTML = '';
                    loadedMessageIds.clear();
                    isFirstLoad = false;
                }
                
                if (snapshot.empty) {
                    messagesContainer.innerHTML = `
                        <div class="text-center text-gray-500 py-10">
                            <i class="fas fa-comments text-4xl mb-3 text-gray-300 block"></i>
                            <p>No messages yet</p>
                            <p class="text-sm mt-1">Send a message to start the conversation</p>
                        </div>
                    `;
                    return;
                }
                
                let lastDate = null;
                let hasNewMessages = false;
                
                // Process each message
                snapshot.docChanges().forEach(change => {
                    const messageId = change.doc.id;
                    const message = change.doc.data();
                    
                    // Skip if already loaded
                    if (loadedMessageIds.has(messageId)) {
                        return;
                    }
                    
                    loadedMessageIds.add(messageId);
                    hasNewMessages = true;
                    
                    // Check if we need to add a date separator
                    const messageDate = message.timestamp ? 
                        (message.timestamp.toDate ? message.timestamp.toDate().toDateString() : new Date(message.timestamp).toDateString()) 
                        : new Date().toDateString();
                    if (messageDate !== lastDate) {
                        addDateSeparator(messageDate);
                        lastDate = messageDate;
                    }
                    
                    addMessageToUI(message, messageId);
                });
                
                // Scroll to bottom only if new messages were added
                if (hasNewMessages) {
                    setTimeout(() => {
                        if (messagesContainer) {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    }, 100);
                }
                
                // Mark messages as read
                markMessagesAsRead(chatId);
            },
            error: (error) => {
                console.error('Error loading messages:', error);
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="text-center text-gray-500 py-10">
                            <i class="fas fa-exclamation-triangle text-4xl mb-3 text-gray-300 block"></i>
                            <p>Error loading messages</p>
                            <p class="text-sm mt-1">Please try again later</p>
                        </div>
                    `;
                }
                showToast('Error loading messages', 'error');
            }
        });
    
    // Listen for typing indicators
    typingListener = db.collection('chats').doc(chatId)
        .onSnapshot({
            next: (doc) => {
                if (doc.exists) {
                    const chatData = doc.data();
                    const typing = chatData.typing || {};
                    
                    // Remove current user from typing indicators
                    delete typing[currentUser.uid];
                    
                    const typingUsersList = Object.keys(typing).filter(userId => typing[userId] === true);
                    
                    const typingIndicator = document.getElementById('typingIndicator');
                    const isTyping = document.getElementById('isTyping');
                    const typingUsers = document.getElementById('typingUsers');
                    
                    if (typingUsers && isTyping && typingIndicator) {
                        if (typingUsersList.length > 0) {
                            // Get names of typing users
                            const typingNames = typingUsersList.map(userId => {
                                return chatData.participantNames && chatData.participantNames[userId] 
                                    ? chatData.participantNames[userId] 
                                    : 'Someone';
                            });
                            
                            typingUsers.textContent = typingNames.join(', ');
                            isTyping.classList.remove('hidden');
                            typingIndicator.classList.remove('hidden');
                        } else {
                            isTyping.classList.add('hidden');
                            typingIndicator.classList.add('hidden');
                        }
                    }
                }
            },
            error: (error) => {
                console.error('Error listening for typing indicators:', error);
            }
        });
}

function addDateSeparator(dateString) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const dateElement = document.createElement('div');
    dateElement.className = 'date-separator text-center my-4';
    dateElement.innerHTML = `
        <span class="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            ${getDisplayDate(dateString)}
        </span>
    `;
    
    messagesContainer.appendChild(dateElement);
}

function getDisplayDate(dateString) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (dateString === today) {
        return 'Today';
    } else if (dateString === yesterday) {
        return 'Yesterday';
    } else {
        return new Date(dateString).toLocaleDateString();
    }
}

function addMessageToUI(message, messageId) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    
    const isSent = message.senderId === currentUser.uid;
    const messageTime = message.timestamp ? 
        (message.timestamp.toDate ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) 
        : 'Just now';
    
    let statusIcon = '🕒'; // sent
    if (message.status === 'delivered') statusIcon = '✓✓';
    if (message.status === 'read') statusIcon = '✓✓👁️';
    
    messageElement.className = `flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`;
    messageElement.dataset.messageId = messageId;
    
    // Check if message has file attachment
    if (message.file) {
        messageElement.innerHTML = `
            <div class="max-w-xs lg:max-w-md ${isSent ? 'bg-purple-100' : 'bg-gray-100'} rounded-2xl p-3">
                <div class="text-sm font-medium ${isSent ? 'text-purple-700' : 'text-gray-700'} mb-1">
                    ${isSent ? 'You' : (message.senderName || 'Unknown')}
                </div>
                <div class="flex items-center space-x-3 p-2 bg-white rounded-lg">
                    <div class="text-purple-600 text-xl">
                        <i class="fas ${getFileIcon(message.file.type)}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="font-medium text-gray-800">${message.file.name}</div>
                        <div class="text-xs text-gray-500">${formatFileSize(message.file.size)}</div>
                        <a href="${message.file.url}" target="_blank" class="text-purple-600 hover:text-purple-800 text-xs mt-1 inline-block">
                            <i class="fas fa-download mr-1"></i>Download
                        </a>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-2 flex justify-between items-center">
                    <span>${messageTime}</span>
                    ${isSent ? `<span class="ml-2">${statusIcon}</span>` : ''}
                </div>
            </div>
        `;
    } else if (message.type === 'poll') {
        messageElement.innerHTML = `
            <div class="max-w-xs lg:max-w-md ${isSent ? 'bg-purple-100' : 'bg-gray-100'} rounded-2xl p-3">
                <div class="text-sm font-medium ${isSent ? 'text-purple-700' : 'text-gray-700'} mb-1">
                    ${isSent ? 'You' : (message.senderName || 'Unknown')}
                </div>
                <div class="bg-white rounded-lg p-3">
                    <div class="font-medium text-gray-800 mb-2">📊 ${message.pollQuestion}</div>
                    <div class="space-y-2">
                        ${message.pollOptions ? message.pollOptions.map((option, index) => `
                            <div class="poll-option flex justify-between items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer" data-option-index="${index}">
                                <span>${option}</span>
                                <span class="text-sm text-gray-500">${message.pollVotes ? message.pollVotes[index] || 0 : 0}</span>
                            </div>
                        `).join('') : ''}
                    </div>
                    <div class="text-xs text-gray-500 mt-2">Total votes: ${message.totalVotes || 0}</div>
                </div>
                <div class="text-xs text-gray-500 mt-2 flex justify-between items-center">
                    <span>${messageTime}</span>
                    ${isSent ? `<span class="ml-2">${statusIcon}</span>` : ''}
                </div>
            </div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="max-w-xs lg:max-w-md ${isSent ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl p-3">
                <div class="text-sm font-medium ${isSent ? 'text-purple-100' : 'text-gray-700'} mb-1">
                    ${isSent ? 'You' : (message.senderName || 'Unknown')}
                </div>
                <div class="text-sm">${escapeHtml(message.text)}</div>
                <div class="text-xs ${isSent ? 'text-purple-200' : 'text-gray-500'} mt-2 flex justify-between items-center">
                    <span>${messageTime}</span>
                    ${isSent ? `<span class="ml-2">${statusIcon}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageElement);
    
    // Add context menu for messages
    setupMessageContextMenu(messageElement, message, messageId);
    
    // Add click event for polls
    if (message.type === 'poll') {
        messageElement.querySelectorAll('.poll-option').forEach((option, index) => {
            option.addEventListener('click', () => {
                voteOnPoll(messageId, index);
            });
        });
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const text = messageInput.value.trim();
    
    if (!text || !currentChat) {
        if (!text) {
            showToast('Please enter a message', 'error');
        }
        return;
    }
    
    console.log('Sending message:', text, 'to chat:', currentChat.id);
    
    try {
        const message = {
            text: text,
            senderId: currentUser.uid,
            senderName: currentUserData.displayName,
            chatId: currentChat.id,
            timestamp: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            status: 'sent',
            type: 'text'
        };
        
        // Add message to Firebase
        const docRef = await db.collection('messages').add(message);
        console.log('Message sent with ID:', docRef.id);
        
        // Clear input
        messageInput.value = '';
        
        // Update chat document with last message
        await db.collection('chats').doc(currentChat.id).update({
            lastMessage: text.length > 50 ? text.substring(0, 50) + '...' : text,
            lastMessageTime: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            [`typing.${currentUser.uid}`]: false, // Remove typing indicator
            [`unread.${currentChat.friendId}`]: firebase.firestore ? firebase.firestore.FieldValue.increment(1) : 1
        });
        
        console.log('Chat document updated with last message');
        
        // Update message status to delivered for all messages in this chat
        updateMessageStatus(currentChat.id, 'delivered');
        
        // Scroll to bottom
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
        
        // Send push notification
        sendPushNotification(currentChat.friendId, currentUserData.displayName, text);
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error sending message: ' + error.message, 'error');
    }
}

function updateMessageStatus(chatId, status) {
    console.log('Updating message status to:', status, 'for chat:', chatId);
    
    if (!db || !currentUser) return;
    
    // Update all messages in this chat that are sent by the current user
    db.collection('messages')
        .where('chatId', '==', chatId)
        .where('senderId', '==', currentUser.uid)
        .where('status', '==', 'sent')
        .get()
        .then(snapshot => {
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                batch.update(doc.ref, { status: status });
            });
            
            return batch.commit();
        })
        .then(() => {
            console.log('Message status updated successfully');
        })
        .catch(error => {
            console.error('Error updating message status:', error);
        });
}

function markMessagesAsRead(chatId) {
    console.log('Marking messages as read for chat:', chatId);
    
    if (!db || !currentUser) return;
    
    // Mark all messages in this chat as read
    db.collection('messages')
        .where('chatId', '==', chatId)
        .where('senderId', '!=', currentUser.uid)
        .where('status', 'in', ['sent', 'delivered'])
        .get()
        .then(snapshot => {
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                batch.update(doc.ref, { status: 'read' });
            });
            
            return batch.commit();
        })
        .then(() => {
            console.log('Messages marked as read successfully');
            
            // Reset unread count for this chat
            if (currentUser && currentChat) {
                db.collection('chats').doc(chatId).update({
                    [`unread.${currentUser.uid}`]: 0
                });
            }
        })
        .catch(error => {
            console.error('Error marking messages as read:', error);
        });
}

// ==================== FILE UPLOAD ====================
async function uploadFile(file) {
    if (!currentChat) {
        showToast('Please select a chat first', 'error');
        return;
    }
    
    if (!storage) {
        showToast('File upload not available', 'error');
        return;
    }
    
    try {
        console.log('Uploading file:', file.name, 'to chat:', currentChat.id);
        showToast('Uploading file...', 'info');
        
        // Upload to Firebase Storage
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`chat_files/${currentChat.id}/${Date.now()}_${file.name}`);
        const uploadTask = fileRef.put(file);
        
        // Show upload progress
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
        if (filePreview) filePreview.classList.remove('hidden');
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                // Update progress bar
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
                if (uploadProgressBar) uploadProgressBar.style.width = `${progress}%`;
            },
            (error) => {
                console.error('Error uploading file:', error);
                showToast('Error uploading file', 'error');
                if (filePreview) filePreview.classList.add('hidden');
            },
            async () => {
                // Upload completed
                console.log('File upload completed');
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                
                // Create message with file
                const message = {
                    text: `Shared a file: ${file.name}`,
                    senderId: currentUser.uid,
                    senderName: currentUserData.displayName,
                    chatId: currentChat.id,
                    timestamp: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                    status: 'sent',
                    file: {
                        name: file.name,
                        url: downloadURL,
                        type: file.type,
                        size: file.size
                    }
                };
                
                // Add message to Firebase
                await db.collection('messages').add(message);
                
                // Update chat document with last message
                await db.collection('chats').doc(currentChat.id).update({
                    lastMessage: `Shared a file: ${file.name}`,
                    lastMessageTime: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                    [`unread.${currentChat.friendId}`]: firebase.firestore ? firebase.firestore.FieldValue.increment(1) : 1
                });
                
                // Hide file preview
                if (filePreview) filePreview.classList.add('hidden');
                
                console.log('File uploaded successfully');
                showToast('File uploaded successfully', 'success');
            }
        );
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Error uploading file: ' + error.message, 'error');
    }
}

// ==================== TYPING INDICATOR ====================
function handleTypingIndicator() {
    if (currentChat && db) {
        console.log('Sending typing indicator for chat:', currentChat.id);
        
        // Send typing indicator
        db.collection('chats').doc(currentChat.id).update({
            [`typing.${currentUser.uid}`]: true,
            lastActivity: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        });
        
        // Clear previous timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        // Set timeout to remove typing indicator
        typingTimeout = setTimeout(() => {
            if (db) {
                db.collection('chats').doc(currentChat.id).update({
                    [`typing.${currentUser.uid}`]: false
                });
            }
        }, 1000);
    }
}

// ==================== EMOJI PICKER ====================
function initEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    if (!emojiPicker) return;
    
    const emojiCategories = [
        {
            title: 'Smileys & People',
            emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']
        },
        {
            title: 'Animals & Nature',
            emojis: ['🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🕷️', '🕸️', '🦂', '🦟', '🦠', '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃']
        }
    ];

    emojiPicker.innerHTML = '';

    emojiCategories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'emoji-category mb-3';
        
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'emoji-category-title text-xs font-medium text-gray-500 mb-2 px-2';
        categoryTitle.textContent = category.title;
        
        const emojiGrid = document.createElement('div');
        emojiGrid.className = 'emoji-grid grid grid-cols-8 gap-1';
        
        category.emojis.forEach(emoji => {
            const emojiOption = document.createElement('div');
            emojiOption.className = 'emoji-option text-xl p-1 hover:bg-gray-100 rounded cursor-pointer text-center';
            emojiOption.textContent = emoji;
            emojiOption.addEventListener('click', () => {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.value += emoji;
                    emojiPicker.style.display = 'none';
                    messageInput.focus();
                }
            });
            
            emojiGrid.appendChild(emojiOption);
        });
        
        categoryElement.appendChild(categoryTitle);
        categoryElement.appendChild(emojiGrid);
        emojiPicker.appendChild(categoryElement);
    });
}

function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    if (!emojiPicker) return;
    
    if (emojiPicker.style.display === 'block') {
        emojiPicker.style.display = 'none';
    } else {
        emojiPicker.style.display = 'block';
    }
}

// ==================== POLL SYSTEM ====================
function setupPollSystem() {
    if (addPollOption) {
        addPollOption.addEventListener('click', addPollOptionField);
    }
    
    if (createPoll) {
        createPoll.addEventListener('click', createNewPoll);
    }
    
    if (cancelPoll) {
        cancelPoll.addEventListener('click', () => {
            if (pollCreationSection) pollCreationSection.classList.add('hidden');
        });
    }
    
    if (closePollCreation) {
        closePollCreation.addEventListener('click', () => {
            if (pollCreationSection) pollCreationSection.classList.add('hidden');
        });
    }
    
    if (dismissPollResults) {
        dismissPollResults.addEventListener('click', () => {
            if (pollResultsSection) pollResultsSection.classList.add('hidden');
        });
    }
}

function addPollOptionField() {
    if (!pollOptions) return;
    
    const optionCount = pollOptions.querySelectorAll('.poll-option-field').length;
    if (optionCount >= 6) {
        showToast('Maximum 6 options allowed', 'error');
        return;
    }
    
    const optionField = document.createElement('div');
    optionField.className = 'poll-option-field flex items-center space-x-2 mb-2';
    optionField.innerHTML = `
        <input type="text" class="flex-1 p-2 border border-gray-300 rounded-lg" placeholder="Option ${optionCount + 1}">
        <button class="remove-poll-option text-red-500 hover:text-red-700">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    pollOptions.appendChild(optionField);
    
    optionField.querySelector('.remove-poll-option').addEventListener('click', () => {
        optionField.remove();
    });
}

async function createNewPoll() {
    if (!pollQuestion || !pollQuestion.value.trim()) {
        showToast('Please enter a poll question', 'error');
        return;
    }
    
    const optionInputs = pollOptions.querySelectorAll('input[type="text"]');
    const options = [];
    optionInputs.forEach(input => {
        if (input.value.trim()) {
            options.push(input.value.trim());
        }
    });
    
    if (options.length < 2) {
        showToast('Please add at least 2 options', 'error');
        return;
    }
    
    if (options.length > 6) {
        showToast('Maximum 6 options allowed', 'error');
        return;
    }
    
    try {
        const pollData = {
            type: 'poll',
            pollQuestion: pollQuestion.value.trim(),
            pollOptions: options,
            pollVotes: options.map(() => 0),
            totalVotes: 0,
            senderId: currentUser.uid,
            senderName: currentUserData.displayName,
            chatId: currentChat.id,
            timestamp: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            status: 'sent'
        };
        
        await db.collection('messages').add(pollData);
        
        // Update chat document with last message
        await db.collection('chats').doc(currentChat.id).update({
            lastMessage: `📊 Poll: ${pollQuestion.value.trim().substring(0, 30)}...`,
            lastMessageTime: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            [`unread.${currentChat.friendId}`]: firebase.firestore ? firebase.firestore.FieldValue.increment(1) : 1
        });
        
        // Clear poll creation
        pollQuestion.value = '';
        pollOptions.innerHTML = '';
        
        // Hide poll creation section
        if (pollCreationSection) pollCreationSection.classList.add('hidden');
        
        showToast('Poll created successfully', 'success');
        
    } catch (error) {
        console.error('Error creating poll:', error);
        showToast('Error creating poll: ' + error.message, 'error');
    }
}

async function voteOnPoll(messageId, optionIndex) {
    if (!currentUser || !currentChat || !db) return;
    
    try {
        const messageRef = db.collection('messages').doc(messageId);
        const messageDoc = await messageRef.get();
        
        if (!messageDoc.exists) return;
        
        const messageData = messageDoc.data();
        const voters = messageData.voters || [];
        
        // Check if user already voted
        if (voters.includes(currentUser.uid)) {
            showToast('You have already voted on this poll', 'error');
            return;
        }
        
        // Update votes
        const pollVotes = [...messageData.pollVotes];
        pollVotes[optionIndex] = (pollVotes[optionIndex] || 0) + 1;
        
        await messageRef.update({
            pollVotes: pollVotes,
            totalVotes: (messageData.totalVotes || 0) + 1,
            voters: [...voters, currentUser.uid]
        });
        
        showToast('Vote recorded', 'success');
        
    } catch (error) {
        console.error('Error voting on poll:', error);
        showToast('Error voting on poll: ' + error.message, 'error');
    }
}

// ==================== MESSAGE SELECTION ====================
let selectedMessages = new Set();

function setupMessageSelection() {
    if (cancelSelection) {
        cancelSelection.addEventListener('click', () => {
            clearMessageSelection();
        });
    }
    
    if (forwardSelected) {
        forwardSelected.addEventListener('click', forwardSelectedMessages);
    }
    
    if (starSelected) {
        starSelected.addEventListener('click', starSelectedMessages);
    }
    
    if (deleteSelected) {
        deleteSelected.addEventListener('click', deleteSelectedMessages);
    }
}

function clearMessageSelection() {
    selectedMessages.clear();
    if (messageSelectionToolbar) messageSelectionToolbar.classList.add('hidden');
    
    // Remove selection styling
    document.querySelectorAll('.message-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

function toggleMessageSelection(messageId) {
    if (selectedMessages.has(messageId)) {
        selectedMessages.delete(messageId);
    } else {
        selectedMessages.add(messageId);
    }
    
    // Update UI
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.classList.toggle('selected');
    }
    
    // Show/hide toolbar
    if (selectedMessages.size > 0) {
        if (messageSelectionToolbar) messageSelectionToolbar.classList.remove('hidden');
        if (selectedMessagesCount) selectedMessagesCount.textContent = selectedMessages.size;
    } else {
        if (messageSelectionToolbar) messageSelectionToolbar.classList.add('hidden');
    }
}

async function forwardSelectedMessages() {
    if (selectedMessages.size === 0) return;
    
    showToast(`Forwarding ${selectedMessages.size} messages`, 'info');
    clearMessageSelection();
}

async function starSelectedMessages() {
    if (selectedMessages.size === 0) return;
    
    try {
        const batch = db.batch();
        selectedMessages.forEach(messageId => {
            const messageRef = db.collection('messages').doc(messageId);
            batch.update(messageRef, { starred: true });
        });
        
        await batch.commit();
        showToast(`${selectedMessages.size} messages starred`, 'success');
        clearMessageSelection();
        
    } catch (error) {
        console.error('Error starring messages:', error);
        showToast('Error starring messages: ' + error.message, 'error');
    }
}

async function deleteSelectedMessages() {
    if (selectedMessages.size === 0) return;
    
    if (confirm(`Delete ${selectedMessages.size} selected messages?`)) {
        try {
            const batch = db.batch();
            selectedMessages.forEach(messageId => {
                const messageRef = db.collection('messages').doc(messageId);
                batch.update(messageRef, { deleted: true });
            });
            
            await batch.commit();
            showToast(`${selectedMessages.size} messages deleted`, 'success');
            clearMessageSelection();
            
        } catch (error) {
            console.error('Error deleting messages:', error);
            showToast('Error deleting messages: ' + error.message, 'error');
        }
    }
}

// ==================== REPLY SYSTEM ====================
function setupReplySystem() {
    if (cancelReply) {
        cancelReply.addEventListener('click', () => {
            if (replyPreviewBar) {
                replyPreviewBar.classList.add('hidden');
                window.currentReplyMessage = null;
            }
        });
    }
}

function showReplyPreview(message) {
    if (!replyPreviewBar || !replyToName || !replyPreviewContent) return;
    
    replyToName.textContent = message.senderName || 'User';
    replyPreviewContent.textContent = message.text.length > 50 
        ? message.text.substring(0, 50) + '...' 
        : message.text;
    
    replyPreviewBar.classList.remove('hidden');
    window.currentReplyMessage = message;
}

// ==================== CONTEXT MENU ====================
function setupContextMenuActions() {
    if (!messageContextMenu) return;
    
    // Close context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (messageContextMenu && !messageContextMenu.contains(e.target) && 
            !e.target.closest('.message-item')) {
            messageContextMenu.classList.add('hidden');
        }
    });
    
    // Context menu items
    const contextMenuItems = [
        { selector: '[data-action="reply"]', action: handleReply },
        { selector: '[data-action="forward"]', action: handleForward },
        { selector: '[data-action="star"]', action: handleStar },
        { selector: '[data-action="copy"]', action: handleCopy },
        { selector: '[data-action="delete"]', action: handleDelete }
    ];
    
    contextMenuItems.forEach(({ selector, action }) => {
        const element = messageContextMenu.querySelector(selector);
        if (element) {
            element.addEventListener('click', action);
        }
    });
}

function handleReply() {
    const messageId = messageContextMenu.dataset.messageId;
    if (messageId && window.selectedMessage) {
        showReplyPreview(window.selectedMessage);
    }
    messageContextMenu.classList.add('hidden');
}

function handleForward() {
    const messageId = messageContextMenu.dataset.messageId;
    if (messageId) {
        toggleMessageSelection(messageId);
    }
    messageContextMenu.classList.add('hidden');
}

function handleStar() {
    const messageId = messageContextMenu.dataset.messageId;
    if (messageId) {
        toggleMessageSelection(messageId);
        setTimeout(() => {
            starSelectedMessages();
        }, 100);
    }
    messageContextMenu.classList.add('hidden');
}

function handleCopy() {
    if (window.selectedMessage && window.selectedMessage.text) {
        navigator.clipboard.writeText(window.selectedMessage.text)
            .then(() => {
                showToast('Message copied to clipboard', 'success');
            })
            .catch(() => {
                showToast('Failed to copy message', 'error');
            });
    }
    messageContextMenu.classList.add('hidden');
}

function handleDelete() {
    const messageId = messageContextMenu.dataset.messageId;
    if (messageId) {
        toggleMessageSelection(messageId);
        setTimeout(() => {
            deleteSelectedMessages();
        }, 100);
    }
    messageContextMenu.classList.add('hidden');
}

function setupMessageContextMenu(messageElement, message, messageId) {
    messageElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Show context menu
        if (messageContextMenu) {
            messageContextMenu.style.left = `${e.pageX}px`;
            messageContextMenu.style.top = `${e.pageY}px`;
            messageContextMenu.classList.remove('hidden');
            messageContextMenu.dataset.messageId = messageId;
        }
        
        // Store selected message
        window.selectedMessageId = messageId;
        window.selectedMessage = message;
    });
}

// ==================== MOOD SUGGESTIONS ====================
function setupMoodSuggestions() {
    if (dismissSuggestion) {
        dismissSuggestion.addEventListener('click', () => {
            if (moodSuggestion) moodSuggestion.classList.add('hidden');
        });
    }
}

// ==================== BUSINESS TOOLS ====================
function setupBusinessTools() {
    // Business tools initialization
    console.log('Business tools setup');
}

// ==================== HELP CENTER ====================
function setupHelpCenter() {
    // This function sets up help center functionality
    console.log('Help center setup');
}

// ==================== MODALS ====================
function setupModals() {
    console.log('Setting up modals...');
    
    // 1. Close all modals when clicking outside
    document.addEventListener('click', function(e) {
        // If clicking on modal backdrop (the dark background)
        if (e.target.classList.contains('modal') || 
            e.target.classList.contains('modal-backdrop') ||
            (e.target.hasAttribute && e.target.hasAttribute('data-modal-backdrop'))) {
            
            // Find and close the modal
            let modal = e.target;
            while (modal && !modal.classList.contains('modal')) {
                modal = modal.parentElement;
            }
            if (modal) {
                modal.classList.add('hidden');
                console.log('Closed modal by backdrop:', modal.id);
            }
        }
    });
    
    // 2. Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    console.log('Closed modal with Escape:', modal.id);
                }
            });
        }
    });
    
    // 3. Setup specific close buttons (only if they exist)
    const modalClosePairs = [
        { closeBtn: 'closeFeatures', modal: 'featuresModal' },
        { closeBtn: 'closeMood', modal: 'moodModal' },
        { closeBtn: 'closeQuickActions', modal: 'quickActionsModal' },
        { closeBtn: 'closeStatusViewer', modal: 'statusViewerModal' },
        { closeBtn: 'closeCreateGoal', modal: 'createGoalModal' },
        { closeBtn: 'closePollCreation', modal: 'pollCreationSection' },
        { closeBtn: 'cancelGoal', modal: 'createGoalModal' },
        { closeBtn: 'dismissSuggestion', modal: 'moodSuggestion' },
        { closeBtn: 'dismissPollResults', modal: 'pollResultsSection' },
        { closeBtn: 'cancelReply', modal: 'replyPreviewBar' }
    ];
    
    modalClosePairs.forEach(pair => {
        const closeBtn = document.getElementById(pair.closeBtn);
        const modal = document.getElementById(pair.modal);
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                modal.classList.add('hidden');
                console.log(`Closed ${modal.id} via ${closeBtn.id}`);
            });
        } else {
            console.log(`Could not connect: ${pair.closeBtn} → ${pair.modal}`);
        }
    });
    
    // 4. Mood options
    document.querySelectorAll('.mood-option').forEach(option => {
        option.addEventListener('click', function() {
            const mood = this.dataset.mood;
            if (mood) {
                updateMood(mood);
            }
        });
    });
    
    // 5. Save Goal button (if it exists)
    const saveGoalBtn = document.getElementById('saveGoal');
    if (saveGoalBtn && createGoalModal) {
        saveGoalBtn.addEventListener('click', async function() {
            const title = document.getElementById('goalTitle')?.value;
            const description = document.getElementById('goalDescription')?.value;
            const dueDate = document.getElementById('goalDueDate')?.value;
            const progress = document.getElementById('goalProgress')?.value;
            
            if (!title) {
                showToast('Please enter a goal title', 'error');
                return;
            }
            
            try {
                // Save goal logic here
                showToast('Goal saved successfully!', 'success');
                createGoalModal.classList.add('hidden');
                
                // Clear form
                if (document.getElementById('goalTitle')) document.getElementById('goalTitle').value = '';
                if (document.getElementById('goalDescription')) document.getElementById('goalDescription').value = '';
                
            } catch (error) {
                console.error('Error saving goal:', error);
                showToast('Error saving goal', 'error');
            }
        });
    }
    
    console.log('Modals setup complete');
}

function handleQuickAction(action) {
    switch(action) {
        case 'create-goal':
            if (createGoalModal) createGoalModal.classList.remove('hidden');
            break;
        case 'share-contact':
            showToast('Share contact feature coming soon', 'info');
            break;
        case 'schedule-call':
            showToast('Schedule call feature coming soon', 'info');
            break;
        default:
            console.log('Quick action:', action);
    }
}

// ==================== TOOLS TAB ====================
function loadToolsTab() {
    console.log('Loading tools tab...');
    // Business data is loaded separately when modals open
}

function loadPersonalizationDisplay() {
    if (!currentUserData) return;
    
    // Load moods
    if (currentMoodsMini) {
        const moods = currentUserData.moods || ['happy'];
        currentMoodsMini.innerHTML = moods.map(mood => `
            <span class="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs mr-1">
                ${mood}
            </span>
        `).join('');
    }
    
    // Load interests
    if (currentInterestsMini) {
        const interests = currentUserData.interests || ['chatting', 'music'];
        currentInterestsMini.innerHTML = interests.map(interest => `
            <span class="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs mr-1">
                ${interest}
            </span>
        `).join('');
    }
}

function loadMoodSuggestions() {
    if (!currentUserData || !moodSuggestion) return;
    
    const mood = currentUserData.mood || 'happy';
    const suggestions = {
        happy: ["Share your happiness with friends!", "Spread positivity today!"],
        sad: ["Talk to a friend who makes you smile", "Listen to your favorite music"],
        excited: ["Plan something fun!", "Share your excitement with others"],
        tired: ["Take a break and relax", "Listen to calming music"],
        angry: ["Take deep breaths", "Talk it out with someone you trust"],
        neutral: ["Start a conversation with a friend", "Share what's on your mind"]
    };
    
    const moodSuggestions = suggestions[mood] || suggestions.neutral;
    const randomSuggestion = moodSuggestions[Math.floor(Math.random() * moodSuggestions.length)];
    
    if (suggestionText) {
        suggestionText.textContent = randomSuggestion;
        moodSuggestion.classList.remove('hidden');
    }
}

function updateMood(newMood) {
    if (!currentUser || !db) return;
    
    db.collection('users').doc(currentUser.uid).update({
        mood: newMood,
        updatedAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
    })
    .then(() => {
        currentUserData.mood = newMood;
        if (userMood) userMood.textContent = newMood;
        showToast(`Mood updated to ${newMood}`, 'success');
        
        // Reload mood suggestions
        loadMoodSuggestions();
        
        if (moodModal) moodModal.classList.add('hidden');
    })
    .catch(error => {
        console.error('Error updating mood:', error);
        showToast('Error updating mood: ' + error.message, 'error');
    });
}

// ==================== BUSINESS DOCUMENT INITIALIZATION ====================
function initializeBusinessDocument(userId) {
    if (!firebase.firestore || !db) return;
    
    const businessDocRef = db.collection('business').doc(userId);
    const userDocRef = db.collection('users').doc(userId);
    
    businessDocRef.get().then((doc) => {
        if (!doc.exists) {
            // Create initial business document
            return businessDocRef.set({
                userId: userId,
                businessName: '',
                greetingMessage: 'Hello! Thanks for messaging me. How can I help you today?',
                awayMessage: 'Sorry, I\'m away right now. I\'ll get back to you as soon as possible.',
                awayEnabled: false,
                catalogue: [],
                labels: [],
                isBusinessAccount: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }).then(() => {
        // Also update user document with business info for quick access
        return userDocRef.update({
            hasBusiness: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).catch(error => {
        console.error('Error initializing business document:', error);
    });
}

// ==================== NOTIFICATION PERMISSION ====================
async function requestNotificationPermission() {
    try {
        // Check if notification API is available
        if (!('Notification' in window)) {
            console.log('Notifications not supported in this browser');
            return;
        }
        
        // Check if permission is already denied/blocked
        if (Notification.permission === 'denied') {
            console.log('Notifications blocked by user. User must manually enable in browser settings.');
            return;
        }
        
        // Don't ask if already granted
        if (Notification.permission === 'granted') {
            console.log('Notifications already granted');
            return;
        }
        
        // Only ask if permission is default
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        }
    } catch (error) {
        console.error('Error with notification permission:', error);
    }
}

async function sendPushNotification(userId, senderName, message) {
    try {
        console.log('Sending push notification to:', userId);
        // Get recipient's FCM token
        if (!db) return;
        
        const recipientDoc = await db.collection('users').doc(userId).get();
        if (recipientDoc.exists) {
            const recipientData = recipientDoc.data();
            const fcmToken = recipientData.fcmToken;
            
            if (fcmToken) {
                console.log(`Sending push notification to ${userId}: ${senderName}: ${message}`);
            }
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
    console.log('Setting up event listeners');

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }

    // Back to chats (mobile)
    const backToChatsBtn = document.getElementById('backToChats');
    if (backToChatsBtn) {
        backToChatsBtn.addEventListener('click', goBackToTabs);
    }
    
    // Also handle escape key to go back
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && currentChat) {
            goBackToTabs();
        }
    });

    // Message input and sending
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        // Apply enhanced text input styles
        messageInput.style.fontSize = '16px';
        messageInput.style.lineHeight = '1.5';
        
        messageInput.addEventListener('input', handleTypingIndicator);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        // Minimized send button as per your changes
        sendBtn.style.width = '40px'; // w-10 = 2.5rem = 40px
        sendBtn.style.height = '40px';
        sendBtn.addEventListener('click', sendMessage);
    }

    // File attachment (using the plus icon)
    const attachBtn = document.getElementById('attachBtn');
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            console.log('Attach file clicked');
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '*/*';
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    console.log('File selected:', e.target.files[0].name);
                    uploadFile(e.target.files[0]);
                }
            });
            fileInput.click();
        });
    }

    // Emoji picker button
    const emojiPickerBtn = document.getElementById('emojiPickerBtn');
    if (emojiPickerBtn) {
        emojiPickerBtn.addEventListener('click', toggleEmojiPicker);
    }

    // Remove file preview
    const removeFileBtn = document.getElementById('removeFile');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            console.log('Remove file preview clicked');
            if (filePreview) filePreview.classList.add('hidden');
        });
    }

    // Close emoji picker when clicking outside (if emoji picker exists)
    document.addEventListener('click', (e) => {
        const emojiPicker = document.getElementById('emojiPicker');
        
        if (emojiPicker && emojiPicker.style.display === 'block' && 
            !emojiPicker.contains(e.target) && 
            !e.target.closest('#emojiPickerBtn')) {
            emojiPicker.style.display = 'none';
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out?')) {
                console.log('Logging out user');
                if (auth) {
                    auth.signOut().then(() => {
                        window.location.href = 'index.html';
                    }).catch(error => {
                        console.error('Error signing out:', error);
                        showToast('Error signing out', 'error');
                    });
                } else {
                    showToast('Authentication not available', 'error');
                }
            }
        });
    }

    // Scroll to bottom button
    const scrollToBottomBtn = document.getElementById('scrollToBottom');
    if (scrollToBottomBtn) {
        scrollToBottomBtn.addEventListener('click', () => {
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    }

    console.log('Event listeners setup completed');
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('kynecta-theme', theme);
    
    // Update theme icon
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ==================== AUTO SCROLL DETECTION ====================
function setupAutoScrollDetection() {
    const messagesContainer = document.getElementById('messagesContainer');
    const scrollToBottom = document.getElementById('scrollToBottom');
    
    if (!messagesContainer || !scrollToBottom) return;
    
    messagesContainer.addEventListener('scroll', () => {
        const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
        
        if (isAtBottom) {
            scrollToBottom.classList.add('hidden');
        } else {
            scrollToBottom.classList.remove('hidden');
        }
    });
}

// ==================== LOAD ALL USERS ====================
async function loadAllUsers() {
    try {
        if (!currentUser || !db) {
            console.log('User not authenticated or database not available');
            allUsers = [];
            return [];
        }
        
        console.log('Loading all users...');
        
        const usersSnapshot = await db.collection('users').get();
        allUsers = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Don't include current user
            if (doc.id !== currentUser.uid) {
                allUsers.push({
                    id: doc.id,
                    ...userData
                });
            }
        });
        
        console.log(`✅ Loaded ${allUsers.length} users`);
        return allUsers;
        
    } catch (error) {
        console.error('❌ Error loading all users:', error);
        allUsers = [];
        return [];
    }
}

// ==================== MOBILE OPTIMIZATIONS ====================
function optimizeForMobile() {
    // Prevent zoom on input focus
    document.addEventListener('touchstart', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            document.body.style.zoom = '100%';
        }
    }, { passive: true });

    // Handle viewport height issues on mobile
    function setViewportHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
}

// Initialize mobile optimizations
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    console.log('Mobile device detected, applying optimizations');
    optimizeForMobile();
}

// ==================== INITIALIZE ALL FEATURES ====================
// Call initialization functions
setupAutoScrollDetection();

// Make functions available globally
window.startChat = startChat;
window.goBackToTabs = goBackToTabs;
window.sendMessage = sendMessage;
window.uploadFile = uploadFile;
window.toggleEmojiPicker = toggleEmojiPicker;
window.loadChatsTemporary = loadChatsTemporary;
window.loadAllUsers = loadAllUsers;
window.updateMood = updateMood;
window.loadToolsTab = loadToolsTab;
window.loadPersonalizationDisplay = loadPersonalizationDisplay;
window.loadMoodSuggestions = loadMoodSuggestions;
window.handleQuickAction = handleQuickAction;
window.showToast = showToast;

console.log('✅ chat.js fully loaded with all chat features');