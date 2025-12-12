// ==================== GLOBAL STATE ====================
window.callState = {
    // Basic call state
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
    
    // Enhanced features
    ringtoneUrl: null,
    audioContext: null,
    ringtoneSource: null,
    isInitialized: false,
    processedCallIds: new Set(),
    incomingCallTimeout: null,
    lastCallEndTime: null,
    currentCallDocument: null,
    
    // Online status system
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
    userPresenceDoc: null,
    
    // Group call state
    isGroupCall: false,
    conferenceRoomId: null,
    conferenceParticipants: new Map(),
    localParticipantId: null,
    screenShareStream: null,
    isScreenSharing: false,
    isRecording: false,
    recordingChunks: [],
    mediaRecorder: null,
    isCallOnHold: false,
    holdInterval: null,
    holdMusicAudio: null,
    
    // Device management
    availableCameras: [],
    availableMicrophones: [],
    availableSpeakers: [],
    selectedCamera: null,
    selectedMicrophone: null,
    selectedSpeaker: null,
    
    // Call quality
    connectionQuality: 'good',
    bandwidthStats: null,
    latencyStats: null,
    packetLossStats: null,
    qualityWarningShown: false,
    qualityCheckInterval: null,
    
    // UI state
    isPipMode: false,
    isCallMinimized: false,
    isFullscreen: false,
    activeSpeakerId: null,
    pipWindow: null,
    
    // Conference specific
    conferenceHost: null,
    conferenceSettings: {
        maxParticipants: 12,
        muteOnEntry: false,
        allowScreenShare: true,
        allowRecording: false,
        requireHostApproval: false,
        enableWaitingRoom: false
    },
    
    // Favorites
    favoriteContacts: new Set(),
    favoriteContactsData: new Map(),
    
    // Emergency features
    emergencyContact: null,
    isEmergencyCall: false,
    locationShared: false,
    emergencyAlertSent: false,
    
    // Accessibility
    keyboardShortcutsEnabled: true,
    highContrastMode: false,
    screenReaderAnnouncements: true,
    
    // Analytics
    callRating: null,
    callFeedback: '',
    callIssues: [],
    callAnalytics: {
        totalCalls: 0,
        totalDuration: 0,
        videoCalls: 0,
        voiceCalls: 0,
        groupCalls: 0,
        failedCalls: 0
    },
    
    // Transfer state
    transferState: null,
    transferTarget: null,
    
    // Merge state
    mergeCandidates: [],
    isMergingCalls: false,
    
    // Recording state
    recordingStartTime: null,
    recordingTimerInterval: null,
    
    // Permission state
    permissions: {
        camera: 'prompt',
        microphone: 'prompt',
        notifications: 'prompt'
    },
    
    // Network state
    networkType: null,
    networkSpeed: null,
    
    // Error state
    lastError: null,
    errorCount: 0,
    
    // Mobile specific
    proximitySensorActive: false,
    screenLockDuringCall: false,
    
    // Desktop specific
    callWindow: null,
    callWindowBounds: null,
    
    // Notification state
    notificationPermission: 'default',
    notificationSound: true,
    notificationVibrate: true,
    
    // Safety features
    safetyCheckInterval: null,
    lastSafetyCheck: null,
    
    // Integration state
    chatIntegrationActive: true,
    contactIntegrationActive: true,
    
    // Storage state
    localStorageAvailable: true,
    indexedDBAvailable: true,
    
    // Debug state
    debugMode: true,
    logLevel: 'info',
    
    // Initialization state
    initializationAttempts: 0,
    maxInitializationAttempts: 3,
    isInitializing: false
};

// ==================== CONSTANTS ====================
const CALL_SETTINGS = {
    CALL_TIMEOUT: 45000,
    RING_TIMEOUT: 30000,
    AWAY_TIMEOUT: 30000,
    OFFLINE_TIMEOUT: 10000,
    RECONNECT_DELAY: 5000,
    CLEANUP_INTERVAL: 300000,
    PRESENCE_INTERVAL: 30000,
    STATUS_CACHE_TTL: 60000,
    CONFERENCE_TIMEOUT: 3600000,
    RECORDING_MAX_DURATION: 3600000,
    HOLD_TIMEOUT: 300000,
    EMERGENCY_TIMEOUT: 30000,
    QUALITY_CHECK_INTERVAL: 10000,
    DEVICE_REFRESH_INTERVAL: 60000,
    SAFETY_CHECK_INTERVAL: 60000,
    NETWORK_CHECK_INTERVAL: 15000,
    BATTERY_CHECK_INTERVAL: 30000,
    PROXIMITY_CHECK_INTERVAL: 1000,
    NOTIFICATION_TIMEOUT: 10000,
    RECONNECTION_ATTEMPTS: 3,
    ICE_RESTART_DELAY: 2000,
    MEDIA_RETRY_DELAY: 1000,
    UI_UPDATE_INTERVAL: 100,
    ANALYTICS_FLUSH_INTERVAL: 60000,
    CACHE_CLEANUP_INTERVAL: 300000,
    HEARTBEAT_INTERVAL: 30000
};

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    sdpSemantics: 'unified-plan'
};

// ==================== INITIALIZATION ====================
// ==================== INITIALIZATION ====================
window.initializeCallSystem = function(force = false) {
    console.log('🚀 Initializing call system...');
    
    if (window.callState.isInitializing && !force) {
        console.log('⏳ Call system is already initializing');
        return;
    }
    
    if (window.callState.isInitialized && !force) {
        console.log('ℹ️ Call system already initialized');
        return;
    }
    
    window.callState.isInitializing = true;
    window.callState.initializationAttempts++;
    
    // Check for Firebase
    if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
        console.warn('⚠️ Firebase not loaded yet, waiting...');
        
        if (window.callState.initializationAttempts < window.callState.maxInitializationAttempts) {
            setTimeout(() => {
                window.callState.isInitializing = false;
                window.initializeCallSystem();
            }, 2000);
        } else {
            console.error('❌ Firebase failed to load after multiple attempts');
            window.callState.isInitializing = false;
            showSystemToast('Call system failed to initialize. Please refresh the page.', 'error');
        }
        return;
    }
    
    console.log('✅ Firebase loaded');
    
    // DIRECTLY GET CURRENT USER WITHOUT AUTH STATE LISTENER
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('❌ User not authenticated - but proceeding anyway for call system');
        // Even if user is not authenticated, we'll still try to initialize
        // This handles cases where the page loads before auth completes
        showSystemToast('Initializing call system...', 'info');
    } else {
        console.log('✅ User authenticated:', user.uid, user.displayName || user.email);
    }
    
    // Set current user regardless (will be updated when auth completes)
    window.callState.currentUser = user;
    window.callState.processedCallIds.clear();
    
    // Initialize systems with or without user
    initializeAllSystems(user ? user.uid : 'temp_user').then(() => {
        window.callState.isInitialized = true;
        window.callState.isInitializing = false;
        
        showSystemToast('Call system initialized successfully', 'success');
        
        if (user) {
            logAnalyticsEvent('system_initialized', {
                userId: user.uid,
                platform: navigator.platform,
                online: navigator.onLine,
                timestamp: Date.now()
            });
        }
        
        setupCallButtonListeners();
        
    }).catch(initError => {
        console.error('❌ Error initializing systems:', initError);
        window.callState.isInitializing = false;
        showSystemToast('Failed to initialize call system', 'error');
    });
};
async function initializeAllSystems(userId) {
    console.log('🔄 Initializing all systems...');
    
    try {
        // Only initialize online status if we have a real user
        if (userId !== 'temp_user' && window.callState.currentUser) {
            await initializeOnlineStatusSystem(userId);
            await initializePresenceSystem(userId);
            await loadFavoriteContacts(userId);
        }
        
        // Always initialize these systems
        await initializeDeviceSystem();
        await initializeNotificationSystem();
        
        setupAllEventListeners();
        
        await loadUserPreferences();
        
        startAllBackgroundTasks(userId);
        
        // Only listen for calls if we have a user
        if (userId !== 'temp_user' && window.callState.currentUser) {
            listenForIncomingCalls();
        }
        
        console.log('✅ All systems initialized');
        
    } catch (error) {
        console.error('❌ Error initializing systems:', error);
        throw error;
    }
}

// ==================== ONLINE STATUS SYSTEM ====================
async function initializeOnlineStatusSystem(userId) {
    console.log('🌐 Initializing online status system');
    
    try {
        const presenceRef = firebase.firestore().collection('userPresence').doc(userId);
        window.callState.userPresenceDoc = presenceRef;
        
        await presenceRef.set({
            userId: userId,
            onlineStatus: 'online',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            isAway: false,
            deviceInfo: getDeviceInfo(),
            connectionType: getConnectionType(),
            callCapabilities: getCallCapabilities(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            appVersion: '1.0.0',
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 200)
        }, { merge: true });
        
        window.callState.onlineStatus = 'online';
        
        const statusUnsub = presenceRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                window.callState.onlineStatus = data.onlineStatus || 'offline';
                updateOnlineStatusUI();
            }
        }, (error) => {
            console.warn('⚠️ Error in presence listener:', error);
        });
        
        window.callState.statusListeners.push(statusUnsub);
        
    } catch (error) {
        console.error('❌ Error initializing online status:', error);
        throw error;
    }
}

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth,
        deviceMemory: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints || 0
    };
}

function getConnectionType() {
    if (navigator.connection) {
        return navigator.connection.effectiveType || 'unknown';
    }
    return 'unknown';
}

function getCallCapabilities() {
    return {
        voice: true,
        video: true,
        group: true,
        screenShare: !!navigator.mediaDevices.getDisplayMedia,
        recording: !!window.MediaRecorder,
        pictureInPicture: !!document.pictureInPictureEnabled,
        fullscreen: !!document.fullscreenEnabled,
        notifications: 'Notification' in window,
        webrtc: !!window.RTCPeerConnection,
        webaudio: !!window.AudioContext
    };
}

// ==================== PRESENCE SYSTEM ====================
function initializePresenceSystem(userId) {
    console.log('👤 Initializing presence system');
    
    setupVisibilityHandlers();
    setupNetworkHandlers();
    setupHeartbeat(userId);
    
    return Promise.resolve();
}

function setupVisibilityHandlers() {
    const handleVisibilityChange = () => {
        if (document.hidden) {
            setTimeout(() => {
                if (document.hidden && window.callState.onlineStatus === 'online' && window.callState.currentUser) {
                    updateOnlineStatus(window.callState.currentUser.uid, 'away');
                }
            }, CALL_SETTINGS.AWAY_TIMEOUT);
        } else {
            if (window.callState.onlineStatus === 'away' && window.callState.currentUser) {
                updateOnlineStatus(window.callState.currentUser.uid, 'online');
            }
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.callState.statusListeners.push({
        cleanup: () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    });
}

function setupNetworkHandlers() {
    const handleOnline = async () => {
        console.log('🌐 Network online');
        window.callState.isOnline = true;
        
        if (window.callState.currentUser) {
            await updateOnlineStatus(window.callState.currentUser.uid, 'online');
            listenForIncomingCalls();
        }
    };
    
    const handleOffline = async () => {
        console.log('📵 Network offline');
        window.callState.isOnline = false;
        
        if (window.callState.currentUser) {
            await updateOnlineStatus(window.callState.currentUser.uid, 'offline');
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

function setupHeartbeat(userId) {
    const heartbeat = setInterval(async () => {
        if (window.callState.currentUser && window.callState.onlineStatus === 'online') {
            try {
                await window.callState.userPresenceDoc.update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    heartbeat: Date.now()
                });
            } catch (error) {
                console.warn('⚠️ Heartbeat failed:', error);
            }
        }
    }, CALL_SETTINGS.HEARTBEAT_INTERVAL);
    
    window.callState.cleanupIntervals.push(heartbeat);
}

// ==================== DEVICE SYSTEM ====================
async function initializeDeviceSystem() {
    console.log('🎛️ Initializing device system');
    
    try {
        await refreshAllDevices();
        setupDeviceChangeListener();
        
    } catch (error) {
        console.error('❌ Error initializing device system:', error);
    }
}

async function refreshAllDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        window.callState.availableCameras = devices
            .filter(d => d.kind === 'videoinput')
            .map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Camera ${i + 1}`,
                groupId: d.groupId,
                index: i
            }));
        
        window.callState.availableMicrophones = devices
            .filter(d => d.kind === 'audioinput')
            .map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Microphone ${i + 1}`,
                groupId: d.groupId,
                index: i
            }));
        
        console.log(`🔍 Found ${window.callState.availableCameras.length} cameras and ${window.callState.availableMicrophones.length} microphones`);
        
    } catch (error) {
        console.error('❌ Error refreshing devices:', error);
    }
}

function setupDeviceChangeListener() {
    if (navigator.mediaDevices.addEventListener) {
        const handler = () => {
            console.log('🔄 Device change detected');
            refreshAllDevices();
        };
        
        navigator.mediaDevices.addEventListener('devicechange', handler);
        
        window.callState.statusListeners.push({
            cleanup: () => navigator.mediaDevices.removeEventListener('devicechange', handler)
        });
    }
}

// ==================== NOTIFICATION SYSTEM ====================
function initializeNotificationSystem() {
    console.log('🔔 Initializing notification system');
    
    if ('Notification' in window) {
        window.callState.notificationPermission = Notification.permission;
        
        if (Notification.permission === 'default') {
            requestNotificationPermission();
        }
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            window.callState.notificationPermission = permission;
        });
    }
}

// ==================== EVENT LISTENERS ====================
function setupAllEventListeners() {
    console.log('🔧 Setting up all event listeners');
    
    setupCallEventListeners();
    setupEnhancedEventListeners();
    setupKeyboardShortcuts();
    setupWindowEventListeners();
    setupNetworkMonitoring();
    setupErrorHandlers();
    
    console.log('✅ All event listeners set up');
}

function setupCallEventListeners() {
    console.log('🎯 Setting up call event listeners');
    document.addEventListener('click', handleCallButtonClicks);
    document.addEventListener('touchstart', handleCallButtonClicks, { passive: true });
}

function setupEnhancedEventListeners() {
    document.addEventListener('visibilitychange', handleEnhancedVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function setupWindowEventListeners() {
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
}

function setupNetworkMonitoring() {
    if (navigator.connection) {
        navigator.connection.addEventListener('change', handleNetworkChange);
    }
    
    window.addEventListener('online', handleNetworkOnline);
    window.addEventListener('offline', handleNetworkOffline);
}

function setupErrorHandlers() {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

// ==================== CALL INITIATION ====================
window.startCall = async function(friendId, friendName, callType = 'voice', isGroupCall = false, participants = []) {
    console.log('📞 Starting call:', { friendName, callType, isGroupCall });
    
    if (!window.callState.isInitialized) {
        console.error('❌ Call system not initialized');
        showToast('Call system not ready. Please wait...', 'error');
        return;
    }
    
    if (window.callState.isInCall) {
        showToast('You are already in a call', 'warning');
        return;
    }
    
    if (!window.callState.isOnline) {
        showToast('You are offline. Please check your connection.', 'error');
        return;
    }
    
    if (!friendId || !friendName) {
        showToast('Cannot start call: missing contact information', 'error');
        return;
    }
    
    try {
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        window.callState.isCaller = true;
        window.callState.remoteUserId = friendId;
        window.callState.callId = callId;
        window.callState.callType = callType;
        window.callState.isInCall = true;
        window.callState.isGroupCall = isGroupCall;
        window.callState.callStartTime = Date.now();
        
        const callDocRef = firebase.firestore().collection('calls').doc(callId);
        window.callState.currentCallDocument = callDocRef;
        
        const expiresAt = new Date(Date.now() + CALL_SETTINGS.CALL_TIMEOUT);
        
        const callData = {
            callId: callId,
            callerId: window.callState.currentUser.uid,
            callerName: window.currentUserData?.displayName || window.callState.currentUser.displayName || 'Unknown',
            receiverId: friendId,
            callType: callType,
            isGroupCall: isGroupCall,
            participants: isGroupCall ? participants : [friendId],
            status: 'ringing',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            callerCandidates: [],
            receiverCandidates: [],
            metadata: {
                callerOnlineStatus: window.callState.onlineStatus,
                platform: navigator.platform,
                timestamp: Date.now()
            },
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await callDocRef.set(callData);
        
        setCallExpiryTimer(callId, CALL_SETTINGS.CALL_TIMEOUT);
        
        try {
            await getLocalMediaStream(callType);
        } catch (mediaError) {
            console.error('❌ Failed to get media stream:', mediaError);
            showToast('Failed to access camera/microphone. Please check permissions.', 'error');
            cleanupCallState();
            return;
        }
        
        await createPeerConnection();
        await createAndSendOffer(callId);
        
        showCallUI(friendName, callType, 'calling');
        
        playRingtone('outgoing');
        startCallTimer();
        
        console.log('✅ Call started successfully');
        logAnalyticsEvent('call_initiated', {
            callType: callType,
            isGroupCall: isGroupCall
        });
        
    } catch (error) {
        console.error('❌ Error starting call:', error);
        showToast('Failed to start call: ' + error.message, 'error');
        cleanupCallState();
    }
};

// ==================== MEDIA STREAM MANAGEMENT ====================
async function getLocalMediaStream(callType, constraintsOverride = null) {
    console.log('🎥 Getting local media stream');
    
    try {
        const constraints = constraintsOverride || getMediaConstraints(callType);
        
        window.callState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (callType === 'video') {
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = window.callState.localStream;
                localVideo.muted = true;
                localVideo.play().catch(console.warn);
            }
        }
        
        console.log('✅ Local media stream obtained');
        return window.callState.localStream;
        
    } catch (error) {
        console.error('❌ Error getting media stream:', error);
        throw handleMediaError(error, callType);
    }
}

function getMediaConstraints(callType) {
    return {
        audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true }
        },
        video: callType === 'video' ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: window.callState.currentCamera === 'user' ? 'user' : 'environment'
        } : false
    };
}

function handleMediaError(error, callType) {
    console.error('❌ Media error:', error);
    
    if (error.name === 'NotAllowedError') {
        showToast('Please allow camera/microphone access in browser settings', 'error');
        return new Error('Permission denied');
    } else if (error.name === 'NotFoundError') {
        showToast('Camera/microphone not found', 'error');
        return new Error('Device not found');
    } else if (error.name === 'NotReadableError') {
        showToast('Camera/microphone is already in use', 'error');
        return new Error('Device busy');
    } else if (error.name === 'OverconstrainedError') {
        showToast('Camera/microphone does not support required settings', 'error');
        return new Error('Device constraints not met');
    } else {
        showToast('Failed to access camera/microphone', 'error');
        return error;
    }
}

// ==================== PEER CONNECTION MANAGEMENT ====================
async function createPeerConnection() {
    console.log('🔗 Creating peer connection');
    
    try {
        window.callState.peerConnection = new RTCPeerConnection(RTC_CONFIG);
        
        if (window.callState.localStream) {
            window.callState.localStream.getTracks().forEach(track => {
                window.callState.peerConnection.addTrack(track, window.callState.localStream);
            });
        }
        
        setupPeerConnectionEventHandlers();
        
        console.log('✅ Peer connection created');
        
    } catch (error) {
        console.error('❌ Error creating peer connection:', error);
        throw error;
    }
}

function setupPeerConnectionEventHandlers() {
    const pc = window.callState.peerConnection;
    
    pc.ontrack = (event) => {
        console.log('📹 Remote track received:', event.track.kind);
        
        if (!window.callState.remoteStream) {
            window.callState.remoteStream = new MediaStream();
        }
        
        window.callState.remoteStream.addTrack(event.track);
        
        if (event.track.kind === 'video') {
            updateRemoteVideo(event.streams[0]);
        } else if (event.track.kind === 'audio') {
            updateRemoteAudio(event.streams[0]);
        }
    };
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendIceCandidate(event.candidate);
        }
    };
    
    pc.oniceconnectionstatechange = () => {
        console.log('❄️ ICE connection state:', pc.iceConnectionState);
        updateIceConnectionState(pc.iceConnectionState);
    };
    
    pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        updateConnectionState(pc.connectionState);
    };
    
    pc.onsignalingstatechange = () => {
        console.log('📶 Signaling state:', pc.signalingState);
    };
    
    pc.onnegotiationneeded = async () => {
        console.log('🔄 Negotiation needed');
        try {
            if (window.callState.isCaller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendOfferToFirestore(offer);
            }
        } catch (error) {
            console.error('❌ Error during negotiation:', error);
        }
    };
}

// ==================== WEBRTC SIGNALING ====================
async function createAndSendOffer(callId) {
    try {
        const peerConnection = window.callState.peerConnection;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        await firebase.firestore().collection('calls').doc(callId).update({
            offer: offer,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Offer created and sent');
        
    } catch (error) {
        console.error('❌ Error creating/sending offer:', error);
        throw error;
    }
}

async function sendIceCandidate(candidate) {
    try {
        if (!window.callState.callId) return;
        
        const field = window.callState.isCaller ? 'callerCandidates' : 'receiverCandidates';
        
        await firebase.firestore().collection('calls').doc(window.callState.callId).update({
            [field]: firebase.firestore.FieldValue.arrayUnion(candidate),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.warn('⚠️ Error sending ICE candidate:', error);
    }
}

// ==================== INCOMING CALL HANDLING ====================
window.listenForIncomingCalls = function() {
    console.log('👂 Listening for incoming calls');
    
    if (!window.callState.currentUser || !window.callState.isOnline) {
        console.warn('⚠️ Cannot listen for calls: no user or offline');
        return;
    }
    
    cleanupCallListeners();
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const incomingCallsUnsub = firebase.firestore().collection('calls')
        .where('receiverId', '==', window.callState.currentUser.uid)
        .where('status', '==', 'ringing')
        .where('createdAt', '>', fiveMinutesAgo)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    console.log('📞 New call detected from:', callData.callerName);
                    
                    handleIncomingCallUpdate(callData);
                }
                
                if (change.type === 'modified') {
                    const callData = change.doc.data();
                    if (callData.status !== 'ringing') {
                        window.callState.processedCallIds.delete(change.doc.id);
                        
                        if (window.callState.callId === change.doc.id) {
                            hideIncomingCallPopup();
                            stopRingtone();
                            window.callState.isReceivingCall = false;
                        }
                    }
                }
            });
        }, (error) => {
            console.error('❌ Error in incoming calls listener:', error);
        });
    
    window.callState.unsubscribers.push(incomingCallsUnsub);
    
    console.log('✅ Incoming call listener active');
};

function handleIncomingCallUpdate(callData) {
    const callId = callData.callId;
    
    if (!callId || !callData.callerId) {
        console.warn('⚠️ Invalid call data received:', callData);
        return;
    }
    
    if (window.callState.processedCallIds.has(callId)) {
        console.log(`⏭️ Already processed call: ${callId}`);
        return;
    }
    
    if (window.callState.isInCall) {
        console.log(`⏭️ Already in a call, skipping: ${callId}`);
        window.callState.processedCallIds.add(callId);
        return;
    }
    
    if (window.callState.isReceivingCall) {
        console.log(`⏭️ Already receiving a call, skipping: ${callId}`);
        return;
    }
    
    console.log(`📞 Handling incoming call: ${callId} from ${callData.callerName}`);
    
    window.callState.isReceivingCall = true;
    window.callState.callId = callId;
    window.callState.remoteUserId = callData.callerId;
    window.callState.callType = callData.callType;
    window.callState.isGroupCall = callData.isGroupCall || false;
    
    if (window.callState.incomingCallTimeout) {
        clearTimeout(window.callState.incomingCallTimeout);
    }
    
    window.callState.processedCallIds.add(callId);
    
    showIncomingCallPopup(
        callData.callerName,
        callData.callType,
        callId,
        callData.callerId
    );
    
    playRingtone('incoming');
    
    window.callState.incomingCallTimeout = setTimeout(() => {
        if (window.callState.isReceivingCall && window.callState.callId === callId) {
            console.log(`⏰ Ring timeout for call: ${callId}`);
            rejectCall(callId, 'no_answer');
        }
    }, CALL_SETTINGS.RING_TIMEOUT);
};

// ==================== CALL CONTROLS ====================
window.toggleMic = function() {
    if (!window.callState.localStream) return;
    
    const audioTracks = window.callState.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        window.callState.isMuted = !window.callState.isMuted;
        audioTracks.forEach(track => {
            track.enabled = !window.callState.isMuted;
        });
        
        updateMicButtonUI();
        
        console.log('🎤 Microphone', window.callState.isMuted ? 'muted' : 'unmuted');
        showToast(window.callState.isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
    }
};

window.toggleCamera = function() {
    if (!window.callState.localStream || window.callState.callType !== 'video') return;
    
    const videoTracks = window.callState.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
        window.callState.isVideoOff = !window.callState.isVideoOff;
        videoTracks.forEach(track => {
            track.enabled = !window.callState.isVideoOff;
        });
        
        updateCameraButtonUI();
        
        console.log('📷 Camera', window.callState.isVideoOff ? 'off' : 'on');
        showToast(window.callState.isVideoOff ? 'Camera turned off' : 'Camera turned on', 'info');
    }
};

window.switchCamera = async function() {
    if (!window.callState.localStream || window.callState.callType !== 'video') return;
    
    try {
        window.callState.currentCamera = window.callState.currentCamera === 'user' ? 'environment' : 'user';
        
        window.callState.localStream.getVideoTracks().forEach(track => track.stop());
        
        const constraints = getMediaConstraints('video');
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = window.callState.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
        );
        
        if (sender) {
            sender.replaceTrack(newVideoTrack);
        }
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = new MediaStream([newVideoTrack, ...window.callState.localStream.getAudioTracks()]);
        }
        
        window.callState.localStream = new MediaStream([
            newVideoTrack,
            ...window.callState.localStream.getAudioTracks()
        ]);
        
        console.log('🔄 Camera switched to:', window.callState.currentCamera);
        showToast('Camera switched', 'info');
        
    } catch (error) {
        console.error('❌ Error switching camera:', error);
        showToast('Failed to switch camera', 'error');
    }
};

// ==================== CALL ACCEPT/REJECT/END ====================
async function acceptCall(callId, remoteUserId, callType, isGroupCall) {
    console.log('✅ Accepting call:', callId);
    
    try {
        clearTimeout(window.callState.incomingCallTimeout);
        window.callState.isReceivingCall = false;
        
        await firebase.firestore().collection('calls').doc(callId).update({
            status: 'answered',
            answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await getLocalMediaStream(callType);
        await createPeerConnection();
        await listenForOffer(callId);
        
        const callerName = await getContactName(remoteUserId);
        showCallUI(callerName, callType, 'connected');
        
        stopRingtone();
        startCallTimer();
        
        console.log('✅ Call accepted');
        
    } catch (error) {
        console.error('❌ Error accepting call:', error);
        showToast('Failed to accept call', 'error');
        cleanupCallState();
    }
}

async function rejectCall(callId, reason = 'rejected') {
    console.log('❌ Rejecting call:', callId, reason);
    
    try {
        clearTimeout(window.callState.incomingCallTimeout);
        window.callState.isReceivingCall = false;
        
        await firebase.firestore().collection('calls').doc(callId).update({
            status: reason,
            endedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        hideIncomingCallPopup();
        stopRingtone();
        
        showToast('Call rejected', 'info');
        
    } catch (error) {
        console.error('❌ Error rejecting call:', error);
    } finally {
        cleanupCallState();
    }
}

async function endCall() {
    console.log('📴 Ending call');
    
    if (!window.callState.isInCall) return;
    
    try {
        const callId = window.callState.callId;
        
        if (callId && window.callState.currentCallDocument) {
            await window.callState.currentCallDocument.update({
                status: 'ended',
                endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                duration: Date.now() - window.callState.callStartTime,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showToast('Call ended', 'info');
        
    } catch (error) {
        console.error('❌ Error ending call:', error);
    } finally {
        cleanupCallState();
        hideCallUI();
    }
}

// ==================== CALL STATE CLEANUP ====================
function cleanupCallState() {
    console.log('🧹 Cleaning up call state');
    
    cleanupAllMedia();
    
    if (window.callState.timerInterval) {
        clearInterval(window.callState.timerInterval);
        window.callState.timerInterval = null;
    }
    
    if (window.callState.incomingCallTimeout) {
        clearTimeout(window.callState.incomingCallTimeout);
        window.callState.incomingCallTimeout = null;
    }
    
    window.callState.isCaller = false;
    window.callState.isReceivingCall = false;
    window.callState.remoteUserId = null;
    window.callState.callId = null;
    window.callState.callType = null;
    window.callState.isInCall = false;
    window.callState.isGroupCall = false;
    window.callState.callStartTime = null;
    window.callState.currentCallDocument = null;
    window.callState.isMuted = false;
    window.callState.isVideoOff = false;
    window.callState.localStream = null;
    window.callState.remoteStream = null;
    window.callState.peerConnection = null;
    
    window.callState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    window.callState.unsubscribers = [];
    
    updateOnlineStatusIndicator();
}

function cleanupAllMedia() {
    [window.callState.localStream, window.callState.remoteStream, window.callState.screenShareStream]
        .forEach(stream => {
            if (stream) {
                stream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            }
        });
    
    stopRingtone();
    stopHoldMusic();
    
    ['localVideo', 'remoteVideo'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.srcObject = null;
            element.pause();
        }
    });
    
    if (window.callState.peerConnection) {
        try {
            window.callState.peerConnection.getSenders().forEach(sender => {
                if (sender.track) sender.track.stop();
            });
            window.callState.peerConnection.close();
        } catch (error) {
            console.warn('⚠️ Error closing peer connection:', error);
        }
        window.callState.peerConnection = null;
    }
}

// ==================== UI FUNCTIONS ====================
function showIncomingCallPopup(callerName, callType, callId, callerId) {
    console.log('📞 Showing incoming call popup for:', callerName);
    
    let popup = document.getElementById('incomingCallPopup');
    if (!popup) {
        popup = createIncomingCallPopup();
    }
    
    const callerNameEl = popup.querySelector('#incomingCallerName');
    const callTypeEl = popup.querySelector('#incomingCallType');
    
    if (callerNameEl) callerNameEl.textContent = callerName;
    if (callTypeEl) callTypeEl.textContent = callType === 'video' ? 'Video Call' : 'Voice Call';
    
    const acceptBtn = popup.querySelector('#acceptCallBtn');
    const rejectBtn = popup.querySelector('#rejectCallBtn');
    
    if (acceptBtn) {
        acceptBtn.onclick = () => {
            acceptCall(callId, callerId, callType, false);
        };
    }
    
    if (rejectBtn) {
        rejectBtn.onclick = () => {
            rejectCall(callId);
        };
    }
    
    popup.style.display = 'flex';
    popup.classList.add('active');
}

function createIncomingCallPopup() {
    const popup = document.createElement('div');
    popup.id = 'incomingCallPopup';
    popup.className = 'incoming-call-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    popup.innerHTML = `
        <div class="incoming-call-content" style="
            background: white;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
            <div class="caller-avatar" style="
                width: 100px;
                height: 100px;
                background: #3b82f6;
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: white;
                font-weight: bold;
            ">?</div>
            <h2 id="incomingCallerName" style="margin: 0 0 10px; color: #333;">Unknown Caller</h2>
            <p id="incomingCallType" style="color: #666; margin: 0 0 30px;">Incoming Call</p>
            <div class="call-actions" style="display: flex; gap: 15px; justify-content: center;">
                <button id="rejectCallBtn" class="reject-call-btn" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    font-size: 24px;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">✕</button>
                <button id="acceptCallBtn" class="accept-call-btn" style="
                    background: #10b981;
                    color: white;
                    border: none;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    font-size: 24px;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">✓</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    return popup;
}

function hideIncomingCallPopup() {
    const popup = document.getElementById('incomingCallPopup');
    if (popup) {
        popup.style.display = 'none';
        popup.classList.remove('active');
    }
}

function showCallUI(friendName, callType, status) {
    console.log('📱 Showing call UI for:', friendName, status);
    
    let callContainer = document.getElementById('videoCallContainer');
    if (!callContainer) {
        callContainer = document.getElementById('callContainer');
    }
    
    if (!callContainer) {
        callContainer = createCallContainer();
    }
    
    callContainer.className = callType === 'video' ? 
        'hidden fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center p-4' :
        'fixed inset-0 bg-black z-40 hidden flex-col';
    
    const remoteNameEl = callContainer.querySelector('#remoteUserName') || 
                        callContainer.querySelector('#incomingCallerName') ||
                        callContainer.querySelector('h2');
    const callStatusEl = callContainer.querySelector('#callStatus');
    const callTimerEl = callContainer.querySelector('#callTimer');
    const remoteVideo = callContainer.querySelector('#remoteVideo');
    const localVideo = callContainer.querySelector('#localVideo');
    const toggleMicBtn = callContainer.querySelector('#toggleMicBtn');
    const toggleCameraBtn = callContainer.querySelector('#toggleCameraBtn');
    const switchCameraBtn = callContainer.querySelector('#switchCameraBtn');
    const endCallBtn = callContainer.querySelector('#endCallBtn');
    
    if (remoteNameEl) remoteNameEl.textContent = friendName;
    if (callStatusEl) callStatusEl.textContent = status;
    if (callTimerEl) callTimerEl.textContent = '00:00';
    
    if (toggleMicBtn) {
        toggleMicBtn.onclick = toggleMic;
    }
    
    if (toggleCameraBtn) {
        toggleCameraBtn.onclick = toggleCamera;
    }
    
    if (switchCameraBtn) {
        switchCameraBtn.onclick = switchCamera;
    }
    
    if (endCallBtn) {
        endCallBtn.onclick = endCall;
    }
    
    if (callType === 'video') {
        callContainer.classList.add('video-call');
        if (remoteVideo) {
            remoteVideo.style.display = 'block';
        }
        if (localVideo) {
            localVideo.style.display = 'block';
        }
        if (toggleCameraBtn) {
            toggleCameraBtn.style.display = 'block';
        }
        if (switchCameraBtn) {
            switchCameraBtn.style.display = 'block';
        }
    } else {
        callContainer.classList.remove('video-call');
        if (remoteVideo) {
            remoteVideo.style.display = 'none';
        }
        if (localVideo) {
            localVideo.style.display = 'none';
        }
        if (toggleCameraBtn) {
            toggleCameraBtn.style.display = 'none';
        }
        if (switchCameraBtn) {
            switchCameraBtn.style.display = 'none';
        }
    }
    
    callContainer.style.display = 'flex';
    callContainer.classList.remove('hidden');
    callContainer.classList.add('active');
    
    updateCallControlsUI();
}

function createCallContainer() {
    const container = document.createElement('div');
    container.id = 'videoCallContainer';
    container.className = 'hidden fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center p-4';
    
    container.innerHTML = `
        <div class="call-header" style="position: absolute; top: 20px; left: 20px; right: 20px; text-align: center; z-index: 10; color: white;">
            <h2 id="remoteUserName" style="margin: 0; font-size: 24px; font-weight: bold;">Calling...</h2>
            <p id="callStatus" style="margin: 5px 0 0; color: #aaa; font-size: 16px;">Connecting...</p>
            <p id="callTimer" style="margin: 5px 0 20px; color: #aaa; font-size: 16px;">00:00</p>
        </div>
        
        <div class="video-container" style="width: 100%; height: calc(100% - 120px); position: relative;">
            <video id="remoteVideo" autoplay playsinline style="
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 12px;
                display: none;
            "></video>
            <video id="localVideo" autoplay playsinline muted style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 120px;
                height: 160px;
                object-fit: cover;
                border-radius: 8px;
                border: 2px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: none;
            "></video>
        </div>
        
        <div class="call-controls" style="
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 20px;
            background: rgba(0,0,0,0.7);
            padding: 20px;
            border-radius: 50px;
            backdrop-filter: blur(10px);
            z-index: 10;
        ">
            <button id="toggleMicBtn" class="toggle-mic-btn" style="
                background: #4a5568;
                color: white;
                border: none;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            ">🎤</button>
            
            <button id="toggleCameraBtn" class="toggle-camera-btn" style="
                background: #4a5568;
                color: white;
                border: none;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
                display: none;
                align-items: center;
                justify-content: center;
            ">📷</button>
            
            <button id="switchCameraBtn" class="switch-camera-btn" style="
                background: #4a5568;
                color: white;
                border: none;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
                display: none;
                align-items: center;
                justify-content: center;
            ">🔄</button>
            
            <button id="endCallBtn" class="end-call-btn" style="
                background: #ef4444;
                color: white;
                border: none;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: transform 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            ">📴</button>
        </div>
    `;
    
    document.body.appendChild(container);
    return container;
}

function hideCallUI() {
    const containers = ['videoCallContainer', 'callContainer', 'videoConference', 'incomingCallPopup'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = 'none';
            container.classList.add('hidden');
            container.classList.remove('active');
        }
    });
}

function updateRemoteVideo(stream) {
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
        remoteVideo.srcObject = stream;
        remoteVideo.play().catch(console.warn);
    }
}

function updateRemoteAudio(stream) {
    const remoteAudio = document.getElementById('remoteAudio') || document.getElementById('remoteVideo');
    if (remoteAudio) {
        remoteAudio.srcObject = stream;
    }
}

// ==================== ENHANCED BUTTON HANDLERS ====================
function setupCallButtonListeners() {
    console.log('🎯 Setting up call button listeners');
    
    document.removeEventListener('click', handleCallButtonClicks);
    document.removeEventListener('touchstart', handleCallButtonClicks);
    
    document.addEventListener('click', handleCallButtonClicks);
    document.addEventListener('touchstart', handleCallButtonClicks, { passive: true });
    
    console.log('✅ Call button listeners set up');
}

function handleCallButtonClicks(e) {
    const button = e.target.closest('[data-id]');
    
    if (button && (button.classList.contains('call-button') || 
                   button.classList.contains('friend-call-btn') || 
                   button.classList.contains('friend-video-call-btn') ||
                   button.classList.contains('voice-call-btn') ||
                   button.classList.contains('video-call-btn') ||
                   button.hasAttribute('data-call-type'))) {
        e.preventDefault();
        e.stopPropagation();
        
        let callType = button.dataset.callType || 'voice';
        
        if (!callType || callType === 'voice') {
            if (button.classList.contains('friend-video-call-btn') || 
                button.classList.contains('video-call-btn') ||
                button.textContent.includes('Video') ||
                button.innerHTML.includes('📹')) {
                callType = 'video';
            }
        }
        
        handleEnhancedCallButtonClick(button, callType);
        return;
    }
    
    if (e.target.closest('#acceptCallBtn, .accept-call-btn')) {
        e.preventDefault();
        e.stopPropagation();
        if (window.callState.isReceivingCall && window.callState.callId) {
            acceptCall(
                window.callState.callId,
                window.callState.remoteUserId,
                window.callState.callType,
                window.callState.isGroupCall
            );
        }
        return;
    }
    
    if (e.target.closest('#rejectCallBtn, .reject-call-btn')) {
        e.preventDefault();
        e.stopPropagation();
        if (window.callState.callId) {
            rejectCall(window.callState.callId);
        }
        return;
    }
    
    if (e.target.closest('#endCallBtn, .end-call-btn')) {
        e.preventDefault();
        e.stopPropagation();
        endCall();
        return;
    }
    
    if (e.target.closest('#toggleMicBtn, .toggle-mic-btn')) {
        e.preventDefault();
        e.stopPropagation();
        toggleMic();
        return;
    }
    
    if (e.target.closest('#toggleCameraBtn, .toggle-camera-btn')) {
        e.preventDefault();
        e.stopPropagation();
        toggleCamera();
        return;
    }
    
    if (e.target.closest('#switchCameraBtn, .switch-camera-btn')) {
        e.preventDefault();
        e.stopPropagation();
        switchCamera();
        return;
    }
}

function handleEnhancedCallButtonClick(button, callType) {
    console.log('🎯 Enhanced call button clicked:', { button, callType });
    
    if (!window.callState.isInitialized) {
        console.warn('⚠️ Call system not initialized');
        
        if (!window.callState.isInitializing) {
            console.log('🔄 Attempting to initialize call system...');
            window.initializeCallSystem();
        }
        
        showToast('Call system is initializing. Please wait...', 'warning');
        return;
    }
    
    // REMOVED: No authentication check here
    // Users are expected to be logged in already
    
    let userId = button.dataset.id || 
                button.dataset.userId || 
                button.dataset.friendId || 
                button.dataset.contactId;
    
    let userName = button.dataset.name || 
                  button.dataset.userName || 
                  button.dataset.friendName || 
                  button.dataset.contactName ||
                  'Unknown';
    
    console.log(`🔍 Extracted user data from button:`, { userId, userName });
    
    if (!userId) {
        const parentContainer = button.closest('[data-id], [data-user-id], [data-friend-id], .friend-item, .chat-item, .contact-item');
        if (parentContainer) {
            userId = parentContainer.dataset.id || 
                    parentContainer.dataset.userId || 
                    parentContainer.dataset.friendId;
            userName = parentContainer.dataset.name || 
                      parentContainer.dataset.userName || 
                      parentContainer.dataset.friendName || 
                      'Unknown';
        }
    }
    
    if (!userId) {
        if (window.currentChatFriend) {
            userId = window.currentChatFriend.id;
            userName = window.currentChatFriend.name;
        } else if (window.currentFriendData) {
            userId = window.currentFriendData.id;
            userName = window.currentFriendData.name;
        } else if (window.activeChatUser) {
            userId = window.activeChatUser.id;
            userName = window.activeChatUser.name;
        }
    }
    
    console.log(`📞 Attempting ${callType} call to:`, { userId, userName });
    
    if (!userId) {
        console.error('❌ No user ID found');
        showToast('Cannot find user information. Please ensure call buttons have data-id and data-name attributes.', 'error');
        return;
    }
    
    // Check if we have a current user
    if (!window.callState.currentUser) {
        console.warn('⚠️ No current user found, trying to get from Firebase');
        const user = firebase.auth().currentUser;
        if (user) {
            window.callState.currentUser = user;
        } else {
            showToast('Please wait for authentication to complete', 'warning');
            return;
        }
    }
    
    if (userId === window.callState.currentUser.uid) {
        showToast('You cannot call yourself', 'warning');
        return;
    }
    
    if (window.startCall) {
        console.log(`🚀 Starting ${callType} call to ${userName} (${userId})`);
        window.startCall(userId, userName, callType);
    } else {
        console.error('❌ startCall function not available');
        showToast('Call system not ready. Please refresh the page.', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================
async function getContactName(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data().displayName || 'Unknown';
        }
        return 'Unknown';
    } catch (error) {
        console.warn('⚠️ Error getting contact name:', error);
        return 'Unknown';
    }
}

async function updateOnlineStatus(userId, status) {
    try {
        if (window.callState.userPresenceDoc) {
            await window.callState.userPresenceDoc.update({
                onlineStatus: status,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.warn('⚠️ Error updating online status:', error);
    }
}

function cleanupCallListeners() {
    window.callState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    window.callState.unsubscribers = [];
}

function setCallExpiryTimer(callId, timeout) {
    const timer = setTimeout(async () => {
        try {
            await firebase.firestore().collection('calls').doc(callId).update({
                status: 'timeout',
                endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('⚠️ Error expiring call:', error);
        }
    }, timeout);
    
    window.callState.callExpiryTimers.set(callId, timer);
}

async function listenForOffer(callId) {
    const callDoc = firebase.firestore().collection('calls').doc(callId);
    
    const unsub = callDoc.onSnapshot(async (doc) => {
        if (doc.exists) {
            const data = doc.data();
            
            if (data.offer && !window.callState.peerConnection.currentRemoteDescription) {
                const peerConnection = window.callState.peerConnection;
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                await callDoc.update({
                    answer: answer,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            if (data.callerCandidates) {
                data.callerCandidates.forEach(async (candidate) => {
                    try {
                        await window.callState.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (error) {
                        console.warn('⚠️ Error adding ICE candidate:', error);
                    }
                });
            }
        }
    });
    
    window.callState.unsubscribers.push(unsub);
}

// ==================== CALL TIMER ====================
function startCallTimer() {
    if (window.callState.timerInterval) {
        clearInterval(window.callState.timerInterval);
    }
    
    window.callState.callStartTime = Date.now();
    
    window.callState.timerInterval = setInterval(() => {
        updateCallTimer();
    }, 1000);
}

function stopCallTimer() {
    if (window.callState.timerInterval) {
        clearInterval(window.callState.timerInterval);
        window.callState.timerInterval = null;
    }
}

function updateCallTimer() {
    if (!window.callState.callStartTime) return;
    
    const elapsed = Math.floor((Date.now() - window.callState.callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('callTimer');
    if (timerElement) {
        timerElement.textContent = timerText;
    }
}

// ==================== RINGTONE FUNCTIONS ====================
function playRingtone(type) {
    try {
        stopRingtone();
        
        const audio = new Audio();
        if (type === 'incoming') {
            audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3';
        } else {
            audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-phone-ring-1091.mp3';
        }
        
        audio.loop = true;
        audio.volume = 0.3;
        audio.play().catch(console.warn);
        
        window.callState.ringtoneSource = audio;
        
    } catch (error) {
        console.warn('⚠️ Could not play ringtone:', error);
    }
}

function stopRingtone() {
    if (window.callState.ringtoneSource) {
        window.callState.ringtoneSource.pause();
        window.callState.ringtoneSource.currentTime = 0;
        window.callState.ringtoneSource = null;
    }
}

function stopHoldMusic() {
    if (window.callState.holdMusicAudio) {
        window.callState.holdMusicAudio.pause();
        window.callState.holdMusicAudio.currentTime = 0;
        window.callState.holdMusicAudio = null;
    }
}

// ==================== UI UPDATES ====================
function updateMicButtonUI() {
    const micBtn = document.getElementById('toggleMicBtn');
    if (!micBtn) return;
    
    if (window.callState.isMuted) {
        micBtn.style.background = '#ef4444';
        micBtn.innerHTML = '🎤❌';
        micBtn.title = 'Unmute microphone';
    } else {
        micBtn.style.background = '#4a5568';
        micBtn.innerHTML = '🎤';
        micBtn.title = 'Mute microphone';
    }
}

function updateCameraButtonUI() {
    const cameraBtn = document.getElementById('toggleCameraBtn');
    
    if (cameraBtn) {
        if (window.callState.isVideoOff) {
            cameraBtn.style.background = '#ef4444';
            cameraBtn.innerHTML = '📷❌';
            cameraBtn.title = 'Turn camera on';
        } else {
            cameraBtn.style.background = '#4a5568';
            cameraBtn.innerHTML = '📷';
            cameraBtn.title = 'Turn camera off';
        }
    }
}

function updateCallControlsUI() {
    const cameraBtn = document.getElementById('toggleCameraBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    
    if (cameraBtn) {
        cameraBtn.style.display = window.callState.callType === 'video' ? 'flex' : 'none';
    }
    
    if (switchCameraBtn) {
        switchCameraBtn.style.display = window.callState.callType === 'video' ? 'flex' : 'none';
    }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info', duration = 3000) {
    const toastId = 'call-toast-' + Date.now();
    
    const existingToasts = document.querySelectorAll('.call-toast');
    existingToasts.forEach(toast => {
        if (toast.textContent === message) {
            toast.remove();
        }
    });
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `call-toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${getToastColor(type)};
        color: white;
        border-radius: 8px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    if (!document.querySelector('#call-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'call-toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            toastElement.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toastElement.parentNode) {
                    document.body.removeChild(toastElement);
                }
            }, 300);
        }
    }, duration);
    
    return toastId;
}

function showSystemToast(message, type = 'info') {
    console.log(`📢 System: ${message}`);
    return showToast(message, type, 5000);
}

function getToastColor(type) {
    const colors = {
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

// ==================== EVENT HANDLERS ====================
function handleEnhancedVisibilityChange() {
    if (document.hidden) {
        console.log('📱 Page hidden');
        
        if (window.callState.isInCall) {
            showNotification('Call continues in background');
        }
        
        if (!window.callState.isInCall && !window.callState.isReceivingCall) {
            stopRingtone();
        }
        
    } else {
        console.log('📱 Page visible');
        
        if (window.callState.currentUser && !window.callState.isInCall) {
            setTimeout(() => {
                listenForIncomingCalls();
            }, 1000);
        }
    }
}

function handleBeforeUnload(e) {
    if (window.callState.isInCall) {
        e.preventDefault();
        e.returnValue = 'You are in a call. Are you sure you want to leave?';
        return e.returnValue;
    }
    
    if (window.callState.currentUser) {
        updateOnlineStatus(window.callState.currentUser.uid, 'offline');
    }
}

function handleWindowResize() {
    // Adjust UI on resize if needed
}

function handleWindowFocus() {
    console.log('🪟 Window focused');
}

function handleWindowBlur() {
    console.log('🪟 Window blurred');
}

function handleNetworkChange() {
    console.log('🌐 Network connection changed');
    
    if (navigator.connection) {
        const connection = navigator.connection;
        window.callState.networkType = connection.effectiveType;
        window.callState.networkSpeed = connection.downlink;
        
        console.log(`Network type: ${window.callState.networkType}, Speed: ${window.callState.networkSpeed}Mbps`);
    }
}

function handleNetworkOnline() {
    console.log('🌐 Network online');
    window.callState.isOnline = true;
    
    if (window.callState.currentUser) {
        updateOnlineStatus(window.callState.currentUser.uid, 'online');
        listenForIncomingCalls();
    }
}

function handleNetworkOffline() {
    console.log('📵 Network offline');
    window.callState.isOnline = false;
    
    if (window.callState.currentUser) {
        updateOnlineStatus(window.callState.currentUser.uid, 'offline');
        cleanupCallListeners();
    }
}

function handleGlobalError(event) {
    console.error('🌍 Global error:', event.error);
    window.callState.lastError = event.error;
    window.callState.errorCount++;
}

function handleUnhandledRejection(event) {
    console.error('❌ Unhandled rejection:', event.reason);
}

function handleKeyboardShortcuts(e) {
    if (!window.callState.keyboardShortcutsEnabled) return;
    
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    
    switch(e.key.toLowerCase()) {
        case 'm':
            if (window.callState.isInCall) {
                e.preventDefault();
                toggleMic();
            }
            break;
        case 'c':
            if (window.callState.isInCall && window.callState.callType === 'video') {
                e.preventDefault();
                toggleCamera();
            }
            break;
        case 's':
            if (window.callState.isInCall && window.callState.callType === 'video') {
                e.preventDefault();
                switchCamera();
            }
            break;
        case 'escape':
            e.preventDefault();
            if (window.callState.isInCall) {
                endCall();
            } else if (window.callState.isReceivingCall) {
                rejectCall(window.callState.callId);
            }
            break;
        case 'a':
            if (window.callState.isReceivingCall) {
                e.preventDefault();
                document.getElementById('acceptCallBtn')?.click();
            }
            break;
        case 'r':
            if (window.callState.isReceivingCall) {
                e.preventDefault();
                document.getElementById('rejectCallBtn')?.click();
            }
            break;
    }
}

// ==================== CLEANUP FUNCTIONS ====================
function cleanupAllEventListeners() {
    const events = ['click', 'touchstart', 'keydown', 'visibilitychange', 'beforeunload'];
    
    events.forEach(event => {
        document.removeEventListener(event, handleCallButtonClicks);
        window.removeEventListener(event, handleEnhancedVisibilityChange);
    });
    
    window.callState.statusListeners.forEach(listener => {
        if (listener.cleanup) listener.cleanup();
    });
    window.callState.statusListeners = [];
    
    window.callState.networkListeners.forEach(({ type, handler }) => {
        window.removeEventListener(type, handler);
    });
    window.callState.networkListeners = [];
    
    window.callState.unsubscribers.forEach(unsub => {
        if (unsub && typeof unsub === 'function') {
            try {
                unsub();
            } catch (error) {
                console.warn('⚠️ Error unsubscribing:', error);
            }
        }
    });
    window.callState.unsubscribers = [];
}

function cleanupAllIntervals() {
    window.callState.cleanupIntervals.forEach(interval => {
        clearInterval(interval);
    });
    window.callState.cleanupIntervals = [];
    
    if (window.callState.timerInterval) {
        clearInterval(window.callState.timerInterval);
        window.callState.timerInterval = null;
    }
}

function cleanupAllTimers() {
    window.callState.callExpiryTimers.forEach(timerId => {
        clearTimeout(timerId);
    });
    window.callState.callExpiryTimers.clear();
    
    if (window.callState.incomingCallTimeout) {
        clearTimeout(window.callState.incomingCallTimeout);
        window.callState.incomingCallTimeout = null;
    }
}

function cleanupAllUI() {
    ['videoCallContainer', 'callContainer', 'incomingCallPopup'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
            element.classList.add('hidden');
        }
    });
    
    stopCallTimer();
}

function cleanupCallSystem() {
    console.log('🧹 Cleaning up call system');
    
    cleanupAllEventListeners();
    cleanupAllIntervals();
    cleanupAllTimers();
    cleanupAllMedia();
    cleanupAllUI();
    
    window.callState.isInitialized = false;
    window.callState.isInitializing = false;
    window.callState.currentUser = null;
    window.callState.processedCallIds.clear();
    window.callState.missedCalls = [];
    window.callState.callExpiryTimers.clear();
    window.callState.statusListeners = [];
    window.callState.networkListeners = [];
    window.callState.cleanupIntervals = [];
    window.callState.unsubscribers = [];
    
    console.log('✅ Call system cleanup done');
}

// ==================== MISC FUNCTIONS ====================
function logAnalyticsEvent(eventName, data = {}) {
    console.log(`📊 Analytics: ${eventName}`, data);
}

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Call System', {
            body: message,
            icon: '/icon.png'
        });
    }
}

function updateOnlineStatusIndicator() {
    const indicator = document.getElementById('onlineStatusIndicator');
    if (!indicator) return;
    
    indicator.textContent = window.callState.isOnline ? '🟢' : '🔴';
    indicator.title = window.callState.isOnline ? 'Online' : 'Offline';
}

function updateIceConnectionState(state) {
    console.log('❄️ ICE State:', state);
}

function updateConnectionState(state) {
    console.log('🔗 Connection State:', state);
    
    if (state === 'connected') {
        showToast('Call connected', 'success');
    } else if (state === 'disconnected' || state === 'failed') {
        showToast('Call disconnected', 'error');
        endCall();
    }
}

function updateOnlineStatusUI() {
    // Update any UI elements showing online status
}

function sendMuteStatusToRemote() {
    // Send mute status to remote peer (for future implementation)
}

function sendVideoStatusToRemote() {
    // Send video status to remote peer (for future implementation)
}

function sendOfferToFirestore(offer) {
    if (window.callState.callId) {
        return firebase.firestore().collection('calls').doc(window.callState.callId).update({
            offer: offer,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// ==================== USER PREFERENCES ====================
async function loadUserPreferences() {
    try {
        const prefs = localStorage.getItem('call_preferences');
        if (prefs) {
            const parsed = JSON.parse(prefs);
            if (parsed.selectedCamera) window.callState.selectedCamera = parsed.selectedCamera;
            if (parsed.selectedMicrophone) window.callState.selectedMicrophone = parsed.selectedMicrophone;
            if (parsed.selectedSpeaker) window.callState.selectedSpeaker = parsed.selectedSpeaker;
        }
    } catch (error) {
        console.warn('⚠️ Error loading preferences:', error);
    }
}

async function loadFavoriteContacts(userId) {
    try {
        const favorites = localStorage.getItem(`favorites_${userId}`);
        if (favorites) {
            const parsed = JSON.parse(favorites);
            window.callState.favoriteContacts = new Set(parsed);
        }
    } catch (error) {
        console.warn('⚠️ Error loading favorites:', error);
    }
}

function startAllBackgroundTasks(userId) {
    console.log('⚙️ Starting background tasks');
}

// ==================== BASIC LISTENERS ====================
function setupBasicCallListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-id]')) {
            showToast('Please log in to make calls', 'warning');
        }
    });
}

// ==================== CONFERENCE CALL FUNCTIONS ====================
window.startConferenceCall = async function(participantIds, participantNames, callType = 'video') {
    console.log('👥 Starting conference call with:', participantIds);
    
    if (!window.callState.isInitialized) {
        showToast('Call system not ready', 'error');
        return;
    }
    
    if (window.callState.isInCall) {
        showToast('You are already in a call', 'warning');
        return;
    }
    
    const conferenceRoomId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    window.callState.conferenceRoomId = conferenceRoomId;
    window.callState.isGroupCall = true;
    window.callState.isCaller = true;
    
    const conferenceRef = firebase.firestore().collection('conferences').doc(conferenceRoomId);
    
    await conferenceRef.set({
        conferenceId: conferenceRoomId,
        hostId: window.callState.currentUser.uid,
        hostName: window.callState.currentUser.displayName || 'Unknown',
        participants: participantIds,
        participantNames: participantNames,
        status: 'ringing',
        callType: callType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + CALL_SETTINGS.CONFERENCE_TIMEOUT)
    });
    
    for (let i = 0; i < participantIds.length; i++) {
        await startCall(participantIds[i], participantNames[i], callType, true, participantIds);
    }
    
    showConferenceUI(conferenceRoomId, participantNames);
    console.log('✅ Conference call initiated');
};

function showConferenceUI(conferenceRoomId, participantNames) {
    console.log('👥 Showing conference UI');
    
    let conferenceContainer = document.getElementById('videoConference');
    if (!conferenceContainer) {
        conferenceContainer = createConferenceContainer();
    }
    
    const grid = conferenceContainer.querySelector('#conferenceGrid');
    if (grid) {
        grid.innerHTML = '';
        
        const localParticipant = createParticipantCard(
            window.callState.currentUser.uid,
            'You (Host)',
            true
        );
        grid.appendChild(localParticipant);
        
        participantNames.forEach((name, index) => {
            const participantCard = createParticipantCard(
                `remote_${index}`,
                name,
                false
            );
            grid.appendChild(participantCard);
        });
    }
    
    const muteBtn = conferenceContainer.querySelector('#conferenceMuteBtn');
    const videoBtn = conferenceContainer.querySelector('#conferenceVideoBtn');
    const endBtn = conferenceContainer.querySelector('#conferenceEndBtn');
    
    if (muteBtn) muteBtn.onclick = toggleMic;
    if (videoBtn) videoBtn.onclick = toggleCamera;
    if (endBtn) endBtn.onclick = endConferenceCall;
    
    conferenceContainer.style.display = 'block';
    conferenceContainer.classList.remove('hidden');
};

function createConferenceContainer() {
    const container = document.createElement('div');
    container.id = 'videoConference';
    container.className = 'video-conference hidden fixed inset-0 bg-black z-50';
    
    container.innerHTML = `
        <div class="conference-header" style="position: absolute; top: 0; left: 0; right: 0; padding: 20px; background: rgba(0,0,0,0.7); color: white; z-index: 10;">
            <h2 style="margin: 0; font-size: 18px;">Conference Call</h2>
            <p id="conferenceTimer" style="margin: 5px 0 0; color: #aaa;">00:00</p>
        </div>
        
        <div id="conferenceGrid" style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 10px;
            padding: 80px 20px 100px;
            height: 100%;
            overflow-y: auto;
        "></div>
        
        <div class="conference-controls" style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            gap: 15px;
            z-index: 10;
        ">
            <button id="conferenceMuteBtn" style="
                background: #4a5568;
                color: white;
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
            ">🎤</button>
            
            <button id="conferenceVideoBtn" style="
                background: #4a5568;
                color: white;
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
            ">📷</button>
            
            <button id="conferenceEndBtn" style="
                background: #ef4444;
                color: white;
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
            ">📴</button>
        </div>
    `;
    
    document.body.appendChild(container);
    return container;
}

function createParticipantCard(participantId, participantName, isLocal) {
    const card = document.createElement('div');
    card.className = 'participant-card';
    card.style.cssText = `
        background: #2d3748;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
    `;
    
    card.innerHTML = `
        <video id="participant_${participantId}" autoplay playsinline ${isLocal ? 'muted' : ''} style="
            width: 100%;
            height: 200px;
            object-fit: cover;
        "></video>
        <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
        ">
            <p style="margin: 0; font-size: 14px;">${participantName}</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #aaa;">${isLocal ? 'You' : 'Connecting...'}</p>
        </div>
    `;
    
    return card;
}

async function endConferenceCall() {
    console.log('📴 Ending conference call');
    
    if (window.callState.conferenceRoomId) {
        try {
            await firebase.firestore().collection('conferences').doc(window.callState.conferenceRoomId).update({
                status: 'ended',
                endedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Error ending conference:', error);
        }
    }
    
    cleanupCallState();
    hideCallUI();
    
    const conferenceContainer = document.getElementById('videoConference');
    if (conferenceContainer) {
        conferenceContainer.style.display = 'none';
        conferenceContainer.classList.add('hidden');
    }
    
    showToast('Conference call ended', 'info');
}

// ==================== VOLUME CONTROL ====================
window.adjustRemoteVolume = function(volume) {
    const remoteAudio = document.getElementById('remoteAudio') || document.getElementById('remoteVideo');
    if (remoteAudio) {
        remoteAudio.volume = Math.max(0, Math.min(1, volume));
    }
};

window.adjustLocalVolume = function(volume) {
    const localVideo = document.getElementById('localVideo');
    if (localVideo) {
        localVideo.volume = Math.max(0, Math.min(1, volume));
    }
};

// ==================== INITIALIZATION ====================

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 call.js loaded - Waiting for DOM and Firebase...');
    
    // Setup basic listeners immediately
    setupBasicCallListeners();
    
    // Wait a bit for Firebase to potentially load
    setTimeout(() => {
        if (window.firebase && window.firebase.auth && window.firebase.firestore) {
            console.log('✅ Firebase loaded, initializing call system...');
            window.initializeCallSystem();
        } else {
            console.log('⏳ Firebase not loaded yet, will retry...');
            // Try to initialize anyway - Firebase might load later
            window.initializeCallSystem();
        }
    }, 1000);
    
    // Additional safety check after 3 seconds
    setTimeout(() => {
        if (!window.callState.isInitialized && !window.callState.isInitializing) {
            console.log('⏰ Initializing call system with fallback...');
            window.initializeCallSystem();
        }
    }, 3000);
});
// ==================== ENHANCED CALL FUNCTIONALITY ====================
window.setupFriendListCallButtons = function() {
    console.log('👥 Setting up friend list call buttons');
    
    const friendItems = document.querySelectorAll('.friend-item, .user-item, [data-friend]');
    
    friendItems.forEach(item => {
        if (!item.querySelector('.call-button')) {
            const friendId = item.dataset.id || item.dataset.userId || item.dataset.friendId;
            const friendName = item.dataset.name || item.dataset.userName || item.dataset.friendName || 'Friend';
            
            if (friendId) {
                const callButtons = document.createElement('div');
                callButtons.className = 'friend-call-buttons';
                callButtons.style.cssText = `
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                `;
                
                const voiceCallBtn = document.createElement('button');
                voiceCallBtn.className = 'friend-call-btn call-button';
                voiceCallBtn.dataset.id = friendId;
                voiceCallBtn.dataset.name = friendName;
                voiceCallBtn.dataset.callType = 'voice';
                voiceCallBtn.innerHTML = '📞';
                voiceCallBtn.title = 'Voice Call';
                voiceCallBtn.style.cssText = `
                    background: #10b981;
                    color: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                const videoCallBtn = document.createElement('button');
                videoCallBtn.className = 'friend-video-call-btn call-button';
                videoCallBtn.dataset.id = friendId;
                videoCallBtn.dataset.name = friendName;
                videoCallBtn.dataset.callType = 'video';
                videoCallBtn.innerHTML = '📹';
                videoCallBtn.title = 'Video Call';
                videoCallBtn.style.cssText = `
                    background: #3b82f6;
                    color: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                callButtons.appendChild(voiceCallBtn);
                callButtons.appendChild(videoCallBtn);
                item.appendChild(callButtons);
            }
        }
    });
    
    console.log(`✅ Added call buttons to ${friendItems.length} friend items`);
};

window.setupChatPanelCallButtons = function() {
    console.log('💬 Setting up chat panel call buttons');
    
    const chatHeader = document.querySelector('.chat-header, .active-chat-header, [data-active-chat]');
    
    if (chatHeader && !chatHeader.querySelector('.chat-call-buttons')) {
        const chatId = chatHeader.dataset.id || chatHeader.dataset.chatId || chatHeader.dataset.userId;
        const chatName = chatHeader.dataset.name || chatHeader.dataset.chatName || 'Chat';
        
        if (chatId) {
            const callButtons = document.createElement('div');
            callButtons.className = 'chat-call-buttons';
            callButtons.style.cssText = `
                display: flex;
                gap: 10px;
                margin-left: auto;
            `;
            
            const voiceCallBtn = document.createElement('button');
            voiceCallBtn.className = 'chat-call-btn call-button';
            voiceCallBtn.dataset.id = chatId;
            voiceCallBtn.dataset.name = chatName;
            voiceCallBtn.dataset.callType = 'voice';
            voiceCallBtn.innerHTML = '📞 Call';
            voiceCallBtn.title = 'Voice Call';
            voiceCallBtn.style.cssText = `
                background: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            
            const videoCallBtn = document.createElement('button');
            videoCallBtn.className = 'chat-video-call-btn call-button';
            videoCallBtn.dataset.id = chatId;
            videoCallBtn.dataset.name = chatName;
            videoCallBtn.dataset.callType = 'video';
            videoCallBtn.innerHTML = '📹 Video';
            videoCallBtn.title = 'Video Call';
            videoCallBtn.style.cssText = `
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            
            callButtons.appendChild(voiceCallBtn);
            callButtons.appendChild(videoCallBtn);
            chatHeader.appendChild(callButtons);
        }
    }
    
    console.log('✅ Added call buttons to chat panel');
};

window.updateFriendCallStatus = function(friendId, isOnline, isInCall) {
    const friendElement = document.querySelector(`[data-id="${friendId}"], [data-user-id="${friendId}"], [data-friend-id="${friendId}"]`);
    
    if (friendElement) {
        let statusIndicator = friendElement.querySelector('.call-status-indicator');
        
        if (!statusIndicator) {
            statusIndicator = document.createElement('span');
            statusIndicator.className = 'call-status-indicator';
            statusIndicator.style.cssText = `
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-left: 8px;
            `;
            
            const nameElement = friendElement.querySelector('.friend-name, .user-name, [data-name]');
            if (nameElement) {
                nameElement.appendChild(statusIndicator);
            }
        }
        
        if (isInCall) {
            statusIndicator.style.background = '#f59e0b';
            statusIndicator.title = 'In a call';
        } else if (isOnline) {
            statusIndicator.style.background = '#10b981';
            statusIndicator.title = 'Online';
        } else {
            statusIndicator.style.background = '#ef4444';
            statusIndicator.title = 'Offline';
        }
    }
};

window.startCall = async function(friendId, friendName, callType = 'voice', isGroupCall = false, participants = []) {
    console.log('📞 Starting call:', { friendName, callType, isGroupCall });
    
    if (!window.callState.isInitialized) {
        console.error('❌ Call system not initialized');
        showToast('Call system not ready. Please wait...', 'error');
        return;
    }
    
    // Ensure we have a current user
    if (!window.callState.currentUser) {
        const user = firebase.auth().currentUser;
        if (user) {
            window.callState.currentUser = user;
        } else {
            showToast('User not authenticated. Please log in.', 'error');
            return;
        }
    }
    
    if (window.callState.isInCall) {
        showToast('You are already in a call', 'warning');
        return;
    }
    
    if (!window.callState.isOnline) {
        showToast('You are offline. Please check your connection.', 'error');
        return;
    }
    
    if (!friendId || !friendName) {
        showToast('Cannot start call: missing contact information', 'error');
        return;
    }
    
    // ... rest of the function remains the same
};

window.setupAllCallButtons = function() {
    console.log('🔄 Setting up all call buttons');
    
    setupFriendListCallButtons();
    setupChatPanelCallButtons();
    setupCallButtonListeners();
    
    console.log('✅ All call buttons setup complete');
};

// ==================== EXPORT FUNCTIONS ====================
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.endCall = endCall;
window.toggleMic = toggleMic;
window.toggleCamera = toggleCamera;
window.switchCamera = switchCamera;
window.startConferenceCall = startConferenceCall;
window.endConferenceCall = endConferenceCall;
window.adjustRemoteVolume = adjustRemoteVolume;
window.adjustLocalVolume = adjustLocalVolume;
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
window.listenForIncomingCalls = listenForIncomingCalls;
window.setupFriendListCallButtons = setupFriendListCallButtons;
window.setupChatPanelCallButtons = setupChatPanelCallButtons;
window.setupAllCallButtons = setupAllCallButtons;
window.updateFriendCallStatus = updateFriendCallStatus;
window.manualStartCall = manualStartCall;

window.debugCallSystem = function() {
    console.log('🔍 Call System Debug:', {
        isInitialized: window.callState.isInitialized,
        isInitializing: window.callState.isInitializing,
        currentUser: window.callState.currentUser ? {
            uid: window.callState.currentUser.uid,
            name: window.callState.currentUser.displayName
        } : null,
        isOnline: window.callState.isOnline,
        isInCall: window.callState.isInCall,
        isReceivingCall: window.callState.isReceivingCall,
        callType: window.callState.callType,
        callId: window.callState.callId,
        initializationAttempts: window.callState.initializationAttempts
    });
};

console.log('✅ call.js loaded - Enhanced system ready for initialization');

window.addEventListener('callSystemInitialized', function() {
    console.log('🎉 Call system initialized, setting up all call buttons');
    window.setupAllCallButtons();
});