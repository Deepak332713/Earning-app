# EarnZone - Earning Application

A complete, secure and user-friendly earning platform where users can earn money through multiple methods.

## Features

### User Features
- **Fast Sign-up/Login** - Mobile number, Email, OTP verification
- **Multiple Earning Methods:**
  - Complete Tasks (Follow, Subscribe, Download)
  - Fill Surveys
  - Watch Video Ads
  - Refer Friends
  - Lucky Spin
  - Scratch Cards
  - Daily Bonus with Streak Rewards

### Wallet & Payments
- Real-time Wallet System
- Minimum Withdrawal Limit
- Instant Payout Options:
  - UPI
  - Paytm
  - Bank Transfer
- Transparent Earning History
- Transaction Tracking

### Security
- Firebase Authentication
- KYC Verification System
- Fraud Detection Ready
- Secure Data Storage

### Additional Features
- Multi-language Support (Hindi/English)
- Push Notifications Ready
- Lightweight Design
- Low Internet Usage
- Daily Bonus & Streak Rewards
- Smart Referral Program (₹10 per referral + 5% lifetime earnings)
- Leaderboard System
- 24x7 Customer Support Links

### Admin Features (admin.html)
- User Management
- Task Control
- Withdrawal Management
- Promo Codes
- Referral System Settings
- Daily Login Bonus Settings
- Ads Manager
- Global Notices
- KYC Verification
- Maintenance Mode
- Database Management
- Activity Logs
- And 40+ more admin modules

## Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Tailwind CSS
- **Icons:** Font Awesome 6
- **Backend:** Firebase
  - Authentication
  - Realtime Database
- **PWA:** Progressive Web App Support

## File Structure
```
/
├── index.html      # Main User Application
├── admin.html      # Admin Dashboard
├── manifest.json   # PWA Manifest
└── README.md       # Documentation
```

## Setup Instructions

1. **Firebase Setup:**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Email/Password Authentication
   - Create Realtime Database
   - Update Firebase config in both index.html and admin.html

2. **Deploy:**
   - Host on Firebase Hosting, Netlify, or any static hosting
   - Ensure HTTPS for PWA features

3. **Admin Access:**
   - Create admin user in Firebase Authentication
   - Login at admin.html

## Database Structure
```
/users/{uid}
  - name, email, phone
  - balance, totalEarned, totalWithdrawn
  - streak, referralCode, referrals
  - kycStatus, transactions

/config
  - tasks, refer, daily, ads settings
  - notice, limits, etc.

/withdrawals/{id}
  - userId, amount, method, status

/kyc_requests/{uid}
  - verification data
```

## Earning Rates (Configurable via Admin)
- Tasks: ₹5 - ₹50
- Surveys: ₹10 - ₹100
- Watch Ads: ₹2/ad (20 ads/day limit)
- Referral: ₹10 + 5% lifetime
- Lucky Spin: ₹1 - ₹500
- Scratch Card: ₹1 - ₹100
- Daily Bonus: ₹2 + streak bonus

## Security Notes
- Move Firebase config to environment variables for production
- Enable Firebase Security Rules
- Implement server-side validation for withdrawals
- Add rate limiting for earning activities

## License
All rights reserved.
