// app.js - Tab Controller for Kynecta (chat.html contains all tabs)
// Manages visibility of tab panels within chat.html

// ============================================================================
// CONFIGURATION - Based on your chat.html structure
// ============================================================================

// Map tab names to their container IDs in chat.html
const TAB_CONFIG = {
  chats: {
    container: '#chatsTab',
    icon: '[data-tab="chats"]',
    default: true
  },
  groups: {
    // Check if groups tab exists in chat.html or needs separate loading
    container: '#groupsTab',
    icon: '[data-tab="groups"]',
    isExternal: false // Set to true if you want to load from group.html
  },
  friends: {
    container: '#friendsTab',
    icon: '[data-tab="friends"]',
    isExternal: false
  },
  calls: {
    container: '#callsTab',
    icon: '[data-tab="calls"]',
    isExternal: false
  },
  tools: {
    container: '#toolsTab',
    icon: '[data-tab="tools"]',
    isExternal: false
  }
};

// If you DO want to load groups from separate file, update this:
const EXTERNAL_TABS = {
  groups: 'group.html' // Only if groups should load from external file
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentTab = 'chats';
let isLoading = false;

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

/**
 * Switch to a specific tab
 */
function switchTab(tabName) {
  if (currentTab === tabName || isLoading) return;
  
  const config = TAB_CONFIG[tabName];
  if (!config) {
    console.error(`Tab "${tabName}" not found in config`);
    return;
  }
  
  // Check if this is an external tab that needs loading
  if (config.isExternal && EXTERNAL_TABS[tabName]) {
    loadExternalTab(tabName, EXTERNAL_TABS[tabName]);
    return;
  }
  
  // For internal tabs (already in chat.html)
  showTab(tabName);
}

/**
 * Show an internal tab (already present in chat.html)
 */
function showTab(tabName) {
  const config = TAB_CONFIG[tabName];
  if (!config) return;
  
  // Hide all tabs
  hideAllTabs();
  
  // Show the selected tab
  const tabContainer = document.querySelector(config.container);
  if (tabContainer) {
    tabContainer.classList.remove('hidden');
    tabContainer.classList.add('active');
  }
  
  // Update active tab UI
  updateActiveTabUI(tabName);
  
  // Update chat area visibility based on tab
  updateChatAreaVisibility(tabName);
  
  // Update current tab
  currentTab = tabName;
  
  console.log(`Switched to tab: ${tabName}`);
}

/**
 * Load an external tab from separate HTML file
 */
async function loadExternalTab(tabName, htmlFile) {
  if (isLoading) return;
  isLoading = true;
  
  try {
    // Show loading indicator
    showLoadingIndicator();
    
    // Fetch the external HTML
    const response = await fetch(htmlFile);
    if (!response.ok) throw new Error(`Failed to load ${htmlFile}`);
    
    const html = await response.text();
    
    // Create or get container for external content
    let container = document.getElementById('externalTabContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'externalTabContainer';
      container.className = 'tab-panel';
      
      // Insert after the tools tab or at the end of tab panels
      const tabPanels = document.querySelector('.tab-panels');
      if (tabPanels) {
        tabPanels.appendChild(container);
      }
    }
    
    // Hide all internal tabs
    hideAllTabs();
    
    // Load external content
    container.innerHTML = extractBodyContent(html);
    container.classList.remove('hidden');
    container.classList.add('active');
    
    // Update UI
    updateActiveTabUI(tabName);
    updateChatAreaVisibility(tabName);
    
    // Initialize any scripts in the external content
    initializeExternalContent(container);
    
    currentTab = tabName;
    
  } catch (error) {
    console.error(`Error loading ${tabName}:`, error);
    // Fallback to internal tab if available
    if (TAB_CONFIG[tabName] && !TAB_CONFIG[tabName].isExternal) {
      showTab(tabName);
    }
  } finally {
    isLoading = false;
    hideLoadingIndicator();
  }
}

/**
 * Hide all tab panels
 */
function hideAllTabs() {
  // Hide all tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('hidden');
    panel.classList.remove('active');
  });
  
  // Also hide external container if exists
  const externalContainer = document.getElementById('externalTabContainer');
  if (externalContainer) {
    externalContainer.classList.add('hidden');
    externalContainer.classList.remove('active');
  }
}

/**
 * Update the active tab UI in the sidebar
 */
function updateActiveTabUI(tabName) {
  // Remove active classes from all tab icons
  document.querySelectorAll('.nav-icon').forEach(icon => {
    icon.classList.remove('text-white', 'bg-purple-700', 'active');
    icon.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-800');
  });
  
  // Add active class to current tab icon
  const activeIcon = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeIcon) {
    activeIcon.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-800');
    activeIcon.classList.add('text-white', 'bg-purple-700', 'active');
  }
}

/**
 * Update chat area visibility based on active tab
 */
function updateChatAreaVisibility(tabName) {
  const chatArea = document.getElementById('chatArea');
  const chatListContainer = document.getElementById('chatListContainer');
  const inputArea = document.getElementById('inputArea');
  const chatHeader = document.getElementById('chatHeader');
  
  if (!chatArea || !chatListContainer) return;
  
  const isMobile = window.innerWidth < 768;
  
  if (tabName === 'chats' || tabName === 'groups') {
    // For chat-related tabs
    
    if (chatHeader && !chatHeader.classList.contains('hidden')) {
      // If we're in a chat conversation
      if (isMobile) {
        chatArea.classList.remove('hidden');
        chatListContainer.classList.add('hidden');
      }
      
      if (inputArea) {
        inputArea.classList.remove('hidden');
      }
    } else {
      // If we're in the chat list
      chatArea.classList.add('hidden');
      chatListContainer.classList.remove('hidden');
    }
  } else {
    // For non-chat tabs (friends, calls, tools)
    chatArea.classList.add('hidden');
    chatListContainer.classList.remove('hidden');
    
    if (inputArea) inputArea.classList.add('hidden');
    if (chatHeader) chatHeader.classList.add('hidden');
  }
  
  // Special handling for groups tab
  if (tabName === 'groups') {
    const chatTitle = document.getElementById('chatTitle');
    if (chatTitle) chatTitle.textContent = 'Group Chat';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractBodyContent(html) {
  // Simple extraction - gets content between <body> tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1];
  }
  return html;
}

function initializeExternalContent(container) {
  // Find and execute any script tags in the loaded content
  const scripts = container.querySelectorAll('script');
  scripts.forEach(script => {
    if (script.src) {
      // External script - load it
      const newScript = document.createElement('script');
      newScript.src = script.src;
      document.head.appendChild(newScript);
    } else {
      // Inline script - execute it
      try {
        eval(script.textContent);
      } catch (error) {
        console.error('Error executing inline script:', error);
      }
    }
  });
}

function showLoadingIndicator() {
  // Create or show loading indicator
  let loader = document.getElementById('tab-loading');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'tab-loading';
    loader.className = 'tab-loading-indicator';
    loader.innerHTML = `
      <div class="loading-spinner"></div>
      <div>Loading ${currentTab}...</div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

function hideLoadingIndicator() {
  const loader = document.getElementById('tab-loading');
  if (loader) {
    loader.style.display = 'none';
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  // Tab click handlers
  document.querySelectorAll('.nav-icon[data-tab]').forEach(icon => {
    // Replace existing onclick with event listener
    const tabName = icon.getAttribute('data-tab');
    
    // Remove any existing listeners
    const newIcon = icon.cloneNode(true);
    icon.parentNode.replaceChild(newIcon, icon);
    
    // Add new listener
    newIcon.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tabName);
    });
  });
  
  // Mobile back button
  const backToChats = document.getElementById('backToChats');
  if (backToChats) {
    backToChats.addEventListener('click', () => {
      const chatListContainer = document.getElementById('chatListContainer');
      const chatArea = document.getElementById('chatArea');
      if (chatListContainer && chatArea) {
        chatListContainer.classList.remove('hidden');
        chatArea.classList.add('hidden');
      }
    });
  }
  
  // Mobile chat item clicks
  document.addEventListener('click', (e) => {
    if (e.target.closest('.chat-item')) {
      const chatListContainer = document.getElementById('chatListContainer');
      const chatArea = document.getElementById('chatArea');
      if (chatListContainer && chatArea) {
        chatListContainer.classList.add('hidden');
        chatArea.classList.remove('hidden');
      }
    }
  });
  
  // Window resize handling
  window.addEventListener('resize', () => {
    updateChatAreaVisibility(currentTab);
  });
}

// ============================================================================
// OVERLAY MANAGEMENT (for compatibility)
// ============================================================================

// Simple overlay functions for compatibility with existing onclick handlers
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.showSettingsSection = function(sectionName) {
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.classList.add('hidden');
  }
  
  const modalId = sectionName + 'SettingsModal';
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
};

window.openSettingsModal = function() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
};

window.triggerFileInput = function(inputId) {
  const fileInput = document.getElementById(inputId);
  if (fileInput) {
    fileInput.click();
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
  console.log('Initializing Kynecta Tab Controller...');
  
  // Setup event listeners
  setupEventListeners();
  
  // Show default tab
  const defaultTab = Object.keys(TAB_CONFIG).find(tab => TAB_CONFIG[tab].default) || 'chats';
  switchTab(defaultTab);
  
  // Hide loading screen
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 500);
  }
  
  // Inject CSS for loading indicator
  injectStyles();
  
  console.log('Kynecta Tab Controller initialized');
}

function injectStyles() {
  const styles = `
    .tab-loading-indicator {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-size: 16px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #8b5cf6;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 15px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// ============================================================================
// PUBLIC API
// ============================================================================

// Expose for HTML onclick handlers
window.switchTab = switchTab;
window.showChatArea = function() {
  const chatListContainer = document.getElementById('chatListContainer');
  const chatArea = document.getElementById('chatArea');
  if (chatListContainer && chatArea) {
    chatListContainer.classList.add('hidden');
    chatArea.classList.remove('hidden');
  }
};

window.showChatList = function() {
  const chatListContainer = document.getElementById('chatListContainer');
  const chatArea = document.getElementById('chatArea');
  if (chatListContainer && chatArea) {
    chatListContainer.classList.remove('hidden');
    chatArea.classList.add('hidden');
  }
};

// ============================================================================
// STARTUP
// ============================================================================

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  setTimeout(initializeApp, 100);
}

console.log('Kynecta app.js loaded - Tab controller ready');