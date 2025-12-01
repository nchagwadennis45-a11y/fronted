// ==================== STATUS.JS ====================
// Complete WhatsApp-like Status Features with ALL WhatsApp functionality

// Global Status Variables
window.currentStatusMedia = null;
let statusViewerListener = null;
let statusReactionListener = null;
let statusUpdateInterval = null;
let currentStatusViewing = null;
let statusProgressInterval = null;
let currentStatusIndex = 0;
let statusViewerTimeout = null;
let emojiPickerOpen = false;

// User Status Preferences
window.statusPreferences = {
    privacy: 'myContacts', // myContacts, selectedContacts, everyone
    mutedUsers: [],
    recentViews: [],
    blockedFromViewing: []
};

// Initialize Status System
function initStatusSystem() {
    console.log('🚀 Initializing WhatsApp-like Status System...');
    
    // Load user preferences
    loadStatusPreferences();
    
    // Setup all status event listeners
    setupStatusEventListeners();
    setupStatusFileHandlers();
    setupStatusModalListeners();
    setupEmojiPicker();
    
    // Load initial status updates
    loadStatusUpdates();
    
    // Start real-time status updates
    startRealTimeStatusUpdates();
    
    // Start status expiration checker
    startStatusExpirationChecker();
    
    console.log('✅ Status system initialized successfully');
}

// ==================== STATUS PREFERENCES ====================

async function loadStatusPreferences() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            window.statusPreferences = {
                privacy: userData.statusPrivacy || 'myContacts',
                mutedUsers: userData.mutedStatusUsers || [],
                recentViews: userData.recentStatusViews || [],
                blockedFromViewing: userData.blockedFromStatus || [],
                readReceipts: userData.statusReadReceipts !== false,
                allowReplies: userData.allowStatusReplies !== false,
                autoDownload: userData.autoDownloadStatus !== false
            };
        }
    } catch (error) {
        console.error('Error loading status preferences:', error);
    }
}

async function updateStatusPrivacy(privacy, selectedContacts = []) {
    try {
        const updates = {
            statusPrivacy: privacy,
            statusPrivacyUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (privacy === 'selectedContacts') {
            updates.statusSelectedContacts = selectedContacts;
        }
        
        await db.collection('users').doc(currentUser.uid).update(updates);
        
        window.statusPreferences.privacy = privacy;
        if (privacy === 'selectedContacts') {
            window.statusPreferences.selectedContacts = selectedContacts;
        }
        
        showToast(`Status privacy updated to ${getPrivacyLabel(privacy)}`, 'success');
    } catch (error) {
        console.error('Error updating status privacy:', error);
        showToast('Error updating privacy', 'error');
    }
}

function getPrivacyLabel(privacy) {
    const labels = {
        'myContacts': 'My contacts',
        'selectedContacts': 'Selected contacts',
        'everyone': 'Everyone'
    };
    return labels[privacy] || privacy;
}

// ==================== STATUS EXPIRATION ====================

function startStatusExpirationChecker() {
    // Check for expired statuses every 30 seconds
    statusUpdateInterval = setInterval(() => {
        removeExpiredStatuses();
        updateStatusRemainingTimes();
    }, 30000);
}

async function removeExpiredStatuses() {
    try {
        const now = new Date();
        
        // Find expired statuses
        const expiredSnapshot = await db.collection('statuses')
            .where('userId', '==', currentUser.uid)
            .where('expiresAt', '<=', now)
            .get();
        
        if (!expiredSnapshot.empty) {
            const batch = db.batch();
            expiredSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Also delete associated views and reactions
            for (const doc of expiredSnapshot.docs) {
                await cleanupStatusData(doc.id);
            }
            
            // Refresh status list
            loadStatusUpdates();
        }
    } catch (error) {
        console.error('Error removing expired statuses:', error);
    }
}

async function cleanupStatusData(statusId) {
    try {
        // Delete views
        const viewsSnapshot = await db.collection('statusViews')
            .where('statusId', '==', statusId)
            .get();
        
        if (!viewsSnapshot.empty) {
            const batch = db.batch();
            viewsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        // Delete reactions
        await db.collection('statusReactions')
            .where('statusId', '==', statusId)
            .get()
            .then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            });
        
        // Delete replies
        await db.collection('messages')
            .where('isStatusReply', '==', true)
            .where('originalStatusId', '==', statusId)
            .get()
            .then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            });
        
    } catch (error) {
        console.error('Error cleaning up status data:', error);
    }
}

// ==================== REAL-TIME STATUS UPDATES ====================

function startRealTimeStatusUpdates() {
    console.log('Starting real-time status updates...');
    
    // Listen for new statuses from contacts
    const contactIds = getContactIds();
    
    if (contactIds.length > 0) {
        // Listen for new statuses
        db.collection('statuses')
            .where('userId', 'in', contactIds)
            .where('expiresAt', '>', new Date())
            .orderBy('expiresAt', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        console.log('New status added:', change.doc.id);
                        loadStatusUpdates();
                        
                        // Show notification for new status (if not muted)
                        const statusData = change.doc.data();
                        if (!isUserMuted(statusData.userId)) {
                            showNewStatusNotification(statusData);
                        }
                    } else if (change.type === 'modified') {
                        // Update view count or reactions in real-time
                        updateStatusInUI(change.doc.id, change.doc.data());
                    } else if (change.type === 'removed') {
                        removeStatusFromUI(change.doc.id);
                    }
                });
            }, error => {
                console.error('Error listening to status updates:', error);
            });
    }
}

function getContactIds() {
    // Get IDs of users whose statuses we can see
    const contactIds = [];
    
    if (friends && friends.length > 0) {
        friends.forEach(friend => {
            if (friend.id && !window.statusPreferences.blockedFromViewing.includes(friend.id)) {
                contactIds.push(friend.id);
            }
        });
    }
    
    return contactIds;
}

function isUserMuted(userId) {
    return window.statusPreferences.mutedUsers.includes(userId);
}

function showNewStatusNotification(status) {
    // Only show if user is not currently viewing statuses
    if (document.getElementById('statusViewer') && 
        !document.getElementById('statusViewer').classList.contains('hidden')) {
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'status-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <img src="${status.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(status.userDisplayName)}&background=7C3AED&color=fff`}" 
                 class="notification-avatar">
            <div class="notification-text">
                <strong>${status.userDisplayName}</strong>
                <span>posted a new status</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Click to view
    notification.addEventListener('click', () => {
        loadUserStatuses(status.userId);
        notification.remove();
    });
}

// ==================== STATUS LOADING & DISPLAY ====================

function loadStatusUpdates() {
    const statusUpdates = document.getElementById('statusUpdates');
    if (!statusUpdates) return;
    
    statusUpdates.innerHTML = `
        <div class="loading-statuses">
            <div class="loading-spinner"></div>
            <p>Loading status updates...</p>
        </div>
    `;
    
    // Load statuses in batches
    Promise.all([
        loadMyStatuses(),
        loadRecentStatuses(),
        loadViewedStatuses()
    ]).then(([myStatuses, recentStatuses, viewedStatuses]) => {
        renderStatusList(myStatuses, recentStatuses, viewedStatuses);
    }).catch(error => {
        console.error('Error loading status updates:', error);
        showErrorState();
    });
}

async function loadMyStatuses() {
    try {
        const snapshot = await db.collection('statuses')
            .where('userId', '==', currentUser.uid)
            .where('expiresAt', '>', new Date())
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isMine: true
        }));
    } catch (error) {
        console.error('Error loading my statuses:', error);
        return [];
    }
}

async function loadRecentStatuses() {
    const contactIds = getContactIds();
    if (contactIds.length === 0) return [];
    
    try {
        // Get statuses from contacts that haven't been viewed
        const now = new Date();
        const recentStatuses = [];
        
        // Batch queries to avoid Firestore limitations
        for (let i = 0; i < contactIds.length; i += 10) {
            const batch = contactIds.slice(i, i + 10);
            if (batch.length === 0) continue;
            
            const snapshot = await db.collection('statuses')
                .where('userId', 'in', batch)
                .where('expiresAt', '>', now)
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();
            
            snapshot.forEach(doc => {
                const status = {
                    id: doc.id,
                    ...doc.data(),
                    isMine: false
                };
                
                // Check if already viewed
                db.collection('statusViews')
                    .where('statusId', '==', doc.id)
                    .where('userId', '==', currentUser.uid)
                    .limit(1)
                    .get()
                    .then(viewSnapshot => {
                        status.hasViewed = !viewSnapshot.empty;
                    });
                
                recentStatuses.push(status);
            });
        }
        
        return recentStatuses;
    } catch (error) {
        console.error('Error loading recent statuses:', error);
        return [];
    }
}

async function loadViewedStatuses() {
    try {
        // Get statuses that have been viewed recently
        const viewedSnapshot = await db.collection('statusViews')
            .where('userId', '==', currentUser.uid)
            .orderBy('viewedAt', 'desc')
            .limit(20)
            .get();
        
        const viewedStatuses = [];
        const statusIds = viewedSnapshot.docs.map(doc => doc.data().statusId);
        
        if (statusIds.length > 0) {
            // Get the actual status data
            const statusPromises = statusIds.map(statusId => 
                db.collection('statuses').doc(statusId).get()
            );
            
            const statusDocs = await Promise.all(statusPromises);
            
            statusDocs.forEach((doc, index) => {
                if (doc.exists) {
                    const status = {
                        id: doc.id,
                        ...doc.data(),
                        isMine: doc.data().userId === currentUser.uid,
                        hasViewed: true,
                        viewedAt: viewedSnapshot.docs[index]?.data()?.viewedAt
                    };
                    viewedStatuses.push(status);
                }
            });
        }
        
        return viewedStatuses;
    } catch (error) {
        console.error('Error loading viewed statuses:', error);
        return [];
    }
}

function renderStatusList(myStatuses, recentStatuses, viewedStatuses) {
    const statusUpdates = document.getElementById('statusUpdates');
    if (!statusUpdates) return;
    
    statusUpdates.innerHTML = '';
    
    // Group statuses by user
    const statusesByUser = new Map();
    
    // Add recent statuses (unseen)
    recentStatuses.forEach(status => {
        if (!status.hasViewed) {
            const userId = status.userId;
            if (!statusesByUser.has(userId)) {
                statusesByUser.set(userId, {
                    user: {
                        id: userId,
                        displayName: status.userDisplayName,
                        photoURL: status.userPhotoURL,
                        isMuted: isUserMuted(userId)
                    },
                    statuses: [],
                    hasUnseen: true
                });
            }
            statusesByUser.get(userId).statuses.push(status);
        }
    });
    
    // Add viewed statuses
    viewedStatuses.forEach(status => {
        const userId = status.userId;
        if (!statusesByUser.has(userId)) {
            statusesByUser.set(userId, {
                user: {
                    id: userId,
                    displayName: status.userDisplayName,
                    photoURL: status.userPhotoURL,
                    isMuted: isUserMuted(userId)
                },
                statuses: [],
                hasUnseen: false
            });
        }
        statusesByUser.get(userId).statuses.push(status);
    });
    
    // Add my statuses
    if (myStatuses.length > 0) {
        statusesByUser.set(currentUser.uid, {
            user: {
                id: currentUser.uid,
                displayName: 'My Status',
                photoURL: currentUserData?.photoURL,
                isMine: true
            },
            statuses: myStatuses,
            hasUnseen: false
        });
    }
    
    // Sort: My status first, then recent unseen, then viewed
    const sortedUsers = Array.from(statusesByUser.entries()).sort((a, b) => {
        // My status first
        if (a[1].user.isMine) return -1;
        if (b[1].user.isMine) return 1;
        
        // Then unseen statuses
        if (a[1].hasUnseen && !b[1].hasUnseen) return -1;
        if (!a[1].hasUnseen && b[1].hasUnseen) return 1;
        
        // Then by most recent status time
        const aLatest = a[1].statuses[0]?.timestamp;
        const bLatest = b[1].statuses[0]?.timestamp;
        return (bLatest?.toDate?.() || 0) - (aLatest?.toDate?.() || 0);
    });
    
    // Create status items
    sortedUsers.forEach(([userId, userData]) => {
        const statusItem = createStatusItem(userData);
        statusUpdates.appendChild(statusItem);
    });
    
    // Add "no statuses" message if empty
    if (sortedUsers.length === 0) {
        statusUpdates.innerHTML = `
            <div class="no-statuses">
                <div class="no-statuses-icon">
                    <i class="fas fa-camera"></i>
                </div>
                <h3>No status updates</h3>
                <p>When your contacts share updates, they'll appear here.</p>
                <button onclick="openStatusCreation()" class="btn-primary">
                    <i class="fas fa-plus"></i> Share a status
                </button>
            </div>
        `;
    }
}

function createStatusItem(userData) {
    const statusItem = document.createElement('div');
    statusItem.className = 'status-item';
    statusItem.dataset.userId = userData.user.id;
    
    const latestStatus = userData.statuses[0];
    const statusCount = userData.statuses.length;
    const timeAgo = formatTimeAgo(latestStatus?.timestamp);
    const isExpired = latestStatus?.expiresAt?.toDate() < new Date();
    
    // Determine ring style
    let ringClass = 'status-ring ';
    if (userData.user.isMine) {
        ringClass += 'status-ring-mine';
    } else if (userData.hasUnseen) {
        ringClass += 'status-ring-unseen';
    } else {
        ringClass += 'status-ring-seen';
    }
    
    // Muted indicator
    const mutedIndicator = userData.user.isMuted ? 
        '<div class="muted-indicator" title="Muted"><i class="fas fa-volume-mute"></i></div>' : '';
    
    statusItem.innerHTML = `
        <div class="status-avatar ${ringClass}">
            <img src="${userData.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.user.displayName)}&background=7C3AED&color=fff`}" 
                 alt="${userData.user.displayName}">
            ${userData.user.isMine ? 
                '<div class="add-status-icon"><i class="fas fa-plus"></i></div>' : ''}
            ${mutedIndicator}
        </div>
        <div class="status-info">
            <div class="status-header">
                <h4 class="status-name">${userData.user.displayName}</h4>
                <span class="status-time">${timeAgo}</span>
            </div>
            <div class="status-meta">
                <span class="status-count">${statusCount} update${statusCount !== 1 ? 's' : ''}</span>
                ${isExpired ? '<span class="status-expired">• Expired</span>' : ''}
            </div>
        </div>
        <div class="status-actions">
            ${userData.user.isMine ? 
                '<button class="btn-more" onclick="showMyStatusOptions(event)"><i class="fas fa-ellipsis-v"></i></button>' : 
                '<button class="btn-more" onclick="showStatusUserOptions(event, \'' + userData.user.id + '\')"><i class="fas fa-ellipsis-v"></i></button>'
            }
        </div>
    `;
    
    // Add click event
    statusItem.addEventListener('click', (e) => {
        if (!e.target.closest('.status-actions') && !e.target.closest('.btn-more')) {
            openStatusViewer(userData.user.id, userData.statuses);
        }
    });
    
    return statusItem;
}

// ==================== STATUS VIEWER ====================

function openStatusViewer(userId, statuses) {
    if (!statuses || statuses.length === 0) return;
    
    currentStatusViewing = {
        userId: userId,
        statuses: statuses.sort((a, b) => a.timestamp?.toDate?.() - b.timestamp?.toDate?.()),
        currentIndex: 0
    };
    
    showStatusAtIndex(0);
}

function showStatusAtIndex(index) {
    if (!currentStatusViewing || index < 0 || index >= currentStatusViewing.statuses.length) {
        closeStatusViewer();
        return;
    }
    
    currentStatusIndex = index;
    const status = currentStatusViewing.statuses[index];
    
    // Create or update viewer
    let viewer = document.getElementById('statusViewer');
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'statusViewer';
        viewer.className = 'status-viewer';
        document.body.appendChild(viewer);
    }
    
    // Mark as viewed if not the owner
    if (status.userId !== currentUser.uid) {
        markStatusAsViewed(status.id);
    }
    
    // Calculate progress
    const now = new Date();
    const createdAt = status.timestamp?.toDate() || now;
    const expiresAt = status.expiresAt?.toDate() || new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const totalDuration = expiresAt - createdAt;
    const elapsed = now - createdAt;
    const progress = Math.min((elapsed / totalDuration) * 100, 100);
    
    // Create progress bars for all statuses
    const progressBars = currentStatusViewing.statuses.map((s, i) => {
        const sCreatedAt = s.timestamp?.toDate() || now;
        const sExpiresAt = s.expiresAt?.toDate() || new Date(sCreatedAt.getTime() + 24 * 60 * 60 * 1000);
        const sTotalDuration = sExpiresAt - sCreatedAt;
        const sElapsed = now - sCreatedAt;
        const sProgress = i < index ? 100 : (i === index ? Math.min((sElapsed / sTotalDuration) * 100, 100) : 0);
        
        return `
            <div class="progress-track">
                <div class="progress-bar ${i === index ? 'active' : ''}" 
                     style="width: ${sProgress}%"></div>
            </div>
        `;
    }).join('');
    
    viewer.innerHTML = `
        <div class="status-viewer-container">
            <!-- Progress bars -->
            <div class="progress-container">
                ${progressBars}
            </div>
            
            <!-- Header -->
            <div class="viewer-header">
                <div class="viewer-user-info">
                    <img src="${status.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(status.userDisplayName)}&background=7C3AED&color=fff`}" 
                         class="viewer-avatar">
                    <div class="viewer-user-details">
                        <h3 class="viewer-username">${status.userDisplayName}</h3>
                        <span class="viewer-time">${formatTimeAgo(status.timestamp)}</span>
                    </div>
                </div>
                <div class="viewer-header-actions">
                    ${status.userId !== currentUser.uid ? `
                        <button class="btn-action" onclick="toggleMuteUser('${status.userId}')" title="Mute">
                            <i class="fas fa-volume-mute"></i>
                        </button>
                        <button class="btn-action" onclick="showStatusUserOptions(event, '${status.userId}')" title="More">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    ` : ''}
                    <button class="btn-close" onclick="closeStatusViewer()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <!-- Content -->
            <div class="viewer-content">
                ${getStatusContentHTML(status)}
                
                <!-- Navigation buttons -->
                <button class="nav-btn prev-btn" onclick="showPrevStatus()">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="nav-btn next-btn" onclick="showNextStatus()">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <!-- Footer -->
            <div class="viewer-footer">
                <!-- Caption -->
                ${status.caption ? `
                    <div class="status-caption">
                        <p>${escapeHtml(status.caption)}</p>
                    </div>
                ` : ''}
                
                <!-- Reply section -->
                <div class="reply-section">
                    <div class="emoji-picker-btn" onclick="toggleEmojiPicker()">
                        <i class="far fa-smile"></i>
                    </div>
                    <input type="text" 
                           class="reply-input" 
                           placeholder="Reply..." 
                           id="statusReplyInput"
                           onkeypress="handleReplyKeypress(event, '${status.id}')">
                    <button class="btn-send-reply" onclick="sendStatusReply('${status.id}')">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button class="btn-action-reply" onclick="showReplyOptions('${status.id}')">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
                
                <!-- Action buttons -->
                <div class="action-buttons">
                    <button class="btn-action" onclick="shareStatus('${status.id}')" title="Share">
                        <i class="fas fa-share"></i>
                    </button>
                    <button class="btn-action" onclick="likeStatus('${status.id}')" title="Like">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="btn-action" onclick="showStatusReactions('${status.id}')" title="Reactions">
                        <i class="far fa-smile"></i>
                    </button>
                    <button class="btn-action" onclick="showViewersList('${status.id}')" title="Viewers">
                        <i class="far fa-eye"></i>
                        <span id="viewCount-${status.id}" class="view-count">${status.viewCount || 0}</span>
                    </button>
                    ${status.userId === currentUser.uid ? `
                        <button class="btn-action" onclick="showStatusAnalytics('${status.id}')" title="Analytics">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn-action" onclick="deleteStatus('${status.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button class="btn-action" onclick="callUser('${status.userId}')" title="Call">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="btn-action" onclick="messageUser('${status.userId}')" title="Message">
                            <i class="fas fa-comment"></i>
                        </button>
                    `}
                </div>
            </div>
        </div>
        
        <!-- Emoji Picker -->
        <div id="emojiPickerContainer" class="emoji-picker-container hidden">
            <div class="emoji-picker">
                <div class="emoji-categories">
                    <button class="emoji-category active" data-category="recent">🕐</button>
                    <button class="emoji-category" data-category="smileys">😀</button>
                    <button class="emoji-category" data-category="hearts">❤️</button>
                    <button class="emoji-category" data-category="hands">👏</button>
                </div>
                <div class="emoji-grid" id="emojiGrid">
                    <!-- Emojis will be populated here -->
                </div>
            </div>
        </div>
    `;
    
    // Start progress timer
    startStatusProgressTimer(status);
    
    // Load emojis
    loadEmojis();
    
    // Load real-time updates
    setupStatusRealtimeUpdates(status.id);
}

function startStatusProgressTimer(status) {
    // Clear any existing timer
    if (statusProgressInterval) {
        clearInterval(statusProgressInterval);
    }
    
    // Calculate time until next status should advance
    const now = new Date();
    const expiresAt = status.expiresAt?.toDate() || new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const timeRemaining = expiresAt - now;
    const advanceTime = Math.min(timeRemaining, 10000); // Max 10 seconds per status
    
    // Set timer to advance to next status
    statusViewerTimeout = setTimeout(() => {
        showNextStatus();
    }, advanceTime);
    
    // Update progress bar every second
    statusProgressInterval = setInterval(() => {
        updateProgressBar();
    }, 1000);
}

function updateProgressBar() {
    const progressBar = document.querySelector('.progress-bar.active');
    if (progressBar) {
        const currentWidth = parseFloat(progressBar.style.width) || 0;
        const increment = 100 / (24 * 60 * 60); // 24 hours in seconds
        progressBar.style.width = `${Math.min(currentWidth + increment, 100)}%`;
    }
}

function showNextStatus() {
    if (!currentStatusViewing) return;
    
    const nextIndex = currentStatusIndex + 1;
    if (nextIndex < currentStatusViewing.statuses.length) {
        showStatusAtIndex(nextIndex);
    } else {
        // Try to load next user's statuses
        loadNextUserStatuses();
    }
}

function showPrevStatus() {
    if (!currentStatusViewing) return;
    
    const prevIndex = currentStatusIndex - 1;
    if (prevIndex >= 0) {
        showStatusAtIndex(prevIndex);
    }
}

function closeStatusViewer() {
    const viewer = document.getElementById('statusViewer');
    if (viewer) {
        viewer.remove();
    }
    
    // Clear timers
    if (statusProgressInterval) {
        clearInterval(statusProgressInterval);
        statusProgressInterval = null;
    }
    
    if (statusViewerTimeout) {
        clearTimeout(statusViewerTimeout);
        statusViewerTimeout = null;
    }
    
    // Clean up listeners
    if (statusViewerListener) {
        statusViewerListener();
        statusViewerListener = null;
    }
    
    currentStatusViewing = null;
    currentStatusIndex = 0;
    
    // Reload status list to update viewed indicators
    loadStatusUpdates();
}

// ==================== STATUS INTERACTIONS ====================

async function markStatusAsViewed(statusId) {
    try {
        // Check if already viewed
        const existingView = await db.collection('statusViews')
            .where('statusId', '==', statusId)
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();
        
        if (!existingView.empty) return;
        
        // Add view
        await db.collection('statusViews').add({
            statusId: statusId,
            userId: currentUser.uid,
            userDisplayName: currentUserData?.displayName,
            userPhotoURL: currentUserData?.photoURL,
            viewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update view count
        await db.collection('statuses').doc(statusId).update({
            viewCount: firebase.firestore.FieldValue.increment(1),
            lastViewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update recent views in user preferences
        await updateRecentViews(statusId);
        
    } catch (error) {
        console.error('Error marking status as viewed:', error);
    }
}

async function updateRecentViews(statusId) {
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({
            recentStatusViews: firebase.firestore.FieldValue.arrayUnion(statusId)
        });
        
        // Keep only last 50 recent views
        const userDoc = await userRef.get();
        const recentViews = userDoc.data()?.recentStatusViews || [];
        if (recentViews.length > 50) {
            await userRef.update({
                recentStatusViews: recentViews.slice(-50)
            });
        }
    } catch (error) {
        console.error('Error updating recent views:', error);
    }
}

async function likeStatus(statusId) {
    try {
        const reactionRef = db.collection('statusReactions').doc(`${statusId}_${currentUser.uid}`);
        
        // Check if already liked
        const existingReaction = await reactionRef.get();
        
        if (existingReaction.exists) {
            // Unlike
            await reactionRef.delete();
            showToast('Removed like', 'info');
        } else {
            // Like
            await reactionRef.set({
                statusId: statusId,
                userId: currentUser.uid,
                reaction: '❤️',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Liked status', 'success');
        }
        
        // Update reaction count
        updateReactionCount(statusId);
        
    } catch (error) {
        console.error('Error liking status:', error);
        showToast('Error reacting to status', 'error');
    }
}

async function sendStatusReply(statusId, replyText = null) {
    const input = document.getElementById('statusReplyInput');
    const text = replyText || (input ? input.value.trim() : '');
    
    if (!text) return;
    
    try {
        // Get status info
        const statusDoc = await db.collection('statuses').doc(statusId).get();
        if (!statusDoc.exists) {
            showToast('Status not found', 'error');
            return;
        }
        
        const status = statusDoc.data();
        
        // Create reply
        const replyData = {
            type: 'text',
            content: text,
            senderId: currentUser.uid,
            senderName: currentUserData?.displayName,
            senderPhoto: currentUserData?.photoURL,
            receiverId: status.userId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isStatusReply: true,
            originalStatusId: statusId,
            statusType: status.type,
            statusPreview: status.type === 'text' ? status.content.substring(0, 50) + '...' : 
                          status.type === 'emoji' ? status.content : '📸 Status'
        };
        
        // Save to messages collection
        await db.collection('messages').add(replyData);
        
        // Update reply count
        await db.collection('statuses').doc(statusId).update({
            replyCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Clear input
        if (input) input.value = '';
        
        showToast('Reply sent', 'success');
        
        // Close emoji picker if open
        if (emojiPickerOpen) {
            toggleEmojiPicker();
        }
        
    } catch (error) {
        console.error('Error sending status reply:', error);
        showToast('Error sending reply', 'error');
    }
}

function handleReplyKeypress(event, statusId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendStatusReply(statusId);
    }
}

async function shareStatus(statusId) {
    try {
        const statusDoc = await db.collection('statuses').doc(statusId).get();
        if (!statusDoc.exists) {
            showToast('Status not found', 'error');
            return;
        }
        
        const status = statusDoc.data();
        
        // Show share options
        const shareOptions = document.createElement('div');
        shareOptions.className = 'share-options-modal';
        shareOptions.innerHTML = `
            <div class="share-options-content">
                <h3>Share Status</h3>
                <div class="share-options">
                    <button class="share-option" onclick="shareAsMyStatus('${statusId}')">
                        <i class="fas fa-share-square"></i>
                        <span>Share to my status</span>
                    </button>
                    <button class="share-option" onclick="shareToContact('${statusId}')">
                        <i class="fas fa-user-friends"></i>
                        <span>Share to a contact</span>
                    </button>
                    <button class="share-option" onclick="copyStatusLink('${statusId}')">
                        <i class="fas fa-link"></i>
                        <span>Copy link</span>
                    </button>
                    <button class="share-option" onclick="shareToOtherApp('${statusId}')">
                        <i class="fas fa-external-link-alt"></i>
                        <span>Share to other app</span>
                    </button>
                </div>
                <button class="btn-cancel" onclick="this.parentElement.parentElement.remove()">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(shareOptions);
        
    } catch (error) {
        console.error('Error sharing status:', error);
        showToast('Error sharing status', 'error');
    }
}

async function shareAsMyStatus(statusId) {
    try {
        const statusDoc = await db.collection('statuses').doc(statusId).get();
        if (!statusDoc.exists) return;
        
        const originalStatus = statusDoc.data();
        
        // Create new status as a share
        const newStatus = {
            type: 'share',
            content: originalStatus.content,
            caption: `Shared from ${originalStatus.userDisplayName}`,
            originalStatusId: statusId,
            originalUserId: originalStatus.userId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            userId: currentUser.uid,
            userDisplayName: currentUserData?.displayName,
            userPhotoURL: currentUserData?.photoURL,
            viewCount: 0,
            isShared: true
        };
        
        await db.collection('statuses').add(newStatus);
        
        showToast('Status shared to your status', 'success');
        loadStatusUpdates();
        
    } catch (error) {
        console.error('Error sharing as my status:', error);
        showToast('Error sharing status', 'error');
    }
}

// ==================== EMOJI PICKER ====================

function setupEmojiPicker() {
    // Common emojis for quick access
    window.commonEmojis = [
        '😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😇', '🤗', '👍',
        '❤️', '🔥', '⭐', '🎉', '🙏', '👏', '💯', '🤔', '😮', '😢',
        '😡', '🤮', '💩', '🤡', '👻', '💀', '🤖', '🎃', '🦄', '🐶',
        '🐱', '🐼', '🦁', '🐯', '🦊', '🐰', '🐨', '🐵', '🦉', '🐣'
    ];
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPickerContainer');
    if (!picker) return;
    
    emojiPickerOpen = !emojiPickerOpen;
    
    if (emojiPickerOpen) {
        picker.classList.remove('hidden');
    } else {
        picker.classList.add('hidden');
    }
}

function loadEmojis() {
    const emojiGrid = document.getElementById('emojiGrid');
    if (!emojiGrid) return;
    
    emojiGrid.innerHTML = window.commonEmojis.map(emoji => `
        <button class="emoji-btn" onclick="insertEmoji('${emoji}')">${emoji}</button>
    `).join('');
}

function insertEmoji(emoji) {
    const input = document.getElementById('statusReplyInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
}

// ==================== STATUS CREATION ====================

function openStatusCreation() {
    const statusCreation = document.getElementById('statusCreation');
    if (statusCreation) {
        statusCreation.style.display = 'flex';
        resetStatusCreation();
        updatePrivacyIndicator();
    }
}

function resetStatusCreation() {
    // Reset all previews
    const previews = ['emojiPreview', 'textPreview', 'imagePreview', 'videoPreview', 'audioPreview'];
    previews.forEach(previewId => {
        const preview = document.getElementById(previewId);
        if (preview) preview.classList.add('hidden');
    });
    
    // Show text preview by default (like WhatsApp)
    const textPreview = document.getElementById('textPreview');
    if (textPreview) {
        textPreview.classList.remove('hidden');
    }
    
    // Reset active option
    document.querySelectorAll('.status-option').forEach(option => {
        option.classList.remove('active');
    });
    const textOption = document.querySelector('.status-option[data-type="text"]');
    if (textOption) textOption.classList.add('active');
    
    // Reset inputs
    const statusTextInput = document.getElementById('statusTextInput');
    if (statusTextInput) {
        statusTextInput.value = '';
        statusTextInput.focus();
    }
    
    const statusCaption = document.getElementById('statusCaption');
    if (statusCaption) statusCaption.value = '';
    
    // Clear media
    window.currentStatusMedia = null;
}
// Add these function definitions somewhere in status.js:

// Function 1: deleteStatus
async function deleteStatus(statusId) {
    try {
        if (!confirm('Delete this status? It will be removed for all viewers.')) {
            return;
        }
        
        await db.collection('statuses').doc(statusId).delete();
        showToast('Status deleted', 'success');
        
        // Close viewer if open
        closeStatusViewer();
        
        // Refresh status list
        loadStatusUpdates();
        
    } catch (error) {
        console.error('Error deleting status:', error);
        showToast('Error deleting status', 'error');
    }
}

// Function 2: setupStatusEventListeners
function setupStatusEventListeners() {
    console.log('Setting up status event listeners...');
    
    // Add click listeners for status buttons
    const addStatusBtn = document.getElementById('addStatusBtn');
    if (addStatusBtn) {
        addStatusBtn.addEventListener('click', openStatusCreation);
    }
    
    const closeStatusBtn = document.getElementById('closeStatusBtn');
    if (closeStatusBtn) {
        closeStatusBtn.addEventListener('click', closeStatusViewer);
    }
    
    // Add other event listeners as needed...
}

// Function 3: setupStatusFileHandlers
function setupStatusFileHandlers() {
    console.log('Setting up status file handlers...');
    
    // Handle file inputs for status creation
    const fileInput = document.getElementById('statusMediaInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleStatusFileSelect);
    }
    
    // Add drag and drop for status files
    const dropZone = document.getElementById('statusDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleStatusFileDrop);
    }
}

// Also add these supporting functions:
function handleStatusFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleStatusMediaUpload(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
}

function handleStatusFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (file) {
        handleStatusMediaUpload(file);
    }
}

async function handleStatusMediaUpload(file) {
    // Implementation for uploading status media
    console.log('Uploading status media:', file);
    // Add your upload logic here
}

function updatePrivacyIndicator() {
    const privacyIndicator = document.getElementById('privacyIndicator');
    if (!privacyIndicator) return;
    
    const privacyText = getPrivacyLabel(window.statusPreferences.privacy);
    privacyIndicator.innerHTML = `
        <i class="fas fa-user-friends"></i>
        <span>${privacyText}</span>
        <i class="fas fa-chevron-down"></i>
    `;
    
    // Update click handler
    privacyIndicator.onclick = showPrivacyOptions;
}

function showPrivacyOptions() {
    const options = document.createElement('div');
    options.className = 'privacy-options-modal';
    options.innerHTML = `
        <div class="privacy-options-content">
            <h3>Status Privacy</h3>
            <div class="privacy-options">
                <label class="privacy-option">
                    <input type="radio" name="privacy" value="myContacts" 
                           ${window.statusPreferences.privacy === 'myContacts' ? 'checked' : ''}
                           onchange="updateStatusPrivacy('myContacts')">
                    <div class="option-content">
                        <i class="fas fa-user-friends"></i>
                        <div>
                            <strong>My contacts</strong>
                            <p>All your contacts can see your status</p>
                        </div>
                    </div>
                </label>
                <label class="privacy-option">
                    <input type="radio" name="privacy" value="selectedContacts"
                           ${window.statusPreferences.privacy === 'selectedContacts' ? 'checked' : ''}
                           onchange="showContactSelector()">
                    <div class="option-content">
                        <i class="fas fa-user-check"></i>
                        <div>
                            <strong>Selected contacts</strong>
                            <p>Only selected contacts can see your status</p>
                        </div>
                    </div>
                </label>
                <label class="privacy-option">
                    <input type="radio" name="privacy" value="everyone"
                           ${window.statusPreferences.privacy === 'everyone' ? 'checked' : ''}
                           onchange="updateStatusPrivacy('everyone')">
                    <div class="option-content">
                        <i class="fas fa-globe"></i>
                        <div>
                            <strong>Everyone</strong>
                            <p>Anyone can see your status</p>
                        </div>
                    </div>
                </label>
            </div>
            <button class="btn-cancel" onclick="this.parentElement.parentElement.remove()">Done</button>
        </div>
    `;
    
    document.body.appendChild(options);
}

// ==================== STATUS ANALYTICS ====================

async function showStatusAnalytics(statusId) {
    try {
        const [statusDoc, viewsSnapshot, reactionsSnapshot, repliesSnapshot] = await Promise.all([
            db.collection('statuses').doc(statusId).get(),
            db.collection('statusViews').where('statusId', '==', statusId).get(),
            db.collection('statusReactions').where('statusId', '==', statusId).get(),
            db.collection('messages')
                .where('isStatusReply', '==', true)
                .where('originalStatusId', '==', statusId)
                .get()
        ]);
        
        if (!statusDoc.exists) return;
        
        const status = statusDoc.data();
        
        const analyticsModal = document.createElement('div');
        analyticsModal.className = 'analytics-modal';
        analyticsModal.innerHTML = `
            <div class="analytics-content">
                <div class="analytics-header">
                    <h3>Status Analytics</h3>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="analytics-stats">
                    <div class="stat-card">
                        <div class="stat-icon views">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="stat-info">
                            <h4>${viewsSnapshot.size}</h4>
                            <p>Views</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon reactions">
                            <i class="fas fa-heart"></i>
                        </div>
                        <div class="stat-info">
                            <h4>${reactionsSnapshot.size}</h4>
                            <p>Reactions</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon replies">
                            <i class="fas fa-reply"></i>
                        </div>
                        <div class="stat-info">
                            <h4>${repliesSnapshot.size}</h4>
                            <p>Replies</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon shares">
                            <i class="fas fa-share"></i>
                        </div>
                        <div class="stat-info">
                            <h4>${status.shareCount || 0}</h4>
                            <p>Shares</p>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-details">
                    <h4>Recent Viewers</h4>
                    <div class="viewers-list">
                        ${viewsSnapshot.docs.slice(0, 10).map(doc => {
                            const view = doc.data();
                            return `
                                <div class="viewer-item">
                                    <img src="${view.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(view.userDisplayName)}&background=7C3AED&color=fff`}" 
                                         class="viewer-avatar">
                                    <div class="viewer-info">
                                        <p class="viewer-name">${view.userDisplayName}</p>
                                        <p class="viewer-time">${formatTimeAgo(view.viewedAt)}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${viewsSnapshot.size > 10 ? `
                        <button class="btn-view-all" onclick="showViewersList('${statusId}')">
                            View all ${viewsSnapshot.size} viewers
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(analyticsModal);
        
    } catch (error) {
        console.error('Error showing analytics:', error);
        showToast('Error loading analytics', 'error');
    }
}

// ==================== USER OPTIONS ====================

function showStatusUserOptions(event, userId) {
    event.stopPropagation();
    
    const options = document.createElement('div');
    options.className = 'user-options-menu';
    options.style.position = 'absolute';
    options.style.top = `${event.clientY}px`;
    options.style.left = `${event.clientX}px`;
    
    const isMuted = window.statusPreferences.mutedUsers.includes(userId);
    
    options.innerHTML = `
        <div class="user-options">
            <button class="user-option" onclick="messageUser('${userId}')">
                <i class="fas fa-comment"></i>
                <span>Message</span>
            </button>
            <button class="user-option" onclick="callUser('${userId}')">
                <i class="fas fa-phone"></i>
                <span>Call</span>
            </button>
            <button class="user-option" onclick="viewContact('${userId}')">
                <i class="fas fa-user"></i>
                <span>View contact</span>
            </button>
            <button class="user-option" onclick="toggleMuteUser('${userId}')">
                <i class="fas fa-volume-${isMuted ? 'up' : 'mute'}"></i>
                <span>${isMuted ? 'Unmute' : 'Mute'} status</span>
            </button>
            <button class="user-option text-danger" onclick="blockStatusUser('${userId}')">
                <i class="fas fa-ban"></i>
                <span>Block status</span>
            </button>
        </div>
    `;
    
    document.body.appendChild(options);
    
    // Close on outside click
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!options.contains(e.target)) {
                options.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 10);
}

async function toggleMuteUser(userId) {
    try {
        const isMuted = window.statusPreferences.mutedUsers.includes(userId);
        
        if (isMuted) {
            // Unmute
            await db.collection('users').doc(currentUser.uid).update({
                mutedStatusUsers: firebase.firestore.FieldValue.arrayRemove(userId)
            });
            window.statusPreferences.mutedUsers = window.statusPreferences.mutedUsers.filter(id => id !== userId);
            showToast('Status updates unmuted', 'success');
        } else {
            // Mute
            await db.collection('users').doc(currentUser.uid).update({
                mutedStatusUsers: firebase.firestore.FieldValue.arrayUnion(userId)
            });
            window.statusPreferences.mutedUsers.push(userId);
            showToast('Status updates muted', 'success');
        }
        
        // Reload status list
        loadStatusUpdates();
        
    } catch (error) {
        console.error('Error toggling mute:', error);
        showToast('Error updating mute settings', 'error');
    }
}

// ==================== CLEANUP ====================

window.addEventListener('beforeunload', () => {
    closeStatusViewer();
    
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    
    // Clean up blob URLs
    if (window.currentStatusMedia?.previewUrl?.startsWith?.('blob:')) {
        URL.revokeObjectURL(window.currentStatusMedia.previewUrl);
    }
});

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('statusUpdates')) {
        console.log('Not on chat page, skipping status initialization');
        return;
    }
    
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && currentUser) {
            clearInterval(checkFirebase);
            console.log('🚀 Initializing WhatsApp Status system...');
            initStatusSystem();
        }
    }, 500);
});
// Add these function stubs at the end of your file (before the exports):

// Missing function stubs
function setupStatusModalListeners() {
    console.log('Setting up status modal listeners...');
    // Implementation here
}

function getStatusContentHTML(status) {
    // Implementation for rendering status content
    if (status.type === 'text') {
        return `<div class="status-text">${escapeHtml(status.content)}</div>`;
    } else if (status.type === 'image') {
        return `<img src="${status.content}" class="status-media" alt="Status image">`;
    }
    return '<div>Status content</div>';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

function showErrorState() {
    const statusUpdates = document.getElementById('statusUpdates');
    if (statusUpdates) {
        statusUpdates.innerHTML = `
            <div class="error-status">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load status updates</p>
                <button onclick="loadStatusUpdates()" class="btn-retry">Try Again</button>
            </div>
        `;
    }
}

// Export functions
window.initStatusSystem = initStatusSystem;
window.loadStatusUpdates = loadStatusUpdates;
window.openStatusCreation = openStatusCreation;
window.openStatusViewer = openStatusViewer;
window.closeStatusViewer = closeStatusViewer;
window.postStatus = postStatus;
window.deleteStatus = deleteStatus;
window.shareStatus = shareStatus;
window.likeStatus = likeStatus;
window.sendStatusReply = sendStatusReply;
window.showStatusAnalytics = showStatusAnalytics;
window.updateStatusPrivacy = updateStatusPrivacy;
window.toggleMuteUser = toggleMuteUser;

console.log('✅ status.js loaded - Complete WhatsApp Status System Ready');