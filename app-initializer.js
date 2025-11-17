// app-initializer.js
class AppInitializer {
    constructor() {
        this.isInitialized = false;
        this.components = new Map();
        this.loadingStates = new Map();
        this.init();
    }

    init() {
        this.setupLoadingStates();
        this.setupDOMReady();
        this.setupErrorHandling();
    }

    setupLoadingStates() {
        // Define loading states for all components
        this.loadingStates.set('core', false);
        this.loadingStates.set('ui', false);
        this.loadingStates.set('users', false);
        this.loadingStates.set('messaging', false);
        this.loadingStates.set('calls', false);
        this.loadingStates.set('settings', false);
    }

    setupDOMReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        console.log('🏗️ DOM Ready - Initializing app structure');
        this.createAppContainer();
        this.setupComponentBoundaries();
        this.preventExternalRendering();
    }

    createAppContainer() {
        // Ensure app container exists
        if (!document.querySelector('.app-container')) {
            const appContainer = document.createElement('div');
            appContainer.className = 'app-container';
            
            // Move existing body content into app container
            while (document.body.firstChild) {
                appContainer.appendChild(document.body.firstChild);
            }
            
            document.body.appendChild(appContainer);
        }

        // Create loading overlay if it doesn't exist
        if (!document.querySelector('.loading-overlay')) {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Initializing Kynecta Chat...</div>
            `;
            document.querySelector('.app-container').prepend(loadingOverlay);
        }
    }

    setupComponentBoundaries() {
        // Create main components container
        const componentsContainer = document.createElement('div');
        componentsContainer.className = 'components-container';
        componentsContainer.id = 'main-components-container';
        
        // Move relevant components into the container
        const componentsToMove = [
            '.status-stories-container',
            '.contacts-container', 
            '.chat-messages-container',
            '.user-profile-container',
            '.sidebar',
            '.chat-area'
        ];

        componentsToMove.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                componentsContainer.appendChild(element);
            }
        });

        document.querySelector('.app-container').appendChild(componentsContainer);
    }

    preventExternalRendering() {
        // Override problematic rendering functions
        this.overrideRenderingMethods();
        this.setupComponentWatcher();
    }

    overrideRenderingMethods() {
        // Store original methods
        const originalAppendChild = Element.prototype.appendChild;
        const originalInsertBefore = Element.prototype.insertBefore;
        const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;

        // Override appendChild
        Element.prototype.appendChild = function(child) {
            if (this.shouldRestrictChild(child)) {
                console.warn('🚫 Component rendering restricted:', child);
                return this.getFallbackContainer().appendChild(child);
            }
            return originalAppendChild.call(this, child);
        };

        // Override insertBefore
        Element.prototype.insertBefore = function(newNode, referenceNode) {
            if (this.shouldRestrictChild(newNode)) {
                console.warn('🚫 Component rendering restricted:', newNode);
                return this.getFallbackContainer().insertBefore(newNode, referenceNode);
            }
            return originalInsertBefore.call(this, newNode, referenceNode);
        };

        // Override innerHTML setter
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(value) {
                if (this.shouldRestrictHTML(value)) {
                    console.warn('🚫 HTML setting restricted for element:', this);
                    value = this.sanitizeHTML(value);
                }
                originalInnerHTMLSetter.call(this, value);
            },
            get: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').get
        });
    }

    setupComponentWatcher() {
        // Watch for dynamically created elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.validateNodePosition(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    validateNodePosition(node) {
        const restrictedSelectors = [
            '[data-chat-component]',
            '[data-status-component]',
            '[data-user-component]',
            '.chat-',
            '.status-',
            '.user-',
            '.message-'
        ];

        const isRestricted = restrictedSelectors.some(selector => 
            node.matches?.(selector) || 
            node.querySelector?.(selector) ||
            node.className?.includes?.(selector.replace('.', '')) ||
            node.id?.includes?.(selector.replace('#', ''))
        );

        if (isRestricted && !this.isInValidContainer(node)) {
            console.warn('🚫 Moving restricted component to valid container:', node);
            this.moveToValidContainer(node);
        }
    }

    isInValidContainer(node) {
        const validContainers = [
            '#main-components-container',
            '.components-container',
            '.chat-area',
            '.sidebar-area',
            '.app-container'
        ];

        return validContainers.some(container => 
            node.closest?.(container) || 
            document.querySelector(container)?.contains?.(node)
        );
    }

    moveToValidContainer(node) {
        const componentsContainer = document.querySelector('#main-components-container') || 
                                  document.querySelector('.components-container') ||
                                  document.querySelector('.app-container');
        
        if (componentsContainer && node.parentNode !== componentsContainer) {
            componentsContainer.appendChild(node);
        }
    }

    // Component registration system
    registerComponent(name, component) {
        this.components.set(name, component);
        this.setComponentReady(name);
    }

    setComponentReady(name) {
        this.loadingStates.set(name, true);
        this.checkAllComponentsReady();
    }

    checkAllComponentsReady() {
        const allReady = Array.from(this.loadingStates.values()).every(state => state);
        
        if (allReady && !this.isInitialized) {
            this.finalizeInitialization();
        }
    }

    finalizeInitialization() {
        console.log('🎉 All components ready - Finalizing app initialization');
        this.isInitialized = true;

        // Show main components
        const componentsContainer = document.querySelector('.components-container');
        if (componentsContainer) {
            componentsContainer.classList.add('loaded');
        }

        // Hide loading overlay
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.remove();
            }, 300);
        }

        // Mark all components as initialized
        document.querySelectorAll('[data-component]').forEach(component => {
            component.setAttribute('data-initialized', 'true');
        });

        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('app:initialized'));
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('🚨 Global error:', event.error);
            this.handleError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
        });
    }

    handleError(error) {
        // Implement error recovery logic
        console.error('Error handled by AppInitializer:', error);
    }
}

// Font Awesome fallback handler
class FontAwesomeFallback {
    constructor() {
        this.loadFontAwesome();
    }

    async loadFontAwesome() {
        try {
            // Try to load from CDN first
            await this.loadFromCDN();
        } catch (error) {
            console.warn('📦 Font Awesome CDN blocked, using fallback icons');
            this.activateFallbacks();
        }
    }

    loadFromCDN() {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
            
            // Timeout fallback
            setTimeout(() => {
                if (!link.sheet) {
                    reject(new Error('Font Awesome load timeout'));
                }
            }, 5000);
        });
    }

    activateFallbacks() {
        // Add fallback CSS class
        document.documentElement.classList.add('fa-fallback');
        
        // Replace Font Awesome icons with fallbacks
        document.querySelectorAll('.fas, .far, .fab').forEach(icon => {
            const iconName = this.getIconName(icon);
            const fallbackIcon = this.createFallbackIcon(iconName, icon);
            icon.parentNode.replaceChild(fallbackIcon, icon);
        });
    }

    getIconName(icon) {
        return Array.from(icon.classList)
            .find(className => className.startsWith('fa-'))
            ?.replace('fa-', '') || 'default';
    }

    createFallbackIcon(iconName, originalIcon) {
        const fallback = document.createElement('span');
        fallback.className = `icon-fallback icon-${iconName}`;
        fallback.innerHTML = originalIcon.innerHTML;
        
        // Copy styles and attributes
        fallback.style.cssText = originalIcon.style.cssText;
        Array.from(originalIcon.attributes).forEach(attr => {
            if (attr.name !== 'class') {
                fallback.setAttribute(attr.name, attr.value);
            }
        });
        
        return fallback;
    }
}

// Initialize everything when script loads
const appInitializer = new AppInitializer();
const fontAwesomeFallback = new FontAwesomeFallback();

// Export for use in other modules
window.AppInitializer = appInitializer;
window.FontAwesomeFallback = fontAwesomeFallback;