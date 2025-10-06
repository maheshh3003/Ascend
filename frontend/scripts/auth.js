// Firebase Authentication Module
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { hashEmail, isDuplicateCustomer } from './hashUtils.js';

// Import Firebase configuration from backend
import { firebaseConfig } from '../../backend/config/firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export authentication functions
export {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    doc,
    setDoc,
    getDoc,
    updateDoc
};

// Sign up function with hash-based duplicate detection
export async function signUp(email, password, name) {
    try {
        // STEP 1: Check for duplicate customer using email hash
        const isDuplicate = await isDuplicateCustomer(email, db);
        if (isDuplicate) {
            return { 
                success: false, 
                error: 'An account with this email already exists (detected via hash)' 
            };
        }
        
        // STEP 2: Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile with name
        await updateProfile(user, {
            displayName: name
        });
        
        // STEP 3: Hash the email for document ID
        const emailHash = await hashEmail(email);
        
        // STEP 4: Create user document in Firestore using HASHED email as ID
        await setDoc(doc(db, 'users', emailHash), {
            userId: user.uid,        // Store Firebase Auth UID for reference
            name: name,
            email: email,            // Store actual email (for display/recovery)
            emailHash: emailHash,    // Store hash for reference
            createdAt: new Date().toISOString(),
            creditScore: null,
            creditLevel: null,
            lastUpdated: null
        });
        
        return { success: true, user, emailHash };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign in function
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign out function
export async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get user data from Firestore using email hash
export async function getUserData(uid) {
    try {
        // First, get user from Firebase Auth to get their email
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        // Hash the email to get the document ID
        const emailHash = await hashEmail(user.email);
        const docRef = doc(db, 'users', emailHash);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
        } else {
            return { success: false, error: 'No user data found' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user credit score using email hash
export async function updateUserCreditScore(uid, creditScore) {
    try {
        // Get current user's email
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        const creditLevel = getCreditLevel(creditScore);
        
        // Hash email to get document ID
        const emailHash = await hashEmail(user.email);
        
        await updateDoc(doc(db, 'users', emailHash), {
            creditScore: creditScore,
            creditLevel: creditLevel,
            lastUpdated: new Date().toISOString()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user profile (name) using email hash
export async function updateUserProfile(name) {
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        // Update Firebase Auth display name
        await updateProfile(user, {
            displayName: name
        });
        
        // Hash email to get document ID
        const emailHash = await hashEmail(user.email);
        
        // Update Firestore document
        await updateDoc(doc(db, 'users', emailHash), {
            name: name,
            lastUpdated: new Date().toISOString()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user loans using email hash
export async function updateUserLoans(uid, loans) {
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        // Hash email to get document ID
        const emailHash = await hashEmail(user.email);
        
        // Update Firestore document with loans
        await updateDoc(doc(db, 'users', emailHash), {
            loans: loans,
            lastUpdated: new Date().toISOString()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user payments using email hash
export async function updateUserPayments(uid, payments) {
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        // Hash email to get document ID
        const emailHash = await hashEmail(user.email);
        
        // Update Firestore document with payments
        await updateDoc(doc(db, 'users', emailHash), {
            payments: payments,
            lastUpdated: new Date().toISOString()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user credit cards using email hash
export async function updateCreditCards(uid, creditCards) {
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        // Hash email to get document ID
        const emailHash = await hashEmail(user.email);
        
        // Update Firestore document with credit cards
        await updateDoc(doc(db, 'users', emailHash), {
            creditCards: creditCards,
            lastUpdated: new Date().toISOString()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user total spending using email hash
export async function updateTotalSpending(uid, totalSpending) {
    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        // Hash email to get document ID
        const emailHash = await hashEmail(user.email);
        
        // Update Firestore document with total spending
        await updateDoc(doc(db, 'users', emailHash), {
            totalSpending: totalSpending,
            lastUpdated: new Date().toISOString()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Calculate credit level based on score
function getCreditLevel(score) {
    if (score < 580) return { level: 0, label: 'Poor' };
    if (score < 670) return { level: 1, label: 'Fair' };
    if (score < 740) return { level: 2, label: 'Good' };
    if (score < 800) return { level: 3, label: 'Very Good' };
    return { level: 4, label: 'Excellent' };
}

// Check authentication state
export function checkAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}
