// call.js - WebRTC Voice/Video Calling System for Kynecta - Complete Fixed Version
// Production Ready with All Features and Error Fixes

// Global state for call management
window.callState = {
    isCaller: false,
    isReceivingCall: false,
    callType: null,
    remoteUserId: null,
    callId: null,
    callStartTime: null,
    timerInterval: null,
    unsubscribers: [],
    currentUser: null,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isMuted: false,
    isVideoOff: false,
    isInCall: false,
    currentCamera: 'user',
    ringtoneUrl: null,
    audioContext: null,
    ringtoneSource: null,
    isInitialized: false,
    processedCallIds: new Set(),
    incomingCallTimeout: null,
    lastCallEndTime: null,
    currentCallDocument: null,
    
    // Enhanced features state
    onlineStatus: 'offline',
    isOnline: navigator.onLine,
    friendOnlineStatus: new Map(),
    missedCalls: [],
    pendingNotifications: [],
    callExpiryTimers: new Map(),
    statusListeners: [],
    networkListeners: [],
    cleanupIntervals: [],
    lastOnlineCheck: null,
    userPresenceDoc: null
};

// Call settings with WhatsApp-like timeouts
const CALL_SETTINGS = {
    CALL_TIMEOUT: 45000,
    RING_TIMEOUT: 30000,
    AWAY_TIMEOUT: 30000,
    OFFLINE_TIMEOUT: 10000,
    RECONNECT_DELAY: 5000,
    CLEANUP_INTERVAL: 300000,
    PRESENCE_INTERVAL: 30000,
    STATUS_CACHE_TTL: 60000
};

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ],
    iceCandidatePoolSize: 10
};

// ==================== INITIALIZATION ====================

// Initialize call system when user is authenticated
window.initializeCallSystem = function() {
    console.log('🔧 Initializing enhanced call system with all features...');
    
    if (window.callState.isInitialized) {
        console.log('ℹ️ Call system already initialized');
        return;
    }
    
    // Clean up any existing state first
    cleanupCallSystem();
    
    // Wait for Firebase to be available
    if (!window.firebase || !window.firebase.auth) {
        console.warn('Firebase not loaded yet, retrying in 1 second...');
        setTimeout(initializeCallSystem, 1000);
        return;
    }
    
    // Set up auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ User authenticated, setting up enhanced call system for:', user.uid);
            window.callState.currentUser = user;
            
            // Clear processed calls history for new session
            window.callState.processedCallIds.clear();
            
            // Setup enhanced features
            initializeOnlineStatusSystem(user.uid);
            setupNetworkMonitoring();
            setupPresenceTracking(user.uid);
            
            // Setup event listeners FIRST
            setupCallEventListeners();
            setupEnhancedEventListeners();
            
            // Then load other components
            loadUserPreferences();
            listenForIncomingCalls();
            setupMissedCallNotifications(user.uid);
            
            // Add buttons to DOM elements
            setTimeout(() => addCallButtonsToFriendList(), 1000);
            setTimeout(() => addCallButtonsToChat(), 2000);
            
            // Clean up any old calls for this user
            cleanupOldCalls(user.uid);
            
            // Start periodic tasks
            startPeriodicTasks(user.uid);
            
            window.callState.isInitialized = true;
            
            // Check for missed calls from offline period
            setTimeout(() => checkMissedCallsWhileOffline(user.uid), 3000);
            
        } else {
            console.log('❌ User not authenticated, cleaning up call system');
            cleanupCallSystem();
        }
    });
};

// ==================== ONLINE STATUS TRACKING SYSTEM ====================

// Initialize online status system
async function initializeOnlineStatusSystem(userId) {
    console.log('🌐 Initializing online status system for user:', userId);
    
    try {
        // Create user presence document if it doesn't exist
        const presenceRef = firebase.firestore().collection('userPresence').doc(userId);
        window.callState.userPresenceDoc = presenceRef;
        
        await presenceRef.set({
            userId: userId,
            onlineStatus: 'online',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            isAway: false,
            deviceInfo: {
                userAgent: navigator.userAgent.substring(0, 200),
                platform: navigator.platform,
                language: navigator.language
            },
            connectionType: getConnectionType(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        window.callState.onlineStatus = 'online';
        console.log('✅ Online status system initialized');
        
        // Listen for own status changes
        const statusUnsub = presenceRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                window.callState.onlineStatus = data.onlineStatus || 'offline';
                updateUIForOnlineStatus();
            }
        });
        
        window.callState.statusListeners.push(statusUnsub);
        
    } catch (error) {
        console.error('❌ Error initializing online status system:', error);
    }
}

// Setup network monitoring
function setupNetworkMonitoring() {
    console.log('📡 Setting up network monitoring');
    
    const handleOnline = async () => {
        console.log('🌐 Network is online');
        window.callState.isOnline = true;
        
        if (window.callState.currentUser) {
            // Update online status
            await updateOnlineStatus(window.callState.currentUser.uid, 'online');
            
            // Resume call listeners
            listenForIncomingCalls();
        }
    };
    
    const handleOffline = async () => {
        console.log('📵 Network is offline');
        window.callState.isOnline = false;
        
        if (window.callState.currentUser) {
            // Update online status
            await updateOnlineStatus(window.callState.currentUser.uid, 'offline');
            
            // Stop incoming call listeners
            cleanupCallListeners();
        }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    window.callState.networkListeners.push(
        { type: 'online', handler: handleOnline },
        { type: 'offline', handler: handleOffline }
    );
}

// Setup presence tracking
function setupPresenceTracking(userId) {
    console.log('👀 Setting up presence tracking');
    
    // Track visibility changes
    const handleVisibilityChange = () => {
        if (document.hidden) {
            // User switched tabs or minimized window
            setTimeout(async () => {
                if (document.hidden && window.callState.onlineStatus === 'online') {
                    console.log('⏰ User marked as away due to inactivity');
                    await updateOnlineStatus(userId, 'away');
                }
            }, CALL_SETTINGS.AWAY_TIMEOUT);
        } else {
            // User came back
            if (window.callState.onlineStatus === 'away') {
                console.log('👋 User returned, marking as online');
                updateOnlineStatus(userId, 'online');
            }
        }
    };
    
    // Track beforeunload for browser close
    const handleBeforeUnload = async () => {
        console.log('🚪 Browser closing, marking as offline');
        
        // Use sendBeacon for reliable offline marking
        if (navigator.sendBeacon) {
            const data = new Blob([JSON.stringify({
                userId: userId,
                status: 'offline',
                timestamp: new Date().toISOString()
            })], { type: 'application/json' });
            navigator.sendBeacon('/api/user-presence', data);
        }
        
        // Update Firestore
        await updateOnlineStatus(userId, 'offline');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    window.callState.statusListeners.push(
        { cleanup: () => document.removeEventListener('visibilitychange', handleVisibilityChange) },
        { cleanup: () => window.removeEventListener('beforeunload', handleBeforeUnload) }
    );
    
    // Periodic presence update
    const presenceInterval = setInterval(async () => {
        if (window.callState.currentUser && window.callState.onlineStatus === 'online') {
            await updatePresenceTimestamp(window.callState.currentUser.uid);
        }
    }, CALL_SETTINGS.PRESENCE_INTERVAL);
    
    window.callState.cleanupIntervals.push(presenceInterval);
}

// Update online status
async function updateOnlineStatus(userId, status) {
    try {
        if (!window.callState.userPresenceDoc) return;
        
        window.callState.onlineStatus = status;
        
        await window.callState.userPresenceDoc.update({
            onlineStatus: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            isAway: status === 'away',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Online status updated to: ${status}`);
        
    } catch (error) {
        console.error('❌ Error updating online status:', error);
    }
}

// Update presence timestamp
async function updatePresenceTimestamp(userId) {
    try {
        if (!window.callState.userPresenceDoc) return;
        
        await window.callState.userPresenceDoc.update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('❌ Error updating presence timestamp:', error);
    }
}

// Get connection type
function getConnectionType() {
    if (navigator.connection) {
        return navigator.connection.effectiveType || 'unknown';
    }
    return 'unknown';
}

// Update UI for online status
function updateUIForOnlineStatus() {
    // Update status indicator in UI if exists
    const statusIndicator = document.getElementById('userOnlineStatus');
    if (statusIndicator) {
        const statusText = {
            'online': '🟢 Online',
            'away': '🟡 Away',
            'offline': '⚫ Offline'
        };
        statusIndicator.textContent = statusText[window.callState.onlineStatus] || '⚫ Offline';
        statusIndicator.className = `online-status-indicator status-${window.callState.onlineStatus}`;
    }
}

// ==================== CALL EXPIRY SYSTEM ====================

// Setup call expiry system
function setupCallExpirySystem() {
    console.log('⏰ Setting up call expiry system');
    
    // Listen for call expiry
    const expiryCheckInterval = setInterval(() => {
        checkAndExpireCalls();
    }, 15000);
    
    window.callState.cleanupIntervals.push(expiryCheckInterval);
}

// Check and expire old calls
async function checkAndExpireCalls() {
    try {
        const now = new Date();
        const expiryThreshold = new Date(now.getTime() - CALL_SETTINGS.CALL_TIMEOUT);
        
        // Get calls that should have expired
        const expiredCalls = await firebase.firestore().collection('calls')
            .where('status', '==', 'ringing')
            .where('createdAt', '<', expiryThreshold)
            .limit(20)
            .get();
        
        const batch = firebase.firestore().batch();
        
        expiredCalls.forEach(doc => {
            const callData = doc.data();
            
            // Update call status to missed with expiry reason
            batch.update(doc.ref, {
                status: 'missed',
                missedReason: 'call_expired',
                expiresAt: firebase.firestore.FieldValue.serverTimestamp(),
                endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create missed call notification with FIXED receiverId
            if (callData.receiverId) {
                createMissedCallNotification({
                    callId: doc.id,
                    callerId: callData.callerId,
                    callerName: callData.callerName,
                    receiverId: callData.receiverId, // FIXED: Now properly defined
                    callType: callData.callType,
                    reason: 'call_expired',
                    timestamp: now
                });
            }
            
            // Clear any local expiry timer
            clearCallExpiryTimer(doc.id);
        });
        
        if (!expiredCalls.empty) {
            await batch.commit();
            console.log(`✅ Expired ${expiredCalls.size} calls`);
        }
        
    } catch (error) {
        console.error('❌ Error checking/expiring calls:', error);
    }
}

// Set call expiry timer
function setCallExpiryTimer(callId, timeout = CALL_SETTINGS.CALL_TIMEOUT) {
    // Clear existing timer
    clearCallExpiryTimer(callId);
    
    const timerId = setTimeout(async () => {
        try {
            const callDoc = await firebase.firestore().collection('calls').doc(callId).get();
            if (callDoc.exists && callDoc.data().status === 'ringing') {
                await firebase.firestore().collection('calls').doc(callId).update({
                    status: 'missed',
                    missedReason: 'call_expired',
                    expiresAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Create missed call notification with validation
                const callData = callDoc.data();
                if (callData.receiverId) {
                    await createMissedCallNotification({
                        callId: callId,
                        callerId: callData.callerId,
                        callerName: callData.callerName,
                        receiverId: callData.receiverId,
                        callType: callData.callType,
                        reason: 'call_expired',
                        timestamp: new Date()
                    });
                }
                
                // If this is our active call, end it
                if (window.callState.callId === callId && window.callState.isCaller) {
                    endCall();
                    showToast('Call expired - no answer', 'info');
                }
            }
        } catch (error) {
            console.error('❌ Error in call expiry timer:', error);
        }
        
        // Remove from timers
        window.callState.callExpiryTimers.delete(callId);
    }, timeout);
    
    window.callState.callExpiryTimers.set(callId, timerId);
}

// Clear call expiry timer
function clearCallExpiryTimer(callId) {
    if (window.callState.callExpiryTimers.has(callId)) {
        clearTimeout(window.callState.callExpiryTimers.get(callId));
        window.callState.callExpiryTimers.delete(callId);
    }
}

// ==================== OFFLINE BEHAVIOR ====================

// Check for missed calls while offline
async function checkMissedCallsWhileOffline(userId) {
    try {
        console.log('🔍 Checking for missed calls from offline period...');
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const missedCalls = await firebase.firestore().collection('calls')
            .where('receiverId', '==', userId)
            .where('status', '==', 'missed')
            .where('missedReason', '==', 'receiver_was_offline')
            .where('createdAt', '>', oneDayAgo)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (!missedCalls.empty) {
            console.log(`📞 Found ${missedCalls.size} missed calls from offline`);
            
            const missedCallGroups = new Map();
            
            missedCalls.forEach(doc => {
                const callData = doc.data();
                const callerId = callData.callerId;
                
                if (!missedCallGroups.has(callerId)) {
                    missedCallGroups.set(callerId, {
                        callerName: callData.callerName || 'Unknown',
                        count: 0,
                        lastCall: callData.createdAt,
                        calls: []
                    });
                }
                
                const group = missedCallGroups.get(callerId);
                group.count++;
                group.calls.push({
                    id: doc.id,
                    ...callData
                });
                
                if (callData.createdAt > group.lastCall) {
                    group.lastCall = callData.createdAt;
                }
            });
            
            // Show notifications
            missedCallGroups.forEach((group, callerId) => {
                let message;
                if (group.count === 1) {
                    message = `You missed a call from ${group.callerName} while you were offline`;
                } else {
                    message = `You missed ${group.count} calls from ${group.callerName} while you were offline`;
                }
                
                showToast(message, 'warning', 8000);
                
                // Store in local missed calls
                group.calls.forEach(call => {
                    window.callState.missedCalls.push({
                        id: call.id,
                        callerId: call.callerId,
                        callerName: call.callerName,
                        callType: call.callType,
                        timestamp: call.createdAt?.toDate?.() || new Date(),
                        reason: call.missedReason,
                        read: false
                    });
                });
            });
            
            // Update UI
            updateMissedCallsUI();
        }
        
    } catch (error) {
        console.error('❌ Error checking missed calls:', error);
    }
}

// ==================== MISSED CALL NOTIFICATIONS ====================

// Setup missed call notifications
function setupMissedCallNotifications(userId) {
    console.log('🔔 Setting up missed call notifications');
    
    const notificationsUnsub = firebase.firestore().collection('notifications')
        .where('userId', '==', userId)
        .where('type', '==', 'missed_call')
        .where('read', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    handleNewMissedCallNotification(notification);
                }
            });
        }, (error) => {
            console.error('❌ Error in missed call notifications:', error);
        });
    
    window.callState.unsubscribers.push(notificationsUnsub);
}

// Handle new missed call notification
function handleNewMissedCallNotification(notification) {
    console.log('📢 New missed call notification:', notification);
    
    // Show toast
    showToast(notification.message, 'warning', 5000);
    
    // Add to local state
    if (notification.data) {
        window.callState.missedCalls.push({
            id: notification.id,
            callerId: notification.data.callerId,
            callerName: notification.data.callerName,
            callType: notification.data.callType,
            timestamp: notification.data.timestamp?.toDate?.() || new Date(),
            reason: notification.data.reason,
            read: false
        });
    }
    
    // Update UI
    updateMissedCallsUI();
    
    // Mark as read
    firebase.firestore().collection('notifications').doc(notification.id).update({
        read: true,
        readAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(console.error);
}

// Create missed call notification - FIXED VERSION
async function createMissedCallNotification(callData) {
    try {
        // Validate required fields
        if (!callData.receiverId) {
            console.error('❌ Missing receiverId for missed call notification');
            return null;
        }
        
        const notificationId = `missed_${callData.callId || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const notification = {
            id: notificationId,
            userId: callData.receiverId, // FIXED: Now properly validated
            type: 'missed_call',
            title: 'Missed Call',
            message: `Missed ${callData.callType || 'call'} from ${callData.callerName || 'Unknown'}`,
            data: {
                callId: callData.callId || '',
                callerId: callData.callerId || '',
                callerName: callData.callerName || 'Unknown',
                callType: callData.callType || 'voice',
                reason: callData.reason || 'unknown',
                timestamp: callData.timestamp || new Date()
            },
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: {
                source: 'call_system',
                version: '1.0'
            }
        };
        
        await firebase.firestore().collection('notifications')
            .doc(notificationId)
            .set(notification);
        
        console.log('✅ Created missed call notification:', notificationId);
        
        return notificationId;
        
    } catch (error) {
        console.error('❌ Error creating missed call notification:', error);
        return null;
    }
}

// Update missed calls UI
function updateMissedCallsUI() {
    // Update badge count if exists
    const badge = document.getElementById('missedCallsBadge');
    if (badge) {
        const unreadCount = window.callState.missedCalls.filter(call => !call.read).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Update missed calls list if open
    updateMissedCallsList();
}

// Update missed calls list
function updateMissedCallsList() {
    const listContainer = document.getElementById('missedCallsList');
    if (!listContainer) return;
    
    // Sort by timestamp (newest first)
    const sortedCalls = [...window.callState.missedCalls].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    listContainer.innerHTML = '';
    
    sortedCalls.forEach(call => {
        const callElement = document.createElement('div');
        callElement.className = `missed-call-item ${call.read ? 'read' : 'unread'}`;
        callElement.innerHTML = `
            <div class="missed-call-icon">
                ${call.callType === 'video' ? '📹' : '📞'}
            </div>
            <div class="missed-call-details">
                <div class="missed-call-name">${call.callerName}</div>
                <div class="missed-call-time">${formatTimeAgo(call.timestamp)}</div>
                <div class="missed-call-reason">${getMissedCallReasonText(call.reason)}</div>
            </div>
            <div class="missed-call-actions">
                <button class="call-back-btn" data-user-id="${call.callerId}">
                    Call Back
                </button>
            </div>
        `;
        
        listContainer.appendChild(callElement);
    });
}

// Get missed call reason text
function getMissedCallReasonText(reason) {
    const reasons = {
        'call_expired': 'Call expired',
        'receiver_was_offline': 'You were offline',
        'no_answer': 'No answer',
        'rejected': 'Rejected',
        'auto_cleanup': 'System cleanup'
    };
    return reasons[reason] || 'Missed call';
}

// ==================== SMART CALL HANDLING ====================

// Check friend online status
async function checkFriendOnlineStatus(friendId) {
    try {
        // Check cache first
        if (window.callState.friendOnlineStatus.has(friendId)) {
            const cached = window.callState.friendOnlineStatus.get(friendId);
            if (Date.now() - cached.timestamp < CALL_SETTINGS.STATUS_CACHE_TTL) {
                return cached.status;
            }
        }
        
        // Get from Firestore
        const presenceDoc = await firebase.firestore().collection('userPresence').doc(friendId).get();
        
        if (presenceDoc.exists) {
            const data = presenceDoc.data();
            const status = data.onlineStatus || 'offline';
            const isAway = data.isAway || false;
            
            // Update cache
            window.callState.friendOnlineStatus.set(friendId, {
                status: isAway ? 'away' : status,
                timestamp: Date.now(),
                lastSeen: data.lastSeen
            });
            
            return isAway ? 'away' : status;
        }
        
        return 'offline';
        
    } catch (error) {
        console.error('❌ Error checking friend status:', error);
        return 'offline';
    }
}

// Confirm call to offline friend
async function confirmCallToOfflineFriend(friendName, friendStatus) {
    return new Promise((resolve) => {
        if (friendStatus === 'online') {
            resolve(true);
            return;
        }
        
        // Create confirmation modal
        const modalId = 'offlineCallConfirmModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                backdrop-filter: blur(4px);
            `;
            
            document.body.appendChild(modal);
        }
        
        const statusText = friendStatus === 'away' ? 'is away' : 'is offline';
        const message = friendStatus === 'away' 
            ? `${friendName} is away. They may not answer immediately.`
            : `${friendName} is offline. They will receive a missed call notification.`;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 24px;
                border-radius: 16px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background: ${friendStatus === 'offline' ? '#9CA3AF' : '#F59E0B'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 16px;
                        font-size: 24px;
                    ">
                        ${friendStatus === 'offline' ? '⚫' : '🟡'}
                    </div>
                    <div>
                        <h3 style="
                            font-size: 18px;
                            font-weight: bold;
                            color: #1F2937;
                            margin: 0 0 4px 0;
                        ">
                            ${friendName} ${statusText}
                        </h3>
                        <p style="
                            color: #6B7280;
                            margin: 0;
                            font-size: 14px;
                        ">
                            ${message}
                        </p>
                    </div>
                </div>
                
                <p style="
                    color: #4B5563;
                    margin-bottom: 24px;
                    line-height: 1.5;
                ">
                    Do you want to call anyway? They will receive a notification.
                </p>
                
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                ">
                    <button id="cancelOfflineCallBtn" style="
                        padding: 10px 20px;
                        border: 1px solid #D1D5DB;
                        border-radius: 8px;
                        background: white;
                        color: #4B5563;
                        font-weight: 500;
                        cursor: pointer;
                    ">
                        Cancel
                    </button>
                    <button id="confirmOfflineCallBtn" style="
                        padding: 10px 20px;
                        border: none;
                        border-radius: 8px;
                        background: #3B82F6;
                        color: white;
                        font-weight: 500;
                        cursor: pointer;
                    ">
                        Call Anyway
                    </button>
                </div>
            </div>
        `;
        
        // Handle button clicks
        document.getElementById('cancelOfflineCallBtn').onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        
        document.getElementById('confirmOfflineCallBtn').onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
    });
}

// Enhanced start call with smart handling
window.startCall = async function(friendId, friendName, callType = 'voice') {
    console.log('📞 Starting smart call with:', friendName, friendId, 'Type:', callType);
    
    // Prevent multiple calls
    if (window.callState.isInCall) {
        console.warn('❌ Already in a call, cannot start new call');
        showToast('You are already in a call', 'warning');
        return;
    }
    
    // Prevent calling yourself
    if (window.callState.currentUser && friendId === window.callState.currentUser.uid) {
        showToast('You cannot call yourself', 'warning');
        return;
    }
    
    // Check if we're online
    if (!window.callState.isOnline) {
        showToast('You are offline. Please check your connection.', 'error');
        return;
    }
    
    // Check friend online status
    const friendStatus = await checkFriendOnlineStatus(friendId);
    console.log(`📱 Friend ${friendName} status: ${friendStatus}`);
    
    // Ask for confirmation if friend is not online
    if (friendStatus !== 'online') {
        const shouldProceed = await confirmCallToOfflineFriend(friendName, friendStatus);
        if (!shouldProceed) {
            console.log('❌ Call cancelled by user');
            return;
        }
    }
    
    // Validate parameters
    if (!friendId || !friendName) {
        console.error('❌ Missing friendId or friendName');
        showToast('Cannot start call: missing contact information', 'error');
        return;
    }
    
    if (!window.callState.currentUser) {
        console.error('❌ User not authenticated');
        showToast('Please log in to make calls', 'error');
        return;
    }
    
    // Check if we have a recent call end
    if (window.callState.lastCallEndTime && Date.now() - window.callState.lastCallEndTime < 2000) {
        console.log('⏳ Too soon after previous call, waiting...');
        setTimeout(() => window.startCall(friendId, friendName, callType), 2000);
        return;
    }
    
    try {
        // Set call state
        window.callState.isCaller = true;
        window.callState.remoteUserId = friendId;
        window.callState.callType = callType;
        window.callState.isInCall = true;
        
        // Generate unique call ID
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        window.callState.callId = callId;
        
        console.log('🆔 Call ID generated:', callId);
        
        // Create call document in Firestore with enhanced structure
        const callDocRef = firebase.firestore().collection('calls').doc(callId);
        window.callState.currentCallDocument = callDocRef;
        
        const expiresAt = new Date(Date.now() + CALL_SETTINGS.CALL_TIMEOUT);
        
        await callDocRef.set({
            callId: callId,
            callerId: window.callState.currentUser.uid,
            callerName: window.currentUserData?.displayName || window.callState.currentUser.displayName || 'Unknown User',
            receiverId: friendId,
            callType: callType,
            status: 'ringing',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            callerCandidates: [],
            receiverCandidates: [],
            metadata: {
                callerOnlineStatus: window.callState.onlineStatus,
                receiverOnlineStatus: friendStatus,
                platform: navigator.platform,
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: Date.now()
            },
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Enhanced call document created with expiry:', expiresAt);
        
        // Set call expiry timer
        setCallExpiryTimer(callId, CALL_SETTINGS.CALL_TIMEOUT);
        
        // Get local media stream
        await getLocalMediaStream(callType);
        
        // Create peer connection
        await createPeerConnection();
        
        // Create and send offer
        await createAndSendOffer(callId);
        
        // Show call UI with status indicator
        showCallUI(friendName, callType, 'calling');
        
        // Update status with friend's online status
        updateCallStatus(`Calling ${friendName}... (${getStatusText(friendStatus)})`);
        
        // Start ringtone for outgoing call
        playRingtone();
        
        // Set timeout to end call if no answer (backup to Firestore expiry)
        setTimeout(() => {
            if (window.callState.isInCall && window.callState.isCaller) {
                console.log('⏰ Local call timeout - no answer');
                endCall();
                showToast('No answer', 'info');
            }
        }, CALL_SETTINGS.CALL_TIMEOUT + 5000);
        
        console.log('✅ Smart call initiation complete');
        
    } catch (error) {
        console.error('❌ Error starting call:', error);
        showToast('Failed to start call: ' + error.message, 'error');
        cleanupCallState();
    }
};

// Get status text
function getStatusText(status) {
    const statusMap = {
        'online': '🟢 Online',
        'away': '🟡 Away',
        'offline': '⚫ Offline'
    };
    return statusMap[status] || 'Unknown';
}

// ==================== ENHANCED EVENT LISTENERS ====================

// Setup enhanced event listeners
function setupEnhancedEventListeners() {
    console.log('🔧 Setting up enhanced event listeners');
    
    // Remove existing listeners if any
    cleanupEnhancedListeners();
    
    // Setup page visibility for call handling
    document.addEventListener('visibilitychange', handleEnhancedVisibilityChange);
    
    // Store handlers
    window.callState.statusListeners.push(
        { cleanup: () => document.removeEventListener('visibilitychange', handleEnhancedVisibilityChange) }
    );
}

// Handle enhanced visibility change
function handleEnhancedVisibilityChange() {
    if (document.hidden) {
        console.log('📱 Page hidden, managing call resources...');
        
        // If in call, show notification
        if (window.callState.isInCall) {
            showToast('Call continues in background', 'info', 2000);
        }
        
        // Pause media if not in call
        if (!window.callState.isInCall && !window.callState.isReceivingCall) {
            stopRingtone();
        }
        
    } else {
        console.log('📱 Page visible, resuming...');
        
        // Refresh call listeners
        if (window.callState.currentUser && !window.callState.isInCall) {
            setTimeout(() => {
                listenForIncomingCalls();
            }, 1000);
        }
    }
}

// ==================== ENHANCED INCOMING CALL HANDLING ====================

// Enhanced listen for incoming calls
window.listenForIncomingCalls = function() {
    console.log('👂 Enhanced listening for incoming calls');
    
    if (!window.callState.currentUser) {
        console.warn('❌ No current user, cannot listen for calls');
        return;
    }
    
    // Don't listen if we're offline
    if (!window.callState.isOnline) {
        console.warn('📵 Skipping incoming call listener - offline');
        return;
    }
    
    // Clean up any existing listeners first
    cleanupCallListeners();
    
    const incomingCallsUnsub = firebase.firestore().collection('calls')
        .where('receiverId', '==', window.callState.currentUser.uid)
        .where('status', 'in', ['ringing', 'answered'])
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const callData = change.doc.data();
                    const callId = callData.callId;
                    
                    // Skip if already processed
                    if (window.callState.processedCallIds.has(callId)) {
                        return;
                    }
                    
                    const callAge = Date.now() - (callData.createdAt?.toDate?.()?.getTime() || Date.now());
                    
                    // Skip old calls (older than call timeout + buffer)
                    if (callAge > CALL_SETTINGS.CALL_TIMEOUT + 10000) {
                        console.log('⏰ Skipping very old call:', callId, 'Age:', callAge + 'ms');
                        window.callState.processedCallIds.add(callId);
                        return;
                    }
                    
                    console.log('📞 Incoming call detected:', callData.callerName, 'Status:', callData.status, 'Age:', callAge + 'ms');
                    
                    // Handle ringing calls
                    if (callData.status === 'ringing' && !window.callState.isInCall) {
                        // Mark as processed
                        window.callState.processedCallIds.add(callId);
                        
                        // Clear any expiry timer
                        clearCallExpiryTimer(callId);
                        
                        // Show incoming call popup
                        showIncomingCallPopup(callData.callerName, callData.callType, callId, callData.callerId);
                        
                        // Set auto-reject timeout
                        if (window.callState.incomingCallTimeout) {
                            clearTimeout(window.callState.incomingCallTimeout);
                        }
                        
                        window.callState.incomingCallTimeout = setTimeout(() => {
                            if (window.callState.isReceivingCall && window.callState.callId === callId) {
                                console.log('⏰ Auto-rejecting incoming call after timeout');
                                rejectCall(callId, 'no_answer');
                            }
                        }, CALL_SETTINGS.RING_TIMEOUT);
                    }
                    
                    // Handle answered calls that we missed
                    if (callData.status === 'answered' && !window.callState.isInCall && callAge > 10000) {
                        window.callState.processedCallIds.add(callId);
                    }
                }
            });
        }, (error) => {
            console.error('❌ Error in enhanced incoming calls listener:', error);
            
            // Handle offline scenario
            if (error.code === 'unavailable' || error.code === 'failed-precondition') {
                console.warn('📵 Firestore unavailable, may be offline');
                window.callState.isOnline = false;
            }
        });
    
    window.callState.unsubscribers.push(incomingCallsUnsub);
};

// Enhanced accept call
window.acceptCall = async function(callId, callerId, callType) {
    console.log('✅ Enhanced accepting call:', callId);
    
    if (!callId || !callerId) {
        console.error('❌ Missing callId or callerId');
        return;
    }
    
    // Prevent accepting if already in a call
    if (window.callState.isInCall) {
        console.warn('⚠️ Already in a call');
        showToast('You are already in a call', 'warning');
        return;
    }
    
    // Check if we're online
    if (!window.callState.isOnline) {
        showToast('You are offline. Cannot accept calls.', 'error');
        return;
    }
    
    try {
        window.callState.isCaller = false;
        window.callState.remoteUserId = callerId;
        window.callState.callId = callId;
        window.callState.callType = callType;
        window.callState.isInCall = true;
        
        // Mark as processed
        window.callState.processedCallIds.add(callId);
        
        // Clear call expiry
        clearCallExpiryTimer(callId);
        
        // Clear incoming call timeout
        if (window.callState.incomingCallTimeout) {
            clearTimeout(window.callState.incomingCallTimeout);
            window.callState.incomingCallTimeout = null;
        }
        
        // Hide incoming popup
        hideIncomingCallPopup();
        
        // Get local media
        await getLocalMediaStream(callType);
        
        // Create peer connection
        await createPeerConnection();
        
        // Get call data and set remote description
        const callDoc = await firebase.firestore().collection('calls').doc(callId).get();
        if (callDoc.exists) {
            const callData = callDoc.data();
            
            if (callData.offer) {
                await window.callState.peerConnection.setRemoteDescription(callData.offer);
                
                // Create and send answer
                const answer = await window.callState.peerConnection.createAnswer();
                await window.callState.peerConnection.setLocalDescription(answer);
                
                await firebase.firestore().collection('calls').doc(callId).update({
                    answer: answer,
                    status: 'answered',
                    expiresAt: null,
                    connectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    metadata: {
                        ...callData.metadata,
                        acceptedAt: Date.now(),
                        receiverOnlineStatus: window.callState.onlineStatus,
                        connectionEstablished: true
                    }
                });
                
                console.log('✅ Answer sent, call accepted');
                
                // Set up listeners for ICE candidates
                setupAnswerListeners(callId);
                
                // Show call UI
                showCallUI(callData.callerName, callType, 'connected');
                startCallTimer();
                
                // Update status
                updateCallStatus(`Connected with ${callData.callerName}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error accepting call:', error);
        showToast('Failed to accept call: ' + error.message, 'error');
        
        // Mark call as failed
        if (callId) {
            await firebase.firestore().collection('calls').doc(callId).update({
                status: 'failed',
                failedReason: 'accept_error',
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        cleanupCallState();
    }
};

// Enhanced reject call
window.rejectCall = async function(callId, reason = 'rejected') {
    console.log('❌ Enhanced rejecting call:', callId, 'Reason:', reason);
    
    try {
        await firebase.firestore().collection('calls').doc(callId).update({
            status: 'missed',
            missedReason: reason,
            endedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            metadata: {
                rejectedAt: Date.now(),
                rejectReason: reason,
                rejectedBy: window.callState.currentUser?.uid
            }
        });
        
        // Create missed call notification for caller
        const callDoc = await firebase.firestore().collection('calls').doc(callId).get();
        if (callDoc.exists) {
            const callData = callDoc.data();
            
            // Only create notification if we're not the caller
            if (callData.callerId !== window.callState.currentUser?.uid) {
                await createMissedCallNotification({
                    callId: callId,
                    callerId: callData.callerId,
                    callerName: callData.callerName,
                    receiverId: callData.receiverId,
                    callType: callData.callType,
                    reason: reason,
                    timestamp: new Date()
                });
            }
        }
        
        hideIncomingCallPopup();
        cleanupCallState();
        showToast('Call rejected', 'info');
        
    } catch (error) {
        console.error('❌ Error rejecting call:', error);
        hideIncomingCallPopup();
        cleanupCallState();
        showToast('Call rejected', 'info');
    }
};

// ==================== ENHANCED CALL ENDING ====================

// Enhanced end call
window.endCall = async function(reason = 'ended_by_user') {
    console.log('📞 Enhanced ending call, reason:', reason);
    
    const callId = window.callState.callId;
    if (!callId) {
        console.warn('⚠️ No active call to end');
        return;
    }
    
    try {
        const endData = {
            status: 'ended',
            endedBy: window.callState.currentUser?.uid || 'unknown',
            endedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            metadata: {
                endedReason: reason,
                endedAt: Date.now(),
                endedByOnlineStatus: window.callState.onlineStatus,
                duration: window.callState.callStartTime ? Date.now() - window.callState.callStartTime : 0
            }
        };
        
        // Add duration if call was connected
        if (window.callState.callStartTime) {
            endData.duration = Date.now() - window.callState.callStartTime;
        }
        
        await firebase.firestore().collection('calls').doc(callId).update(endData);
        
        // Clear call expiry
        clearCallExpiryTimer(callId);
        
    } catch (error) {
        console.error('❌ Error updating call end status:', error);
    }
    
    // Set last call end time
    window.callState.lastCallEndTime = Date.now();
    
    hideCallUI();
    cleanupCallState();
    
    // Show appropriate message
    if (reason === 'ended_by_user') {
        showToast('Call ended', 'info');
    }
};

// ==================== PERIODIC TASKS ====================

// Start periodic tasks
function startPeriodicTasks(userId) {
    console.log('⏱️ Starting periodic tasks');
    
    // Call expiry check
    const expiryInterval = setInterval(() => {
        checkAndExpireCalls();
    }, 30000); // Every 30 seconds instead of 15 to reduce load
    
    // Cleanup old data
    const cleanupInterval = setInterval(() => {
        cleanupOldCalls(userId);
        cleanupOldNotifications();
    }, CALL_SETTINGS.CLEANUP_INTERVAL);
    
    // Update friend status cache
    const statusUpdateInterval = setInterval(() => {
        updateFriendStatusCache();
    }, 120000); // Every 2 minutes
    
    window.callState.cleanupIntervals.push(expiryInterval, cleanupInterval, statusUpdateInterval);
}

// Update friend status cache
function updateFriendStatusCache() {
    // Clear old cache entries
    const now = Date.now();
    const ttl = CALL_SETTINGS.STATUS_CACHE_TTL;
    
    window.callState.friendOnlineStatus.forEach((data, friendId) => {
        if (now - data.timestamp > ttl) {
            window.callState.friendOnlineStatus.delete(friendId);
        }
    });
}

// Enhanced cleanup old calls
async function cleanupOldCalls(userId) {
    try {
        console.log('🧹 Enhanced cleaning up old calls');
        
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Clean up very old calls
        const oldCalls = await firebase.firestore().collection('calls')
            .where('createdAt', '<', oneWeekAgo)
            .limit(50)
            .get();
            
        const deletePromises = [];
        
        oldCalls.forEach((doc) => {
            // Only delete if call is ended or missed
            const data = doc.data();
            if (data.status === 'ended' || data.status === 'missed' || data.status === 'failed') {
                deletePromises.push(doc.ref.delete());
            }
        });
        
        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log(`🧹 Deleted ${deletePromises.length} old calls`);
        }
        
    } catch (error) {
        console.error('❌ Error in enhanced cleanup:', error);
    }
}

// Cleanup old notifications
async function cleanupOldNotifications() {
    try {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const oldNotifications = await firebase.firestore().collection('notifications')
            .where('createdAt', '<', oneMonthAgo)
            .limit(100)
            .get();
            
        const deletePromises = [];
        
        oldNotifications.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log(`🧹 Deleted ${deletePromises.length} old notifications`);
        }
        
    } catch (error) {
        console.error('❌ Error cleaning up notifications:', error);
    }
}

// ==================== ENHANCED UI FUNCTIONS ====================

// Enhanced add call buttons with online status
window.addCallButtonsToFriendList = function() {
    console.log('🔧 Adding enhanced call buttons to friend list');
    
    const maxAttempts = 5; // Reduced from 10
    let attempts = 0;
    
    const tryAddButtons = () => {
        attempts++;
        
        // Try multiple selectors for friend items
        const selectors = [
            '.friend-item', 
            '.user-item', 
            '[data-user-id]',
            '[data-friend-id]',
            '[data-uid]'
        ];
        
        let friendItems = [];
        selectors.forEach(selector => {
            try {
                const items = document.querySelectorAll(selector);
                if (items.length > 0) {
                    friendItems = [...friendItems, ...Array.from(items)];
                }
            } catch (error) {
                console.warn('⚠️ Error querying selector:', selector, error);
            }
        });
        
        // Remove duplicates
        friendItems = friendItems.filter((item, index, self) => 
            self.findIndex(i => i === item) === index
        );
        
        console.log(`👥 Found ${friendItems.length} friend items on attempt ${attempts}`);
        
        if (friendItems.length > 0) {
            let buttonsAdded = 0;
            
            friendItems.forEach(async (item, index) => {
                try {
                    const userId = item.dataset.userId || item.dataset.friendId || item.dataset.uid;
                    
                    if (!userId) {
                        console.warn(`No user ID found for item ${index}`);
                        return;
                    }
                    
                    // Skip if it's the current user
                    if (window.callState.currentUser && userId === window.callState.currentUser.uid) {
                        return;
                    }
                    
                    // Check if buttons already exist
                    if (item.querySelector('.enhanced-call-buttons-container')) {
                        return;
                    }
                    
                    // Get user name
                    let userName = 'Friend';
                    const nameSelectors = [
                        '.friend-name',
                        '.user-name',
                        '.username',
                        '.name'
                    ];
                    
                    for (const selector of nameSelectors) {
                        const nameEl = item.querySelector(selector);
                        if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
                            userName = nameEl.textContent.trim();
                            break;
                        }
                    }
                    
                    // Ensure user ID is set on the element
                    if (!item.dataset.userId) {
                        item.dataset.userId = userId;
                    }
                    
                    // Get online status
                    const status = await checkFriendOnlineStatus(userId);
                    
                    // Create enhanced call buttons container
                    const buttonsContainer = document.createElement('div');
                    buttonsContainer.className = 'enhanced-call-buttons-container flex items-center space-x-2 ml-auto';
                    
                    // Online status badge
                    const statusBadge = document.createElement('div');
                    statusBadge.className = `online-status-badge status-${status} mr-2`;
                    statusBadge.innerHTML = getStatusBadgeHTML(status);
                    statusBadge.title = `${userName} is ${status}`;
                    
                    // Voice call button
                    const voiceCallBtn = document.createElement('button');
                    voiceCallBtn.className = `voice-call-btn w-8 h-8 ${status === 'online' ? 'bg-green-500 hover:bg-green-600' : 'bg-green-400 hover:bg-green-500'} text-white rounded-full flex items-center justify-center transition-colors cursor-pointer`;
                    voiceCallBtn.innerHTML = '📞';
                    voiceCallBtn.title = `Voice call ${userName} (${status})`;
                    voiceCallBtn.dataset.userId = userId;
                    voiceCallBtn.dataset.userName = userName;
                    voiceCallBtn.dataset.status = status;
                    
                    // Video call button
                    const videoCallBtn = document.createElement('button');
                    videoCallBtn.className = `video-call-btn w-8 h-8 ${status === 'online' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-400 hover:bg-blue-500'} text-white rounded-full flex items-center justify-center transition-colors cursor-pointer`;
                    videoCallBtn.innerHTML = '📹';
                    videoCallBtn.title = `Video call ${userName} (${status})`;
                    videoCallBtn.dataset.userId = userId;
                    videoCallBtn.dataset.userName = userName;
                    videoCallBtn.dataset.status = status;
                    
                    buttonsContainer.appendChild(statusBadge);
                    buttonsContainer.appendChild(voiceCallBtn);
                    buttonsContainer.appendChild(videoCallBtn);
                    
                    // Add to friend item
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.justifyContent = 'space-between';
                    item.appendChild(buttonsContainer);
                    
                    buttonsAdded++;
                    console.log(`✅ Added enhanced call buttons to: ${userName} (${userId}) - ${status}`);
                    
                } catch (error) {
                    console.warn('⚠️ Error adding enhanced buttons to friend item:', error);
                }
            });
            
            console.log(`🎉 Successfully added enhanced call buttons to ${buttonsAdded} friends`);
            
        } else if (attempts < maxAttempts) {
            console.log(`⏳ No friend items found, retrying in 1 second... (${attempts}/${maxAttempts})`);
            setTimeout(tryAddButtons, 1000);
        } else {
            console.log('ℹ️ No friend items found after attempts');
        }
    };
    
    tryAddButtons();
};

// Get status badge HTML
function getStatusBadgeHTML(status) {
    const badges = {
        'online': '<span class="status-dot" style="width: 8px; height: 8px; background: #10B981; border-radius: 50%; display: inline-block;"></span>',
        'away': '<span class="status-dot" style="width: 8px; height: 8px; background: #F59E0B; border-radius: 50%; display: inline-block;"></span>',
        'offline': '<span class="status-dot" style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; display: inline-block;"></span>'
    };
    return badges[status] || badges.offline;
}

// Enhanced show call UI with status
function showCallUI(recipientName, callType, status = 'calling') {
    console.log('🖥️ Showing enhanced call UI for:', recipientName, 'Status:', status);
    
    const callContainer = document.getElementById('callContainer');
    const callStatus = document.getElementById('callStatus');
    const remoteVideo = document.getElementById('remoteVideo');
    const localVideo = document.getElementById('localVideo');
    const callTimer = document.getElementById('callTimer');
    
    if (callContainer) {
        callContainer.style.display = 'flex';
        callContainer.style.zIndex = '10000';
    }
    
    if (callStatus) {
        if (status === 'calling') {
            callStatus.textContent = `Calling ${recipientName}...`;
        } else if (status === 'connected') {
            callStatus.textContent = `Connected with ${recipientName}`;
        } else {
            callStatus.textContent = `Call with ${recipientName}`;
        }
    }
    
    if (callTimer) {
        callTimer.textContent = '00:00';
        callTimer.style.display = status === 'connected' ? 'block' : 'none';
    }
    
    if (callType === 'video') {
        if (remoteVideo) {
            remoteVideo.style.display = 'block';
            remoteVideo.style.backgroundColor = '#000';
        }
        if (localVideo) {
            localVideo.style.display = 'block';
            localVideo.style.position = 'absolute';
            localVideo.style.bottom = '20px';
            localVideo.style.right = '20px';
            localVideo.style.width = '120px';
            localVideo.style.height = '90px';
            localVideo.style.borderRadius = '8px';
            localVideo.style.border = '2px solid white';
            localVideo.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        }
    } else {
        if (remoteVideo) remoteVideo.style.display = 'none';
        if (localVideo) localVideo.style.display = 'none';
    }
    
    // Update call controls based on call type
    const toggleCameraBtn = document.getElementById('toggleCameraBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    
    if (toggleCameraBtn) {
        toggleCameraBtn.style.display = callType === 'video' ? 'flex' : 'none';
    }
    
    if (switchCameraBtn) {
        switchCameraBtn.style.display = callType === 'video' ? 'flex' : 'none';
    }
}

// ==================== ENHANCED CLEANUP ====================

// Cleanup enhanced listeners
function cleanupEnhancedListeners() {
    if (window.callState.statusListeners) {
        window.callState.statusListeners.forEach(listener => {
            if (listener.cleanup && typeof listener.cleanup === 'function') {
                try {
                    listener.cleanup();
                } catch (error) {
                    console.warn('⚠️ Error cleaning up enhanced listener:', error);
                }
            }
        });
        window.callState.statusListeners = [];
    }
    
    if (window.callState.networkListeners) {
        window.callState.networkListeners.forEach(({ type, handler }) => {
            try {
                window.removeEventListener(type, handler);
            } catch (error) {
                console.warn('⚠️ Error removing network listener:', error);
            }
        });
        window.callState.networkListeners = [];
    }
}

// Enhanced cleanup call system
function cleanupCallSystem() {
    console.log('🧹 Enhanced cleaning up entire call system');
    
    // Clean up enhanced listeners
    cleanupEnhancedListeners();
    
    // Clear all intervals
    if (window.callState.cleanupIntervals) {
        window.callState.cleanupIntervals.forEach(interval => {
            clearInterval(interval);
        });
        window.callState.cleanupIntervals = [];
    }
    
    // Clear all expiry timers
    if (window.callState.callExpiryTimers) {
        window.callState.callExpiryTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        window.callState.callExpiryTimers.clear();
    }
    
    // Clean up call state
    cleanupCallState();
    
    // Reset enhanced state
    window.callState.onlineStatus = 'offline';
    window.callState.isOnline = navigator.onLine;
    window.callState.friendOnlineStatus.clear();
    window.callState.missedCalls = [];
    window.callState.pendingNotifications = [];
    window.callState.statusListeners = [];
    window.callState.networkListeners = [];
    window.callState.cleanupIntervals = [];
    window.callState.lastOnlineCheck = null;
    window.callState.userPresenceDoc = null;
    window.callState.currentUser = null;
    window.callState.isInitialized = false;
    
    console.log('✅ Enhanced call system cleanup complete');
}

// ==================== HELPER FUNCTIONS ====================

// Format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// Setup call event listeners
function setupCallEventListeners() {
    console.log('🔧 Setting up call event listeners');
    
    // Remove any existing listeners first
    document.removeEventListener('click', handleCallButtonClicks);
    
    // Add main click handler for ALL call buttons
    document.addEventListener('click', handleCallButtonClicks);
    
    // Setup user interaction detection for audio
    document.addEventListener('click', () => {
        window.userInteracted = true;
        if (window.callState.audioContext && window.callState.audioContext.state === 'suspended') {
            window.callState.audioContext.resume();
        }
    }, { once: true });
    
    console.log('✅ Call event listeners setup complete');
}

// Main click handler for ALL call-related buttons
function handleCallButtonClicks(e) {
    // Prevent handling if already in a call
    if (window.callState.isInCall && !e.target.closest('#endCallBtn') && !e.target.closest('.end-call-btn')) {
        console.log('⚠️ Already in a call, ignoring other call buttons');
        return;
    }
    
    // 1. Friend list voice call buttons
    if (e.target.closest('.voice-call-btn') || e.target.closest('.chat-voice-call-btn')) {
        console.log('🎤 Voice call button clicked');
        e.stopPropagation();
        e.preventDefault();
        
        handleFriendCallButtonClick(e, 'voice');
        return;
    }
    
    // 2. Friend list video call buttons
    if (e.target.closest('.video-call-btn') || e.target.closest('.chat-video-call-btn')) {
        console.log('📹 Video call button clicked');
        e.stopPropagation();
        e.preventDefault();
        
        handleFriendCallButtonClick(e, 'video');
        return;
    }
    
    // 3. Accept call button (incoming call popup)
    if (e.target.closest('#acceptCallBtn') || e.target.closest('.accept-call-btn')) {
        console.log('✅ Accept call button clicked');
        e.preventDefault();
        
        if (window.callState.isReceivingCall && window.callState.callId && window.callState.remoteUserId) {
            acceptCall(window.callState.callId, window.callState.remoteUserId, window.callState.callType);
        } else {
            console.warn('Cannot accept call: missing call state');
            showToast('Cannot accept call', 'error');
        }
        return;
    }
    
    // 4. Reject call button (incoming call popup)
    if (e.target.closest('#rejectCallBtn') || e.target.closest('.reject-call-btn')) {
        console.log('❌ Reject call button clicked');
        e.preventDefault();
        
        if (window.callState.callId) {
            rejectCall(window.callState.callId);
        } else {
            hideIncomingCallPopup();
            cleanupCallState();
            showToast('Call rejected', 'info');
        }
        return;
    }
    
    // 5. End call button (active call UI)
    if (e.target.closest('#endCallBtn') || e.target.closest('.end-call-btn')) {
        console.log('📞 End call button clicked');
        e.preventDefault();
        endCall();
        return;
    }
    
    // 6. Toggle microphone button
    if (e.target.closest('#toggleMicBtn') || e.target.closest('.toggle-mic-btn')) {
        console.log('🎤 Toggle mic button clicked');
        e.preventDefault();
        toggleMic();
        return;
    }
    
    // 7. Toggle camera button
    if (e.target.closest('#toggleCameraBtn') || e.target.closest('.toggle-camera-btn')) {
        console.log('📷 Toggle camera button clicked');
        e.preventDefault();
        toggleCamera();
        return;
    }
    
    // 8. Switch camera button
    if (e.target.closest('#switchCameraBtn') || e.target.closest('.switch-camera-btn')) {
        console.log('🔄 Switch camera button clicked');
        e.preventDefault();
        switchCamera();
        return;
    }
}

// ==================== ORIGINAL FUNCTIONS ====================

// Load user preferences including custom ringtone
function loadUserPreferences() {
    try {
        const savedRingtone = localStorage.getItem('kynecta_ringtone_url');
        if (savedRingtone) {
            window.callState.ringtoneUrl = savedRingtone;
            console.log('🔔 Loaded custom ringtone:', savedRingtone);
        }
        
        // Load missed calls from localStorage
        const savedMissedCalls = localStorage.getItem('kynecta_missed_calls');
        if (savedMissedCalls) {
            window.callState.missedCalls = JSON.parse(savedMissedCalls);
            console.log('📥 Loaded missed calls from storage:', window.callState.missedCalls.length);
        }
        
    } catch (error) {
        console.warn('⚠️ Could not load user preferences:', error);
    }
}

// Save custom ringtone URL
window.setCustomRingtone = function(url) {
    try {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid ringtone URL');
        }
        
        window.callState.ringtoneUrl = url;
        localStorage.setItem('kynecta_ringtone_url', url);
        console.log('✅ Custom ringtone saved:', url);
        showToast('Custom ringtone set successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error setting custom ringtone:', error);
        showToast('Failed to set custom ringtone: ' + error.message, 'error');
    }
};

// Reset to default ringtone
window.resetToDefaultRingtone = function() {
    window.callState.ringtoneUrl = null;
    localStorage.removeItem('kynecta_ringtone_url');
    console.log('✅ Ringtone reset to default');
    showToast('Ringtone reset to default', 'info');
};

// Get local media stream based on call type
async function getLocalMediaStream(callType) {
    console.log('🎥 Getting local media stream for:', callType);
    
    try {
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: callType === 'video' ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: 'user'
            } : false
        };
        
        window.callState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Local media stream obtained');
        
        // Display local video if it's a video call
        if (callType === 'video' && window.callState.localStream) {
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = window.callState.localStream;
                localVideo.muted = true;
                localVideo.play().catch(e => console.warn('Local video play error:', e));
            }
        }
        
    } catch (error) {
        console.error('❌ Error getting media stream:', error);
        
        let errorMessage = 'Cannot access ';
        if (callType === 'video') {
            errorMessage += 'camera and microphone';
        } else {
            errorMessage += 'microphone';
        }
        
        if (error.name === 'NotAllowedError') {
            errorMessage += '. Please allow permissions in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += '. No media devices found.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += '. Device may be in use by another application.';
        } else {
            errorMessage += ': ' + error.message;
        }
        
        throw new Error(errorMessage);
    }
}

// Create WebRTC peer connection
async function createPeerConnection() {
    console.log('🔗 Creating peer connection');
    
    try {
        window.callState.peerConnection = new RTCPeerConnection(rtcConfig);
        
        // Add local stream tracks to peer connection
        if (window.callState.localStream) {
            window.callState.localStream.getTracks().forEach(track => {
                window.callState.peerConnection.addTrack(track, window.callState.localStream);
            });
        }
        
        // Set up remote stream handler
        window.callState.peerConnection.ontrack = (event) => {
            console.log('📹 Remote track received');
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo && event.streams[0]) {
                window.callState.remoteStream = event.streams[0];
                remoteVideo.srcObject = window.callState.remoteStream;
                remoteVideo.play().catch(e => console.warn('Remote video play error:', e));
            }
        };
        
        // ICE candidate handler
        window.callState.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('❄️  Local ICE candidate generated');
                sendIceCandidate(event.candidate);
            }
        };
        
        // Connection state handler
        window.callState.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', window.callState.peerConnection.connectionState);
            updateCallStatus(window.callState.peerConnection.connectionState);
            
            if (window.callState.peerConnection.connectionState === 'failed') {
                console.error('❌ Connection failed, cleaning up');
                showToast('Connection failed', 'error');
                endCall();
            }
        };
        
        // Handle ICE connection state
        window.callState.peerConnection.oniceconnectionstatechange = () => {
            console.log('❄️ ICE connection state:', window.callState.peerConnection.iceConnectionState);
            
            if (window.callState.peerConnection.iceConnectionState === 'failed') {
                console.error('❌ ICE connection failed');
                showToast('Network connection failed', 'error');
                endCall();
            }
        };
        
        // Handle signaling state
        window.callState.peerConnection.onsignalingstatechange = () => {
            console.log('📶 Signaling state:', window.callState.peerConnection.signalingState);
        };
        
        console.log('✅ Peer connection created successfully');
        
    } catch (error) {
        console.error('❌ Error creating peer connection:', error);
        throw new Error('Failed to establish connection: ' + error.message);
    }
}

// Create and send offer to remote peer
async function createAndSendOffer(callId) {
    console.log('📤 Creating and sending offer');
    
    try {
        const offer = await window.callState.peerConnection.createOffer();
        await window.callState.peerConnection.setLocalDescription(offer);
        
        // Send offer to Firestore
        await firebase.firestore().collection('calls').doc(callId).update({
            offer: offer,
            status: 'ringing',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Offer sent to Firestore');
        
        // Listen for answer and ICE candidates
        setupCallListeners(callId);
        
    } catch (error) {
        console.error('❌ Error creating/sending offer:', error);
        throw new Error('Failed to create call offer: ' + error.message);
    }
}

// Set up Firestore listeners for call updates
function setupCallListeners(callId) {
    console.log('👂 Setting up call listeners for:', callId);
    
    // Clean up any existing listeners first
    cleanupCallListeners();
    
    // Listen for answer
    const answerUnsub = firebase.firestore().collection('calls').doc(callId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const callData = doc.data();
                
                // Update processed call IDs to prevent duplicates
                if (!window.callState.processedCallIds.has(callId)) {
                    window.callState.processedCallIds.add(callId);
                }
                
                if (callData.answer && window.callState.isCaller && !window.callState.peerConnection.remoteDescription) {
                    console.log('✅ Answer received');
                    handleAnswer(callData.answer);
                }
                
                if (callData.status === 'rejected' || callData.status === 'ended' || callData.status === 'missed') {
                    console.log('📞 Call ended by remote party:', callData.status);
                    endCall();
                    
                    if (callData.status === 'rejected') {
                        showToast('Call rejected', 'info');
                    } else if (callData.status === 'missed') {
                        showToast('Call missed', 'info');
                    }
                }
            }
        });
    
    // Listen for receiver ICE candidates
    const candidateUnsub = firebase.firestore().collection('calls').doc(callId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const callData = doc.data();
                if (callData.receiverCandidates && window.callState.isCaller) {
                    handleRemoteIceCandidates(callData.receiverCandidates);
                }
            }
        });
    
    // Store unsubscribe functions
    window.callState.unsubscribers.push(answerUnsub, candidateUnsub);
}

// Handle incoming answer from receiver
async function handleAnswer(answer) {
    console.log('🔄 Handling answer from receiver');
    
    try {
        if (!window.callState.peerConnection.remoteDescription) {
            await window.callState.peerConnection.setRemoteDescription(answer);
            console.log('✅ Remote description set from answer');
            stopRingtone();
            startCallTimer();
            updateCallStatus('connected');
            
            // Update call status to answered
            if (window.callState.callId) {
                await firebase.firestore().collection('calls').doc(window.callState.callId).update({
                    status: 'answered',
                    connectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Clear expiry timer
            clearCallExpiryTimer(window.callState.callId);
        }
    } catch (error) {
        console.error('❌ Error handling answer:', error);
        showToast('Error establishing connection', 'error');
        endCall();
    }
}

// Send ICE candidate to remote peer
async function sendIceCandidate(candidate) {
    console.log('📤 Sending ICE candidate');
    
    if (!window.callState.callId) return;
    
    try {
        const candidateData = {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        };
        
        const field = window.callState.isCaller ? 'callerCandidates' : 'receiverCandidates';
        
        await firebase.firestore().collection('calls').doc(window.callState.callId).update({
            [field]: firebase.firestore.FieldValue.arrayUnion(candidateData),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('❌ Error sending ICE candidate:', error);
    }
}

// Handle remote ICE candidates
async function handleRemoteIceCandidates(candidates) {
    console.log('👂 Handling remote ICE candidates:', candidates.length);
    
    const processedCandidates = new Set();
    
    for (const candidateData of candidates) {
        const candidateKey = `${candidateData.sdpMid}-${candidateData.sdpMLineIndex}-${candidateData.candidate}`;
        
        if (!processedCandidates.has(candidateKey)) {
            processedCandidates.add(candidateKey);
            
            try {
                const candidate = new RTCIceCandidate(candidateData);
                await window.callState.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.warn('⚠️ Error adding ICE candidate:', error);
            }
        }
    }
}

// Set up listeners for answer flow
function setupAnswerListeners(callId) {
    console.log('👂 Setting up answer listeners');
    
    // Listen for caller ICE candidates
    const candidateUnsub = firebase.firestore().collection('calls').doc(callId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const callData = doc.data();
                if (callData.callerCandidates && !window.callState.isCaller) {
                    handleRemoteIceCandidates(callData.callerCandidates);
                }
                
                if (callData.status === 'ended' || callData.status === 'rejected') {
                    console.log('📞 Call ended by remote party');
                    endCall();
                    showToast('Call ended', 'info');
                }
            }
        });
    
    window.callState.unsubscribers.push(candidateUnsub);
}

// Show incoming call popup
function showIncomingCallPopup(callerName, callType, callId, callerId) {
    console.log('🪟 Showing incoming call popup');
    
    // Clear any existing timeout
    if (window.callState.incomingCallTimeout) {
        clearTimeout(window.callState.incomingCallTimeout);
    }
    
    window.callState.isReceivingCall = true;
    window.callState.callId = callId;
    window.callState.remoteUserId = callerId;
    window.callState.callType = callType;
    
    const popup = document.getElementById('incomingCallPopup');
    const callerNameEl = document.getElementById('incomingCallerName');
    const callTypeEl = document.getElementById('incomingCallType');
    
    if (popup && callerNameEl && callTypeEl) {
        callerNameEl.textContent = callerName;
        callTypeEl.textContent = callType === 'video' ? 'Video Call' : 'Voice Call';
        popup.style.display = 'flex';
        popup.style.zIndex = '10000';
    } else {
        console.warn('⚠️ Incoming call popup elements not found');
        // Create popup dynamically if it doesn't exist
        createIncomingCallPopup(callerName, callType, callId, callerId);
    }
    
    playRingtone();
    
    // Auto-reject after ring timeout
    window.callState.incomingCallTimeout = setTimeout(() => {
        if (window.callState.isReceivingCall) {
            console.log('⏰ Auto-rejecting incoming call after timeout');
            rejectCall(callId, 'no_answer');
        }
    }, CALL_SETTINGS.RING_TIMEOUT);
}

// Create incoming call popup dynamically
function createIncomingCallPopup(callerName, callType, callId, callerId) {
    console.log('🛠️ Creating dynamic incoming call popup');
    
    // Remove existing popup if any
    const existingPopup = document.getElementById('incomingCallPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    const popup = document.createElement('div');
    popup.id = 'incomingCallPopup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    popup.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 20px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
            <div style="
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 36px;
            ">
                ${callType === 'video' ? '📹' : '📞'}
            </div>
            
            <h2 id="incomingCallerName" style="
                font-size: 24px;
                font-weight: bold;
                color: #333;
                margin: 0 0 10px 0;
            ">
                ${callerName}
            </h2>
            
            <p id="incomingCallType" style="
                color: #666;
                margin: 0 0 30px 0;
                font-size: 16px;
            ">
                ${callType === 'video' ? 'Video Call' : 'Voice Call'}
            </p>
            
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="acceptCallBtn" style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
                    transition: all 0.3s;
                ">
                    ✓
                </button>
                
                <button id="rejectCallBtn" style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                    transition: all 0.3s;
                ">
                    ✕
                </button>
            </div>
            
            <p style="color: #999; margin-top: 20px; font-size: 14px;">
                Call will auto-reject in 30 seconds
            </p>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Add event listeners
    document.getElementById('acceptCallBtn').onclick = () => {
        acceptCall(callId, callerId, callType);
    };
    
    document.getElementById('rejectCallBtn').onclick = () => {
        rejectCall(callId);
    };
}

// Hide incoming call popup
function hideIncomingCallPopup() {
    console.log('🪟 Hiding incoming call popup');
    
    // Clear timeout
    if (window.callState.incomingCallTimeout) {
        clearTimeout(window.callState.incomingCallTimeout);
        window.callState.incomingCallTimeout = null;
    }
    
    const popup = document.getElementById('incomingCallPopup');
    if (popup) {
        popup.style.display = 'none';
    }
    
    window.callState.isReceivingCall = false;
    stopRingtone();
}

// Toggle microphone mute
window.toggleMic = function() {
    if (!window.callState.localStream) return;
    
    const audioTracks = window.callState.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        window.callState.isMuted = !window.callState.isMuted;
        audioTracks.forEach(track => {
            track.enabled = !window.callState.isMuted;
        });
        
        const toggleMicBtn = document.getElementById('toggleMicBtn');
        if (toggleMicBtn) {
            toggleMicBtn.textContent = window.callState.isMuted ? '🎤' : '🔇';
            toggleMicBtn.title = window.callState.isMuted ? 'Unmute' : 'Mute';
            toggleMicBtn.classList.toggle('bg-red-500', window.callState.isMuted);
            toggleMicBtn.classList.toggle('bg-green-500', !window.callState.isMuted);
        }
        
        console.log('🎤 Microphone', window.callState.isMuted ? 'muted' : 'unmuted');
    }
};

// Toggle camera on/off
window.toggleCamera = function() {
    if (!window.callState.localStream || window.callState.callType !== 'video') return;
    
    const videoTracks = window.callState.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
        window.callState.isVideoOff = !window.callState.isVideoOff;
        videoTracks.forEach(track => {
            track.enabled = !window.callState.isVideoOff;
        });
        
        const toggleCameraBtn = document.getElementById('toggleCameraBtn');
        if (toggleCameraBtn) {
            toggleCameraBtn.textContent = window.callState.isVideoOff ? '📹' : '📷';
            toggleCameraBtn.title = window.callState.isVideoOff ? 'Turn camera on' : 'Turn camera off';
            toggleCameraBtn.classList.toggle('bg-red-500', window.callState.isVideoOff);
            toggleCameraBtn.classList.toggle('bg-blue-500', !window.callState.isVideoOff);
            
            // Update local video display
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                if (window.callState.isVideoOff) {
                    localVideo.style.opacity = '0.5';
                } else {
                    localVideo.style.opacity = '1';
                }
            }
        }
        
        console.log('📷 Camera', window.callState.isVideoOff ? 'off' : 'on');
    }
};

// Switch between front and back cameras
window.switchCamera = async function() {
    if (!window.callState.localStream || window.callState.callType !== 'video') return;
    
    try {
        const videoTrack = window.callState.localStream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        // Get available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length < 2) {
            console.warn('⚠️ Only one camera available');
            showToast('Only one camera available', 'info');
            return;
        }
        
        // Determine next camera
        const currentFacingMode = window.callState.currentCamera;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        window.callState.currentCamera = newFacingMode;
        
        // Stop current video track
        videoTrack.stop();
        
        // Get new video stream
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: true
        });
        
        // Replace video track in local stream
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = window.callState.peerConnection.getSenders().find(
            s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
            await sender.replaceTrack(newVideoTrack);
        }
        
        // Update local video element
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            window.callState.localStream.getVideoTracks().forEach(track => track.stop());
            window.callState.localStream.addTrack(newVideoTrack);
            localVideo.srcObject = window.callState.localStream;
            localVideo.play().catch(e => console.warn('Local video play error:', e));
        }
        
        // Stop the audio tracks from the new stream
        newStream.getAudioTracks().forEach(track => track.stop());
        
        console.log('📷 Switched camera to:', newFacingMode);
        showToast('Camera switched', 'success');
        
    } catch (error) {
        console.error('❌ Error switching camera:', error);
        showToast('Failed to switch camera', 'error');
    }
};

// Hide call UI
function hideCallUI() {
    console.log('🖥️ Hiding call UI');
    
    const callContainer = document.getElementById('callContainer');
    if (callContainer) {
        callContainer.style.display = 'none';
    }
    
    hideIncomingCallPopup();
    stopCallTimer();
}

// Update call status display
function updateCallStatus(status) {
    const callStatus = document.getElementById('callStatus');
    if (callStatus) {
        const statusMap = {
            'new': 'Starting call...',
            'connecting': 'Connecting...',
            'connected': 'Connected',
            'disconnected': 'Disconnected',
            'failed': 'Connection Failed',
            'closed': 'Call Ended'
        };
        
        callStatus.textContent = statusMap[status] || status;
    }
}

// Start call timer
function startCallTimer() {
    console.log('⏱️ Starting call timer');
    
    window.callState.callStartTime = Date.now();
    stopCallTimer();
    
    const callTimer = document.getElementById('callTimer');
    if (!callTimer) return;
    
    callTimer.style.display = 'block';
    window.callState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - window.callState.callStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        callTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Stop call timer
function stopCallTimer() {
    if (window.callState.timerInterval) {
        clearInterval(window.callState.timerInterval);
        window.callState.timerInterval = null;
    }
    
    const callTimer = document.getElementById('callTimer');
    if (callTimer) {
        callTimer.textContent = '00:00';
        callTimer.style.display = 'none';
    }
}

// Enhanced ringtone with custom URL support
function playRingtone() {
    // Only play ringtone after user has interacted with the page
    if (!window.userInteracted) {
        console.log('🔕 Ringtone skipped - user hasn\'t interacted with page yet');
        return;
    }
    
    let ringtone = document.getElementById('callRingtone');
    if (!ringtone) {
        ringtone = document.createElement('audio');
        ringtone.id = 'callRingtone';
        ringtone.loop = true;
        ringtone.volume = 0.5;
        document.body.appendChild(ringtone);
    }
    
    // Stop any existing ringtone first
    ringtone.pause();
    ringtone.currentTime = 0;
    
    // Use custom ringtone if available, otherwise fallback
    if (window.callState.ringtoneUrl) {
        ringtone.src = window.callState.ringtoneUrl;
        console.log('🔔 Using custom ringtone:', window.callState.ringtoneUrl);
    } else {
        // Use default ringtone
        ringtone.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiN1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiN1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiN1/LMeSw=';
        console.log('🔔 Using default ringtone');
    }
    
    ringtone.play().catch(e => {
        console.log('Ringtone play failed:', e.message);
        // Try again with user interaction
        window.userInteracted = true;
    });
}

function stopRingtone() {
    const ringtone = document.getElementById('callRingtone');
    if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
    }
}

// Clean up call listeners specifically
function cleanupCallListeners() {
    console.log('🧹 Cleaning up call listeners');
    
    window.callState.unsubscribers.forEach((unsub, index) => {
        if (unsub && typeof unsub === 'function') {
            try {
                unsub();
            } catch (error) {
                console.warn('⚠️ Error unsubscribing listener:', error);
            }
        }
    });
    window.callState.unsubscribers = [];
}

// Clean up call state and resources
function cleanupCallState() {
    console.log('🧹 Cleaning up call state');
    
    // Stop any incoming call timeout
    if (window.callState.incomingCallTimeout) {
        clearTimeout(window.callState.incomingCallTimeout);
        window.callState.incomingCallTimeout = null;
    }
    
    if (window.callState.localStream) {
        window.callState.localStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        window.callState.localStream = null;
    }
    
    if (window.callState.remoteStream) {
        window.callState.remoteStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        window.callState.remoteStream = null;
    }
    
    if (window.callState.peerConnection) {
        try {
            window.callState.peerConnection.getSenders().forEach(sender => {
                if (sender.track) {
                    sender.track.stop();
                }
            });
            window.callState.peerConnection.close();
        } catch (error) {
            console.warn('⚠️ Error closing peer connection:', error);
        }
        window.callState.peerConnection = null;
    }
    
    cleanupCallListeners();
    stopCallTimer();
    stopRingtone();
    
    // Clear video elements
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    
    if (localVideo) {
        localVideo.srcObject = null;
        localVideo.style.opacity = '1';
    }
    
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }
    
    // Reset state (keep processedCallIds and lastCallEndTime)
    const processedCallIds = window.callState.processedCallIds;
    const lastCallEndTime = window.callState.lastCallEndTime;
    
    Object.assign(window.callState, {
        isCaller: false,
        isReceivingCall: false,
        callType: null,
        remoteUserId: null,
        callId: null,
        callStartTime: null,
        timerInterval: null,
        unsubscribers: [],
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        isMuted: false,
        isVideoOff: false,
        isInCall: false,
        currentCamera: 'user',
        incomingCallTimeout: null,
        currentCallDocument: null,
        processedCallIds: processedCallIds,
        lastCallEndTime: lastCallEndTime
    });
}

// Handle friend call button clicks
function handleFriendCallButtonClick(e, callType) {
    const button = e.target.closest('.voice-call-btn, .video-call-btn, .chat-voice-call-btn, .chat-video-call-btn');
    
    if (!button) return;
    
    // Prevent if already in a call
    if (window.callState.isInCall) {
        showToast('You are already in a call', 'warning');
        return;
    }
    
    // Find the friend/user item container
    const containers = [
        button.closest('.friend-item'),
        button.closest('.user-item'),
        button.closest('[data-user-id]'),
        button.closest('[data-friend-id]'),
        button.closest('[data-uid]'),
        button.closest('.chat-header'),
        button.closest('.message-header')
    ];
    
    const container = containers.find(c => c !== null);
    
    if (!container) {
        console.error('Could not find friend container for button:', button);
        showToast('Could not find user information', 'error');
        return;
    }
    
    // Extract user information
    const userId = container.dataset.userId || container.dataset.friendId || container.dataset.uid || 
                   container.dataset.chatUser || container.dataset.recipientId || button.dataset.userId;
    
    // Try multiple selectors for user name
    const nameSelectors = [
        '.friend-name',
        '.user-name',
        '.chat-title',
        '.recipient-name',
        '.username',
        '.name',
        '.text-lg.font-semibold',
        '.text-sm.font-medium',
        'span:first-child'
    ];
    
    let userName = 'Friend';
    for (const selector of nameSelectors) {
        const nameElement = container.querySelector(selector);
        if (nameElement && nameElement.textContent && nameElement.textContent.trim()) {
            userName = nameElement.textContent.trim();
            break;
        }
    }
    
    if (!userId) {
        console.error('No user ID found for call button');
        showToast('Cannot start call: missing user ID', 'error');
        return;
    }
    
    // Prevent calling yourself
    if (window.callState.currentUser && userId === window.callState.currentUser.uid) {
        showToast('You cannot call yourself', 'warning');
        return;
    }
    
    console.log(`📞 Starting ${callType} call with:`, userName, userId);
    window.startCall(userId, userName, callType);
}

// Add call buttons to chat header
window.addCallButtonsToChat = function() {
    console.log('🔧 Adding call buttons to chat header');
    
    const tryAddButtons = () => {
        try {
            const chatHeaders = document.querySelectorAll('.chat-header, .message-header, [data-chat-user], [data-recipient-id], #chatHeader');
            console.log(`💬 Found ${chatHeaders.length} chat headers`);
            
            chatHeaders.forEach((header, index) => {
                try {
                    const userId = header.dataset.chatUser || header.dataset.recipientId || header.dataset.userId;
                    
                    if (!userId) {
                        return;
                    }
                    
                    // Skip if it's the current user
                    if (window.callState.currentUser && userId === window.callState.currentUser.uid) {
                        return;
                    }
                    
                    // Check if buttons already exist
                    if (header.querySelector('.chat-call-buttons')) {
                        return;
                    }
                    
                    // Get user name
                    let userName = 'User';
                    const nameSelectors = [
                        '.chat-title',
                        '.user-name',
                        '.recipient-name',
                        '.text-lg.font-semibold',
                        '.text-xl.font-bold',
                        'h2, h3, h4'
                    ];
                    
                    for (const selector of nameSelectors) {
                        const nameEl = header.querySelector(selector);
                        if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
                            userName = nameEl.textContent.trim();
                            break;
                        }
                    }
                    
                    // Ensure user ID is set on the element
                    if (!header.dataset.userId) {
                        header.dataset.userId = userId;
                    }
                    
                    // Create call buttons container
                    const buttonsContainer = document.createElement('div');
                    buttonsContainer.className = 'chat-call-buttons flex space-x-2 ml-4';
                    
                    // Voice call button
                    const voiceCallBtn = document.createElement('button');
                    voiceCallBtn.className = 'chat-voice-call-btn w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer';
                    voiceCallBtn.innerHTML = '📞';
                    voiceCallBtn.title = `Voice call ${userName}`;
                    voiceCallBtn.dataset.userId = userId;
                    voiceCallBtn.dataset.userName = userName;
                    
                    // Video call button
                    const videoCallBtn = document.createElement('button');
                    videoCallBtn.className = 'chat-video-call-btn w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer';
                    videoCallBtn.innerHTML = '📹';
                    videoCallBtn.title = `Video call ${userName}`;
                    videoCallBtn.dataset.userId = userId;
                    videoCallBtn.dataset.userName = userName;
                    
                    buttonsContainer.appendChild(voiceCallBtn);
                    buttonsContainer.appendChild(videoCallBtn);
                    
                    // Add to chat header
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.justifyContent = 'space-between';
                    header.appendChild(buttonsContainer);
                    
                    console.log(`✅ Added call buttons to chat header: ${userName} (${userId})`);
                    
                } catch (error) {
                    console.warn('⚠️ Error adding buttons to chat header:', error);
                }
            });
        } catch (error) {
            console.error('❌ Error in addCallButtonsToChat:', error);
        }
    };
    
    // Try immediately, then again after 2 seconds
    tryAddButtons();
    setTimeout(tryAddButtons, 2000);
};

// ==================== DEBUG AND UTILITY FUNCTIONS ====================

// Debug function to test call system
window.debugCallSystem = function() {
    console.log('=== ENHANCED CALL SYSTEM DEBUG INFO ===');
    console.log('Call State:', window.callState);
    console.log('User:', window.callState.currentUser);
    console.log('Is Initialized:', window.callState.isInitialized);
    console.log('Online Status:', window.callState.onlineStatus);
    console.log('Is Online:', window.callState.isOnline);
    console.log('Processed Call IDs:', window.callState.processedCallIds.size);
    console.log('Missed Calls:', window.callState.missedCalls.length);
    console.log('Friend Status Cache Size:', window.callState.friendOnlineStatus.size);
    console.log('Active Expiry Timers:', window.callState.callExpiryTimers.size);
    console.log('Network Status:', navigator.onLine ? 'Online' : 'Offline');
    
    // Check if buttons exist
    const voiceButtons = document.querySelectorAll('.voice-call-btn, .chat-voice-call-btn');
    const videoButtons = document.querySelectorAll('.video-call-btn, .chat-video-call-btn');
    console.log(`Voice call buttons found: ${voiceButtons.length}`);
    console.log(`Video call buttons found: ${videoButtons.length}`);
    
    return {
        callState: window.callState,
        voiceButtons: voiceButtons.length,
        videoButtons: videoButtons.length,
        isInitialized: window.callState.isInitialized,
        onlineStatus: window.callState.onlineStatus,
        isOnline: window.callState.isOnline
    };
};

// Get missed calls count
window.getMissedCallsCount = function() {
    return window.callState.missedCalls.filter(call => !call.read).length;
};

// Mark all missed calls as read
window.markAllMissedCallsAsRead = function() {
    window.callState.missedCalls.forEach(call => {
        call.read = true;
    });
    
    // Update UI
    updateMissedCallsUI();
    
    // Save to localStorage
    try {
        localStorage.setItem('kynecta_missed_calls', JSON.stringify(window.callState.missedCalls));
    } catch (error) {
        console.warn('⚠️ Could not save missed calls:', error);
    }
    
    showToast('All missed calls marked as read', 'info');
};

// Get user online status
window.getUserOnlineStatus = function() {
    return window.callState.onlineStatus;
};

// Check if friend is online
window.isFriendOnline = async function(friendId) {
    const status = await checkFriendOnlineStatus(friendId);
    return status === 'online';
};

// ==================== MISSING FUNCTION FOR CHAT.JS ====================

// Add this function to fix the chat.js error
if (typeof safeImageLoad !== 'function') {
    window.safeImageLoad = function(imageElement, imageUrl, fallbackUrl = '') {
        if (!imageElement || !imageUrl) return;
        
        const img = new Image();
        img.onload = () => {
            imageElement.src = imageUrl;
            imageElement.style.display = 'block';
        };
        img.onerror = () => {
            if (fallbackUrl) {
                imageElement.src = fallbackUrl;
            } else {
                imageElement.style.display = 'none';
            }
        };
        img.src = imageUrl;
    };
}

// ==================== INITIALIZATION ====================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced call.js loaded, DOM ready');
    
    // Setup event listeners immediately
    setupCallEventListeners();
    
    // Check if user is already authenticated
    if (window.currentUser || (window.firebase && firebase.auth().currentUser)) {
        console.log('✅ User already authenticated, initializing enhanced call system');
        setTimeout(() => {
            window.initializeCallSystem();
        }, 1000);
    } else {
        console.log('⏳ Waiting for user authentication...');
    }
});

// Export functions for global access
window.showIncomingCallPopup = showIncomingCallPopup;
window.hideIncomingCallPopup = hideIncomingCallPopup;
window.showCallUI = showCallUI;
window.hideCallUI = hideCallUI;
window.startCallTimer = startCallTimer;
window.stopCallTimer = stopCallTimer;
window.playRingtone = playRingtone;
window.stopRingtone = stopRingtone;
window.cleanupCallSystem = cleanupCallSystem;
window.cleanupCallState = cleanupCallState;
window.cleanupCallListeners = cleanupCallListeners;

// Export enhanced functions
window.getMissedCallsCount = getMissedCallsCount;
window.markAllMissedCallsAsRead = markAllMissedCallsAsRead;
window.getUserOnlineStatus = getUserOnlineStatus;
window.isFriendOnline = isFriendOnline;
window.debugEnhancedCallSystem = debugCallSystem;

console.log('✅ Enhanced call.js initialization complete - All Features Fixed and Ready');