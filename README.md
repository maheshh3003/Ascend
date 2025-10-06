# 🚀 Ascend - AI-Powered Credit Score Management Platform

[![FinTech](https://img.shields.io/badge/Industry-FinTech-blue)](https://github.com)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-purple)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> Empowering users to understand, improve, and manage their credit scores with AI-driven insights and personalized recommendations.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [DSA Algorithms](#-dsa-algorithms-implemented)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [Screenshots](#-screenshots)
- [Business Model](#-business-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Ascend** is a comprehensive credit score management platform that combines real-time financial tracking with AI-powered advisory services. Users can monitor their credit scores, manage loans, track payment history, and receive personalized recommendations through **Credo**, our intelligent AI chatbot.

### Key Highlights

- 📊 **Real-time Credit Score Tracking** with historical trend analysis
- 🤖 **AI Credit Advisor (Credo)** powered by Google Gemini API
- 🔍 **Fraud Detection System** using DFS graph traversal
- 💳 **Loan Management** with automated risk assessment
- 🎁 **Rewards System** based on credit score tiers
- 📈 **Admin Analytics** with RFM segmentation and CLV prediction

---

## ✨ Features

### For Users

#### 1. **Dashboard**
- Credit score overview with percentage change trends
- Payment history timeline
- Loan portfolio summary
- Quick action buttons

#### 2. **Credo AI Chatbot**
- Natural language credit score advice
- Personalized improvement strategies
- 24/7 availability
- Context-aware conversations

#### 3. **Loan Management**
- Add/edit/delete loans
- Automatic fraud detection
- Risk level indicators
- Payment tracking

#### 4. **Rewards & Offers**
- Credit card recommendations
- Cashback deals
- Tier-based rewards (Bronze/Silver/Gold/Platinum)
- Exclusive partner offers

#### 5. **Credit Score Improvement**
- Challenge-based gamification
- Track progress over time
- Educational resources
- Actionable recommendations

### For Admins

#### 1. **Analytics Dashboard**
- Total users, revenue, fraud alerts
- RFM (Recency, Frequency, Monetary) analysis
- Customer Lifetime Value (CLV) predictions
- NPS (Net Promoter Score) tracking

#### 2. **User Management**
- View all users with detailed profiles
- Generate personalized reports (Basic/Premium/Enterprise)
- Risk assessment tools
- Growth opportunity analysis

#### 3. **Report Generation**
- **Basic Report** ($19): Credit score overview, payment history
- **Premium Report** ($49): RFM analysis, personalized recommendations
- **Enterprise Report** ($99): CLV prediction, risk assessment, growth strategies

---

## 🛠 Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox/grid
- **Vanilla JavaScript (ES6+)** - Modular architecture
- **Firebase SDK** - Real-time data sync

### Backend
- **Firebase Authentication** - Secure user management
- **Firestore (NoSQL)** - Scalable database
- **Firebase Hosting** - Fast content delivery

### AI Integration
- **Google Gemini API** - Conversational AI for Credo chatbot

### Algorithms & Data Structures
- **SHA-256 Hashing** - Email privacy & duplicate detection
- **DFS (Depth-First Search)** - Fraud detection in loan networks
- **Sliding Window** - Credit score trend analysis
- **Sorting & Arrays** - Data processing and analytics

---

## 🧮 DSA Algorithms Implemented

### 1. **DFS (Depth-First Search) - Fraud Detection**

**File:** `frontend/scripts/fraudDetection.js`

**Purpose:** Detect connected fraud patterns in loan networks by building a graph of relationships and traversing it using DFS.

**How it works:**
```javascript
// Build graph: loans connected by shared attributes
Loan 1 ──── Loan 2
  │    \  /
  │     X
  │    /  \
Loan 3 ──── Loan 4

// DFS traversal calculates fraud score
Risk Levels: LOW (0-15) | MEDIUM (16-30) | HIGH (31-50) | CRITICAL (51+)
```

**Implementation:**
- Graph construction: O(n²) where n = number of loans
- DFS traversal: O(V + E) where V = vertices, E = edges
- Fraud indicators: unpaid loans, unknown providers, high utilization
- Automatic warnings before adding risky loans

### 2. **Sliding Window - Credit Score Trends**

**File:** `frontend/scripts/slidingWindow.js`

**Purpose:** Efficiently analyze credit score changes over time windows.

**How it works:**
```javascript
Full History:  [══════════════════] (365 days)
                           ↓
Sliding Window:         [30 days] ← Analyze recent data
                        ↑       ↑
                    oldest   newest
                    
Percentage Change: (newest - oldest) / oldest × 100
```

**Implementation:**
- Time complexity: O(n) where n = window size
- Space complexity: O(w) where w = window size
- Real-time trend calculation (replaces mock data)
- Used for: credit scores, payment activity, spending velocity

### 3. **SHA-256 Hashing - Security**

**File:** `frontend/scripts/hashUtils.js`

**Purpose:** Email privacy and duplicate user detection.

**Implementation:**
- One-way hashing for email storage
- Fast lookup: O(1) average case
- Prevents duplicate signups
- Privacy-preserving comparison

### 4. **RFM Analysis - Customer Segmentation**

**File:** `frontend/scripts/adminpanel.js`

**Purpose:** Segment users based on Recency, Frequency, Monetary value.

**Implementation:**
- 10 customer segments (Champions, Loyal, At Risk, etc.)
- Score calculation: O(n) where n = transactions
- Used for targeted marketing and retention

---

## 📁 Project Structure

```
ascend/
├── backend/
│   ├── config/
│   │   └── firebase-config.js      # Firebase configuration
│   └── README.md                    # Backend documentation
│
├── frontend/
│   ├── index.html                   # Landing page
│   ├── pages/
│   │   ├── adminpanel.html          # Admin dashboard
│   │   ├── credo.html               # AI chatbot
│   │   ├── improvescore.html        # Score improvement
│   │   ├── rewards.html             # Rewards & offers
│   │   ├── userdashboard.html       # User dashboard
│   │   └── userprofile.html         # Profile & loans
│   │
│   ├── scripts/
│   │   ├── auth.js                  # Authentication
│   │   ├── credo.js                 # AI chatbot logic
│   │   ├── fraudDetection.js        # DFS fraud detection
│   │   ├── slidingWindow.js         # Trend analysis
│   │   ├── hashUtils.js             # SHA-256 hashing
│   │   ├── adminpanel.js            # Admin analytics
│   │   ├── userdashboard.js         # Dashboard logic
│   │   ├── userprofile.js           # Profile & loan management
│   │   ├── rewards.js               # Rewards system
│   │   └── improvescore.js          # Score improvement
│   │
│   └── styles/
│       ├── style.css                # Global styles
│       ├── adminpanel.css           # Admin styles
│       ├── credo.css                # Chatbot styles
│       ├── userdashboard.css        # Dashboard styles
│       ├── userprofile.css          # Profile styles
│       ├── rewards.css              # Rewards styles
│       └── improvescore.css         # Improvement styles
│
├── .gitignore                       # Git ignore rules
├── README.md                        # This file
└── DSA_IMPLEMENTATION_SUMMARY.md    # Algorithm documentation
```

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ascend.git
   cd ascend
   ```

2. **Configure Firebase**
   
   Create `backend/config/firebase-config.js`:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
   };
   
   export { firebaseConfig };
   ```

3. **Configure Gemini API**
   
   Update `frontend/scripts/credo.js`:
   ```javascript
   const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
   ```

4. **Set up Firebase Firestore**
   
   Create these collections:
   - `users` - User profiles
   - `transactions` - Payment history
   - `loans` - Loan data
   - `creditScores` - Score history

5. **Deploy or Run Locally**
   
   **Option A: Local Development**
   ```bash
   # Use Live Server extension in VS Code
   # Or use Python's built-in server
   python -m http.server 8000
   # Open http://localhost:8000
   ```
   
   **Option B: Firebase Hosting**
   ```bash
   firebase login
   firebase init hosting
   firebase deploy
   ```

---

## 💻 Usage

### User Flow

1. **Sign Up / Login**
   - Create account with email/password
   - SHA-256 hashing prevents duplicates

2. **Dashboard**
   - View credit score with trend analysis
   - See recent payments and loans
   - Quick access to all features

3. **Chat with Credo**
   - Ask: "How can I improve my credit score?"
   - Get personalized, actionable advice
   - Context-aware conversations

4. **Manage Loans**
   - Add loans (automatic fraud detection)
   - View risk levels
   - Track payment history

5. **Explore Rewards**
   - Browse credit cards and deals
   - Activate tier-based rewards
   - Redeem exclusive offers

6. **Improve Score**
   - Join challenges
   - Track progress
   - Implement recommendations

### Admin Flow

1. **Login as Admin**
   - Special admin credentials
   - Access analytics dashboard

2. **View Analytics**
   - User metrics and revenue
   - RFM segmentation
   - CLV predictions

3. **Generate Reports**
   - Select user
   - Choose report type (Basic/Premium/Enterprise)
   - Download PDF

---

## 📸 Screenshots

### User Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Credo AI Chatbot
![Credo](docs/screenshots/credo.png)

### Admin Analytics
![Admin Panel](docs/screenshots/admin.png)

### Fraud Detection
![Fraud Alert](docs/screenshots/fraud.png)

---

## 💰 Business Model

### Revenue Streams

1. **Credit Score Improvement Challenges** ($10 entry, 20% platform fee)
   - Gamified challenges with cash prizes
   - Community leaderboards
   - Projected: $2K-$5K/month

2. **RFM-Based Email Campaigns** ($2K-$10K/month passive)
   - Targeted marketing for partners
   - Affiliate commissions
   - Sponsored content

3. **Fraud Detection as a Service** ($0.10/transaction)
   - API access for businesses
   - Real-time fraud alerts
   - Projected: $5K-$15K/month

4. **Personalized Financial Reports**
   - Basic: $19 (credit overview)
   - Premium: $49 (RFM + recommendations)
   - Enterprise: $99 (CLV + risk assessment)
   - Projected: $3K-$8K/month

**Total Revenue Potential:** $12K-$38K/month

---

## 🧪 Testing

### Manual Testing

#### Test Sliding Window Algorithm
```javascript
// Open browser console on Dashboard
// Look for: "📊 Credit Score Trend Analysis: {...}"
// Verify percentage change is consistent (not random)
```

#### Test Fraud Detection
```javascript
// Go to Profile page
// Add suspicious loan:
// - Name: "Quick Cash"
// - Provider: "Unknown LLC"
// - Amount: $70,000
// Expected: Warning dialog + fraud badge
```

### Automated Testing (Future)
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- Use ES6+ JavaScript
- Follow existing code style
- Add comments for complex logic
- Test before submitting PR

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Developer** - Full-stack development, DSA implementation
- **Designer** - UI/UX design
- **Advisor** - Business strategy

---

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com) - Backend infrastructure
- [Google Gemini](https://ai.google.dev) - AI capabilities
- [Phosphor Icons](https://phosphoricons.com) - Icon library
- [Inter Font](https://rsms.me/inter/) - Typography

---

## 📞 Contact

**Project Link:** [https://github.com/yourusername/ascend](https://github.com/yourusername/ascend)

**Email:** your.email@example.com

---

## 🗺 Roadmap

### Phase 1 (Current)
- ✅ User authentication
- ✅ Credit score tracking
- ✅ AI chatbot (Credo)
- ✅ Fraud detection
- ✅ Admin analytics

### Phase 2 (Q1 2026)
- [ ] Mobile app (React Native)
- [ ] Machine learning fraud models
- [ ] Open banking integration
- [ ] Multi-language support

### Phase 3 (Q2 2026)
- [ ] B2B API marketplace
- [ ] Credit score prediction
- [ ] Personalized financial planning
- [ ] Partner merchant network

---

<div align="center">

**Made with ❤️ by the Ascend Team**

[⬆ Back to Top](#-ascend---ai-powered-credit-score-management-platform)

</div>
