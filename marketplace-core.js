// marketplace-core.js
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDHHyGgsSV18BcXrGgzi4C8frzDAE1C1zo",
    authDomain: "uniconnect-ee95c.firebaseapp.com",
    projectId: "uniconnect-ee95c",
    storageBucket: "uniconnect-ee95c.firebasestorage.app",
    messagingSenderId: "1003264444309",
    appId: "1:1003264444309:web:9f0307516e44d21e97d89c"
};

// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: "dhjnxa5rh",
    apiKey: "817591969559894",
    uploadPreset: "marketplace_upload" // Added upload preset for security
};

// Performance Monitoring
const performanceMetrics = {
    pageLoadStart: Date.now(),
    resourcesLoaded: 0,
    totalResources: 0,
    errors: []
};

// Initialize Firebase with proper checks
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.app();
    }
    console.warn('Firebase is not available');
    return null;
}

// Global State Management with Error Boundary
class ECommerceStore {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.cart = [];
        this.savedItems = [];
        this.wishlist = [];
        this.orders = [];
        this.addresses = [];
        this.categories = [];
        this.sellers = [];
        this.promotions = [];
        this.currentTheme = 'light';
        this.language = 'en';
        this.currency = 'NGN';
        this.recentlyViewed = [];
        this.comparisonList = [];
        this.abortController = null;
        this.searchDebounceTimer = null;
        
        // Analytics
        this.analytics = {
            pageViews: 0,
            searches: [],
            productViews: [],
            cartAdds: [],
            purchases: [],
            errors: []
        };

        this.init();
    }

    async init() {
        try {
            await this.waitForDOM();
            this.setupErrorHandling();
            await this.loadInitialData();
            this.setupEventListeners();
            this.setupServiceWorker();
            this.loadUserPreferences();
            this.updateUI();
            this.trackPageView();
        } catch (error) {
            this.handleError('Initialization failed', error);
        }
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            this.handleError('Global error', e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError('Unhandled promise rejection', e.reason);
        });
    }

    handleError(context, error) {
        console.error(`${context}:`, error);
        this.analytics.errors.push({
            context,
            error: error.message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        this.showToast('An unexpected error occurred. Please try again.', 'error');
    }

    // Input Validation Functions
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        return phoneRegex.test(phone);
    }

    validatePassword(password) {
        return password.length >= 8;
    }

    validateForm(formData) {
        const errors = [];

        if (formData.email && !this.validateEmail(formData.email)) {
            errors.push('Please enter a valid email address');
        }

        if (formData.phone && !this.validatePhone(formData.phone)) {
            errors.push('Please enter a valid phone number');
        }

        if (formData.password && !this.validatePassword(formData.password)) {
            errors.push('Password must be at least 8 characters long');
        }

        if (formData.firstName && formData.firstName.length < 2) {
            errors.push('First name must be at least 2 characters long');
        }

        if (formData.lastName && formData.lastName.length < 2) {
            errors.push('Last name must be at least 2 characters long');
        }

        return errors;
    }

    // Debounced Search Function
    debounceSearch(func, delay = 300) {
        return (...args) => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Image Lazy Loading
    setupLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                        
                        // Track image load performance
                        img.addEventListener('load', () => {
                            performanceMetrics.resourcesLoaded++;
                        });
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    async loadInitialData() {
        this.showLoading();
        
        try {
            // Cancel any pending requests
            if (this.abortController) {
                this.abortController.abort();
            }
            this.abortController = new AbortController();

            // Load categories
            this.categories = await this.fetchCategories();
            
            // Load products
            this.products = await this.fetchProducts();
            
            // Load promotions
            this.promotions = await this.fetchPromotions();
            
            // Check auth state
            await this.checkAuthState();
            
            // Setup lazy loading after products are loaded
            setTimeout(() => this.setupLazyLoading(), 100);
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.handleError('Initial data loading failed', error);
            }
        } finally {
            this.hideLoading();
        }
    }

    // Authentication System
    async checkAuthState() {
        try {
            const firebaseApp = initializeFirebase();
            if (firebaseApp) {
                firebaseApp.auth().onAuthStateChanged(async (user) => {
                    if (user) {
                        this.currentUser = await this.fetchUserData(user.uid);
                        await this.loadUserData();
                        this.updateUI();
                        this.showToast(`Welcome back, ${this.currentUser.firstName}!`, 'success');
                    } else {
                        this.currentUser = null;
                        this.updateUI();
                    }
                });
            } else {
                // Fallback for demo
                await this.loadDemoUser();
            }
        } catch (error) {
            this.handleError('Auth state check failed', error);
        }
    }

    async loadDemoUser() {
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
            try {
                this.currentUser = JSON.parse(demoUser);
                await this.loadUserData();
                this.updateUI();
            } catch (error) {
                console.error('Error loading demo user:', error);
                localStorage.removeItem('demoUser');
            }
        }
    }

    async login(email, password) {
        const validationErrors = this.validateForm({ email, password });
        if (validationErrors.length > 0) {
            this.showToast(validationErrors[0], 'error');
            return;
        }

        this.showLoading();
        try {
            const firebaseApp = initializeFirebase();
            if (firebaseApp) {
                const result = await firebaseApp.auth().signInWithEmailAndPassword(email, password);
                this.currentUser = await this.fetchUserData(result.user.uid);
            } else {
                // Demo login
                this.currentUser = {
                    uid: 'demo-user',
                    email: email,
                    firstName: 'Demo',
                    lastName: 'User',
                    phone: '+1234567890',
                    addresses: [],
                    preferences: {}
                };
                localStorage.setItem('demoUser', JSON.stringify(this.currentUser));
            }
            
            await this.loadUserData();
            this.updateUI();
            this.hideAuthModal();
            this.trackEvent('login', 'success');
            this.showToast('Login successful!', 'success');
        } catch (error) {
            this.trackEvent('login', 'error', error.message);
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async register(userData) {
        const validationErrors = this.validateForm(userData);
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => this.showToast(error, 'error'));
            return;
        }

        this.showLoading();
        try {
            const firebaseApp = initializeFirebase();
            if (firebaseApp) {
                const result = await firebaseApp.auth().createUserWithEmailAndPassword(userData.email, userData.password);
                await this.saveUserData(result.user.uid, userData);
                this.currentUser = await this.fetchUserData(result.user.uid);
            } else {
                // Demo registration
                this.currentUser = {
                    uid: 'demo-user-' + Date.now(),
                    ...userData,
                    addresses: [],
                    preferences: {}
                };
                localStorage.setItem('demoUser', JSON.stringify(this.currentUser));
            }
            
            await this.loadUserData();
            this.updateUI();
            this.hideAuthModal();
            this.trackEvent('registration', 'success');
            this.showToast('Registration successful!', 'success');
        } catch (error) {
            this.trackEvent('registration', 'error', error.message);
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        try {
            const firebaseApp = initializeFirebase();
            if (firebaseApp) {
                await firebaseApp.auth().signOut();
            } else {
                localStorage.removeItem('demoUser');
            }
            this.currentUser = null;
            this.cart = [];
            this.wishlist = [];
            this.updateUI();
            this.trackEvent('logout', 'success');
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            this.trackEvent('logout', 'error', error.message);
            this.showToast(error.message, 'error');
        }
    }

    // Product Management
    async fetchProducts(filters = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const products = [
                    {
                        id: '1',
                        name: 'Samsung Galaxy S23 Ultra',
                        price: 450000,
                        originalPrice: 520000,
                        category: 'smartphones',
                        images: ['https://res.cloudinary.com/dhjnxa5rh/image/upload/v1715000014/galaxy-s23.jpg'],
                        brand: 'Samsung',
                        rating: 4.8,
                        reviewCount: 1247,
                        stock: 15,
                        variants: [
                            { type: 'storage', values: ['256GB', '512GB', '1TB'] },
                            { type: 'color', values: ['Phantom Black', 'Cream', 'Green', 'Lavender'] }
                        ],
                        specifications: {
                            display: '6.8" Dynamic AMOLED',
                            camera: '200MP + 12MP + 10MP + 10MP',
                            battery: '5000mAh',
                            processor: 'Snapdragon 8 Gen 2'
                        },
                        seller: 'Samsung Official Store',
                        sponsored: true,
                        weight: 0.8
                    },
                    {
                        id: '2',
                        name: 'iPhone 15 Pro Max',
                        price: 650000,
                        originalPrice: 720000,
                        category: 'smartphones',
                        images: ['https://res.cloudinary.com/dhjnxa5rh/image/upload/v1715000015/iphone-15.jpg'],
                        brand: 'Apple',
                        rating: 4.9,
                        reviewCount: 1893,
                        stock: 8,
                        variants: [
                            { type: 'storage', values: ['256GB', '512GB', '1TB'] },
                            { type: 'color', values: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] }
                        ],
                        seller: 'Apple Authorized Reseller',
                        weight: 0.7
                    },
                    {
                        id: '3',
                        name: 'Nike Air Jordan 1',
                        price: 45000,
                        originalPrice: 55000,
                        category: 'fashion',
                        images: ['https://res.cloudinary.com/dhjnxa5rh/image/upload/v1715000016/jordan-1.jpg'],
                        brand: 'Nike',
                        rating: 4.7,
                        reviewCount: 892,
                        stock: 25,
                        variants: [
                            { type: 'size', values: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12'] },
                            { type: 'color', values: ['Black/Red', 'Black/White', 'Royal Blue'] }
                        ],
                        seller: 'Nike Official',
                        weight: 1.2
                    }
                ];
                resolve(products);
            }, 1000);
        });
    }

    // Cart Management
    addToCart(product, quantity = 1, variants = {}) {
        // Check inventory
        if (product.stock < quantity) {
            this.showToast(`Only ${product.stock} items available in stock`, 'error');
            return;
        }

        const cartItem = {
            id: Date.now().toString(),
            product: product,
            quantity: quantity,
            variants: variants,
            addedAt: new Date().toISOString()
        };

        const existingItem = this.cart.find(item => 
            item.product.id === product.id && 
            JSON.stringify(item.variants) === JSON.stringify(variants)
        );

        if (existingItem) {
            if (existingItem.quantity + quantity > product.stock) {
                this.showToast(`Cannot add more than ${product.stock} items`, 'error');
                return;
            }
            existingItem.quantity += quantity;
        } else {
            this.cart.push(cartItem);
        }

        this.saveCart();
        this.updateCartUI();
        this.trackEvent('add_to_cart', 'success', product.id);
        this.showToast('Product added to cart', 'success');
    }

    // Wishlist Management
    toggleWishlist(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingIndex = this.wishlist.findIndex(item => item.product.id === productId);
        
        if (existingIndex > -1) {
            this.wishlist.splice(existingIndex, 1);
            this.showToast('Product removed from wishlist', 'success');
            this.trackEvent('remove_from_wishlist', 'success', productId);
        } else {
            this.wishlist.push({
                id: Date.now().toString(),
                product: product,
                addedAt: new Date().toISOString()
            });
            this.showToast('Product added to wishlist', 'success');
            this.trackEvent('add_to_wishlist', 'success', productId);
        }
        
        this.saveWishlist();
        this.updateWishlistUI();
    }

    // Product Comparison
    addToComparison(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        if (this.comparisonList.length >= 4) {
            this.showToast('Maximum 4 products can be compared', 'error');
            return;
        }

        if (this.comparisonList.find(p => p.id === productId)) {
            this.showToast('Product already in comparison', 'info');
            return;
        }

        this.comparisonList.push(product);
        this.saveComparisonList();
        this.updateComparisonUI();
        this.showToast('Product added to comparison', 'success');
    }

    removeFromComparison(productId) {
        this.comparisonList = this.comparisonList.filter(p => p.id !== productId);
        this.saveComparisonList();
        this.updateComparisonUI();
        this.showToast('Product removed from comparison', 'success');
    }

    // Recently Viewed
    addToRecentlyViewed(product) {
        const existingIndex = this.recentlyViewed.findIndex(p => p.id === product.id);
        
        if (existingIndex > -1) {
            this.recentlyViewed.splice(existingIndex, 1);
        }
        
        this.recentlyViewed.unshift(product);
        
        // Keep only last 10 items
        if (this.recentlyViewed.length > 10) {
            this.recentlyViewed.pop();
        }
        
        this.saveRecentlyViewed();
        this.updateRecentlyViewedUI();
    }

    // Search System with Debouncing
    performSearch = this.debounceSearch(async function(query) {
        if (!query.trim()) return;
        
        const correctedQuery = await this.correctSpelling(query);
        if (correctedQuery !== query) {
            const searchInput = this.getSafeElement('searchInput');
            if (searchInput) searchInput.value = correctedQuery;
        }
        
        const results = await this.searchProducts(correctedQuery);
        this.displaySearchResults(results);
        this.trackEvent('search', 'success', correctedQuery);
    });

    // Localization and Currency
    setLanguage(lang) {
        this.language = lang;
        localStorage.setItem('language', lang);
        this.updateUI();
        this.showToast(`Language changed to ${this.getLanguageName(lang)}`, 'success');
    }

    setCurrency(currency) {
        this.currency = currency;
        localStorage.setItem('currency', currency);
        this.updateUI();
        this.showToast(`Currency changed to ${currency}`, 'success');
    }

    convertCurrency(amount, fromCurrency, toCurrency) {
        // Simple conversion rates (in real app, fetch from API)
        const rates = {
            'NGN': 1,
            'USD': 0.0012,
            'EUR': 0.0011,
            'GBP': 0.0009
        };
        
        const amountInNGN = amount / (rates[fromCurrency] || 1);
        return Math.round(amountInNGN * (rates[toCurrency] || 1));
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'fr': 'French',
            'es': 'Spanish'
        };
        return languages[code] || code;
    }

    // Analytics Tracking
    trackPageView() {
        this.analytics.pageViews++;
        console.log('Page view tracked:', this.analytics.pageViews);
    }

    trackEvent(category, action, label = '') {
        const event = {
            category,
            action,
            label,
            timestamp: new Date().toISOString(),
            userId: this.currentUser?.uid || 'anonymous'
        };
        
        console.log('Event tracked:', event);
        
        // In real app, send to analytics service
        if (category === 'purchase') {
            this.analytics.purchases.push(event);
        }
    }

    // Performance Monitoring
    measurePerformance() {
        const loadTime = Date.now() - performanceMetrics.pageLoadStart;
        const performanceData = {
            loadTime,
            resourcesLoaded: performanceMetrics.resourcesLoaded,
            totalResources: performanceMetrics.totalResources,
            errors: performanceMetrics.errors.length
        };
        
        console.log('Performance metrics:', performanceData);
        return performanceData;
    }

    // Safe DOM Element Getter
    getSafeElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    }

    // Enhanced UI Updates with Null Checks
    updateUI() {
        this.updateAuthUI();
        this.updateCartUI();
        this.updateProductDisplay();
        this.updateTheme();
        this.updateWishlistUI();
        this.updateComparisonUI();
        this.updateRecentlyViewedUI();
    }

    updateAuthUI() {
        const authSection = this.getSafeElement('authSection');
        const userSection = this.getSafeElement('userSection');
        const userName = this.getSafeElement('userName');

        if (authSection && userSection && userName) {
            if (this.currentUser) {
                authSection.classList.add('hidden');
                userSection.classList.remove('hidden');
                userName.textContent = this.currentUser.firstName || 'User';
            } else {
                authSection.classList.remove('hidden');
                userSection.classList.add('hidden');
                userName.textContent = 'Account';
            }
        }
    }

    // Enhanced Event Listeners with Null Checks
    setupEventListeners() {
        // Safe event listener attachment
        this.attachEventListener('loginBtn', 'click', () => this.showAuthModal('login'));
        this.attachEventListener('registerBtn', 'click', () => this.showAuthModal('register'));
        this.attachEventListener('logoutBtn', 'click', () => this.logout());

        // Auth forms
        this.attachFormListener('loginForm', 'submit', (e) => {
            e.preventDefault();
            const email = this.getSafeElement('loginEmail')?.value;
            const password = this.getSafeElement('loginPassword')?.value;
            if (email && password) this.login(email, password);
        });

        this.attachFormListener('registerForm', 'submit', (e) => {
            e.preventDefault();
            const formData = this.getRegisterFormData();
            this.register(formData);
        });

        // Cart and checkout
        this.attachEventListener('cartBtn', 'click', () => this.toggleCart());
        this.attachEventListener('checkoutBtn', 'click', () => this.showCheckoutModal());

        // Search with debouncing
        const searchInput = this.getSafeElement('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        }

        this.attachEventListener('searchBtn', 'click', () => this.performSearch(this.getSafeElement('searchInput')?.value));
        this.attachEventListener('voiceSearchBtn', 'click', () => this.startVoiceSearch());

        // Load saved data
        this.loadCart();
        this.loadOrders();
        this.loadWishlist();
        this.loadComparisonList();
        this.loadRecentlyViewed();
        
        // Setup modal close handlers
        this.setupModalCloseHandlers();
        this.setupCartCloseHandler();
        this.setupFormStepNavigation();
        this.setupOTPHandling();
    }

    attachEventListener(elementId, event, handler) {
        const element = this.getSafeElement(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    attachFormListener(formId, event, handler) {
        const form = this.getSafeElement(formId);
        if (form) {
            form.addEventListener(event, handler);
        }
    }

    // Enhanced Product Card Rendering
    createProductCard(product) {
        const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        
        return `
            <div class="product-card ${product.sponsored ? 'sponsored' : ''}" data-product-id="${product.id}">
                <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">
                    <span class="current-price">${this.formatCurrency(product.price)}</span>
                    ${product.originalPrice > product.price ? `
                        <span class="original-price">${this.formatCurrency(product.originalPrice)}</span>
                        <span class="discount">-${discount}%</span>
                    ` : ''}
                </div>
                <div class="product-rating">
                    <div class="rating-stars">
                        ${this.generateStarRating(product.rating)}
                    </div>
                    <span class="rating-count">(${product.reviewCount})</span>
                </div>
                <div class="product-stock ${product.stock < 10 ? 'low-stock' : ''}">
                    ${product.stock < 10 ? `Only ${product.stock} left` : 'In stock'}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart" onclick="store.addToCart(store.products.find(p => p.id === '${product.id}'), 1, {})">
                        Add to Cart
                    </button>
                    <button class="wishlist-btn" onclick="store.toggleWishlist('${product.id}')">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="compare-btn" onclick="store.addToComparison('${product.id}')">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Utility Functions
    escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#x27;');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: this.currency
        }).format(amount);
    }

    // Local Storage Management with Error Handling
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.handleError('Storage save failed', error);
        }
    }

    loadFromStorage(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    saveCart() {
        this.saveToStorage('cart', this.cart);
        this.saveToStorage('savedItems', this.savedItems);
    }

    loadCart() {
        this.cart = this.loadFromStorage('cart');
        this.savedItems = this.loadFromStorage('savedItems');
    }

    saveWishlist() {
        this.saveToStorage('wishlist', this.wishlist);
    }

    loadWishlist() {
        this.wishlist = this.loadFromStorage('wishlist');
    }

    saveComparisonList() {
        this.saveToStorage('comparisonList', this.comparisonList);
    }

    loadComparisonList() {
        this.comparisonList = this.loadFromStorage('comparisonList');
    }

    saveRecentlyViewed() {
        this.saveToStorage('recentlyViewed', this.recentlyViewed);
    }

    loadRecentlyViewed() {
        this.recentlyViewed = this.loadFromStorage('recentlyViewed');
    }

    // Voice Search with Fallback
    async startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showToast('Voice search not supported in your browser', 'error');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const searchInput = this.getSafeElement('searchInput');
            if (searchInput) {
                searchInput.value = transcript;
                this.performSearch(transcript);
            }
        };
        
        recognition.onerror = (event) => {
            this.showToast('Error with voice recognition: ' + event.error, 'error');
        };
        
        recognition.start();
    }

    // Shipping Calculator
    calculateShipping(address, items) {
        const baseRate = 1500; // NGN
        const weightRate = 200; // NGN per kg
        const distanceMultiplier = this.calculateDistanceMultiplier(address);
        
        const totalWeight = items.reduce((total, item) => total + (item.product.weight || 0.5) * item.quantity, 0);
        
        return Math.round((baseRate + (totalWeight * weightRate)) * distanceMultiplier);
    }

    calculateDistanceMultiplier(address) {
        // Simplified distance calculation
        const multipliers = {
            'Lagos': 1.0,
            'Abuja': 1.2,
            'Port Harcourt': 1.1,
            'Ibadan': 1.0,
            'Kano': 1.5,
            'default': 1.3
        };
        
        return multipliers[address?.state] || multipliers.default;
    }

    // Tax Calculation
    calculateTax(subtotal, state) {
        const taxRates = {
            'Lagos': 0.075,
            'Abuja': 0.065,
            'Rivers': 0.07,
            'default': 0.05
        };
        
        const rate = taxRates[state] || taxRates.default;
        return Math.round(subtotal * rate);
    }

    // Coupon Validation
    validateCoupon(code) {
        const coupons = {
            'WELCOME10': { discount: 0.1, type: 'percentage', minAmount: 5000, maxDiscount: 5000 },
            'SAVE20': { discount: 0.2, type: 'percentage', minAmount: 10000, maxDiscount: 10000 },
            'FREESHIP': { discount: 0, type: 'shipping', minAmount: 0 },
            'FLAT1000': { discount: 1000, type: 'fixed', minAmount: 5000 }
        };
        
        return coupons[code] || null;
    }

    // Order Tracking
    async trackOrder(orderId) {
        // Simulate API call with realistic order tracking
        return new Promise((resolve) => {
            setTimeout(() => {
                const statuses = [
                    { status: 'confirmed', message: 'Order confirmed', progress: 25 },
                    { status: 'processing', message: 'Preparing for shipment', progress: 50 },
                    { status: 'shipped', message: 'Shipped with carrier', progress: 75 },
                    { status: 'out_for_delivery', message: 'Out for delivery', progress: 90 },
                    { status: 'delivered', message: 'Delivered successfully', progress: 100 }
                ];
                
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                resolve({
                    orderId,
                    status: randomStatus.status,
                    message: randomStatus.message,
                    progress: randomStatus.progress,
                    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    trackingNumber: 'TRK' + Date.now().toString().slice(-8),
                    carrier: 'DHL Express',
                    trackingUrl: `https://www.dhl.com/track?trackingNumber=TRK${Date.now().toString().slice(-8)}`
                });
            }, 1000);
        });
    }

    // Push Notifications
    setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Push notifications granted');
                    
                    // Subscribe to push notifications
                    navigator.serviceWorker.ready.then(registration => {
                        registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
                        }).then(subscription => {
                            console.log('Push subscription successful:', subscription);
                            this.saveToStorage('pushSubscription', subscription);
                        }).catch(error => {
                            console.error('Push subscription failed:', error);
                        });
                    });
                }
            });
        }
    }

    sendNotification(title, options) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, options);
        }
    }

    // Service Worker with Offline Support
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('SW update found');
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showToast('New version available! Refresh to update.', 'info');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.type === 'CACHE_UPDATED') {
                    console.log('Cache updated:', event.data.payload);
                }
            });
        }
    }

    // Offline Functionality
    setupOfflineSupport() {
        window.addEventListener('online', () => {
            this.showToast('Connection restored', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.showToast('You are currently offline', 'warning');
        });

        // Check initial connection state
        if (!navigator.onLine) {
            this.showToast('You are currently offline', 'warning');
        }
    }

    async syncOfflineData() {
        // Sync any offline data when connection is restored
        const offlineActions = this.loadFromStorage('offlineActions', []);
        
        for (const action of offlineActions) {
            try {
                // Replay offline actions
                await this.replayOfflineAction(action);
            } catch (error) {
                console.error('Failed to sync offline action:', action, error);
            }
        }
        
        // Clear offline actions after successful sync
        this.saveToStorage('offlineActions', []);
    }

    // Additional UI Update Methods
    updateWishlistUI() {
        const container = this.getSafeElement('wishlistContainer');
        if (container) {
            if (this.wishlist.length === 0) {
                container.innerHTML = '<p class="empty-wishlist">Your wishlist is empty</p>';
            } else {
                container.innerHTML = this.wishlist.map(item => this.createWishlistItem(item)).join('');
            }
        }
    }

    updateComparisonUI() {
        const container = this.getSafeElement('comparisonContainer');
        if (container) {
            container.innerHTML = this.createComparisonTable();
        }
    }

    updateRecentlyViewedUI() {
        const container = this.getSafeElement('recentlyViewedContainer');
        if (container) {
            if (this.recentlyViewed.length === 0) {
                container.innerHTML = '<p class="empty-recent">No recently viewed products</p>';
            } else {
                container.innerHTML = this.recentlyViewed.slice(0, 6).map(product => this.createProductCard(product)).join('');
            }
        }
    }

    createWishlistItem(item) {
        return `
            <div class="wishlist-item" data-item-id="${item.id}">
                <img src="${item.product.images[0]}" alt="${item.product.name}" class="wishlist-item-image">
                <div class="wishlist-item-details">
                    <h4 class="wishlist-item-title">${item.product.name}</h4>
                    <div class="wishlist-item-price">${this.formatCurrency(item.product.price)}</div>
                    <button class="move-to-cart" onclick="store.addToCart(store.products.find(p => p.id === '${item.product.id}'), 1, {})">
                        Add to Cart
                    </button>
                    <button class="remove-wishlist" onclick="store.toggleWishlist('${item.product.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    createComparisonTable() {
        if (this.comparisonList.length === 0) {
            return '<p class="empty-comparison">No products to compare</p>';
        }

        const features = ['price', 'brand', 'rating', 'specifications'];
        
        return `
            <div class="comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>Feature</th>
                            ${this.comparisonList.map(product => `<th>${product.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${features.map(feature => `
                            <tr>
                                <td>${feature.charAt(0).toUpperCase() + feature.slice(1)}</td>
                                ${this.comparisonList.map(product => `
                                    <td>${this.getFeatureValue(product, feature)}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="comparison-actions">
                    <button class="clear-comparison" onclick="store.comparisonList = []; store.updateComparisonUI();">
                        Clear All
                    </button>
                </div>
            </div>
        `;
    }

    getFeatureValue(product, feature) {
        switch (feature) {
            case 'price':
                return this.formatCurrency(product.price);
            case 'brand':
                return product.brand;
            case 'rating':
                return this.generateStarRating(product.rating);
            case 'specifications':
                return Object.values(product.specifications || {}).join(', ');
            default:
                return product[feature] || 'N/A';
        }
    }

    // ==================== MISSING METHODS IMPLEMENTATION ====================

    // 1. Core UI Methods
    showAuthModal(mode = 'login') {
        const modal = this.getSafeElement('authModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
            switchAuthTab(mode);
        }
    }

    hideAuthModal() {
        const modal = this.getSafeElement('authModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        }
    }

    toggleCart() {
        const cartSidebar = this.getSafeElement('cartSidebar');
        if (cartSidebar) {
            cartSidebar.classList.toggle('active');
        }
    }

    showLoading() {
        const loading = this.getSafeElement('loadingSpinner');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loading = this.getSafeElement('loadingSpinner');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = this.getSafeElement('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // 2. Data Management
    async fetchUserData(userId) {
        try {
            const firebaseApp = initializeFirebase();
            if (firebaseApp) {
                const userDoc = await firebaseApp.firestore().collection('users').doc(userId).get();
                if (userDoc.exists) {
                    return userDoc.data();
                }
            }
            // Fallback demo data
            return {
                uid: userId,
                email: 'demo@example.com',
                firstName: 'Demo',
                lastName: 'User',
                phone: '+1234567890',
                addresses: [],
                preferences: {}
            };
        } catch (error) {
            this.handleError('Failed to fetch user data', error);
            throw error;
        }
    }

    async saveUserData(userId, userData) {
        try {
            const firebaseApp = initializeFirebase();
            if (firebaseApp) {
                await firebaseApp.firestore().collection('users').doc(userId).set({
                    ...userData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            // Always save to localStorage as backup
            localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        } catch (error) {
            this.handleError('Failed to save user data', error);
            throw error;
        }
    }

    async fetchCategories() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: 'smartphones', name: 'Smartphones', icon: '📱', productCount: 45 },
                    { id: 'fashion', name: 'Fashion', icon: '👕', productCount: 120 },
                    { id: 'electronics', name: 'Electronics', icon: '💻', productCount: 89 },
                    { id: 'home', name: 'Home & Garden', icon: '🏠', productCount: 67 },
                    { id: 'sports', name: 'Sports', icon: '⚽', productCount: 34 }
                ]);
            }, 800);
        });
    }

    async fetchPromotions() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: '1',
                        title: 'Summer Sale',
                        description: 'Up to 50% off on selected items',
                        discount: 50,
                        code: 'SUMMER50',
                        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        banner: 'https://res.cloudinary.com/dhjnxa5rh/image/upload/v1715000017/summer-sale.jpg'
                    },
                    {
                        id: '2',
                        title: 'Free Shipping',
                        description: 'Free shipping on orders over ₦10,000',
                        discount: 0,
                        code: 'FREESHIP',
                        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        banner: 'https://res.cloudinary.com/dhjnxa5rh/image/upload/v1715000018/free-shipping.jpg'
                    }
                ]);
            }, 600);
        });
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            // Load user-specific data
            this.wishlist = this.loadFromStorage(`wishlist_${this.currentUser.uid}`);
            this.addresses = this.loadFromStorage(`addresses_${this.currentUser.uid}`);
            this.orders = this.loadFromStorage(`orders_${this.currentUser.uid}`);
            
            // Load user preferences
            const preferences = this.loadFromStorage(`preferences_${this.currentUser.uid}`);
            if (preferences) {
                this.currentUser.preferences = preferences;
                if (preferences.theme) this.currentTheme = preferences.theme;
                if (preferences.language) this.language = preferences.language;
                if (preferences.currency) this.currency = preferences.currency;
            }
        } catch (error) {
            this.handleError('Failed to load user data', error);
        }
    }

    // 3. UI Update Methods
    updateProductDisplay() {
        const container = this.getSafeElement('productsContainer');
        if (container) {
            if (this.products.length === 0) {
                container.innerHTML = '<p class="empty-products">No products found</p>';
            } else {
                container.innerHTML = this.products.map(product => this.createProductCard(product)).join('');
            }
        }
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    // 4. Form Handling
    getRegisterFormData() {
        const form = this.getSafeElement('registerForm');
        if (!form) return {};

        return {
            firstName: this.getSafeElement('registerFirstName')?.value || '',
            lastName: this.getSafeElement('registerLastName')?.value || '',
            email: this.getSafeElement('registerEmail')?.value || '',
            phone: this.getSafeElement('registerPhone')?.value || '',
            password: this.getSafeElement('registerPassword')?.value || ''
        };
    }

    handleSearchInput(query) {
        if (query.length > 2) {
            this.performSearch(query);
        } else {
            this.displaySearchResults([]);
        }
    }

    displaySearchResults(results) {
        const container = this.getSafeElement('searchResults');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = '<div class="no-results">No products found</div>';
            container.classList.remove('active');
            return;
        }

        container.innerHTML = results.map(product => `
            <div class="search-result-item" onclick="store.addToRecentlyViewed(store.products.find(p => p.id === '${product.id}'))">
                <img src="${product.images[0]}" alt="${product.name}">
                <div class="search-result-info">
                    <h4>${product.name}</h4>
                    <div class="search-result-price">${this.formatCurrency(product.price)}</div>
                </div>
            </div>
        `).join('');

        container.classList.add('active');
    }

    async correctSpelling(query) {
        // Simple spelling correction - in real app, use a proper API
        const corrections = {
            'samsng': 'samsung',
            'iphne': 'iphone',
            'nke': 'nike',
            'adidas': 'adidas',
            'lg': 'lg'
        };

        return corrections[query.toLowerCase()] || query;
    }

    // 5. Event Handlers
    setupModalCloseHandlers() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const authModal = this.getSafeElement('authModal');
            if (authModal && authModal.classList.contains('active') && 
                !authModal.contains(e.target) && 
                !e.target.closest('.auth-trigger')) {
                this.hideAuthModal();
            }
        });

        // Close modal with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAuthModal();
                this.toggleCart(); // Close cart too
            }
        });
    }

    setupCartCloseHandler() {
        const closeCartBtn = this.getSafeElement('closeCartBtn');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => this.toggleCart());
        }
    }

    setupFormStepNavigation() {
        // Multi-step form navigation
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const currentStep = e.target.closest('.form-step');
                const nextStep = currentStep?.nextElementSibling;
                
                if (currentStep && nextStep) {
                    currentStep.classList.remove('active');
                    nextStep.classList.add('active');
                }
            });
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const currentStep = e.target.closest('.form-step');
                const prevStep = currentStep?.previousElementSibling;
                
                if (currentStep && prevStep) {
                    currentStep.classList.remove('active');
                    prevStep.classList.add('active');
                }
            });
        });
    }

    setupOTPHandling() {
        document.querySelectorAll('.otp-digit').forEach((input, index, inputs) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                
                // Auto-submit when all digits are filled
                if (inputs.every(inp => inp.value.length === 1)) {
                    this.verifyOTP(Array.from(inputs).map(inp => inp.value).join(''));
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });
    }

    verifyOTP(otp) {
        // Simulate OTP verification
        this.showLoading();
        setTimeout(() => {
            this.hideLoading();
            if (otp === '123456') { // Demo OTP
                this.showToast('OTP verified successfully!', 'success');
                this.hideAuthModal();
            } else {
                this.showToast('Invalid OTP. Please try again.', 'error');
            }
        }, 1500);
    }

    // 6. Service Methods
    async replayOfflineAction(action) {
        switch (action.type) {
            case 'add_to_cart':
                const product = this.products.find(p => p.id === action.payload.productId);
                if (product) {
                    this.addToCart(product, action.payload.quantity, action.payload.variants);
                }
                break;
                
            case 'toggle_wishlist':
                this.toggleWishlist(action.payload.productId);
                break;
                
            case 'update_profile':
                // Sync profile changes
                if (this.currentUser) {
                    await this.saveUserData(this.currentUser.uid, action.payload.userData);
                }
                break;
                
            default:
                console.warn('Unknown offline action:', action.type);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // 7. Performance Methods
    measurePerformance() {
        const loadTime = Date.now() - performanceMetrics.pageLoadStart;
        const performanceData = {
            loadTime,
            resourcesLoaded: performanceMetrics.resourcesLoaded,
            totalResources: performanceMetrics.totalResources,
            errors: performanceMetrics.errors.length,
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null
        };
        
        console.log('Performance metrics:', performanceData);
        return performanceData;
    }

    // 8. Business Logic
    calculateShipping(address, items) {
        const baseRate = 1500; // NGN
        const weightRate = 200; // NGN per kg
        const distanceMultiplier = this.calculateDistanceMultiplier(address);
        
        const totalWeight = items.reduce((total, item) => total + (item.product.weight || 0.5) * item.quantity, 0);
        
        return Math.round((baseRate + (totalWeight * weightRate)) * distanceMultiplier);
    }

    calculateDistanceMultiplier(address) {
        // Simplified distance calculation
        const multipliers = {
            'Lagos': 1.0,
            'Abuja': 1.2,
            'Port Harcourt': 1.1,
            'Ibadan': 1.0,
            'Kano': 1.5,
            'default': 1.3
        };
        
        return multipliers[address?.state] || multipliers.default;
    }

    calculateTax(subtotal, state) {
        const taxRates = {
            'Lagos': 0.075,
            'Abuja': 0.065,
            'Rivers': 0.07,
            'default': 0.05
        };
        
        const rate = taxRates[state] || taxRates.default;
        return Math.round(subtotal * rate);
    }

    validateCoupon(code) {
        const coupons = {
            'WELCOME10': { discount: 0.1, type: 'percentage', minAmount: 5000, maxDiscount: 5000 },
            'SAVE20': { discount: 0.2, type: 'percentage', minAmount: 10000, maxDiscount: 10000 },
            'FREESHIP': { discount: 0, type: 'shipping', minAmount: 0 },
            'FLAT1000': { discount: 1000, type: 'fixed', minAmount: 5000 }
        };
        
        return coupons[code] || null;
    }

    async trackOrder(orderId) {
        // Simulate API call with realistic order tracking
        return new Promise((resolve) => {
            setTimeout(() => {
                const statuses = [
                    { status: 'confirmed', message: 'Order confirmed', progress: 25 },
                    { status: 'processing', message: 'Preparing for shipment', progress: 50 },
                    { status: 'shipped', message: 'Shipped with carrier', progress: 75 },
                    { status: 'out_for_delivery', message: 'Out for delivery', progress: 90 },
                    { status: 'delivered', message: 'Delivered successfully', progress: 100 }
                ];
                
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                resolve({
                    orderId,
                    status: randomStatus.status,
                    message: randomStatus.message,
                    progress: randomStatus.progress,
                    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    trackingNumber: 'TRK' + Date.now().toString().slice(-8),
                    carrier: 'DHL Express',
                    trackingUrl: `https://www.dhl.com/track?trackingNumber=TRK${Date.now().toString().slice(-8)}`
                });
            }, 1000);
        });
    }

    // 9. Error Handling
    setupErrorBoundary() {
        // Global error boundary for React-like error handling
        window.addEventListener('error', (event) => {
            this.handleError('Global error', event.error);
            this.showFallbackUI();
        });

        // Network error handling
        window.addEventListener('offline', () => {
            this.showToast('You are currently offline. Some features may be limited.', 'warning');
        });

        // Resource loading errors
        document.addEventListener('error', (event) => {
            if (event.target.tagName === 'IMG') {
                event.target.src = 'https://res.cloudinary.com/dhjnxa5rh/image/upload/v1715000019/placeholder.jpg';
                event.target.alt = 'Image not available';
            }
        }, true);
    }

    showFallbackUI() {
        // Show fallback UI for critical errors
        const mainContent = this.getSafeElement('mainContent');
        if (mainContent && !mainContent.querySelector('.error-fallback')) {
            const fallbackHTML = `
                <div class="error-fallback">
                    <h2>Something went wrong</h2>
                    <p>We're having trouble loading this content. Please try refreshing the page.</p>
                    <button onclick="window.location.reload()" class="retry-btn">Retry</button>
                </div>
            `;
            mainContent.innerHTML += fallbackHTML;
        }
    }

    handleNetworkFailure(error) {
        console.error('Network failure:', error);
        
        // Save action for offline sync
        const offlineActions = this.loadFromStorage('offlineActions', []);
        offlineActions.push({
            type: 'network_failure',
            payload: { error: error.message, timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString()
        });
        this.saveToStorage('offlineActions', offlineActions);
        
        this.showToast('Network error. Your action will be synced when online.', 'warning');
    }

    logError(error, context = '') {
        const errorLog = {
            context,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Save to localStorage for error reporting
        const errorLogs = this.loadFromStorage('errorLogs', []);
        errorLogs.push(errorLog);
        this.saveToStorage('errorLogs', errorLogs);
        
        // In production, send to error reporting service
        console.error('Logged error:', errorLog);
    }

    reportErrors() {
        // Periodically report errors to backend
        const errorLogs = this.loadFromStorage('errorLogs', []);
        if (errorLogs.length > 0 && navigator.onLine) {
            // Simulate sending to error reporting service
            console.log('Reporting errors:', errorLogs);
            
            // Clear reported errors
            this.saveToStorage('errorLogs', []);
        }
    }

    // User Preferences
    loadUserPreferences() {
        const preferences = this.loadFromStorage('userPreferences');
        if (preferences) {
            this.currentTheme = preferences.theme || 'light';
            this.language = preferences.language || 'en';
            this.currency = preferences.currency || 'NGN';
            this.applyUserPreferences();
        }
    }

    saveUserPreferences() {
        const preferences = {
            theme: this.currentTheme,
            language: this.language,
            currency: this.currency
        };
        this.saveToStorage('userPreferences', preferences);
    }

    applyUserPreferences() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Apply language
        document.documentElement.lang = this.language;
    }

    updateTheme() {
        this.applyUserPreferences();
    }

    // Cart UI Update
    updateCartUI() {
        const cartCount = this.getSafeElement('cartCount');
        const cartItemsContainer = this.getSafeElement('cartItems');
        const cartTotal = this.getSafeElement('cartTotal');
        
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        if (cartItemsContainer) {
            if (this.cart.length === 0) {
                cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            } else {
                cartItemsContainer.innerHTML = this.cart.map(item => this.createCartItem(item)).join('');
            }
        }
        
        if (cartTotal) {
            const total = this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
            cartTotal.textContent = this.formatCurrency(total);
        }
    }

    createCartItem(item) {
        return `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.product.images[0]}" alt="${item.product.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.product.name}</h4>
                    <div class="cart-item-variants">
                        ${Object.entries(item.variants).map(([key, value]) => 
                            `<span class="variant">${key}: ${value}</span>`
                        ).join('')}
                    </div>
                    <div class="cart-item-price">${this.formatCurrency(item.product.price)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="store.updateCartQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="store.updateCartQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <button class="remove-cart-item" onclick="store.removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    updateCartQuantity(itemId, newQuantity) {
        const item = this.cart.find(item => item.id === itemId);
        if (!item) return;

        if (newQuantity < 1) {
            this.removeFromCart(itemId);
            return;
        }

        if (newQuantity > item.product.stock) {
            this.showToast(`Only ${item.product.stock} items available`, 'error');
            return;
        }

        item.quantity = newQuantity;
        this.saveCart();
        this.updateCartUI();
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
        this.updateCartUI();
        this.showToast('Item removed from cart', 'success');
    }

    // Search products
    async searchProducts(query) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = this.products.filter(product => 
                    product.name.toLowerCase().includes(query.toLowerCase()) ||
                    product.brand.toLowerCase().includes(query.toLowerCase()) ||
                    product.category.toLowerCase().includes(query.toLowerCase())
                );
                resolve(results);
            }, 300);
        });
    }

    // Checkout modal
    showCheckoutModal() {
        if (this.cart.length === 0) {
            this.showToast('Your cart is empty', 'warning');
            return;
        }

        const modal = this.getSafeElement('checkoutModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
            this.updateCheckoutSummary();
        }
    }

    updateCheckoutSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const shipping = this.calculateShipping({ state: 'Lagos' }, this.cart); // Default to Lagos
        const tax = this.calculateTax(subtotal, 'Lagos');
        const total = subtotal + shipping + tax;

        const summary = this.getSafeElement('checkoutSummary');
        if (summary) {
            summary.innerHTML = `
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>${this.formatCurrency(subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span>${this.formatCurrency(shipping)}</span>
                </div>
                <div class="summary-row">
                    <span>Tax:</span>
                    <span>${this.formatCurrency(tax)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>${this.formatCurrency(total)}</span>
                </div>
            `;
        }
    }

    // Load orders
    loadOrders() {
        this.orders = this.loadFromStorage('orders');
    }
}

// Initialize the application
let store;

document.addEventListener('DOMContentLoaded', function() {
    try {
        store = new ECommerceStore();
        window.store = store;
        
        // Additional initialization after DOM is ready
        initializeSliders();
        setupGlobalHandlers();
        
        // Measure and log performance
        setTimeout(() => {
            const metrics = store.measurePerformance();
            console.log('Final performance metrics:', metrics);
        }, 2000);
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Fallback UI for initialization failure
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h1>Something went wrong</h1>
                <p>Please refresh the page or try again later.</p>
                <button onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    }
});

// Additional utility functions
function switchAuthTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(tabName + 'Tab');
    
    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.classList.add('active');
}

function initializeSliders() {
    // Banner slider
    let currentSlide = 0;
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.dot');

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        if (slides[index]) slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        let next = currentSlide + 1;
        if (next >= slides.length) next = 0;
        showSlide(next);
    }

    // Auto-advance slides only if slides exist
    if (slides.length > 0) {
        setInterval(nextSlide, 5000);

        // Initialize slide dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => showSlide(index));
        });
    }
}

function setupGlobalHandlers() {
    // Close cart when clicking outside
    document.addEventListener('click', (e) => {
        const cartSidebar = document.getElementById('cartSidebar');
        const cartBtn = document.getElementById('cartBtn');
        
        if (cartSidebar && cartSidebar.classList.contains('active') && 
            !cartSidebar.contains(e.target) && 
            cartBtn && !cartBtn.contains(e.target)) {
            cartSidebar.classList.remove('active');
        }
    });

    // Handle page visibility for PWA
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && store) {
            store.updateProductDisplay();
        }
    });

    // OTP input handling
    document.querySelectorAll('.otp-digit').forEach((input, index, inputs) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Modal close handlers
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('active');
            }
        });
    });

    // Form step navigation
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentStep = e.target.closest('.form-step');
            const nextStep = currentStep?.nextElementSibling;
            
            if (currentStep && nextStep) {
                currentStep.classList.remove('active');
                nextStep.classList.add('active');
            }
        });
    });

    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentStep = e.target.closest('.form-step');
            const prevStep = currentStep?.previousElementSibling;
            
            if (currentStep && prevStep) {
                currentStep.classList.remove('active');
                prevStep.classList.add('active');
            }
        });
    });
}

// Export for testing and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ECommerceStore, initializeFirebase };
}