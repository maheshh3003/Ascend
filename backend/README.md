# Backend Architecture

## Overview
This project uses **Firebase** as a Backend-as-a-Service (BaaS) platform, which provides all backend functionality without the need for a traditional server.

## Backend Components

### 1. Firebase Authentication
- Handles user registration and login
- Manages secure session tokens
- Provides user identity verification

### 2. Firebase Firestore (NoSQL Database)
- Document-based NoSQL database
- Real-time data synchronization
- Scalable cloud storage
- Collections: `users`, `transactions`, `admin`

### 3. Firebase Configuration
Located in: `backend/config/firebase-config.js`

Contains:
- API keys
- Project identifiers
- Authentication domain
- Storage bucket configuration
- App ID and measurement settings

## Why NoSQL (Firestore)?

### Advantages for This Project:
1. **Real-time Updates** - Credit scores and user data sync instantly across devices
2. **Flexible Schema** - Easy to add new user fields (RFM scores, CLV metrics) without migrations
3. **Scalability** - Automatically handles millions of users without manual scaling
4. **Fast Queries** - Document-based structure optimized for user profile lookups
5. **Built-in Security** - Firebase Security Rules protect user data

### Data Structure:
```
users (collection)
├── {emailHash} (document)
    ├── userId: string
    ├── name: string
    ├── email: string
    ├── creditScore: number
    ├── creditLevel: object
    ├── loans: array
    ├── payments: array
    ├── creditCards: array
    └── totalSpending: number

transactions (collection)
├── {transactionId} (document)
    ├── userId: string
    ├── amount: number
    ├── date: timestamp
    ├── type: string
    └── description: string

admin (collection)
├── {adminId} (document)
    ├── role: string
    └── permissions: array
```

## Security
- Email addresses are hashed using SHA-256 for document IDs
- Firebase Security Rules control data access
- Authentication required for all sensitive operations
- Admin privileges checked server-side via custom claims

## Integration with Frontend
The frontend (`frontend/scripts/auth.js`) imports Firebase configuration from this backend folder:
```javascript
import { firebaseConfig } from '../../backend/config/firebase-config.js';
```

All database operations use Firebase SDK methods:
- `getDoc()` - Read user data
- `setDoc()` - Create new user
- `updateDoc()` - Update user information
- `collection().where()` - Query transactions

## Environment Setup
No local server required! Firebase handles all backend infrastructure in the cloud.

### To deploy:
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init`
4. Deploy: `firebase deploy`

## API Keys
⚠️ **Note**: For production, move API keys to environment variables and use Firebase App Check for security.

Current setup uses direct configuration for development purposes.
