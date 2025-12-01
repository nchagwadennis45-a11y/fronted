// ==================== GROUP SYSTEM ====================
// A comprehensive group chat system for Kynecta

// Group state variables
let currentGroup = null;
let currentGroupId = null;
let groupAdminId = null;
let unsubscribeGroupMessages = null;
let unsubscribeGroups = null;
let allGroups = [];
let groupInvites = [];
let groupRequests = [];

// DOM Elements for groups
const groupChatHeader = document.getElementById('groupChatHeader');
const groupInputArea = document.getElementById('groupInputArea');
const groupMessagesContainer = document.getElementById('groupMessagesContainer');
const groupTitle = document.getElementById('groupTitle');
const groupAvatar = document.getElementById('groupAvatar');
const groupParticipantCount = document.getElementById('groupParticipantCount');
const noGroupMessagesMessage = document.getElementById('noGroupMessagesMessage');

function initializeGroupSystem() {
    console.log('Initializing group system...');
    
    // Create group-related UI elements if they don't exist
    createGroupUIElements();
    
    // Load user's groups
    loadUserGroups();
    
    // Listen for group invites
    listenForGroupInvites();
    
    // Listen for join requests (if user is admin of any groups)
    listenForGroupRequests();
    
    // Setup group event listeners
    setupGroupEventListeners();
    
    // ADD THIS LINE:
    initializeGroupListeners(); // ← ADD THIS
    
    console.log('✅ Group system initialized');
}
// Create necessary UI elements for groups
function createGroupUIElements() {
    // Add groups tab if it doesn't exist
    if (!document.getElementById('groupsTab')) {
        const tabsContainer = document.querySelector('.tabs');
        if (tabsContainer) {
            const groupsTab = document.createElement('div');
            groupsTab.id = 'groupsTab';
            groupsTab.className = 'tab-panel hidden';
            groupsTab.innerHTML = `
                <div class="p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-gray-800">Groups</h2>
                        <div class="flex space-x-2">
                            <button id="createGroupBtn" class="btn-primary">
                                <i class="fas fa-plus mr-2"></i>Create Group
                            </button>
                            <button id="joinGroupBtn" class="btn-secondary">
                                <i class="fas fa-sign-in-alt mr-2"></i>Join Group
                            </button>
                        </div>
                    </div>
                    
                    <!-- Group Search -->
                    <div class="mb-4">
                        <input type="text" id="groupSearch" placeholder="Search groups..." 
                               class="w-full p-3 border border-gray-300 rounded-lg">
                    </div>
                    
                    <!-- Groups List -->
                    <div id="groupsList" class="space-y-3">
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-users text-4xl mb-3 text-gray-300 block"></i>
                            <p>No groups yet</p>
                            <p class="text-sm mt-1">Create or join a group to get started</p>
                        </div>
                    </div>
                    
                    <!-- Group Invites -->
                    <div id="groupInvitesSection" class="hidden mt-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700">Group Invites</h3>
                        <div id="groupInvitesList" class="space-y-2"></div>
                    </div>
                </div>
            `;
            
            // Find the right position to insert (after calls tab)
            const callsTab = document.getElementById('callsTab');
            if (callsTab) {
                callsTab.parentNode.insertBefore(groupsTab, callsTab.nextSibling);
            } else {
                tabsContainer.appendChild(groupsTab);
            }
        }
    }
    
    // Add groups button to tabs navigation
    if (!document.getElementById('groupsTabBtn')) {
        const tabsNav = document.querySelector('.tabs-nav');
        if (tabsNav) {
            const groupsTabBtn = document.createElement('button');
            groupsTabBtn.id = 'groupsTabBtn';
            groupsTabBtn.className = 'tab-btn text-gray-500';
            groupsTabBtn.setAttribute('data-tab', 'groups');
            groupsTabBtn.innerHTML = `
                <i class="fas fa-users"></i>
                <span class="ml-2">Groups</span>
            `;
            tabsNav.appendChild(groupsTabBtn);
            
            // Add click event
            groupsTabBtn.addEventListener('click', () => {
                switchToTab('groups');
            });
        }
    }
    
    // Create group chat container if it doesn't exist
    if (!document.getElementById('groupChatContainer')) {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            const groupChatContainer = document.createElement('div');
            groupChatContainer.id = 'groupChatContainer';
            groupChatContainer.className = 'hidden flex-1 flex flex-col';
            groupChatContainer.innerHTML = `
                <!-- Group Chat Header -->
                <div id="groupChatHeader" class="chat-header hidden">
                    <div class="flex items-center">
                        <button id="backToGroups" class="md:hidden mr-3">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="flex items-center space-x-3 flex-1">
                            <div class="relative">
                                <img id="groupAvatar" class="w-12 h-12 rounded-full" 
                                     src="https://ui-avatars.com/api/?name=Group&background=7C3AED&color=fff">
                                <div id="groupOnlineIndicator" class="w-3 h-3 bg-green-500 rounded-full border-2 border-white absolute -bottom-1 -right-1"></div>
                            </div>
                            <div class="flex-1">
                                <h2 id="groupTitle" class="font-semibold text-lg">Group Name</h2>
                                <div class="flex items-center space-x-2 text-sm text-gray-500">
                                    <span id="groupParticipantCount">0 members</span>
                                    <span>•</span>
                                    <span id="groupTypingIndicator" class="text-purple-600 hidden">
                                        <i class="fas fa-pencil-alt"></i> typing...
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-3">
                            <button id="groupVoiceCallBtn" class="p-2 hover:bg-gray-200 rounded-full">
                                <i class="fas fa-phone text-xl"></i>
                            </button>
                            <button id="groupVideoCallBtn" class="p-2 hover:bg-gray-200 rounded-full">
                                <i class="fas fa-video text-xl"></i>
                            </button>
                            <button id="groupInfoBtn" class="p-2 hover:bg-gray-200 rounded-full">
                                <i class="fas fa-info-circle text-xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Group Messages Container -->
                <div id="groupMessagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
                    <div id="noGroupMessagesMessage" class="text-center text-gray-500 py-10">
                        <i class="fas fa-comments text-4xl mb-3 text-gray-300 block"></i>
                        <p>No messages yet</p>
                        <p class="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                </div>
                
                <!-- Group Input Area -->
                <div id="groupInputArea" class="p-4 border-t hidden">
                    <div class="flex items-center space-x-3">
                        <button id="groupAttachBtn" class="p-3 hover:bg-gray-200 rounded-full">
                            <i class="fas fa-paperclip text-xl"></i>
                        </button>
                        <div class="flex-1">
                            <input type="text" id="groupMessageInput" placeholder="Type a message..." 
                                   class="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                        <button id="groupSendBtn" class="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button id="groupRecordBtn" class="p-3 hover:bg-gray-200 rounded-full hidden">
                            <i class="fas fa-microphone text-xl"></i>
                        </button>
                    </div>
                    
                    <!-- File Preview for Groups -->
                    <div id="groupFilePreview" class="hidden mt-3 p-3 bg-gray-100 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-file text-2xl text-gray-600"></i>
                                <div>
                                    <div id="groupFileName" class="font-medium"></div>
                                    <div id="groupFileSize" class="text-sm text-gray-500"></div>
                                </div>
                            </div>
                            <button id="groupRemoveFile" class="text-red-500 hover:text-red-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="mt-2">
                            <div class="h-1 bg-gray-300 rounded-full overflow-hidden">
                                <div id="groupUploadProgressBar" class="h-full bg-green-500 w-0"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            chatContainer.appendChild(groupChatContainer);
        }
    }
    
    // Create group info modal
    if (!document.getElementById('groupInfoModal')) {
        const groupInfoModal = document.createElement('div');
        groupInfoModal.id = 'groupInfoModal';
        groupInfoModal.className = 'modal hidden';
        groupInfoModal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Group Info</h3>
                    <button id="closeGroupInfo" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Group Header -->
                    <div class="text-center mb-6">
                        <div class="relative mx-auto w-32 h-32 mb-4">
                            <img id="groupInfoAvatar" class="w-full h-full rounded-full object-cover border-4 border-white shadow-lg" 
                                 src="https://ui-avatars.com/api/?name=Group&background=7C3AED&color=fff">
                            <button id="changeGroupAvatar" class="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <h2 id="groupInfoName" class="text-2xl font-bold mb-2">Group Name</h2>
                        <p id="groupInfoDescription" class="text-gray-600 mb-2">Group description</p>
                        <p id="groupInfoMeta" class="text-sm text-gray-500">Created on • 0 members</p>
                    </div>
                    
                    <!-- Group Actions -->
                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <button id="muteGroupBtn" class="action-btn">
                            <i class="fas fa-bell-slash"></i>
                            <span>Mute</span>
                        </button>
                        <button id="groupMediaBtn" class="action-btn">
                            <i class="fas fa-photo-video"></i>
                            <span>Media</span>
                        </button>
                        <button id="groupStarredBtn" class="action-btn">
                            <i class="fas fa-star"></i>
                            <span>Starred</span>
                        </button>
                        <button id="groupSearchBtn" class="action-btn">
                            <i class="fas fa-search"></i>
                            <span>Search</span>
                        </button>
                    </div>
                    
                    <!-- Participants Section -->
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="font-semibold">Participants</h4>
                            <button id="addParticipantBtn" class="text-purple-600 hover:text-purple-800">
                                <i class="fas fa-user-plus"></i> Add
                            </button>
                        </div>
                        <div id="groupParticipantsList" class="space-y-2 max-h-60 overflow-y-auto"></div>
                    </div>
                    
                    <!-- Admin Actions (only for admins) -->
                    <div id="adminActionsSection" class="hidden">
                        <div class="border-t pt-4">
                            <h4 class="font-semibold mb-3 text-red-600">Admin Actions</h4>
                            <div class="space-y-2">
                                <button id="editGroupInfoBtn" class="admin-btn">
                                    <i class="fas fa-edit"></i> Edit Group Info
                                </button>
                                <button id="makeAdminBtn" class="admin-btn">
                                    <i class="fas fa-user-shield"></i> Make Admin
                                </button>
                                <button id="groupSettingsBtn" class="admin-btn">
                                    <i class="fas fa-cog"></i> Group Settings
                                </button>
                                <button id="deleteGroupBtn" class="admin-btn text-red-600">
                                    <i class="fas fa-trash"></i> Delete Group
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Member Actions -->
                    <div class="border-t pt-4">
                        <button id="leaveGroupBtn" class="w-full p-3 text-red-600 hover:bg-red-50 rounded-lg">
                            <i class="fas fa-sign-out-alt"></i> Leave Group
                        </button>
                        <button id="reportGroupBtn" class="w-full p-3 text-red-600 hover:bg-red-50 rounded-lg mt-2">
                            <i class="fas fa-flag"></i> Report Group
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(groupInfoModal);
    }
    
    // Create group creation modal
    if (!document.getElementById('createGroupModal')) {
        const createGroupModal = document.createElement('div');
        createGroupModal.id = 'createGroupModal';
        createGroupModal.className = 'modal hidden';
        createGroupModal.innerHTML = `
            <div class="modal-content max-w-md">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Create New Group</h3>
                    <button id="closeCreateGroup" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="space-y-4">
                        <!-- Group Name -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                            <input type="text" id="newGroupName" 
                                   class="w-full p-3 border border-gray-300 rounded-lg" 
                                   placeholder="Enter group name" required>
                        </div>
                        
                        <!-- Group Description -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <textarea id="newGroupDescription" 
                                      class="w-full p-3 border border-gray-300 rounded-lg" 
                                      rows="2" placeholder="Describe your group"></textarea>
                        </div>
                        
                        <!-- Group Privacy -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Group Privacy</label>
                            <select id="newGroupPrivacy" class="w-full p-3 border border-gray-300 rounded-lg">
                                <option value="public">Public - Anyone can join</option>
                                <option value="private">Private - Invite only</option>
                                <option value="hidden">Hidden - Admin adds members</option>
                            </select>
                        </div>
                        
                        <!-- Add Participants -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <label class="block text-sm font-medium text-gray-700">Add Participants</label>
                                <span id="selectedCount" class="text-sm text-gray-500">0 selected</span>
                            </div>
                            <input type="text" id="searchParticipants" 
                                   class="w-full p-3 border border-gray-300 rounded-lg mb-3" 
                                   placeholder="Search friends...">
                            <div id="participantsList" class="max-h-60 overflow-y-auto border rounded-lg p-2">
                                <!-- Friends list will be populated here -->
                            </div>
                        </div>
                        
                        <!-- Create Button -->
                        <div class="pt-4">
                            <button id="createGroupActionBtn" class="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(createGroupModal);
    }
    
    // Create group join modal
    if (!document.getElementById('joinGroupModal')) {
        const joinGroupModal = document.createElement('div');
        joinGroupModal.id = 'joinGroupModal';
        joinGroupModal.className = 'modal hidden';
        joinGroupModal.innerHTML = `
            <div class="modal-content max-w-md">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Join Group</h3>
                    <button id="closeJoinGroup" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="space-y-4">
                        <!-- Search Groups -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Search Groups</label>
                            <input type="text" id="searchGroups" 
                                   class="w-full p-3 border border-gray-300 rounded-lg" 
                                   placeholder="Search by name or invite code...">
                        </div>
                        
                        <!-- Group Invite Code -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Or Enter Invite Code</label>
                            <div class="flex space-x-2">
                                <input type="text" id="groupInviteCode" 
                                       class="flex-1 p-3 border border-gray-300 rounded-lg" 
                                       placeholder="e.g., GROUP-123456">
                                <button id="joinByCodeBtn" class="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    Join
                                </button>
                            </div>
                        </div>
                        
                        <!-- Public Groups List -->
                        <div id="publicGroupsList" class="max-h-60 overflow-y-auto">
                            <!-- Public groups will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(joinGroupModal);
    }
}

// Load user's groups
function loadUserGroups() {
    if (!currentUser) return;
    
    console.log('Loading user groups...');
    
    // Unsubscribe from previous listeners
    if (unsubscribeGroups) {
        unsubscribeGroups();
    }
    
    unsubscribeGroups = db.collection('groups')
        .where('participants', 'array-contains', currentUser.uid)
        .where('status', '==', 'active')
        .onSnapshot({
            next: (snapshot) => {
                console.log('Groups snapshot:', snapshot.size, 'groups');
                allGroups = [];
                
                snapshot.forEach(doc => {
                    const group = {
                        id: doc.id,
                        ...doc.data()
                    };
                    allGroups.push(group);
                });
                
                renderGroupsList(allGroups);
            },
            error: (error) => {
                console.error('Error loading groups:', error);
                showToast('Error loading groups', 'error');
            }
        });
}

// Render groups list
function renderGroupsList(groups) {
    const groupsList = document.getElementById('groupsList');
    if (!groupsList) return;
    
    groupsList.innerHTML = '';
    
    if (groups.length === 0) {
        groupsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-users text-4xl mb-3 text-gray-300 block"></i>
                <p>No groups yet</p>
                <p class="text-sm mt-1">Create or join a group to get started</p>
            </div>
        `;
        return;
    }
    
    // Sort by last activity
    groups.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate() || a.createdAt?.toDate() || new Date(0);
        const timeB = b.lastMessageTime?.toDate() || b.createdAt?.toDate() || new Date(0);
        return timeB - timeA;
    });
    
    groups.forEach(group => {
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer';
        groupItem.dataset.groupId = group.id;
        
        // Calculate unread count (you'd need to implement this logic)
        const unreadCount = 0; // Placeholder
        
        // Format last message
        let lastMessage = group.lastMessage || 'No messages yet';
        if (lastMessage.length > 50) {
            lastMessage = lastMessage.substring(0, 50) + '...';
        }
        
        // Format timestamp
        const lastTime = group.lastMessageTime ? formatTimeAgo(group.lastMessageTime) : 'New group';
        
        groupItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="relative">
                    <img class="w-12 h-12 rounded-full object-cover" 
                         src="${group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=7C3AED&color=fff`}" 
                         alt="${group.name}">
                    ${group.isMuted ? '<div class="absolute -top-1 -right-1 bg-gray-600 text-white p-1 rounded-full text-xs"><i class="fas fa-bell-slash"></i></div>' : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                        <h3 class="font-semibold text-gray-800 truncate">${group.name}</h3>
                        <span class="text-xs text-gray-500">${lastTime}</span>
                    </div>
                    <p class="text-sm text-gray-500 truncate">${lastMessage}</p>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-gray-400">${group.participants?.length || 0} members</span>
                        ${unreadCount > 0 ? `
                            <span class="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                ${unreadCount}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add click event
        groupItem.addEventListener('click', () => {
            openGroupChat(group.id);
        });
        
        groupsList.appendChild(groupItem);
    });
}

// Open group chat
async function openGroupChat(groupId) {
    try {
        console.log('Opening group chat:', groupId);
        
        // Get group data
        const groupDoc = await db.collection('groups').doc(groupId).get();
        
        if (!groupDoc.exists) {
            showToast('Group not found', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        
        // Set current group
        currentGroup = {
            id: groupId,
            ...groupData
        };
        currentGroupId = groupId;
        
        // Check if user is admin
        groupAdminId = groupData.createdBy;
        const isAdmin = groupAdminId === currentUser.uid;
        
        // Update UI
        updateGroupChatUI(groupData);
        
        // Load group messages
        loadGroupMessages(groupId);
        
        // Hide other chat containers
        const chatContainer = document.getElementById('chatContainer');
        const groupChatContainer = document.getElementById('groupChatContainer');
        
        if (chatContainer) chatContainer.classList.add('hidden');
        if (groupChatContainer) groupChatContainer.classList.remove('hidden');
        
        // Hide groups list on mobile
        if (window.innerWidth < 768) {
            const tabsContainer = document.querySelector('.tabs');
            if (tabsContainer) tabsContainer.classList.add('hidden');
        }
        
        console.log('Group chat opened:', groupData.name);
        
    } catch (error) {
        console.error('Error opening group chat:', error);
        showToast('Error opening group chat', 'error');
    }
}

// Update group chat UI
function updateGroupChatUI(groupData) {
    // Update header
    if (groupTitle) groupTitle.textContent = groupData.name;
    if (groupAvatar) {
        groupAvatar.src = groupData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=7C3AED&color=fff`;
    }
    if (groupParticipantCount) {
        const memberCount = groupData.participants?.length || 0;
        groupParticipantCount.textContent = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
    }
    
    // Show/hide elements
    if (groupChatHeader) groupChatHeader.classList.remove('hidden');
    if (groupInputArea) groupInputArea.classList.remove('hidden');
    if (noGroupMessagesMessage) noGroupMessagesMessage.classList.add('hidden');
    
    // Enable input
    const groupMessageInput = document.getElementById('groupMessageInput');
    const groupSendBtn = document.getElementById('groupSendBtn');
    
    if (groupMessageInput) groupMessageInput.disabled = false;
    if (groupSendBtn) groupSendBtn.disabled = false;
    
    // Update admin actions visibility
    const adminActionsSection = document.getElementById('adminActionsSection');
    if (adminActionsSection) {
        adminActionsSection.classList.toggle('hidden', groupAdminId !== currentUser.uid);
    }
}

// Load group messages
function loadGroupMessages(groupId) {
    console.log('Loading group messages for:', groupId);
    
    // Unsubscribe from previous listeners
    if (unsubscribeGroupMessages) {
        unsubscribeGroupMessages();
        unsubscribeGroupMessages = null;
    }
    
    const messagesContainer = groupMessagesContainer || document.getElementById('groupMessagesContainer');
    if (!messagesContainer) return;
    
    // Show loading state
    messagesContainer.innerHTML = `
        <div class="text-center text-gray-500 py-10">
            <i class="fas fa-spinner fa-spin text-4xl mb-3 text-gray-300 block"></i>
            <p>Loading messages...</p>
        </div>
    `;
    
    let loadedMessageIds = new Set();
    
    // Subscribe to group messages
    unsubscribeGroupMessages = db.collection('groupMessages')
        .where('groupId', '==', groupId)
        .orderBy('timestamp', 'asc')
        .onSnapshot({
            next: (snapshot) => {
                console.log('Group messages snapshot:', snapshot.size, 'messages');
                
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
                
                // Clear only on first load
                if (loadedMessageIds.size === 0) {
                    messagesContainer.innerHTML = '';
                }
                
                let lastDate = null;
                let hasNewMessages = false;
                
                // Process messages
                snapshot.docChanges().forEach(change => {
                    const messageId = change.doc.id;
                    const message = change.doc.data();
                    
                    // Skip if already loaded
                    if (loadedMessageIds.has(messageId)) {
                        return;
                    }
                    
                    loadedMessageIds.add(messageId);
                    hasNewMessages = true;
                    
                    // Add date separator if needed
                    const messageDate = message.timestamp ? message.timestamp.toDate().toDateString() : new Date().toDateString();
                    if (messageDate !== lastDate) {
                        addGroupDateSeparator(messageDate, messagesContainer);
                        lastDate = messageDate;
                    }
                    
                    // Add message to UI
                    addGroupMessageToUI(message, messageId, messagesContainer);
                });
                
                // Scroll to bottom if new messages
                if (hasNewMessages) {
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 100);
                }
            },
            error: (error) => {
                console.error('Error loading group messages:', error);
                messagesContainer.innerHTML = `
                    <div class="text-center text-gray-500 py-10">
                        <i class="fas fa-exclamation-triangle text-4xl mb-3 text-gray-300 block"></i>
                        <p>Error loading messages</p>
                        <p class="text-sm mt-1">Please try again later</p>
                    </div>
                `;
                showToast('Error loading group messages', 'error');
            }
        });
}

// Add group message to UI
function addGroupMessageToUI(message, messageId, container) {
    const messageElement = document.createElement('div');
    
    const isSent = message.senderId === currentUser.uid;
    const messageTime = message.timestamp ? message.timestamp.toDate().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : 'Just now';
    
    messageElement.className = `group-message-container ${isSent ? 'sent' : 'received'}`;
    
    // Different styling for system messages
    if (message.type === 'system') {
        messageElement.className = 'system-message';
        messageElement.innerHTML = `
            <div class="text-center text-gray-500 text-sm py-2">
                <span class="bg-gray-100 px-3 py-1 rounded-full">${message.text}</span>
            </div>
        `;
    } else {
        // Regular message
        const senderName = message.senderName || 'Unknown';
        
        messageElement.innerHTML = `
            <div class="message-bubble ${isSent ? 'message-sent' : 'message-received'}">
                ${!isSent ? `
                    <div class="sender-name text-xs font-semibold text-gray-600 mb-1">
                        ${senderName}
                    </div>
                ` : ''}
                <div class="message-text">${escapeHtml(message.text)}</div>
                <div class="message-time flex justify-between items-center mt-1">
                    <span>${messageTime}</span>
                    ${isSent ? `
                        <span class="status-icons">
                            ${message.status === 'read' ? '✓✓👁️' : 
                              message.status === 'delivered' ? '✓✓' : '🕒'}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    container.appendChild(messageElement);
}

// Add date separator for group messages
function addGroupDateSeparator(dateString, container) {
    const dateElement = document.createElement('div');
    dateElement.className = 'date-separator';
    
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let displayDate = dateString;
    if (dateString === today) {
        displayDate = 'Today';
    } else if (dateString === yesterday) {
        displayDate = 'Yesterday';
    } else {
        displayDate = new Date(dateString).toLocaleDateString();
    }
    
    dateElement.innerHTML = `<span>${displayDate}</span>`;
    container.appendChild(dateElement);
}

// Send group message
async function sendGroupMessage() {
    const messageInput = document.getElementById('groupMessageInput');
    if (!messageInput || !currentGroup) return;
    
    const text = messageInput.value.trim();
    if (!text) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    console.log('Sending group message:', text);
    
    try {
        const message = {
            text: text,
            senderId: currentUser.uid,
            senderName: currentUserData.displayName,
            groupId: currentGroup.id,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'sent',
            type: 'text'
        };
        
        // Add message to Firebase
        await db.collection('groupMessages').add(message);
        
        // Update group's last message
        await db.collection('groups').doc(currentGroup.id).update({
            lastMessage: text.length > 50 ? text.substring(0, 50) + '...' : text,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear input
        messageInput.value = '';
        
        // Update message status for sender
        updateGroupMessageStatus(currentGroup.id, 'delivered');
        
        // Send push notifications to group members (except sender)
        sendGroupPushNotification(currentGroup.id, currentUserData.displayName, text);
        
        console.log('Group message sent successfully');
        
    } catch (error) {
        console.error('Error sending group message:', error);
        showToast('Error sending message', 'error');
    }
}

// Update group message status
function updateGroupMessageStatus(groupId, status) {
    db.collection('groupMessages')
        .where('groupId', '==', groupId)
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
            console.log('Group message status updated');
        })
        .catch(error => {
            console.error('Error updating group message status:', error);
        });
}

// Create new group
async function createNewGroup(groupName, description, privacy, participantIds) {
    try {
        if (!groupName.trim()) {
            showToast('Group name is required', 'error');
            return;
        }
        
        console.log('Creating new group:', groupName);
        showToast('Creating group...', 'info');
        
        // Generate group ID
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Prepare participants (creator + selected friends)
        const participants = [currentUser.uid, ...participantIds];
        
        // Create group document
        const groupData = {
            id: groupId,
            name: groupName.trim(),
            description: description?.trim() || '',
            privacy: privacy || 'private',
            participants: participants,
            createdBy: currentUser.uid,
            admins: [currentUser.uid], // Creator is admin
            avatar: '', // Will be set later
            isMuted: false,
            status: 'active',
            inviteCode: generateInviteCode(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: '',
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to Firestore
        await db.collection('groups').doc(groupId).set(groupData);
        
        // Send system message
        await sendSystemMessage(groupId, `${currentUserData.displayName} created the group`);
        
        // Send notification to added participants
        participantIds.forEach(async (participantId) => {
            await sendSystemMessage(groupId, `${currentUserData.displayName} added you to the group`);
        });
        
        console.log('Group created successfully:', groupId);
        showToast('Group created successfully!', 'success');
        
        // Open the new group chat
        openGroupChat(groupId);
        
        // Close modal
        const modal = document.getElementById('createGroupModal');
        if (modal) modal.classList.add('hidden');
        
        return groupId;
        
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Error creating group: ' + error.message, 'error');
        return null;
    }
}

// Generate invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GROUP-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Send system message to group
async function sendSystemMessage(groupId, text) {
    try {
        const message = {
            text: text,
            senderId: 'system',
            senderName: 'System',
            groupId: groupId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'system',
            status: 'sent'
        };
        
        await db.collection('groupMessages').add(message);
        
    } catch (error) {
        console.error('Error sending system message:', error);
    }
}

// Add participant to group
async function addParticipantToGroup(groupId, userId) {
    try {
        if (!currentGroup || currentGroup.createdBy !== currentUser.uid) {
            showToast('Only group admins can add participants', 'error');
            return;
        }
        
        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showToast('User not found', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        // Add to group participants
        await db.collection('groups').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayUnion(userId)
        });
        
        // Send system message
        await sendSystemMessage(groupId, `${currentUserData.displayName} added ${userData.displayName} to the group`);
        
        // Send notification to added user
        sendGroupInviteNotification(groupId, userId);
        
        showToast(`${userData.displayName} added to group`, 'success');
        
        // Reload group info
        if (currentGroupId === groupId) {
            openGroupChat(groupId);
        }
        
    } catch (error) {
        console.error('Error adding participant:', error);
        showToast('Error adding participant', 'error');
    }
}

// Remove participant from group
async function removeParticipantFromGroup(groupId, userId) {
    try {
        if (!currentGroup || currentGroup.createdBy !== currentUser.uid) {
            showToast('Only group admins can remove participants', 'error');
            return;
        }
        
        // Check if trying to remove self
        if (userId === currentUser.uid) {
            showToast('You cannot remove yourself. Use "Leave Group" instead.', 'warning');
            return;
        }
        
        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : { displayName: 'User' };
        
        // Remove from group participants
        await db.collection('groups').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayRemove(userId)
        });
        
        // Remove from admins if they were admin
        await db.collection('groups').doc(groupId).update({
            admins: firebase.firestore.FieldValue.arrayRemove(userId)
        });
        
        // Send system message
        await sendSystemMessage(groupId, `${userData.displayName} was removed from the group`);
        
        showToast(`${userData.displayName} removed from group`, 'success');
        
        // Reload group info
        if (currentGroupId === groupId) {
            openGroupChat(groupId);
        }
        
    } catch (error) {
        console.error('Error removing participant:', error);
        showToast('Error removing participant', 'error');
    }
}

// Leave group
async function leaveGroup(groupId) {
    try {
        if (!confirm('Are you sure you want to leave this group?')) {
            return;
        }
        
        console.log('Leaving group:', groupId);
        
        // Remove user from participants
        await db.collection('groups').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
        
        // Remove from admins if they were admin
        await db.collection('groups').doc(groupId).update({
            admins: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
        
        // Send system message
        await sendSystemMessage(groupId, `${currentUserData.displayName} left the group`);
        
        // Clear current group if it's the one we're leaving
        if (currentGroupId === groupId) {
            currentGroup = null;
            currentGroupId = null;
            
            // Show groups list
            const groupChatContainer = document.getElementById('groupChatContainer');
            const chatContainer = document.getElementById('chatContainer');
            
            if (groupChatContainer) groupChatContainer.classList.add('hidden');
            if (chatContainer) chatContainer.classList.remove('hidden');
        }
        
        showToast('You left the group', 'success');
        
        // Reload groups list
        loadUserGroups();
        
    } catch (error) {
        console.error('Error leaving group:', error);
        showToast('Error leaving group', 'error');
    }
}

// Delete group (admin only)
async function deleteGroup(groupId) {
    try {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            return;
        }
        
        console.log('Deleting group:', groupId);
        
        // Verify user is admin
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists || groupDoc.data().createdBy !== currentUser.uid) {
            showToast('Only the group creator can delete the group', 'error');
            return;
        }
        
        // Update group status to deleted (soft delete)
        await db.collection('groups').doc(groupId).update({
            status: 'deleted',
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear current group if it's the one being deleted
        if (currentGroupId === groupId) {
            currentGroup = null;
            currentGroupId = null;
            
            // Show groups list
            const groupChatContainer = document.getElementById('groupChatContainer');
            const chatContainer = document.getElementById('chatContainer');
            
            if (groupChatContainer) groupChatContainer.classList.add('hidden');
            if (chatContainer) chatContainer.classList.remove('hidden');
        }
        
        showToast('Group deleted successfully', 'success');
        
        // Reload groups list
        loadUserGroups();
        
    } catch (error) {
        console.error('Error deleting group:', error);
        showToast('Error deleting group', 'error');
    }
}

// Update group info
async function updateGroupInfo(groupId, updates) {
    try {
        if (!currentGroup || currentGroup.createdBy !== currentUser.uid) {
            showToast('Only group admins can update group info', 'error');
            return;
        }
        
        console.log('Updating group info:', groupId, updates);
        
        await db.collection('groups').doc(groupId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Send system message if name changed
        if (updates.name && updates.name !== currentGroup.name) {
            await sendSystemMessage(groupId, 
                `${currentUserData.displayName} changed the group name to "${updates.name}"`);
        }
        
        if (updates.description) {
            await sendSystemMessage(groupId, 
                `${currentUserData.displayName} updated the group description`);
        }
        
        showToast('Group info updated', 'success');
        
        // Reload group if it's the current one
        if (currentGroupId === groupId) {
            openGroupChat(groupId);
        }
        
    } catch (error) {
        console.error('Error updating group info:', error);
        showToast('Error updating group info', 'error');
    }
}

// Mute/unmute group
async function toggleGroupMute(groupId, mute) {
    try {
        // Store user's mute preference in their settings
        const userMutedGroups = JSON.parse(localStorage.getItem('mutedGroups') || '{}');
        userMutedGroups[groupId] = mute;
        localStorage.setItem('mutedGroups', JSON.stringify(userMutedGroups));
        
        // Update UI
        const muteBtn = document.getElementById('muteGroupBtn');
        if (muteBtn) {
            muteBtn.innerHTML = mute ? 
                '<i class="fas fa-bell"></i><span>Unmute</span>' :
                '<i class="fas fa-bell-slash"></i><span>Mute</span>';
        }
        
        showToast(mute ? 'Group muted' : 'Group unmuted', 'success');
        
    } catch (error) {
        console.error('Error toggling group mute:', error);
    }
}

// Make member admin
async function makeMemberAdmin(groupId, userId) {
    try {
        if (!currentGroup || currentGroup.createdBy !== currentUser.uid) {
            showToast('Only group creator can make admins', 'error');
            return;
        }
        
        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : { displayName: 'User' };
        
        // Add to admins
        await db.collection('groups').doc(groupId).update({
            admins: firebase.firestore.FieldValue.arrayUnion(userId)
        });
        
        // Send system message
        await sendSystemMessage(groupId, 
            `${currentUserData.displayName} made ${userData.displayName} an admin`);
        
        showToast(`${userData.displayName} is now an admin`, 'success');
        
        // Reload group info
        if (currentGroupId === groupId) {
            openGroupChat(groupId);
        }
        
    } catch (error) {
        console.error('Error making member admin:', error);
        showToast('Error making member admin', 'error');
    }
}

// Listen for group invites
function listenForGroupInvites() {
    if (!currentUser) return;
    
    db.collection('groupInvites')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .onSnapshot({
            next: (snapshot) => {
                console.log('Group invites snapshot:', snapshot.size, 'invites');
                groupInvites = [];
                
                snapshot.forEach(doc => {
                    groupInvites.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                renderGroupInvites();
            },
            error: (error) => {
                console.error('Error listening for group invites:', error);
            }
        });
}

// Render group invites
function renderGroupInvites() {
    const invitesSection = document.getElementById('groupInvitesSection');
    const invitesList = document.getElementById('groupInvitesList');
    
    if (!invitesSection || !invitesList) return;
    
    invitesList.innerHTML = '';
    
    if (groupInvites.length === 0) {
        invitesSection.classList.add('hidden');
        return;
    }
    
    invitesSection.classList.remove('hidden');
    
    groupInvites.forEach(invite => {
        const inviteItem = document.createElement('div');
        inviteItem.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4';
        inviteItem.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-semibold text-blue-800">Invitation to join group</h4>
                    <p class="text-sm text-blue-600 mt-1">You've been invited to join a group</p>
                    <p class="text-xs text-gray-500 mt-2">Invite code: ${invite.inviteCode}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="accept-invite-btn px-3 py-1 bg-green-500 text-white rounded-lg text-sm" 
                            data-invite-id="${invite.id}" data-group-id="${invite.groupId}">
                        Accept
                    </button>
                    <button class="decline-invite-btn px-3 py-1 bg-red-500 text-white rounded-lg text-sm" 
                            data-invite-id="${invite.id}">
                        Decline
                    </button>
                </div>
            </div>
        `;
        
        invitesList.appendChild(inviteItem);
    });
    
    // Add event listeners
    invitesList.addEventListener('click', function(e) {
        if (e.target.classList.contains('accept-invite-btn') || e.target.closest('.accept-invite-btn')) {
            const btn = e.target.classList.contains('accept-invite-btn') ? 
                e.target : e.target.closest('.accept-invite-btn');
            const inviteId = btn.dataset.inviteId;
            const groupId = btn.dataset.groupId;
            acceptGroupInvite(inviteId, groupId);
        }
        
        if (e.target.classList.contains('decline-invite-btn') || e.target.closest('.decline-invite-btn')) {
            const btn = e.target.classList.contains('decline-invite-btn') ? 
                e.target : e.target.closest('.decline-invite-btn');
            const inviteId = btn.dataset.inviteId;
            declineGroupInvite(inviteId);
        }
    });
}

// Accept group invite
async function acceptGroupInvite(inviteId, groupId) {
    try {
        console.log('Accepting group invite:', inviteId);
        
        // Get invite details
        const inviteDoc = await db.collection('groupInvites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            showToast('Invite not found', 'error');
            return;
        }
        
        const inviteData = inviteDoc.data();
        
        // Add user to group participants
        await db.collection('groups').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        
        // Update invite status
        await db.collection('groupInvites').doc(inviteId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Send system message to group
        await sendSystemMessage(groupId, 
            `${currentUserData.displayName} joined the group via invitation`);
        
        showToast('You joined the group!', 'success');
        
        // Open the group
        openGroupChat(groupId);
        
    } catch (error) {
        console.error('Error accepting group invite:', error);
        showToast('Error accepting invite', 'error');
    }
}

// Decline group invite
async function declineGroupInvite(inviteId) {
    try {
        await db.collection('groupInvites').doc(inviteId).update({
            status: 'declined',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Invite declined', 'info');
        
    } catch (error) {
        console.error('Error declining group invite:', error);
        showToast('Error declining invite', 'error');
    }
}

// Listen for group join requests (for admins)
function listenForGroupRequests() {
    if (!currentUser) return;
    
    db.collection('groupRequests')
        .where('groupId', 'in', allGroups.filter(g => g.admins?.includes(currentUser.uid)).map(g => g.id))
        .where('status', '==', 'pending')
        .onSnapshot({
            next: (snapshot) => {
                console.log('Group requests snapshot:', snapshot.size, 'requests');
                groupRequests = [];
                
                snapshot.forEach(doc => {
                    groupRequests.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Show notification badge if there are pending requests
                const groupsTabBtn = document.getElementById('groupsTabBtn');
                if (groupsTabBtn && groupRequests.length > 0) {
                    groupsTabBtn.classList.add('has-notification');
                    // You could add a badge counter here
                }
            },
            error: (error) => {
                console.error('Error listening for group requests:', error);
            }
        });
}

// Send group push notification
async function sendGroupPushNotification(groupId, senderName, message) {
    try {
        // Get group participants
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) return;
        
        const groupData = groupDoc.data();
        const participants = groupData.participants || [];
        
        // Send notification to each participant (except sender)
        participants.forEach(async (participantId) => {
            if (participantId === currentUser.uid) return;
            
            // Check if user has muted this group
            const userMutedGroups = JSON.parse(localStorage.getItem('mutedGroups') || '{}');
            if (userMutedGroups[groupId]) return;
            
            // Get participant's FCM token and send notification
            const participantDoc = await db.collection('users').doc(participantId).get();
            if (participantDoc.exists) {
                const participantData = participantDoc.data();
                const fcmToken = participantData.fcmToken;
                
                if (fcmToken) {
                    console.log(`Sending group notification to ${participantId}: ${senderName}: ${message}`);
                    // Actual FCM implementation would go here
                }
            }
        });
        
    } catch (error) {
        console.error('Error sending group push notification:', error);
    }
}

// Send group invite notification
async function sendGroupInviteNotification(groupId, userId) {
    try {
        // Create invite document
        await db.collection('groupInvites').add({
            groupId: groupId,
            userId: userId,
            invitedBy: currentUser.uid,
            inviteCode: currentGroup?.inviteCode || generateInviteCode(),
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error sending group invite notification:', error);
    }
}

// Setup group event listeners
function setupGroupEventListeners() {
    console.log('Setting up group event listeners...');
    
    // Tab switching
    document.addEventListener('click', function(e) {
        if (e.target.closest('#groupsTabBtn')) {
            switchToTab('groups');
        }
    });
    
    // Create group button
    document.getElementById('createGroupBtn')?.addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.remove('hidden');
        loadFriendsForGroupCreation();
    });
    
    // Join group button
    document.getElementById('joinGroupBtn')?.addEventListener('click', () => {
        document.getElementById('joinGroupModal').classList.remove('hidden');
        loadPublicGroups();
    });
    
    // Close modals
    document.getElementById('closeCreateGroup')?.addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.add('hidden');
    });
    
    document.getElementById('closeJoinGroup')?.addEventListener('click', () => {
        document.getElementById('joinGroupModal').classList.add('hidden');
    });
    
    // Create group action
    document.getElementById('createGroupActionBtn')?.addEventListener('click', createGroupAction);
    
    // Join by code
    document.getElementById('joinByCodeBtn')?.addEventListener('click', joinGroupByCode);
    
    // Group message sending
    document.getElementById('groupSendBtn')?.addEventListener('click', sendGroupMessage);
    
    document.getElementById('groupMessageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendGroupMessage();
        }
    });
    
    // Group info button
    document.getElementById('groupInfoBtn')?.addEventListener('click', () => {
        if (currentGroup) {
            showGroupInfoModal(currentGroup.id);
        }
    });
    
    // Back to groups (mobile)
    document.getElementById('backToGroups')?.addEventListener('click', () => {
        const groupChatContainer = document.getElementById('groupChatContainer');
        const tabsContainer = document.querySelector('.tabs');
        
        if (groupChatContainer) groupChatContainer.classList.add('hidden');
        if (tabsContainer) tabsContainer.classList.remove('hidden');
        
        // Show groups tab
        switchToTab('groups');
    });
    
    // Close group info
    document.getElementById('closeGroupInfo')?.addEventListener('click', () => {
        document.getElementById('groupInfoModal').classList.add('hidden');
    });
    
    // Group actions
    document.getElementById('leaveGroupBtn')?.addEventListener('click', () => {
        if (currentGroupId) {
            leaveGroup(currentGroupId);
            document.getElementById('groupInfoModal').classList.add('hidden');
        }
    });
    
    document.getElementById('muteGroupBtn')?.addEventListener('click', () => {
        if (currentGroupId) {
            const isMuted = currentGroup?.isMuted || false;
            toggleGroupMute(currentGroupId, !isMuted);
        }
    });
    
    document.getElementById('deleteGroupBtn')?.addEventListener('click', () => {
        if (currentGroupId && confirm('Are you sure you want to delete this group?')) {
            deleteGroup(currentGroupId);
            document.getElementById('groupInfoModal').classList.add('hidden');
        }
    });
    
    // Search groups
    document.getElementById('groupSearch')?.addEventListener('input', (e) => {
        searchGroups(e.target.value);
    });
    
    // Search in create group modal
    document.getElementById('searchParticipants')?.addEventListener('input', (e) => {
        searchFriendsForGroupCreation(e.target.value);
    });
    
    // Search in join group modal
    document.getElementById('searchGroups')?.addEventListener('input', (e) => {
        searchPublicGroups(e.target.value);
    });
    
    // File attachment for groups
    document.getElementById('groupAttachBtn')?.addEventListener('click', () => {
        if (!currentGroup) {
            showToast('Please select a group first', 'error');
            return;
        }
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*/*';
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadGroupFile(e.target.files[0]);
            }
        });
        fileInput.click();
    });
    
    // Remove file preview for groups
    document.getElementById('groupRemoveFile')?.addEventListener('click', () => {
        document.getElementById('groupFilePreview').classList.add('hidden');
    });
}

// Create group action
async function createGroupAction() {
    const groupName = document.getElementById('newGroupName')?.value.trim();
    const description = document.getElementById('newGroupDescription')?.value.trim();
    const privacy = document.getElementById('newGroupPrivacy')?.value;
    
    if (!groupName) {
        showToast('Group name is required', 'error');
        return;
    }
    
    // Get selected participants
    const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
    const participantIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (participantIds.length === 0) {
        showToast('Please select at least one participant', 'error');
        return;
    }
    
    await createNewGroup(groupName, description, privacy, participantIds);
}

// Join group by code
async function joinGroupByCode() {
    const inviteCode = document.getElementById('groupInviteCode')?.value.trim();
    
    if (!inviteCode) {
        showToast('Please enter an invite code', 'error');
        return;
    }
    
    try {
        // Find group by invite code
        const groupsQuery = await db.collection('groups')
            .where('inviteCode', '==', inviteCode)
            .where('status', '==', 'active')
            .get();
        
        if (groupsQuery.empty) {
            showToast('Invalid invite code or group not found', 'error');
            return;
        }
        
        const groupDoc = groupsQuery.docs[0];
        const groupId = groupDoc.id;
        const groupData = groupDoc.data();
        
        // Check if user is already a member
        if (groupData.participants?.includes(currentUser.uid)) {
            showToast('You are already a member of this group', 'info');
            openGroupChat(groupId);
            return;
        }
        
        // Check group privacy
        if (groupData.privacy === 'private' || groupData.privacy === 'hidden') {
            // Send join request
            await db.collection('groupRequests').add({
                groupId: groupId,
                userId: currentUser.uid,
                userName: currentUserData.displayName,
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast('Join request sent to group admin', 'success');
            
        } else if (groupData.privacy === 'public') {
            // Join directly
            await db.collection('groups').doc(groupId).update({
                participants: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
            
            // Send system message
            await sendSystemMessage(groupId, 
                `${currentUserData.displayName} joined the group`);
            
            showToast('You joined the group!', 'success');
            openGroupChat(groupId);
        }
        
        // Close modal
        document.getElementById('joinGroupModal').classList.add('hidden');
        
    } catch (error) {
        console.error('Error joining group by code:', error);
        showToast('Error joining group', 'error');
    }
}

// Load friends for group creation
function loadFriendsForGroupCreation() {
    const participantsList = document.getElementById('participantsList');
    if (!participantsList || !friends || friends.length === 0) return;
    
    participantsList.innerHTML = '';
    
    friends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded';
        friendItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <img class="w-10 h-10 rounded-full" 
                     src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}" 
                     alt="${friend.displayName}">
                <div>
                    <p class="font-medium">${friend.displayName}</p>
                    <p class="text-sm text-gray-500">${friend.status || 'offline'}</p>
                </div>
            </div>
            <input type="checkbox" class="participant-checkbox" value="${friend.id}">
        `;
        
        participantsList.appendChild(friendItem);
    });
    
    // Update selected count
    const checkboxes = document.querySelectorAll('.participant-checkbox');
    const selectedCount = document.getElementById('selectedCount');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selected = document.querySelectorAll('.participant-checkbox:checked').length;
            if (selectedCount) {
                selectedCount.textContent = `${selected} selected`;
            }
        });
    });
}

// Search friends for group creation
function searchFriendsForGroupCreation(query) {
    const participantsList = document.getElementById('participantsList');
    if (!participantsList) return;
    
    const filteredFriends = friends.filter(friend => 
        friend.displayName.toLowerCase().includes(query.toLowerCase()) ||
        (friend.email && friend.email.toLowerCase().includes(query.toLowerCase()))
    );
    
    participantsList.innerHTML = '';
    
    filteredFriends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded';
        friendItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <img class="w-10 h-10 rounded-full" 
                     src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}" 
                     alt="${friend.displayName}">
                <div>
                    <p class="font-medium">${friend.displayName}</p>
                    <p class="text-sm text-gray-500">${friend.status || 'offline'}</p>
                </div>
            </div>
            <input type="checkbox" class="participant-checkbox" value="${friend.id}">
        `;
        
        participantsList.appendChild(friendItem);
    });
}

// Load public groups
async function loadPublicGroups() {
    const publicGroupsList = document.getElementById('publicGroupsList');
    if (!publicGroupsList) return;
    
    try {
        const publicGroupsQuery = await db.collection('groups')
            .where('privacy', '==', 'public')
            .where('status', '==', 'active')
            .limit(20)
            .get();
        
        publicGroupsList.innerHTML = '';
        
        if (publicGroupsQuery.empty) {
            publicGroupsList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p>No public groups available</p>
                </div>
            `;
            return;
        }
        
        publicGroupsQuery.forEach(doc => {
            const group = {
                id: doc.id,
                ...doc.data()
            };
            
            // Skip groups user is already in
            if (group.participants?.includes(currentUser.uid)) return;
            
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item bg-white rounded-lg p-4 mb-3 border border-gray-200 hover:shadow-md cursor-pointer';
            groupItem.dataset.groupId = group.id;
            groupItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <img class="w-12 h-12 rounded-full" 
                         src="${group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=7C3AED&color=fff`}" 
                         alt="${group.name}">
                    <div class="flex-1">
                        <h4 class="font-semibold">${group.name}</h4>
                        <p class="text-sm text-gray-500">${group.description || 'No description'}</p>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs text-gray-400">${group.participants?.length || 0} members</span>
                            <button class="join-public-group-btn px-3 py-1 bg-green-500 text-white rounded-lg text-sm" 
                                    data-group-id="${group.id}">
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            publicGroupsList.appendChild(groupItem);
        });
        
        // Add join event listeners
        publicGroupsList.addEventListener('click', function(e) {
            if (e.target.classList.contains('join-public-group-btn') || e.target.closest('.join-public-group-btn')) {
                const btn = e.target.classList.contains('join-public-group-btn') ? 
                    e.target : e.target.closest('.join-public-group-btn');
                const groupId = btn.dataset.groupId;
                joinPublicGroup(groupId);
            }
        });
        
    } catch (error) {
        console.error('Error loading public groups:', error);
        publicGroupsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>Error loading groups</p>
            </div>
        `;
    }
}

// Join public group
async function joinPublicGroup(groupId) {
    try {
        // Add user to group
        await db.collection('groups').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        
        // Send system message
        await sendSystemMessage(groupId, 
            `${currentUserData.displayName} joined the group`);
        
        showToast('You joined the group!', 'success');
        
        // Close modal and open group
        document.getElementById('joinGroupModal').classList.add('hidden');
        openGroupChat(groupId);
        
    } catch (error) {
        console.error('Error joining public group:', error);
        showToast('Error joining group', 'error');
    }
}

// Search public groups
async function searchPublicGroups(query) {
    const publicGroupsList = document.getElementById('publicGroupsList');
    if (!publicGroupsList || !query) {
        loadPublicGroups();
        return;
    }
    
    try {
        const publicGroupsQuery = await db.collection('groups')
            .where('privacy', '==', 'public')
            .where('status', '==', 'active')
            .get();
        
        publicGroupsList.innerHTML = '';
        
        const filteredGroups = [];
        publicGroupsQuery.forEach(doc => {
            const group = {
                id: doc.id,
                ...doc.data()
            };
            
            // Skip groups user is already in
            if (group.participants?.includes(currentUser.uid)) return;
            
            // Filter by name or description
            if (group.name.toLowerCase().includes(query.toLowerCase()) ||
                (group.description && group.description.toLowerCase().includes(query.toLowerCase()))) {
                filteredGroups.push(group);
            }
        });
        
        if (filteredGroups.length === 0) {
            publicGroupsList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p>No groups found</p>
                </div>
            `;
            return;
        }
        
        filteredGroups.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item bg-white rounded-lg p-4 mb-3 border border-gray-200 hover:shadow-md cursor-pointer';
            groupItem.dataset.groupId = group.id;
            groupItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <img class="w-12 h-12 rounded-full" 
                         src="${group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=7C3AED&color=fff`}" 
                         alt="${group.name}">
                    <div class="flex-1">
                        <h4 class="font-semibold">${group.name}</h4>
                        <p class="text-sm text-gray-500">${group.description || 'No description'}</p>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs text-gray-400">${group.participants?.length || 0} members</span>
                            <button class="join-public-group-btn px-3 py-1 bg-green-500 text-white rounded-lg text-sm" 
                                    data-group-id="${group.id}">
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            publicGroupsList.appendChild(groupItem);
        });
        
    } catch (error) {
        console.error('Error searching public groups:', error);
    }
}

// Search groups in main list
function searchGroups(query) {
    const groupsList = document.getElementById('groupsList');
    if (!groupsList || !allGroups || allGroups.length === 0) return;
    
    if (!query) {
        renderGroupsList(allGroups);
        return;
    }
    
    const filteredGroups = allGroups.filter(group => 
        group.name.toLowerCase().includes(query.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    renderGroupsList(filteredGroups);
}

// Show group info modal
async function showGroupInfoModal(groupId) {
    try {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            showToast('Group not found', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        
        // Update modal content
        document.getElementById('groupInfoName').textContent = groupData.name;
        document.getElementById('groupInfoDescription').textContent = groupData.description || 'No description';
        document.getElementById('groupInfoAvatar').src = 
            groupData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=7C3AED&color=fff`;
        
        // Format creation date
        const createdDate = groupData.createdAt?.toDate() || new Date();
        document.getElementById('groupInfoMeta').textContent = 
            `Created on ${createdDate.toLocaleDateString()} • ${groupData.participants?.length || 0} members`;
        
        // Load participants
        await loadGroupParticipants(groupId, groupData.participants);
        
        // Show admin actions if user is admin
        const adminActionsSection = document.getElementById('adminActionsSection');
        if (adminActionsSection) {
            adminActionsSection.classList.toggle('hidden', 
                groupData.createdBy !== currentUser.uid && 
                !groupData.admins?.includes(currentUser.uid));
        }
        
        // Update mute button state
        const muteBtn = document.getElementById('muteGroupBtn');
        if (muteBtn) {
            const isMuted = currentGroup?.isMuted || false;
            muteBtn.innerHTML = isMuted ? 
                '<i class="fas fa-bell"></i><span>Unmute</span>' :
                '<i class="fas fa-bell-slash"></i><span>Mute</span>';
        }
        
        // Show modal
        document.getElementById('groupInfoModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error showing group info:', error);
        showToast('Error loading group info', 'error');
    }
}

// Load group participants
async function loadGroupParticipants(groupId, participantIds) {
    const participantsList = document.getElementById('groupParticipantsList');
    if (!participantsList || !participantIds) return;
    
    participantsList.innerHTML = '';
    
    // Get group data to check admins
    const groupDoc = await db.collection('groups').doc(groupId).get();
    const groupData = groupDoc.exists ? groupDoc.data() : { admins: [] };
    
    // Load each participant
    const participantPromises = participantIds.map(async (userId) => {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return {
                id: userId,
                ...userDoc.data()
            };
        }
        return null;
    });
    
    const participants = (await Promise.all(participantPromises)).filter(p => p !== null);
    
    // Sort: admins first, then by name
    participants.sort((a, b) => {
        const aIsAdmin = groupData.admins?.includes(a.id);
        const bIsAdmin = groupData.admins?.includes(b.id);
        
        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;
        
        return a.displayName?.localeCompare(b.displayName);
    });
    
    // Render participants
    participants.forEach(participant => {
        const isAdmin = groupData.admins?.includes(participant.id);
        const isSelf = participant.id === currentUser.uid;
        
        const participantItem = document.createElement('div');
        participantItem.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded';
        participantItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <img class="w-10 h-10 rounded-full" 
                     src="${participant.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.displayName)}&background=7C3AED&color=fff`}" 
                     alt="${participant.displayName}">
                <div>
                    <p class="font-medium">
                        ${participant.displayName}
                        ${isSelf ? ' (You)' : ''}
                    </p>
                    <p class="text-sm text-gray-500">
                        ${isAdmin ? 'Admin' : 'Member'}
                        ${participant.status === 'online' ? ' • Online' : ''}
                    </p>
                </div>
            </div>
            ${!isSelf && groupData.createdBy === currentUser.uid ? `
                <div class="flex space-x-1">
                    ${!isAdmin ? `
                        <button class="make-admin-btn p-1 text-blue-600 hover:text-blue-800" 
                                data-user-id="${participant.id}" title="Make Admin">
                            <i class="fas fa-user-shield"></i>
                        </button>
                    ` : ''}
                    <button class="remove-participant-btn p-1 text-red-600 hover:text-red-800" 
                            data-user-id="${participant.id}" title="Remove">
                        <i class="fas fa-user-times"></i>
                    </button>
                </div>
            ` : ''}
        `;
        
        participantsList.appendChild(participantItem);
    });
    
    // Add event listeners for admin actions
    participantsList.addEventListener('click', function(e) {
        if (e.target.closest('.make-admin-btn')) {
            const btn = e.target.closest('.make-admin-btn');
            const userId = btn.dataset.userId;
            makeMemberAdmin(groupId, userId);
        }
        
        if (e.target.closest('.remove-participant-btn')) {
            const btn = e.target.closest('.remove-participant-btn');
            const userId = btn.dataset.userId;
            if (confirm('Remove this member from the group?')) {
                removeParticipantFromGroup(groupId, userId);
            }
        }
    });
}

// Upload file to group
async function uploadGroupFile(file) {
    if (!currentGroup) {
        showToast('Please select a group first', 'error');
        return;
    }
    
    try {
        console.log('Uploading file to group:', file.name);
        showToast('Uploading file...', 'info');
        
        // Show file preview
        const filePreview = document.getElementById('groupFilePreview');
        const fileName = document.getElementById('groupFileName');
        const fileSize = document.getElementById('groupFileSize');
        
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
        if (filePreview) filePreview.classList.remove('hidden');
        
        // Upload to Firebase Storage
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`group_files/${currentGroup.id}/${Date.now()}_${file.name}`);
        const uploadTask = fileRef.put(file);
        
        // Track upload progress
        const progressBar = document.getElementById('groupUploadProgressBar');
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
                if (progressBar) progressBar.style.width = `${progress}%`;
            },
            (error) => {
                console.error('Error uploading file:', error);
                showToast('Error uploading file', 'error');
                if (filePreview) filePreview.classList.add('hidden');
            },
            async () => {
                // Upload completed
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                
                // Create message with file
                const message = {
                    text: `Shared a file: ${file.name}`,
                    senderId: currentUser.uid,
                    senderName: currentUserData.displayName,
                    groupId: currentGroup.id,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'sent',
                    type: 'file',
                    file: {
                        name: file.name,
                        url: downloadURL,
                        type: file.type,
                        size: file.size
                    }
                };
                
                // Add message to Firebase
                await db.collection('groupMessages').add(message);
                
                // Update group's last message
                await db.collection('groups').doc(currentGroup.id).update({
                    lastMessage: `Shared a file: ${file.name}`,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Hide file preview
                if (filePreview) filePreview.classList.add('hidden');
                
                console.log('File uploaded to group successfully');
                showToast('File uploaded successfully', 'success');
            }
        );
        
    } catch (error) {
        console.error('Error uploading group file:', error);
        showToast('Error uploading file', 'error');
    }
}
function openAddParticipantModal() {
    // Create modal for adding participants
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="modal-header mb-4">
                <h3 class="text-xl font-semibold">Add Participants</h3>
                <button id="closeAddParticipant" class="text-gray-500 hover:text-gray-700 float-right">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <input type="text" id="searchAddParticipants" 
                       class="w-full p-3 border border-gray-300 rounded-lg mb-4" 
                       placeholder="Search friends...">
                
                <div id="addParticipantsList" class="max-h-64 overflow-y-auto border rounded-lg p-2">
                    <!-- Friends list will be populated here -->
                </div>
                
                <div class="mt-4 flex justify-end space-x-3">
                    <button id="cancelAddParticipant" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button id="confirmAddParticipants" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Add Selected
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load friends for selection
    loadFriendsForAdding(modal);
    
    // Add event listeners
    modal.querySelector('#closeAddParticipant').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancelAddParticipant').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#confirmAddParticipants').addEventListener('click', () => {
        const selectedCheckboxes = modal.querySelectorAll('.add-participant-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            showToast('Please select at least one friend', 'error');
            return;
        }
        
        // Add each selected friend to the group
        selectedIds.forEach(userId => {
            addParticipantToGroup(currentGroupId, userId);
        });
        
        document.body.removeChild(modal);
    });
    
    // Search functionality
    modal.querySelector('#searchAddParticipants').addEventListener('input', (e) => {
        searchFriendsForAdding(modal, e.target.value);
    });
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function loadFriendsForAdding(modal) {
    const participantsList = modal.querySelector('#addParticipantsList');
    if (!participantsList || !friends || friends.length === 0) {
        participantsList.innerHTML = '<p class="text-center text-gray-500 py-4">No friends available</p>';
        return;
    }
    
    // Filter out friends already in the group
    const groupParticipants = currentGroup?.participants || [];
    const availableFriends = friends.filter(friend => !groupParticipants.includes(friend.id));
    
    if (availableFriends.length === 0) {
        participantsList.innerHTML = '<p class="text-center text-gray-500 py-4">All friends are already in the group</p>';
        return;
    }
    
    participantsList.innerHTML = '';
    
    availableFriends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded';
        friendItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <img class="w-10 h-10 rounded-full" 
                     src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}" 
                     alt="${friend.displayName}">
                <div>
                    <p class="font-medium">${friend.displayName}</p>
                    <p class="text-sm text-gray-500">${friend.status || 'offline'}</p>
                </div>
            </div>
            <input type="checkbox" class="add-participant-checkbox" value="${friend.id}">
        `;
        
        participantsList.appendChild(friendItem);
    });
}

function searchFriendsForAdding(modal, query) {
    const participantsList = modal.querySelector('#addParticipantsList');
    if (!participantsList) return;
    
    const groupParticipants = currentGroup?.participants || [];
    let filteredFriends = friends.filter(friend => !groupParticipants.includes(friend.id));
    
    if (query) {
        filteredFriends = filteredFriends.filter(friend => 
            friend.displayName.toLowerCase().includes(query.toLowerCase()) ||
            (friend.email && friend.email.toLowerCase().includes(query.toLowerCase()))
        );
    }
    
    participantsList.innerHTML = '';
    
    if (filteredFriends.length === 0) {
        participantsList.innerHTML = '<p class="text-center text-gray-500 py-4">No friends found</p>';
        return;
    }
    
    filteredFriends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded';
        friendItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <img class="w-10 h-10 rounded-full" 
                     src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}" 
                     alt="${friend.displayName}">
                <div>
                    <p class="font-medium">${friend.displayName}</p>
                    <p class="text-sm text-gray-500">${friend.status || 'offline'}</p>
                </div>
            </div>
            <input type="checkbox" class="add-participant-checkbox" value="${friend.id}">
        `;
        
        participantsList.appendChild(friendItem);
    });
}

// ==================== EDIT GROUP INFO MODAL ====================

function openEditGroupInfoModal() {
    // Create modal for editing group info
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="modal-header mb-4">
                <h3 class="text-xl font-semibold">Edit Group Info</h3>
                <button id="closeEditGroupInfo" class="text-gray-500 hover:text-gray-700 float-right">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input type="text" id="editGroupName" 
                           class="w-full p-3 border border-gray-300 rounded-lg" 
                           value="${currentGroup?.name || ''}">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="editGroupDescription" 
                              class="w-full p-3 border border-gray-300 rounded-lg" 
                              rows="3">${currentGroup?.description || ''}</textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Group Privacy</label>
                    <select id="editGroupPrivacy" class="w-full p-3 border border-gray-300 rounded-lg">
                        <option value="public" ${currentGroup?.privacy === 'public' ? 'selected' : ''}>Public - Anyone can join</option>
                        <option value="private" ${currentGroup?.privacy === 'private' ? 'selected' : ''}>Private - Invite only</option>
                        <option value="hidden" ${currentGroup?.privacy === 'hidden' ? 'selected' : ''}>Hidden - Admin adds members</option>
                    </select>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4">
                    <button id="cancelEditGroupInfo" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button id="saveGroupInfo" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('#closeEditGroupInfo').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancelEditGroupInfo').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#saveGroupInfo').addEventListener('click', () => {
        const name = modal.querySelector('#editGroupName').value.trim();
        const description = modal.querySelector('#editGroupDescription').value.trim();
        const privacy = modal.querySelector('#editGroupPrivacy').value;
        
        if (!name) {
            showToast('Group name is required', 'error');
            return;
        }
        
        updateGroupInfo(currentGroupId, {
            name: name,
            description: description,
            privacy: privacy
        });
        
        document.body.removeChild(modal);
    });
    
    // Enter key to save
    modal.querySelector('#editGroupName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            modal.querySelector('#saveGroupInfo').click();
        }
    });
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// ==================== GROUP AVATAR UPLOAD ====================

function triggerGroupAvatarUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadGroupAvatar(e.target.files[0]);
        }
    });
    fileInput.click();
}

async function uploadGroupAvatar(file) {
    try {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB', 'error');
            return;
        }
        
        showToast('Uploading group avatar...', 'info');
        
        // Upload to Cloudinary
        const downloadURL = await uploadToCloudinary(file);
        
        // Update group in Firestore
        await db.collection('groups').doc(currentGroupId).update({
            avatar: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update UI
        const groupAvatar = document.getElementById('groupAvatar');
        const groupInfoAvatar = document.getElementById('groupInfoAvatar');
        
        if (groupAvatar) groupAvatar.src = downloadURL + '?t=' + Date.now();
        if (groupInfoAvatar) groupInfoAvatar.src = downloadURL + '?t=' + Date.now();
        
        // Send system message
        await sendSystemMessage(currentGroupId, 
            `${currentUserData.displayName} changed the group photo`);
        
        showToast('Group avatar updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error uploading group avatar:', error);
        showToast('Error uploading group avatar: ' + error.message, 'error');
    }
}

// ==================== INITIALIZE ALL LISTENERS ====================

// Call this function after DOM is loaded
function initializeGroupListeners() {
    setupGroupModalListeners();
    
    // Also add click listeners for group items in the list
    document.addEventListener('click', function(e) {
        // Handle group item clicks
        if (e.target.closest('.group-item')) {
            const groupItem = e.target.closest('.group-item');
            const groupId = groupItem.dataset.groupId;
            if (groupId) {
                openGroupChat(groupId);
            }
        }
        
        // Handle join public group buttons
        if (e.target.closest('.join-public-group-btn')) {
            const btn = e.target.closest('.join-public-group-btn');
            const groupId = btn.dataset.groupId;
            if (groupId) {
                joinPublicGroup(groupId);
            }
        }
    });
}

// Initialize when group system starts
initializeGroupListeners();

console.log('✅ Group system with complete listeners loaded successfully');

// Switch to tab
function switchToTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active', 'text-gray-800');
        btn.classList.add('text-gray-500');
    });
    
    const tabBtn = document.getElementById(`${tabName}TabBtn`);
    if (tabBtn) {
        tabBtn.classList.add('tab-active', 'text-gray-800');
        tabBtn.classList.remove('text-gray-500');
    }
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    const tabPanel = document.getElementById(`${tabName}Tab`);
    if (tabPanel) {
        tabPanel.classList.remove('hidden');
    }
    
    // Hide chat containers
    const chatContainer = document.getElementById('chatContainer');
    const groupChatContainer = document.getElementById('groupChatContainer');
    
    if (chatContainer) chatContainer.classList.add('hidden');
    if (groupChatContainer) groupChatContainer.classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for chat.js to initialize
    setTimeout(() => {
        if (typeof currentUser !== 'undefined' && currentUser) {
            initializeGroupSystem();
        } else {
            // Wait for auth state change
            auth.onAuthStateChanged(user => {
                if (user) {
                    setTimeout(initializeGroupSystem, 1000);
                }
            });
        }
    }, 1000);
});

// Export functions for use in other files
window.GroupSystem = {
    initializeGroupSystem,
    createNewGroup,
    openGroupChat,
    loadUserGroups,
    sendGroupMessage,
    addParticipantToGroup,
    removeParticipantFromGroup,
    leaveGroup,
    deleteGroup,
    updateGroupInfo,
    toggleGroupMute,
    makeMemberAdmin,
    acceptGroupInvite,
    declineGroupInvite,
    joinPublicGroup
};
// ==================== GROUP EVENT LISTENERS ====================

function setupGroupModalListeners() {
    console.log('Setting up group modal listeners...');
    
    // 1. CREATE GROUP MODAL LISTENERS
    document.getElementById('closeCreateGroup')?.addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.add('hidden');
    });
    
    document.getElementById('createGroupActionBtn')?.addEventListener('click', createGroupAction);
    
    // Enter key in group name field
    document.getElementById('newGroupName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createGroupAction();
        }
    });
    
    // 2. JOIN GROUP MODAL LISTENERS
    document.getElementById('closeJoinGroup')?.addEventListener('click', () => {
        document.getElementById('joinGroupModal').classList.add('hidden');
    });
    
    document.getElementById('joinByCodeBtn')?.addEventListener('click', joinGroupByCode);
    
    // Enter key in invite code field
    document.getElementById('groupInviteCode')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGroupByCode();
        }
    });
    
    // 3. GROUP INFO MODAL LISTENERS
    document.getElementById('closeGroupInfo')?.addEventListener('click', () => {
        document.getElementById('groupInfoModal').classList.add('hidden');
    });
    
    document.getElementById('leaveGroupBtn')?.addEventListener('click', () => {
        if (currentGroupId) {
            if (confirm('Are you sure you want to leave this group?')) {
                leaveGroup(currentGroupId);
                document.getElementById('groupInfoModal').classList.add('hidden');
            }
        }
    });
    
    document.getElementById('deleteGroupBtn')?.addEventListener('click', () => {
        if (currentGroupId && confirm('Are you sure you want to delete this group? This cannot be undone.')) {
            deleteGroup(currentGroupId);
            document.getElementById('groupInfoModal').classList.add('hidden');
        }
    });
    
    document.getElementById('muteGroupBtn')?.addEventListener('click', () => {
        if (currentGroupId) {
            const isMuted = currentGroup?.isMuted || false;
            toggleGroupMute(currentGroupId, !isMuted);
            
            // Update button text
            const muteBtn = document.getElementById('muteGroupBtn');
            if (muteBtn) {
                muteBtn.innerHTML = isMuted ? 
                    '<i class="fas fa-bell-slash"></i><span>Mute</span>' :
                    '<i class="fas fa-bell"></i><span>Unmute</span>';
            }
        }
    });
    
    document.getElementById('addParticipantBtn')?.addEventListener('click', () => {
        openAddParticipantModal();
    });
    
    document.getElementById('changeGroupAvatar')?.addEventListener('click', () => {
        triggerGroupAvatarUpload();
    });
    
    document.getElementById('editGroupInfoBtn')?.addEventListener('click', () => {
        openEditGroupInfoModal();
    });
    
    // 4. ADD PARTICIPANT MODAL (Will be created dynamically)
    // We'll handle this when the modal is created
    
    // 5. EDIT GROUP INFO MODAL (Will be created dynamically)
    
    // 6. GROUP CHAT INPUT LISTENERS
    document.getElementById('groupSendBtn')?.addEventListener('click', sendGroupMessage);
    
    document.getElementById('groupMessageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendGroupMessage();
        }
    });
    
    document.getElementById('groupAttachBtn')?.addEventListener('click', () => {
        if (!currentGroup) {
            showToast('Please select a group first', 'error');
            return;
        }
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*/*';
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadGroupFile(e.target.files[0]);
            }
        });
        fileInput.click();
    });
    
    document.getElementById('groupRemoveFile')?.addEventListener('click', () => {
        document.getElementById('groupFilePreview').classList.add('hidden');
    });
    
    // 7. BACK TO GROUPS BUTTON (Mobile)
    document.getElementById('backToGroups')?.addEventListener('click', () => {
        const groupChatContainer = document.getElementById('groupChatContainer');
        const tabsContainer = document.querySelector('.tabs');
        
        if (groupChatContainer) groupChatContainer.classList.add('hidden');
        if (tabsContainer) tabsContainer.classList.remove('hidden');
        
        // Show groups tab
        switchToTab('groups');
    });
    
    console.log('✅ Group modal listeners setup complete');
}

console.log('✅ Group system loaded successfully');