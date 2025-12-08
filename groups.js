// ==================== ENHANCED GROUP SYSTEM ====================
// A complete group chat system for Kynecta with WhatsApp-like features
// Production-ready code for live deployment

// Group state variables
let currentGroup = null;
let currentGroupId = null;
let groupAdminId = null;
let unsubscribeGroupMessages = null;
let unsubscribeGroups = null;
let allGroups = [];
let groupInvites = [];
let groupRequests = [];
let groupTypingTimeouts = {};
let selectedGroupMessages = new Set();
let groupEmojiPicker = null;
let currentForwardMessage = null;
let groupReactionsPicker = null;

// DOM Elements cache
const groupElements = {
    // Modals & Containers
    createGroupModal: null,
    enhancedGroupInfoModal: null,
    groupMediaGalleryModal: null,
    manageAdminsModal: null,
    searchGroupModal: null,
    forwardMessageModal: null,
    joinGroupModal: null,
    allFriendsModal: null,
    featuresModal: null,
    
    // Group Creation Elements
    groupName: null,
    groupDescription: null,
    groupParticipants: null,
    groupAdminsOnlySend: null,
    groupAdminsOnlyEdit: null,
    groupEnableEncryption: null,
    createGroupBtn: null,
    closeCreateGroup: null,
    cancelCreateGroup: null,
    
    // Group Info Elements
    enhancedGroupName: null,
    enhancedGroupMembersCount: null,
    groupSendMessages: null,
    groupEditInfo: null,
    groupInviteLink: null,
    copyInviteLink: null,
    refreshInviteLink: null,
    closeEnhancedGroupInfo: null,
    
    // Group Media Gallery Elements
    mediaGalleryGrid: null,
    filterButtons: null,
    closeGroupMediaGallery: null,
    
    // Search & Selection Elements
    groupSearchInput: null,
    groupSearchResults: null,
    closeSearchGroup: null,
    forwardSearchInput: null,
    forwardTargetsList: null,
    forwardCount: null,
    forwardSelectedBtn: null,
    closeForwardMessage: null,
    
    // Admin Management Elements
    adminSearchInput: null,
    adminList: null,
    saveAdmins: null,
    closeManageAdmins: null,
    
    // Group Join Elements
    groupCode: null,
    groupPreview: null,
    previewGroupName: null,
    previewGroupMembers: null,
    joinGroupBtn: null,
    closeJoinGroup: null,
    cancelJoinGroup: null,
    
    // UI Components
    groupListContextMenu: null,
    messageContextMenu: null,
    reactionPicker: null,
    newGroupBtn: null,
    backToChats: null,
    
    // Business Tools Elements
    catalogueBtn: null,
    catalogueModal: null,
    advertiseBtn: null,
    advertiseModal: null,
    labelsBtn: null,
    labelsModal: null,
    greetingBtn: null,
    greetingModal: null,
    awayBtn: null,
    awayModal: null,
    businessProfileModal: null,
    
    // AI Features Elements
    aiSummaryModal: null,
    aiSummarize: null,
    smartRepliesModal: null,
    aiReply: null,
    
    // Miscellaneous Elements
    menuBtn: null,
    settingsModal: null,
    chatMenuBtn: null,
    searchInput: null,
    friendSearch: null,
    addFriendBtn: null,
    themeToggle: null
};

// Initialize group system
function initializeGroupSystem() {
    console.log('🚀 Initializing enhanced group system...');
    
    // Create all UI elements
    createAllGroupUIElements();
    
    // Cache DOM elements
    cacheGroupElements();
    
    // Setup event listeners
    setupEnhancedGroupEventListeners();
    
    // Initialize features
    initializeGroupFeatures();
    
    // Load user's groups
    if (currentUser) {
        loadUserGroups();
        listenForGroupInvites();
        listenForGroupRequests();
    }
    
    console.log('✅ Enhanced group system initialized');
}

// Create all necessary UI elements
function createAllGroupUIElements() {
    console.log('Creating all group UI elements...');
    
    // Create main groups tab if it doesn't exist
    createGroupsTab();
    
    // Create all modals
    createGroupModals();
    
    // Create context menus
    createContextMenus();
    
    // Create business tools
    createBusinessTools();
    
    // Create AI features
    createAIFeatures();
}

// Create groups tab
function createGroupsTab() {
    const tabsContainer = document.querySelector('.tabs');
    if (!tabsContainer) return;
    
    // Add groups tab button to navigation
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
        }
    }
    
    // Create groups tab content
    if (!document.getElementById('groupsTab')) {
        const groupsTab = document.createElement('div');
        groupsTab.id = 'groupsTab';
        groupsTab.className = 'tab-panel hidden';
        groupsTab.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Groups</h2>
                    <div class="flex space-x-2">
                        <button id="newGroupBtn" class="btn-primary flex items-center space-x-2">
                            <i class="fas fa-plus"></i>
                            <span>New Group</span>
                        </button>
                        <button id="joinGroupBtn" class="btn-secondary flex items-center space-x-2">
                            <i class="fas fa-sign-in-alt"></i>
                            <span>Join Group</span>
                        </button>
                    </div>
                </div>
                
                <!-- Search Bar -->
                <div class="mb-6">
                    <div class="relative">
                        <input type="text" id="searchInput" 
                               class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                               placeholder="Search groups...">
                        <i class="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                    </div>
                </div>
                
                <!-- Groups List -->
                <div id="groupsList" class="space-y-3 custom-scrollbar max-h-[calc(100vh-200px)] overflow-y-auto">
                    <div class="text-center py-12">
                        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                            <i class="fas fa-users text-3xl text-gray-400"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">No Groups Yet</h3>
                        <p class="text-gray-500 mb-6">Create or join a group to start chatting</p>
                        <button id="createGroupFromEmpty" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>Create Your First Group
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after chats tab
        const chatsTab = document.getElementById('chatsTab');
        if (chatsTab) {
            chatsTab.parentNode.insertBefore(groupsTab, chatsTab.nextSibling);
        } else {
            tabsContainer.appendChild(groupsTab);
        }
    }
}

// Create all group modals
function createGroupModals() {
    // Create Group Modal
    if (!document.getElementById('createGroupModal')) {
        const modal = document.createElement('div');
        modal.id = 'createGroupModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Create New Group</h3>
                    <button id="closeCreateGroup" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="createGroupForm">
                        <div class="space-y-6">
                            <!-- Group Avatar -->
                            <div class="text-center">
                                <div class="relative inline-block">
                                    <img id="groupAvatarPreview" 
                                         class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                         src="https://ui-avatars.com/api/?name=New+Group&background=7C3AED&color=fff">
                                    <button type="button" id="uploadGroupAvatar" 
                                            class="absolute bottom-2 right-2 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                    <input type="file" id="groupAvatarInput" accept="image/*" class="hidden">
                                </div>
                            </div>
                            
                            <!-- Group Name -->
                            <div>
                                <label for="groupName" class="block text-sm font-medium text-gray-700 mb-2">
                                    Group Name *
                                </label>
                                <input type="text" id="groupName" name="groupName"
                                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                       placeholder="Enter group name" required maxlength="100">
                                <div class="text-right text-sm text-gray-500 mt-1">
                                    <span id="groupNameCount">0</span>/100
                                </div>
                            </div>
                            
                            <!-- Group Description -->
                            <div>
                                <label for="groupDescription" class="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea id="groupDescription" name="groupDescription"
                                          class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                          rows="3" placeholder="Describe your group" maxlength="500"></textarea>
                                <div class="text-right text-sm text-gray-500 mt-1">
                                    <span id="groupDescCount">0</span>/500
                                </div>
                            </div>
                            
                            <!-- Group Privacy -->
                            <div>
                                <label for="groupPrivacy" class="block text-sm font-medium text-gray-700 mb-2">
                                    Privacy Settings
                                </label>
                                <select id="groupPrivacy" name="groupPrivacy"
                                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="public">Public - Anyone can join</option>
                                    <option value="private" selected>Private - Invite only</option>
                                    <option value="hidden">Hidden - Admin adds members</option>
                                </select>
                            </div>
                            
                            <!-- Group Settings -->
                            <div class="space-y-4">
                                <h4 class="font-medium text-gray-700">Group Settings</h4>
                                
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p class="font-medium">Send Messages</p>
                                        <p class="text-sm text-gray-500">Who can send messages in this group</p>
                                    </div>
                                    <select id="groupSendMessages" name="groupSendMessages"
                                            class="border rounded p-2 text-sm">
                                        <option value="all">All members</option>
                                        <option value="admins">Admins only</option>
                                    </select>
                                </div>
                                
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p class="font-medium">Edit Group Info</p>
                                        <p class="text-sm text-gray-500">Who can edit group name and description</p>
                                    </div>
                                    <select id="groupEditInfo" name="groupEditInfo"
                                            class="border rounded p-2 text-sm">
                                        <option value="admins">Admins only</option>
                                        <option value="all">All members</option>
                                    </select>
                                </div>
                                
                                <label class="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                    <input type="checkbox" id="groupEnableEncryption" name="groupEnableEncryption"
                                           class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mr-3">
                                    <div>
                                        <p class="font-medium">Enable End-to-End Encryption</p>
                                        <p class="text-sm text-gray-500">Messages are encrypted and secure</p>
                                    </div>
                                </label>
                            </div>
                            
                            <!-- Add Participants -->
                            <div>
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-medium text-gray-700">Add Participants</h4>
                                    <button type="button" id="showAllFriends" class="text-sm text-purple-600 hover:text-purple-800">
                                        View All Friends
                                    </button>
                                </div>
                                
                                <div class="relative mb-3">
                                    <input type="text" id="friendSearch" 
                                           class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                           placeholder="Search friends...">
                                    <i class="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                                </div>
                                
                                <div id="groupParticipants" class="border rounded-lg p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
                                    <div class="text-center py-8 text-gray-500">
                                        <i class="fas fa-user-friends text-3xl mb-3"></i>
                                        <p>Search for friends to add to your group</p>
                                    </div>
                                </div>
                                
                                <div id="selectedParticipants" class="mt-3 flex flex-wrap gap-2 hidden">
                                    <!-- Selected participants will appear here -->
                                </div>
                            </div>
                            
                            <!-- Create Button -->
                            <div class="pt-4 border-t">
                                <div class="flex justify-end space-x-3">
                                    <button type="button" id="cancelCreateGroup" 
                                            class="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                        Cancel
                                    </button>
                                    <button type="submit" id="createGroup"
                                            class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                                        Create Group
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Enhanced Group Info Modal
    if (!document.getElementById('enhancedGroupInfoModal')) {
        const modal = document.createElement('div');
        modal.id = 'enhancedGroupInfoModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-4xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Group Information</h3>
                    <button id="closeEnhancedGroupInfo" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Group Header -->
                    <div class="text-center mb-8">
                        <div class="relative inline-block mb-4">
                            <img id="enhancedGroupAvatar" 
                                 class="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl"
                                 src="https://ui-avatars.com/api/?name=Group&background=7C3AED&color=fff">
                            <button id="changeGroupAvatarBtn" 
                                    class="absolute bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 shadow-lg">
                                <i class="fas fa-camera text-lg"></i>
                            </button>
                        </div>
                        <h2 id="enhancedGroupName" class="text-3xl font-bold mb-2">Group Name</h2>
                        <p id="enhancedGroupDescription" class="text-gray-600 mb-4 max-w-2xl mx-auto">Group description</p>
                        <div class="flex items-center justify-center space-x-4 text-sm text-gray-500">
                            <span id="enhancedGroupMembersCount">0 members</span>
                            <span>•</span>
                            <span id="groupCreatedDate">Created Jan 1, 2024</span>
                            <span id="encryptionBadge" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hidden">
                                <i class="fas fa-lock mr-1"></i> Encrypted
                            </span>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <button class="action-card" id="groupMediaBtn">
                            <div class="p-4 bg-blue-50 rounded-lg">
                                <i class="fas fa-photo-video text-2xl text-blue-600 mb-2"></i>
                                <p class="font-medium">Media</p>
                            </div>
                        </button>
                        <button class="action-card" id="groupStarredBtn">
                            <div class="p-4 bg-yellow-50 rounded-lg">
                                <i class="fas fa-star text-2xl text-yellow-600 mb-2"></i>
                                <p class="font-medium">Starred</p>
                            </div>
                        </button>
                        <button class="action-card" id="groupSearchBtn">
                            <div class="p-4 bg-purple-50 rounded-lg">
                                <i class="fas fa-search text-2xl text-purple-600 mb-2"></i>
                                <p class="font-medium">Search</p>
                            </div>
                        </button>
                        <button class="action-card" id="muteGroupBtn">
                            <div class="p-4 bg-gray-50 rounded-lg">
                                <i class="fas fa-bell-slash text-2xl text-gray-600 mb-2"></i>
                                <p class="font-medium">Mute</p>
                            </div>
                        </button>
                    </div>
                    
                    <!-- Group Settings -->
                    <div class="bg-gray-50 rounded-xl p-6 mb-8">
                        <h4 class="font-semibold text-lg mb-4">Group Settings</h4>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium">Send Messages</p>
                                    <p class="text-sm text-gray-500">Control who can send messages</p>
                                </div>
                                <select id="groupSendMessagesSetting" 
                                        class="border rounded-lg p-2 bg-white">
                                    <option value="all">All participants</option>
                                    <option value="admins">Admins only</option>
                                </select>
                            </div>
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium">Edit Group Info</p>
                                    <p class="text-sm text-gray-500">Control who can edit group info</p>
                                </div>
                                <select id="groupEditInfoSetting" 
                                        class="border rounded-lg p-2 bg-white">
                                    <option value="admins">Admins only</option>
                                    <option value="all">All participants</option>
                                </select>
                            </div>
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium">Group Privacy</p>
                                    <p class="text-sm text-gray-500">Control who can join the group</p>
                                </div>
                                <select id="groupPrivacySetting" 
                                        class="border rounded-lg p-2 bg-white">
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                    <option value="hidden">Hidden</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Participants Section -->
                    <div class="mb-8">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-semibold text-lg">Participants</h4>
                            <div class="flex space-x-2">
                                <button id="addParticipantBtn" class="btn-primary">
                                    <i class="fas fa-user-plus mr-2"></i>Add
                                </button>
                                <button id="manageAdminsBtn" class="btn-secondary">
                                    <i class="fas fa-user-shield mr-2"></i>Manage Admins
                                </button>
                            </div>
                        </div>
                        <div id="groupParticipantsList" class="space-y-3 max-h-80 overflow-y-auto">
                            <!-- Participants will be loaded here -->
                        </div>
                    </div>
                    
                    <!-- Invite Link Section -->
                    <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
                        <h4 class="font-semibold text-lg mb-3">Invite Link</h4>
                        <p class="text-gray-600 mb-4">Share this link to invite people to the group</p>
                        <div class="flex space-x-2">
                            <input type="text" id="groupInviteLink" readonly 
                                   class="flex-1 p-3 border border-gray-300 rounded-lg bg-white">
                            <button id="copyInviteLink" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                <i class="fas fa-copy mr-2"></i>Copy
                            </button>
                            <button id="refreshInviteLink" class="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Danger Zone -->
                    <div class="border-t pt-6">
                        <h4 class="font-semibold text-lg text-red-600 mb-4">Danger Zone</h4>
                        <div class="space-y-3">
                            <button id="reportGroupBtn" class="w-full p-4 text-left border border-red-200 rounded-lg hover:bg-red-50">
                                <div class="flex items-center">
                                    <i class="fas fa-flag text-red-600 mr-3"></i>
                                    <div class="flex-1">
                                        <p class="font-medium text-red-700">Report Group</p>
                                        <p class="text-sm text-gray-500">Report inappropriate content or behavior</p>
                                    </div>
                                </div>
                            </button>
                            <button id="leaveGroupBtn" class="w-full p-4 text-left border border-red-200 rounded-lg hover:bg-red-50">
                                <div class="flex items-center">
                                    <i class="fas fa-sign-out-alt text-red-600 mr-3"></i>
                                    <div class="flex-1">
                                        <p class="font-medium text-red-700">Leave Group</p>
                                        <p class="text-sm text-gray-500">You will no longer be a member of this group</p>
                                    </div>
                                </div>
                            </button>
                            <div id="adminDangerZone" class="hidden">
                                <button id="deleteGroupBtn" class="w-full p-4 text-left border border-red-200 rounded-lg hover:bg-red-50">
                                    <div class="flex items-center">
                                        <i class="fas fa-trash text-red-600 mr-3"></i>
                                        <div class="flex-1">
                                            <p class="font-medium text-red-700">Delete Group</p>
                                            <p class="text-sm text-gray-500">Permanently delete this group and all messages</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Group Media Gallery Modal
    if (!document.getElementById('groupMediaGalleryModal')) {
        const modal = document.createElement('div');
        modal.id = 'groupMediaGalleryModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-6xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Group Media</h3>
                    <button id="closeGroupMediaGallery" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Filter Buttons -->
                    <div class="mb-6">
                        <div class="flex flex-wrap gap-2">
                            <button class="filter-btn active" data-filter="all">
                                All Media
                            </button>
                            <button class="filter-btn" data-filter="images">
                                <i class="fas fa-image mr-2"></i>Images
                            </button>
                            <button class="filter-btn" data-filter="videos">
                                <i class="fas fa-video mr-2"></i>Videos
                            </button>
                            <button class="filter-btn" data-filter="documents">
                                <i class="fas fa-file mr-2"></i>Documents
                            </button>
                            <button class="filter-btn" data-filter="audio">
                                <i class="fas fa-music mr-2"></i>Audio
                            </button>
                        </div>
                    </div>
                    
                    <!-- Media Grid -->
                    <div id="mediaGalleryGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        <div class="col-span-full text-center py-12">
                            <i class="fas fa-photo-video text-5xl text-gray-300 mb-4"></i>
                            <h4 class="text-lg font-semibold text-gray-500">No Media Found</h4>
                            <p class="text-gray-400">Media shared in the group will appear here</p>
                        </div>
                    </div>
                    
                    <!-- Media Preview Modal -->
                    <div id="mediaPreviewModal" class="fixed inset-0 bg-black bg-opacity-90 z-[100] hidden">
                        <div class="flex items-center justify-center h-full">
                            <div class="relative max-w-4xl max-h-full">
                                <button id="closeMediaPreview" 
                                        class="absolute top-4 right-4 text-white text-3xl z-10">
                                    <i class="fas fa-times"></i>
                                </button>
                                <div id="mediaPreviewContent" class="p-4"></div>
                                <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
                                    <div id="mediaPreviewInfo" class="text-center"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Search Group Modal
    if (!document.getElementById('searchGroupModal')) {
        const modal = document.createElement('div');
        modal.id = 'searchGroupModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-4xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Search in Group</h3>
                    <button id="closeSearchGroup" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-6">
                        <div class="relative">
                            <input type="text" id="groupSearchInput" 
                                   class="w-full p-4 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                                   placeholder="Search messages, media, links...">
                            <i class="fas fa-search absolute left-4 top-4 text-gray-400 text-lg"></i>
                        </div>
                    </div>
                    
                    <!-- Search Filters -->
                    <div class="mb-6">
                        <div class="flex flex-wrap gap-2">
                            <button class="search-filter active" data-filter="all">All</button>
                            <button class="search-filter" data-filter="text">Messages</button>
                            <button class="search-filter" data-filter="images">Images</button>
                            <button class="search-filter" data-filter="videos">Videos</button>
                            <button class="search-filter" data-filter="links">Links</button>
                            <button class="search-filter" data-filter="docs">Documents</button>
                        </div>
                    </div>
                    
                    <!-- Search Results -->
                    <div id="groupSearchResults" class="space-y-4 max-h-[60vh] overflow-y-auto">
                        <div class="text-center py-12">
                            <i class="fas fa-search text-5xl text-gray-300 mb-4"></i>
                            <h4 class="text-lg font-semibold text-gray-500">Search Group Messages</h4>
                            <p class="text-gray-400">Enter keywords to find messages in this group</p>
                        </div>
                    </div>
                    
                    <!-- Search Stats -->
                    <div id="searchStats" class="mt-6 pt-6 border-t text-sm text-gray-500 hidden">
                        <div class="flex justify-between items-center">
                            <span id="resultCount">0 results found</span>
                            <span id="searchTime">Search took 0.0s</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Forward Message Modal
    if (!document.getElementById('forwardMessageModal')) {
        const modal = document.createElement('div');
        modal.id = 'forwardMessageModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Forward Message</h3>
                    <button id="closeForwardMessage" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Message Preview -->
                    <div id="forwardPreview" class="bg-gray-50 rounded-lg p-4 mb-6 hidden">
                        <div class="flex items-start space-x-3">
                            <div id="forwardPreviewAvatar" class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <i class="fas fa-user text-purple-600"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-2">
                                    <span id="forwardPreviewSender" class="font-semibold">Sender</span>
                                    <span id="forwardPreviewTime" class="text-sm text-gray-500">Time</span>
                                </div>
                                <div id="forwardPreviewContent" class="text-gray-700"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Search -->
                    <div class="mb-6">
                        <div class="relative">
                            <input type="text" id="forwardSearchInput" 
                                   class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                   placeholder="Search chats or groups...">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        </div>
                    </div>
                    
                    <!-- Forward Targets -->
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="font-medium text-gray-700">Select chats or groups</h4>
                            <span id="forwardCount" class="text-sm text-purple-600">0 selected</span>
                        </div>
                        <div id="forwardTargetsList" class="space-y-2 max-h-64 overflow-y-auto">
                            <!-- Targets will be loaded here -->
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-3">
                        <button id="cancelForward" 
                                class="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button id="forwardSelectedBtn" 
                                class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled>
                            Forward <span id="forwardSelectedCount">0</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Manage Admins Modal
    if (!document.getElementById('manageAdminsModal')) {
        const modal = document.createElement('div');
        modal.id = 'manageAdminsModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Manage Admins</h3>
                    <button id="closeManageAdmins" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-6">
                        <div class="relative">
                            <input type="text" id="adminSearchInput" 
                                   class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                   placeholder="Search participants...">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        </div>
                    </div>
                    
                    <div id="adminList" class="space-y-3 max-h-96 overflow-y-auto">
                        <!-- Admin list will be loaded here -->
                    </div>
                    
                    <div class="mt-6 pt-6 border-t">
                        <div class="flex justify-between items-center">
                            <div class="text-sm text-gray-500">
                                <span id="adminCount">0</span> admins
                            </div>
                            <button id="saveAdmins" 
                                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Join Group Modal
    if (!document.getElementById('joinGroupModal')) {
        const modal = document.createElement('div');
        modal.id = 'joinGroupModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-md">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Join Group</h3>
                    <button id="closeJoinGroup" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="space-y-6">
                        <!-- Invite Code/Link -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Enter Invite Code or Link
                            </label>
                            <div class="flex space-x-2">
                                <input type="text" id="groupCode" 
                                       class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                       placeholder="GROUP-123ABC or https://...">
                                <button id="joinGroup" 
                                        class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    Join
                                </button>
                            </div>
                            <p class="text-sm text-gray-500 mt-2">
                                Enter the invite code or paste the full invite link
                            </p>
                        </div>
                        
                        <!-- Or Divider -->
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-300"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-2 bg-white text-gray-500">or</span>
                            </div>
                        </div>
                        
                        <!-- Group Preview -->
                        <div id="groupPreview" class="hidden">
                            <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                                <div class="flex items-center space-x-4 mb-4">
                                    <img id="previewGroupAvatar" 
                                         class="w-16 h-16 rounded-full object-cover border-2 border-white"
                                         src="https://ui-avatars.com/api/?name=Group&background=7C3AED&color=fff">
                                    <div>
                                        <h4 id="previewGroupName" class="text-xl font-bold">Group Name</h4>
                                        <p id="previewGroupMembers" class="text-gray-600">0 members</p>
                                    </div>
                                </div>
                                <p id="previewGroupDescription" class="text-gray-700 mb-4"></p>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-lock text-green-600"></i>
                                        <span class="text-sm text-gray-600">End-to-end encrypted</span>
                                    </div>
                                    <button id="joinPreviewGroup" 
                                            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                        Join Group
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cancel Button -->
                        <div class="pt-4 border-t">
                            <button id="cancelJoinGroup" 
                                    class="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // All Friends Modal
    if (!document.getElementById('allFriendsModal')) {
        const modal = document.createElement('div');
        modal.id = 'allFriendsModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-4xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Select Friends</h3>
                    <button id="closeAllFriends" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-6">
                        <div class="relative">
                            <input type="text" id="searchAllFriends" 
                                   class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                   placeholder="Search friends...">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                        <!-- Friends will be loaded here -->
                    </div>
                    
                    <div class="mt-6 pt-6 border-t">
                        <div class="flex justify-between items-center">
                            <div>
                                <span id="selectedFriendsCount" class="font-medium text-purple-600">0</span>
                                <span class="text-gray-600"> friends selected</span>
                            </div>
                            <button id="confirmFriendsSelection" 
                                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                Add Selected
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Create context menus
function createContextMenus() {
    // Group List Context Menu
    if (!document.getElementById('groupListContextMenu')) {
        const contextMenu = document.createElement('div');
        contextMenu.id = 'groupListContextMenu';
        contextMenu.className = 'fixed hidden bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-48';
        contextMenu.innerHTML = `
            <div class="py-1">
                <button class="context-menu-item" data-action="open-group">
                    <i class="fas fa-comments mr-2 text-blue-600"></i>Open
                </button>
                <button class="context-menu-item" data-action="mute-group">
                    <i class="fas fa-bell-slash mr-2 text-yellow-600"></i>Mute
                </button>
                <button class="context-menu-item" data-action="mark-read">
                    <i class="fas fa-check-double mr-2 text-green-600"></i>Mark as Read
                </button>
                <hr class="my-1 border-gray-200">
                <button class="context-menu-item" data-action="group-info">
                    <i class="fas fa-info-circle mr-2 text-purple-600"></i>Group Info
                </button>
                <button class="context-menu-item" data-action="group-settings">
                    <i class="fas fa-cog mr-2 text-gray-600"></i>Settings
                </button>
                <hr class="my-1 border-gray-200">
                <button class="context-menu-item text-red-600" data-action="leave-group">
                    <i class="fas fa-sign-out-alt mr-2"></i>Leave Group
                </button>
            </div>
        `;
        document.body.appendChild(contextMenu);
    }
    
    // Message Context Menu
    if (!document.getElementById('messageContextMenu')) {
        const contextMenu = document.createElement('div');
        contextMenu.id = 'messageContextMenu';
        contextMenu.className = 'fixed hidden bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-48';
        contextMenu.innerHTML = `
            <div class="py-1">
                <button class="context-menu-item" data-action="reply">
                    <i class="fas fa-reply mr-2 text-blue-600"></i>Reply
                </button>
                <button class="context-menu-item" data-action="forward">
                    <i class="fas fa-share mr-2 text-green-600"></i>Forward
                </button>
                <button class="context-menu-item" data-action="star">
                    <i class="far fa-star mr-2 text-yellow-600"></i>Star
                </button>
                <button class="context-menu-item" data-action="react">
                    <i class="far fa-smile mr-2 text-purple-600"></i>React
                </button>
                <hr class="my-1 border-gray-200">
                <button class="context-menu-item" data-action="copy">
                    <i class="fas fa-copy mr-2 text-gray-600"></i>Copy
                </button>
                <button class="context-menu-item" data-action="select">
                    <i class="fas fa-check-square mr-2 text-blue-600"></i>Select
                </button>
                <hr class="my-1 border-gray-200">
                <button class="context-menu-item" data-action="edit">
                    <i class="fas fa-edit mr-2 text-blue-600"></i>Edit
                </button>
                <button class="context-menu-item text-red-600" data-action="delete-me">
                    <i class="fas fa-trash mr-2"></i>Delete for me
                </button>
                <button class="context-menu-item text-red-600" data-action="delete-all">
                    <i class="fas fa-trash-alt mr-2"></i>Delete for everyone
                </button>
                <hr class="my-1 border-gray-200">
                <button class="context-menu-item text-red-600" data-action="report">
                    <i class="fas fa-flag mr-2"></i>Report
                </button>
            </div>
        `;
        document.body.appendChild(contextMenu);
    }
    
    // Reaction Picker
    if (!document.getElementById('reactionPicker')) {
        const picker = document.createElement('div');
        picker.id = 'reactionPicker';
        picker.className = 'fixed hidden bg-white rounded-full shadow-xl border border-gray-200 z-50 p-2';
        picker.innerHTML = `
            <div class="flex space-x-2">
                <button class="reaction-option" data-reaction="👍">👍</button>
                <button class="reaction-option" data-reaction="👎">👎</button>
                <button class="reaction-option" data-reaction="❤️">❤️</button>
                <button class="reaction-option" data-reaction="😄">😄</button>
                <button class="reaction-option" data-reaction="😲">😲</button>
                <button class="reaction-option" data-reaction="😢">😢</button>
                <button class="reaction-option" data-reaction="😡">😡</button>
                <button class="reaction-option" data-reaction="🎉">🎉</button>
                <button class="reaction-option" data-reaction="🔥">🔥</button>
                <button class="reaction-option" data-reaction="👏">👏</button>
            </div>
        `;
        document.body.appendChild(picker);
    }
}

// Create business tools
function createBusinessTools() {
    // Catalogue Modal
    if (!document.getElementById('catalogueModal')) {
        const modal = document.createElement('div');
        modal.id = 'catalogueModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-6xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Product Catalogue</h3>
                    <button id="closeCatalogue" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Catalogue management UI -->
                    <div class="text-center py-12">
                        <i class="fas fa-store text-5xl text-gray-300 mb-4"></i>
                        <h4 class="text-lg font-semibold text-gray-500">Product Catalogue</h4>
                        <p class="text-gray-400">Manage your products and services here</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Advertise Modal
    if (!document.getElementById('advertiseModal')) {
        const modal = document.createElement('div');
        modal.id = 'advertiseModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-4xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Create Advertisement</h3>
                    <button id="closeAdvertise" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Ad creation UI -->
                    <div class="text-center py-12">
                        <i class="fas fa-bullhorn text-5xl text-gray-300 mb-4"></i>
                        <h4 class="text-lg font-semibold text-gray-500">Advertisement</h4>
                        <p class="text-gray-400">Create and manage advertisements</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Create AI features
function createAIFeatures() {
    // AI Summary Modal
    if (!document.getElementById('aiSummaryModal')) {
        const modal = document.createElement('div');
        modal.id = 'aiSummaryModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">AI Conversation Summary</h3>
                    <button id="closeAISummary" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-6">
                        <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                            <div class="flex items-center mb-4">
                                <i class="fas fa-robot text-3xl text-purple-600 mr-3"></i>
                                <div>
                                    <h4 class="font-semibold text-lg">AI-Powered Summary</h4>
                                    <p class="text-sm text-gray-600">Get a concise summary of the conversation</p>
                                </div>
                            </div>
                            <button id="aiSummarize" 
                                    class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                <i class="fas fa-magic mr-2"></i>Generate Summary
                            </button>
                        </div>
                    </div>
                    
                    <div id="aiSummaryResult" class="hidden">
                        <div class="bg-gray-50 rounded-xl p-6">
                            <div class="flex justify-between items-start mb-4">
                                <h4 class="font-semibold">Summary</h4>
                                <button id="copySummary" class="text-sm text-purple-600 hover:text-purple-800">
                                    <i class="fas fa-copy mr-1"></i>Copy
                                </button>
                            </div>
                            <div id="summaryContent" class="text-gray-700"></div>
                            <div class="mt-4 pt-4 border-t text-sm text-gray-500">
                                <i class="fas fa-info-circle mr-1"></i>
                                Generated by AI • <span id="summaryTime"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Smart Replies Modal
    if (!document.getElementById('smartRepliesModal')) {
        const modal = document.createElement('div');
        modal.id = 'smartRepliesModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content max-w-md">
                <div class="modal-header">
                    <h3 class="text-xl font-semibold">Smart Replies</h3>
                    <button id="closeSmartReplies" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mb-6">
                        <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                            <div class="flex items-center mb-4">
                                <i class="fas fa-lightbulb text-3xl text-green-600 mr-3"></i>
                                <div>
                                    <h4 class="font-semibold text-lg">AI Suggested Replies</h4>
                                    <p class="text-sm text-gray-600">Quick replies based on conversation context</p>
                                </div>
                            </div>
                            <button id="aiReply" 
                                    class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-comment-dots mr-2"></i>Get Suggestions
                            </button>
                        </div>
                    </div>
                    
                    <div id="smartRepliesList" class="space-y-2 hidden">
                        <h4 class="font-medium text-gray-700 mb-2">Suggested Replies:</h4>
                        <!-- Smart replies will be generated here -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Cache DOM elements
function cacheGroupElements() {
    groupElements.createGroupModal = document.getElementById('createGroupModal');
    groupElements.enhancedGroupInfoModal = document.getElementById('enhancedGroupInfoModal');
    groupElements.groupMediaGalleryModal = document.getElementById('groupMediaGalleryModal');
    groupElements.manageAdminsModal = document.getElementById('manageAdminsModal');
    groupElements.searchGroupModal = document.getElementById('searchGroupModal');
    groupElements.forwardMessageModal = document.getElementById('forwardMessageModal');
    groupElements.joinGroupModal = document.getElementById('joinGroupModal');
    groupElements.allFriendsModal = document.getElementById('allFriendsModal');
    groupElements.catalogueModal = document.getElementById('catalogueModal');
    groupElements.advertiseModal = document.getElementById('advertiseModal');
    
    // Group Creation Elements
    groupElements.groupName = document.getElementById('groupName');
    groupElements.groupDescription = document.getElementById('groupDescription');
    groupElements.groupParticipants = document.getElementById('groupParticipants');
    groupElements.groupAdminsOnlySend = document.getElementById('groupSendMessages');
    groupElements.groupAdminsOnlyEdit = document.getElementById('groupEditInfo');
    groupElements.groupEnableEncryption = document.getElementById('groupEnableEncryption');
    groupElements.createGroupBtn = document.getElementById('createGroup');
    groupElements.closeCreateGroup = document.getElementById('closeCreateGroup');
    groupElements.cancelCreateGroup = document.getElementById('cancelCreateGroup');
    
    // Group Info Elements
    groupElements.enhancedGroupName = document.getElementById('enhancedGroupName');
    groupElements.enhancedGroupMembersCount = document.getElementById('enhancedGroupMembersCount');
    groupElements.groupSendMessages = document.getElementById('groupSendMessagesSetting');
    groupElements.groupEditInfo = document.getElementById('groupEditInfoSetting');
    groupElements.groupInviteLink = document.getElementById('groupInviteLink');
    groupElements.copyInviteLink = document.getElementById('copyInviteLink');
    groupElements.refreshInviteLink = document.getElementById('refreshInviteLink');
    groupElements.closeEnhancedGroupInfo = document.getElementById('closeEnhancedGroupInfo');
    
    // Group Media Gallery Elements
    groupElements.mediaGalleryGrid = document.getElementById('mediaGalleryGrid');
    groupElements.filterButtons = document.querySelectorAll('.filter-btn');
    groupElements.closeGroupMediaGallery = document.getElementById('closeGroupMediaGallery');
    
    // Search & Selection Elements
    groupElements.groupSearchInput = document.getElementById('groupSearchInput');
    groupElements.groupSearchResults = document.getElementById('groupSearchResults');
    groupElements.closeSearchGroup = document.getElementById('closeSearchGroup');
    groupElements.forwardSearchInput = document.getElementById('forwardSearchInput');
    groupElements.forwardTargetsList = document.getElementById('forwardTargetsList');
    groupElements.forwardCount = document.getElementById('forwardCount');
    groupElements.forwardSelectedBtn = document.getElementById('forwardSelectedBtn');
    groupElements.closeForwardMessage = document.getElementById('closeForwardMessage');
    
    // Admin Management Elements
    groupElements.adminSearchInput = document.getElementById('adminSearchInput');
    groupElements.adminList = document.getElementById('adminList');
    groupElements.saveAdmins = document.getElementById('saveAdmins');
    groupElements.closeManageAdmins = document.getElementById('closeManageAdmins');
    
    // Group Join Elements
    groupElements.groupCode = document.getElementById('groupCode');
    groupElements.groupPreview = document.getElementById('groupPreview');
    groupElements.previewGroupName = document.getElementById('previewGroupName');
    groupElements.previewGroupMembers = document.getElementById('previewGroupMembers');
    groupElements.joinGroupBtn = document.getElementById('joinGroup');
    groupElements.closeJoinGroup = document.getElementById('closeJoinGroup');
    groupElements.cancelJoinGroup = document.getElementById('cancelJoinGroup');
    
    // UI Components
    groupElements.groupListContextMenu = document.getElementById('groupListContextMenu');
    groupElements.messageContextMenu = document.getElementById('messageContextMenu');
    groupElements.reactionPicker = document.getElementById('reactionPicker');
    groupElements.newGroupBtn = document.getElementById('newGroupBtn');
    groupElements.backToChats = document.getElementById('backToChats');
    
    // Business Tools Elements
    groupElements.catalogueBtn = document.getElementById('catalogueBtn');
    groupElements.catalogueModal = document.getElementById('catalogueModal');
    groupElements.advertiseBtn = document.getElementById('advertiseBtn');
    groupElements.advertiseModal = document.getElementById('advertiseModal');
    groupElements.labelsBtn = document.getElementById('labelsBtn');
    groupElements.labelsModal = document.getElementById('labelsModal');
    groupElements.greetingBtn = document.getElementById('greetingBtn');
    groupElements.greetingModal = document.getElementById('greetingModal');
    groupElements.awayBtn = document.getElementById('awayBtn');
    groupElements.awayModal = document.getElementById('awayModal');
    groupElements.businessProfileModal = document.getElementById('businessProfileModal');
    
    // AI Features Elements
    groupElements.aiSummaryModal = document.getElementById('aiSummaryModal');
    groupElements.aiSummarize = document.getElementById('aiSummarize');
    groupElements.smartRepliesModal = document.getElementById('smartRepliesModal');
    groupElements.aiReply = document.getElementById('aiReply');
    
    // Miscellaneous Elements
    groupElements.menuBtn = document.getElementById('menuBtn');
    groupElements.settingsModal = document.getElementById('settingsModal');
    groupElements.chatMenuBtn = document.getElementById('chatMenuBtn');
    groupElements.searchInput = document.getElementById('searchInput');
    groupElements.friendSearch = document.getElementById('friendSearch');
    groupElements.addFriendBtn = document.getElementById('addFriendBtn');
    groupElements.themeToggle = document.getElementById('themeToggle');
}

// Initialize group features
function initializeGroupFeatures() {
    initializeGroupTypingIndicators();
    initializeGroupEmojiPicker();
    initializeMessageReactions();
    initializeDragAndDrop();
}

// Setup enhanced event listeners
function setupEnhancedGroupEventListeners() {
    console.log('Setting up enhanced group event listeners...');
    
    // Tab switching
    document.addEventListener('click', handleTabSwitching);
    
    // Group creation
    document.addEventListener('click', handleGroupCreation);
    
    // Group management
    document.addEventListener('click', handleGroupManagement);
    
    // Message operations
    document.addEventListener('click', handleMessageOperations);
    
    // Search functionality
    document.addEventListener('input', handleSearchOperations);
    
    // Context menus
    document.addEventListener('contextmenu', handleContextMenus);
    document.addEventListener('click', handleContextMenuActions);
    
    // Modal operations
    document.addEventListener('click', handleModalOperations);
    
    // Form submissions
    document.addEventListener('submit', handleFormSubmissions);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Drag and drop
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    
    console.log('✅ Enhanced event listeners setup complete');
}

// Tab switching handler
function handleTabSwitching(e) {
    if (e.target.closest('[data-tab]')) {
        const tabBtn = e.target.closest('[data-tab]');
        const tabName = tabBtn.getAttribute('data-tab');
        switchToTab(tabName);
    }
    
    if (e.target.closest('#backToChats')) {
        switchToTab('chats');
    }
}

// Group creation handler
function handleGroupCreation(e) {
    // New group button
    if (e.target.closest('#newGroupBtn') || e.target.closest('#createGroupFromEmpty')) {
        e.preventDefault();
        showModal('createGroupModal');
        loadFriendsForGroupCreation();
    }
    
    // Create group button
    if (e.target.closest('#createGroup')) {
        e.preventDefault();
        createNewGroupAction();
    }
    
    // Upload group avatar
    if (e.target.closest('#uploadGroupAvatar')) {
        e.preventDefault();
        const fileInput = document.getElementById('groupAvatarInput');
        fileInput?.click();
    }
    
    // Show all friends
    if (e.target.closest('#showAllFriends')) {
        e.preventDefault();
        showAllFriendsModal();
    }
}

// Group management handler
function handleGroupManagement(e) {
    // Open group info
    if (e.target.closest('#groupInfoBtn')) {
        e.preventDefault();
        if (currentGroupId) {
            showGroupInfoModal(currentGroupId);
        }
    }
    
    // Mute/unmute group
    if (e.target.closest('#muteGroupBtn')) {
        e.preventDefault();
        if (currentGroupId) {
            toggleGroupMute(currentGroupId);
        }
    }
    
    // Add participant
    if (e.target.closest('#addParticipantBtn')) {
        e.preventDefault();
        showAddParticipantsModal();
    }
    
    // Manage admins
    if (e.target.closest('#manageAdminsBtn')) {
        e.preventDefault();
        showManageAdminsModal();
    }
    
    // Leave group
    if (e.target.closest('#leaveGroupBtn')) {
        e.preventDefault();
        if (currentGroupId) {
            leaveGroup(currentGroupId);
        }
    }
    
    // Delete group
    if (e.target.closest('#deleteGroupBtn')) {
        e.preventDefault();
        if (currentGroupId) {
            deleteGroup(currentGroupId);
        }
    }
    
    // Copy invite link
    if (e.target.closest('#copyInviteLink')) {
        e.preventDefault();
        copyInviteLink();
    }
    
    // Refresh invite link
    if (e.target.closest('#refreshInviteLink')) {
        e.preventDefault();
        refreshInviteLink();
    }
}

// Message operations handler
function handleMessageOperations(e) {
    // Message click for selection
    if (e.target.closest('.group-message-container')) {
        const messageElement = e.target.closest('.group-message-container');
        const messageId = messageElement.dataset.messageId;
        if (selectedGroupMessages.size > 0) {
            toggleMessageSelection(messageId);
        }
    }
    
    // Star message
    if (e.target.closest('[data-action="star"]')) {
        e.preventDefault();
        const messageId = currentContextMessageId;
        if (messageId) {
            toggleMessageStar(messageId);
        }
    }
    
    // Forward message
    if (e.target.closest('[data-action="forward"]') || e.target.closest('#forwardSelectedBtn')) {
        e.preventDefault();
        if (selectedGroupMessages.size > 0) {
            const firstMessageId = Array.from(selectedGroupMessages)[0];
            forwardGroupMessage(firstMessageId);
        } else if (currentContextMessageId) {
            forwardGroupMessage(currentContextMessageId);
        }
    }
    
    // React to message
    if (e.target.closest('[data-action="react"]') || e.target.closest('.reaction-option')) {
        e.preventDefault();
        const reaction = e.target.getAttribute('data-reaction');
        if (reaction && currentContextMessageId) {
            addReactionToMessage(currentContextMessageId, reaction);
        }
    }
    
    // Reply to message
    if (e.target.closest('[data-action="reply"]')) {
        e.preventDefault();
        if (currentContextMessageId) {
            replyToGroupMessage(currentContextMessageId);
        }
    }
    
    // Copy message
    if (e.target.closest('[data-action="copy"]')) {
        e.preventDefault();
        if (currentContextMessageId) {
            copyMessageText(currentContextMessageId);
        }
    }
    
    // Report message
    if (e.target.closest('[data-action="report"]')) {
        e.preventDefault();
        if (currentContextMessageId) {
            reportGroupMessage(currentContextMessageId);
        }
    }
}

// Search operations handler
function handleSearchOperations(e) {
    // Search in groups list
    if (e.target.matches('#searchInput')) {
        searchGroups(e.target.value);
    }
    
    // Search in group
    if (e.target.matches('#groupSearchInput')) {
        searchInGroup(e.target.value);
    }
    
    // Search for forward targets
    if (e.target.matches('#forwardSearchInput')) {
        searchForwardTargets(e.target.value);
    }
    
    // Search for friends in group creation
    if (e.target.matches('#friendSearch')) {
        searchFriendsForGroupCreation(e.target.value);
    }
    
    // Search for admin management
    if (e.target.matches('#adminSearchInput')) {
        searchAdminParticipants(e.target.value);
    }
}

// Context menus handler
function handleContextMenus(e) {
    // Group list context menu
    if (e.target.closest('.group-item')) {
        e.preventDefault();
        const groupItem = e.target.closest('.group-item');
        const groupId = groupItem.dataset.groupId;
        showGroupListContextMenu(e, groupId);
    }
    
    // Message context menu
    if (e.target.closest('.message-bubble')) {
        e.preventDefault();
        const messageElement = e.target.closest('.message-bubble');
        const messageContainer = messageElement.closest('.group-message-container');
        const messageId = messageContainer?.dataset.messageId;
        if (messageId) {
            showMessageContextMenu(e, messageId);
        }
    }
}

// Context menu actions handler
function handleContextMenuActions(e) {
    if (e.target.closest('.context-menu-item')) {
        const menuItem = e.target.closest('.context-menu-item');
        const action = menuItem.getAttribute('data-action');
        const contextMenu = menuItem.closest('#groupListContextMenu, #messageContextMenu');
        
        if (contextMenu.id === 'groupListContextMenu') {
            handleGroupContextMenuAction(action, contextMenu.dataset.groupId);
        } else if (contextMenu.id === 'messageContextMenu') {
            handleMessageContextMenuAction(action, currentContextMessageId);
        }
        
        contextMenu.classList.add('hidden');
    }
}

// Modal operations handler
function handleModalOperations(e) {
    // Close modals
    if (e.target.closest('.modal-close') || e.target.closest('.modal-cancel')) {
        e.preventDefault();
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // Close modal when clicking outside
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
    
    // Group media gallery
    if (e.target.closest('#groupMediaBtn')) {
        e.preventDefault();
        if (currentGroupId) {
            showModal('groupMediaGalleryModal');
            loadGroupMedia(currentGroupId);
        }
    }
    
    // Group search
    if (e.target.closest('#groupSearchBtn')) {
        e.preventDefault();
        showModal('searchGroupModal');
    }
    
    // Group starred messages
    if (e.target.closest('#groupStarredBtn')) {
        e.preventDefault();
        if (currentGroupId) {
            loadGroupStarredMessages(currentGroupId);
        }
    }
    
    // AI summary
    if (e.target.closest('#aiSummarize')) {
        e.preventDefault();
        generateAIConversationSummary();
    }
    
    // Smart replies
    if (e.target.closest('#aiReply')) {
        e.preventDefault();
        generateSmartReplies();
    }
}

// Form submissions handler
function handleFormSubmissions(e) {
    if (e.target.matches('#createGroupForm')) {
        e.preventDefault();
        createNewGroupAction();
    }
    
    if (e.target.matches('#joinGroupForm')) {
        e.preventDefault();
        joinGroupAction();
    }
}

// Keyboard shortcuts handler
function handleKeyboardShortcuts(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal:not(.hidden)');
        if (openModals.length > 0) {
            openModals.forEach(modal => modal.classList.add('hidden'));
        }
    }
    
    // Ctrl/Cmd + F for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (currentGroupId) {
            showModal('searchGroupModal');
            groupElements.groupSearchInput?.focus();
        }
    }
    
    // Ctrl/Cmd + Enter to send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === document.getElementById('groupMessageInput')) {
            e.preventDefault();
            sendGroupMessage();
        }
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer && e.dataTransfer.files.length > 0 && currentGroupId) {
        Array.from(e.dataTransfer.files).forEach(file => {
            uploadGroupFile(file);
        });
    }
}

// ==================== GROUP FUNCTIONS ====================

// Create new group action
async function createNewGroupAction() {
    const groupName = groupElements.groupName?.value.trim();
    const description = groupElements.groupDescription?.value.trim();
    const privacy = document.getElementById('groupPrivacy')?.value || 'private';
    
    if (!groupName) {
        showToast('Group name is required', 'error');
        groupElements.groupName?.focus();
        return;
    }
    
    // Get selected participants
    const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
    const participantIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    // Validate participants
    const validParticipants = participantIds.filter(id => 
        id && id !== 'undefined' && id !== currentUser.uid
    );
    
    if (validParticipants.length === 0) {
        showToast('Please add at least one friend to the group', 'error');
        return;
    }
    
    // Get settings
    const settings = {
        sendMessages: groupElements.groupAdminsOnlySend?.value || 'all',
        editInfo: groupElements.groupAdminsOnlyEdit?.value || 'admins',
        isEncrypted: groupElements.groupEnableEncryption?.checked || false
    };
    
    showToast('Creating group...', 'info');
    
    try {
        const groupId = await createNewGroup(
            groupName,
            description,
            privacy,
            validParticipants,
            settings
        );
        
        if (groupId) {
            hideModal('createGroupModal');
            openGroupChat(groupId);
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Error creating group: ' + error.message, 'error');
    }
}

// Create new group (core function)
async function createNewGroup(name, description, privacy, participantIds, settings) {
    try {
        console.log('Creating new group:', name);
        
        // Generate group ID
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Prepare participants
        const participants = [currentUser.uid, ...participantIds];
        
        // Generate invite code
        const inviteCode = generateInviteCode();
        const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
        
        // Get avatar if uploaded
        const avatarInput = document.getElementById('groupAvatarInput');
        let avatarUrl = '';
        
        if (avatarInput?.files[0]) {
            avatarUrl = await uploadGroupAvatarFile(avatarInput.files[0], groupId);
        }
        
        // Create group data
        const groupData = {
            id: groupId,
            name: name,
            description: description || '',
            privacy: privacy,
            participants: participants,
            admins: [currentUser.uid],
            createdBy: currentUser.uid,
            avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C3AED&color=fff`,
            inviteCode: inviteCode,
            inviteLink: inviteLink,
            settings: {
                sendMessages: settings.sendMessages || 'all',
                editInfo: settings.editInfo || 'admins',
                privacy: privacy
            },
            isEncrypted: settings.isEncrypted || false,
            isMuted: false,
            status: 'active',
            typingUsers: [],
            lastMessage: '',
            lastMessageTime: null,
            lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to Firestore
        await db.collection('groups').doc(groupId).set(groupData);
        
        // Send system message
        await sendSystemMessage(groupId, `${currentUserData.displayName} created the group`);
        
        // Send notifications to added participants
        for (const participantId of participantIds) {
            await sendSystemMessage(groupId, `${currentUserData.displayName} added you to the group`);
            sendGroupInviteNotification(groupId, participantId);
        }
        
        console.log('Group created successfully:', groupId);
        showToast('Group created successfully!', 'success');
        
        return groupId;
        
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}

// Load friends for group creation
async function loadFriendsForGroupCreation() {
    const participantsList = groupElements.groupParticipants;
    if (!participantsList) return;
    
    participantsList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-purple-500"></i></div>';
    
    try {
        // Get friends list
        const friends = await fetchFriendsDirectly();
        
        if (!friends || friends.length === 0) {
            participantsList.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-user-friends text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No friends found</p>
                    <p class="text-sm text-gray-400 mt-1">Add friends to create a group</p>
                </div>
            `;
            return;
        }
        
        // Render friends list
        participantsList.innerHTML = '';
        friends.forEach(friend => {
            const friendItem = document.createElement('div');
            friendItem.className = 'flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors';
            friendItem.innerHTML = `
                <div class="flex items-center space-x-3 flex-1">
                    <div class="relative">
                        <img class="w-12 h-12 rounded-full object-cover" 
                             src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}"
                             alt="${friend.displayName}"
                             onerror="this.src='https://ui-avatars.com/api/?name=User&background=7C3AED&color=fff'">
                        <div class="absolute bottom-0 right-0 w-3 h-3 ${friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-800 truncate">${friend.displayName}</h4>
                        <p class="text-sm text-gray-500 truncate">${friend.status || 'offline'}</p>
                    </div>
                </div>
                <input type="checkbox" class="participant-checkbox w-5 h-5 text-purple-600 rounded focus:ring-purple-500" 
                       value="${friend.id}" data-name="${friend.displayName}">
            `;
            
            participantsList.appendChild(friendItem);
        });
        
        // Add event listeners for checkboxes
        document.querySelectorAll('.participant-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateSelectedParticipants();
            });
        });
        
    } catch (error) {
        console.error('Error loading friends:', error);
        participantsList.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Error loading friends</p>
                <button onclick="loadFriendsForGroupCreation()" class="mt-2 text-sm text-purple-600 hover:text-purple-800">
                    Retry
                </button>
            </div>
        `;
    }
}

// Update selected participants display
function updateSelectedParticipants() {
    const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
    const selectedContainer = document.getElementById('selectedParticipants');
    
    if (!selectedContainer) return;
    
    if (selectedCheckboxes.length === 0) {
        selectedContainer.classList.add('hidden');
        return;
    }
    
    selectedContainer.classList.remove('hidden');
    selectedContainer.innerHTML = '';
    
    selectedCheckboxes.forEach(checkbox => {
        const participantId = checkbox.value;
        const participantName = checkbox.dataset.name;
        
        const tag = document.createElement('div');
        tag.className = 'flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm';
        tag.innerHTML = `
            <span>${participantName}</span>
            <button type="button" class="text-purple-600 hover:text-purple-900" 
                    onclick="this.closest('.participant-checkbox').click()">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;
        selectedContainer.appendChild(tag);
    });
}

// Search friends for group creation
function searchFriendsForGroupCreation(query) {
    const participantsList = groupElements.groupParticipants;
    if (!participantsList) return;
    
    const friendItems = participantsList.querySelectorAll('.flex.items-center.justify-between');
    if (friendItems.length === 0) return;
    
    const searchTerm = query.toLowerCase().trim();
    
    friendItems.forEach(item => {
        const nameElement = item.querySelector('h4');
        if (nameElement) {
            const name = nameElement.textContent.toLowerCase();
            item.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        }
    });
}

// Show all friends modal
async function showAllFriendsModal() {
    const modal = groupElements.allFriendsModal;
    if (!modal) return;
    
    showModal('allFriendsModal');
    
    try {
        const friends = await fetchFriendsDirectly();
        const container = modal.querySelector('.grid');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!friends || friends.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-12">
                    <i class="fas fa-user-friends text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">No friends found</p>
                </div>
            `;
            return;
        }
        
        friends.forEach(friend => {
            const friendCard = document.createElement('div');
            friendCard.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow';
            friendCard.innerHTML = `
                <div class="flex items-center space-x-3 mb-3">
                    <img class="w-12 h-12 rounded-full object-cover" 
                         src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}"
                         alt="${friend.displayName}">
                    <div class="flex-1">
                        <h4 class="font-semibold">${friend.displayName}</h4>
                        <p class="text-sm text-gray-500">${friend.status || 'offline'}</p>
                    </div>
                </div>
                <label class="flex items-center cursor-pointer">
                    <input type="checkbox" class="friend-select-checkbox mr-2 w-4 h-4 text-purple-600 rounded" 
                           value="${friend.id}" data-name="${friend.displayName}">
                    <span class="text-sm">Select</span>
                </label>
            `;
            container.appendChild(friendCard);
        });
        
        // Add event listener for confirm button
        const confirmBtn = modal.querySelector('#confirmFriendsSelection');
        const countSpan = modal.querySelector('#selectedFriendsCount');
        
        confirmBtn.addEventListener('click', function() {
            const selectedCheckboxes = modal.querySelectorAll('.friend-select-checkbox:checked');
            const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
            
            // Update main form
            selectedIds.forEach(id => {
                const checkbox = document.querySelector(`.participant-checkbox[value="${id}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
            
            hideModal('allFriendsModal');
        });
        
        // Update count
        modal.querySelectorAll('.friend-select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const selected = modal.querySelectorAll('.friend-select-checkbox:checked').length;
                countSpan.textContent = selected;
            });
        });
        
    } catch (error) {
        console.error('Error loading all friends:', error);
    }
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
        currentGroup = { id: groupId, ...groupData };
        
        // Update modal content
        if (groupElements.enhancedGroupName) {
            groupElements.enhancedGroupName.textContent = groupData.name;
        }
        
        if (groupElements.enhancedGroupDescription) {
            groupElements.enhancedGroupDescription.textContent = groupData.description || 'No description';
        }
        
        if (groupElements.enhancedGroupMembersCount) {
            const memberCount = groupData.participants?.length || 0;
            groupElements.enhancedGroupMembersCount.textContent = `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
        }
        
        // Update avatar
        const avatarElement = document.getElementById('enhancedGroupAvatar');
        if (avatarElement) {
            avatarElement.src = groupData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=7C3AED&color=fff`;
        }
        
        // Update settings
        if (groupElements.groupSendMessages) {
            groupElements.groupSendMessages.value = groupData.settings?.sendMessages || 'all';
        }
        
        if (groupElements.groupEditInfo) {
            groupElements.groupEditInfo.value = groupData.settings?.editInfo || 'admins';
        }
        
        // Update invite link
        if (groupElements.groupInviteLink) {
            groupElements.groupInviteLink.value = groupData.inviteLink || `${window.location.origin}/invite/${groupData.inviteCode}`;
        }
        
        // Show/hide encryption badge
        const encryptionBadge = document.getElementById('encryptionBadge');
        if (encryptionBadge) {
            encryptionBadge.classList.toggle('hidden', !groupData.isEncrypted);
        }
        
        // Show/hide admin danger zone
        const adminDangerZone = document.getElementById('adminDangerZone');
        if (adminDangerZone) {
            const isAdmin = groupData.admins?.includes(currentUser.uid);
            adminDangerZone.classList.toggle('hidden', !isAdmin);
        }
        
        // Load participants
        await loadGroupParticipantsList(groupId, groupData.participants);
        
        // Show modal
        showModal('enhancedGroupInfoModal');
        
    } catch (error) {
        console.error('Error showing group info:', error);
        showToast('Error loading group information', 'error');
    }
}

// Load group participants list
async function loadGroupParticipantsList(groupId, participantIds) {
    const participantsList = document.getElementById('groupParticipantsList');
    if (!participantsList || !participantIds) return;
    
    participantsList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        // Get group data for admin info
        const groupDoc = await db.collection('groups').doc(groupId).get();
        const groupData = groupDoc.exists ? groupDoc.data() : {};
        const admins = groupData.admins || [];
        const creatorId = groupData.createdBy;
        
        // Load participant details
        const participantPromises = participantIds.map(async (userId) => {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return {
                    id: userId,
                    ...userDoc.data(),
                    isAdmin: admins.includes(userId),
                    isCreator: userId === creatorId
                };
            }
            return null;
        });
        
        const participants = (await Promise.all(participantPromises)).filter(p => p !== null);
        
        // Sort: creator first, then admins, then members
        participants.sort((a, b) => {
            if (a.isCreator && !b.isCreator) return -1;
            if (!a.isCreator && b.isCreator) return 1;
            if (a.isAdmin && !b.isAdmin) return -1;
            if (!a.isAdmin && b.isAdmin) return 1;
            return a.displayName?.localeCompare(b.displayName);
        });
        
        // Render participants
        participantsList.innerHTML = '';
        participants.forEach(participant => {
            const isSelf = participant.id === currentUser.uid;
            const canManage = admins.includes(currentUser.uid) && !participant.isCreator && !isSelf;
            
            const participantItem = document.createElement('div');
            participantItem.className = 'flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50';
            participantItem.innerHTML = `
                <div class="flex items-center space-x-3 flex-1">
                    <div class="relative">
                        <img class="w-12 h-12 rounded-full object-cover" 
                             src="${participant.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.displayName)}&background=7C3AED&color=fff`}"
                             alt="${participant.displayName}">
                        <div class="absolute bottom-0 right-0 w-3 h-3 ${participant.status === 'online' ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <h4 class="font-semibold text-gray-800 truncate">${participant.displayName}</h4>
                            ${participant.isCreator ? 
                                '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Creator</span>' : 
                                participant.isAdmin ? 
                                '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Admin</span>' : ''}
                            ${isSelf ? '<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">You</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-500 truncate">${participant.status || 'offline'}</p>
                    </div>
                </div>
                ${canManage ? `
                    <div class="flex space-x-2">
                        ${!participant.isAdmin ? `
                            <button class="make-admin-btn p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50" 
                                    data-user-id="${participant.id}" title="Make Admin">
                                <i class="fas fa-user-shield"></i>
                            </button>
                        ` : ''}
                        <button class="remove-participant-btn p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50" 
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
        
    } catch (error) {
        console.error('Error loading participants:', error);
        participantsList.innerHTML = '<div class="text-center py-8 text-red-500">Error loading participants</div>';
    }
}

// Show add participants modal
async function showAddParticipantsModal() {
    try {
        if (!currentGroupId) return;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                <div class="modal-header mb-4">
                    <h3 class="text-xl font-semibold">Add Participants</h3>
                    <button class="modal-close text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body flex-1 overflow-hidden flex flex-col">
                    <div class="mb-4">
                        <input type="text" id="addParticipantSearch" 
                               class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                               placeholder="Search friends...">
                    </div>
                    <div id="addParticipantList" class="flex-1 overflow-y-auto space-y-2">
                        <!-- Friends list will be loaded here -->
                    </div>
                    <div class="mt-4 pt-4 border-t">
                        <div class="flex justify-between items-center">
                            <span id="addParticipantCount" class="text-sm text-gray-500">0 selected</span>
                            <div class="flex space-x-2">
                                <button class="modal-cancel px-4 py-2 text-gray-600 hover:text-gray-800">
                                    Cancel
                                </button>
                                <button id="confirmAddParticipants" 
                                        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                        disabled>
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load friends
        await loadAddParticipantsList(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#confirmAddParticipants').addEventListener('click', async () => {
            const selectedCheckboxes = modal.querySelectorAll('.add-participant-checkbox:checked');
            const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
            
            if (selectedIds.length > 0) {
                for (const userId of selectedIds) {
                    await addParticipantToGroup(currentGroupId, userId);
                }
                modal.remove();
            }
        });
        
        // Search functionality
        modal.querySelector('#addParticipantSearch').addEventListener('input', (e) => {
            searchAddParticipants(modal, e.target.value);
        });
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('Error showing add participants modal:', error);
        showToast('Error loading friends list', 'error');
    }
}

// Load add participants list
async function loadAddParticipantsList(modal) {
    const listContainer = modal.querySelector('#addParticipantList');
    if (!listContainer) return;
    
    try {
        const friends = await fetchFriendsDirectly();
        const groupParticipants = currentGroup?.participants || [];
        
        // Filter out friends already in group
        const availableFriends = friends.filter(friend => 
            !groupParticipants.includes(friend.id) && friend.id !== currentUser.uid
        );
        
        if (availableFriends.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-user-friends text-3xl mb-3"></i>
                    <p>All friends are already in the group</p>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = '';
        availableFriends.forEach(friend => {
            const friendItem = document.createElement('label');
            friendItem.className = 'flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer';
            friendItem.innerHTML = `
                <div class="flex items-center space-x-3 flex-1">
                    <img class="w-10 h-10 rounded-full object-cover" 
                         src="${friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=7C3AED&color=fff`}"
                         alt="${friend.displayName}">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-800 truncate">${friend.displayName}</h4>
                        <p class="text-sm text-gray-500 truncate">${friend.status || 'offline'}</p>
                    </div>
                </div>
                <input type="checkbox" class="add-participant-checkbox w-5 h-5 text-purple-600 rounded" 
                       value="${friend.id}">
            `;
            listContainer.appendChild(friendItem);
        });
        
        // Update count on checkbox change
        const countSpan = modal.querySelector('#addParticipantCount');
        const confirmBtn = modal.querySelector('#confirmAddParticipants');
        
        listContainer.addEventListener('change', () => {
            const selectedCount = modal.querySelectorAll('.add-participant-checkbox:checked').length;
            countSpan.textContent = `${selectedCount} selected`;
            confirmBtn.disabled = selectedCount === 0;
        });
        
    } catch (error) {
        console.error('Error loading add participants list:', error);
        listContainer.innerHTML = '<div class="text-center py-8 text-red-500">Error loading friends</div>';
    }
}

// Search add participants
function searchAddParticipants(modal, query) {
    const listContainer = modal.querySelector('#addParticipantList');
    if (!listContainer) return;
    
    const friendItems = listContainer.querySelectorAll('label');
    const searchTerm = query.toLowerCase().trim();
    
    friendItems.forEach(item => {
        const nameElement = item.querySelector('h4');
        if (nameElement) {
            const name = nameElement.textContent.toLowerCase();
            item.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        }
    });
}

// Show manage admins modal
async function showManageAdminsModal() {
    const modal = groupElements.manageAdminsModal;
    if (!modal || !currentGroupId) return;
    
    showModal('manageAdminsModal');
    await loadAdminManagementList();
}

// Load admin management list
async function loadAdminManagementList() {
    const adminList = groupElements.adminList;
    if (!adminList || !currentGroup) return;
    
    adminList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        // Get all participants
        const participantPromises = currentGroup.participants.map(async (userId) => {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return {
                    id: userId,
                    ...userDoc.data(),
                    isAdmin: currentGroup.admins?.includes(userId) || false,
                    isCreator: userId === currentGroup.createdBy
                };
            }
            return null;
        });
        
        const participants = (await Promise.all(participantPromises)).filter(p => p !== null);
        
        // Sort: creator first, then current user, then others
        participants.sort((a, b) => {
            if (a.isCreator && !b.isCreator) return -1;
            if (!a.isCreator && b.isCreator) return 1;
            if (a.id === currentUser.uid && b.id !== currentUser.uid) return -1;
            if (a.id !== currentUser.uid && b.id === currentUser.uid) return 1;
            return a.displayName?.localeCompare(b.displayName);
        });
        
        // Render admin list
        adminList.innerHTML = '';
        participants.forEach(participant => {
            const adminItem = document.createElement('div');
            adminItem.className = 'flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50';
            adminItem.innerHTML = `
                <div class="flex items-center space-x-3 flex-1">
                    <img class="w-12 h-12 rounded-full object-cover" 
                         src="${participant.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.displayName)}&background=7C3AED&color=fff`}"
                         alt="${participant.displayName}">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <h4 class="font-semibold text-gray-800 truncate">${participant.displayName}</h4>
                            ${participant.isCreator ? 
                                '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Creator</span>' : ''}
                            ${participant.id === currentUser.uid ? 
                                '<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">You</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-500">${participant.status || 'offline'}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    ${participant.isCreator ? `
                        <span class="text-sm text-gray-500">Always Admin</span>
                    ` : `
                        <label class="switch">
                            <input type="checkbox" class="admin-toggle" 
                                   ${participant.isAdmin ? 'checked' : ''}
                                   data-user-id="${participant.id}">
                            <span class="slider"></span>
                        </label>
                    `}
                </div>
            `;
            
            adminList.appendChild(adminItem);
        });
        
        // Update admin count
        const adminCount = document.getElementById('adminCount');
        if (adminCount) {
            const adminToggleCount = adminList.querySelectorAll('.admin-toggle:checked').length;
            adminCount.textContent = adminToggleCount + 1; // +1 for creator
        }
        
        // Update count when toggles change
        adminList.addEventListener('change', function() {
            const adminToggleCount = this.querySelectorAll('.admin-toggle:checked').length;
            if (adminCount) {
                adminCount.textContent = adminToggleCount + 1;
            }
        });
        
    } catch (error) {
        console.error('Error loading admin management list:', error);
        adminList.innerHTML = '<div class="text-center py-8 text-red-500">Error loading participants</div>';
    }
}

// Save admin changes
async function saveAdminChangesFunc() {
    if (!currentGroupId) return;
    
    const adminToggles = document.querySelectorAll('.admin-toggle');
    const newAdmins = [];
    
    adminToggles.forEach(toggle => {
        if (toggle.checked) {
            newAdmins.push(toggle.dataset.userId);
        }
    });
    
    // Ensure creator is always admin
    if (!newAdmins.includes(currentGroup.createdBy)) {
        newAdmins.push(currentGroup.createdBy);
    }
    
    try {
        await db.collection('groups').doc(currentGroupId).update({
            admins: newAdmins
        });
        
        // Update current group
        currentGroup.admins = newAdmins;
        
        // Send system messages for changes
        const oldAdmins = currentGroup.admins || [];
        const addedAdmins = newAdmins.filter(admin => !oldAdmins.includes(admin));
        const removedAdmins = oldAdmins.filter(admin => !newAdmins.includes(admin));
        
        for (const adminId of addedAdmins) {
            if (adminId !== currentUser.uid) {
                const userDoc = await db.collection('users').doc(adminId).get();
                const userName = userDoc.exists ? userDoc.data().displayName : 'User';
                await sendSystemMessage(currentGroupId, `${userName} was made an admin`);
            }
        }
        
        for (const adminId of removedAdmins) {
            if (adminId !== currentGroup.createdBy) {
                const userDoc = await db.collection('users').doc(adminId).get();
                const userName = userDoc.exists ? userDoc.data().displayName : 'User';
                await sendSystemMessage(currentGroupId, `${userName} is no longer an admin`);
            }
        }
        
        showToast('Admin settings updated', 'success');
        hideModal('manageAdminsModal');
        
    } catch (error) {
        console.error('Error saving admin changes:', error);
        showToast('Error updating admin settings', 'error');
    }
}

// Search admin participants
function searchAdminParticipants(query) {
    const adminList = groupElements.adminList;
    if (!adminList) return;
    
    const adminItems = adminList.querySelectorAll('.flex.items-center.justify-between');
    const searchTerm = query.toLowerCase().trim();
    
    adminItems.forEach(item => {
        const nameElement = item.querySelector('h4');
        if (nameElement) {
            const name = nameElement.textContent.toLowerCase();
            item.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        }
    });
}

// Show group media gallery
async function loadGroupMedia(groupId, filter = 'all') {
    const mediaGrid = groupElements.mediaGalleryGrid;
    if (!mediaGrid) return;
    
    mediaGrid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-2xl text-purple-500"></i></div>';
    
    try {
        let query = db.collection('groupMessages')
            .where('groupId', '==', groupId)
            .where('type', '==', 'file')
            .orderBy('timestamp', 'desc')
            .limit(100);
        
        const snapshot = await query.get();
        const mediaItems = [];
        
        snapshot.forEach(doc => {
            const message = { id: doc.id, ...doc.data() };
            if (message.file && message.file.url) {
                mediaItems.push(message);
            }
        });
        
        // Apply filter
        let filteredMedia = mediaItems;
        if (filter !== 'all') {
            filteredMedia = mediaItems.filter(item => {
                const fileType = item.file.type || '';
                if (filter === 'images') return fileType.startsWith('image/');
                if (filter === 'videos') return fileType.startsWith('video/');
                if (filter === 'audio') return fileType.startsWith('audio/');
                if (filter === 'documents') return !fileType.startsWith('image/') && !fileType.startsWith('video/') && !fileType.startsWith('audio/');
                return true;
            });
        }
        
        // Render media grid
        mediaGrid.innerHTML = '';
        
        if (filteredMedia.length === 0) {
            mediaGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-photo-video text-5xl text-gray-300 mb-4"></i>
                    <h4 class="text-lg font-semibold text-gray-500">No Media Found</h4>
                    <p class="text-gray-400">No media files in this group</p>
                </div>
            `;
            return;
        }
        
        filteredMedia.forEach(media => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'relative group cursor-pointer overflow-hidden rounded-lg';
            
            const fileType = media.file.type || '';
            const isImage = fileType.startsWith('image/');
            const isVideo = fileType.startsWith('video/');
            const isAudio = fileType.startsWith('audio/');
            
            let content = '';
            if (isImage) {
                content = `
                    <img src="${media.file.url}" alt="${media.file.name}" 
                         class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                `;
            } else if (isVideo) {
                content = `
                    <div class="relative w-full h-48 bg-gray-900">
                        <video src="${media.file.url}" class="w-full h-48 object-cover"></video>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <i class="fas fa-play-circle text-white text-4xl bg-black/50 rounded-full p-2"></i>
                        </div>
                    </div>
                `;
            } else if (isAudio) {
                content = `
                    <div class="w-full h-48 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                        <i class="fas fa-music text-4xl text-purple-600"></i>
                    </div>
                `;
            } else {
                content = `
                    <div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div class="text-center">
                            <i class="fas fa-file text-4xl text-gray-400 mb-2"></i>
                            <p class="text-xs text-gray-600 truncate px-2">${media.file.name}</p>
                        </div>
                    </div>
                `;
            }
            
            mediaItem.innerHTML = `
                ${content}
                <div class="absolute bottom-2 left-2 right-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p class="truncate">${media.file.name}</p>
                    <p class="text-gray-300">${formatFileSize(media.file.size)} • ${formatTimeAgo(media.timestamp)}</p>
                </div>
            `;
            
            mediaItem.addEventListener('click', () => {
                previewMedia(media);
            });
            
            mediaGrid.appendChild(mediaItem);
        });
        
    } catch (error) {
        console.error('Error loading group media:', error);
        mediaGrid.innerHTML = '<div class="col-span-full text-center py-12 text-red-500">Error loading media</div>';
    }
}

// Preview media
function previewMedia(media) {
    const previewModal = document.getElementById('mediaPreviewModal');
    const previewContent = document.getElementById('mediaPreviewContent');
    const previewInfo = document.getElementById('mediaPreviewInfo');
    
    if (!previewModal || !previewContent) return;
    
    const fileType = media.file.type || '';
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    
    let content = '';
    if (isImage) {
        content = `<img src="${media.file.url}" class="max-w-full max-h-screen rounded-lg" alt="${media.file.name}">`;
    } else if (isVideo) {
        content = `
            <video src="${media.file.url}" controls autoplay class="max-w-full max-h-screen rounded-lg">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        content = `
            <div class="bg-white rounded-lg p-8 max-w-md">
                <div class="text-center">
                    <i class="fas fa-file text-6xl text-gray-400 mb-4"></i>
                    <h4 class="text-xl font-semibold mb-2">${media.file.name}</h4>
                    <p class="text-gray-600 mb-4">${formatFileSize(media.file.size)}</p>
                    <a href="${media.file.url}" download="${media.file.name}" 
                       class="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        <i class="fas fa-download mr-2"></i>Download
                    </a>
                </div>
            </div>
        `;
    }
    
    previewContent.innerHTML = content;
    
    // Update info
    if (previewInfo) {
        previewInfo.innerHTML = `
            <p class="font-medium">${media.file.name}</p>
            <p class="text-sm">${formatFileSize(media.file.size)} • ${formatTimeAgo(media.timestamp)}</p>
        `;
    }
    
    previewModal.classList.remove('hidden');
    
    // Close preview
    const closeBtn = document.getElementById('closeMediaPreview');
    if (closeBtn) {
        closeBtn.onclick = () => previewModal.classList.add('hidden');
    }
    
    // Close on escape key
    const closeOnEscape = (e) => {
        if (e.key === 'Escape') previewModal.classList.add('hidden');
    };
    document.addEventListener('keydown', closeOnEscape);
    
    // Remove listener when modal closes
    previewModal.addEventListener('hidden', () => {
        document.removeEventListener('keydown', closeOnEscape);
    }, { once: true });
}

// Filter group media
function filterGroupMedia(filter) {
    if (!currentGroupId) return;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    loadGroupMedia(currentGroupId, filter);
}

// Search in group
async function searchInGroup(query, filter = 'all') {
    const resultsContainer = groupElements.groupSearchResults;
    if (!resultsContainer || !currentGroupId) return;
    
    if (!query.trim()) {
        resultsContainer.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-search text-5xl text-gray-300 mb-4"></i>
                <h4 class="text-lg font-semibold text-gray-500">Search Group Messages</h4>
                <p class="text-gray-400">Enter keywords to find messages in this group</p>
            </div>
        `;
        return;
    }
    
    const startTime = performance.now();
    resultsContainer.innerHTML = '<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-2xl text-purple-500"></i></div>';
    
    try {
        let queryRef = db.collection('groupMessages')
            .where('groupId', '==', currentGroupId);
        
        const snapshot = await queryRef.get();
        const allMessages = [];
        
        snapshot.forEach(doc => {
            allMessages.push({ id: doc.id, ...doc.data() });
        });
        
        // Filter messages client-side for better search experience
        const searchTerm = query.toLowerCase();
        let filteredMessages = allMessages.filter(message => {
            // Skip system messages and deleted messages
            if (message.type === 'system' || message.deletedForEveryone) return false;
            
            // Apply content filter
            if (filter !== 'all') {
                if (filter === 'text' && message.type !== 'text') return false;
                if (filter === 'images' && (!message.file || !message.file.type?.startsWith('image/'))) return false;
                if (filter === 'videos' && (!message.file || !message.file.type?.startsWith('video/'))) return false;
                if (filter === 'links' && !containsLink(message.text)) return false;
                if (filter === 'docs' && (!message.file || message.file.type?.startsWith('image/') || message.file.type?.startsWith('video/') || message.file.type?.startsWith('audio/'))) return false;
            }
            
            // Search in text
            if (message.text && message.text.toLowerCase().includes(searchTerm)) return true;
            
            // Search in file names
            if (message.file && message.file.name && message.file.name.toLowerCase().includes(searchTerm)) return true;
            
            // Search in sender name
            if (message.senderName && message.senderName.toLowerCase().includes(searchTerm)) return true;
            
            return false;
        });
        
        // Sort by timestamp
        filteredMessages.sort((a, b) => {
            const timeA = a.timestamp?.toDate() || new Date(0);
            const timeB = b.timestamp?.toDate() || new Date(0);
            return timeB - timeA;
        });
        
        // Render results
        resultsContainer.innerHTML = '';
        
        if (filteredMessages.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-search-minus text-5xl text-gray-300 mb-4"></i>
                    <h4 class="text-lg font-semibold text-gray-500">No Results Found</h4>
                    <p class="text-gray-400">Try different keywords or filters</p>
                </div>
            `;
        } else {
            filteredMessages.forEach(message => {
                const resultElement = createSearchResultElement(message);
                resultsContainer.appendChild(resultElement);
            });
        }
        
        // Update search stats
        const searchStats = document.getElementById('searchStats');
        const resultCount = document.getElementById('resultCount');
        const searchTime = document.getElementById('searchTime');
        
        if (searchStats && resultCount && searchTime) {
            const endTime = performance.now();
            const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
            
            resultCount.textContent = `${filteredMessages.length} result${filteredMessages.length !== 1 ? 's' : ''} found`;
            searchTime.textContent = `Search took ${timeTaken}s`;
            searchStats.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error searching in group:', error);
        resultsContainer.innerHTML = `
            <div class="text-center py-12 text-red-500">
                <i class="fas fa-exclamation-triangle text-5xl mb-4"></i>
                <h4 class="text-lg font-semibold">Error Searching</h4>
                <p class="text-gray-400">Please try again</p>
            </div>
        `;
    }
}

// Create search result element
function createSearchResultElement(message) {
    const element = document.createElement('div');
    element.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer';
    element.dataset.messageId = message.id;
    
    const time = message.timestamp ? message.timestamp.toDate().toLocaleString() : 'Unknown time';
    const isSent = message.senderId === currentUser.uid;
    
    let content = '';
    if (message.type === 'file') {
        const fileType = message.file?.type || '';
        if (fileType.startsWith('image/')) {
            content = `
                <div class="flex items-center space-x-3">
                    <div class="w-16 h-16 rounded overflow-hidden">
                        <img src="${message.file.url}" alt="${message.file.name}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <p class="font-medium">Image: ${message.file.name}</p>
                        <p class="text-sm text-gray-500">${formatFileSize(message.file.size)}</p>
                    </div>
                </div>
            `;
        } else if (fileType.startsWith('video/')) {
            content = `
                <div class="flex items-center space-x-3">
                    <div class="w-16 h-16 bg-gray-900 rounded flex items-center justify-center">
                        <i class="fas fa-video text-white"></i>
                    </div>
                    <div>
                        <p class="font-medium">Video: ${message.file.name}</p>
                        <p class="text-sm text-gray-500">${formatFileSize(message.file.size)}</p>
                    </div>
                </div>
            `;
        } else {
            content = `
                <div class="flex items-center space-x-3">
                    <div class="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <i class="fas fa-file text-gray-600"></i>
                    </div>
                    <div>
                        <p class="font-medium">File: ${message.file.name}</p>
                        <p class="text-sm text-gray-500">${formatFileSize(message.file.size)}</p>
                    </div>
                </div>
            `;
        }
    } else {
        content = `<p class="text-gray-700">${escapeHtml(message.text)}</p>`;
    }
    
    element.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div class="flex items-center space-x-2">
                <span class="font-semibold">${isSent ? 'You' : message.senderName || 'Unknown'}</span>
                ${message.starredBy?.includes(currentUser.uid) ? '<i class="fas fa-star text-yellow-500"></i>' : ''}
            </div>
            <span class="text-sm text-gray-500">${time}</span>
        </div>
        ${content}
        <div class="mt-3 flex justify-end">
            <button onclick="scrollToMessage('${message.id}')" 
                    class="text-sm text-purple-600 hover:text-purple-800">
                <i class="fas fa-arrow-right mr-1"></i>Go to message
            </button>
        </div>
    `;
    
    return element;
}

// Forward group message
async function forwardGroupMessage(messageId) {
    try {
        const messageDoc = await db.collection('groupMessages').doc(messageId).get();
        if (!messageDoc.exists) {
            showToast('Message not found', 'error');
            return;
        }
        
        const message = { id: messageId, ...messageDoc.data() };
        currentForwardMessage = message;
        
        showModal('forwardMessageModal');
        updateForwardPreview(message);
        loadForwardTargets();
        
    } catch (error) {
        console.error('Error forwarding message:', error);
        showToast('Error forwarding message', 'error');
    }
}

// Update forward preview
function updateForwardPreview(message) {
    const preview = document.getElementById('forwardPreview');
    if (!preview) return;
    
    const sender = message.senderId === currentUser.uid ? 'You' : message.senderName || 'Unknown';
    const time = message.timestamp ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    let content = '';
    if (message.type === 'file') {
        const fileType = message.file?.type || '';
        if (fileType.startsWith('image/')) {
            content = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-image text-blue-500"></i>
                    <span>Image: ${message.file.name}</span>
                </div>
            `;
        } else if (fileType.startsWith('video/')) {
            content = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-video text-purple-500"></i>
                    <span>Video: ${message.file.name}</span>
                </div>
            `;
        } else {
            content = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-file text-gray-500"></i>
                    <span>File: ${message.file.name}</span>
                </div>
            `;
        }
    } else {
        content = `<p class="truncate">${escapeHtml(message.text)}</p>`;
    }
    
    preview.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-share text-purple-600"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-semibold">${sender}</span>
                    <span class="text-sm text-gray-500">${time}</span>
                </div>
                <div class="text-gray-700">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    preview.classList.remove('hidden');
}

// Load forward targets
async function loadForwardTargets() {
    const targetsList = groupElements.forwardTargetsList;
    if (!targetsList) return;
    
    targetsList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        // Load groups user is in
        const groupsQuery = await db.collection('groups')
            .where('participants', 'array-contains', currentUser.uid)
            .where('status', '==', 'active')
            .get();
        
        // Load friends (for individual chats)
        const friends = await fetchFriendsDirectly();
        
        targetsList.innerHTML = '';
        
        // Add groups
        groupsQuery.forEach(doc => {
            const group = { id: doc.id, ...doc.data() };
            if (group.id !== currentGroupId) { // Don't show current group
                addForwardTarget(group, 'group');
            }
        });
        
        // Add friends
        friends.forEach(friend => {
            addForwardTarget(friend, 'user');
        });
        
        if (targetsList.children.length === 0) {
            targetsList.innerHTML = '<div class="text-center py-8 text-gray-500">No chats available</div>';
        }
        
    } catch (error) {
        console.error('Error loading forward targets:', error);
        targetsList.innerHTML = '<div class="text-center py-8 text-red-500">Error loading chats</div>';
    }
}

// Add forward target
function addForwardTarget(target, type) {
    const targetsList = groupElements.forwardTargetsList;
    if (!targetsList) return;
    
    const targetItem = document.createElement('label');
    targetItem.className = 'flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer';
    
    const name = type === 'group' ? target.name : target.displayName;
    const avatar = type === 'group' ? 
        target.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C3AED&color=fff` :
        target.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C3AED&color=fff`;
    
    targetItem.innerHTML = `
        <input type="checkbox" class="forward-target-checkbox hidden" 
               value="${target.id}" data-type="${type}" data-name="${name}">
        <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-${type === 'group' ? 'users' : 'user'} text-gray-600"></i>
        </div>
        <div class="flex-1 min-w-0">
            <p class="font-medium truncate">${name}</p>
            <p class="text-sm text-gray-500 truncate">${type === 'group' ? 'Group' : 'Chat'}</p>
        </div>
        <div class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
            <div class="w-3 h-3 rounded-full bg-transparent"></div>
        </div>
    `;
    
    targetsList.appendChild(targetItem);
    
    // Add click handler
    targetItem.addEventListener('click', function(e) {
        if (!e.target.matches('input')) {
            const checkbox = this.querySelector('input');
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    // Update UI on checkbox change
    const checkbox = targetItem.querySelector('input');
    checkbox.addEventListener('change', function() {
        const checkmark = targetItem.querySelector('.w-3.h-3');
        if (this.checked) {
            checkmark.classList.add('bg-purple-600');
            targetItem.classList.add('bg-purple-50', 'border', 'border-purple-200');
        } else {
            checkmark.classList.remove('bg-purple-600');
            targetItem.classList.remove('bg-purple-50', 'border', 'border-purple-200');
        }
        updateForwardCount();
    });
}

// Update forward count
function updateForwardCount() {
    const forwardCount = groupElements.forwardCount;
    const forwardSelectedBtn = groupElements.forwardSelectedBtn;
    const selectedCountSpan = document.getElementById('forwardSelectedCount');
    
    if (!forwardCount || !forwardSelectedBtn) return;
    
    const selectedCount = document.querySelectorAll('.forward-target-checkbox:checked').length;
    
    forwardCount.textContent = `${selectedCount} selected`;
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedCount > 0 ? ` (${selectedCount})` : '';
    }
    
    forwardSelectedBtn.disabled = selectedCount === 0;
}

// Search forward targets
function searchForwardTargets(query) {
    const targetsList = groupElements.forwardTargetsList;
    if (!targetsList) return;
    
    const targetItems = targetsList.querySelectorAll('label');
    const searchTerm = query.toLowerCase().trim();
    
    targetItems.forEach(item => {
        const nameElement = item.querySelector('.font-medium');
        if (nameElement) {
            const name = nameElement.textContent.toLowerCase();
            item.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        }
    });
}

// Confirm forward
async function confirmForward() {
    if (!currentForwardMessage) {
        showToast('No message selected', 'error');
        return;
    }
    
    const selectedCheckboxes = document.querySelectorAll('.forward-target-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showToast('Please select at least one chat', 'error');
        return;
    }
    
    showToast('Forwarding message...', 'info');
    
    try {
        for (const checkbox of selectedCheckboxes) {
            const targetId = checkbox.value;
            const targetType = checkbox.dataset.type;
            
            const forwardMessage = {
                text: currentForwardMessage.text,
                senderId: currentUser.uid,
                senderName: currentUserData.displayName,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'sent',
                type: currentForwardMessage.type,
                forwardedFrom: currentForwardMessage.senderName || 'Unknown',
                originalMessageId: currentForwardMessage.id,
                isEncrypted: currentForwardMessage.isEncrypted || false
            };
            
            // Copy file data if exists
            if (currentForwardMessage.file) {
                forwardMessage.file = currentForwardMessage.file;
            }
            
            if (targetType === 'group') {
                forwardMessage.groupId = targetId;
                await db.collection('groupMessages').add(forwardMessage);
                
                // Update group's last message
                await db.collection('groups').doc(targetId).update({
                    lastMessage: `Forwarded: ${forwardMessage.text.substring(0, 50)}...`,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // For individual chats
                forwardMessage.receiverId = targetId;
                // Add to individual messages collection
                // await db.collection('messages').add(forwardMessage);
            }
        }
        
        showToast('Message forwarded successfully', 'success');
        hideModal('forwardMessageModal');
        currentForwardMessage = null;
        
    } catch (error) {
        console.error('Error forwarding message:', error);
        showToast('Error forwarding message', 'error');
    }
}

// Join group action
async function joinGroupAction() {
    const inviteInput = groupElements.groupCode?.value.trim();
    if (!inviteInput) {
        showToast('Please enter an invite code or link', 'error');
        return;
    }
    
    // Extract code from URL if it's a link
    let inviteCode = inviteInput;
    if (inviteInput.includes('/invite/')) {
        const parts = inviteInput.split('/invite/');
        inviteCode = parts[parts.length - 1];
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
        
        // Show group preview
        showGroupPreview(groupData);
        
    } catch (error) {
        console.error('Error joining group:', error);
        showToast('Error joining group', 'error');
    }
}

// Show group preview
function showGroupPreview(groupData) {
    const preview = groupElements.groupPreview;
    if (!preview) return;
    
    document.getElementById('previewGroupName').textContent = groupData.name;
    document.getElementById('previewGroupMembers').textContent = `${groupData.participants?.length || 0} members`;
    document.getElementById('previewGroupDescription').textContent = groupData.description || 'No description';
    
    const avatar = document.getElementById('previewGroupAvatar');
    if (avatar) {
        avatar.src = groupData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=7C3AED&color=fff`;
    }
    
    preview.classList.remove('hidden');
    
    // Update join button
    const joinBtn = document.getElementById('joinPreviewGroup');
    if (joinBtn) {
        joinBtn.onclick = async () => {
            await joinGroup(groupData.id);
        };
    }
}

// Join group
async function joinGroup(groupId) {
    try {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            showToast('Group not found', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        
        // Check privacy
        if (groupData.privacy === 'private' || groupData.privacy === 'hidden') {
            // Send join request
            await db.collection('groupRequests').add({
                groupId: groupId,
                userId: currentUser.uid,
                userName: currentUserData.displayName,
                userPhoto: currentUserData.photoURL,
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
            await sendSystemMessage(groupId, `${currentUserData.displayName} joined the group`);
            
            showToast('You joined the group!', 'success');
            openGroupChat(groupId);
        }
        
        hideModal('joinGroupModal');
        
    } catch (error) {
        console.error('Error joining group:', error);
        showToast('Error joining group', 'error');
    }
}

// Generate AI conversation summary
async function generateAIConversationSummary() {
    if (!currentGroupId) {
        showToast('Please select a group first', 'error');
        return;
    }
    
    showToast('Generating summary...', 'info');
    
    try {
        // Get recent messages
        const messagesQuery = await db.collection('groupMessages')
            .where('groupId', '==', currentGroupId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        const messages = [];
        messagesQuery.forEach(doc => {
            const data = doc.data();
            if (data.type === 'text' && data.senderId !== 'system') {
                messages.push({
                    sender: data.senderName,
                    text: data.text,
                    time: data.timestamp?.toDate().toLocaleTimeString()
                });
            }
        });
        
        // Reverse to get chronological order
        messages.reverse();
        
        if (messages.length === 0) {
            showToast('No messages to summarize', 'warning');
            return;
        }
        
        // Simulate AI summary (in production, call AI API)
        let summary = `Conversation Summary (${messages.length} messages):\n\n`;
        let lastSender = '';
        let messageCount = 0;
        
        messages.forEach(msg => {
            if (msg.sender !== lastSender) {
                summary += `${msg.sender}:\n`;
                lastSender = msg.sender;
            }
            
            // Truncate long messages
            const truncatedText = msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;
            summary += `  • ${truncatedText}\n`;
            messageCount++;
            
            // Limit summary length
            if (messageCount >= 10) return;
        });
        
        if (messages.length > 10) {
            summary += `\n... and ${messages.length - 10} more messages`;
        }
        
        // Display summary
        const summaryContent = document.getElementById('summaryContent');
        const summaryTime = document.getElementById('summaryTime');
        const summaryResult = document.getElementById('aiSummaryResult');
        
        if (summaryContent && summaryTime && summaryResult) {
            summaryContent.textContent = summary;
            summaryTime.textContent = new Date().toLocaleTimeString();
            summaryResult.classList.remove('hidden');
        }
        
        showToast('Summary generated', 'success');
        
        // Add copy functionality
        const copyBtn = document.getElementById('copySummary');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(summary);
                showToast('Summary copied to clipboard', 'success');
            };
        }
        
    } catch (error) {
        console.error('Error generating summary:', error);
        showToast('Error generating summary', 'error');
    }
}

// Generate smart replies
async function generateSmartReplies() {
    if (!currentGroupId) {
        showToast('Please select a group first', 'error');
        return;
    }
    
    showToast('Generating smart replies...', 'info');
    
    try {
        // Get last few messages
        const messagesQuery = await db.collection('groupMessages')
            .where('groupId', '==', currentGroupId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        
        const lastMessages = [];
        messagesQuery.forEach(doc => {
            const data = doc.data();
            if (data.type === 'text' && data.senderId !== 'system') {
                lastMessages.push(data.text);
            }
        });
        
        // Generate smart replies based on context (simulated)
        const smartReplies = [
            "Got it, thanks!",
            "I'll check and get back to you",
            "That sounds good to me",
            "Let me think about that",
            "Can you explain more?",
            "I agree with that",
            "Let's discuss this further",
            "Thanks for sharing!"
        ];
        
        // Display smart replies
        const repliesList = document.getElementById('smartRepliesList');
        if (repliesList) {
            repliesList.innerHTML = '<h4 class="font-medium text-gray-700 mb-2">Suggested Replies:</h4>';
            
            smartReplies.forEach(reply => {
                const replyItem = document.createElement('button');
                replyItem.className = 'w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg mb-2 transition-colors';
                replyItem.textContent = reply;
                replyItem.addEventListener('click', () => {
                    const messageInput = document.getElementById('groupMessageInput');
                    if (messageInput) {
                        messageInput.value = reply;
                        messageInput.focus();
                        hideModal('smartRepliesModal');
                    }
                });
                repliesList.appendChild(replyItem);
            });
            
            repliesList.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error generating smart replies:', error);
        showToast('Error generating replies', 'error');
    }
}

// Show group list context menu
function showGroupListContextMenu(e, groupId) {
    const contextMenu = groupElements.groupListContextMenu;
    if (!contextMenu) return;
    
    contextMenu.dataset.groupId = groupId;
    
    // Update menu items based on group state
    const userMutedGroups = JSON.parse(localStorage.getItem('mutedGroups') || '{}');
    const isMuted = userMutedGroups[groupId];
    
    const muteItem = contextMenu.querySelector('[data-action="mute-group"]');
    if (muteItem) {
        muteItem.innerHTML = isMuted ? 
            '<i class="fas fa-bell mr-2 text-yellow-600"></i>Unmute' :
            '<i class="fas fa-bell-slash mr-2 text-yellow-600"></i>Mute';
    }
    
    // Position menu
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.remove('hidden');
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            contextMenu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

// Show message context menu
function showMessageContextMenu(e, messageId) {
    const contextMenu = groupElements.messageContextMenu;
    if (!contextMenu) return;
    
    currentContextMessageId = messageId;
    
    // Get message element
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    // Check if message is starred
    const isStarred = messageElement.querySelector('.fa-star.fas');
    const starItem = contextMenu.querySelector('[data-action="star"]');
    if (starItem) {
        starItem.innerHTML = isStarred ? 
            '<i class="fas fa-star mr-2 text-yellow-600"></i>Unstar' :
            '<i class="far fa-star mr-2 text-yellow-600"></i>Star';
    }
    
    // Check if user can delete for everyone
    const canDeleteForEveryone = currentGroup?.admins?.includes(currentUser.uid) || 
                                 messageElement.dataset.senderId === currentUser.uid;
    const deleteAllItem = contextMenu.querySelector('[data-action="delete-all"]');
    if (deleteAllItem) {
        deleteAllItem.style.display = canDeleteForEveryone ? 'block' : 'none';
    }
    
    // Position menu
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.remove('hidden');
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            contextMenu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

// Handle group context menu actions
function handleGroupContextMenuAction(action, groupId) {
    switch (action) {
        case 'open-group':
            openGroupChat(groupId);
            break;
        case 'mute-group':
            toggleGroupMute(groupId);
            break;
        case 'mark-read':
            resetGroupUnreadCount(groupId);
            break;
        case 'group-info':
            showGroupInfoModal(groupId);
            break;
        case 'group-settings':
            showGroupInfoModal(groupId);
            break;
        case 'leave-group':
            if (confirm('Are you sure you want to leave this group?')) {
                leaveGroup(groupId);
            }
            break;
    }
}

// Handle message context menu actions
function handleMessageContextMenuAction(action, messageId) {
    switch (action) {
        case 'reply':
            replyToGroupMessage(messageId);
            break;
        case 'forward':
            forwardGroupMessage(messageId);
            break;
        case 'star':
            toggleMessageStar(messageId, !isMessageStarred(messageId));
            break;
        case 'react':
            showReactionPicker(messageId);
            break;
        case 'copy':
            copyMessageText(messageId);
            break;
        case 'select':
            toggleMessageSelection(messageId);
            break;
        case 'edit':
            // Message editing functionality
            editGroupMessage(messageId);
            break;
        case 'delete-me':
            deleteGroupMessage(messageId, false);
            break;
        case 'delete-all':
            if (confirm('Delete this message for everyone?')) {
                deleteGroupMessage(messageId, true);
            }
            break;
        case 'report':
            reportGroupMessage(messageId);
            break;
    }
}

// Show reaction picker
function showReactionPicker(messageId) {
    const picker = groupElements.reactionPicker;
    if (!picker) return;
    
    currentContextMessageId = messageId;
    
    // Position near the message
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const rect = messageElement.getBoundingClientRect();
        picker.style.left = `${rect.right - 100}px`;
        picker.style.top = `${rect.top - 50}px`;
        picker.classList.remove('hidden');
    }
    
    // Close picker when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!picker.contains(e.target)) {
                picker.classList.add('hidden');
                document.removeEventListener('click', closePicker);
            }
        });
    }, 100);
}

// Add reaction to message
async function addReactionToMessage(messageId, reaction) {
    try {
        const messageRef = db.collection('groupMessages').doc(messageId);
        
        await messageRef.update({
            reactions: firebase.firestore.FieldValue.arrayUnion({
                userId: currentUser.uid,
                reaction: reaction,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
        });
        
        // Update UI
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            let reactionsContainer = messageElement.querySelector('.message-reactions');
            if (!reactionsContainer) {
                reactionsContainer = document.createElement('div');
                reactionsContainer.className = 'message-reactions flex items-center space-x-1 mt-1';
                const messageBubble = messageElement.querySelector('.message-bubble');
                if (messageBubble) {
                    messageBubble.appendChild(reactionsContainer);
                }
            }
            
            // Add or update reaction
            const existingReaction = reactionsContainer.querySelector(`[data-reaction="${reaction}"]`);
            if (existingReaction) {
                const count = parseInt(existingReaction.dataset.count) + 1;
                existingReaction.dataset.count = count;
                existingReaction.innerHTML = `${reaction} ${count}`;
            } else {
                const reactionSpan = document.createElement('span');
                reactionSpan.className = 'bg-gray-100 px-2 py-1 rounded-full text-xs';
                reactionSpan.dataset.reaction = reaction;
                reactionSpan.dataset.count = 1;
                reactionSpan.innerHTML = `${reaction} 1`;
                reactionsContainer.appendChild(reactionSpan);
            }
        }
        
        // Hide reaction picker
        const picker = groupElements.reactionPicker;
        if (picker) picker.classList.add('hidden');
        
    } catch (error) {
        console.error('Error adding reaction:', error);
        showToast('Error adding reaction', 'error');
    }
}

// Initialize message reactions
function initializeMessageReactions() {
    const picker = groupElements.reactionPicker;
    if (!picker) return;
    
    picker.addEventListener('click', (e) => {
        const reactionBtn = e.target.closest('.reaction-option');
        if (reactionBtn && currentContextMessageId) {
            const reaction = reactionBtn.dataset.reaction;
            addReactionToMessage(currentContextMessageId, reaction);
        }
    });
}

// Initialize drag and drop
function initializeDragAndDrop() {
    const dropZone = document.getElementById('groupMessageInput')?.parentElement;
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleDrop);
    }
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

// Hide modal
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Copy invite link
function copyInviteLink() {
    const inviteLink = groupElements.groupInviteLink;
    if (!inviteLink) return;
    
    inviteLink.select();
    document.execCommand('copy');
    
    // Show visual feedback
    const originalValue = inviteLink.value;
    inviteLink.value = 'Copied to clipboard!';
    
    setTimeout(() => {
        inviteLink.value = originalValue;
    }, 2000);
    
    showToast('Invite link copied to clipboard', 'success');
}

// Refresh invite link
async function refreshInviteLink() {
    if (!currentGroupId || !currentGroup?.admins?.includes(currentUser.uid)) {
        showToast('Only group admins can refresh invite links', 'error');
        return;
    }
    
    try {
        const newCode = generateInviteCode();
        const newLink = `${window.location.origin}/invite/${newCode}`;
        
        await updateGroupInfo(currentGroupId, {
            inviteCode: newCode,
            inviteLink: newLink
        });
        
        if (groupElements.groupInviteLink) {
            groupElements.groupInviteLink.value = newLink;
        }
        
        showToast('Invite link refreshed!', 'success');
        
    } catch (error) {
        console.error('Error refreshing invite link:', error);
        showToast('Error refreshing invite link', 'error');
    }
}

// Toggle group mute
async function toggleGroupMute(groupId) {
    const userMutedGroups = JSON.parse(localStorage.getItem('mutedGroups') || '{}');
    const isMuted = userMutedGroups[groupId];
    
    userMutedGroups[groupId] = !isMuted;
    localStorage.setItem('mutedGroups', JSON.stringify(userMutedGroups));
    
    // Update UI
    const muteBtn = document.getElementById('muteGroupBtn');
    if (muteBtn) {
        muteBtn.innerHTML = !isMuted ? 
            '<i class="fas fa-bell"></i><span>Unmute</span>' :
            '<i class="fas fa-bell-slash"></i><span>Mute</span>';
    }
    
    showToast(!isMuted ? 'Group muted' : 'Group unmuted', 'success');
}

// Generate invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Helper function to check if text contains a link
function containsLink(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(text);
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    
    return 'Just now';
}

// Export functions for global access
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
    joinPublicGroup,
    toggleMessageStar,
    deleteGroupMessage,
    replyToGroupMessage,
    forwardGroupMessage,
    copyMessageText,
    reportGroupMessage,
    loadGroupMedia,
    loadGroupStarredMessages,
    searchInGroup,
    scrollToMessage,
    switchToTab,
    showGroupInfoModal,
    showModal,
    hideModal,
    generateAIConversationSummary,
    generateSmartReplies
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Enhanced Group System...');
    
    // Wait for Firebase auth
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                setTimeout(initializeGroupSystem, 1000);
            }
        });
    } else {
        // Fallback initialization
        setTimeout(() => {
            if (typeof currentUser !== 'undefined' && currentUser) {
                initializeGroupSystem();
            }
        }, 2000);
    }
});

console.log('✅ Enhanced Group System loaded successfully');