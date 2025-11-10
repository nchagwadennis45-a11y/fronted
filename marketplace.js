// market.js - kynecta Marketplace JavaScript Logic

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDHHyGgsSV18BcXrGgzi4C8frzDAE1C1zo",
    authDomain: "uniconnect-ee95c.firebaseapp.com",
    projectId: "uniconnect-ee95c",
    storageBucket: "uniconnect-ee95c.firebasestorage.app",
    messagingSenderId: "1003264444309",
    appId: "1:1003264444309:web:9f0307516e44d21e97d89c"
};

// Clear cached data
localStorage.removeItem('marketplaceListings');
sessionStorage.clear();

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
}

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let userData = null;
let selectedImages = [];
let currentView = 'grid';
let currentCategory = 'all';
let currentSort = 'newest';
let allListings = [];
let filteredListings = [];
let displayedCount = 0;
const listingsPerPage = 12;
let lastVisible = null;
let hasMoreListings = true;

// DOM Elements
const listingsContainer = document.getElementById('listingsContainer');
const trendingItemsContainer = document.getElementById('trendingItemsContainer');
const recommendedContainer = document.getElementById('recommendedContainer');
const createListingBtn = document.getElementById('createListingBtn');
const createListingModal = document.getElementById('createListingModal');
const closeCreateModal = document.getElementById('closeCreateModal');
const cancelCreateListing = document.getElementById('cancelCreateListing');
const createListingForm = document.getElementById('createListingForm');
const browseImagesBtn = document.getElementById('browseImagesBtn');
const listingImages = document.getElementById('listingImages');
const imagePreview = document.getElementById('imagePreview');
const imageUploadArea = document.getElementById('imageUploadArea');
const searchInput = document.getElementById('searchInput');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const sortFilter = document.getElementById('sortFilter');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const sellerRatingFilter = document.getElementById('sellerRatingFilter');
const locationFilter = document.getElementById('locationFilter');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const themeToggle = document.getElementById('themeToggle');
const userAvatar = document.getElementById('userAvatar');
const mobileUserAvatar = document.getElementById('mobileUserAvatar');
const userName = document.getElementById('userName');
const mobileUserName = document.getElementById('mobileUserName');
const userStatus = document.getElementById('userStatus');
const mobileUserStatus = document.getElementById('mobileUserStatus');
const activeListingsCount = document.getElementById('activeListingsCount');
const totalUsersCount = document.getElementById('totalUsersCount');
const successfulSalesCount = document.getElementById('successfulSalesCount');
const averageRatingCount = document.getElementById('averageRatingCount');
const flashSaleTimer = document.getElementById('flashSaleTimer');
const tagSuggestions = document.getElementById('tagSuggestions');
const listingTitle = document.getElementById('listingTitle');
const listingTags = document.getElementById('listingTags');
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const closeCartModal = document.getElementById('closeCartModal');
const cartContent = document.getElementById('cartContent');
const cartCount = document.getElementById('cartCount');
const notificationBtn = document.getElementById('notificationBtn');
const notificationsModal = document.getElementById('notificationsModal');
const closeNotificationsModal = document.getElementById('closeNotificationsModal');
const notificationsContent = document.getElementById('notificationsContent');
const notificationCount = document.getElementById('notificationCount');
const notificationToast = document.getElementById('notificationToast');
const closeNotificationToast = document.getElementById('closeNotificationToast');
const notificationToastTitle = document.getElementById('notificationToastTitle');
const notificationToastMessage = document.getElementById('notificationToastMessage');
const createListingBtnText = document.getElementById('createListingBtnText');
const createListingSpinner = document.getElementById('createListingSpinner');
const discoverLink = document.getElementById('discoverLink');
const categoriesLink = document.getElementById('categoriesLink');
const sellersLink = document.getElementById('sellersLink');
const mobileDiscoverLink = document.getElementById('mobileDiscoverLink');
const mobileCategoriesLink = document.getElementById('mobileCategoriesLink');
const mobileSellersLink = document.getElementById('mobileSellersLink');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const closeMobileMenu = document.getElementById('closeMobileMenu');
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏪 kynecta Marketplace loaded');
    
    // Check authentication
    auth.onAuthStateChanged(handleAuthStateChange);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize carousel
    initCarousel();
    
    // Initialize theme
    initTheme();
    
    // Start flash sale timer
    startFlashSaleTimer();
});

// Handle authentication state changes
async function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        console.log('✅ User authenticated:', user.uid);
        await loadUserData(user.uid);
        await loadMarketplaceData();
        updateUserUI();
        loadCartCount();
        loadNotificationCount();
    } else {
        console.log('❌ No user signed in');
        window.location.href = 'index.html';
    }
}

// Load current user's data from Firestore
async function loadUserData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            console.log('✅ User data loaded:', userData);
        } else {
            // Create user document if it doesn't exist
            userData = {
                name: currentUser.displayName || 'User',
                email: currentUser.email,
                avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=6366f1&color=fff&size=150`,
                status: 'student',
                university: 'Unknown University',
                joined: new Date(),
                rating: 5.0,
                listings: 0,
                sales: 0,
                verified: false
            };
            await db.collection('users').doc(uid).set(userData);
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

// Load marketplace data
async function loadMarketplaceData() {
    try {
        await loadStats();
        await loadListings();
        await loadTrendingItems();
        await loadRecommendedItems();
    } catch (error) {
        console.error('❌ Error loading marketplace data:', error);
        showToast('Error loading marketplace data', 'error');
    }
}

// Load marketplace stats
async function loadStats() {
    try {
        // Active listings count
        const activeListingsQuery = await db.collection('listings')
            .where('status', '==', 'active')
            .get();
        activeListingsCount.textContent = activeListingsQuery.size;
        
        // Total users count
        const usersQuery = await db.collection('users').get();
        totalUsersCount.textContent = usersQuery.size;
        
        // Successful sales count
        const salesQuery = await db.collection('transactions')
            .where('status', '==', 'completed')
            .get();
        successfulSalesCount.textContent = salesQuery.size;
        
        // Average rating (calculate from users)
        let totalRating = 0;
        let userCount = 0;
        usersQuery.forEach(doc => {
            const user = doc.data();
            if (user.rating) {
                totalRating += user.rating;
                userCount++;
            }
        });
        const avgRating = userCount > 0 ? (totalRating / userCount).toFixed(1) : '0.0';
        averageRatingCount.textContent = avgRating;
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

// Load listings from Firestore
async function loadListings() {
    try {
        listingsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="loading-spinner mx-auto mb-4" style="width: 40px; height: 40px;"></div>
                <p class="text-gray-500 dark:text-gray-400">Loading listings...</p>
            </div>
        `;

        const query = db.collection('listings')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(listingsPerPage);

        const querySnapshot = await query.get();
        
        allListings = [];
        querySnapshot.forEach(doc => {
            const listing = doc.data();
            listing.id = doc.id;
            allListings.push(listing);
        });

        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        hasMoreListings = querySnapshot.docs.length === listingsPerPage;

        console.log(`✅ Loaded ${allListings.length} listings`);
        
        filteredListings = [...allListings];
        displayedCount = 0;
        displayListings();

    } catch (error) {
        console.error('❌ Error loading listings:', error);
        listingsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Error Loading Listings</h3>
                <p class="text-gray-500 dark:text-gray-400">Please try refreshing the page</p>
            </div>
        `;
    }
}

// Load more listings
async function loadMoreListings() {
    if (!hasMoreListings) return;

    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<div class="loading-spinner mx-auto"></div>';

    try {
        const query = db.collection('listings')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .startAfter(lastVisible)
            .limit(listingsPerPage);

        const querySnapshot = await query.get();
        
        const newListings = [];
        querySnapshot.forEach(doc => {
            const listing = doc.data();
            listing.id = doc.id;
            newListings.push(listing);
        });

        allListings = [...allListings, ...newListings];
        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        hasMoreListings = querySnapshot.docs.length === listingsPerPage;

        filteredListings = [...allListings];
        displayListings(true);

    } catch (error) {
        console.error('❌ Error loading more listings:', error);
        showToast('Error loading more listings', 'error');
    }

    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More Listings';
}

// Load trending items (most viewed listings)
async function loadTrendingItems() {
    try {
        const querySnapshot = await db.collection('listings')
            .where('status', '==', 'active')
            .orderBy('views', 'desc')
            .limit(4)
            .get();

        trendingItemsContainer.innerHTML = '';

        if (querySnapshot.empty) {
            trendingItemsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-chart-line text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500 dark:text-gray-400">No trending items yet</p>
                </div>
            `;
            return;
        }

        querySnapshot.forEach(doc => {
            const listing = doc.data();
            listing.id = doc.id;
            const productCard = createProductCard(listing, true);
            trendingItemsContainer.appendChild(productCard);
        });

    } catch (error) {
        console.error('❌ Error loading trending items:', error);
        trendingItemsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <p class="text-gray-500 dark:text-gray-400">Error loading trending items</p>
            </div>
        `;
    }
}

// Load recommended items (based on user preferences)
async function loadRecommendedItems() {
    try {
        // For now, show random active listings
        const querySnapshot = await db.collection('listings')
            .where('status', '==', 'active')
            .limit(4)
            .get();

        recommendedContainer.innerHTML = '';

        if (querySnapshot.empty) {
            recommendedContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-star text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500 dark:text-gray-400">No recommendations available</p>
                </div>
            `;
            return;
        }

        const listings = [];
        querySnapshot.forEach(doc => {
            const listing = doc.data();
            listing.id = doc.id;
            listings.push(listing);
        });

        // Shuffle array for random recommendations
        const shuffled = listings.sort(() => 0.5 - Math.random());
        shuffled.slice(0, 4).forEach(listing => {
            const productCard = createProductCard(listing, true);
            recommendedContainer.appendChild(productCard);
        });

    } catch (error) {
        console.error('❌ Error loading recommended items:', error);
        recommendedContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <p class="text-gray-500 dark:text-gray-400">Error loading recommendations</p>
            </div>
        `;
    }
}

// Display listings in the container
function displayListings(append = false) {
    const listingsToShow = filteredListings.slice(displayedCount, displayedCount + listingsPerPage);
    
    if (!append) {
        listingsContainer.innerHTML = '';
    }
    
    if (listingsToShow.length === 0 && !append) {
        listingsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No listings found</h3>
                <p class="text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
            </div>
        `;
        loadMoreBtn.classList.add('hidden');
        return;
    }
    
    listingsToShow.forEach(listing => {
        const productCard = createProductCard(listing);
        listingsContainer.appendChild(productCard);
    });
    
    displayedCount += listingsToShow.length;
    
    // Show/hide load more button
    if (displayedCount >= filteredListings.length || !hasMoreListings) {
        loadMoreBtn.classList.add('hidden');
    } else {
        loadMoreBtn.classList.remove('hidden');
    }
}

// Create product card HTML
function createProductCard(listing, isSmall = false) {
    const listingDate = listing.createdAt ? new Date(listing.createdAt.seconds * 1000).toLocaleDateString() : 'Recently';
    const imageUrl = listing.images && listing.images.length > 0 
        ? listing.images[0] 
        : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80';
    
    const card = document.createElement('div');
    card.className = `product-card glass-card rounded-xl overflow-hidden hover-lift fade-in ${currentView === 'list' ? 'list-view' : ''}`;
    card.setAttribute('data-listing-id', listing.id);
    
    card.innerHTML = `
        <div class="relative ${isSmall ? 'h-40' : 'h-48'} overflow-hidden">
            <img src="${imageUrl}" alt="${listing.title}" class="w-full h-full object-cover primary-image">
            
            ${listing.isHotDeal ? `<div class="hot-deal-badge">HOT DEAL</div>` : ''}
            
            <div class="quick-actions">
                <button class="quick-action-btn favorite-btn" data-listing-id="${listing.id}">
                    <i class="far fa-heart"></i>
                </button>
                <button class="quick-action-btn view-btn" data-listing-id="${listing.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
        
        <div class="p-4 product-details">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">${listing.title}</h3>
                <span class="text-indigo-600 dark:text-indigo-400 font-bold ml-2">$${listing.price.toFixed(2)}</span>
            </div>
            
            <div class="flex items-center mb-2">
                <img src="${listing.sellerAvatar || 'https://ui-avatars.com/api/?name=Seller&background=6366f1&color=fff&size=32'}" 
                     alt="${listing.sellerName}" 
                     class="w-6 h-6 rounded-full object-cover mr-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">${listing.sellerName}</span>
                ${listing.sellerVerified ? '<span class="verified-badge"><i class="fas fa-check mr-1"></i>Verified</span>' : ''}
            </div>
            
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">${listing.description || 'No description available'}</p>
            
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-1">
                    <i class="fas fa-star text-yellow-400 text-sm"></i>
                    <span class="text-sm text-gray-600 dark:text-gray-400">${listing.rating || '4.5'}</span>
                    <span class="text-sm text-gray-400 dark:text-gray-500">(${listing.reviewCount || '0'})</span>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400">${listingDate}</span>
            </div>
            
            ${!isSmall ? `
                <div class="flex justify-between mt-4">
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition flex-1 mr-2 contact-seller-btn" data-listing-id="${listing.id}">
                        Contact
                    </button>
                    <button class="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition add-to-cart-btn" data-listing-id="${listing.id}">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add event listeners
    setTimeout(() => {
        const favoriteBtn = card.querySelector('.favorite-btn');
        const viewBtn = card.querySelector('.view-btn');
        const contactBtn = card.querySelector('.contact-seller-btn');
        const cartBtn = card.querySelector('.add-to-cart-btn');
        
        if (favoriteBtn) favoriteBtn.addEventListener('click', () => toggleFavorite(listing.id));
        if (viewBtn) viewBtn.addEventListener('click', () => viewListing(listing.id));
        if (contactBtn) contactBtn.addEventListener('click', () => contactSeller(listing.id));
        if (cartBtn) cartBtn.addEventListener('click', () => addToCart(listing.id));
    }, 100);
    
    return card;
}

// Setup event listeners
function setupEventListeners() {
    // Create listing modal
    createListingBtn.addEventListener('click', openCreateListingModal);
    closeCreateModal.addEventListener('click', closeCreateListingModal);
    cancelCreateListing.addEventListener('click', closeCreateListingModal);
    createListingForm.addEventListener('submit', handleCreateListing);
    
    // Image upload
    browseImagesBtn.addEventListener('click', () => listingImages.click());
    listingImages.addEventListener('change', handleImageSelection);
    
    imageUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    imageUploadArea.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    imageUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        listingImages.files = e.dataTransfer.files;
        handleImageSelection({ target: listingImages });
    });
    
    // Search
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    mobileSearchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // View toggle
    gridViewBtn.addEventListener('click', () => switchView('grid'));
    listViewBtn.addEventListener('click', () => switchView('list'));
    
    // Sorting and filtering
    sortFilter.addEventListener('change', function() {
        currentSort = this.value;
        filterAndDisplayListings();
    });
    
    applyFilters.addEventListener('click', filterAndDisplayListings);
    clearFilters.addEventListener('click', clearAllFilters);
    
    // Load more
    loadMoreBtn.addEventListener('click', loadMoreListings);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Category tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            currentCategory = this.getAttribute('data-category');
            filterAndDisplayListings();
        });
    });
    
    // Cart and notifications
    cartBtn.addEventListener('click', openCartModal);
    closeCartModal.addEventListener('click', closeCartModalFunc);
    notificationBtn.addEventListener('click', openNotificationsModal);
    closeNotificationsModal.addEventListener('click', closeNotificationsModalFunc);
    closeNotificationToast.addEventListener('click', () => {
        notificationToast.classList.remove('show');
    });
    
    // Navigation links
    discoverLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Discover feature coming soon!', 'info');
    });
    
    categoriesLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Categories feature coming soon!', 'info');
    });
    
    sellersLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Sellers directory coming soon!', 'info');
    });
    
    // Mobile navigation links
    mobileDiscoverLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileMenuFunc();
        showToast('Discover feature coming soon!', 'info');
    });
    
    mobileCategoriesLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileMenuFunc();
        showToast('Categories feature coming soon!', 'info');
    });
    
    mobileSellersLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileMenuFunc();
        showToast('Sellers directory coming soon!', 'info');
    });
    
    // Mobile menu
    hamburgerMenu.addEventListener('click', openMobileMenu);
    closeMobileMenu.addEventListener('click', closeMobileMenuFunc);
    mobileMenuOverlay.addEventListener('click', closeMobileMenuFunc);
    mobileLogoutBtn.addEventListener('click', handleLogout);
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target === createListingModal) closeCreateListingModal();
        if (e.target === cartModal) closeCartModalFunc();
        if (e.target === notificationsModal) closeNotificationsModalFunc();
    });
}

// Mobile menu functions
function openMobileMenu() {
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenuFunc() {
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Logout function
function handleLogout() {
    auth.signOut().then(() => {
        closeMobileMenuFunc();
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }).catch((error) => {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    });
}

// Filter and display listings based on current filters
function filterAndDisplayListings() {
    // Apply category filter
    if (currentCategory === 'all') {
        filteredListings = [...allListings];
    } else {
        filteredListings = allListings.filter(listing => listing.category === currentCategory);
    }
    
    // Apply price filter
    const minPriceValue = parseFloat(minPrice.value) || 0;
    const maxPriceValue = parseFloat(maxPrice.value) || Infinity;
    
    filteredListings = filteredListings.filter(listing => {
        return listing.price >= minPriceValue && listing.price <= maxPriceValue;
    });
    
    // Apply sort
    switch (currentSort) {
        case 'newest':
            filteredListings.sort((a, b) => b.createdAt - a.createdAt);
            break;
        case 'oldest':
            filteredListings.sort((a, b) => a.createdAt - b.createdAt);
            break;
        case 'price-low':
            filteredListings.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredListings.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            filteredListings.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
    }
    
    displayedCount = 0;
    displayListings();
}

// Clear all filters
function clearAllFilters() {
    minPrice.value = '';
    maxPrice.value = '';
    sellerRatingFilter.value = 'any';
    locationFilter.value = 'any';
    filterAndDisplayListings();
}

// Switch between grid and list view
function switchView(view) {
    currentView = view;
    
    if (view === 'grid') {
        gridViewBtn.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20');
        listViewBtn.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20');
        listingsContainer.classList.remove('grid-cols-1');
        listingsContainer.classList.add('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    } else {
        listViewBtn.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20');
        gridViewBtn.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20');
        listingsContainer.classList.remove('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
        listingsContainer.classList.add('grid-cols-1');
    }
    
    displayListings();
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim() || mobileSearchInput.value.toLowerCase().trim();
    
    if (searchTerm.length === 0) {
        searchSuggestions.classList.add('hidden');
        filterAndDisplayListings();
        return;
    }
    
    // Filter listings by search term
    const searchResults = allListings.filter(listing => 
        listing.title.toLowerCase().includes(searchTerm) ||
        listing.description.toLowerCase().includes(searchTerm) ||
        (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
    
    filteredListings = searchResults;
    displayedCount = 0;
    displayListings();
}

// Open create listing modal
function openCreateListingModal() {
    if (!currentUser) {
        showToast('Please log in to create a listing', 'warning');
        return;
    }
    
    createListingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close create listing modal
function closeCreateListingModal() {
    createListingModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    createListingForm.reset();
    imagePreview.innerHTML = '';
    selectedImages = [];
}

// Handle image selection
function handleImageSelection(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    imagePreview.innerHTML = '';
    const fileArray = Array.from(files).slice(0, 8);
    
    fileArray.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', function() {
                previewItem.remove();
            });
            
            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// Handle create listing form submission
async function handleCreateListing(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please log in to create a listing', 'warning');
        return;
    }
    
    const title = document.getElementById('listingTitle').value;
    const description = document.getElementById('listingDescription').value;
    const price = parseFloat(document.getElementById('listingPrice').value);
    const category = document.getElementById('listingCategory').value;
    const condition = document.querySelector('input[name="condition"]:checked').value;
    const tags = document.getElementById('listingTags').value
        ? document.getElementById('listingTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
    
    if (!title || !description || isNaN(price)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Set loading state
    createListingBtnText.textContent = 'Creating...';
    createListingSpinner.classList.remove('hidden');
    
    try {
        // Upload images if any
        let imageUrls = [];
        const files = listingImages.files;
        
        if (files && files.length > 0) {
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                
                const storageRef = storage.ref().child(`marketplace/${currentUser.uid}/${Date.now()}_${file.name}`);
                const snapshot = await storageRef.put(file);
                const url = await snapshot.ref.getDownloadURL();
                imageUrls.push(url);
            }
        }
        
        // Create listing in Firestore
        const listingData = {
            title,
            description,
            price,
            category,
            condition,
            tags,
            images: imageUrls,
            sellerId: currentUser.uid,
            sellerName: userData.name,
            sellerAvatar: userData.avatar,
            sellerVerified: userData.verified || false,
            status: 'active',
            views: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await db.collection('listings').add(listingData);
        
        showToast('Listing created successfully!', 'success');
        closeCreateListingModal();
        
        // Refresh listings
        loadMarketplaceData();
        
    } catch (error) {
        console.error('❌ Error creating listing:', error);
        showToast('Error creating listing', 'error');
    } finally {
        createListingBtnText.textContent = 'Create Listing';
        createListingSpinner.classList.add('hidden');
    }
}

// Toggle favorite
async function toggleFavorite(listingId) {
    if (!currentUser) {
        showToast('Please log in to add favorites', 'warning');
        return;
    }
    
    try {
        const favoriteRef = db.collection('favorites')
            .where('userId', '==', currentUser.uid)
            .where('listingId', '==', listingId);
        
        const snapshot = await favoriteRef.get();
        
        if (snapshot.empty) {
            await db.collection('favorites').add({
                userId: currentUser.uid,
                listingId: listingId,
                addedAt: new Date()
            });
            showToast('Added to favorites', 'success');
        } else {
            const doc = snapshot.docs[0];
            await db.collection('favorites').doc(doc.id).delete();
            showToast('Removed from favorites', 'info');
        }
    } catch (error) {
        console.error('❌ Error toggling favorite:', error);
        showToast('Error updating favorites', 'error');
    }
}

// View listing details
function viewListing(listingId) {
    // In a real implementation, this would open a detailed view
    showToast('Listing details feature coming soon!', 'info');
}

// Contact seller
function contactSeller(listingId) {
    showToast('Contact feature coming soon!', 'info');
}

// Add to cart
async function addToCart(listingId) {
    if (!currentUser) {
        showToast('Please log in to add items to cart', 'warning');
        return;
    }
    
    try {
        const listingDoc = await db.collection('listings').doc(listingId).get();
        if (!listingDoc.exists) {
            showToast('Listing not found', 'error');
            return;
        }
        
        const listing = listingDoc.data();
        
        // Add to cart in Firestore
        await db.collection('cart').add({
            userId: currentUser.uid,
            listingId: listingId,
            title: listing.title,
            price: listing.price,
            image: listing.images && listing.images.length > 0 ? listing.images[0] : '',
            sellerId: listing.sellerId,
            addedAt: new Date()
        });
        
        showToast('Added to cart!', 'success');
        loadCartCount();
        
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        showToast('Error adding to cart', 'error');
    }
}

// Load cart count
async function loadCartCount() {
    if (!currentUser) return;
    
    try {
        const cartQuery = await db.collection('cart')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const count = cartQuery.size;
        if (count > 0) {
            cartCount.textContent = count;
            cartCount.classList.remove('hidden');
        } else {
            cartCount.classList.add('hidden');
        }
    } catch (error) {
        console.error('❌ Error loading cart count:', error);
    }
}

// Load notification count
async function loadNotificationCount() {
    if (!currentUser) return;
    
    try {
        const notificationsQuery = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const count = notificationsQuery.size;
        if (count > 0) {
            notificationCount.textContent = count;
            notificationCount.classList.remove('hidden');
        } else {
            notificationCount.classList.add('hidden');
        }
    } catch (error) {
        console.error('❌ Error loading notification count:', error);
    }
}

// Open cart modal
async function openCartModal() {
    if (!currentUser) {
        showToast('Please log in to view cart', 'warning');
        return;
    }
    
    try {
        const cartQuery = await db.collection('cart')
            .where('userId', '==', currentUser.uid)
            .orderBy('addedAt', 'desc')
            .get();
        
        if (cartQuery.empty) {
            cartContent.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-shopping-cart text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Your cart is empty</h3>
                    <p class="text-gray-500 dark:text-gray-400">Add some items to get started</p>
                </div>
            `;
        } else {
            let cartHTML = '<div class="space-y-4">';
            let total = 0;
            
            cartQuery.forEach(doc => {
                const item = doc.data();
                total += item.price;
                
                cartHTML += `
                    <div class="flex items-center space-x-4 p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
                        <img src="${item.image || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80'}" 
                             alt="${item.title}" 
                             class="w-16 h-16 object-cover rounded">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 dark:text-white">${item.title}</h4>
                            <p class="text-indigo-600 dark:text-indigo-400 font-bold">$${item.price.toFixed(2)}</p>
                        </div>
                        <button class="remove-from-cart text-red-500 hover:text-red-700" data-id="${doc.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            
            cartHTML += `
                <div class="border-t border-gray-200 dark:border-slate-600 pt-4">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                        <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">$${total.toFixed(2)}</span>
                    </div>
                    <button class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                        Checkout
                    </button>
                </div>
            </div>
            `;
            
            cartContent.innerHTML = cartHTML;
            
            // Add event listeners for remove buttons
            cartContent.querySelectorAll('.remove-from-cart').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const itemId = e.currentTarget.getAttribute('data-id');
                    await removeFromCart(itemId);
                });
            });
        }
        
        cartModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('❌ Error loading cart:', error);
        showToast('Error loading cart', 'error');
    }
}

// Close cart modal
function closeCartModalFunc() {
    cartModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Remove from cart
async function removeFromCart(itemId) {
    try {
        await db.collection('cart').doc(itemId).delete();
        showToast('Item removed from cart', 'success');
        loadCartCount();
        openCartModal(); // Refresh cart modal
    } catch (error) {
        console.error('❌ Error removing from cart:', error);
        showToast('Error removing item from cart', 'error');
    }
}

// Open notifications modal
async function openNotificationsModal() {
    if (!currentUser) {
        showToast('Please log in to view notifications', 'warning');
        return;
    }
    
    try {
        const notificationsQuery = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (notificationsQuery.empty) {
            notificationsContent.innerHTML = `
                <div class="text-center py-12">
                    <i class="far fa-bell text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No notifications</h3>
                    <p class="text-gray-500 dark:text-gray-400">You're all caught up!</p>
                </div>
            `;
        } else {
            let notificationsHTML = '<div class="space-y-4">';
            
            notificationsQuery.forEach(doc => {
                const notification = doc.data();
                const timeAgo = formatTimeAgo(notification.createdAt);
                
                notificationsHTML += `
                    <div class="p-4 border border-gray-200 dark:border-slate-600 rounded-lg ${notification.read ? 'bg-gray-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-700'}">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-semibold text-gray-900 dark:text-white">${notification.title}</h4>
                                <p class="text-gray-600 dark:text-gray-400 mt-1">${notification.message}</p>
                            </div>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${timeAgo}</span>
                        </div>
                    </div>
                `;
            });
            
            notificationsHTML += '</div>';
            notificationsContent.innerHTML = notificationsHTML;
        }
        
        notificationsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        showToast('Error loading notifications', 'error');
    }
}

// Close notifications modal
function closeNotificationsModalFunc() {
    notificationsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Update user UI
function updateUserUI() {
    if (userData) {
        userAvatar.src = userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=6366f1&color=fff&size=40`;
        mobileUserAvatar.src = userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=6366f1&color=fff&size=40`;
        userName.textContent = userData.name || 'User';
        mobileUserName.textContent = userData.name || 'User';
        userStatus.textContent = userData.status || 'Student';
        mobileUserStatus.textContent = userData.status || 'Student';
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    notificationToastTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    notificationToastMessage.textContent = message;
    
    // Set color based on type
    if (type === 'error') {
        notificationToast.style.borderLeft = '4px solid #ef4444';
    } else if (type === 'success') {
        notificationToast.style.borderLeft = '4px solid #10b981';
    } else if (type === 'warning') {
        notificationToast.style.borderLeft = '4px solid #f59e0b';
    } else {
        notificationToast.style.borderLeft = '4px solid #3b82f6';
    }
    
    notificationToast.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notificationToast.classList.remove('show');
    }, 5000);
}

// Initialize carousel
function initCarousel() {
    const carouselInner = document.querySelector('.carousel-inner');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const prevButton = document.querySelector('.carousel-control.prev');
    const nextButton = document.querySelector('.carousel-control.next');
    
    let currentIndex = 0;
    const totalItems = carouselItems.length;
    
    function updateCarousel() {
        carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
    
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            currentIndex = (currentIndex - 1 + totalItems) % totalItems;
            updateCarousel();
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            currentIndex = (currentIndex + 1) % totalItems;
            updateCarousel();
        });
    }
    
    // Auto-advance carousel
    setInterval(function() {
        currentIndex = (currentIndex + 1) % totalItems;
        updateCarousel();
    }, 5000);
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Set theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
        themeToggle.classList.add('active');
    } else {
        themeToggle.classList.remove('active');
    }
}

// Start flash sale timer
function startFlashSaleTimer() {
    let timeLeft = 24 * 60 * 60; // 24 hours in seconds
    
    function updateTimer() {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        flashSaleTimer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft > 0) {
            timeLeft--;
        } else {
            timeLeft = 24 * 60 * 60;
        }
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// Format time ago
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = timestamp.toDate();
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Contact information
function showContactInfo() {
    showToast('Contact kynecta: 0746676627 | nchagwadennis45@gmail.com', 'info');
}

// Export functions for global access if needed
window.marketplace = {
    loadMarketplaceData,
    loadListings,
    loadTrendingItems,
    loadRecommendedItems,
    openCreateListingModal,
    showToast,
    toggleTheme
};