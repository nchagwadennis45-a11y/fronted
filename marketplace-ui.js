// marketplace-enhanced.js - Advanced Marketplace Features
// Production-ready implementation for kynecta Marketplace

// Product Variations System
class ProductVariations {
    constructor(listingId) {
        this.listingId = listingId;
        this.variations = [];
        this.inventory = {};
    }

    addVariation(type, values) {
        this.variations.push({
            type,
            values: values.map(val => ({ 
                name: val, 
                priceAdjustment: 0,
                inventory: 0 
            }))
        });
    }

    updateInventory(combination, quantity) {
        this.inventory[combination.join('_')] = quantity;
    }

    getPrice(basePrice, selectedVariations) {
        let finalPrice = basePrice;
        selectedVariations.forEach(variation => {
            const variationObj = this.variations.find(v => v.type === variation.type);
            if (variationObj) {
                const valueObj = variationObj.values.find(val => val.name === variation.value);
                if (valueObj) {
                    finalPrice += valueObj.priceAdjustment;
                }
            }
        });
        return finalPrice;
    }

    getAvailableCombinations() {
        const combinations = [];
        const generateCombinations = (current, index) => {
            if (index === this.variations.length) {
                combinations.push([...current]);
                return;
            }
            
            const currentVariation = this.variations[index];
            currentVariation.values.forEach(value => {
                if (value.inventory > 0) {
                    current.push({ type: currentVariation.type, value: value.name });
                    generateCombinations(current, index + 1);
                    current.pop();
                }
            });
        };
        
        generateCombinations([], 0);
        return combinations;
    }
}

// Inventory Management System
class InventoryManager {
    static async updateInventory(listingId, quantity) {
        try {
            await db.collection('listings').doc(listingId).update({
                inventory: quantity,
                updatedAt: new Date()
            });

            if (quantity <= 5) {
                await this.sendLowStockAlert(listingId, quantity);
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            showToast('Error updating inventory', 'error');
        }
    }

    static async sendLowStockAlert(listingId, quantity) {
        const listingDoc = await db.collection('listings').doc(listingId).get();
        const listing = listingDoc.data();
        
        if (listing.sellerId === currentUser.uid) {
            showToast(`Low stock alert: Only ${quantity} items left for ${listing.title}`, 'warning');
            
            await db.collection('notifications').add({
                userId: currentUser.uid,
                title: 'Low Stock Alert',
                message: `Your listing "${listing.title}" is running low on stock (${quantity} left)`,
                type: 'inventory_alert',
                read: false,
                createdAt: new Date()
            });
        }
    }

    static async bulkUpdateInventory(updates) {
        const batch = db.batch();
        
        updates.forEach(({ listingId, quantity }) => {
            const listingRef = db.collection('listings').doc(listingId);
            batch.update(listingRef, {
                inventory: quantity,
                updatedAt: new Date()
            });
        });
        
        try {
            await batch.commit();
            showToast(`${updates.length} inventory items updated successfully`, 'success');
        } catch (error) {
            console.error('Error bulk updating inventory:', error);
            showToast('Error updating inventory', 'error');
        }
    }
}

// Bulk Listing Management
class BulkListingManager {
    static async bulkUpdateListings(listingIds, updates) {
        const batch = db.batch();
        
        listingIds.forEach(listingId => {
            const listingRef = db.collection('listings').doc(listingId);
            batch.update(listingRef, {
                ...updates,
                updatedAt: new Date()
            });
        });
        
        try {
            await batch.commit();
            showToast(`${listingIds.length} listings updated successfully`, 'success');
        } catch (error) {
            console.error('Error bulk updating listings:', error);
            showToast('Error updating listings', 'error');
        }
    }

    static async bulkUpdatePrices(listingIds, priceUpdateFn) {
        const batch = db.batch();
        
        for (const listingId of listingIds) {
            const listingDoc = await db.collection('listings').doc(listingId).get();
            const listing = listingDoc.data();
            const newPrice = priceUpdateFn(listing.price);
            
            const listingRef = db.collection('listings').doc(listingId);
            batch.update(listingRef, {
                price: newPrice,
                updatedAt: new Date()
            });
        }
        
        try {
            await batch.commit();
            showToast(`${listingIds.length} listing prices updated successfully`, 'success');
        } catch (error) {
            console.error('Error bulk updating prices:', error);
            showToast('Error updating prices', 'error');
        }
    }
}

// Product Comparison System
class ProductComparison {
    constructor() {
        this.comparisonList = [];
        this.maxComparisonItems = 4;
    }

    addToListing(listingId) {
        if (this.comparisonList.length >= this.maxComparisonItems) {
            showToast(`Maximum ${this.maxComparisonItems} items can be compared`, 'warning');
            return false;
        }
        
        if (!this.comparisonList.includes(listingId)) {
            this.comparisonList.push(listingId);
            this.updateUI();
            showToast('Item added to comparison', 'success');
            return true;
        }
        return false;
    }

    removeFromListing(listingId) {
        const index = this.comparisonList.indexOf(listingId);
        if (index > -1) {
            this.comparisonList.splice(index, 1);
            this.updateUI();
            return true;
        }
        return false;
    }

    updateUI() {
        const comparisonBadge = document.getElementById('comparisonBadge');
        if (comparisonBadge) {
            comparisonBadge.textContent = this.comparisonList.length;
            comparisonBadge.classList.toggle('hidden', this.comparisonList.length === 0);
        }
    }

    async getComparisonData() {
        const comparisonData = [];
        
        for (const listingId of this.comparisonList) {
            const listingDoc = await db.collection('listings').doc(listingId).get();
            if (listingDoc.exists) {
                comparisonData.push({
                    id: listingId,
                    ...listingDoc.data()
                });
            }
        }
        
        return comparisonData;
    }

    clearComparison() {
        this.comparisonList = [];
        this.updateUI();
    }
}

// Similar Items Recommendation System
class SimilarItemsRecommender {
    static async getSimilarItems(listingId, limit = 6) {
        try {
            const listingDoc = await db.collection('listings').doc(listingId).get();
            if (!listingDoc.exists) return [];
            
            const listing = listingDoc.data();
            
            const similarQuery = await db.collection('listings')
                .where('category', '==', listing.category)
                .where('status', '==', 'active')
                .where('id', '!=', listingId)
                .limit(limit)
                .get();
            
            const similarItems = [];
            similarQuery.forEach(doc => {
                similarItems.push({ id: doc.id, ...doc.data() });
            });
            
            return similarItems;
        } catch (error) {
            console.error('Error getting similar items:', error);
            return [];
        }
    }

    static async getPersonalizedRecommendations(userId, limit = 6) {
        try {
            const viewedQuery = await db.collection('recentlyViewed')
                .where('userId', '==', userId)
                .orderBy('viewedAt', 'desc')
                .limit(10)
                .get();

            if (viewedQuery.empty) {
                return await this.getTrendingItems(limit);
            }

            const viewedCategories = new Set();
            viewedQuery.forEach(doc => {
                const listingId = doc.data().listingId;
                viewedCategories.add('electronics');
            });

            const recommendations = [];
            for (const category of viewedCategories) {
                const categoryItems = await db.collection('listings')
                    .where('category', '==', category)
                    .where('status', '==', 'active')
                    .limit(Math.ceil(limit / viewedCategories.size))
                    .get();

                categoryItems.forEach(doc => {
                    recommendations.push({ id: doc.id, ...doc.data() });
                });
            }

            return recommendations.slice(0, limit);
        } catch (error) {
            console.error('Error getting personalized recommendations:', error);
            return await this.getTrendingItems(limit);
        }
    }

    static async getTrendingItems(limit = 6) {
        try {
            const trendingQuery = await db.collection('listings')
                .where('status', '==', 'active')
                .orderBy('views', 'desc')
                .limit(limit)
                .get();

            const trendingItems = [];
            trendingQuery.forEach(doc => {
                trendingItems.push({ id: doc.id, ...doc.data() });
            });

            return trendingItems;
        } catch (error) {
            console.error('Error getting trending items:', error);
            return [];
        }
    }
}

// Advanced Order Management System
class OrderManager {
    static async createOrderFromCart(userId, cartItems, shippingAddress, paymentMethod = 'pay_on_delivery') {
        try {
            let total = 0;
            const items = [];

            for (const cartItem of cartItems) {
                const listingDoc = await db.collection('listings').doc(cartItem.listingId).get();
                if (!listingDoc.exists) {
                    throw new Error(`Listing ${cartItem.listingId} not found`);
                }

                const listing = listingDoc.data();
                total += listing.price;
                items.push({
                    listingId: cartItem.listingId,
                    title: listing.title,
                    price: listing.price,
                    sellerId: listing.sellerId,
                    sellerName: listing.sellerName,
                    image: listing.images?.[0] || '',
                    quantity: 1
                });
            }

            const orderData = {
                userId,
                items,
                total,
                status: 'pending',
                paymentMethod,
                shippingAddress,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const orderRef = await db.collection('orders').add(orderData);
            
            await this.clearUserCart(userId);
            
            return {
                orderId: orderRef.id,
                ...orderData
            };
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    static async clearUserCart(userId) {
        try {
            const cartQuery = await db.collection('cart')
                .where('userId', '==', userId)
                .get();

            const batch = db.batch();
            cartQuery.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    }

    static async updateOrderStatus(orderId, status, notes = '') {
        try {
            const updateData = {
                status,
                updatedAt: new Date()
            };

            if (notes) {
                updateData.statusNotes = notes;
            }

            if (status === 'shipped') {
                updateData.shippedAt = new Date();
            } else if (status === 'delivered') {
                updateData.deliveredAt = new Date();
            } else if (status === 'cancelled') {
                updateData.cancelledAt = new Date();
            }

            await db.collection('orders').doc(orderId).update(updateData);
            
            await this.notifyOrderStatusUpdate(orderId, status);
            
            return true;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    }

    static async notifyOrderStatusUpdate(orderId, newStatus) {
        try {
            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (!orderDoc.exists) return;

            const order = orderDoc.data();
            const statusMessages = {
                'confirmed': 'Your order has been confirmed by the seller',
                'shipped': 'Your order has been shipped',
                'delivered': 'Your order has been delivered',
                'cancelled': 'Your order has been cancelled'
            };

            await db.collection('notifications').add({
                userId: order.userId,
                title: 'Order Status Update',
                message: statusMessages[newStatus] || `Your order status has been updated to ${newStatus}`,
                type: 'order_update',
                relatedId: orderId,
                read: false,
                createdAt: new Date()
            });
        } catch (error) {
            console.error('Error sending order status notification:', error);
        }
    }

    static async getSellerOrders(sellerId, status = null) {
        try {
            let query = db.collection('orders')
                .where('items', 'array-contains', db.collection('listings').where('sellerId', '==', sellerId));

            if (status) {
                query = query.where('status', '==', status);
            }

            query = query.orderBy('createdAt', 'desc');

            const querySnapshot = await query.get();
            const orders = [];

            querySnapshot.forEach(doc => {
                const order = doc.data();
                order.sellerItems = order.items.filter(item => item.sellerId === sellerId);
                order.sellerTotal = order.sellerItems.reduce((sum, item) => sum + item.price, 0);
                orders.push({
                    id: doc.id,
                    ...order
                });
            });

            return orders;
        } catch (error) {
            console.error('Error getting seller orders:', error);
            return [];
        }
    }

    static getOrderStatusColor(status) {
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
            'confirmed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
            'shipped': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
            'delivered': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
            'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        };

        return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
}

// Seller Analytics & Performance System
class SellerAnalytics {
    constructor(sellerId) {
        this.sellerId = sellerId;
        this.metrics = {};
    }

    async calculateMetrics(period = '30d') {
        const [salesData, listingsData, reviewsData] = await Promise.all([
            this.getSalesData(period),
            this.getListingsData(),
            this.getReviewsData()
        ]);

        this.metrics = {
            totalSales: salesData.totalSales,
            totalRevenue: salesData.totalRevenue,
            activeListings: listingsData.activeCount,
            totalListings: listingsData.totalCount,
            averageRating: await this.calculateAverageRating(reviewsData),
            conversionRate: this.calculateConversionRate(listingsData, salesData),
            responseRate: await this.calculateResponseRate(),
            customerSatisfaction: this.calculateCustomerSatisfaction(reviewsData),
            period: period
        };

        return this.metrics;
    }

    async getSalesData(period) {
        const startDate = this.getPeriodStartDate(period);
        
        const salesQuery = await db.collection('orders')
            .where('items', 'array-contains', db.collection('listings').where('sellerId', '==', this.sellerId))
            .where('createdAt', '>=', startDate)
            .get();

        let totalSales = 0;
        let totalRevenue = 0;

        salesQuery.forEach(doc => {
            const order = doc.data();
            const sellerItems = order.items.filter(item => item.sellerId === this.sellerId);
            totalSales += sellerItems.length;
            totalRevenue += sellerItems.reduce((sum, item) => sum + item.price, 0);
        });

        return { totalSales, totalRevenue };
    }

    async getListingsData() {
        const listingsQuery = await db.collection('listings')
            .where('sellerId', '==', this.sellerId)
            .get();

        let activeCount = 0;
        let totalCount = 0;
        let totalViews = 0;

        listingsQuery.forEach(doc => {
            const listing = doc.data();
            totalCount++;
            if (listing.status === 'active') activeCount++;
            totalViews += listing.views || 0;
        });

        return { activeCount, totalCount, totalViews };
    }

    async getReviewsData() {
        const reviewsQuery = await db.collection('reviews')
            .where('sellerId', '==', this.sellerId)
            .get();

        const reviews = [];
        reviewsQuery.forEach(doc => {
            reviews.push(doc.data());
        });

        return reviews;
    }

    async calculateAverageRating(reviewsData) {
        if (reviewsData.length === 0) return 5.0;
        
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        return (totalRating / reviewsData.length).toFixed(1);
    }

    calculateConversionRate(listingsData, salesData) {
        const totalViews = listingsData.totalViews || 0;
        return totalViews > 0 ? ((salesData.totalSales / totalViews) * 100).toFixed(1) : 0;
    }

    async calculateResponseRate() {
        const messagesQuery = await db.collection('messages')
            .where('recipientId', '==', this.sellerId)
            .get();

        if (messagesQuery.empty) return '100%';

        const respondedMessages = messagesQuery.docs.filter(doc => 
            doc.data().respondedAt !== undefined
        );

        return ((respondedMessages.length / messagesQuery.size) * 100).toFixed(1) + '%';
    }

    calculateCustomerSatisfaction(reviewsData) {
        if (reviewsData.length === 0) return '100%';
        
        const positiveReviews = reviewsData.filter(review => review.rating >= 4).length;
        return ((positiveReviews / reviewsData.length) * 100).toFixed(1) + '%';
    }

    getPeriodStartDate(period) {
        const now = new Date();
        switch (period) {
            case '7d':
                return new Date(now.setDate(now.getDate() - 7));
            case '30d':
                return new Date(now.setDate(now.getDate() - 30));
            case '90d':
                return new Date(now.setDate(now.getDate() - 90));
            default:
                return new Date(0);
        }
    }

    async getPerformanceInsights() {
        const insights = [];
        const metrics = await this.calculateMetrics();

        if (metrics.totalSales > 50) {
            insights.push({
                type: 'success',
                title: 'High Sales Volume',
                message: `You've made ${metrics.totalSales} sales in the last period - great job!`,
                suggestion: 'Consider increasing your inventory to meet demand'
            });
        }

        if (metrics.conversionRate < 5) {
            insights.push({
                type: 'warning',
                title: 'Low Conversion Rate',
                message: `Your conversion rate is ${metrics.conversionRate}%`,
                suggestion: 'Try improving your product photos and descriptions'
            });
        }

        if (metrics.customerSatisfaction < '80%') {
            insights.push({
                type: 'warning',
                title: 'Customer Satisfaction',
                message: `Your customer satisfaction is ${metrics.customerSatisfaction}`,
                suggestion: 'Focus on improving product quality and customer service'
            });
        }

        return insights;
    }
}

// Seller Level & Verification System
class SellerLevelSystem {
    static LEVELS = {
        BRONZE: {
            minSales: 0,
            minRating: 4.0,
            minResponseRate: '80%',
            benefits: ['Basic seller profile', 'Standard listing visibility']
        },
        SILVER: {
            minSales: 10,
            minRating: 4.3,
            minResponseRate: '85%',
            benefits: ['Verified badge', 'Advanced analytics', 'Priority support', 'Featured listings occasionally']
        },
        GOLD: {
            minSales: 50,
            minRating: 4.5,
            minResponseRate: '90%',
            benefits: ['Gold badge', 'Store customization', 'Premium placement', 'Advanced marketing tools']
        },
        PLATINUM: {
            minSales: 200,
            minRating: 4.7,
            minResponseRate: '95%',
            benefits: ['Platinum badge', 'Homepage featuring', 'Dedicated account manager', 'Early access to new features']
        }
    };

    static async calculateSellerLevel(sellerId) {
        const analytics = new SellerAnalytics(sellerId);
        const metrics = await analytics.calculateMetrics('90d');

        let level = 'BRONZE';

        if (metrics.totalSales >= 200 && metrics.averageRating >= 4.7 && metrics.responseRate >= '95%') {
            level = 'PLATINUM';
        } else if (metrics.totalSales >= 50 && metrics.averageRating >= 4.5 && metrics.responseRate >= '90%') {
            level = 'GOLD';
        } else if (metrics.totalSales >= 10 && metrics.averageRating >= 4.3 && metrics.responseRate >= '85%') {
            level = 'SILVER';
        }

        await this.updateSellerLevel(sellerId, level);
        return level;
    }

    static async updateSellerLevel(sellerId, level) {
        try {
            await db.collection('users').doc(sellerId).update({
                sellerLevel: level,
                levelUpdatedAt: new Date()
            });

            await db.collection('notifications').add({
                userId: sellerId,
                title: 'Seller Level Updated',
                message: `Congratulations! You've achieved ${level} seller level`,
                type: 'level_update',
                read: false,
                createdAt: new Date()
            });

        } catch (error) {
            console.error('Error updating seller level:', error);
        }
    }

    static getLevelBenefits(level) {
        return this.LEVELS[level]?.benefits || [];
    }

    static getNextLevelRequirements(currentLevel) {
        const levels = Object.keys(this.LEVELS);
        const currentIndex = levels.indexOf(currentLevel);
        
        if (currentIndex === -1 || currentIndex >= levels.length - 1) {
            return null;
        }

        const nextLevel = levels[currentIndex + 1];
        return {
            level: nextLevel,
            requirements: this.LEVELS[nextLevel]
        };
    }
}

// Store Customization System
class StoreCustomization {
    static async updateStore(storeData) {
        if (!currentUser) return;

        try {
            await db.collection('stores').doc(currentUser.uid).set({
                ...storeData,
                updatedAt: new Date()
            }, { merge: true });

            showToast('Store updated successfully', 'success');
        } catch (error) {
            console.error('Error updating store:', error);
            showToast('Error updating store', 'error');
        }
    }

    static async getStore(sellerId) {
        try {
            const storeDoc = await db.collection('stores').doc(sellerId).get();
            if (storeDoc.exists) {
                return storeDoc.data();
            }
            return this.getDefaultStore(sellerId);
        } catch (error) {
            console.error('Error getting store:', error);
            return this.getDefaultStore(sellerId);
        }
    }

    static getDefaultStore(sellerId) {
        return {
            name: 'My Store',
            description: 'Welcome to my store!',
            banner: '',
            logo: '',
            socialLinks: {},
            contactInfo: {},
            policies: {
                shipping: 'Standard shipping within 3-5 business days',
                returns: '7-day return policy',
                payment: 'Pay on delivery available'
            }
        };
    }

    static async uploadStoreImage(file, imageType) {
        if (!currentUser) throw new Error('User not authenticated');

        try {
            const storageRef = storage.ref().child(`stores/${currentUser.uid}/${imageType}_${Date.now()}_${file.name}`);
            const compressedFile = await this.compressImage(file);
            const snapshot = await storageRef.put(compressedFile);
            return await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error('Error uploading store image:', error);
            throw error;
        }
    }

    static async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

// Enhanced Messaging System
class MessagingSystem {
    static async sendMessage(recipientId, content, relatedListingId = null) {
        if (!currentUser) throw new Error('User not authenticated');

        try {
            const messageData = {
                senderId: currentUser.uid,
                recipientId,
                content: content.trim(),
                read: false,
                createdAt: new Date(),
                ...(relatedListingId && { relatedListingId })
            };

            await db.collection('messages').add(messageData);
            
            await this.updateMessageCount(recipientId);
            
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    static async updateMessageCount(userId) {
        try {
            const unreadQuery = await db.collection('messages')
                .where('recipientId', '==', userId)
                .where('read', '==', false)
                .get();

            const messageCountElement = document.getElementById('messageCount');
            if (messageCountElement) {
                if (unreadQuery.size > 0) {
                    messageCountElement.textContent = unreadQuery.size;
                    messageCountElement.classList.remove('hidden');
                } else {
                    messageCountElement.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Error updating message count:', error);
        }
    }

    static async getConversations(userId) {
        try {
            const sentQuery = db.collection('messages')
                .where('senderId', '==', userId)
                .orderBy('createdAt', 'desc');

            const receivedQuery = db.collection('messages')
                .where('recipientId', '==', userId)
                .orderBy('createdAt', 'desc');

            const [sentSnapshot, receivedSnapshot] = await Promise.all([
                sentQuery.get(),
                receivedQuery.get()
            ]);

            const conversations = new Map();

            sentSnapshot.forEach(doc => {
                const message = doc.data();
                const otherUserId = message.recipientId;
                if (!conversations.has(otherUserId)) {
                    conversations.set(otherUserId, {
                        userId: otherUserId,
                        lastMessage: message,
                        unreadCount: 0
                    });
                }
            });

            receivedSnapshot.forEach(doc => {
                const message = doc.data();
                const otherUserId = message.senderId;
                if (!conversations.has(otherUserId)) {
                    conversations.set(otherUserId, {
                        userId: otherUserId,
                        lastMessage: message,
                        unreadCount: message.read ? 0 : 1
                    });
                } else {
                    const conversation = conversations.get(otherUserId);
                    if (message.createdAt > conversation.lastMessage.createdAt) {
                        conversation.lastMessage = message;
                    }
                    if (!message.read) {
                        conversation.unreadCount++;
                    }
                }
            });

            const conversationsWithDetails = [];
            for (const [userId, conversation] of conversations) {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    conversationsWithDetails.push({
                        ...conversation,
                        user: userDoc.data()
                    });
                }
            }

            return conversationsWithDetails.sort((a, b) => 
                b.lastMessage.createdAt - a.lastMessage.createdAt
            );
        } catch (error) {
            console.error('Error getting conversations:', error);
            return [];
        }
    }

    static async markMessagesAsRead(senderId, recipientId) {
        try {
            const unreadQuery = await db.collection('messages')
                .where('senderId', '==', senderId)
                .where('recipientId', '==', recipientId)
                .where('read', '==', false)
                .get();

            const batch = db.batch();
            unreadQuery.forEach(doc => {
                batch.update(doc.ref, {
                    read: true,
                    readAt: new Date()
                });
            });

            await batch.commit();
            await this.updateMessageCount(recipientId);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    static async getConversationMessages(userId1, userId2, limit = 50) {
        try {
            const messagesQuery = await db.collection('messages')
                .where('senderId', 'in', [userId1, userId2])
                .where('recipientId', 'in', [userId1, userId2])
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const messages = [];
            messagesQuery.forEach(doc => {
                messages.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return messages.reverse();
        } catch (error) {
            console.error('Error getting conversation messages:', error);
            return [];
        }
    }
}

// Advanced Search & Filtering System
class AdvancedSearch {
    constructor() {
        this.filters = {
            priceRange: [0, 1000],
            locations: [],
            categories: [],
            conditions: [],
            brands: [],
            inStockOnly: false,
            verifiedSellersOnly: false,
            rating: 0,
            deliveryOptions: []
        };
    }

    async search(query, filters = {}) {
        const searchFilters = { ...this.filters, ...filters };
        let searchQuery = db.collection('listings').where('status', '==', 'active');

        if (query && query.trim()) {
            searchQuery = this.applyTextSearch(searchQuery, query.trim());
        }

        if (searchFilters.priceRange[0] > 0 || searchFilters.priceRange[1] < 1000) {
            searchQuery = searchQuery
                .where('price', '>=', searchFilters.priceRange[0])
                .where('price', '<=', searchFilters.priceRange[1]);
        }

        if (searchFilters.categories.length > 0) {
            searchQuery = searchQuery.where('category', 'in', searchFilters.categories);
        }

        if (searchFilters.locations.length > 0) {
            searchQuery = searchQuery.where('location', 'in', searchFilters.locations);
        }

        if (searchFilters.verifiedSellersOnly) {
            searchQuery = searchQuery.where('sellerVerified', '==', true);
        }

        if (searchFilters.rating > 0) {
            searchQuery = searchQuery.where('rating', '>=', searchFilters.rating);
        }

        const querySnapshot = await searchQuery.orderBy('createdAt', 'desc').get();
        const results = [];

        querySnapshot.forEach(doc => {
            results.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return this.applyInMemoryFilters(results, searchFilters);
    }

    applyTextSearch(query, searchTerm) {
        return query;
    }

    applyInMemoryFilters(results, filters) {
        return results.filter(listing => {
            if (filters.searchTerm) {
                const searchableText = `${listing.title} ${listing.description} ${listing.tags?.join(' ')}`.toLowerCase();
                if (!searchableText.includes(filters.searchTerm.toLowerCase())) {
                    return false;
                }
            }

            if (filters.conditions.length > 0 && !filters.conditions.includes(listing.condition)) {
                return false;
            }

            if (filters.inStockOnly && listing.inventory <= 0) {
                return false;
            }

            if (filters.deliveryOptions.length > 0) {
                if (filters.deliveryOptions.includes('express') && !listing.isExpress) {
                    return false;
                }
            }

            return true;
        });
    }

    async getSearchSuggestions(query, limit = 5) {
        if (!query || query.length < 2) return [];

        try {
            const listingsQuery = await db.collection('listings')
                .where('status', '==', 'active')
                .orderBy('title')
                .startAt(query)
                .endAt(query + '\uf8ff')
                .limit(limit)
                .get();

            const suggestions = new Set();
            listingsQuery.forEach(doc => {
                const listing = doc.data();
                suggestions.add(listing.title);
                
                if (listing.tags) {
                    listing.tags.forEach(tag => {
                        if (tag.toLowerCase().includes(query.toLowerCase())) {
                            suggestions.add(tag);
                        }
                    });
                }
            });

            return Array.from(suggestions).slice(0, limit);
        } catch (error) {
            console.error('Error getting search suggestions:', error);
            return [];
        }
    }

    saveSearch(searchParams, name = '') {
        if (!currentUser) return;

        const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '{}');
        const searchId = `search_${Date.now()}`;

        savedSearches[searchId] = {
            ...searchParams,
            name: name || `Search ${new Date().toLocaleDateString()}`,
            createdAt: new Date(),
            alertEnabled: false
        };

        localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
        return searchId;
    }

    getSavedSearches() {
        if (!currentUser) return {};
        return JSON.parse(localStorage.getItem('savedSearches') || '{}');
    }

    deleteSavedSearch(searchId) {
        if (!currentUser) return;

        const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '{}');
        delete savedSearches[searchId];
        localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    }
}

// Location-based Search System
class LocationSearch {
    static async searchByLocation(userLat, userLng, radiusKm, category = null) {
        try {
            let query = db.collection('listings').where('status', '==', 'active');
            if (category) {
                query = query.where('category', '==', category);
            }

            const querySnapshot = await query.get();
            const nearbyListings = [];

            querySnapshot.forEach(doc => {
                const listing = doc.data();
                if (listing.location && listing.location.coordinates) {
                    const distance = this.calculateDistance(
                        userLat, userLng,
                        listing.location.coordinates.latitude,
                        listing.location.coordinates.longitude
                    );

                    if (distance <= radiusKm) {
                        nearbyListings.push({
                            ...listing,
                            id: doc.id,
                            distance: distance.toFixed(1)
                        });
                    }
                }
            });

            return nearbyListings.sort((a, b) => a.distance - b.distance);
        } catch (error) {
            console.error('Error in location search:', error);
            return [];
        }
    }

    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    static deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    static async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }
}

// Security & Verification Systems
class SecuritySystem {
    static async verifyUserIdentity(userId, verificationData) {
        const verificationId = `verify_${userId}_${Date.now()}`;
        
        const verificationDoc = {
            userId,
            ...verificationData,
            status: 'pending_review',
            submittedAt: new Date(),
            verificationScore: await this.calculateVerificationScore(verificationData)
        };

        await db.collection('identityVerifications').doc(verificationId).set(verificationDoc);
        
        if (verificationDoc.verificationScore >= 80) {
            await this.approveVerification(verificationId, 'system');
        }
        
        return verificationId;
    }

    static async calculateVerificationScore(verificationData) {
        let score = 0;
        
        if (verificationData.selfieWithId) score += 30;
        if (verificationData.idFront) score += 25;
        if (verificationData.idBack) score += 25;
        
        if (verificationData.socialAccounts?.length > 0) score += 20;
        
        return Math.min(score, 100);
    }

    static async approveVerification(verificationId, approvedBy) {
        await db.collection('identityVerifications').doc(verificationId).update({
            status: 'approved',
            approvedBy,
            approvedAt: new Date()
        });

        const verificationDoc = await db.collection('identityVerifications').doc(verificationId).get();
        const verificationData = verificationDoc.data();
        
        await db.collection('users').doc(verificationData.userId).update({
            verified: true,
            verificationLevel: 'identity_verified',
            verifiedAt: new Date()
        });

        await db.collection('notifications').add({
            userId: verificationData.userId,
            title: 'Identity Verified',
            message: 'Your identity has been successfully verified',
            type: 'verification',
            read: false,
            createdAt: new Date()
        });
    }

    static async setupEscrowService(orderId, amount, terms) {
        const escrowData = {
            orderId,
            amount,
            terms,
            status: 'pending',
            createdAt: new Date(),
            escrowId: `ESC${Date.now()}`
        };

        await db.collection('escrowTransactions').add(escrowData);
        showToast('Escrow service activated for this transaction', 'success');
    }

    static async releaseEscrowFunds(escrowId, releaseTo) {
        await db.collection('escrowTransactions').doc(escrowId).update({
            status: 'released',
            releasedTo: releaseTo,
            releasedAt: new Date()
        });

        showToast('Escrow funds released successfully', 'success');
    }
}

// Fraud Detection System
class FraudDetectionSystem {
    static async analyzeTransaction(transactionData) {
        const riskFactors = await this.assessRiskFactors(transactionData);
        const riskScore = this.calculateRiskScore(riskFactors);
        
        const analysis = {
            riskScore,
            riskLevel: this.getRiskLevel(riskScore),
            flags: riskFactors.filter(f => f.risk > 50),
            recommendations: this.getRiskRecommendations(riskScore)
        };

        await db.collection('fraudAnalysis').add({
            transactionId: transactionData.transactionId,
            ...analysis,
            analyzedAt: new Date()
        });

        return analysis;
    }

    static async assessRiskFactors(transactionData) {
        const riskFactors = [];

        if (transactionData.amount > 500) {
            riskFactors.push({
                factor: 'high_value_transaction',
                risk: 30,
                description: 'Transaction amount exceeds $500'
            });
        }

        const userDoc = await db.collection('users').doc(transactionData.userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const accountAge = (new Date() - new Date(userData.joined?.seconds * 1000)) / (1000 * 60 * 60 * 24);
            
            if (accountAge < 7) {
                riskFactors.push({
                    factor: 'new_account',
                    risk: 40,
                    description: 'Account is less than 7 days old'
                });
            }
        }

        const recentTransactions = await db.collection('orders')
            .where('userId', '==', transactionData.userId)
            .where('createdAt', '>', new Date(Date.now() - 30 * 60 * 1000))
            .get();

        if (recentTransactions.size > 3) {
            riskFactors.push({
                factor: 'rapid_transactions',
                risk: 35,
                description: 'Multiple transactions in short period'
            });
        }

        return riskFactors;
    }

    static calculateRiskScore(riskFactors) {
        const totalRisk = riskFactors.reduce((sum, factor) => sum + factor.risk, 0);
        return Math.min(totalRisk, 100);
    }

    static getRiskLevel(riskScore) {
        if (riskScore >= 80) return 'high';
        if (riskScore >= 50) return 'medium';
        if (riskScore >= 20) return 'low';
        return 'very_low';
    }

    static getRiskRecommendations(riskScore) {
        const recommendations = [];

        if (riskScore >= 80) {
            recommendations.push('Require additional verification');
            recommendations.push('Hold transaction for manual review');
            recommendations.push('Contact customer for confirmation');
        } else if (riskScore >= 50) {
            recommendations.push('Verify customer identity');
            recommendations.push('Monitor transaction closely');
        } else if (riskScore >= 20) {
            recommendations.push('Standard verification procedures');
        }

        return recommendations;
    }
}

// Internationalization System
class I18n {
    static currentLanguage = 'en';
    static translations = {
        en: {
            welcome: 'Welcome to Marketplace',
            search: 'Search',
            categories: 'Categories',
            price: 'Price',
            contactSeller: 'Contact Seller',
            addToCart: 'Add to Cart',
            viewDetails: 'View Details',
            buyNow: 'Buy Now',
            home: 'Home',
            discover: 'Discover',
            sellers: 'Sellers',
            messages: 'Messages',
            orders: 'Orders',
            wishlist: 'Wishlist',
            condition: 'Condition',
            new: 'New',
            used: 'Used',
            description: 'Description',
            specifications: 'Specifications',
            reviews: 'Reviews',
            login: 'Login',
            register: 'Register',
            profile: 'Profile',
            settings: 'Settings',
            logout: 'Logout'
        },
        es: {
            welcome: 'Bienvenido al Mercado',
            search: 'Buscar',
            categories: 'Categorías',
            price: 'Precio',
            contactSeller: 'Contactar Vendedor',
            addToCart: 'Añadir al Carrito',
            viewDetails: 'Ver Detalles',
            buyNow: 'Comprar Ahora',
            home: 'Inicio',
            discover: 'Descubrir',
            sellers: 'Vendedores',
            messages: 'Mensajes',
            orders: 'Pedidos',
            wishlist: 'Lista de Deseos',
            condition: 'Condición',
            new: 'Nuevo',
            used: 'Usado',
            description: 'Descripción',
            specifications: 'Especificaciones',
            reviews: 'Reseñas',
            login: 'Iniciar Sesión',
            register: 'Registrarse',
            profile: 'Perfil',
            settings: 'Configuración',
            logout: 'Cerrar Sesión'
        },
        fr: {
            welcome: 'Bienvenue sur Marketplace',
            search: 'Rechercher',
            categories: 'Catégories',
            price: 'Prix',
            contactSeller: 'Contacter le Vendeur',
            addToCart: 'Ajouter au Panier',
            viewDetails: 'Voir les Détails',
            buyNow: 'Acheter Maintenant',
            home: 'Accueil',
            discover: 'Découvrir',
            sellers: 'Vendeurs',
            messages: 'Messages',
            orders: 'Commandes',
            wishlist: 'Liste de Souhaits',
            condition: 'État',
            new: 'Neuf',
            used: 'Usagé',
            description: 'Description',
            specifications: 'Spécifications',
            reviews: 'Avis',
            login: 'Connexion',
            register: 'S\'inscrire',
            profile: 'Profil',
            settings: 'Paramètres',
            logout: 'Déconnexion'
        }
    };

    static setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('preferredLanguage', lang);
            this.updatePageText();
            document.documentElement.lang = lang;
        }
    }

    static t(key) {
        return this.translations[this.currentLanguage]?.[key] || this.translations['en'][key] || key;
    }

    static updatePageText() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    static getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

// Currency Conversion System
class CurrencyConverter {
    static exchangeRates = {};
    static baseCurrency = 'USD';
    static currentCurrency = 'USD';

    static async updateExchangeRates() {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            this.exchangeRates = data.rates;
            
            localStorage.setItem('exchangeRates', JSON.stringify(this.exchangeRates));
            localStorage.setItem('exchangeRatesUpdated', new Date().toISOString());
            
            console.log('Exchange rates updated successfully');
        } catch (error) {
            console.error('Failed to update exchange rates:', error);
            const cached = localStorage.getItem('exchangeRates');
            if (cached) {
                this.exchangeRates = JSON.parse(cached);
            }
        }
    }

    static setCurrency(currency) {
        if (this.exchangeRates[currency]) {
            this.currentCurrency = currency;
            localStorage.setItem('preferredCurrency', currency);
            this.updateAllPrices();
        }
    }

    static convert(amount, fromCurrency = 'USD', toCurrency = this.currentCurrency) {
        if (fromCurrency === toCurrency) return amount;
        
        const fromRate = this.exchangeRates[fromCurrency] || 1;
        const toRate = this.exchangeRates[toCurrency] || 1;
        
        const baseAmount = amount / fromRate;
        return baseAmount * toRate;
    }

    static formatCurrency(amount, currency = this.currentCurrency) {
        return new Intl.NumberFormat(this.getLocaleForCurrency(currency), {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static getLocaleForCurrency(currency) {
        const locales = {
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB',
            'NGN': 'en-NG',
            'KES': 'en-KE',
            'GHS': 'en-GH'
        };
        return locales[currency] || 'en-US';
    }

    static updateAllPrices() {
        document.querySelectorAll('[data-price]').forEach(element => {
            const priceUSD = parseFloat(element.getAttribute('data-price'));
            const convertedPrice = this.convert(priceUSD, 'USD', this.currentCurrency);
            element.textContent = this.formatCurrency(convertedPrice, this.currentCurrency);
        });
    }

    static async initialize() {
        const cachedRates = localStorage.getItem('exchangeRates');
        const cachedTime = localStorage.getItem('exchangeRatesUpdated');
        
        if (cachedRates) {
            this.exchangeRates = JSON.parse(cachedRates);
            
            if (cachedTime) {
                const lastUpdate = new Date(cachedTime);
                const hoursSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60);
                if (hoursSinceUpdate > 24) {
                    await this.updateExchangeRates();
                }
            }
        } else {
            await this.updateExchangeRates();
        }

        const preferredCurrency = localStorage.getItem('preferredCurrency');
        if (preferredCurrency && this.exchangeRates[preferredCurrency]) {
            this.currentCurrency = preferredCurrency;
        }

        this.updateAllPrices();
    }
}

// Advanced E-commerce Systems
class CheckoutSystem {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.shippingMethod = 'standard';
        this.paymentMethod = 'pay_on_delivery';
        this.selectedDeliveryDate = null;
    }

    initializeCheckoutNavigation() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.checkout-next-btn')) {
                this.nextStep();
            } else if (e.target.matches('.checkout-prev-btn')) {
                this.previousStep();
            }
        });
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepUI();
            this.validateCurrentStep();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepUI();
        }
    }

    updateStepUI() {
        document.querySelectorAll('.checkout-step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
            step.classList.toggle('completed', index + 1 < this.currentStep);
        });

        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('hidden', index + 1 !== this.currentStep);
        });
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.validateShippingInfo();
            case 2:
                return this.validatePaymentInfo();
            case 3:
                return this.validateOrderReview();
            default:
                return true;
        }
    }

    validateShippingInfo() {
        const address = document.getElementById('shippingAddress')?.value;
        const city = document.getElementById('shippingCity')?.value;
        return !!(address && city);
    }

    validatePaymentInfo() {
        return !!this.paymentMethod;
    }

    initializeShippingMethods() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="shippingMethod"]')) {
                this.shippingMethod = e.target.value;
                this.updateShippingSummary();
            }
        });
    }

    updateShippingSummary() {
        const summaryElement = document.getElementById('shippingSummary');
        if (summaryElement) {
            const methods = {
                'standard': 'Standard Shipping (3-5 days)',
                'express': 'Express Shipping (1-2 days)',
                'overnight': 'Overnight Shipping'
            };
            summaryElement.textContent = methods[this.shippingMethod] || 'Standard Shipping';
        }
    }

    initializeDeliveryDateSelection() {
        const calendar = document.getElementById('deliveryCalendar');
        if (calendar) {
            calendar.addEventListener('change', (e) => {
                this.selectedDeliveryDate = e.target.value;
                this.updateDeliveryDateSummary();
            });
        }
    }

    updateDeliveryDateSummary() {
        const summaryElement = document.getElementById('deliveryDateSummary');
        if (summaryElement && this.selectedDeliveryDate) {
            const date = new Date(this.selectedDeliveryDate);
            summaryElement.textContent = date.toLocaleDateString();
        }
    }

    initializePaymentMethods() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="paymentMethod"]')) {
                this.paymentMethod = e.target.value;
                this.togglePaymentSections();
            }
        });
    }

    togglePaymentSections() {
        document.querySelectorAll('.payment-section').forEach(section => {
            section.classList.add('hidden');
        });

        const activeSection = document.getElementById(`${this.paymentMethod}Payment`);
        if (activeSection) {
            activeSection.classList.remove('hidden');
        }
    }

    initializeInvoiceDownload() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.download-invoice-btn')) {
                this.downloadInvoice(e.target.dataset.orderId);
            }
        });
    }

    async downloadInvoice(orderId) {
        try {
            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (orderDoc.exists) {
                const order = orderDoc.data();
                const invoiceContent = this.generateInvoiceContent(order);
                const blob = new Blob([invoiceContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${orderId}.html`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Invoice downloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error downloading invoice:', error);
            showToast('Error downloading invoice', 'error');
        }
    }

    generateInvoiceContent(order) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .details { margin: 20px 0; }
                    .items { width: 100%; border-collapse: collapse; }
                    .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .total { font-weight: bold; text-align: right; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>INVOICE</h1>
                    <p>Order #${order.id}</p>
                    <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="details">
                    <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
                </div>
                <table class="items">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.title}</td>
                                <td>${CurrencyConverter.formatCurrency(item.price)}</td>
                                <td>${item.quantity}</td>
                                <td>${CurrencyConverter.formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">
                    Total: ${CurrencyConverter.formatCurrency(order.total)}
                </div>
            </body>
            </html>
        `;
    }

    initializeReturnRefundSystem() {
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.return-request-form')) {
                e.preventDefault();
                this.submitReturnRequest(new FormData(e.target));
            }
        });
    }

    async submitReturnRequest(formData) {
        try {
            const returnData = {
                orderId: formData.get('orderId'),
                itemId: formData.get('itemId'),
                reason: formData.get('reason'),
                description: formData.get('description'),
                photos: formData.get('photos'),
                status: 'pending',
                createdAt: new Date(),
                userId: currentUser.uid
            };

            await db.collection('returnRequests').add(returnData);
            showToast('Return request submitted successfully', 'success');
            
            document.querySelector('.return-request-form').reset();
        } catch (error) {
            console.error('Error submitting return request:', error);
            showToast('Error submitting return request', 'error');
        }
    }

    initializeOrderCancellation() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('select.cancellation-reason')) {
                this.updateCancellationSummary(e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.confirm-cancellation-btn')) {
                this.confirmOrderCancellation(e.target.dataset.orderId);
            }
        });
    }

    updateCancellationSummary(reason) {
        const summaryElement = document.getElementById('cancellationSummary');
        if (summaryElement) {
            const reasons = {
                'changed_mind': 'Changed my mind',
                'found_cheaper': 'Found cheaper elsewhere',
                'shipping_delay': 'Shipping takes too long',
                'wrong_item': 'Ordered wrong item',
                'other': 'Other reason'
            };
            summaryElement.textContent = reasons[reason] || 'No reason selected';
        }
    }

    async confirmOrderCancellation(orderId) {
        const reason = document.querySelector('select.cancellation-reason')?.value;
        if (!reason) {
            showToast('Please select a cancellation reason', 'warning');
            return;
        }

        try {
            await OrderManager.updateOrderStatus(orderId, 'cancelled', `Cancellation reason: ${reason}`);
            showToast('Order cancelled successfully', 'success');
        } catch (error) {
            console.error('Error cancelling order:', error);
            showToast('Error cancelling order', 'error');
        }
    }
}

// Customer Loyalty & Engagement System
class CustomerLoyaltySystem {
    constructor() {
        this.reviewRatings = {};
    }

    initializeReviewSystem() {
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.review-submission-form')) {
                e.preventDefault();
                this.submitReview(new FormData(e.target));
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.review-star')) {
                this.setReviewRating(e.target);
            } else if (e.target.matches('.report-review-btn')) {
                this.reportReview(e.target.dataset.reviewId);
            } else if (e.target.matches('.helpful-vote-btn')) {
                this.voteHelpful(e.target.dataset.reviewId);
            } else if (e.target.matches('.ask-seller-btn')) {
                this.openAskSellerModal(e.target.dataset.sellerId, e.target.dataset.listingId);
            } else if (e.target.matches('.submit-question-btn')) {
                this.submitQuestion(new FormData(e.target.closest('form')));
            } else if (e.target.matches('.review-reply-btn')) {
                this.submitReviewReply(e.target.dataset.reviewId);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.photo-review-upload')) {
                this.handlePhotoReviewUpload(e.target);
            }
        });
    }

    setReviewRating(starElement) {
        const rating = parseInt(starElement.dataset.rating);
        const container = starElement.closest('.review-stars');
        
        container.querySelectorAll('.review-star').forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });

        this.reviewRatings[container.dataset.listingId] = rating;
    }

    async submitReview(formData) {
        try {
            const reviewData = {
                listingId: formData.get('listingId'),
                rating: this.reviewRatings[formData.get('listingId')] || 5,
                title: formData.get('title'),
                comment: formData.get('comment'),
                photos: formData.get('photos'),
                userId: currentUser.uid,
                userName: currentUser.displayName,
                createdAt: new Date(),
                helpfulCount: 0,
                reported: false
            };

            await db.collection('reviews').add(reviewData);
            showToast('Review submitted successfully', 'success');
            
            document.querySelector('.review-submission-form').reset();
            
            const starsContainer = document.querySelector('.review-stars');
            if (starsContainer) {
                starsContainer.querySelectorAll('.review-star').forEach(star => {
                    star.classList.remove('active');
                });
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            showToast('Error submitting review', 'error');
        }
    }

    async reportReview(reviewId) {
        try {
            await db.collection('reviews').doc(reviewId).update({
                reported: true,
                reportedAt: new Date(),
                reportedBy: currentUser.uid
            });
            showToast('Review reported successfully', 'success');
        } catch (error) {
            console.error('Error reporting review:', error);
            showToast('Error reporting review', 'error');
        }
    }

    async handlePhotoReviewUpload(input) {
        const files = Array.from(input.files);
        if (files.length > 5) {
            showToast('Maximum 5 photos allowed', 'warning');
            return;
        }

        const previewContainer = document.getElementById('photoReviewPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'w-20 h-20 object-cover rounded mr-2';
                        previewContainer.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    async voteHelpful(reviewId) {
        try {
            const reviewDoc = await db.collection('reviews').doc(reviewId).get();
            if (reviewDoc.exists) {
                const review = reviewDoc.data();
                await db.collection('reviews').doc(reviewId).update({
                    helpfulCount: (review.helpfulCount || 0) + 1
                });
                
                const button = document.querySelector(`[data-review-id="${reviewId}"]`);
                if (button) {
                    button.textContent = `Helpful (${(review.helpfulCount || 0) + 1})`;
                    button.disabled = true;
                }
                
                showToast('Thanks for your feedback!', 'success');
            }
        } catch (error) {
            console.error('Error voting helpful:', error);
            showToast('Error submitting vote', 'error');
        }
    }

    openAskSellerModal(sellerId, listingId) {
        const modal = document.getElementById('askSellerModal');
        if (modal) {
            modal.querySelector('input[name="sellerId"]').value = sellerId;
            modal.querySelector('input[name="listingId"]').value = listingId;
            modal.classList.remove('hidden');
        }
    }

    async submitQuestion(formData) {
        try {
            const questionData = {
                sellerId: formData.get('sellerId'),
                listingId: formData.get('listingId'),
                question: formData.get('question'),
                userId: currentUser.uid,
                userName: currentUser.displayName,
                createdAt: new Date(),
                answered: false
            };

            await db.collection('sellerQuestions').add(questionData);
            showToast('Question sent to seller', 'success');
            
            document.getElementById('askSellerModal').classList.add('hidden');
            document.querySelector('#askSellerModal form').reset();
        } catch (error) {
            console.error('Error submitting question:', error);
            showToast('Error sending question', 'error');
        }
    }

    async submitReviewReply(reviewId) {
        const replyText = document.querySelector(`#reply-${reviewId}`)?.value;
        if (!replyText) {
            showToast('Please enter a reply', 'warning');
            return;
        }

        try {
            const replyData = {
                reviewId: reviewId,
                reply: replyText,
                repliedBy: currentUser.uid,
                repliedAt: new Date()
            };

            await db.collection('reviewReplies').add(replyData);
            showToast('Reply submitted successfully', 'success');
            
            document.querySelector(`#reply-${reviewId}`).value = '';
        } catch (error) {
            console.error('Error submitting reply:', error);
            showToast('Error submitting reply', 'error');
        }
    }
}

// Advanced Product Management System
class AdvancedProductManagement {
    constructor() {
        this.bundleItems = [];
        this.warrantyInfo = {};
    }

    initializeProductManagement() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.bundle-customization-option')) {
                this.toggleBundleItem(e.target);
            } else if (e.target.matches('.cross-sell-add-cart')) {
                this.addCrossSellToCart(e.target.dataset.listingId);
            } else if (e.target.matches('.spec-expand-btn')) {
                this.toggleSpecifications(e.target);
            } else if (e.target.matches('.warranty-info-btn')) {
                this.showWarrantyInfo(e.target.dataset.listingId);
            } else if (e.target.matches('.digital-download-btn')) {
                this.downloadDigitalProduct(e.target.dataset.productId);
            } else if (e.target.matches('.subscription-frequency-option')) {
                this.updateSubscriptionFrequency(e.target.value);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.bundle-option-select')) {
                this.updateBundlePrice();
            }
        });
    }

    toggleBundleItem(element) {
        const listingId = element.dataset.listingId;
        const isSelected = element.classList.contains('selected');
        
        if (isSelected) {
            element.classList.remove('selected');
            this.bundleItems = this.bundleItems.filter(id => id !== listingId);
        } else {
            element.classList.add('selected');
            this.bundleItems.push(listingId);
        }
        
        this.updateBundlePrice();
    }

    updateBundlePrice() {
        let totalPrice = 0;
        const basePrice = parseFloat(document.getElementById('baseProductPrice')?.value || 0);
        totalPrice += basePrice;

        this.bundleItems.forEach(listingId => {
            const option = document.querySelector(`[data-listing-id="${listingId}"]`);
            const price = parseFloat(option?.dataset.price || 0);
            totalPrice += price;
        });

        const bundlePriceElement = document.getElementById('bundleTotalPrice');
        if (bundlePriceElement) {
            bundlePriceElement.textContent = CurrencyConverter.formatCurrency(totalPrice);
        }
    }

    async addCrossSellToCart(listingId) {
        try {
            await db.collection('cart').add({
                userId: currentUser.uid,
                listingId: listingId,
                quantity: 1,
                addedAt: new Date()
            });
            showToast('Product added to cart', 'success');
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Error adding product to cart', 'error');
        }
    }

    toggleSpecifications(button) {
        const specsContainer = button.closest('.product-specs').querySelector('.specs-details');
        const isExpanded = specsContainer.classList.contains('expanded');
        
        if (isExpanded) {
            specsContainer.classList.remove('expanded');
            button.textContent = 'Show More';
        } else {
            specsContainer.classList.add('expanded');
            button.textContent = 'Show Less';
        }
    }

    async showWarrantyInfo(listingId) {
        try {
            const listingDoc = await db.collection('listings').doc(listingId).get();
            if (listingDoc.exists) {
                const listing = listingDoc.data();
                this.warrantyInfo = listing.warranty || {};
                this.displayWarrantyModal();
            }
        } catch (error) {
            console.error('Error fetching warranty info:', error);
            showToast('Error loading warranty information', 'error');
        }
    }

    displayWarrantyModal() {
        const modal = document.getElementById('warrantyModal');
        if (modal) {
            const content = modal.querySelector('.warranty-content');
            content.innerHTML = `
                <h3 class="text-lg font-bold mb-4">Warranty Information</h3>
                <p><strong>Duration:</strong> ${this.warrantyInfo.duration || 'Not specified'}</p>
                <p><strong>Type:</strong> ${this.warrantyInfo.type || 'Standard'}</p>
                <p><strong>Coverage:</strong> ${this.warrantyInfo.coverage || 'Manufacturer defects'}</p>
                ${this.warrantyInfo.notes ? `<p><strong>Notes:</strong> ${this.warrantyInfo.notes}</p>` : ''}
            `;
            modal.classList.remove('hidden');
        }
    }

    async downloadDigitalProduct(productId) {
        try {
            const productDoc = await db.collection('digitalProducts').doc(productId).get();
            if (productDoc.exists) {
                const product = productDoc.data();
                const link = document.createElement('a');
                link.href = product.downloadUrl;
                link.download = product.filename || `product-${productId}`;
                link.click();
                showToast('Download started', 'success');
                
                await db.collection('downloadHistory').add({
                    userId: currentUser.uid,
                    productId: productId,
                    downloadedAt: new Date()
                });
            }
        } catch (error) {
            console.error('Error downloading product:', error);
            showToast('Error downloading product', 'error');
        }
    }

    updateSubscriptionFrequency(frequency) {
        const priceElement = document.getElementById('subscriptionPrice');
        const basePrice = parseFloat(priceElement?.dataset.basePrice || 0);
        
        const multipliers = {
            'weekly': 0.9,
            'biweekly': 0.85,
            'monthly': 0.8,
            'quarterly': 0.75
        };
        
        const multiplier = multipliers[frequency] || 1;
        const finalPrice = basePrice * multiplier;
        
        if (priceElement) {
            priceElement.textContent = CurrencyConverter.formatCurrency(finalPrice);
        }
        
        document.getElementById('frequencyDisplay').textContent = frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
}

// Marketing & Promotions System
class MarketingPromotionsSystem {
    constructor() {
        this.appliedCoupons = [];
        this.loyaltyPoints = 0;
    }

    initializeMarketingSystems() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.apply-coupon-btn')) {
                this.applyCouponCode();
            } else if (e.target.matches('.promo-banner-close')) {
                this.closePromoBanner(e.target.dataset.bannerId);
            } else if (e.target.matches('.buy-x-get-y-select')) {
                this.updateBuyXGetYOffer(e.target.value);
            } else if (e.target.matches('.redeem-points-toggle')) {
                this.togglePointsRedemption(e.target.checked);
            } else if (e.target.matches('.copy-referral-link')) {
                this.copyReferralLink(e.target.dataset.link);
            } else if (e.target.matches('.subscribe-newsletter-btn')) {
                this.subscribeToNewsletter(new FormData(e.target.closest('form')));
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.matches('.cart-subtotal')) {
                this.updateFreeShippingProgress();
            }
        });

        this.initializeFreeShippingProgress();
    }

    async applyCouponCode() {
        const couponCode = document.getElementById('couponCode')?.value.trim();
        if (!couponCode) {
            showToast('Please enter a coupon code', 'warning');
            return;
        }

        try {
            const couponQuery = await db.collection('coupons')
                .where('code', '==', couponCode.toUpperCase())
                .where('active', '==', true)
                .get();

            if (couponQuery.empty) {
                showToast('Invalid or expired coupon code', 'error');
                return;
            }

            const couponDoc = couponQuery.docs[0];
            const coupon = couponDoc.data();

            if (coupon.expiresAt && new Date() > coupon.expiresAt.toDate()) {
                showToast('Coupon has expired', 'error');
                return;
            }

            this.appliedCoupons.push(coupon);
            this.updateCartDiscounts();
            showToast(`Coupon applied: ${coupon.description}`, 'success');
            
            document.getElementById('couponCode').value = '';
        } catch (error) {
            console.error('Error applying coupon:', error);
            showToast('Error applying coupon', 'error');
        }
    }

    updateCartDiscounts() {
        let subtotal = parseFloat(document.getElementById('cartSubtotal')?.dataset.subtotal || 0);
        let totalDiscount = 0;

        this.appliedCoupons.forEach(coupon => {
            if (coupon.type === 'percentage') {
                totalDiscount += subtotal * (coupon.value / 100);
            } else if (coupon.type === 'fixed') {
                totalDiscount += coupon.value;
            }
        });

        const discountElement = document.getElementById('cartDiscount');
        const totalElement = document.getElementById('cartTotal');
        
        if (discountElement && totalElement) {
            discountElement.textContent = `-${CurrencyConverter.formatCurrency(totalDiscount)}`;
            totalElement.textContent = CurrencyConverter.formatCurrency(subtotal - totalDiscount);
        }
    }

    closePromoBanner(bannerId) {
        const banner = document.querySelector(`[data-banner-id="${bannerId}"]`);
        if (banner) {
            banner.style.display = 'none';
            localStorage.setItem(`banner_${bannerId}_closed`, 'true');
        }
    }

    updateBuyXGetYOffer(offerId) {
        const offerElement = document.querySelector(`[data-offer-id="${offerId}"]`);
        if (offerElement) {
            const offer = JSON.parse(offerElement.dataset.offer);
            const summaryElement = document.getElementById('buyXGetYSummary');
            
            if (summaryElement) {
                summaryElement.innerHTML = `
                    Buy ${offer.buyQuantity} ${offer.buyProduct}, 
                    Get ${offer.getQuantity} ${offer.getProduct} Free
                `;
            }
        }
    }

    initializeFreeShippingProgress() {
        const progressBar = document.getElementById('freeShippingProgress');
        const progressText = document.getElementById('freeShippingProgressText');
        const threshold = 50;

        if (progressBar && progressText) {
            const subtotal = parseFloat(document.getElementById('cartSubtotal')?.dataset.subtotal || 0);
            const progress = Math.min((subtotal / threshold) * 100, 100);
            
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `$${(threshold - subtotal).toFixed(2)} away from free shipping`;
            
            if (subtotal >= threshold) {
                progressText.textContent = 'Congratulations! You qualify for free shipping!';
                progressBar.classList.add('bg-green-500');
            }
        }
    }

    togglePointsRedemption(usePoints) {
        const pointsElement = document.getElementById('loyaltyPointsDisplay');
        const pointsValue = parseInt(pointsElement?.dataset.points || 0);
        
        if (usePoints && pointsValue > 0) {
            const pointsValue = pointsValue * 0.01;
            this.updatePointsDiscount(pointsValue);
            showToast(`${pointsValue} points applied as discount`, 'success');
        } else {
            this.updatePointsDiscount(0);
        }
    }

    updatePointsDiscount(discountAmount) {
        const discountElement = document.getElementById('pointsDiscount');
        const totalElement = document.getElementById('cartTotal');
        const subtotal = parseFloat(document.getElementById('cartSubtotal')?.dataset.subtotal || 0);
        
        if (discountElement && totalElement) {
            discountElement.textContent = `-${CurrencyConverter.formatCurrency(discountAmount)}`;
            totalElement.textContent = CurrencyConverter.formatCurrency(subtotal - discountAmount);
        }
    }

    copyReferralLink(link) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('Referral link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy referral link', 'error');
        });
    }

    async subscribeToNewsletter(formData) {
        try {
            const email = formData.get('email');
            await db.collection('newsletterSubscriptions').add({
                email: email,
                subscribedAt: new Date(),
                active: true,
                source: 'website'
            });
            showToast('Successfully subscribed to newsletter!', 'success');
            document.querySelector('.newsletter-form').reset();
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            showToast('Error subscribing to newsletter', 'error');
        }
    }
}

// Logistics & Fulfillment System
class LogisticsFulfillmentSystem {
    constructor() {
        this.trackingUpdates = {};
    }

    initializeLogisticsSystems() {
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.tracking-number-form')) {
                e.preventDefault();
                this.checkTrackingStatus(new FormData(e.target));
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.refresh-tracking-btn')) {
                this.refreshTrackingStatus(e.target.dataset.trackingNumber);
            } else if (e.target.matches('.select-pickup-location')) {
                this.selectPickupLocation(e.target.dataset.locationId);
            } else if (e.target.matches('.select-delivery-slot')) {
                this.selectDeliveryTimeSlot(e.target.dataset.slotId);
            } else if (e.target.matches('.validate-address-btn')) {
                this.validateAddress();
            }
        });

        this.initializeDeliveryMap();
    }

    async checkTrackingStatus(formData) {
        const trackingNumber = formData.get('trackingNumber');
        if (!trackingNumber) {
            showToast('Please enter a tracking number', 'warning');
            return;
        }

        try {
            const trackingQuery = await db.collection('orders')
                .where('trackingNumber', '==', trackingNumber)
                .get();

            if (trackingQuery.empty) {
                showToast('Tracking number not found', 'error');
                return;
            }

            const orderDoc = trackingQuery.docs[0];
            const order = orderDoc.data();
            this.displayTrackingInfo(order);
        } catch (error) {
            console.error('Error checking tracking:', error);
            showToast('Error checking tracking status', 'error');
        }
    }

    displayTrackingInfo(order) {
        const trackingModal = document.getElementById('trackingModal');
        if (trackingModal) {
            const content = trackingModal.querySelector('.tracking-content');
            content.innerHTML = `
                <h3 class="text-lg font-bold mb-4">Tracking Information</h3>
                <p><strong>Status:</strong> <span class="${OrderManager.getOrderStatusColor(order.status)}">${order.status}</span></p>
                <p><strong>Last Update:</strong> ${order.updatedAt?.toDate?.().toLocaleString() || 'N/A'}</p>
                ${order.trackingHistory ? `
                    <div class="mt-4">
                        <h4 class="font-semibold mb-2">Tracking History:</h4>
                        ${order.trackingHistory.map(update => `
                            <div class="border-l-2 border-blue-500 pl-4 mb-2">
                                <p class="text-sm">${update.status}</p>
                                <p class="text-xs text-gray-600">${update.timestamp?.toDate?.().toLocaleString() || 'N/A'}</p>
                                ${update.location ? `<p class="text-xs text-gray-600">${update.location}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            trackingModal.classList.remove('hidden');
        }
    }

    async refreshTrackingStatus(trackingNumber) {
        try {
            showToast('Refreshing tracking information...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const trackingQuery = await db.collection('orders')
                .where('trackingNumber', '==', trackingNumber)
                .get();

            if (!trackingQuery.empty) {
                showToast('Tracking information updated', 'success');
                this.displayTrackingInfo(trackingQuery.docs[0].data());
            }
        } catch (error) {
            console.error('Error refreshing tracking:', error);
            showToast('Error refreshing tracking information', 'error');
        }
    }

    selectPickupLocation(locationId) {
        document.querySelectorAll('.pickup-location').forEach(location => {
            location.classList.remove('selected');
        });
        
        const selectedLocation = document.querySelector(`[data-location-id="${locationId}"]`);
        if (selectedLocation) {
            selectedLocation.classList.add('selected');
            
            const summaryElement = document.getElementById('pickupLocationSummary');
            if (summaryElement) {
                summaryElement.textContent = selectedLocation.dataset.locationName;
            }
        }
    }

    selectDeliveryTimeSlot(slotId) {
        document.querySelectorAll('.delivery-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        const selectedSlot = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
            
            const summaryElement = document.getElementById('deliverySlotSummary');
            if (summaryElement) {
                summaryElement.textContent = `${selectedSlot.dataset.date} at ${selectedSlot.dataset.time}`;
            }
        }
    }

    initializeDeliveryMap() {
        const mapElement = document.getElementById('deliveryMap');
        if (mapElement && typeof google !== 'undefined') {
            const map = new google.maps.Map(mapElement, {
                center: { lat: -34.397, lng: 150.644 },
                zoom: 8
            });
            
            this.loadPickupLocationsOnMap(map);
        }
    }

    loadPickupLocationsOnMap(map) {
        const locations = [
            { lat: -34.397, lng: 150.644, name: 'Central Warehouse' },
            { lat: -34.400, lng: 150.650, name: 'North Distribution' },
            { lat: -34.390, lng: 150.640, name: 'South Logistics' }
        ];
        
        locations.forEach(location => {
            new google.maps.Marker({
                position: location,
                map: map,
                title: location.name
            });
        });
    }

    async validateAddress() {
        const addressInput = document.getElementById('shippingAddress');
        if (!addressInput?.value) {
            showToast('Please enter an address', 'warning');
            return;
        }

        try {
            showToast('Validating address...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const validationResult = {
                valid: true,
                normalizedAddress: addressInput.value,
                suggestions: []
            };
            
            this.displayAddressValidationResult(validationResult);
        } catch (error) {
            console.error('Error validating address:', error);
            showToast('Error validating address', 'error');
        }
    }

    displayAddressValidationResult(result) {
        const validationElement = document.getElementById('addressValidationResult');
        if (validationElement) {
            if (result.valid) {
                validationElement.innerHTML = `
                    <div class="text-green-600">
                        <i class="fas fa-check-circle"></i> Address validated successfully
                    </div>
                `;
            } else {
                validationElement.innerHTML = `
                    <div class="text-yellow-600">
                        <i class="fas fa-exclamation-triangle"></i> Address validation failed
                        ${result.suggestions.length > 0 ? `
                            <div class="mt-2">
                                <p class="font-semibold">Suggestions:</p>
                                ${result.suggestions.map(suggestion => `
                                    <p class="text-sm">${suggestion}</p>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }
    }
}

// Customer Support System
class CustomerSupportSystem {
    constructor() {
        this.searchResults = [];
    }

    initializeSupportSystems() {
        document.addEventListener('input', (e) => {
            if (e.target.matches('.help-center-search')) {
                this.searchHelpCenter(e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.faq-category-toggle')) {
                this.toggleFAQCategory(e.target.dataset.categoryId);
            } else if (e.target.matches('.live-chat-toggle')) {
                this.toggleLiveChat();
            } else if (e.target.matches('.minimize-chat-btn')) {
                this.minimizeChat();
            } else if (e.target.matches('.close-chat-btn')) {
                this.closeChat();
            } else if (e.target.matches('.send-support-message')) {
                this.sendSupportMessage();
            } else if (e.target.matches('.submit-support-ticket')) {
                this.submitSupportTicket(new FormData(e.target.closest('form')));
            } else if (e.target.matches('.contact-category-item')) {
                this.selectContactCategory(e.target.dataset.category);
            }
        });

        this.initializeLiveChat();
    }

    async searchHelpCenter(query) {
        if (query.length < 2) {
            this.clearSearchResults();
            return;
        }

        try {
            const articlesQuery = await db.collection('helpArticles')
                .where('keywords', 'array-contains', query.toLowerCase())
                .limit(10)
                .get();

            this.searchResults = [];
            articlesQuery.forEach(doc => {
                this.searchResults.push({ id: doc.id, ...doc.data() });
            });

            this.displaySearchResults();
        } catch (error) {
            console.error('Error searching help center:', error);
        }
    }

    displaySearchResults() {
        const resultsContainer = document.getElementById('helpSearchResults');
        if (resultsContainer) {
            if (this.searchResults.length === 0) {
                resultsContainer.innerHTML = '<p class="text-gray-500">No results found</p>';
                return;
            }

            resultsContainer.innerHTML = this.searchResults.map(article => `
                <div class="border-b border-gray-200 py-3">
                    <h4 class="font-semibold text-blue-600 cursor-pointer hover:underline" 
                        onclick="customerSupport.openArticle('${article.id}')">
                        ${article.title}
                    </h4>
                    <p class="text-sm text-gray-600 mt-1">${article.summary}</p>
                </div>
            `).join('');
        }
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('helpSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    async openArticle(articleId) {
        try {
            const articleDoc = await db.collection('helpArticles').doc(articleId).get();
            if (articleDoc.exists) {
                const article = articleDoc.data();
                this.displayArticleModal(article);
            }
        } catch (error) {
            console.error('Error opening article:', error);
        }
    }

    displayArticleModal(article) {
        const modal = document.getElementById('articleModal');
        if (modal) {
            modal.querySelector('.article-title').textContent = article.title;
            modal.querySelector('.article-content').innerHTML = article.content;
            modal.classList.remove('hidden');
        }
    }

    toggleFAQCategory(categoryId) {
        const categoryElement = document.querySelector(`[data-category-id="${categoryId}"]`);
        const contentElement = document.querySelector(`#faq-content-${categoryId}`);
        
        if (categoryElement && contentElement) {
            const isExpanded = categoryElement.classList.contains('expanded');
            
            document.querySelectorAll('.faq-category').forEach(cat => {
                cat.classList.remove('expanded');
            });
            document.querySelectorAll('.faq-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            if (!isExpanded) {
                categoryElement.classList.add('expanded');
                contentElement.classList.remove('hidden');
            }
        }
    }

    initializeLiveChat() {
        this.chatMessages = [];
        this.chatOpen = false;
        this.chatMinimized = false;
    }

    toggleLiveChat() {
        const chatWidget = document.getElementById('liveChatWidget');
        if (chatWidget) {
            this.chatOpen = !this.chatOpen;
            chatWidget.classList.toggle('hidden', !this.chatOpen);
            
            if (this.chatOpen) {
                this.loadChatHistory();
            }
        }
    }

    minimizeChat() {
        const chatBody = document.getElementById('chatBody');
        if (chatBody) {
            this.chatMinimized = !this.chatMinimized;
            chatBody.classList.toggle('hidden', this.chatMinimized);
        }
    }

    closeChat() {
        const chatWidget = document.getElementById('liveChatWidget');
        if (chatWidget) {
            this.chatOpen = false;
            chatWidget.classList.add('hidden');
        }
    }

    async loadChatHistory() {
        try {
            const chatQuery = await db.collection('supportChats')
                .where('userId', '==', currentUser.uid)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            this.chatMessages = [];
            chatQuery.forEach(doc => {
                this.chatMessages.push(doc.data());
            });

            this.chatMessages.reverse();
            this.displayChatMessages();
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    displayChatMessages() {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
            chatContainer.innerHTML = this.chatMessages.map(msg => `
                <div class="message ${msg.sender === 'user' ? 'user-message' : 'agent-message'}">
                    <div class="message-content">${msg.content}</div>
                    <div class="message-time">${msg.timestamp?.toDate?.().toLocaleTimeString() || 'N/A'}</div>
                </div>
            `).join('');
            
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    async sendSupportMessage() {
        const messageInput = document.getElementById('chatMessageInput');
        const message = messageInput?.value.trim();
        
        if (!message) return;

        try {
            const messageData = {
                userId: currentUser.uid,
                sender: 'user',
                content: message,
                timestamp: new Date(),
                chatSession: `support_${currentUser.uid}_${Date.now()}`
            };

            await db.collection('supportChats').add(messageData);
            this.chatMessages.push(messageData);
            this.displayChatMessages();
            
            messageInput.value = '';
            
            await this.simulateAgentResponse();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async simulateAgentResponse() {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const responses = [
            "Thank you for your message. How can I assist you further?",
            "I understand your concern. Let me check that for you.",
            "I'm here to help! Could you provide more details?",
            "Thanks for reaching out. Our team will look into this."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const agentMessage = {
            userId: currentUser.uid,
            sender: 'agent',
            content: randomResponse,
            timestamp: new Date(),
            agentName: 'Support Agent'
        };

        await db.collection('supportChats').add(agentMessage);
        this.chatMessages.push(agentMessage);
        this.displayChatMessages();
    }

    async submitSupportTicket(formData) {
        try {
            const ticketData = {
                userId: currentUser.uid,
                category: formData.get('category'),
                subject: formData.get('subject'),
                description: formData.get('description'),
                priority: formData.get('priority') || 'medium',
                status: 'open',
                createdAt: new Date(),
                ticketNumber: `TKT${Date.now()}`
            };

            await db.collection('supportTickets').add(ticketData);
            showToast('Support ticket submitted successfully', 'success');
            
            document.querySelector('.support-ticket-form').reset();
        } catch (error) {
            console.error('Error submitting support ticket:', error);
            showToast('Error submitting support ticket', 'error');
        }
    }

    selectContactCategory(category) {
        document.querySelectorAll('.contact-category-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = document.querySelector(`[data-category="${category}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            
            const form = document.getElementById('contactForm');
            if (form) {
                form.querySelector('input[name="category"]').value = category;
            }
        }
    }
}

// Advanced Analytics System
class AdvancedAnalyticsSystem {
    constructor() {
        this.dateRange = '30d';
        this.segmentFilters = {};
    }

    initializeAnalyticsSystems() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('.analytics-date-range')) {
                this.updateDateRange(e.target.value);
            } else if (e.target.matches('.customer-segment-filter')) {
                this.updateSegmentFilter(e.target.name, e.target.value);
            } else if (e.target.matches('.inventory-forecast-input')) {
                this.updateInventoryForecast(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.recovery-email-trigger')) {
                this.sendAbandonedCartRecovery(e.target.dataset.cartId);
            } else if (e.target.matches('.export-sales-report')) {
                this.exportSalesReport();
            }
        });

        this.initializeAnalyticsDashboard();
    }

    updateDateRange(range) {
        this.dateRange = range;
        this.refreshAnalyticsData();
    }

    updateSegmentFilter(filterName, filterValue) {
        this.segmentFilters[filterName] = filterValue;
        this.refreshCustomerSegments();
    }

    async refreshAnalyticsData() {
        showToast('Updating analytics data...', 'info');
        
        try {
            const analyticsData = await this.fetchAnalyticsData();
            this.updateAnalyticsDashboard(analyticsData);
            showToast('Analytics data updated', 'success');
        } catch (error) {
            console.error('Error refreshing analytics:', error);
            showToast('Error updating analytics', 'error');
        }
    }

    async fetchAnalyticsData() {
        const startDate = this.getStartDateForRange(this.dateRange);
        
        const [salesData, userData, inventoryData] = await Promise.all([
            this.fetchSalesData(startDate),
            this.fetchUserData(startDate),
            this.fetchInventoryData()
        ]);

        return {
            sales: salesData,
            users: userData,
            inventory: inventoryData,
            dateRange: this.dateRange
        };
    }

    async fetchSalesData(startDate) {
        const salesQuery = await db.collection('orders')
            .where('createdAt', '>=', startDate)
            .get();

        let totalRevenue = 0;
        let totalOrders = 0;
        const dailySales = {};

        salesQuery.forEach(doc => {
            const order = doc.data();
            totalRevenue += order.total;
            totalOrders++;
            
            const date = order.createdAt.toDate().toDateString();
            dailySales[date] = (dailySales[date] || 0) + order.total;
        });

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            dailySales: Object.entries(dailySales).map(([date, revenue]) => ({ date, revenue }))
        };
    }

    async fetchUserData(startDate) {
        const usersQuery = await db.collection('users')
            .where('joined', '>=', startDate)
            .get();

        return {
            newUsers: usersQuery.size,
            totalUsers: await this.getTotalUserCount()
        };
    }

    async getTotalUserCount() {
        const usersQuery = await db.collection('users').get();
        return usersQuery.size;
    }

    async fetchInventoryData() {
        const inventoryQuery = await db.collection('listings')
            .where('status', '==', 'active')
            .get();

        let totalInventory = 0;
        let lowStockItems = 0;

        inventoryQuery.forEach(doc => {
            const listing = doc.data();
            totalInventory += listing.inventory || 0;
            if (listing.inventory <= 5) {
                lowStockItems++;
            }
        });

        return {
            totalInventory,
            lowStockItems,
            outOfStockItems: inventoryQuery.docs.filter(doc => doc.data().inventory === 0).length
        };
    }

    updateAnalyticsDashboard(data) {
        this.updateSalesMetrics(data.sales);
        this.updateUserMetrics(data.users);
        this.updateInventoryMetrics(data.inventory);
        this.updateCharts(data);
    }

    updateSalesMetrics(salesData) {
        const revenueElement = document.getElementById('totalRevenue');
        const ordersElement = document.getElementById('totalOrders');
        const aovElement = document.getElementById('averageOrderValue');
        
        if (revenueElement) revenueElement.textContent = CurrencyConverter.formatCurrency(salesData.totalRevenue);
        if (ordersElement) ordersElement.textContent = salesData.totalOrders.toLocaleString();
        if (aovElement) aovElement.textContent = CurrencyConverter.formatCurrency(salesData.averageOrderValue);
    }

    updateUserMetrics(userData) {
        const newUsersElement = document.getElementById('newUsers');
        const totalUsersElement = document.getElementById('totalUsers');
        
        if (newUsersElement) newUsersElement.textContent = userData.newUsers.toLocaleString();
        if (totalUsersElement) totalUsersElement.textContent = userData.totalUsers.toLocaleString();
    }

    updateInventoryMetrics(inventoryData) {
        const totalInventoryElement = document.getElementById('totalInventory');
        const lowStockElement = document.getElementById('lowStockItems');
        const outOfStockElement = document.getElementById('outOfStockItems');
        
        if (totalInventoryElement) totalInventoryElement.textContent = inventoryData.totalInventory.toLocaleString();
        if (lowStockElement) lowStockElement.textContent = inventoryData.lowStockItems.toLocaleString();
        if (outOfStockElement) outOfStockElement.textContent = inventoryData.outOfStockItems.toLocaleString();
    }

    updateCharts(data) {
        this.updateSalesChart(data.sales.dailySales);
        this.updateInventoryChart(data.inventory);
    }

    updateSalesChart(dailySales) {
        const chartElement = document.getElementById('salesChart');
        if (chartElement && typeof Chart !== 'undefined') {
            const ctx = chartElement.getContext('2d');
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dailySales.map(item => new Date(item.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Daily Revenue',
                        data: dailySales.map(item => item.revenue),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sales Trend'
                        }
                    }
                }
            });
        }
    }

    updateInventoryChart(inventoryData) {
        const chartElement = document.getElementById('inventoryChart');
        if (chartElement && typeof Chart !== 'undefined') {
            const ctx = chartElement.getContext('2d');
            
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
                    datasets: [{
                        data: [
                            inventoryData.totalInventory - inventoryData.lowStockItems - inventoryData.outOfStockItems,
                            inventoryData.lowStockItems,
                            inventoryData.outOfStockItems
                        ],
                        backgroundColor: [
                            'rgb(34, 197, 94)',
                            'rgb(234, 179, 8)',
                            'rgb(239, 68, 68)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Inventory Status'
                        }
                    }
                }
            });
        }
    }

    async sendAbandonedCartRecovery(cartId) {
        try {
            const cartDoc = await db.collection('abandonedCarts').doc(cartId).get();
            if (cartDoc.exists) {
                const cart = cartDoc.data();
                
                await db.collection('notifications').add({
                    userId: cart.userId,
                    title: 'Complete Your Purchase',
                    message: 'You have items waiting in your cart! Complete your purchase now.',
                    type: 'cart_recovery',
                    relatedId: cartId,
                    read: false,
                    createdAt: new Date()
                });
                
                showToast('Recovery email sent successfully', 'success');
            }
        } catch (error) {
            console.error('Error sending recovery email:', error);
            showToast('Error sending recovery email', 'error');
        }
    }

    async exportSalesReport() {
        try {
            const analyticsData = await this.fetchAnalyticsData();
            const csvContent = this.convertToCSV(analyticsData);
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales-report-${this.dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            showToast('Sales report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting sales report:', error);
            showToast('Error exporting sales report', 'error');
        }
    }

    convertToCSV(data) {
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Revenue', data.sales.totalRevenue],
            ['Total Orders', data.sales.totalOrders],
            ['Average Order Value', data.sales.averageOrderValue],
            ['New Users', data.users.newUsers],
            ['Total Inventory', data.inventory.totalInventory],
            ['Low Stock Items', data.inventory.lowStockItems],
            ['Out of Stock Items', data.inventory.outOfStockItems]
        ];
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    updateInventoryForecast(input) {
        const forecastValue = parseInt(input.value);
        const currentInventory = parseInt(input.dataset.currentInventory || 0);
        const weeklySales = parseInt(input.dataset.weeklySales || 0);
        
        const weeksOfSupply = weeklySales > 0 ? Math.floor(forecastValue / weeklySales) : 0;
        
        const forecastElement = document.getElementById('inventoryForecastResult');
        if (forecastElement) {
            forecastElement.textContent = `Estimated supply: ${weeksOfSupply} weeks`;
            
            if (weeksOfSupply < 2) {
                forecastElement.classList.add('text-red-600');
                forecastElement.classList.remove('text-yellow-600', 'text-green-600');
            } else if (weeksOfSupply < 4) {
                forecastElement.classList.add('text-yellow-600');
                forecastElement.classList.remove('text-red-600', 'text-green-600');
            } else {
                forecastElement.classList.add('text-green-600');
                forecastElement.classList.remove('text-red-600', 'text-yellow-600');
            }
        }
    }

    getStartDateForRange(range) {
        const now = new Date();
        switch (range) {
            case '7d':
                return new Date(now.setDate(now.getDate() - 7));
            case '30d':
                return new Date(now.setDate(now.getDate() - 30));
            case '90d':
                return new Date(now.setDate(now.getDate() - 90));
            case '1y':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return new Date(0);
        }
    }

    initializeAnalyticsDashboard() {
        this.refreshAnalyticsData();
        
        setInterval(() => {
            this.refreshAnalyticsData();
        }, 300000);
    }

    refreshCustomerSegments() {
        const segmentElement = document.getElementById('customerSegments');
        if (segmentElement) {
            segmentElement.innerHTML = 'Loading segments...';
            
            setTimeout(() => {
                segmentElement.innerHTML = `
                    <div class="segment-item">
                        <h4 class="font-semibold">High Value Customers</h4>
                        <p class="text-sm text-gray-600">Customers with $500+ lifetime value</p>
                    </div>
                    <div class="segment-item">
                        <h4 class="font-semibold">Frequent Shoppers</h4>
                        <p class="text-sm text-gray-600">5+ orders in last 30 days</p>
                    </div>
                    <div class="segment-item">
                        <h4 class="font-semibold">At Risk Customers</h4>
                        <p class="text-sm text-gray-600">No purchases in 90 days</p>
                    </div>
                `;
            }, 1000);
        }
    }
}

// Mobile-Specific Commerce System
class MobileCommerceSystem {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    initializeMobileSystems() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mobile-wallet-pay-btn')) {
                this.processMobileWalletPayment(e.target.dataset.amount);
            } else if (e.target.matches('.one-tap-checkout-btn')) {
                this.processOneTapCheckout();
            } else if (e.target.matches('.mobile-image-upload-btn')) {
                this.openMobileImageUpload();
            }
        });

        this.initializeTouchGestures();
        this.initializeSwipeNavigation();
        this.detectMobileFeatures();
    }

    async processMobileWalletPayment(amount) {
        if (!window.ApplePaySession || !window.GooglePay) {
            showToast('Mobile wallet not available on this device', 'warning');
            return;
        }

        try {
            showToast('Processing mobile wallet payment...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const paymentResult = {
                success: true,
                transactionId: `MW${Date.now()}`,
                amount: amount
            };
            
            if (paymentResult.success) {
                showToast('Payment successful!', 'success');
                this.completeMobileOrder();
            } else {
                showToast('Payment failed', 'error');
            }
        } catch (error) {
            console.error('Mobile wallet payment error:', error);
            showToast('Payment processing failed', 'error');
        }
    }

    completeMobileOrder() {
        const orderSummary = document.getElementById('mobileOrderSummary');
        if (orderSummary) {
            orderSummary.innerHTML = `
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    <p class="font-semibold">Order Complete!</p>
                    <p class="text-sm">Your order has been successfully placed.</p>
                </div>
            `;
        }
    }

    async processOneTapCheckout() {
        if (!currentUser) {
            showToast('Please log in to use one-tap checkout', 'warning');
            return;
        }

        try {
            const cartQuery = await db.collection('cart')
                .where('userId', '==', currentUser.uid)
                .get();

            if (cartQuery.empty) {
                showToast('Your cart is empty', 'warning');
                return;
            }

            const cartItems = [];
            cartQuery.forEach(doc => {
                cartItems.push({ id: doc.id, ...doc.data() });
            });

            showToast('Processing your order...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const defaultAddress = await this.getDefaultShippingAddress();
            const orderResult = await OrderManager.createOrderFromCart(
                currentUser.uid,
                cartItems,
                defaultAddress,
                'one_tap'
            );
            
            showToast('Order placed successfully!', 'success');
            
            window.location.href = `/order-confirmation/${orderResult.orderId}`;
        } catch (error) {
            console.error('One-tap checkout error:', error);
            showToast('Error processing order', 'error');
        }
    }

    async getDefaultShippingAddress() {
        try {
            const addressQuery = await db.collection('userAddresses')
                .where('userId', '==', currentUser.uid)
                .where('isDefault', '==', true)
                .get();

            if (!addressQuery.empty) {
                return addressQuery.docs[0].data();
            }
            
            return {
                street: 'Not specified',
                city: 'Not specified',
                country: 'Not specified'
            };
        } catch (error) {
            console.error('Error getting default address:', error);
            return {
                street: 'Not specified',
                city: 'Not specified',
                country: 'Not specified'
            };
        }
    }

    openMobileImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleMobileImageUpload(file);
            }
        };
        
        input.click();
    }

    handleMobileImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('mobileImagePreview');
            if (preview) {
                preview.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-48 object-cover rounded" alt="Upload preview">
                `;
            }
            
            this.uploadImageToServer(file);
        };
        reader.readAsDataURL(file);
    }

    async uploadImageToServer(file) {
        try {
            showToast('Uploading image...', 'info');
            
            const storageRef = storage.ref().child(`mobile-uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            await db.collection('userUploads').add({
                userId: currentUser.uid,
                imageUrl: downloadURL,
                uploadedAt: new Date(),
                source: 'mobile'
            });
            
            showToast('Image uploaded successfully', 'success');
        } catch (error) {
            console.error('Error uploading image:', error);
            showToast('Error uploading image', 'error');
        }
    }

    initializeTouchGestures() {
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const diffX = this.touchStartX - touchEndX;
            const diffY = this.touchStartY - touchEndY;
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 50) {
                    this.handleSwipe('left');
                } else if (diffX < -50) {
                    this.handleSwipe('right');
                }
            } else {
                if (diffY > 50) {
                    this.handleSwipe('up');
                } else if (diffY < -50) {
                    this.handleSwipe('down');
                }
            }
            
            this.touchStartX = 0;
            this.touchStartY = 0;
        });
    }

    handleSwipe(direction) {
        const activeFilter = document.querySelector('.filter-option.active');
        if (activeFilter) {
            const filters = Array.from(document.querySelectorAll('.filter-option'));
            const currentIndex = filters.indexOf(activeFilter);
            
            let newIndex;
            if (direction === 'left') {
                newIndex = (currentIndex + 1) % filters.length;
            } else if (direction === 'right') {
                newIndex = (currentIndex - 1 + filters.length) % filters.length;
            } else {
                return;
            }
            
            filters[currentIndex].classList.remove('active');
            filters[newIndex].classList.add('active');
            
            this.applyMobileFilter(filters[newIndex].dataset.filter);
        }
    }

    applyMobileFilter(filterType) {
        const productGrid = document.getElementById('mobileProductGrid');
        if (productGrid) {
            productGrid.classList.add('opacity-50');
            
            setTimeout(() => {
                productGrid.classList.remove('opacity-50');
                
                showToast(`Filter applied: ${filterType}`, 'info');
            }, 300);
        }
    }

    initializeSwipeNavigation() {
        const banners = document.querySelectorAll('.mobile-banner');
        let currentBannerIndex = 0;

        setInterval(() => {
            banners.forEach((banner, index) => {
                banner.classList.toggle('active', index === currentBannerIndex);
            });
            
            currentBannerIndex = (currentBannerIndex + 1) % banners.length;
        }, 5000);
    }

    detectMobileFeatures() {
        const features = {
            touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            standalone: window.navigator.standalone === true,
            mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };
        
        if (features.mobile) {
            document.body.classList.add('mobile-device');
        }
        
        if (features.touch) {
            document.body.classList.add('touch-device');
        }
        
        this.optimizeForMobile();
    }

    optimizeForMobile() {
        if (!this.isMobile()) return;
        
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=no');
        }
        
        this.addMobileSpecificStyles();
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    addMobileSpecificStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-device .desktop-only { display: none !important; }
            .mobile-device .mobile-optimized { font-size: 14px; }
            .touch-device button { min-height: 44px; min-width: 44px; }
        `;
        document.head.appendChild(style);
    }
}

// Security & Trust System
class SecurityTrustSystem {
    constructor() {
        this.securityQuestions = {};
    }

    initializeSecuritySystems() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.buyer-protection-info-btn')) {
                this.showBuyerProtectionInfo();
            } else if (e.target.matches('.secure-payment-info-btn')) {
                this.showSecurePaymentInfo();
            } else if (e.target.matches('.privacy-policy-agree')) {
                this.togglePrivacyPolicyAgreement(e.target.checked);
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.matches('.account-recovery-form')) {
                e.preventDefault();
                this.verifySecurityQuestions(new FormData(e.target));
            }
        });

        this.initializeSecurityBadges();
    }

    showBuyerProtectionInfo() {
        const modal = document.getElementById('buyerProtectionModal');
        if (modal) {
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md mx-auto">
                    <h3 class="text-xl font-bold mb-4">Buyer Protection</h3>
                    <div class="space-y-3">
                        <div class="flex items-start">
                            <i class="fas fa-shield-alt text-green-500 mt-1 mr-3"></i>
                            <div>
                                <h4 class="font-semibold">Money Back Guarantee</h4>
                                <p class="text-sm text-gray-600">Get a full refund if your item doesn't arrive or doesn't match the description.</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-lock text-green-500 mt-1 mr-3"></i>
                            <div>
                                <h4 class="font-semibold">Secure Payments</h4>
                                <p class="text-sm text-gray-600">Your payment information is protected with industry-standard encryption.</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <i class="fas fa-user-shield text-green-500 mt-1 mr-3"></i>
                            <div>
                                <h4 class="font-semibold">Identity Verification</h4>
                                <p class="text-sm text-gray-600">Sellers are verified to ensure a safe trading environment.</p>
                            </div>
                        </div>
                    </div>
                    <button onclick="this.closest('.modal').classList.add('hidden')" 
                            class="mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
                        Close
                    </button>
                </div>
            `;
            modal.classList.remove('hidden');
        }
    }

    showSecurePaymentInfo() {
        const tooltip = document.createElement('div');
        tooltip.className = 'secure-payment-tooltip';
        tooltip.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
                <h4 class="font-bold mb-2">Secure Payment</h4>
                <p class="text-sm text-gray-600 mb-2">Your payment details are encrypted and secure.</p>
                <div class="flex items-center space-x-2 text-xs">
                    <i class="fas fa-lock text-green-500"></i>
                    <span>256-bit SSL Encryption</span>
                </div>
                <div class="flex items-center space-x-2 text-xs mt-1">
                    <i class="fas fa-shield-alt text-green-500"></i>
                    <span>PCI DSS Compliant</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 3000);
    }

    togglePrivacyPolicyAgreement(agreed) {
        const checkoutButton = document.getElementById('checkoutButton');
        if (checkoutButton) {
            checkoutButton.disabled = !agreed;
        }
        
        if (agreed) {
            localStorage.setItem('privacyPolicyAgreed', 'true');
        }
    }

    initializeSecurityBadges() {
        const badges = [
            { id: 'ssl', text: 'SSL Secured', icon: 'fa-lock' },
            { id: 'trust', text: 'Trusted Store', icon: 'fa-shield-alt' },
            { id: 'payment', text: 'Secure Payments', icon: 'fa-credit-card' },
            { id: 'guarantee', text: 'Money Back', icon: 'fa-hand-holding-usd' }
        ];
        
        const badgeContainer = document.getElementById('securityBadges');
        if (badgeContainer) {
            badgeContainer.innerHTML = badges.map(badge => `
                <div class="security-badge" data-badge="${badge.id}">
                    <i class="fas ${badge.icon} mr-2"></i>
                    <span>${badge.text}</span>
                </div>
            `).join('');
        }
    }

    async verifySecurityQuestions(formData) {
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const securityAnswers = userData.securityAnswers || {};
                
                let correctAnswers = 0;
                const questions = ['q1', 'q2', 'q3'];
                
                questions.forEach(q => {
                    const userAnswer = securityAnswers[q]?.toLowerCase();
                    const formAnswer = formData.get(q)?.toLowerCase();
                    
                    if (userAnswer && formAnswer && userAnswer === formAnswer) {
                        correctAnswers++;
                    }
                });
                
                if (correctAnswers >= 2) {
                    this.allowAccountRecovery();
                } else {
                    showToast('Security questions verification failed', 'error');
                }
            }
        } catch (error) {
            console.error('Error verifying security questions:', error);
            showToast('Error during account recovery', 'error');
        }
    }

    allowAccountRecovery() {
        const recoveryForm = document.querySelector('.account-recovery-form');
        if (recoveryForm) {
            recoveryForm.innerHTML = `
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    <p>Verification successful! You can now reset your password.</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input type="password" class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
                        Reset Password
                    </button>
                </div>
            `;
        }
    }

    initializeSecurityMonitoring() {
        setInterval(() => {
            this.checkSecurityStatus();
        }, 60000);
    }

    async checkSecurityStatus() {
        try {
            const securityLogs = await db.collection('securityLogs')
                .where('userId', '==', currentUser.uid)
                .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
                .get();

            const suspiciousActivities = securityLogs.docs.filter(doc => 
                doc.data().riskLevel === 'high'
            );

            if (suspiciousActivities.length > 0) {
                this.showSecurityAlert(suspiciousActivities.length);
            }
        } catch (error) {
            console.error('Error checking security status:', error);
        }
    }

    showSecurityAlert(suspiciousCount) {
        const alertElement = document.getElementById('securityAlert');
        if (alertElement) {
            alertElement.innerHTML = `
                <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <span>
                            ${suspiciousCount} suspicious activities detected in the last 24 hours.
                            <a href="/security" class="underline ml-1">Review now</a>
                        </span>
                    </div>
                </div>
            `;
            alertElement.classList.remove('hidden');
        }
    }
}

// Global event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize core systems
    const preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';
    I18n.setLanguage(preferredLanguage);
    CurrencyConverter.initialize();

    // Initialize enhanced systems
    window.productComparison = new ProductComparison();
    window.advancedSearch = new AdvancedSearch();
    window.checkoutSystem = new CheckoutSystem();
    window.customerLoyalty = new CustomerLoyaltySystem();
    window.productManagement = new AdvancedProductManagement();
    window.marketingPromotions = new MarketingPromotionsSystem();
    window.logisticsFulfillment = new LogisticsFulfillmentSystem();
    window.customerSupport = new CustomerSupportSystem();
    window.advancedAnalytics = new AdvancedAnalyticsSystem();
    window.mobileCommerce = new MobileCommerceSystem();
    window.securityTrust = new SecurityTrustSystem();

    // Initialize all event listeners
    checkoutSystem.initializeCheckoutNavigation();
    checkoutSystem.initializeShippingMethods();
    checkoutSystem.initializeDeliveryDateSelection();
    checkoutSystem.initializePaymentMethods();
    checkoutSystem.initializeInvoiceDownload();
    checkoutSystem.initializeReturnRefundSystem();
    checkoutSystem.initializeOrderCancellation();

    customerLoyalty.initializeReviewSystem();
    productManagement.initializeProductManagement();
    marketingPromotions.initializeMarketingSystems();
    logisticsFulfillment.initializeLogisticsSystems();
    customerSupport.initializeSupportSystems();
    advancedAnalytics.initializeAnalyticsSystems();
    mobileCommerce.initializeMobileSystems();
    securityTrust.initializeSecuritySystems();

    // Initialize security monitoring
    securityTrust.initializeSecurityMonitoring();

    console.log('✅ Enhanced marketplace features loaded successfully');
});

// Export all classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ProductVariations,
        InventoryManager,
        BulkListingManager,
        ProductComparison,
        SimilarItemsRecommender,
        OrderManager,
        SellerAnalytics,
        SellerLevelSystem,
        StoreCustomization,
        MessagingSystem,
        AdvancedSearch,
        LocationSearch,
        SecuritySystem,
        FraudDetectionSystem,
        I18n,
        CurrencyConverter,
        CheckoutSystem,
        CustomerLoyaltySystem,
        AdvancedProductManagement,
        MarketingPromotionsSystem,
        LogisticsFulfillmentSystem,
        CustomerSupportSystem,
        AdvancedAnalyticsSystem,
        MobileCommerceSystem,
        SecurityTrustSystem
    };
}
function updateRecentlyViewedCarousel(listingsSnapshots) {
    recentlyViewedContainer.innerHTML = '';
    
    const visibleItems = 4;
    let currentIndex = 0;
    
    function showItems() {
        recentlyViewedContainer.innerHTML = '';
        const itemsToShow = listingsSnapshots.slice(currentIndex, currentIndex + visibleItems);
        
        itemsToShow.forEach(doc => {
            if (doc.exists) {
                const listing = doc.data();
                listing.id = doc.id;
                const productCard = createJumiaProductCard(listing);
                recentlyViewedContainer.appendChild(productCard);
            }
        });
        
        // Update navigation buttons - ADD NULL CHECKS
        if (recentlyViewedPrev) {
            recentlyViewedPrev.disabled = currentIndex === 0;
        }
        if (recentlyViewedNext) {
            recentlyViewedNext.disabled = currentIndex + visibleItems >= listingsSnapshots.length;
        }
    }
    
    // Navigation event listeners - ADD NULL CHECKS
    if (recentlyViewedPrev) {
        recentlyViewedPrev.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex -= visibleItems;
                showItems();
            }
        });
    }
    
    if (recentlyViewedNext) {
        recentlyViewedNext.addEventListener('click', () => {
            if (currentIndex + visibleItems < listingsSnapshots.length) {
                currentIndex += visibleItems;
                showItems();
            }
        });
    }
    
    showItems();
}