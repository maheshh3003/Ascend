// Hashing Utility for Duplicate Customer Detection
// Using SHA-256 to hash email addresses

/**
 * Hash an email address using SHA-256
 * @param {string} email - The email address to hash
 * @returns {Promise<string>} - The hexadecimal hash string
 */
export async function hashEmail(email) {
    // Normalize email (lowercase, trim whitespace)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Convert string to bytes
    const msgBuffer = new TextEncoder().encode(normalizedEmail);
    
    // Hash the bytes using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

/**
 * Check if a customer with this email already exists
 * @param {string} email - The email to check
 * @param {object} db - Firestore database instance
 * @returns {Promise<boolean>} - True if customer exists, false otherwise
 */
export async function isDuplicateCustomer(email, db) {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    try {
        const emailHash = await hashEmail(email);
        const docRef = doc(db, 'users', emailHash);
        const docSnap = await getDoc(docRef);
        
        return docSnap.exists();
    } catch (error) {
        console.error('Error checking duplicate customer:', error);
        return false;
    }
}

/**
 * Example usage and demonstration
 */
export async function demonstrateHashing() {
    const testEmails = [
        "john@example.com",
        "JOHN@EXAMPLE.COM", // Same as above (should produce same hash)
        "jane@example.com"
    ];
    
    console.log("=== Email Hashing Demonstration ===");
    for (const email of testEmails) {
        const hash = await hashEmail(email);
        console.log(`Email: ${email}`);
        console.log(`Hash:  ${hash}`);
        console.log("---");
    }
}
