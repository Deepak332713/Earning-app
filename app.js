// EarnZone - Main Application JavaScript
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCPvpgRkqIEdpmrvKWh-GBS04BQj2_8SAI",
    authDomain: "earning-app-c048f.firebaseapp.com",
    databaseURL: "https://earning-app-c048f-default-rtdb.firebaseio.com",
    projectId: "earning-app-c048f",
    storageBucket: "earning-app-c048f.firebasestorage.app",
    messagingSenderId: "843375564973",
    appId: "1:843375564973:web:xxxxxx"
};

// Initialize Firebase (only if not already initialized)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// App State
const EarnZone = {
    user: null,
    userData: null,
    isLoggedIn: false,
    language: localStorage.getItem('language') || 'hi',

    // Initialize App
    init: function() {
        this.checkAuth();
        this.setupEventListeners();
        this.checkDarkMode();
        this.loadLanguage();
    },

    // Check Authentication
    checkAuth: function() {
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.user = user;
                    this.isLoggedIn = true;
                    this.loadUserData(user.uid);
                } else {
                    // Check localStorage for phone auth
                    const userId = localStorage.getItem('userId');
                    if (userId) {
                        this.isLoggedIn = true;
                        this.loadUserData(userId);
                    }
                }
            });
        }
    },

    // Load User Data
    loadUserData: function(userId) {
        if (typeof firebase !== 'undefined') {
            firebase.database().ref('users/' + userId).on('value', (snapshot) => {
                this.userData = snapshot.val();
                this.updateUI();
            });
        }
    },

    // Update UI based on user data
    updateUI: function() {
        if (!this.userData) return;

        // Update wallet balance if element exists
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance) {
            walletBalance.textContent = (this.userData.wallet || 0).toFixed(2);
        }

        // Update user name if element exists
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = this.userData.fullName || 'User';
        }

        // Update avatar if element exists
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.textContent = (this.userData.fullName || 'U')[0].toUpperCase();
        }
    },

    // Setup Event Listeners
    setupEventListeners: function() {
        // Service Worker Registration for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                console.log('Service Worker not available');
            });
        }

        // Online/Offline status
        window.addEventListener('online', () => this.showToast('Back online!', 'success'));
        window.addEventListener('offline', () => this.showToast('You are offline', 'warning'));

        // Back button handling
        window.addEventListener('popstate', (e) => {
            // Handle back navigation
        });
    },

    // Dark Mode
    checkDarkMode: function() {
        // App is always in dark mode by design
    },

    // Language Support
    loadLanguage: function() {
        const lang = this.language;
        // Load translations based on language
    },

    // Toast Notifications
    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-primary'
        } text-white`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // Format Currency
    formatCurrency: function(amount) {
        return '₹' + parseFloat(amount).toFixed(2);
    },

    // Format Date
    formatDate: function(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    // Format Time
    formatTime: function(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('hi-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Validate Phone Number
    validatePhone: function(phone) {
        const regex = /^[6-9]\d{9}$/;
        return regex.test(phone);
    },

    // Validate Email
    validateEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Validate UPI ID
    validateUPI: function(upi) {
        const regex = /^[\w.-]+@[\w.-]+$/;
        return regex.test(upi);
    },

    // Generate Referral Code
    generateReferralCode: function() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'EARN';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    // Copy to Clipboard
    copyToClipboard: function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('Copied to clipboard!', 'success');
            });
        } else {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!', 'success');
        }
    },

    // Share
    share: function(data) {
        if (navigator.share) {
            navigator.share(data);
        } else {
            this.copyToClipboard(data.url || data.text);
        }
    },

    // Logout
    logout: function() {
        if (typeof firebase !== 'undefined') {
            firebase.auth().signOut().then(() => {
                localStorage.clear();
                window.location.href = 'login.html';
            });
        } else {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
};

// Utility Functions
const Utils = {
    // Debounce
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Local Storage with expiry
    setWithExpiry: function(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    getWithExpiry: function(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        const now = new Date();

        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    },

    // Random ID Generator
    generateId: function(length = 8) {
        return Math.random().toString(36).substr(2, length);
    },

    // Mask Phone Number
    maskPhone: function(phone) {
        if (!phone) return '';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3');
    },

    // Mask Email
    maskEmail: function(email) {
        if (!email) return '';
        const [name, domain] = email.split('@');
        return name[0] + '***@' + domain;
    },

    // Time Ago
    timeAgo: function(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval + ' ' + unit + (interval === 1 ? '' : 's') + ' ago';
            }
        }
        return 'Just now';
    }
};

// Anti-Fraud Detection
const FraudDetection = {
    checkDeviceFingerprint: function() {
        // Basic device fingerprinting
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('EarnZone', 2, 2);

        return canvas.toDataURL().slice(-50);
    },

    checkMultipleAccounts: function() {
        const deviceId = this.checkDeviceFingerprint();
        const storedDeviceId = localStorage.getItem('deviceId');

        if (storedDeviceId && storedDeviceId !== deviceId) {
            return true; // Potential multiple account
        }

        localStorage.setItem('deviceId', deviceId);
        return false;
    },

    checkVPN: function() {
        // Basic VPN detection (would need server-side for accuracy)
        return false;
    },

    checkEmulator: function() {
        // Basic emulator detection
        const userAgent = navigator.userAgent.toLowerCase();
        const emulatorKeywords = ['bluestacks', 'nox', 'android sdk', 'genymotion'];

        return emulatorKeywords.some(keyword => userAgent.includes(keyword));
    },

    validateActivity: function(activity) {
        // Check for suspicious activity patterns
        const lastActivity = localStorage.getItem('lastActivity');
        const now = Date.now();

        if (lastActivity) {
            const timeDiff = now - parseInt(lastActivity);
            if (timeDiff < 1000) { // Less than 1 second
                return false; // Too fast, possible bot
            }
        }

        localStorage.setItem('lastActivity', now.toString());
        return true;
    }
};

// Push Notifications
const PushNotifications = {
    init: function() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.subscribeToTopics();
                }
            });
        }
    },

    subscribeToTopics: function() {
        // Subscribe to relevant topics
    },

    show: function(title, body, icon) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: icon || '/icons/icon-192.png',
                badge: '/icons/badge.png'
            });
        }
    }
};

// Analytics
const Analytics = {
    track: function(event, data = {}) {
        // Track events
        console.log('Track:', event, data);

        // Send to analytics server
        if (typeof firebase !== 'undefined' && firebase.analytics) {
            firebase.analytics().logEvent(event, data);
        }
    },

    pageView: function(pageName) {
        this.track('page_view', { page: pageName });
    },

    taskCompleted: function(taskId, reward) {
        this.track('task_completed', { task_id: taskId, reward: reward });
    },

    withdrawal: function(amount, method) {
        this.track('withdrawal', { amount: amount, method: method });
    }
};

// Initialize App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    EarnZone.init();

    // Track page view
    Analytics.pageView(window.location.pathname);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EarnZone, Utils, FraudDetection, PushNotifications, Analytics };
}
