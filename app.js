// app.js - Application Shell & Tab Controller for Kynecta
// Manages the single-page application shell and tab visibility

// ============================================================================
// CONFIGURATION
// ============================================================================

// Application configuration
const APP_CONFIG = {
  defaultPage: 'group.html',
  contentArea: '#content-area',
  sidebar: '#sidebar',
  sidebarToggle: '#sidebarToggle'
};

// Map tab names to their container IDs in chat.html
const TAB_CONFIG = {
  chats: {
    container: '#chatsTab',
    icon: '[data-tab="chats"]',
    default: false
  },
  groups: {
    container: '#groupsTab',
    icon: '[data-tab="groups"]',
    isExternal: false
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

// External page configurations
const EXTERNAL_TABS = {
  groups: 'group.html'
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentTab = 'groups'; // Default to groups
let isLoading = false;
let isSidebarOpen = true;

// ============================================================================
// APPLICATION SHELL FUNCTIONS
// ============================================================================

/**
 * Toggle sidebar visibility on mobile
 */
window.toggleSidebar = function() {
  document.querySelector('.sidebar')?.classList.toggle('open');
};

/**
 * Load an HTML page into the content area without reloading
 */
window.loadPage = function(page) {
  fetch(page)
    .then(res => res.text())
    .then(html => {
      document.getElementById('content-area').innerHTML = html;
    })
    .catch(err => console.error("Load error:", err));
};

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
  
  // For internal tabs (already in DOM)
  showTab(tabName);
}

/**
 * Show an internal tab (already present in DOM)
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
    showLoadingIndicator(`Loading ${tabName}...`);
    
    const response = await fetch(htmlFile);
    if (!response.ok) throw new Error(`Failed to load ${htmlFile}`);
    
    const html = await response.text();
    
    let container = document.getElementById('externalTabContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'externalTabContainer';
      container.className = 'tab-panel';
      
      const tabPanels = document.querySelector('.tab-panels');
      if (tabPanels) {
        tabPanels.appendChild(container);
      }
    }
    
    hideAllTabs();
    
    container.innerHTML = extractBodyContent(html);
    container.classList.remove('hidden');
    container.classList.add('active');
    
    updateActiveTabUI(tabName);
    updateChatAreaVisibility(tabName);
    
    initializeExternalContent(container);
    
    currentTab = tabName;
    
  } catch (error) {
    console.error(`Error loading ${tabName}:`, error);
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
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('hidden');
    panel.classList.remove('active');
  });
  
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
  document.querySelectorAll('.nav-icon').forEach(icon => {
    icon.classList.remove('text-white', 'bg-purple-700', 'active');
    icon.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-800');
  });
  
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
    if (chatHeader && !chatHeader.classList.contains('hidden')) {
      if (isMobile) {
        chatArea.classList.remove('hidden');
        chatListContainer.classList.add('hidden');
      }
      
      if (inputArea) {
        inputArea.classList.remove('hidden');
      }
    } else {
      chatArea.classList.add('hidden');
      chatListContainer.classList.remove('hidden');
    }
  } else {
    chatArea.classList.add('hidden');
    chatListContainer.classList.remove('hidden');
    
    if (inputArea) inputArea.classList.add('hidden');
    if (chatHeader) chatHeader.classList.add('hidden');
  }
  
  if (tabName === 'groups') {
    const chatTitle = document.getElementById('chatTitle');
    if (chatTitle) chatTitle.textContent = 'Group Chat';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1];
  }
  return html;
}

function initializeExternalContent(container) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach(script => {
    if (script.src) {
      const newScript = document.createElement('script');
      newScript.src = script.src;
      document.head.appendChild(newScript);
    } else {
      try {
        eval(script.textContent);
      } catch (error) {
        console.error('Error executing inline script:', error);
      }
    }
  });
}

function showLoadingIndicator(message = 'Loading...') {
  let loader = document.getElementById('tab-loading');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'tab-loading';
    loader.className = 'tab-loading-indicator';
    loader.innerHTML = `
      <div class="loading-spinner"></div>
      <div>${message}</div>
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

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f87171;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10000;
    max-width: 300px;
  `;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  // Tab click handlers
  document.querySelectorAll('.nav-icon[data-tab]').forEach(icon => {
    const tabName = icon.getAttribute('data-tab');
    const newIcon = icon.cloneNode(true);
    icon.parentNode.replaceChild(newIcon, icon);
    
    newIcon.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tabName);
    });
  });
  
  // Sidebar toggle
  const sidebarToggle = document.querySelector(APP_CONFIG.sidebarToggle);
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
  
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
    
    // Ensure sidebar is visible on desktop
    const sidebar = document.querySelector(APP_CONFIG.sidebar);
    if (sidebar && window.innerWidth >= 768) {
      sidebar.classList.remove('hidden', 'translate-x-full');
      sidebar.classList.add('translate-x-0');
      isSidebarOpen = true;
    }
  });
  
  // Handle browser back/forward
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.page) {
      loadPage(event.state.page);
    }
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768 && isSidebarOpen) {
      const sidebar = document.querySelector(APP_CONFIG.sidebar);
      const toggleBtn = document.querySelector(APP_CONFIG.sidebarToggle);
      
      if (sidebar && 
          !sidebar.contains(e.target) && 
          toggleBtn && 
          !toggleBtn.contains(e.target)) {
        toggleSidebar();
      }
    }
  });
}

// ============================================================================
// OVERLAY MANAGEMENT (for compatibility)
// ============================================================================

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
  console.log('Initializing Kynecta Application Shell...');
  
  // Setup event listeners
  setupEventListeners();
  
  // Ensure sidebar and icons are visible
  const sidebar = document.querySelector(APP_CONFIG.sidebar);
  if (sidebar) {
    sidebar.classList.remove('hidden');
  }
  
  // Load default page
  loadPage(APP_CONFIG.defaultPage);
  
  // Set default tab to groups
  setTimeout(() => {
    switchTab('groups');
  }, 100);
  
  // Hide loading screen
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 500);
  }
  
  // Inject CSS styles
  injectStyles();
  
  console.log('Kynecta Application Shell initialized');
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
    
    /* Sidebar transition */
    #sidebar {
      transition: transform 0.3s ease-in-out;
    }
    
    /* Ensure content area takes remaining space */
    #content-area {
      flex: 1;
      overflow: auto;
    }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// ============================================================================
// PUBLIC API
// ============================================================================

// Expose application functions
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

// default load
window.addEventListener("DOMContentLoaded", () => {
  loadPage('group.html');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  setTimeout(initializeApp, 100);
}

console.log('Kynecta app.js loaded - Application shell ready');