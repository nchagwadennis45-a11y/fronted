// Add this import at the top of your existing app.js
import authStorage from './authStorage.js';

// Add these methods to your existing App class in app.js:
class App {
  constructor() {
    // ... your existing constructor ...
    
    // ADD these properties if not already there
    this.user = null;
    this.isOffline = false;
  }

  // MODIFY your existing init method or add if not exists:
  async init() {
    // ADD this check for authentication state
    const authState = authStorage.getAuthState();
    this.isOffline = authState.isOfflineMode;
    
    if (authState.isAuthenticated) {
      this.user = authState.offlineUser || await this.fetchUserProfile();
      this.renderUI();
      this.updateOfflineIndicator();
      
      // Check for queued messages
      if (authState.queuedMessages > 0) {
        this.showQueuedMessagesNotification(authState.queuedMessages);
      }
    }
    
    // ADD these event listeners
    window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));
    
    // ... your existing init logic ...
  }

  // ADD this method to handle online/offline status changes:
  handleOnlineStatusChange() {
    const wasOffline = this.isOffline;
    this.isOffline = !navigator.onLine;
    
    if (wasOffline && !this.isOffline) {
      // Came back online - attempt sync
      this.syncOfflineData();
    }
    
    this.updateOfflineIndicator();
    
    if (this.isOffline && this.user) {
      this.showOfflineNotification();
    }
  }

  // ADD this method to update UI offline indicator:
  updateOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (!indicator) return;
    
    indicator.style.display = this.isOffline ? 'block' : 'none';
    indicator.textContent = this.isOffline ? 
      `⚫ Offline Mode - Using local data` : 
      '🟢 Online';
    
    // Update UI elements based on offline status
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
      sendButton.disabled = this.isOffline;
      sendButton.title = this.isOffline ? 
        'Message queued for sending when back online' : 
        'Send message';
    }
  }

  // ADD this method for offline notifications:
  showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
      <p>You're currently offline. Working with local data.</p>
      <p>Messages will be queued and sent when you're back online.</p>
      <button onclick="this.parentElement.remove()">OK</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // ADD this method for queued messages notification:
  showQueuedMessagesNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'queued-notification';
    notification.innerHTML = `
      <p>You have ${count} message(s) queued for sending.</p>
      <button onclick="app.syncOfflineData()">Send Now</button>
      <button onclick="this.parentElement.remove()">Dismiss</button>
    `;
    document.body.appendChild(notification);
  }

  // ADD this method to sync offline data:
  async syncOfflineData() {
    if (!this.apiClient) return;
    
    const result = await this.apiClient.syncOfflineData();
    
    if (result.synced && result.syncedCount > 0) {
      this.showSyncNotification(result.syncedCount);
    }
  }

  // ADD this method for sync notifications:
  showSyncNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.innerHTML = `
      <p>Successfully sent ${count} queued message(s).</p>
      <button onclick="this.parentElement.remove()">OK</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  // MODIFY your existing sendMessage method (or add if not exists) to handle offline:
  async sendMessage(content) {
    const message = {
      type: 'chat',
      data: {
        content: content,
        senderId: this.user.id,
        timestamp: Date.now()
      },
      recipientId: this.currentChatId
    };
    
    if (this.isOffline) {
      // Queue message locally
      const localId = authStorage.addToMessageQueue(message);
      
      // Show local message in UI immediately
      this.renderLocalMessage(content, localId);
      
      // Show queued status
      this.showMessageQueuedNotification();
      
      return { localId, queued: true };
    } else {
      // Send normally via API (your existing logic)
      return await this.apiClient.sendMessage(message);
    }
  }

  // ADD this method to render local messages:
  renderLocalMessage(content, localId) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message local-message';
    messageElement.id = `msg_${localId}`;
    messageElement.innerHTML = `
      <div class="message-content">${content}</div>
      <div class="message-status">⏳ Queued</div>
    `;
    
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.appendChild(messageElement);
    }
  }

  // ADD this method for message queued notification:
  showMessageQueuedNotification() {
    const notification = document.createElement('div');
    notification.className = 'message-queued-notification';
    notification.innerHTML = `
      <p>Message queued for sending when back online.</p>
      <button onclick="this.parentElement.remove()">OK</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  // MODIFY your existing logout method (or add if not exists):
  logout() {
    // Clear both online and offline auth
    authStorage.clearAuth();
    
    // Update UI
    this.user = null;
    this.isOffline = false;
    this.renderUI(); // Your existing renderUI method
  }

  // ... rest of your existing methods ...
}

// ADD this if you want to make app available globally
window.app = window.app || new App();