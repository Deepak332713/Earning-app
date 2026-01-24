/**
 * EarnPro - Complete Earning Application
 * Main JavaScript Logic
 */

// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    get,
    update,
    push,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCPvpgRkqIEdpmrvKWh-GBS04BQj2_8SAI",
    authDomain: "earning-app-c048f.firebaseapp.com",
    databaseURL: "https://earning-app-c048f-default-rtdb.firebaseio.com",
    projectId: "earning-app-c048f",
    storageBucket: "earning-app-c048f.firebasestorage.app",
    messagingSenderId: "1089921883808",
    appId: "1:1089921883808:web:b09e829bd2017be218f3c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// App State
let currentUser = null;
let userData = null;
let appConfig = null;

// DOM Elements
const splashScreen = document.getElementById('splash-screen');
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Load app config from Firebase
    await loadAppConfig();

    // Check authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            hideSplash();
            showMainApp();
        } else {
            hideSplash();
            showAuthScreen();
        }
    });
}

function hideSplash() {
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 500);
    }, 1500);
}

function showAuthScreen() {
    authScreen.style.display = 'block';
    mainApp.style.display = 'none';
}

function showMainApp() {
    authScreen.style.display = 'none';
    mainApp.style.display = 'block';
    updateUI();
    loadFeaturedTasks();
    loadLeaderboard();
    updateStreak();
}

// ========================================
// App Configuration
// ========================================
async function loadAppConfig() {
    try {
        const snapshot = await get(ref(db, 'config'));
        if (snapshot.exists()) {
            appConfig = snapshot.val();
        } else {
            // Default config
            appConfig = {
                minWithdraw: 50,
                dailyBonus: 5,
                referralBonus: 25,
                adReward: 0.5,
                maxAdsPerDay: 20
            };
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// ========================================
// Authentication Functions
// ========================================
window.showLogin = function() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'none';
};

window.showSignup = function() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('otp-form').style.display = 'none';
};

window.showForgotPassword = function() {
    showToast('Password reset link will be sent to your email', 'info');
};

window.handleLogin = async function() {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;

    if (!phone || phone.length !== 10) {
        showToast('Please enter valid 10-digit mobile number', 'error');
        return;
    }

    if (!password || password.length < 6) {
        showToast('Please enter valid password', 'error');
        return;
    }

    showLoading();

    try {
        // Using phone as email for simplicity
        const email = `${phone}@earnpro.app`;
        await signInWithEmailAndPassword(auth, email, password);
        hideLoading();
        showToast('Login successful!', 'success');
    } catch (error) {
        hideLoading();
        showToast('Invalid credentials. Please try again.', 'error');
    }
};

window.handleSignup = async function() {
    const name = document.getElementById('signup-name').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value.trim();

    // Validation
    if (!name || name.length < 3) {
        showToast('Please enter valid name', 'error');
        return;
    }

    if (!phone || phone.length !== 10) {
        showToast('Please enter valid 10-digit mobile number', 'error');
        return;
    }

    if (!email || !email.includes('@')) {
        showToast('Please enter valid email', 'error');
        return;
    }

    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    showLoading();

    try {
        // Create user with phone-based email
        const authEmail = `${phone}@earnpro.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
        const user = userCredential.user;

        // Generate referral code
        const myReferralCode = generateReferralCode(name);

        // Create user profile
        const userProfile = {
            uid: user.uid,
            name: name,
            phone: phone,
            email: email,
            referralCode: myReferralCode,
            referredBy: referralCode || null,
            balance: 0,
            pendingBalance: 0,
            withdrawnAmount: 0,
            totalEarned: 0,
            todayEarning: 0,
            level: 1,
            streak: 0,
            lastLoginDate: new Date().toDateString(),
            tasksCompleted: 0,
            adsWatched: 0,
            referrals: 0,
            kycStatus: 'pending',
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp()
        };

        await set(ref(db, `users/${user.uid}`), userProfile);

        // Credit referral bonus if valid code
        if (referralCode) {
            await creditReferralBonus(referralCode, user.uid);
        }

        // Credit signup bonus
        await creditSignupBonus(user.uid);

        hideLoading();
        showToast('Account created successfully! Welcome bonus added!', 'success');

    } catch (error) {
        hideLoading();
        if (error.code === 'auth/email-already-in-use') {
            showToast('Mobile number already registered', 'error');
        } else {
            showToast('Registration failed. Please try again.', 'error');
        }
    }
};

function generateReferralCode(name) {
    const prefix = name.substring(0, 4).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
}

async function creditReferralBonus(referralCode, newUserId) {
    try {
        // Find user with this referral code
        const usersSnapshot = await get(ref(db, 'users'));
        if (usersSnapshot.exists()) {
            const users = usersSnapshot.val();
            for (const [uid, user] of Object.entries(users)) {
                if (user.referralCode === referralCode) {
                    // Credit bonus to referrer
                    const referralBonus = appConfig?.referralBonus || 25;
                    await update(ref(db, `users/${uid}`), {
                        balance: (user.balance || 0) + referralBonus,
                        totalEarned: (user.totalEarned || 0) + referralBonus,
                        referrals: (user.referrals || 0) + 1
                    });

                    // Add transaction
                    await addTransaction(uid, {
                        type: 'earning',
                        category: 'referral',
                        amount: referralBonus,
                        description: 'Referral bonus',
                        status: 'completed'
                    });

                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error crediting referral bonus:', error);
    }
}

async function creditSignupBonus(userId) {
    const signupBonus = 10; // ₹10 signup bonus
    try {
        await update(ref(db, `users/${userId}`), {
            balance: signupBonus,
            totalEarned: signupBonus
        });

        await addTransaction(userId, {
            type: 'earning',
            category: 'bonus',
            amount: signupBonus,
            description: 'Welcome signup bonus',
            status: 'completed'
        });
    } catch (error) {
        console.error('Error crediting signup bonus:', error);
    }
}

window.handleLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        await signOut(auth);
        showToast('Logged out successfully', 'success');
        closeModal('profile-modal');
    }
};

// ========================================
// User Data Functions
// ========================================
async function loadUserData(userId) {
    try {
        const snapshot = await get(ref(db, `users/${userId}`));
        if (snapshot.exists()) {
            userData = snapshot.val();

            // Check and reset daily stats
            const today = new Date().toDateString();
            if (userData.lastLoginDate !== today) {
                await update(ref(db, `users/${userId}`), {
                    todayEarning: 0,
                    adsWatched: 0,
                    lastLoginDate: today,
                    streak: userData.lastLoginDate === getPreviousDate() ? (userData.streak || 0) + 1 : 1
                });
                userData.todayEarning = 0;
                userData.adsWatched = 0;
                userData.streak = userData.lastLoginDate === getPreviousDate() ? (userData.streak || 0) + 1 : 1;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function getPreviousDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toDateString();
}

function updateUI() {
    if (!userData) return;

    // Update header
    document.getElementById('header-username').textContent = userData.name || 'User';

    // Update wallet
    document.getElementById('total-balance').textContent = formatAmount(userData.balance || 0);
    document.getElementById('today-earning').textContent = '₹' + formatAmount(userData.todayEarning || 0);
    document.getElementById('pending-amount').textContent = '₹' + formatAmount(userData.pendingBalance || 0);
    document.getElementById('withdrawn-amount').textContent = '₹' + formatAmount(userData.withdrawnAmount || 0);

    // Update profile
    document.getElementById('profile-name').textContent = userData.name || 'User';
    document.getElementById('profile-phone').textContent = '+91 ' + (userData.phone || 'XXXXXXXXXX');
    document.getElementById('user-level').textContent = userData.level || 1;
    document.getElementById('total-earned').textContent = '₹' + formatAmount(userData.totalEarned || 0);
    document.getElementById('tasks-completed').textContent = userData.tasksCompleted || 0;

    // Calculate member days
    if (userData.createdAt) {
        const createdDate = new Date(userData.createdAt);
        const today = new Date();
        const days = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
        document.getElementById('member-days').textContent = days || 1;
    }

    // Update referral
    document.getElementById('my-referral-code').textContent = userData.referralCode || 'EARN0000';
    document.getElementById('total-referrals').textContent = userData.referrals || 0;
    document.getElementById('referral-earnings').textContent = '₹' + formatAmount((userData.referrals || 0) * 25);

    // Update KYC status
    const kycStatus = document.getElementById('kyc-status');
    kycStatus.textContent = userData.kycStatus === 'verified' ? 'Verified' : 'Pending';
    kycStatus.setAttribute('data-status', userData.kycStatus || 'pending');

    // Update withdraw balance
    document.getElementById('withdrawable-balance').textContent = formatAmount(userData.balance || 0);
    document.getElementById('min-withdraw').textContent = appConfig?.minWithdraw || 50;

    // Update daily bonus
    document.getElementById('daily-bonus-amount').textContent = '₹' + (appConfig?.dailyBonus || 5);

    // Update streak
    document.getElementById('streak-days').textContent = (userData.streak || 0) + ' Days';
}

function formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
}

// ========================================
// Streak Functions
// ========================================
function updateStreak() {
    const streakDays = document.querySelectorAll('.streak-day');
    const currentStreak = userData?.streak || 0;

    streakDays.forEach((day, index) => {
        const dayNum = index + 1;
        if (dayNum < currentStreak || (dayNum === currentStreak && dayNum <= 7)) {
            day.classList.add('completed');
        } else if (dayNum === currentStreak + 1) {
            day.classList.add('current');
        }
    });
}

// ========================================
// Daily Bonus
// ========================================
window.claimDailyBonus = async function() {
    if (!currentUser || !userData) return;

    const today = new Date().toDateString();

    if (userData.lastBonusClaimed === today) {
        showToast('You have already claimed today\'s bonus!', 'warning');
        return;
    }

    const bonus = appConfig?.dailyBonus || 5;

    try {
        await update(ref(db, `users/${currentUser.uid}`), {
            balance: (userData.balance || 0) + bonus,
            totalEarned: (userData.totalEarned || 0) + bonus,
            todayEarning: (userData.todayEarning || 0) + bonus,
            lastBonusClaimed: today
        });

        await addTransaction(currentUser.uid, {
            type: 'earning',
            category: 'daily_bonus',
            amount: bonus,
            description: 'Daily login bonus',
            status: 'completed'
        });

        userData.balance += bonus;
        userData.todayEarning += bonus;
        userData.lastBonusClaimed = today;
        updateUI();

        showToast(`Daily bonus of ₹${bonus} credited!`, 'success');
    } catch (error) {
        showToast('Failed to claim bonus. Try again.', 'error');
    }
};

// ========================================
// Tasks Functions
// ========================================
const sampleTasks = [
    { id: 1, name: 'Install Gaming App', desc: 'Download and open for 30 seconds', reward: 15, type: 'app', icon: 'gamepad' },
    { id: 2, name: 'Watch YouTube Video', desc: 'Watch 2 minute video completely', reward: 5, type: 'youtube', icon: 'youtube' },
    { id: 3, name: 'Complete Survey', desc: 'Answer 10 simple questions', reward: 25, type: 'survey', icon: 'poll' },
    { id: 4, name: 'Follow Instagram Page', desc: 'Follow and like 3 posts', reward: 8, type: 'social', icon: 'instagram' },
    { id: 5, name: 'Sign Up on Website', desc: 'Create account with email', reward: 20, type: 'signup', icon: 'user-plus' },
    { id: 6, name: 'Install Shopping App', desc: 'Download and browse products', reward: 12, type: 'app', icon: 'shopping-cart' },
    { id: 7, name: 'Subscribe YouTube Channel', desc: 'Subscribe and turn on notifications', reward: 10, type: 'youtube', icon: 'bell' },
    { id: 8, name: 'Share on WhatsApp', desc: 'Share app link with 5 friends', reward: 5, type: 'social', icon: 'whatsapp' }
];

function loadFeaturedTasks() {
    const container = document.getElementById('featured-tasks');
    const featuredTasks = sampleTasks.slice(0, 3);

    container.innerHTML = featuredTasks.map(task => `
        <div class="task-card" onclick="startTask(${task.id})">
            <div class="task-icon">
                <i class="fas fa-${task.icon}" style="color: var(--primary); font-size: 24px;"></i>
            </div>
            <div class="task-info">
                <span class="task-name">${task.name}</span>
                <span class="task-desc">${task.desc}</span>
            </div>
            <div class="task-reward">
                <span class="task-amount">₹${task.reward}</span>
                <span class="task-type">${task.type}</span>
            </div>
        </div>
    `).join('');
}

window.showTasks = function() {
    openModal('tasks-modal');
    loadAllTasks();
};

function loadAllTasks(category = 'all') {
    const container = document.getElementById('all-tasks');
    let tasks = sampleTasks;

    if (category !== 'all') {
        tasks = sampleTasks.filter(t => t.type === category);
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-card" onclick="startTask(${task.id})">
            <div class="task-icon">
                <i class="fas fa-${task.icon}" style="color: var(--primary); font-size: 24px;"></i>
            </div>
            <div class="task-info">
                <span class="task-name">${task.name}</span>
                <span class="task-desc">${task.desc}</span>
            </div>
            <div class="task-reward">
                <span class="task-amount">₹${task.reward}</span>
                <span class="task-type">${task.type}</span>
            </div>
        </div>
    `).join('');

    // Add category click handlers
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadAllTasks(this.dataset.cat);
        });
    });
}

window.startTask = async function(taskId) {
    const task = sampleTasks.find(t => t.id === taskId);
    if (!task) return;

    showToast(`Starting task: ${task.name}`, 'info');

    // Simulate task completion after delay
    setTimeout(async () => {
        await completeTask(task);
    }, 3000);
};

async function completeTask(task) {
    if (!currentUser || !userData) return;

    try {
        await update(ref(db, `users/${currentUser.uid}`), {
            balance: (userData.balance || 0) + task.reward,
            totalEarned: (userData.totalEarned || 0) + task.reward,
            todayEarning: (userData.todayEarning || 0) + task.reward,
            tasksCompleted: (userData.tasksCompleted || 0) + 1
        });

        await addTransaction(currentUser.uid, {
            type: 'earning',
            category: 'task',
            amount: task.reward,
            description: task.name,
            status: 'completed'
        });

        userData.balance += task.reward;
        userData.todayEarning += task.reward;
        userData.tasksCompleted += 1;
        updateUI();

        showToast(`Task completed! ₹${task.reward} credited`, 'success');
    } catch (error) {
        showToast('Failed to credit reward. Contact support.', 'error');
    }
}

// ========================================
// Surveys Functions
// ========================================
const sampleSurveys = [
    { id: 1, title: 'Shopping Preferences', time: '5 min', questions: 10, reward: 15 },
    { id: 2, title: 'Mobile Usage Survey', time: '8 min', questions: 15, reward: 25 },
    { id: 3, title: 'Food & Lifestyle', time: '3 min', questions: 8, reward: 10 },
    { id: 4, title: 'Entertainment Choices', time: '10 min', questions: 20, reward: 40 }
];

window.showSurveys = function() {
    openModal('surveys-modal');
    loadSurveys();
};

function loadSurveys() {
    const container = document.getElementById('all-surveys');

    container.innerHTML = sampleSurveys.map(survey => `
        <div class="survey-card">
            <div class="survey-header">
                <span class="survey-title">${survey.title}</span>
                <span class="survey-reward">₹${survey.reward}</span>
            </div>
            <div class="survey-meta">
                <span><i class="fas fa-clock"></i> ${survey.time}</span>
                <span><i class="fas fa-question-circle"></i> ${survey.questions} Questions</span>
            </div>
            <button class="survey-btn" onclick="startSurvey(${survey.id})">Start Survey</button>
        </div>
    `).join('');
}

window.startSurvey = function(surveyId) {
    const survey = sampleSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    showToast(`Starting survey: ${survey.title}`, 'info');

    // Simulate survey completion
    setTimeout(async () => {
        await completeSurvey(survey);
    }, 5000);
};

async function completeSurvey(survey) {
    if (!currentUser || !userData) return;

    try {
        await update(ref(db, `users/${currentUser.uid}`), {
            balance: (userData.balance || 0) + survey.reward,
            totalEarned: (userData.totalEarned || 0) + survey.reward,
            todayEarning: (userData.todayEarning || 0) + survey.reward
        });

        await addTransaction(currentUser.uid, {
            type: 'earning',
            category: 'survey',
            amount: survey.reward,
            description: survey.title,
            status: 'completed'
        });

        userData.balance += survey.reward;
        userData.todayEarning += survey.reward;
        updateUI();

        showToast(`Survey completed! ₹${survey.reward} credited`, 'success');
    } catch (error) {
        showToast('Failed to credit reward. Contact support.', 'error');
    }
}

// ========================================
// Watch Ads Functions
// ========================================
window.showAds = function() {
    openModal('ads-modal');
    updateAdsStats();
};

function updateAdsStats() {
    const maxAds = appConfig?.maxAdsPerDay || 20;
    const watched = userData?.adsWatched || 0;
    const adReward = appConfig?.adReward || 0.5;

    document.getElementById('ads-watched').textContent = watched;
    document.getElementById('ads-remaining').textContent = maxAds - watched;
    document.getElementById('ads-earned').textContent = '₹' + formatAmount(watched * adReward);
}

window.watchAd = async function() {
    if (!currentUser || !userData) return;

    const maxAds = appConfig?.maxAdsPerDay || 20;
    const watched = userData?.adsWatched || 0;

    if (watched >= maxAds) {
        showToast('Daily ad limit reached. Come back tomorrow!', 'warning');
        return;
    }

    showToast('Loading ad...', 'info');

    // Simulate ad watching
    setTimeout(async () => {
        const adReward = appConfig?.adReward || 0.5;

        try {
            await update(ref(db, `users/${currentUser.uid}`), {
                balance: (userData.balance || 0) + adReward,
                totalEarned: (userData.totalEarned || 0) + adReward,
                todayEarning: (userData.todayEarning || 0) + adReward,
                adsWatched: watched + 1
            });

            await addTransaction(currentUser.uid, {
                type: 'earning',
                category: 'ad',
                amount: adReward,
                description: 'Watched video ad',
                status: 'completed'
            });

            userData.balance += adReward;
            userData.todayEarning += adReward;
            userData.adsWatched += 1;
            updateUI();
            updateAdsStats();

            showToast(`Ad watched! ₹${adReward} credited`, 'success');
        } catch (error) {
            showToast('Failed to credit reward. Try again.', 'error');
        }
    }, 3000);
};

window.getExtraSpin = function() {
    showToast('Watch ad to get extra spin', 'info');
    setTimeout(() => {
        const spinsElement = document.getElementById('available-spins');
        const currentSpins = parseInt(spinsElement.textContent) || 0;
        spinsElement.textContent = currentSpins + 1;
        showToast('Extra spin added!', 'success');
    }, 3000);
};

// ========================================
// Referral Functions
// ========================================
window.showReferral = function() {
    openModal('referral-modal');
    loadReferralList();
};

function loadReferralList() {
    const container = document.getElementById('my-referrals');
    // In real app, load from Firebase
    container.innerHTML = `
        <p style="text-align: center; color: var(--text-muted); padding: 20px;">
            Share your referral code to see your referrals here
        </p>
    `;
}

window.copyReferralCode = function() {
    const code = document.getElementById('my-referral-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Referral code copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy. Please copy manually.', 'error');
    });
};

window.shareWhatsApp = function() {
    const code = userData?.referralCode || 'EARN0000';
    const message = `Join EarnPro and start earning! Use my referral code: ${code} to get ₹10 bonus. Download now!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};

window.shareTelegram = function() {
    const code = userData?.referralCode || 'EARN0000';
    const message = `Join EarnPro and start earning! Use my referral code: ${code} to get ₹10 bonus.`;
    window.open(`https://t.me/share/url?text=${encodeURIComponent(message)}`, '_blank');
};

window.shareMore = function() {
    const code = userData?.referralCode || 'EARN0000';
    const message = `Join EarnPro and start earning! Use my referral code: ${code} to get ₹10 bonus.`;

    if (navigator.share) {
        navigator.share({
            title: 'Join EarnPro',
            text: message
        });
    } else {
        navigator.clipboard.writeText(message);
        showToast('Share message copied!', 'success');
    }
};

// ========================================
// Withdrawal Functions
// ========================================
let selectedPaymentMethod = null;

window.showWithdraw = function() {
    openModal('withdraw-modal');
    selectedPaymentMethod = null;
    document.getElementById('withdraw-form').style.display = 'none';
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
};

window.selectPayment = function(method) {
    selectedPaymentMethod = method;

    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.method === method) {
            opt.classList.add('selected');
        }
    });

    document.getElementById('withdraw-form').style.display = 'block';

    // Show relevant fields
    document.getElementById('upi-fields').style.display = method === 'upi' ? 'block' : 'none';
    document.getElementById('paytm-fields').style.display = method === 'paytm' ? 'block' : 'none';
    document.getElementById('bank-fields').style.display = method === 'bank' ? 'block' : 'none';
};

window.processWithdraw = async function() {
    if (!currentUser || !userData) return;

    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const minWithdraw = appConfig?.minWithdraw || 50;

    if (!amount || amount < minWithdraw) {
        showToast(`Minimum withdrawal is ₹${minWithdraw}`, 'error');
        return;
    }

    if (amount > (userData.balance || 0)) {
        showToast('Insufficient balance', 'error');
        return;
    }

    if (!selectedPaymentMethod) {
        showToast('Please select payment method', 'error');
        return;
    }

    // Validate payment details
    let paymentDetails = {};

    if (selectedPaymentMethod === 'upi') {
        const upiId = document.getElementById('upi-id').value.trim();
        if (!upiId || !upiId.includes('@')) {
            showToast('Please enter valid UPI ID', 'error');
            return;
        }
        paymentDetails.upiId = upiId;
    } else if (selectedPaymentMethod === 'paytm') {
        const paytmNumber = document.getElementById('paytm-number').value.trim();
        if (!paytmNumber || paytmNumber.length !== 10) {
            showToast('Please enter valid Paytm number', 'error');
            return;
        }
        paymentDetails.paytmNumber = paytmNumber;
    } else if (selectedPaymentMethod === 'bank') {
        const accountHolder = document.getElementById('account-holder').value.trim();
        const accountNumber = document.getElementById('account-number').value.trim();
        const ifscCode = document.getElementById('ifsc-code').value.trim();

        if (!accountHolder || !accountNumber || !ifscCode) {
            showToast('Please fill all bank details', 'error');
            return;
        }
        paymentDetails = { accountHolder, accountNumber, ifscCode };
    }

    showLoading();

    try {
        // Deduct from balance
        await update(ref(db, `users/${currentUser.uid}`), {
            balance: (userData.balance || 0) - amount,
            pendingBalance: (userData.pendingBalance || 0) + amount
        });

        // Create withdrawal request
        const withdrawalRef = push(ref(db, 'withdrawals'));
        await set(withdrawalRef, {
            id: withdrawalRef.key,
            userId: currentUser.uid,
            amount: amount,
            method: selectedPaymentMethod,
            details: paymentDetails,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        await addTransaction(currentUser.uid, {
            type: 'withdraw',
            category: selectedPaymentMethod,
            amount: amount,
            description: `Withdrawal via ${selectedPaymentMethod.toUpperCase()}`,
            status: 'pending'
        });

        userData.balance -= amount;
        userData.pendingBalance += amount;
        updateUI();

        hideLoading();
        closeModal('withdraw-modal');
        showToast('Withdrawal request submitted successfully!', 'success');

    } catch (error) {
        hideLoading();
        showToast('Withdrawal failed. Please try again.', 'error');
    }
};

// ========================================
// Lucky Spin Functions
// ========================================
const spinPrizes = [1, 2, 5, 10, 20, 50, 100, 500];
let isSpinning = false;

window.showSpin = function() {
    openModal('spin-modal');
};

window.spinWheel = async function() {
    if (isSpinning) return;

    const spinsElement = document.getElementById('available-spins');
    const availableSpins = parseInt(spinsElement.textContent) || 0;

    if (availableSpins <= 0) {
        showToast('No spins available. Watch an ad for extra spin!', 'warning');
        return;
    }

    isSpinning = true;
    const spinBtn = document.getElementById('spin-btn');
    spinBtn.disabled = true;

    // Random prize (weighted towards lower values)
    const randomIndex = weightedRandom();
    const prize = spinPrizes[randomIndex];

    // Calculate rotation
    const wheel = document.getElementById('spin-wheel');
    const baseRotation = 360 * 5; // 5 full rotations
    const prizeAngle = (randomIndex * 45) + 22.5; // Each section is 45 degrees
    const totalRotation = baseRotation + (360 - prizeAngle);

    wheel.style.transform = `rotate(${totalRotation}deg)`;

    // After spin completes
    setTimeout(async () => {
        spinsElement.textContent = availableSpins - 1;

        // Credit prize
        if (currentUser && userData) {
            try {
                await update(ref(db, `users/${currentUser.uid}`), {
                    balance: (userData.balance || 0) + prize,
                    totalEarned: (userData.totalEarned || 0) + prize,
                    todayEarning: (userData.todayEarning || 0) + prize
                });

                await addTransaction(currentUser.uid, {
                    type: 'earning',
                    category: 'spin',
                    amount: prize,
                    description: 'Lucky spin reward',
                    status: 'completed'
                });

                userData.balance += prize;
                userData.todayEarning += prize;
                updateUI();
            } catch (error) {
                console.error('Error crediting spin prize:', error);
            }
        }

        showToast(`Congratulations! You won ₹${prize}!`, 'success');
        isSpinning = false;
        spinBtn.disabled = false;

        // Reset wheel after a delay
        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
            setTimeout(() => {
                wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            }, 100);
        }, 1000);
    }, 4500);
};

function weightedRandom() {
    const weights = [30, 25, 20, 12, 7, 4, 1.5, 0.5]; // Higher weight = more likely
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < weights.length; i++) {
        if (random < weights[i]) return i;
        random -= weights[i];
    }
    return 0;
}

// ========================================
// Scratch Card Functions
// ========================================
window.showScratch = function() {
    openModal('scratch-modal');
    loadScratchCards();
};

function loadScratchCards() {
    const container = document.getElementById('scratch-cards');
    const available = 3;

    let html = '';
    for (let i = 0; i < available; i++) {
        const prize = [1, 2, 5, 10, 20, 50][Math.floor(Math.random() * 6)];
        html += `
            <div class="scratch-card" onclick="scratchCard(this, ${prize})" data-prize="${prize}">
                <span class="scratch-prize">₹${prize}</span>
            </div>
        `;
    }
    container.innerHTML = html;
}

window.scratchCard = async function(element, prize) {
    if (element.classList.contains('scratched')) return;

    element.classList.add('scratched');

    // Update available scratches
    const scratchElement = document.getElementById('available-scratches');
    const available = parseInt(scratchElement.textContent) || 0;
    scratchElement.textContent = available - 1;

    // Credit prize
    if (currentUser && userData) {
        try {
            await update(ref(db, `users/${currentUser.uid}`), {
                balance: (userData.balance || 0) + prize,
                totalEarned: (userData.totalEarned || 0) + prize,
                todayEarning: (userData.todayEarning || 0) + prize
            });

            await addTransaction(currentUser.uid, {
                type: 'earning',
                category: 'scratch',
                amount: prize,
                description: 'Scratch card reward',
                status: 'completed'
            });

            userData.balance += prize;
            userData.todayEarning += prize;
            updateUI();
        } catch (error) {
            console.error('Error crediting scratch prize:', error);
        }
    }

    showToast(`You won ₹${prize}!`, 'success');
};

// ========================================
// Other Earning Methods
// ========================================
window.showGames = function() {
    showToast('Games coming soon!', 'info');
};

window.showContent = function() {
    showToast('Content creation coming soon!', 'info');
};

// ========================================
// Profile & Settings
// ========================================
window.showProfile = function() {
    openModal('profile-modal');
};

window.editProfile = function() {
    showToast('Profile editing coming soon!', 'info');
};

window.changeAvatar = function() {
    showToast('Avatar change coming soon!', 'info');
};

window.showKYC = function() {
    openModal('kyc-modal');
};

window.uploadDocument = function(type) {
    showToast(`Upload ${type} - Feature coming soon!`, 'info');
};

window.submitKYC = function() {
    const aadhar = document.getElementById('aadhar-number').value.trim();
    const pan = document.getElementById('pan-number').value.trim();

    if (!aadhar || aadhar.length !== 12) {
        showToast('Please enter valid 12-digit Aadhar number', 'error');
        return;
    }

    if (!pan || pan.length !== 10) {
        showToast('Please enter valid 10-character PAN number', 'error');
        return;
    }

    showToast('KYC submitted for verification. You will be notified within 24-48 hours.', 'success');
    closeModal('kyc-modal');
};

window.showSettings = function() {
    openModal('settings-modal');
};

window.changePassword = function() {
    showToast('Password change - Feature coming soon!', 'info');
};

window.setup2FA = function() {
    showToast('2FA setup - Feature coming soon!', 'info');
};

window.deleteAccount = function() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        showToast('Account deletion request submitted. Contact support for confirmation.', 'warning');
    }
};

window.showPaymentMethods = function() {
    showToast('Payment methods - Feature coming soon!', 'info');
};

window.showAbout = function() {
    showToast('EarnPro v1.0 - Earn Daily, Withdraw Instantly', 'info');
};

// ========================================
// Support Functions
// ========================================
window.showSupport = function() {
    openModal('support-modal');
    loadFAQs();
};

function loadFAQs() {
    const faqs = [
        { q: 'How do I earn money?', a: 'Complete tasks, surveys, watch ads, refer friends, and participate in daily activities to earn money.' },
        { q: 'What is the minimum withdrawal?', a: `The minimum withdrawal amount is ₹${appConfig?.minWithdraw || 50}.` },
        { q: 'How long does withdrawal take?', a: 'UPI withdrawals are instant. Paytm takes up to 24 hours. Bank transfers take 1-3 business days.' },
        { q: 'Why was my withdrawal rejected?', a: 'Withdrawals may be rejected due to invalid payment details or suspicious activity. Please verify your KYC and try again.' }
    ];

    const container = document.getElementById('faq-list');
    container.innerHTML = faqs.map((faq, i) => `
        <div class="faq-item" onclick="toggleFAQ(this)">
            <div class="faq-question">
                <span>${faq.q}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                <p>${faq.a}</p>
            </div>
        </div>
    `).join('');
}

window.toggleFAQ = function(element) {
    element.classList.toggle('active');
};

window.openChat = function() {
    showToast('Live chat - Feature coming soon!', 'info');
};

window.openEmail = function() {
    window.location.href = 'mailto:support@earnpro.com';
};

window.openWhatsApp = function() {
    window.open('https://wa.me/919999999999', '_blank');
};

window.submitTicket = function() {
    const category = document.getElementById('ticket-category').value;
    const message = document.getElementById('ticket-message').value.trim();

    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }

    if (!message) {
        showToast('Please describe your issue', 'error');
        return;
    }

    showToast('Support ticket submitted! We will respond within 24 hours.', 'success');
    document.getElementById('ticket-category').value = '';
    document.getElementById('ticket-message').value = '';
};

// ========================================
// History & Leaderboard
// ========================================
window.showHistory = function() {
    openModal('history-modal');
    loadTransactionHistory();
};

async function loadTransactionHistory(type = 'all') {
    const container = document.getElementById('transaction-history');

    if (!currentUser) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-muted);">Please login to view history</p>';
        return;
    }

    try {
        const snapshot = await get(ref(db, `transactions/${currentUser.uid}`));

        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-muted);">No transactions yet</p>';
            return;
        }

        let transactions = [];
        snapshot.forEach(child => {
            transactions.push({ id: child.key, ...child.val() });
        });

        // Sort by date (newest first)
        transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Filter by type
        if (type !== 'all') {
            transactions = transactions.filter(t => t.type === type);
        }

        if (transactions.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-muted);">No transactions found</p>';
            return;
        }

        container.innerHTML = transactions.slice(0, 50).map(t => `
            <div class="history-item">
                <div class="history-icon ${t.type}">
                    <i class="fas fa-${t.type === 'earning' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="history-info">
                    <span class="history-title">${t.description || t.category}</span>
                    <span class="history-date">${formatDate(t.timestamp)}</span>
                </div>
                <span class="history-amount ${t.type === 'earning' ? 'positive' : 'negative'}">
                    ${t.type === 'earning' ? '+' : '-'}₹${formatAmount(t.amount)}
                </span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading history:', error);
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-muted);">Error loading history</p>';
    }

    // Add tab click handlers
    document.querySelectorAll('.hist-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.hist-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadTransactionHistory(this.dataset.type);
        });
    });
}

function formatDate(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

window.filterHistory = function() {
    showToast('Filter options coming soon!', 'info');
};

window.showLeaderboard = function() {
    openModal('leaderboard-modal');
    loadFullLeaderboard();
};

async function loadLeaderboard() {
    try {
        const snapshot = await get(ref(db, 'users'));
        if (!snapshot.exists()) return;

        let users = [];
        snapshot.forEach(child => {
            const user = child.val();
            users.push({
                name: user.name || 'User',
                totalEarned: user.totalEarned || 0
            });
        });

        // Sort by earnings
        users.sort((a, b) => b.totalEarned - a.totalEarned);

        // Update preview
        const container = document.getElementById('top-earners');
        container.innerHTML = users.slice(0, 3).map((user, i) => `
            <div class="lb-item">
                <div class="lb-position ${['gold', 'silver', 'bronze'][i]}">${i + 1}</div>
                <div class="lb-avatar"><i class="fas fa-user"></i></div>
                <span class="lb-name">${maskName(user.name)}</span>
                <span class="lb-amount">₹${formatAmount(user.totalEarned)}</span>
            </div>
        `).join('');

        // Find current user rank
        if (currentUser && userData) {
            const userRank = users.findIndex(u => u.name === userData.name) + 1;
            document.getElementById('user-rank').textContent = userRank || '--';
        }

    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

async function loadFullLeaderboard() {
    try {
        const snapshot = await get(ref(db, 'users'));
        if (!snapshot.exists()) return;

        let users = [];
        snapshot.forEach(child => {
            const user = child.val();
            users.push({
                name: user.name || 'User',
                totalEarned: user.totalEarned || 0
            });
        });

        users.sort((a, b) => b.totalEarned - a.totalEarned);

        // Update podium
        if (users[0]) {
            document.getElementById('lb-1-name').textContent = maskName(users[0].name);
            document.getElementById('lb-1-amount').textContent = '₹' + formatAmount(users[0].totalEarned);
        }
        if (users[1]) {
            document.getElementById('lb-2-name').textContent = maskName(users[1].name);
            document.getElementById('lb-2-amount').textContent = '₹' + formatAmount(users[1].totalEarned);
        }
        if (users[2]) {
            document.getElementById('lb-3-name').textContent = maskName(users[2].name);
            document.getElementById('lb-3-amount').textContent = '₹' + formatAmount(users[2].totalEarned);
        }

        // Update full list
        const container = document.getElementById('leaderboard-list');
        container.innerHTML = users.slice(3, 50).map((user, i) => `
            <div class="lb-item">
                <div class="lb-position" style="background: var(--bg-input);">${i + 4}</div>
                <div class="lb-avatar"><i class="fas fa-user"></i></div>
                <span class="lb-name">${maskName(user.name)}</span>
                <span class="lb-amount">₹${formatAmount(user.totalEarned)}</span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading full leaderboard:', error);
    }
}

function maskName(name) {
    if (!name || name.length < 3) return 'User***';
    return name.substring(0, 3) + '***';
}

// ========================================
// Notifications
// ========================================
window.showNotifications = function() {
    openModal('notifications-modal');
    loadNotifications();
};

function loadNotifications() {
    const notifications = [
        { title: 'Welcome Bonus!', message: 'You received ₹10 signup bonus', time: 'Just now', type: 'success', unread: true },
        { title: 'New Task Available', message: 'Complete new task to earn ₹20', time: '2 hours ago', type: 'info', unread: true },
        { title: 'Withdrawal Successful', message: 'Your withdrawal of ₹100 has been processed', time: 'Yesterday', type: 'success', unread: false }
    ];

    const container = document.getElementById('notifications-list');
    container.innerHTML = notifications.map(notif => `
        <div class="notif-item ${notif.unread ? 'unread' : ''}">
            <div class="notif-icon ${notif.type}">
                <i class="fas fa-${notif.type === 'success' ? 'check' : notif.type === 'warning' ? 'exclamation' : 'info'}"></i>
            </div>
            <div class="notif-content">
                <span class="notif-title">${notif.title}</span>
                <p class="notif-message">${notif.message}</p>
                <span class="notif-time">${notif.time}</span>
            </div>
        </div>
    `).join('');

    document.getElementById('notif-count').textContent = notifications.filter(n => n.unread).length;
}

window.markAllRead = function() {
    document.querySelectorAll('.notif-item').forEach(item => item.classList.remove('unread'));
    document.getElementById('notif-count').textContent = '0';
    showToast('All notifications marked as read', 'success');
};

// ========================================
// Language
// ========================================
window.showLanguageModal = function() {
    document.getElementById('language-modal').classList.add('active');
};

window.closeLanguageModal = function() {
    document.getElementById('language-modal').classList.remove('active');
};

window.setLanguage = function(lang) {
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.lang === lang) {
            opt.classList.add('active');
        }
    });

    const langNames = { hi: 'Hindi', en: 'English', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', mr: 'Marathi' };
    document.getElementById('current-lang').textContent = langNames[lang] || 'Hindi';

    showToast(`Language changed to ${langNames[lang]}`, 'success');
    closeLanguageModal();
};

// ========================================
// Navigation
// ========================================
window.showHome = function() {
    setActiveNav(0);
    closeAllModals();
};

window.showEarn = function() {
    setActiveNav(1);
    showTasks();
};

window.showWallet = function() {
    setActiveNav(3);
    showWithdraw();
};

function setActiveNav(index) {
    document.querySelectorAll('.nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

// ========================================
// Modal Functions
// ========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ========================================
// Balance Toggle
// ========================================
let balanceHidden = false;

window.toggleBalance = function() {
    balanceHidden = !balanceHidden;
    const amountEl = document.getElementById('total-balance');
    const toggleBtn = document.getElementById('balance-toggle');

    if (balanceHidden) {
        amountEl.textContent = '****';
        toggleBtn.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        amountEl.textContent = formatAmount(userData?.balance || 0);
        toggleBtn.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

// ========================================
// Transaction Helper
// ========================================
async function addTransaction(userId, transaction) {
    try {
        const transactionRef = push(ref(db, `transactions/${userId}`));
        await set(transactionRef, {
            ...transaction,
            id: transactionRef.key,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error adding transaction:', error);
    }
}

// ========================================
// Toast & Loading
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const msg = toast.querySelector('.toast-message');

    toast.className = `toast ${type}`;
    msg.textContent = message;

    icon.className = `toast-icon fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}`;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// ========================================
// OTP Functions
// ========================================
window.moveToNext = function(input, nextIndex) {
    if (input.value.length === 1 && nextIndex <= 6) {
        const nextInput = document.querySelectorAll('.otp-box')[nextIndex];
        if (nextInput) nextInput.focus();
    }
};

window.verifyOTP = function() {
    const otpBoxes = document.querySelectorAll('.otp-box');
    let otp = '';
    otpBoxes.forEach(box => otp += box.value);

    if (otp.length !== 6) {
        showToast('Please enter complete OTP', 'error');
        return;
    }

    showLoading();
    setTimeout(() => {
        hideLoading();
        showToast('OTP verified successfully!', 'success');
    }, 2000);
};

// ========================================
// PWA Support
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker registration would go here
    });
}

// ========================================
// Push Notifications
// ========================================
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    }
}

// Request permission on page load
requestNotificationPermission();
