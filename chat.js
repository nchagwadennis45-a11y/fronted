// Professional Chat System JavaScript - Firebase Integrated Version
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, updateDoc, doc, getDocs, getDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";

class ProfessionalChatSystem {
    constructor() {
        this.currentUser = null;
        this.currentChatId = null;
        this.chats = [];
        this.users = [];
        this.filteredChats = [];
        this.currentChatTypeFilter = 'all';
        this.isSidebarVisible = true;
        this.emotionAI = new EmotionAI();
        this.gamification = null;
        this.currentEmotion = 'default';
        this.whisperMode = false;
        this.currentMediaFile = null;
        this.messageListener = null;
        this.chatsListener = null;
        this.usersListener = null;
        this.lastSent = 0; // Rate limiting
        
        // Firebase configuration
        this.firebaseConfig = {
            apiKey: "AIzaSyDHHyGgsSV18BcXrGgzi4C8frzDAE1C1zo",
            authDomain: "uniconnect-ee95c.firebaseapp.com",
            projectId: "uniconnect-ee95c",
            storageBucket: "uniconnect-ee95c.firebasestorage.app",
            messagingSenderId: "1003264444309",
            appId: "1:1003264444309:web:9f0307516e44d21e97d89c"
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.initializeFirebase();
            await this.setupAuthStateListener();
            this.setupEventListeners();
            console.log('🚀 Professional Chat System Initialized with Firebase');
        } catch (error) {
            console.error('Error initializing chat system:', error);
            this.showNotification('Error initializing chat system', 'error');
        }
    }
    
    async initializeFirebase() {
        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(this.firebaseConfig);
        }
        
        this.auth = firebase.auth();
        this.firestore = firebase.firestore();
        this.storage = firebase.storage();
        
        // Enable offline persistence
        await this.firestore.enablePersistence()
            .catch((err) => {
                console.error('Firebase persistence failed:', err);
            });
    }
    
    setupAuthStateListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.handleUserSignedIn(user);
            } else {
                this.handleUserSignedOut();
            }
        });
    }
    
    async handleUserSignedIn(user) {
        try {
            // Get user data from Firestore
            const userDoc = await this.firestore.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                this.currentUser = {
                    id: user.uid,
                    email: user.email,
                    ...userDoc.data()
                };
            } else {
                // Create new user document if it doesn't exist
                this.currentUser = {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    role: 'student',
                    online: true,
                    avatar: user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'US',
                    streak: 0,
                    connectcoins: 0,
                    level: 1,
                    xp: 0
                };
                
                await this.firestore.collection('users').doc(user.uid).set(this.currentUser);
            }
            
            // Initialize gamification
            this.gamification = new GamificationSystem(this.currentUser);
            await this.gamification.loadUserProgress();
            
            this.updateCurrentUser();
            await this.loadUsers();
            await this.loadChats();
            this.setupRealtimeListeners();
            
            this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
            
        } catch (error) {
            console.error('Error handling user sign in:', error);
            this.showNotification('Error loading user data', 'error');
        }
    }
    
    handleUserSignedOut() {
        // Clean up listeners
        if (this.messageListener) this.messageListener();
        if (this.chatsListener) this.chatsListener();
        if (this.usersListener) this.usersListener();
        
        this.currentUser = null;
        this.chats = [];
        this.users = [];
        this.filteredChats = [];
        this.currentChatId = null;
        
        // Redirect to login page
        window.location.href = 'index.html';
    }
    
    async loadUsers() {
        try {
            const snapshot = await this.firestore.collection('users')
                .where('id', '!=', this.currentUser.id)
                .get();
            
            this.users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    async loadChats() {
        try {
            // Load chats where current user is a member
            const snapshot = await this.firestore.collection('chats')
                .where('members', 'array-contains', this.currentUser.id)
                .orderBy('lastMessageTime', 'desc')
                .get();
            
            this.chats = await Promise.all(
                snapshot.docs.map(async doc => {
                    const chatData = doc.data();
                    
                    // Load members data
                    const membersData = await Promise.all(
                        chatData.members.map(async memberId => {
                            const memberDoc = await this.firestore.collection('users').doc(memberId).get();
                            return {
                                id: memberId,
                                ...memberDoc.data()
                            };
                        })
                    );
                    
                    // Load messages using modular SDK
                    const messagesRef = collection(this.firestore, 'chats', doc.id, 'messages');
                    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
                    const messagesSnapshot = await getDocs(q);
                    
                    const messages = messagesSnapshot.docs.map(msgDoc => {
                        const msgData = msgDoc.data();
                        const sender = membersData.find(m => m.id === msgData.senderId) || this.currentUser;
                        return {
                            id: msgDoc.id,
                            sender: sender,
                            content: msgData.content,
                            time: this.formatTime(msgData.timestamp?.toDate()),
                            type: msgData.type || 'normal',
                            status: msgData.status || 'sent',
                            timestamp: msgData.timestamp,
                            emotion: msgData.emotion,
                            mediaUrl: msgData.mediaUrl,
                            mediaType: msgData.mediaType,
                            isWhisper: msgData.isWhisper
                        };
                    });
                    
                    return {
                        id: doc.id,
                        ...chatData,
                        members: membersData,
                        messages: messages
                    };
                })
            );
            
            this.filteredChats = [...this.chats];
            this.renderChatList();
            
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }
    
    // Enhanced real-time listeners using modular SDK
    setupRealtimeMessageListener(chatId) {
        if (this.messageListener) {
            this.messageListener(); // Unsubscribe from previous listener
        }
        
        const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
        
        this.messageListener = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Update the current chat's messages
            const chatIndex = this.chats.findIndex(chat => chat.id === chatId);
            if (chatIndex >= 0) {
                // Convert Firestore timestamps and enrich with sender data
                this.chats[chatIndex].messages = messages.map(msg => {
                    const sender = this.chats[chatIndex].members.find(m => m.id === msg.senderId) || this.currentUser;
                    return {
                        ...msg,
                        sender: sender,
                        time: this.formatTime(msg.timestamp?.toDate()),
                        timestamp: msg.timestamp
                    };
                });
                
                // Re-render messages if this is the active chat
                if (this.currentChatId === chatId) {
                    this.renderMessages(chatId);
                    this.scrollToBottom();
                    
                    // Mark as read
                    this.markAsRead(chatId);
                }
            }
        }, (error) => {
            console.error('Error in real-time message listener:', error);
        });
    }
    
    setupRealtimeChatsListener() {
        if (this.chatsListener) {
            this.chatsListener(); // Unsubscribe from previous listener
        }
        
        const chatsRef = collection(this.firestore, 'chats');
        const q = query(
            chatsRef, 
            where('members', 'array-contains', this.currentUser.id),
            orderBy('lastMessageTime', 'desc')
        );
        
        this.chatsListener = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added' || change.type === 'modified') {
                    await this.updateChatFromSnapshot(change.doc);
                } else if (change.type === 'removed') {
                    this.removeChat(change.doc.id);
                }
            }
        }, (error) => {
            console.error('Error in real-time chats listener:', error);
        });
    }
    
    setupRealtimeUsersListener() {
        if (this.usersListener) {
            this.usersListener(); // Unsubscribe from previous listener
        }
        
        const usersRef = collection(this.firestore, 'users');
        const q = query(usersRef, where('id', '!=', this.currentUser.id));
        
        this.usersListener = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified' || change.type === 'added') {
                    this.updateUserFromSnapshot(change.doc);
                }
            });
        }, (error) => {
            console.error('Error in real-time users listener:', error);
        });
    }
    
    setupRealtimeListeners() {
        this.setupRealtimeChatsListener();
        this.setupRealtimeUsersListener();
        
        // Setup message listener for current chat if exists
        if (this.currentChatId) {
            this.setupRealtimeMessageListener(this.currentChatId);
        }
    }
    
    async updateChatFromSnapshot(doc) {
        const chatData = doc.data();
        const existingIndex = this.chats.findIndex(chat => chat.id === doc.id);
        
        // Load members data
        const membersData = await Promise.all(
            chatData.members.map(async memberId => {
                const memberDoc = await this.firestore.collection('users').doc(memberId).get();
                return {
                    id: memberId,
                    ...memberDoc.data()
                };
            })
        );
        
        // Load messages if this is the active chat
        let messages = [];
        if (doc.id === this.currentChatId) {
            const messagesRef = collection(this.firestore, 'chats', doc.id, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
            const messagesSnapshot = await getDocs(q);
            
            messages = messagesSnapshot.docs.map(msgDoc => {
                const msgData = msgDoc.data();
                const sender = membersData.find(m => m.id === msgData.senderId) || this.currentUser;
                return {
                    id: msgDoc.id,
                    sender: sender,
                    content: msgData.content,
                    time: this.formatTime(msgData.timestamp?.toDate()),
                    type: msgData.type || 'normal',
                    status: msgData.status || 'sent',
                    timestamp: msgData.timestamp,
                    emotion: msgData.emotion,
                    mediaUrl: msgData.mediaUrl,
                    mediaType: msgData.mediaType,
                    isWhisper: msgData.isWhisper
                };
            });
        }
        
        const updatedChat = {
            id: doc.id,
            ...chatData,
            members: membersData,
            messages: messages
        };
        
        if (existingIndex >= 0) {
            this.chats[existingIndex] = updatedChat;
            this.filteredChats[existingIndex] = updatedChat;
        } else {
            this.chats.unshift(updatedChat);
            this.filteredChats.unshift(updatedChat);
        }
        
        this.renderChatList();
        
        if (doc.id === this.currentChatId) {
            this.renderMessages(doc.id);
        }
    }
    
    updateUserFromSnapshot(doc) {
        const userData = doc.data();
        const userIndex = this.users.findIndex(user => user.id === doc.id);
        
        if (userIndex >= 0) {
            this.users[userIndex] = {
                id: doc.id,
                ...userData
            };
        }
        
        // Update user in chats
        this.chats.forEach(chat => {
            const memberIndex = chat.members.findIndex(member => member.id === doc.id);
            if (memberIndex >= 0) {
                chat.members[memberIndex] = {
                    id: doc.id,
                    ...userData
                };
            }
        });
    }
    
    removeChat(chatId) {
        this.chats = this.chats.filter(chat => chat.id !== chatId);
        this.filteredChats = this.filteredChats.filter(chat => chat.id !== chatId);
        
        if (this.currentChatId === chatId) {
            this.showChatList();
        }
        
        this.renderChatList();
    }
    
    // Rate limiting function
    canSend() {
        const now = Date.now();
        if (now - this.lastSent < 2000) { // 2 seconds gap
            this.showNotification('Please wait a moment before sending another message', 'warning');
            return false;
        }
        this.lastSent = now;
        return true;
    }
    
    // Enhanced message sending function
    async sendMessage(text = null, imageUrl = null) {
        const input = document.getElementById('message-input');
        const messageType = document.getElementById('message-type').value;
        
        // Use provided text or get from input
        const content = text || input.value.trim();
        
        if (!content && !imageUrl && !this.currentMediaFile) {
            this.showNotification('Please enter a message or attach a file', 'warning');
            return;
        }
        
        if (!this.currentChatId) {
            this.showNotification('Please select a chat first', 'warning');
            return;
        }
        
        // Check rate limiting
        if (!this.canSend()) {
            return;
        }
        
        try {
            let mediaUrl = imageUrl;
            let mediaType = null;

            // Upload media if exists (and no imageUrl provided)
            if (this.currentMediaFile && !imageUrl) {
                this.showNotification('Uploading media...', 'info');
                mediaUrl = await this.uploadMediaFile(this.currentMediaFile);
                mediaType = this.currentMediaFile.type.split('/')[0]; // image, video, audio
            } else if (imageUrl) {
                mediaUrl = imageUrl;
                mediaType = 'image';
            }

            // Analyze emotion
            const emotion = content ? this.emotionAI.analyzeText(content) : 'default';
            this.applyEmotionTheme(emotion);
            
            const messageData = {
                senderId: this.currentUser.id,
                content: content,
                type: messageType,
                emotion: emotion,
                status: 'sent',
                timestamp: serverTimestamp(),
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                isWhisper: this.whisperMode
            };
            
            // Add message to Firestore using modular SDK
            const messagesRef = collection(this.firestore, 'chats', this.currentChatId, 'messages');
            await addDoc(messagesRef, messageData);
            
            // Update chat last message using modular SDK
            const chatRef = doc(this.firestore, 'chats', this.currentChatId);
            await updateDoc(chatRef, {
                lastMessage: content || (mediaUrl ? '📎 Media shared' : 'Message sent'),
                lastMessageTime: serverTimestamp()
            });
            
            // Clear input and reset if not using direct call
            if (!text && !imageUrl) {
                input.value = '';
                input.style.height = 'auto';
                this.clearMediaPreview();
                this.currentMediaFile = null;
            }
            
            // Award points
            if (this.gamification) {
                this.gamification.addConnectcoins(2);
                this.gamification.addXP(1);
            }
            
            this.showNotification('Message sent successfully', 'success');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Error sending message', 'error');
        }
    }

    // Quick send function for external use
    async quickSend(text, imageUrl = null) {
        return this.sendMessage(text, imageUrl);
    }

    setupEventListeners() {
        // Chat list interactions
        document.getElementById('chat-search').addEventListener('input', (e) => {
            this.filterChats(e.target.value);
        });
        
        // Chat type filters
        document.querySelectorAll('.chat-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chat-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentChatTypeFilter = e.target.getAttribute('data-type');
                this.filterChats();
            });
        });
        
        // Message sending with rate limiting
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        document.getElementById('message-input').addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Back button
        document.getElementById('back-to-list').addEventListener('click', () => this.showChatList());
        
        // New chat button
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            this.showModal('new-chat-modal');
        });
        
        // Chat options
        document.querySelectorAll('.chat-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                this.handleChatTypeSelection(type);
            });
        });
        
        // Group creation
        document.getElementById('create-group-form').addEventListener('submit', (e) => this.createGroup(e));
        
        // Group info button
        document.getElementById('group-info-btn').addEventListener('click', () => {
            if (this.currentChatId) {
                this.showGroupInfoModal(this.currentChatId);
            }
        });
        
        // Leave group button
        document.getElementById('leave-group-btn').addEventListener('click', () => this.leaveGroup());
        
        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Responsive sidebar toggle
        window.addEventListener('resize', () => this.handleResize());

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

        // Enhanced Features Event Listeners
        this.setupEnhancedEventListeners();
    }

    setupEnhancedEventListeners() {
        // Emotion Analysis
        document.getElementById('emotionAnalysisBtn')?.addEventListener('click', () => this.showEmotionAnalysis());
        document.getElementById('closeEmotionModal')?.addEventListener('click', () => this.hideEmotionAnalysis());

        // DNA Test
        document.getElementById('dnaTestBtn')?.addEventListener('click', () => this.showDNATest());
        document.getElementById('closeDnaModal')?.addEventListener('click', () => this.hideDNATest());

        // Time Capsule
        document.getElementById('timeCapsuleBtn')?.addEventListener('click', () => this.showTimeCapsule());
        document.getElementById('timeCapsuleMenuBtn')?.addEventListener('click', () => this.showTimeCapsule());
        document.getElementById('createCapsuleBtn')?.addEventListener('click', () => this.createTimeCapsule());
        document.getElementById('closeTimeCapsuleModal')?.addEventListener('click', () => this.hideTimeCapsule());

        // Collaboration Room
        document.getElementById('collabRoomBtn')?.addEventListener('click', () => this.showCollabRoom());
        document.getElementById('createCollabRoomBtn')?.addEventListener('click', () => this.showCollabRoom());
        document.getElementById('closeCollabModal')?.addEventListener('click', () => this.hideCollabRoom());

        // Nearby Pulse
        document.getElementById('nearbyPulseBtn')?.addEventListener('click', () => this.showNearbyPulse());
        document.getElementById('closePulseModal')?.addEventListener('click', () => this.hideNearbyPulse());

        // Challenges
        document.getElementById('viewChallenges')?.addEventListener('click', () => this.showChallenges());
        document.getElementById('closeChallengesModal')?.addEventListener('click', () => this.hideChallenges());

        // Media Attachment
        document.getElementById('attachImageBtn')?.addEventListener('click', () => this.attachMedia('image'));
        document.getElementById('attachVideoBtn')?.addEventListener('click', () => this.attachMedia('video'));
        document.getElementById('attachAudioBtn')?.addEventListener('click', () => this.attachMedia('audio'));

        // Quick image send (example for direct image sending)
        document.getElementById('quickImageBtn')?.addEventListener('click', () => {
            this.quickSend('Check out this image!', 'https://example.com/image.jpg');
        });

        // Whisper Mode
        document.getElementById('whisperButton')?.addEventListener('click', () => this.toggleWhisperMode());

        // Emoji Picker
        document.getElementById('emojiButton')?.addEventListener('click', () => this.toggleEmojiPicker());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#emojiPicker') && !e.target.closest('#emojiButton')) {
                document.getElementById('emojiPicker').classList.add('hidden');
            }
        });

        // Initialize emoji picker
        this.initializeEmojiPicker();

        // Video Call
        document.getElementById('videoCallBtn')?.addEventListener('click', () => this.startVideoCall());

        // Voice Message
        document.getElementById('voiceMessageBtn')?.addEventListener('click', () => this.startVoiceMessage());

        // File Share
        document.getElementById('fileShareBtn')?.addEventListener('click', () => this.shareFile());

        // Search Messages
        document.getElementById('searchMenuItem')?.addEventListener('click', () => this.searchMessages());

        // Add Friend
        document.getElementById('addFriendBtn')?.addEventListener('click', () => this.showAddFriendModal());
        document.getElementById('searchFriendBtn')?.addEventListener('click', () => this.searchFriends());
        document.getElementById('closeAddFriendModal')?.addEventListener('click', () => this.hideAddFriendModal());

        // Create Group
        document.getElementById('createGroupBtn')?.addEventListener('click', () => this.showCreateGroupModal());
        document.getElementById('createGroupBtnConfirm')?.addEventListener('click', () => this.createGroupChat());
        document.getElementById('closeCreateGroupModal')?.addEventListener('click', () => this.hideCreateGroupModal());
    }
    
    async logout() {
        try {
            await this.auth.signOut();
            this.showNotification('Logged out successfully', 'info');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    renderChatList() {
        const chatList = document.getElementById('chat-list');
        
        if (this.filteredChats.length === 0) {
            chatList.innerHTML = `
                <div class="no-chats" style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                    <h3 style="margin-bottom: 0.5rem;">No conversations found</h3>
                    <p>Try adjusting your search or start a new chat</p>
                    <button class="btn btn-primary" onclick="chatSystem.showModal('new-chat-modal')" style="margin-top: 1rem;">
                        <i class="fas fa-plus"></i> Start New Chat
                    </button>
                </div>
            `;
            return;
        }
        
        const chatsHTML = this.filteredChats.map(chat => {
            const isActive = chat.id === this.currentChatId;
            const activeClass = isActive ? 'active' : '';
            const typeClass = `type-${chat.type}`;
            const unreadCount = this.calculateUnreadCount(chat);
            
            return `
                <div class="chat-item ${activeClass}" data-chat-id="${chat.id}">
                    <div class="chat-avatar">
                        <span>${chat.avatarText || chat.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div class="chat-item-info">
                        <div class="chat-item-header">
                            <div class="chat-item-name">${chat.name}</div>
                            <div class="chat-item-time">${this.formatTime(chat.lastMessageTime?.toDate())}</div>
                        </div>
                        <div class="chat-item-preview">${chat.lastMessage || 'No messages yet'}</div>
                        <div class="chat-item-meta">
                            ${unreadCount > 0 ? `<div class="chat-badge">${unreadCount}</div>` : ''}
                            <div class="chat-type-indicator ${typeClass}">${chat.type.charAt(0).toUpperCase() + chat.type.slice(1)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        chatList.innerHTML = chatsHTML;
        
        // Add click listeners to chat items
        chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.getAttribute('data-chat-id');
                this.selectChat(chatId);
            });
        });
    }
    
    calculateUnreadCount(chat) {
        if (!chat.lastRead || !chat.lastRead[this.currentUser.id]) return 0;
        
        const lastRead = chat.lastRead[this.currentUser.id].toDate();
        return chat.messages.filter(msg => 
            msg.timestamp.toDate() > lastRead && msg.sender.id !== this.currentUser.id
        ).length;
    }
    
    filterChats(searchTerm = '') {
        const term = searchTerm.toLowerCase();
        
        this.filteredChats = this.chats.filter(chat => {
            const matchesSearch = chat.name.toLowerCase().includes(term) || 
                                 (chat.lastMessage && chat.lastMessage.toLowerCase().includes(term)) ||
                                 chat.members.some(member => member.name.toLowerCase().includes(term));
            
            const matchesType = this.currentChatTypeFilter === 'all' || chat.type === this.currentChatTypeFilter;
            
            return matchesSearch && matchesType;
        });
        
        this.renderChatList();
    }
    
    async selectChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        
        if (!chat) return;
        
        // Setup real-time message listener for this chat
        this.setupRealtimeMessageListener(chatId);
        
        // Load initial messages
        await this.loadChatMessages(chatId);
        
        // Update UI
        document.getElementById('chat-title').textContent = chat.name;
        document.getElementById('chat-members').textContent = `${chat.members.length} members • ${chat.type} chat`;
        document.getElementById('chat-avatar-text').textContent = chat.avatarText || chat.name.substring(0, 2).toUpperCase();
        
        // Show active chat view
        document.getElementById('no-chat-view').style.display = 'none';
        document.getElementById('active-chat-view').style.display = 'flex';
        
        // Render messages
        this.renderMessages(chatId);
        
        // Update chat list to show active state
        this.renderChatList();
        
        // Scroll to bottom of messages
        this.scrollToBottom();
        
        // Mark as read
        await this.markAsRead(chatId);
        
        console.log(`💬 Chat selected: ${chat.name}`);
    }
    
    async loadChatMessages(chatId) {
        try {
            const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
            const messagesSnapshot = await getDocs(q);
            
            const chat = this.chats.find(c => c.id === chatId);
            if (!chat) return;
            
            chat.messages = messagesSnapshot.docs.map(msgDoc => {
                const msgData = msgDoc.data();
                const sender = chat.members.find(m => m.id === msgData.senderId) || this.currentUser;
                return {
                    id: msgDoc.id,
                    sender: sender,
                    content: msgData.content,
                    time: this.formatTime(msgData.timestamp?.toDate()),
                    type: msgData.type || 'normal',
                    status: msgData.status || 'sent',
                    timestamp: msgData.timestamp,
                    emotion: msgData.emotion,
                    mediaUrl: msgData.mediaUrl,
                    mediaType: msgData.mediaType,
                    isWhisper: msgData.isWhisper
                };
            });
            
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    renderMessages(chatId) {
        const container = document.getElementById('messages-container');
        const chat = this.chats.find(c => c.id === chatId);
        const messages = chat?.messages || [];
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">💭</div>
                    <h3 style="margin-bottom: 0.5rem;">No messages yet</h3>
                    <p>Start the conversation by sending a message!</p>
                </div>
            `;
            return;
        }
        
        let messagesHTML = '';
        let currentDate = '';
        
        messages.forEach(message => {
            const messageDate = message.timestamp.toDate().toDateString();
            if (messageDate !== currentDate) {
                currentDate = messageDate;
                messagesHTML += `
                    <div class="message-date-divider">
                        <span class="date-label">${this.formatDate(message.timestamp.toDate())}</span>
                    </div>
                `;
            }
            
            const isSent = message.sender.id === this.currentUser.id;
            const messageClass = isSent ? 'message sent' : 'message received';
            const bubbleClass = message.type !== 'normal' ? `message-bubble message-${message.type}` : 'message-bubble';
            const whisperClass = message.isWhisper ? 'whisper-message' : '';
            
            // Media content
            let mediaContent = '';
            if (message.mediaUrl) {
                if (message.mediaType === 'image') {
                    mediaContent = `<img src="${message.mediaUrl}" class="media-preview optimized-image" alt="Shared image">`;
                } else if (message.mediaType === 'video') {
                    mediaContent = `<video src="${message.mediaUrl}" class="media-preview" controls></video>`;
                } else if (message.mediaType === 'audio') {
                    mediaContent = `<audio src="${message.mediaUrl}" class="w-full mt-2" controls></audio>`;
                }
            }
            
            // Emotion indicator
            const emotionIcon = message.emotion ? this.getEmotionIcon(message.emotion) : '';
            
            messagesHTML += `
                <div class="${messageClass} ${whisperClass}">
                    <div class="${bubbleClass}">
                        ${!isSent ? `<div class="message-sender">${message.sender.name}</div>` : ''}
                        ${message.isWhisper ? '<div class="whisper-indicator"><i class="fas fa-user-secret"></i> Whisper</div>' : ''}
                        ${mediaContent}
                        <div class="message-content">${message.content}</div>
                        <div class="message-meta">
                            <span class="message-time">${message.time}</span>
                            ${emotionIcon}
                            ${isSent ? `<span class="message-status">${this.getStatusIcon(message.status)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = messagesHTML;
    }
    
    getStatusIcon(status) {
        switch(status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return '⋯';
        }
    }

    getEmotionIcon(emotion) {
        const emojiMap = {
            joy: '😊',
            love: '❤️',
            calm: '😌',
            excited: '🎉',
            sad: '😢',
            angry: '😠'
        };
        return `<span class="emotion-indicator">${emojiMap[emotion] || ''}</span>`;
    }

    async uploadMediaFile(file) {
        return new Promise((resolve, reject) => {
            const storageRef = this.storage.ref(`chats/${this.currentChatId}/${Date.now()}_${file.name}`);
            const uploadTask = storageRef.put(file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress tracking
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const progressBar = document.getElementById('uploadProgressBar');
                    if (progressBar) {
                        progressBar.style.width = progress + '%';
                    }
                },
                (error) => {
                    console.error('Upload error:', error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(downloadURL);
                }
            );
        });
    }

    attachMedia(type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = `${type}/*`;
        input.onchange = (e) => this.handleMediaSelect(e, type);
        input.click();
    }

    handleMediaSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        this.currentMediaFile = file;
        this.showMediaPreview(file, type);
    }

    showMediaPreview(file, type) {
        const previewContainer = document.getElementById('mediaPreview');
        const previewImage = document.getElementById('previewImage');
        const previewVideo = document.getElementById('previewVideo');
        const previewAudio = document.getElementById('previewAudio');
        const uploadProgress = document.getElementById('uploadProgress');

        // Hide all previews first
        previewImage.classList.add('hidden');
        previewVideo.classList.add('hidden');
        previewAudio.classList.add('hidden');
        uploadProgress.classList.remove('hidden');

        const objectUrl = URL.createObjectURL(file);

        if (type === 'image') {
            previewImage.src = objectUrl;
            previewImage.classList.remove('hidden');
        } else if (type === 'video') {
            previewVideo.src = objectUrl;
            previewVideo.classList.remove('hidden');
        } else if (type === 'audio') {
            previewAudio.src = objectUrl;
            previewAudio.classList.remove('hidden');
        }

        previewContainer.classList.remove('hidden');
    }

    clearMediaPreview() {
        const previewContainer = document.getElementById('mediaPreview');
        previewContainer.classList.add('hidden');
        document.getElementById('uploadProgress').classList.add('hidden');
        document.getElementById('uploadProgressBar').style.width = '0%';
    }

    toggleWhisperMode() {
        this.whisperMode = !this.whisperMode;
        const whisperBtn = document.getElementById('whisperButton');
        
        if (this.whisperMode) {
            whisperBtn.classList.add('text-yellow-400');
            whisperBtn.classList.remove('text-blue-400');
            this.showNotification('Whisper mode activated - messages will self-destruct after 24 hours', 'info');
        } else {
            whisperBtn.classList.remove('text-yellow-400');
            whisperBtn.classList.add('text-blue-400');
            this.showNotification('Whisper mode deactivated', 'info');
        }
    }

    toggleEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        picker.classList.toggle('hidden');
    }

    initializeEmojiPicker() {
        const emojiGrid = document.querySelector('.emoji-grid');
        if (!emojiGrid) return;

        emojiGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji')) {
                const input = document.getElementById('message-input');
                input.value += e.target.textContent;
                input.focus();
            }
        });
    }

    applyEmotionTheme(emotion) {
        if (emotion === this.currentEmotion) return;
        
        this.currentEmotion = emotion;
        const body = document.getElementById('emotionBody');
        const messageArea = document.getElementById('messageInputArea');
        
        // Remove previous emotion classes
        body.className = body.className.replace(/emotion-\w+/g, '');
        if (messageArea) {
            messageArea.className = messageArea.className.replace(/emotion-border-\w+/g, '');
        }
        
        // Add new emotion classes
        body.classList.add(`emotion-${emotion}`);
        if (messageArea) {
            messageArea.classList.add(`emotion-border-${emotion}`);
        }
        
        // Update emotion indicator
        this.updateEmotionIndicator(emotion);
    }

    updateEmotionIndicator(emotion) {
        const indicator = document.getElementById('currentEmotion');
        if (!indicator) return;

        const colors = {
            joy: 'bg-yellow-400',
            love: 'bg-pink-400',
            calm: 'bg-blue-400',
            excited: 'bg-orange-400',
            sad: 'bg-gray-400',
            angry: 'bg-red-400',
            default: 'bg-blue-400'
        };
        
        indicator.innerHTML = `
            <div class="w-3 h-3 ${colors[emotion]} rounded-full animate-pulse" title="${emotion.charAt(0).toUpperCase() + emotion.slice(1)}"></div>
        `;
    }
    
    showChatList() {
        // Clean up message listener
        if (this.messageListener) {
            this.messageListener();
            this.messageListener = null;
        }
        
        this.currentChatId = null;
        document.getElementById('no-chat-view').style.display = 'flex';
        document.getElementById('active-chat-view').style.display = 'none';
        this.renderChatList();
    }
    
    showModal(modalId) {
        this.closeAllModals();
        document.getElementById(modalId).style.display = 'flex';
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    handleChatTypeSelection(type) {
        this.closeAllModals();
        this.showCreateGroupModal(type);
    }
    
    showCreateGroupModal(type) {
        const modalTitle = document.getElementById('group-modal-title');
        modalTitle.textContent = `Create ${type.charAt(0).toUpperCase() + type.slice(1)} Group`;
        
        document.getElementById('group-type').value = type;
        this.loadAvailableMembers();
        
        this.showModal('create-group-modal');
    }
    
    loadAvailableMembers() {
        const container = document.getElementById('available-members');
        
        const membersHTML = this.users.map(user => `
            <div class="member-item">
                <input type="checkbox" id="member-${user.id}" value="${user.id}">
                <label for="member-${user.id}">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${user.online ? '#27ae60' : '#bdc3c7'}"></div>
                        ${user.name} (${user.role})
                    </div>
                </label>
            </div>
        `).join('');
        
        container.innerHTML = membersHTML;
    }
    
    async createGroup(e) {
        e.preventDefault();
        
        const groupName = document.getElementById('group-name').value;
        const groupType = document.getElementById('group-type').value;
        
        if (!groupName.trim()) {
            this.showNotification('Please enter a group name', 'warning');
            return;
        }
        
        // Get selected members
        const selectedMembers = [];
        document.querySelectorAll('#available-members input:checked').forEach(input => {
            selectedMembers.push(input.value);
        });
        
        if (selectedMembers.length === 0) {
            this.showNotification('Please select at least one member', 'warning');
            return;
        }
        
        // Add current user to members
        selectedMembers.push(this.currentUser.id);
        
        try {
            const chatData = {
                name: groupName,
                type: groupType,
                members: selectedMembers,
                createdBy: this.currentUser.id,
                avatarText: groupName.substring(0, 2).toUpperCase(),
                lastMessage: 'Group created',
                lastMessageTime: serverTimestamp(),
                lastRead: {
                    [this.currentUser.id]: serverTimestamp()
                }
            };
            
            // Create new chat in Firestore using modular SDK
            const chatsRef = collection(this.firestore, 'chats');
            await addDoc(chatsRef, chatData);
            
            // Close modal and show chat list
            this.closeAllModals();
            this.showChatList();
            
            this.showNotification(`${groupType.charAt(0).toUpperCase() + groupType.slice(1)} group created successfully`, 'success');
            
        } catch (error) {
            console.error('Error creating group:', error);
            this.showNotification('Error creating group', 'error');
        }
    }
    
    async showGroupInfoModal(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        
        if (!chat) return;
        
        document.getElementById('group-avatar-large').textContent = chat.avatarText || chat.name.substring(0, 2).toUpperCase();
        document.getElementById('info-group-name').textContent = chat.name;
        document.getElementById('info-group-type').textContent = `${chat.type.charAt(0).toUpperCase() + chat.type.slice(1)} Group`;
        document.getElementById('info-member-count').textContent = `${chat.members.length} members`;
        
        const membersList = document.getElementById('group-members-list');
        membersList.innerHTML = '';
        
        chat.members.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            memberItem.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="chat-avatar" style="width: 35px; height: 35px; font-size: 0.8rem;">
                            <span>${member.avatar}</span>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">${member.name}</div>
                            <div style="font-size: 0.8rem; color: #7f8c8d;">${member.role}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${member.online ? '#27ae60' : '#bdc3c7'}"></div>
                        ${member.id === this.currentUser.id ? '<span style="color: #3498db; font-size: 0.8rem; font-weight: 600;">You</span>' : ''}
                    </div>
                </div>
            `;
            membersList.appendChild(memberItem);
        });
        
        this.showModal('group-info-modal');
    }
    
    async leaveGroup() {
        if (!this.currentChatId) return;
        
        if (confirm('Are you sure you want to leave this group? This action cannot be undone.')) {
            try {
                const chatRef = doc(this.firestore, 'chats', this.currentChatId);
                const chat = await getDoc(chatRef);
                
                if (chat.exists) {
                    const members = chat.data().members;
                    const updatedMembers = members.filter(memberId => memberId !== this.currentUser.id);
                    
                    await updateDoc(chatRef, {
                        members: updatedMembers
                    });
                    
                    this.showNotification('You have left the group', 'info');
                    this.closeAllModals();
                    this.showChatList();
                }
                
            } catch (error) {
                console.error('Error leaving group:', error);
                this.showNotification('Error leaving group', 'error');
            }
        }
    }
    
    async markAsRead(chatId) {
        try {
            const chatRef = doc(this.firestore, 'chats', chatId);
            await updateDoc(chatRef, {
                [`lastRead.${this.currentUser.id}`]: serverTimestamp()
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }
    
    scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // Enhanced Features Implementation
    showEmotionAnalysis() {
        if (!this.currentChatId) {
            this.showNotification('Please select a chat first', 'warning');
            return;
        }
        this.showModal('emotionAnalysisModal');
        this.analyzeChatEmotions();
    }

    hideEmotionAnalysis() {
        this.closeModal('emotionAnalysisModal');
    }

    showDNATest() {
        if (!this.currentChatId) {
            this.showNotification('Please select a chat first', 'warning');
            return;
        }
        this.showModal('dnaTestModal');
        this.runFriendshipDNATest();
    }

    hideDNATest() {
        this.closeModal('dnaTestModal');
    }

    showTimeCapsule() {
        this.showModal('timeCapsuleModal');
    }

    hideTimeCapsule() {
        this.closeModal('timeCapsuleModal');
    }

    showCollabRoom() {
        if (!this.currentChatId) {
            this.showNotification('Please select a chat first', 'warning');
            return;
        }
        this.showModal('collabRoomModal');
    }

    hideCollabRoom() {
        this.closeModal('collabRoomModal');
    }

    showNearbyPulse() {
        this.showModal('nearbyPulseModal');
        this.loadNearbyPulse();
    }

    hideNearbyPulse() {
        this.closeModal('nearbyPulseModal');
    }

    showChallenges() {
        this.showModal('challengesModal');
        this.loadDailyChallenges();
    }

    hideChallenges() {
        this.closeModal('challengesModal');
    }

    showAddFriendModal() {
        this.showModal('addFriendModal');
    }

    hideAddFriendModal() {
        this.closeModal('addFriendModal');
    }

    showCreateGroupModal() {
        this.showModal('createGroupModal');
    }

    hideCreateGroupModal() {
        this.closeModal('createGroupModal');
    }

    // Stub implementations for enhanced features
    async analyzeChatEmotions() {
        const resultsDiv = document.getElementById('emotionAnalysisResults');
        resultsDiv.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-brain text-4xl text-blue-400 mb-4"></i>
                <p class="text-blue-300">Analyzing conversation emotions...</p>
            </div>
        `;
        
        // Simulate analysis
        setTimeout(() => {
            resultsDiv.innerHTML = `
                <div class="text-center">
                    <h3 class="text-lg font-semibold text-green-400 mb-4">Emotion Analysis Complete</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between"><span>Joy:</span><span>65%</span></div>
                        <div class="flex justify-between"><span>Love:</span><span>20%</span></div>
                        <div class="flex justify-between"><span>Calm:</span><span>10%</span></div>
                        <div class="flex justify-between"><span>Excited:</span><span>5%</span></div>
                    </div>
                </div>
            `;
        }, 2000);
    }

    async runFriendshipDNATest() {
        const resultsDiv = document.getElementById('dnaTestResults');
        resultsDiv.innerHTML = `
            <div class="text-center py-8">
                <div class="dna-helix mb-4">
                    <div class="dna-node" style="animation-delay: 0s"></div>
                    <div class="dna-node" style="animation-delay: 0.1s"></div>
                    <div class="dna-node" style="animation-delay: 0.2s"></div>
                    <div class="dna-node" style="animation-delay: 0.3s"></div>
                    <div class="dna-node" style="animation-delay: 0.4s"></div>
                </div>
                <p class="text-blue-300">Analyzing your connection...</p>
            </div>
        `;
        
        // Simulate analysis
        setTimeout(() => {
            resultsDiv.innerHTML = `
                <div class="text-center">
                    <h3 class="text-2xl font-bold text-green-400 mb-2">85% Match</h3>
                    <p class="text-blue-300 mb-4">Your friendship DNA is strong!</p>
                    <div class="grid grid-cols-2 gap-4 text-left">
                        <div class="bg-gray-800 p-3 rounded-lg">
                            <p class="text-sm text-blue-300">Communication</p>
                            <p class="text-lg font-bold text-green-400">92%</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg">
                            <p class="text-sm text-blue-300">Emotional Sync</p>
                            <p class="text-lg font-bold text-green-400">78%</p>
                        </div>
                    </div>
                </div>
            `;
        }, 3000);
    }

    async createTimeCapsule() {
        const message = document.getElementById('capsuleMessage').value;
        const date = document.getElementById('capsuleDate').value;
        const time = document.getElementById('capsuleTime').value;

        if (!message || !date || !time) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        this.showNotification('Time capsule created successfully!', 'success');
        this.hideTimeCapsule();
    }

    async loadNearbyPulse() {
        const contentDiv = document.getElementById('nearbyPulseContent');
        contentDiv.innerHTML = `
            <div class="space-y-4">
                <div class="glass-effect rounded-lg p-4">
                    <div class="flex items-center space-x-3 mb-2">
                        <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-white"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold">TechMeetup NYC</h4>
                            <p class="text-xs text-blue-300">0.5km away • 15 people active</p>
                        </div>
                    </div>
                    <p class="text-sm">Discussing AI and quantum computing trends</p>
                </div>
            </div>
        `;
    }

    async loadDailyChallenges() {
        const challenges = [
            { title: "Send 5 Messages", progress: "2/5", reward: "15 🪙" },
            { title: "Start New Conversation", progress: "0/1", reward: "20 🪙" },
            { title: "Use 3 Emotions", progress: "1/3", reward: "25 🪙" }
        ];

        const container = document.getElementById('challengesList');
        container.innerHTML = challenges.map(challenge => `
            <div class="glass-effect rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-semibold">${challenge.title}</h4>
                    <span class="text-sm text-yellow-400">${challenge.reward}</span>
                </div>
                <p class="text-sm text-blue-300">Progress: ${challenge.progress}</p>
            </div>
        `).join('');
    }

    async searchFriends() {
        const query = document.getElementById('friendSearchInput').value;
        const resultsDiv = document.getElementById('friendSearchResults');
        
        if (!query) {
            resultsDiv.innerHTML = '<p class="text-center text-blue-300 py-4">Enter a name to search</p>';
            return;
        }

        resultsDiv.innerHTML = '<p class="text-center text-blue-300 py-4">Searching...</p>';
        
        // Simulate search
        setTimeout(() => {
            resultsDiv.innerHTML = `
                <div class="space-y-2">
                    <div class="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                        <p class="font-semibold">${query} User</p>
                        <p class="text-sm text-blue-300">Online</p>
                    </div>
                </div>
            `;
        }, 1000);
    }

    async createGroupChat() {
        const groupName = document.getElementById('groupNameInput').value;
        const description = document.getElementById('groupDescription').value;

        if (!groupName) {
            this.showNotification('Please enter a group name', 'error');
            return;
        }

        this.showNotification(`Group "${groupName}" created successfully!`, 'success');
        this.hideCreateGroupModal();
    }

    startVideoCall() {
        this.showNotification('Video call feature coming soon!', 'info');
    }

    startVoiceMessage() {
        this.showNotification('Voice message feature coming soon!', 'info');
    }

    shareFile() {
        this.showNotification('File sharing feature coming soon!', 'info');
    }

    searchMessages() {
        this.showNotification('Message search feature coming soon!', 'info');
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
    
    updateCurrentUser() {
        if (this.currentUser) {
            document.getElementById('current-user-name').textContent = this.currentUser.name;
            document.getElementById('streakCount').textContent = this.currentUser.streak || 0;
            document.getElementById('connectcoinsCount').textContent = this.currentUser.connectcoins || 0;
            document.getElementById('userLevel').textContent = this.currentUser.level || 1;
            // Show chat app content
            document.getElementById('chat-app').style.display = 'flex';
            document.getElementById('loadingState').style.display = 'none';
        }
    }
    
    formatTime(date) {
        if (!date) return '';
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    formatDate(date) {
        if (!date) return '';
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }
    
    handleResize() {
        if (window.innerWidth > 768) {
            this.isSidebarVisible = true;
        }
    }
}

// Make the send function available globally for external use
window.sendQuickMessage = function(text, imageUrl = null) {
    if (window.chatSystem) {
        return window.chatSystem.quickSend(text, imageUrl);
    } else {
        console.error('Chat system not initialized');
        return Promise.reject('Chat system not initialized');
    }
};

// Emotion AI Class
class EmotionAI {
    constructor() {
        this.emotionKeywords = {
            joy: ['happy', 'excited', 'amazing', 'wonderful', 'great', 'love', 'awesome', 'fantastic', 'yay', '😊', '😄', '😂', '🥰'],
            love: ['love', 'heart', 'adore', 'cherish', 'romantic', 'beautiful', 'special', '❤️', '💕', '😍'],
            calm: ['peaceful', 'calm', 'relaxed', 'serene', 'quiet', 'chill', 'cool', '😌', '🌊', '☁️'],
            excited: ['wow', 'omg', 'incredible', 'unbelievable', 'amazing', 'thrilled', '🔥', '⚡', '🎉'],
            sad: ['sad', 'upset', 'unhappy', 'disappointed', 'sorry', '😢', '😔', '💔'],
            angry: ['angry', 'mad', 'frustrated', 'annoyed', 'hate', '😠', '👿', '💢']
        };
    }

    analyzeText(text) {
        const words = text.toLowerCase().split(' ');
        let emotionScores = {
            joy: 0, love: 0, calm: 0, excited: 0, sad: 0, angry: 0
        };

        words.forEach(word => {
            for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
                if (keywords.includes(word)) {
                    emotionScores[emotion]++;
                }
            }
        });

        const emojis = text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || [];
        emojis.forEach(emoji => {
            for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
                if (keywords.includes(emoji)) {
                    emotionScores[emotion] += 2;
                }
            }
        });

        return this.getDominantEmotion(emotionScores);
    }

    getDominantEmotion(scores) {
        let maxScore = 0;
        let dominantEmotion = 'default';

        for (const [emotion, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        }

        return maxScore > 0 ? dominantEmotion : 'default';
    }
}

// Gamification System
class GamificationSystem {
    constructor(user) {
        this.user = user;
    }

    async loadUserProgress() {
        console.log('Loading user progress...');
    }

    addConnectcoins(amount) {
        if (this.user.connectcoins === undefined) {
            this.user.connectcoins = 0;
        }
        this.user.connectcoins += amount;
        
        document.getElementById('connectcoinsCount').textContent = this.user.connectcoins;
        
        this.saveUserProgress();
    }

    addXP(amount) {
        if (this.user.xp === undefined) {
            this.user.xp = 0;
        }
        this.user.xp += amount;
        
        const xpForNextLevel = this.user.level * 100;
        if (this.user.xp >= xpForNextLevel) {
            this.levelUp();
        }
        
        this.saveUserProgress();
    }

    levelUp() {
        this.user.level++;
        this.user.xp = 0;
        const levelBonus = this.user.level * 50;
        this.addConnectcoins(levelBonus);
        
        document.getElementById('userLevel').classList.add('level-up-flash');
        setTimeout(() => {
            document.getElementById('userLevel').classList.remove('level-up-flash');
        }, 500);
        
        if (window.chatSystem) {
            window.chatSystem.showNotification(`🎉 Level Up! You reached level ${this.user.level} (+${levelBonus} ConnectCoins)`, 'success');
        }
    }

    async saveUserProgress() {
        console.log('Saving user progress...');
    }
}

// Initialize the chat system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        if (typeof firebase === 'undefined') {
            const firebaseScript = document.createElement('script');
            firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
            document.head.appendChild(firebaseScript);
            
            const firestoreScript = document.createElement('script');
            firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
            document.head.appendChild(firestoreScript);
            
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
            document.head.appendChild(authScript);
            
            const storageScript = document.createElement('script');
            storageScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js';
            document.head.appendChild(storageScript);
            
            firebaseScript.onload = () => {
                window.chatSystem = new ProfessionalChatSystem();
            };
        } else {
            window.chatSystem = new ProfessionalChatSystem();
        }
        
    } catch (error) {
        console.error('❌ Error initializing chat system:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        errorDiv.textContent = 'Error loading chat system. Please refresh the page.';
        document.body.appendChild(errorDiv);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfessionalChatSystem;
}