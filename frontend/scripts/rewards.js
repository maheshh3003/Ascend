import { auth, db, doc, getDoc, setDoc, updateDoc, onAuthStateChanged, getUserData } from './auth.js';
import { arrayUnion } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userRewardsData = null;
let userData = null;

// Spending tiers
const SPENDING_TIERS = {
    BRONZE: { min: 0, max: 499, name: 'Bronze' },
    SILVER: { min: 500, max: 1999, name: 'Silver' },
    GOLD: { min: 2000, max: 4999, name: 'Gold' },
    PLATINUM: { min: 5000, max: Infinity, name: 'Platinum' }
};

// Gift cards catalog
const giftCards = [
    {
        id: 'amazon_10',
        title: 'Amazon Gift Card - $10',
        brand: 'Amazon',
        value: 10,
        requiredSpending: 100,
        description: 'Redeem for millions of items on Amazon.com',
        icon: 'shopping',
        color: 'orange'
    },
    {
        id: 'amazon_25',
        title: 'Amazon Gift Card - $25',
        brand: 'Amazon',
        value: 25,
        requiredSpending: 250,
        description: 'Redeem for millions of items on Amazon.com',
        icon: 'shopping',
        color: 'orange'
    },
    {
        id: 'amazon_50',
        title: 'Amazon Gift Card - $50',
        brand: 'Amazon',
        value: 50,
        requiredSpending: 500,
        description: 'Redeem for millions of items on Amazon.com',
        icon: 'shopping',
        color: 'orange',
        badge: 'Popular'
    },
    {
        id: 'starbucks_10',
        title: 'Starbucks Gift Card - $10',
        brand: 'Starbucks',
        value: 10,
        requiredSpending: 100,
        description: 'Enjoy your favorite coffee and treats',
        icon: 'coffee',
        color: 'green'
    },
    {
        id: 'starbucks_25',
        title: 'Starbucks Gift Card - $25',
        brand: 'Starbucks',
        value: 25,
        requiredSpending: 250,
        description: 'Enjoy your favorite coffee and treats',
        icon: 'coffee',
        color: 'green'
    },
    {
        id: 'target_25',
        title: 'Target Gift Card - $25',
        brand: 'Target',
        value: 25,
        requiredSpending: 250,
        description: 'Shop for everything you need at Target',
        icon: 'store',
        color: 'red'
    },
    {
        id: 'target_50',
        title: 'Target Gift Card - $50',
        brand: 'Target',
        value: 50,
        requiredSpending: 500,
        description: 'Shop for everything you need at Target',
        icon: 'store',
        color: 'red'
    },
    {
        id: 'walmart_50',
        title: 'Walmart Gift Card - $50',
        brand: 'Walmart',
        value: 50,
        requiredSpending: 500,
        description: 'Save money, live better at Walmart',
        icon: 'cart',
        color: 'blue',
        badge: 'Best Value'
    },
    {
        id: 'apple_25',
        title: 'Apple Gift Card - $25',
        brand: 'Apple',
        value: 25,
        requiredSpending: 300,
        description: 'For apps, games, music, movies, and more',
        icon: 'device',
        color: 'gray'
    }
];

// Special deals and exclusive offers
const specialDeals = [
    // Credit Cards by Risk Category
    {
        id: 'axus_bronze',
        type: 'card',
        title: 'Axus Bank Bronze Card',
        issuer: 'Axus Bank',
        category: 'High Risk',
        requiredScore: { min: 300, max: 579 },
        features: [
            'Build credit with responsible use',
            'No annual fee for first year',
            '1% cashback on all purchases',
            'Credit monitoring included',
            'Free credit education resources'
        ],
        apr: '24.99% - 29.99%',
        creditLimit: '$300 - $500',
        color: '#CD7F32',
        tier: 'bronze'
    },
    {
        id: 'axus_silver',
        type: 'card',
        title: 'Axus Bank Silver Card',
        issuer: 'Axus Bank',
        category: 'Moderate Risk',
        requiredScore: { min: 580, max: 669 },
        features: [
            'Rebuild your credit score',
            '1.5% cashback on groceries',
            '1% cashback on all other purchases',
            'No foreign transaction fees',
            'Monthly credit score tracking'
        ],
        apr: '19.99% - 24.99%',
        creditLimit: '$500 - $1,500',
        color: '#C0C0C0',
        tier: 'silver'
    },
    {
        id: 'axus_gold',
        type: 'card',
        title: 'Axus Bank Gold Card',
        issuer: 'Axus Bank',
        category: 'Good Credit',
        requiredScore: { min: 670, max: 739 },
        features: [
            '3% cashback on dining',
            '2% cashback on gas and groceries',
            '1% cashback on everything else',
            'Travel insurance included',
            'Extended warranty protection'
        ],
        apr: '15.99% - 19.99%',
        creditLimit: '$2,000 - $5,000',
        color: '#FFD700',
        tier: 'gold',
        badge: 'Popular'
    },
    {
        id: 'axus_diamond',
        type: 'card',
        title: 'Axus Bank Diamond Card',
        issuer: 'Axus Bank',
        category: 'Very Good Credit',
        requiredScore: { min: 740, max: 799 },
        features: [
            '4% cashback on dining and entertainment',
            '3% cashback on travel and gas',
            '2% cashback on groceries',
            'Priority customer service',
            'Airport lounge access (4 visits/year)',
            'Cell phone protection'
        ],
        apr: '12.99% - 15.99%',
        creditLimit: '$5,000 - $15,000',
        color: '#B9F2FF',
        tier: 'diamond'
    },
    {
        id: 'axus_platinum',
        type: 'card',
        title: 'Axus Bank Platinum Card',
        issuer: 'Axus Bank',
        category: 'Excellent Credit',
        requiredScore: { min: 800, max: 850 },
        features: [
            '5% cashback on all travel purchases',
            '3% cashback on dining and streaming',
            '2% cashback on everything else',
            '$200 annual travel credit',
            'Unlimited airport lounge access',
            'Concierge service 24/7',
            'Premium travel insurance',
            'No annual fee'
        ],
        apr: '10.99% - 12.99%',
        creditLimit: '$15,000+',
        color: '#E5E4E2',
        tier: 'platinum',
        badge: 'Elite'
    },
    // Brand Coupon Offers
    {
        id: 'boat_coupon',
        type: 'coupon',
        title: 'boAt - Exclusive Discount Coupon',
        partner: 'boAt',
        value: '25% OFF',
        description: 'Get 25% off on all boAt audio products - headphones, earbuds, speakers and more',
        requiredTier: 'BRONZE',
        couponCode: 'BOAT25CREDO',
        icon: 'headphones',
        color: '#FF0000',
        badge: 'Limited Time'
    },
    {
        id: 'amazon_discount',
        type: 'discount',
        title: 'Amazon - 5% Off Everything',
        partner: 'Amazon',
        value: '5% OFF',
        description: 'Activate to get 5% discount on all Amazon purchases for 30 days',
        requiredTier: 'SILVER',
        validDays: 30,
        icon: 'shopping',
        color: '#FF9900',
        badge: 'Exclusive'
    },
    // Other Special Deals
    {
        id: 'grocery_cashback',
        type: 'cashback',
        title: '10% Cashback on Groceries',
        partner: 'Multiple Stores',
        value: '10%',
        description: 'Get 10% cashback when you shop at partner grocery stores',
        requiredTier: 'SILVER',
        icon: 'cart',
        color: '#4CAF50'
    },
    {
        id: 'gas_cashback',
        type: 'cashback',
        title: '5% Cashback on Gas',
        partner: 'Shell, BP, Chevron',
        value: '5%',
        description: 'Earn 5% cashback on all fuel purchases at participating stations',
        requiredTier: 'BRONZE',
        icon: 'gas',
        color: '#2196F3'
    },
    {
        id: 'travel_deal',
        type: 'discount',
        title: 'Travel Discounts',
        partner: 'Expedia',
        value: '15% OFF',
        description: 'Save 15% on hotels and 10% on flights through Expedia',
        requiredTier: 'GOLD',
        icon: 'plane',
        color: '#9C27B0'
    },
    {
        id: 'dining_cashback',
        type: 'cashback',
        title: 'Restaurant Rewards',
        partner: 'DoorDash, Uber Eats',
        value: '8%',
        description: 'Get 8% cashback on food delivery and dining out',
        requiredTier: 'SILVER',
        icon: 'restaurant',
        color: '#FF5722'
    },
    {
        id: 'streaming_deal',
        type: 'discount',
        title: 'Streaming Bundle Discount',
        partner: 'Netflix, Spotify',
        value: '20% OFF',
        description: 'Save 20% when you bundle streaming services',
        requiredTier: 'GOLD',
        icon: 'tv',
        color: '#E91E63'
    }
];

// Helper Functions
function getUserTier(spending) {
    if (spending >= SPENDING_TIERS.PLATINUM.min) return 'PLATINUM';
    if (spending >= SPENDING_TIERS.GOLD.min) return 'GOLD';
    if (spending >= SPENDING_TIERS.SILVER.min) return 'SILVER';
    return 'BRONZE';
}

function canAccessTier(userTier, requiredTier) {
    const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}

function getColorGradient(color) {
    const gradients = {
        orange: '#fb923c 0%, #f97316 100%',
        green: '#34d399 0%, #10b981 100%',
        red: '#f87171 0%, #ef4444 100%',
        blue: '#60a5fa 0%, #3b82f6 100%',
        gray: '#94a3b8 0%, #64748b 100%'
    };
    return gradients[color] || '#2171f2 0%, #1557b0 100%';
}

// Initialize app
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            await loadUserData();
            await loadRewardsData();
            updateSpendingOverview();
            renderGiftCards();
            renderSpecialDeals();
        } catch (error) {
            console.error('Error loading rewards data:', error);
            // Show default state even if there's an error
            updateSpendingOverview();
            renderGiftCards();
            renderSpecialDeals();
        }
    } else {
        window.location.href = '../index.html';
    }
});

// Load user data
async function loadUserData() {
    const result = await getUserData();
    if (result.success) {
        userData = result.data;
    } else {
        console.error('Error loading user data:', result.error);
        userData = { creditScore: 0 }; // Default fallback
    }
}

// Load rewards data
async function loadRewardsData() {
    // Load from users collection instead of separate rewards collection
    // This ensures spending data is synchronized with payments
    const result = await getUserData();
    
    if (result.success && result.data) {
        userRewardsData = {
            totalSpending: result.data.totalSpending || 0,
            claimedRewards: result.data.claimedRewards || []
        };
    } else {
        // Initialize rewards data
        userRewardsData = {
            totalSpending: 0,
            claimedRewards: []
        };
    }
}

// Update spending overview
function updateSpendingOverview() {
    const spending = userRewardsData?.totalSpending || 0;
    const tier = getUserTier(spending);
    const tierInfo = SPENDING_TIERS[tier];
    
    // Update total spending
    document.getElementById('total-spending').textContent = `$${spending.toFixed(2)}`;
    
    // Update current tier
    document.getElementById('current-tier').textContent = tierInfo.name;
    
    // Update next tier progress
    const nextTierEl = document.getElementById('next-tier');
    if (tier === 'PLATINUM') {
        nextTierEl.innerHTML = '<span class="tier-platinum">Maximum Tier Achieved! 🎉</span>';
    } else {
        const nextTierKey = tier === 'BRONZE' ? 'SILVER' : tier === 'SILVER' ? 'GOLD' : 'GOLD';
        const nextTierInfo = SPENDING_TIERS[nextTierKey];
        const remaining = nextTierInfo.min - spending;
        nextTierEl.innerHTML = `Spend $${remaining.toFixed(2)} more to reach <span class="tier-${nextTierKey.toLowerCase()}">${nextTierInfo.name}</span>`;
    }
}

// Render gift cards
function renderGiftCards() {
    const grid = document.getElementById('gift-cards-grid');
    if (!grid) {
        console.error('Gift cards grid element not found!');
        return;
    }
    
    const spending = userRewardsData?.totalSpending || 0;
    
    grid.innerHTML = giftCards.map(card => {
        const canRedeem = spending >= card.requiredSpending;
        const alreadyClaimed = userRewardsData?.claimedRewards?.includes(card.id);
        
        return `
            <div class="reward-card ${!canRedeem ? 'locked' : ''}">
                ${card.badge ? `<div class="reward-badge featured">${card.badge}</div>` : ''}
                <div class="reward-image" style="background: linear-gradient(135deg, ${getColorGradient(card.color)});">
                    ${getIcon(card.icon)}
                </div>
                <div class="reward-content">
                    <h3 class="reward-title">${card.title}</h3>
                    <p class="reward-description">${card.description}</p>
                    <div class="reward-footer">
                        <div class="reward-cost">
                            <svg fill="currentColor" viewBox="0 0 256 256" width="20" height="20">
                                <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Z"></path>
                            </svg>
                            $${card.requiredSpending} spent
                        </div>
                        ${canRedeem && !alreadyClaimed ? 
                            `<button class="btn-redeem" onclick="openRedeemModal('${card.id}')">Redeem</button>` :
                            alreadyClaimed ?
                            `<button class="btn-redeem" disabled>Claimed ✓</button>` :
                            `<button class="btn-redeem" disabled>🔒 Locked</button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render special deals
function renderSpecialDeals() {
    const grid = document.getElementById('special-deals');
    if (!grid) {
        console.error('Special deals grid element not found!');
        return;
    }
    
    const spending = userRewardsData?.totalSpending || 0;
    const userTier = getUserTier(spending);
    const creditScore = userData?.creditScore || 0;
    
    // Filter deals based on user criteria
    const availableDeals = specialDeals.filter(deal => {
        // For credit cards, show all cards that user qualifies for (including lower tier cards)
        if (deal.type === 'card') {
            if (creditScore === 0) return true; // Show all cards if no credit score
            // Show card if user's credit score is >= card's minimum requirement
            // This allows higher tier users to see lower tier cards
            return creditScore >= deal.requiredScore.min;
        }
        // For other deals, always show them (just disable if not accessible)
        return true;
    });
    
    if (availableDeals.length === 0) {
        grid.innerHTML = '<p class="no-deals">No deals available yet. Keep spending to unlock rewards!</p>';
        return;
    }
    
    grid.innerHTML = availableDeals.map(deal => {
        const accessible = deal.type === 'card' || canAccessTier(userTier, deal.requiredTier);
        
        if (deal.type === 'card') {
            // Credit Card
            return `
                <div class="credit-card-item" style="border: 2px solid ${deal.color}">
                    ${deal.badge ? `<div class="deal-badge">${deal.badge}</div>` : ''}
                    <div class="card-visual" style="background: linear-gradient(135deg, ${deal.color}aa, ${deal.color}22)">
                        <div class="card-chip"></div>
                        <div class="card-brand-logo">${deal.issuer}</div>
                    </div>
                    <div class="card-details">
                        <h3 class="card-name">${deal.title}</h3>
                        <p class="card-category" style="font-size: 0.875rem; color: #64748b; margin-bottom: 1rem;">${deal.category} (${deal.requiredScore.min}-${deal.requiredScore.max})</p>
                        <ul class="card-features">
                            ${deal.features.slice(0, 3).map(f => `<li>${f}</li>`).join('')}
                        </ul>
                        <div class="card-terms" style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.875rem;">
                            <span>APR: ${deal.apr}</span>
                            <span>Limit: ${deal.creditLimit}</span>
                        </div>
                        <button class="btn-redeem" onclick="openCardApplicationModal('${deal.id}')" style="width: 100%; margin-top: 1rem;">
                            Apply Now
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Other deals (coupons, discounts, cashback)
            const dealIcon = deal.icon || 'shopping';
            const dealColor = deal.color || '#2171f2';
            
            return `
                <div class="deal-card ${!accessible ? 'locked' : ''}">
                    ${deal.badge ? `<div class="deal-badge">${deal.badge}</div>` : ''}
                    <div class="deal-image" style="background: linear-gradient(135deg, ${dealColor}, ${dealColor}dd);">
                        ${getIcon(dealIcon)}
                    </div>
                    <div class="deal-content">
                        <p class="deal-partner">${deal.partner}</p>
                        <h3 class="deal-title">${deal.title}</h3>
                        <p class="deal-description">${deal.description}</p>
                        <div class="deal-footer">
                            <div class="deal-value">
                                <span class="deal-value-label">Value</span>
                                <span class="deal-value-amount">${deal.value}</span>
                            </div>
                            ${accessible ? 
                                (deal.type === 'coupon' ? 
                                    `<button class="btn-redeem" onclick="openCouponModal('${deal.id}')">Get Coupon</button>` :
                                    `<button class="btn-redeem" onclick="activateDeal('${deal.id}')">Activate</button>`
                                ) :
                                `<button class="btn-redeem" disabled>🔒 Requires ${deal.requiredTier}</button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Modal Functions
let currentOffer = null;

window.openCouponModal = function(dealId) {
    const deal = specialDeals.find(d => d.id === dealId);
    if (!deal) return;
    
    currentOffer = deal;
    const modal = document.getElementById('offer-modal');
    const modalTitle = document.getElementById('offer-modal-title');
    const offerPreview = document.getElementById('offer-preview');
    const couponDisplay = document.getElementById('coupon-display');
    const confirmBtn = document.getElementById('confirm-offer-btn');
    
    modalTitle.textContent = 'Get Your Coupon';
    offerPreview.innerHTML = `
        <div class="offer-details">
            <div class="offer-icon-large" style="background: ${deal.color}22; color: ${deal.color}">
                ${getIcon(deal.icon)}
            </div>
            <h3>${deal.title}</h3>
            <p class="offer-value-large">${deal.value}</p>
            <p>${deal.description}</p>
        </div>
    `;
    
    couponDisplay.style.display = 'none';
    confirmBtn.style.display = 'block';
    confirmBtn.textContent = 'Get Coupon';
    
    modal.style.display = 'flex';
};

window.openCardApplicationModal = function(cardId) {
    const card = specialDeals.find(d => d.id === cardId);
    if (!card) return;
    
    currentOffer = card;
    const modal = document.getElementById('offer-modal');
    const modalTitle = document.getElementById('offer-modal-title');
    const offerPreview = document.getElementById('offer-preview');
    const couponDisplay = document.getElementById('coupon-display');
    const confirmBtn = document.getElementById('confirm-offer-btn');
    
    modalTitle.textContent = 'Credit Card Application';
    offerPreview.innerHTML = `
        <div class="offer-details">
            <div class="card-visual-large" style="background: linear-gradient(135deg, ${card.color}aa, ${card.color}22)">
                <div class="card-chip"></div>
                <div class="card-brand-logo-large">${card.issuer}</div>
            </div>
            <h3>${card.title}</h3>
            <p class="card-category">${card.category}</p>
            <div class="card-full-features">
                <h4>Card Features:</h4>
                <ul>
                    ${card.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
            <div class="card-terms-full">
                <div><strong>APR:</strong> ${card.apr}</div>
                <div><strong>Credit Limit:</strong> ${card.creditLimit}</div>
                <div><strong>Required Score:</strong> ${card.requiredScore.min}-${card.requiredScore.max}</div>
            </div>
        </div>
    `;
    
    couponDisplay.style.display = 'none';
    confirmBtn.style.display = 'block';
    confirmBtn.textContent = 'Apply Now';
    
    modal.style.display = 'flex';
};

window.confirmOffer = function() {
    if (!currentOffer) return;
    
    if (currentOffer.type === 'coupon') {
        // Show coupon code
        const couponDisplay = document.getElementById('coupon-display');
        const couponCode = document.getElementById('coupon-code');
        const confirmBtn = document.getElementById('confirm-offer-btn');
        
        couponCode.textContent = currentOffer.couponCode;
        couponDisplay.style.display = 'block';
        confirmBtn.style.display = 'none';
    } else if (currentOffer.type === 'card') {
        // Redirect to card application (in real app, this would go to bank's site)
        alert(`Redirecting to ${currentOffer.issuer} application page...\nIn a real application, this would open the bank's card application form.`);
        closeOfferModal();
    }
};

window.copyCouponCode = function() {
    const couponCode = document.getElementById('coupon-code').textContent;
    navigator.clipboard.writeText(couponCode).then(() => {
        const btn = event.target.closest('.btn-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>✓ Copied!</span>';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
};

window.closeOfferModal = function() {
    const modal = document.getElementById('offer-modal');
    modal.style.display = 'none';
    currentOffer = null;
};

window.activateDeal = function(dealId) {
    const deal = specialDeals.find(d => d.id === dealId);
    if (!deal) return;
    
    alert(`${deal.title} activated!\n\n${deal.description}\n\nYour deal is now active and ready to use.`);
};

// Gift card redemption (existing functionality)
window.openRedeemModal = function(cardId) {
    const card = giftCards.find(c => c.id === cardId);
    if (!card) return;
    
    const modal = document.getElementById('offer-modal');
    const modalTitle = document.getElementById('offer-modal-title');
    const offerPreview = document.getElementById('offer-preview');
    const couponDisplay = document.getElementById('coupon-display');
    const confirmBtn = document.getElementById('confirm-offer-btn');
    
    currentOffer = { ...card, type: 'giftcard' };
    
    modalTitle.textContent = 'Redeem Gift Card';
    offerPreview.innerHTML = `
        <div class="offer-details">
            <div class="offer-icon-large ${card.color}">
                ${getIcon(card.icon)}
            </div>
            <h3>${card.title}</h3>
            <p class="offer-value-large">$${card.value} Value</p>
            <p>${card.description}</p>
            <p class="redemption-note">Once redeemed, the gift card code will be sent to your email within 24 hours.</p>
        </div>
    `;
    
    couponDisplay.style.display = 'none';
    confirmBtn.style.display = 'block';
    confirmBtn.textContent = 'Confirm Redemption';
    confirmBtn.onclick = confirmRedemption;
    
    modal.style.display = 'flex';
};

// Generate a random 16-digit gift card code
function generateGiftCardCode() {
    const segments = [];
    for (let i = 0; i < 4; i++) {
        const segment = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        segments.push(segment);
    }
    return segments.join('-');
}

async function confirmRedemption() {
    if (!currentOffer || currentOffer.type !== 'giftcard') return;
    
    try {
        // Import Firestore functions
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { hashEmail } = await import('./hashUtils.js');
        
        // Get email hash for document ID
        const emailHash = await hashEmail(currentUser.email);
        
        // Update users collection with claimed reward
        await updateDoc(doc(db, 'users', emailHash), {
            claimedRewards: arrayUnion(currentOffer.id),
            lastUpdated: new Date().toISOString()
        });
        
        userRewardsData.claimedRewards.push(currentOffer.id);
        
        // Generate a gift card code
        const giftCardCode = generateGiftCardCode();
        
        // Show the code instead of showing alert
        const offerPreview = document.getElementById('offer-preview');
        const confirmBtn = document.getElementById('confirm-offer-btn');
        const couponDisplay = document.getElementById('coupon-display');
        const couponCode = document.getElementById('coupon-code');
        
        // Update modal to show gift card code
        offerPreview.innerHTML = `
            <div class="offer-details">
                <div class="offer-icon-large" style="background: ${currentOffer.color}22; color: ${currentOffer.color}">
                    ${getIcon(currentOffer.icon)}
                </div>
                <h3 style="color: #22c55e; margin: 1rem 0;">✓ Redeemed Successfully!</h3>
                <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">${currentOffer.title}</p>
                <p style="color: var(--slate-600); margin-bottom: 1.5rem;">Your gift card is ready to use</p>
            </div>
        `;
        
        couponCode.textContent = giftCardCode;
        couponDisplay.style.display = 'block';
        confirmBtn.style.display = 'none';
        
        // Update gift cards display
        renderGiftCards();
        
    } catch (error) {
        console.error('Error redeeming reward:', error);
        alert('Failed to redeem reward: ' + error.message);
    }
}

// Icon helper function
function getIcon(iconName) {
    const icons = {
        shopping: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z"></path></svg>',
        coffee: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M208,80H32a8,8,0,0,0-8,8v48a96.11,96.11,0,0,0,88,95.66V240H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16H144V231.66A96.11,96.11,0,0,0,232,136V120h8a8,8,0,0,0,0-16ZM40,136V96H216v40a80,80,0,0,1-176,0Z"></path></svg>',
        store: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M240,98.34a16,16,0,0,0,1.07-5.68V88a16,16,0,0,0-16-16H31A16,16,0,0,0,15,88v4.66a16,16,0,0,0,1.07,5.68A16,16,0,0,0,16,104v104a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V104A16,16,0,0,0,240,98.34ZM32,88H224v4.66a16.17,16.17,0,0,0-1.07,5.68A16,16,0,0,0,224,104v8H32v-8a16,16,0,0,0,1.07-5.68A16.17,16.17,0,0,0,32,92.66Zm0,40H224v80H32Z"></path></svg>',
        cart: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Z"></path></svg>',
        device: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16ZM72,64H184V176H72ZM80,32h96a8,8,0,0,1,8,8v8H72V40A8,8,0,0,1,80,32ZM176,224H80a8,8,0,0,1-8-8V192H184v24A8,8,0,0,1,176,224Z"></path></svg>',
        card: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Z"></path></svg>',
        headphones: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M201.89,54.66A103.43,103.43,0,0,0,128,24h-1.07A104,104,0,0,0,24,128v56a40,40,0,0,0,40,40H80a16,16,0,0,0,16-16V136a16,16,0,0,0-16-16H64V128a80,80,0,0,1,159.93-2.08A79.55,79.55,0,0,1,224,128v8H192a16,16,0,0,0-16,16v72a16,16,0,0,0,16,16h16a40,40,0,0,0,40-40V128A103.41,103.41,0,0,0,201.89,54.66ZM80,136v72H64a24,24,0,0,1-24-24V136Zm136,72H192V136h24v48A24,24,0,0,0,216,208Z"></path></svg>',
        gas: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M240,106.65a8,8,0,0,0-4-6.93l-28-16.08V64a8,8,0,0,0-16,0V76.58L173.33,62.72a8,8,0,0,0-8,13.84l36.67,21.12v42.67l-36.67-21.12a8,8,0,1,0-8,13.84L176,146.65V200a16,16,0,0,1-16,16H72a16,16,0,0,1-16-16V112a8,8,0,0,0,0-16V56A16,16,0,0,1,72,40h88a16,16,0,0,1,16,16v8a8,8,0,0,0,16,0V56a32,32,0,0,0-32-32H72A32,32,0,0,0,40,56V96a8,8,0,0,0,0,16v88a32,32,0,0,0,32,32h88a32,32,0,0,0,32-32V152.58L210.67,165a8,8,0,0,0,4,1.07,8,8,0,0,0,4-14.93L200,136.58V93.91l36.67,21.12a8,8,0,0,0,8-13.84Z"></path></svg>',
        plane: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M235.58,128.84,160,91.06V48a32,32,0,0,0-64,0V91.06L20.42,128.84a8,8,0,0,0-4.42,7.16v48a8,8,0,0,0,11.58,7.16L96,158.94V192H80a8,8,0,0,0,0,16h96a8,8,0,0,0,0-16H160V158.94l68.42,32.22A8,8,0,0,0,240,184V136A8,8,0,0,0,235.58,128.84ZM224,177.06l-68.42-32.22A8,8,0,0,0,144,152v40a8,8,0,0,0,8,8h16v-8a8,8,0,0,1,8-8h8v24H120V160a8,8,0,0,0-11.58-7.16L32,177.06V136l75.58-37.84A8,8,0,0,0,112,91V48a16,16,0,0,1,32,0V91a8,8,0,0,0,4.42,7.16L224,136Z"></path></svg>',
        restaurant: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M216,88V40a8,8,0,0,0-16,0V88a16,16,0,0,1-16,16h-8a8,8,0,0,0-8,8V224a8,8,0,0,0,16,0V120h8a32,32,0,0,0,32-32ZM80,40a8,8,0,0,0-16,0V96a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V40a8,8,0,0,0-16,0V96a32,32,0,0,0,32,32v96a8,8,0,0,0,16,0V128A32,32,0,0,0,88,96V40Z"></path></svg>',
        tv: '<svg fill="currentColor" viewBox="0 0 256 256" width="32" height="32"><path d="M216,64H147.31l34.35-34.34a8,8,0,1,0-11.32-11.32L128,60.69,85.66,18.34A8,8,0,0,0,74.34,29.66L108.69,64H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,136H40V80H216V200Z"></path></svg>'
    };
    return icons[iconName] || icons.card;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('offer-modal');
    if (event.target === modal) {
        closeOfferModal();
    }
};
