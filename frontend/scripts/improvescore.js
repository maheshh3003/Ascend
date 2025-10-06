import { auth } from './auth.js';
import { getUserData } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ==================== BST IMPLEMENTATION ====================
// Binary Search Tree Node for efficient category lookup
class CategoryNode {
    constructor(minScore, maxScore, categoryData) {
        this.minScore = minScore;       // Minimum score for this category
        this.maxScore = maxScore;       // Maximum score for this category
        this.categoryData = categoryData; // Complete category object
        this.left = null;               // Left child (lower score ranges)
        this.right = null;              // Right child (higher score ranges)
    }
}

// Binary Search Tree for Credit Score Categories
class CategoryBST {
    constructor() {
        this.root = null;
        this.comparisonCount = 0; // Track comparisons for performance analysis
    }
    
    // Insert a category into the BST
    insert(minScore, maxScore, categoryData) {
        const newNode = new CategoryNode(minScore, maxScore, categoryData);
        
        if (this.root === null) {
            this.root = newNode;
        } else {
            this.insertNode(this.root, newNode);
        }
    }
    
    // Helper method to insert a node recursively
    insertNode(node, newNode) {
        // Compare based on minScore to maintain BST property
        if (newNode.minScore < node.minScore) {
            if (node.left === null) {
                node.left = newNode;
            } else {
                this.insertNode(node.left, newNode);
            }
        } else {
            if (node.right === null) {
                node.right = newNode;
            } else {
                this.insertNode(node.right, newNode);
            }
        }
    }
    
    // Search for the appropriate category based on credit score
    // Time Complexity: O(log n) - much better than O(n) linear search
    search(score) {
        this.comparisonCount = 0; // Reset counter
        return this.searchNode(this.root, score);
    }
    
    // Helper method to search recursively
    searchNode(node, score) {
        if (node === null) {
            return null; // Score not in valid range
        }
        
        this.comparisonCount++;
        
        // Check if score falls within this node's range
        if (score >= node.minScore && score <= node.maxScore) {
            console.log(`✅ BST: Found category in ${this.comparisonCount} comparison(s)`);
            return node.categoryData;
        }
        
        // Search left subtree (lower scores)
        if (score < node.minScore) {
            return this.searchNode(node.left, score);
        }
        
        // Search right subtree (higher scores)
        return this.searchNode(node.right, score);
    }
    
    // In-order traversal for debugging/display
    inOrderTraversal(node = this.root, result = []) {
        if (node !== null) {
            this.inOrderTraversal(node.left, result);
            result.push({
                range: `${node.minScore}-${node.maxScore}`,
                category: node.categoryData.name
            });
            this.inOrderTraversal(node.right, result);
        }
        return result;
    }
    
    // Get tree height for performance analysis
    getHeight(node = this.root) {
        if (node === null) return 0;
        
        const leftHeight = this.getHeight(node.left);
        const rightHeight = this.getHeight(node.right);
        
        return Math.max(leftHeight, rightHeight) + 1;
    }
}

// Credit score categories
const CATEGORIES = {
    HIGH_RISK: {
        name: 'High Risk',
        range: [300, 579],
        class: 'high-risk',
        suggestions: [
            {
                icon: '�',
                title: 'Use auto-pay for bills',
                text: 'Set up automatic payments to avoid forgetting due dates. This ensures consistent on-time payments starting this month.'
            },
            {
                icon: '�',
                title: 'Check credit report for errors',
                text: 'Review your credit reports carefully and dispute any inaccuracies. Removing incorrect negative items can significantly boost your score.'
            },
            {
                icon: '�',
                title: 'Track credit score monthly',
                text: 'Monitor your credit score regularly to notice improvements and stay motivated on your credit repair journey.'
            },
            {
                icon: '🎯',
                title: 'Focus on one debt at a time',
                text: 'Use the "Snowball" method - pay off smallest debts first for quick wins, then move to larger ones for momentum.'
            }
        ],
        requiredActions: [
            {
                title: 'Pay all bills on time starting this month',
                description: 'Make every payment on time - no missed or late payments. Payment history is the most critical factor in rebuilding your credit.',
                impact: 'Critical'
            },
            {
                title: 'Clear overdue or defaulted accounts',
                description: 'Contact creditors immediately to set up payment plans for any past-due accounts. Bringing accounts current is your top priority.',
                impact: 'Critical'
            },
            {
                title: 'Keep credit card usage below 30%',
                description: 'Reduce credit utilization to under 30% of your total limit. High utilization signals financial stress to lenders.',
                impact: 'High'
            },
            {
                title: 'Avoid applying for new loans or cards temporarily',
                description: 'Each application creates a hard inquiry that lowers your score. Focus on rebuilding existing credit, not obtaining new credit.',
                impact: 'High'
            },
            {
                title: 'Build credit history if needed',
                description: 'If you have no credit history, get a secured credit card or take a small credit builder loan from your bank to establish positive payment records.',
                impact: 'High'
            }
        ]
    },
    NEEDS_IMPROVEMENT: {
        name: 'Needs Improvement',
        range: [580, 669],
        class: 'needs-improvement',
        suggestions: [
            {
                icon: '�',
                title: 'Set reminders before due dates',
                text: 'Create calendar alerts or phone reminders 2-3 days before each bill is due to ensure you never miss a payment.'
            },
            {
                icon: '�',
                title: 'Keep one small credit card active',
                text: 'Maintain at least one credit card with small recurring charges (like Netflix) and pay it in full each month to build positive history.'
            },
            {
                icon: '�',
                title: 'Avoid co-signing loans',
                text: 'Don\'t co-sign loans for others until your score improves to 670+. Co-signing adds debt to your profile and increases risk.'
            },
            {
                icon: '�',
                title: 'Add a goal tracker',
                text: 'Set milestones (e.g., 650 → 670) and track your progress monthly. Small wins keep you motivated on your improvement journey.'
            }
        ],
        requiredActions: [
            {
                title: 'Make every payment on time for 6 months',
                description: 'Establish a consistent pattern of on-time payments. Set up automatic payments or reminders to ensure 100% on-time payment rate.',
                impact: 'Critical'
            },
            {
                title: 'Reduce credit card balances below 25%',
                description: 'Lower your credit utilization to under 25%, ideally under 10%. Pay down high-balance cards first for maximum score impact.',
                impact: 'High'
            },
            {
                title: 'Keep old accounts open and active',
                description: 'Don\'t close old accounts - they help your credit age. Keep them active with small purchases every few months.',
                impact: 'High'
            },
            {
                title: 'Limit new credit inquiries',
                description: 'Avoid too many new credit applications. Maximum 1 every 6 months to minimize hard inquiries on your report.',
                impact: 'High'
            },
            {
                title: 'Check credit report and remove errors',
                description: 'Review your credit reports from all three bureaus. Dispute and remove any inaccurate negative entries immediately.',
                impact: 'Medium'
            }
        ]
    },
    MODERATE_RISK: {
        name: 'Moderate Risk',
        range: [670, 739],
        class: 'moderate-risk',
        suggestions: [
            {
                icon: '💳',
                title: 'Pay card before statement date',
                text: 'Your statement balance is reported to credit bureaus. Pay before the statement closing date to show lower utilization.'
            },
            {
                icon: '�',
                title: 'Schedule automatic full payments',
                text: 'Set up autopay to pay your full statement balance each month. This ensures perfect payment history with zero effort.'
            },
            {
                icon: '�',
                title: 'Keep inactive accounts alive',
                text: 'Check for any dormant accounts and use them occasionally with small purchases. Inactive accounts may be closed by the issuer.'
            },
            {
                icon: '�',
                title: 'Review credit reports quarterly',
                text: 'Monitor your credit reports every 3-4 months for errors, fraud, or unexpected changes. Early detection prevents bigger issues.'
            }
        ],
        requiredActions: [
            {
                title: 'Keep credit utilization under 20-25%',
                description: 'Maintain low credit card balances relative to limits. Aim for under 20% on each card to demonstrate responsible credit use.',
                impact: 'Critical'
            },
            {
                title: 'Continue 100% on-time payments',
                description: 'You\'re doing great! Keep making every payment on time. Consistency over time strengthens your credit profile significantly.',
                impact: 'Critical'
            },
            {
                title: 'Limit credit applications to 1-2 per year',
                description: 'Only apply for new credit when truly needed. Too many inquiries can lower your score and signal credit shopping.',
                impact: 'High'
            },
            {
                title: 'Maintain a healthy credit mix',
                description: 'Have both revolving (credit cards) and installment (loans) credit. If you only have cards, consider a small loan.',
                impact: 'Medium'
            },
            {
                title: 'Avoid unnecessary account closures',
                description: 'Keep old accounts open, especially your oldest ones. Closing accounts reduces your credit age and available credit.',
                impact: 'Medium'
            }
        ]
    },
    LOW_RISK: {
        name: 'Low Risk',
        range: [740, 799],
        class: 'low-risk',
        suggestions: [
            {
                icon: '📈',
                title: 'Ask for credit limit increases',
                text: 'Request higher limits on existing cards to improve your utilization ratio. With your score, approvals are likely without hard inquiries.'
            },
            {
                icon: '🎯',
                title: 'Diversify with low-risk accounts',
                text: 'Consider adding a small EMI or credit builder loan to show you can manage different types of credit responsibly.'
            },
            {
                icon: '�',
                title: 'Sign up for credit monitoring alerts',
                text: 'Enable real-time alerts for any changes to your credit report. Early detection of errors or fraud protects your excellent score.'
            },
            {
                icon: '�',
                title: 'Stay below 2 hard inquiries per year',
                text: 'Be very selective with new credit applications. Multiple inquiries can drop you from "Very Good" to "Good" category.'
            }
        ],
        requiredActions: [
            {
                title: 'Maintain perfect payment history',
                description: 'One missed payment can drop your score significantly at this level. Continue your spotless record with autopay and alerts.',
                impact: 'Critical'
            },
            {
                title: 'Keep utilization consistently under 15-20%',
                description: 'Maintain low balances on all cards. Consider paying before statement close to report even lower utilization.',
                impact: 'Critical'
            },
            {
                title: 'Monitor credit reports regularly',
                description: 'Check your credit reports every few months for errors or unauthorized activity. Quick action prevents score damage.',
                impact: 'High'
            },
            {
                title: 'Keep old credit lines open',
                description: 'Preserve your credit history by keeping oldest accounts active. Length of history is crucial at this score level.',
                impact: 'High'
            },
            {
                title: 'Use credit occasionally',
                text: 'Don\'t let accounts go dormant. Make small purchases periodically and pay in full to show active, responsible credit use.',
                impact: 'Medium'
            }
        ]
    },
    PRIME: {
        name: 'Prime',
        range: [800, 850],
        class: 'prime',
        suggestions: [
            {
                icon: '�',
                title: 'Set up credit alerts',
                text: 'Enable alerts for any change or inquiry to your credit. At this level, you\'re a target for fraud - stay vigilant.'
            },
            {
                icon: '💰',
                title: 'Negotiate best offers with lenders',
                text: 'You have maximum leverage. Negotiate lowest rates on mortgages, auto loans, and request premium card benefits.'
            },
            {
                icon: '📊',
                title: 'Monitor average account age',
                text: 'Keep your oldest accounts open and active. Don\'t close them even if unused - they\'re valuable for your credit age.'
            },
            {
                icon: '🎯',
                title: 'Stay diversified across credit types',
                text: 'Use multiple types of credit (cards, loans, EMI) responsibly. Diversity strengthens your already excellent profile.'
            }
        ],
        requiredActions: [
            {
                title: 'Keep utilization under 10%',
                description: 'Maintain very low credit card balances. At prime level, even 15-20% utilization can prevent you from reaching 850.',
                impact: 'Critical'
            },
            {
                title: 'Maintain 100% on-time payments',
                description: 'You\'ve mastered credit! Continue your perfect payment history. Even one late payment can drop you 50-100 points.',
                impact: 'Critical'
            },
            {
                title: 'Check credit report monthly',
                description: 'Monitor for fraud or identity theft issues. With excellent credit, you\'re a high-value target for criminals.',
                impact: 'High'
            },
            {
                title: 'Avoid unnecessary new credit lines',
                description: 'Only apply for credit when truly needed. Each hard inquiry temporarily lowers your score, even at prime level.',
                impact: 'Medium'
            },
            {
                title: 'Keep existing accounts responsibly active',
                description: 'Use your cards occasionally with small purchases and pay in full. Don\'t let premium accounts go dormant and get closed.',
                impact: 'Medium'
            }
        ]
    }
};

// ==================== BST INITIALIZATION ====================
// Initialize and build the Category BST
const categoryBST = new CategoryBST();

// Build balanced BST by inserting categories in order
// BST Structure (by minScore):
//              670 (Moderate Risk)
//            /                    \
//       580 (Needs Impr)      740 (Low Risk)
//       /                          \
//   300 (High Risk)              800 (Prime)
console.log('🌳 Building Category BST...');
categoryBST.insert(300, 579, CATEGORIES.HIGH_RISK);
categoryBST.insert(580, 669, CATEGORIES.NEEDS_IMPROVEMENT);
categoryBST.insert(670, 739, CATEGORIES.MODERATE_RISK);
categoryBST.insert(740, 799, CATEGORIES.LOW_RISK);
categoryBST.insert(800, 850, CATEGORIES.PRIME);

console.log('✅ BST built successfully!');
console.log('📊 BST Height:', categoryBST.getHeight());
console.log('📋 BST Contents (in-order):', categoryBST.inOrderTraversal());

// ==================== CATEGORY LOOKUP ====================
// Determine category based on credit score using BST
// Time Complexity: O(log n) instead of O(n) with linear search
function getCreditCategory(score) {
    console.log(`🔍 Searching for category with score: ${score}`);
    const category = categoryBST.search(score);
    
    if (category) {
        console.log(`✅ Found: ${category.name} (${category.range[0]}-${category.range[1]})`);
    } else {
        console.log(`❌ No category found for score: ${score}`);
    }
    
    return category;
}

// Legacy function for comparison (kept for reference)
function getCreditCategoryLinear(score) {
    // OLD LINEAR SEARCH METHOD - O(n) complexity
    // Kept for performance comparison
    let comparisons = 0;
    
    comparisons++;
    if (score >= 300 && score <= 579) {
        console.log(`Linear search: Found in ${comparisons} comparisons`);
        return CATEGORIES.HIGH_RISK;
    }
    
    comparisons++;
    if (score >= 580 && score <= 669) {
        console.log(`Linear search: Found in ${comparisons} comparisons`);
        return CATEGORIES.NEEDS_IMPROVEMENT;
    }
    
    comparisons++;
    if (score >= 670 && score <= 739) {
        console.log(`Linear search: Found in ${comparisons} comparisons`);
        return CATEGORIES.MODERATE_RISK;
    }
    
    comparisons++;
    if (score >= 740 && score <= 799) {
        console.log(`Linear search: Found in ${comparisons} comparisons`);
        return CATEGORIES.LOW_RISK;
    }
    
    comparisons++;
    if (score >= 800 && score <= 850) {
        console.log(`Linear search: Found in ${comparisons} comparisons`);
        return CATEGORIES.PRIME;
    }
    
    console.log(`Linear search: Not found after ${comparisons} comparisons`);
    return null;
}

// Update category banner
function updateCategoryBanner(category, creditScore) {
    const banner = document.getElementById('category-banner');
    const categoryName = document.getElementById('category-name');
    const categoryRange = document.getElementById('category-range');
    const userScore = document.getElementById('user-score');
    
    // Remove all category classes
    banner.classList.remove('high-risk', 'needs-improvement', 'moderate-risk', 'low-risk', 'prime');
    
    // Add current category class
    banner.classList.add(category.class);
    
    // Update text
    categoryName.textContent = category.name;
    categoryRange.textContent = `${category.range[0]} - ${category.range[1]}`;
    userScore.textContent = creditScore;
}

// Render required actions
function renderRequiredActions(actions) {
    const container = document.getElementById('required-actions');
    
    container.innerHTML = actions.map(action => `
        <div class="action-item">
            <div class="action-icon">
                <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path>
                </svg>
            </div>
            <div class="action-content">
                <h4 class="action-title">${escapeHtml(action.title)}</h4>
                <p class="action-description">${escapeHtml(action.description)}</p>
                <span class="action-impact" style="background-color: ${getImpactColor(action.impact)}">${action.impact} Impact</span>
            </div>
        </div>
    `).join('');
}

// Render suggestions
function renderSuggestions(suggestions) {
    const container = document.getElementById('suggestions-list');
    
    container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-card">
            <div class="suggestion-header">
                <span class="suggestion-icon">${suggestion.icon}</span>
                <h4 class="suggestion-title">${escapeHtml(suggestion.title)}</h4>
            </div>
            <p class="suggestion-text">${escapeHtml(suggestion.text)}</p>
        </div>
    `).join('');
}

// Get impact color
function getImpactColor(impact) {
    switch (impact.toLowerCase()) {
        case 'critical':
            return '#dc2626';
        case 'high':
            return '#ea580c';
        case 'medium':
            return '#eab308';
        case 'low':
            return '#10b981';
        default:
            return '#6b7280';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show message when no credit score is set
function showNoCreditScoreMessage() {
    const banner = document.getElementById('category-banner');
    const requiredSection = document.getElementById('required-actions');
    const suggestionsSection = document.getElementById('suggestions-list');
    
    // Update banner
    banner.className = 'category-banner needs-improvement';
    document.getElementById('category-name').textContent = 'Get Started';
    document.getElementById('category-range').textContent = 'Set up your profile';
    document.getElementById('user-score').textContent = 'Not set';
    
    // Show helpful message in required actions
    requiredSection.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
            <svg style="width: 4rem; height: 4rem; color: #2171f2; margin: 0 auto 1.5rem;" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path>
            </svg>
            <h3 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">Credit Score Not Set</h3>
            <p style="font-size: 1rem; color: #6b7280; margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                To get personalized credit improvement recommendations, please set your credit score first on the dashboard.
            </p>
            <a href="userdashboard.html" style="display: inline-block; padding: 0.75rem 2rem; background-color: #2171f2; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s;">
                Go to Dashboard
            </a>
        </div>
    `;
    
    // Show tips in suggestions
    suggestionsSection.innerHTML = `
        <div class="suggestion-card">
            <div class="suggestion-header">
                <span class="suggestion-icon">📊</span>
                <h4 class="suggestion-title">What is a credit score?</h4>
            </div>
            <p class="suggestion-text">A credit score is a three-digit number (300-850) that represents your creditworthiness based on your credit history.</p>
        </div>
        <div class="suggestion-card">
            <div class="suggestion-header">
                <span class="suggestion-icon">🔍</span>
                <h4 class="suggestion-title">How to find your score</h4>
            </div>
            <p class="suggestion-text">You can check your credit score for free through your bank, credit card issuer, or services like Credit Karma, Experian, or AnnualCreditReport.com.</p>
        </div>
        <div class="suggestion-card">
            <div class="suggestion-header">
                <span class="suggestion-icon">⚡</span>
                <h4 class="suggestion-title">Quick setup</h4>
            </div>
            <p class="suggestion-text">Once you have your score, go to the dashboard and enter it. You'll instantly get personalized recommendations to improve it!</p>
        </div>
    `;
}

// Show message for invalid credit score
function showInvalidScoreMessage(score) {
    const requiredSection = document.getElementById('required-actions');
    requiredSection.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
            <svg style="width: 4rem; height: 4rem; color: #ef4444; margin: 0 auto 1.5rem;" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
            </svg>
            <h3 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">Invalid Credit Score</h3>
            <p style="font-size: 1rem; color: #6b7280; margin-bottom: 2rem;">
                The credit score "${score}" is outside the valid range (300-850). Please update your score on the dashboard.
            </p>
            <a href="userdashboard.html" style="display: inline-block; padding: 0.75rem 2rem; background-color: #2171f2; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600;">
                Update Score
            </a>
        </div>
    `;
}

// Show error message
function showErrorMessage() {
    const requiredSection = document.getElementById('required-actions');
    requiredSection.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
            <svg style="width: 4rem; height: 4rem; color: #ef4444; margin: 0 auto 1.5rem;" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
            </svg>
            <h3 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">Error Loading Data</h3>
            <p style="font-size: 1rem; color: #6b7280; margin-bottom: 2rem;">
                There was an error loading your credit information. Please try refreshing the page.
            </p>
            <button onclick="location.reload()" style="padding: 0.75rem 2rem; background-color: #2171f2; color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">
                Refresh Page
            </button>
        </div>
    `;
}

// Load user data and initialize page
async function initializePage() {
    try {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        const result = await getUserData(user.uid);
        
        // Check if getUserData was successful
        if (!result.success || !result.data) {
            console.error('Failed to get user data:', result.error);
            showErrorMessage();
            return;
        }
        
        const userData = result.data;
        
        if (!userData.creditScore) {
            // Show message to set credit score first
            showNoCreditScoreMessage();
            return;
        }

        const creditScore = userData.creditScore;
        const category = getCreditCategory(creditScore);
        
        if (category) {
            updateCategoryBanner(category, creditScore);
            renderRequiredActions(category.requiredActions);
            renderSuggestions(category.suggestions);
        } else {
            console.error('Invalid credit score:', creditScore);
            showInvalidScoreMessage(creditScore);
        }

    } catch (error) {
        console.error('Error loading user data:', error);
        showErrorMessage();
    }
}

// Logout handler
window.handleLogout = async function() {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};

// Initialize on auth state change
onAuthStateChanged(auth, (user) => {
    if (user) {
        initializePage();
    } else {
        window.location.href = '../index.html';
    }
});
