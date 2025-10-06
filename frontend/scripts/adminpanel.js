// Admin Panel JavaScript
import { auth, db, onAuthStateChanged, logout as firebaseLogout } from './auth.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// State
let currentUser = null;
let allUsers = [];
let fraudReports = [];
let npsRatings = [];
let selectedNPSRating = null;
let currentPaymentUser = null; // For NPS modal after payment

// List of admin emails
const ADMIN_EMAILS = [
    'admin@gmail.com',
    'admin1@gmail.com'
];

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if user email is in admin list
        if (ADMIN_EMAILS.includes(user.email)) {
            currentUser = user;
            initializeAdminPanel();
        } else {
            // Also check Firestore admins collection (for backwards compatibility)
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
                currentUser = user;
                initializeAdminPanel();
            } else {
                alert('Access denied. Admin privileges required.');
                window.location.href = '../index.html';
            }
        }
    } else {
        window.location.href = '../index.html';
    }
});

// Initialize admin panel
async function initializeAdminPanel() {
    console.log('🔧 Initializing Admin Panel...');
    await loadAllData();
    setupNPSRatingButtons();
    showSection('dashboard');
}

// Load all data
async function loadAllData() {
    try {
        console.log('📊 Loading admin data...');
        await Promise.all([
            loadUsers(),
            loadFraudReports(),
            loadNPSRatings()
        ]);
        updateDashboard();
        console.log('✅ Admin data loaded successfully');
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Load all users
async function loadUsers() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = [];
        
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            allUsers.push({
                id: doc.id,
                ...userData,
                joinedDate: userData.joinedDate?.toDate() || new Date(),
                lastActive: userData.lastActive?.toDate() || new Date()
            });
        });
        
        console.log(`👥 Loaded ${allUsers.length} users`);
    } catch (error) {
        console.error('Error loading users:', error);
        allUsers = [];
    }
}

// Load fraud reports
async function loadFraudReports() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        fraudReports = [];
        
        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.loans && Array.isArray(userData.loans)) {
                userData.loans.forEach(loan => {
                    if (loan.isFraud && loan.fraudReport) {
                        fraudReports.push({
                            userId: userDoc.id,
                            userName: userData.name || 'Unknown',
                            userEmail: userData.email || 'No email',
                            loan: loan,
                            reportedAt: loan.fraudReport.reportedAt ? new Date(loan.fraudReport.reportedAt) : new Date()
                        });
                    }
                });
            }
        });
        
        console.log(`🚨 Loaded ${fraudReports.length} fraud reports`);
    } catch (error) {
        console.error('Error loading fraud reports:', error);
        fraudReports = [];
    }
}

// Load NPS ratings
async function loadNPSRatings() {
    try {
        const npsSnapshot = await getDocs(collection(db, 'nps_ratings'));
        npsRatings = [];
        
        npsSnapshot.forEach((doc) => {
            const rating = doc.data();
            npsRatings.push({
                id: doc.id,
                ...rating,
                submittedAt: rating.submittedAt?.toDate() || new Date()
            });
        });
        
        console.log(`📈 Loaded ${npsRatings.length} NPS ratings`);
    } catch (error) {
        console.error('Error loading NPS ratings:', error);
        npsRatings = [];
    }
}

// Update dashboard metrics
function updateDashboard() {
    updateKeyMetrics();
    renderRecentActivity();
    updateUserStats();
    updateRevenueMetrics();
    updateRewardsMetrics();
    updateFraudMetrics();
    updateNPSDisplay();
    renderUsersTable();
    renderFraudTable();
    renderFeedbackList();
    renderRevenueChart();
    renderUserGrowthChart();
    calculateAndRenderRFM();
    calculateAndRenderCLV();
}

// Update key metrics
function updateKeyMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    // Total users
    document.getElementById('total-users').textContent = allUsers.length.toLocaleString();
    
    // New users in last 7 days
    const newUsers = allUsers.filter(u => u.joinedDate >= sevenDaysAgo).length;
    const previousNewUsers = allUsers.filter(u => {
        const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
        return u.joinedDate >= fourteenDaysAgo && u.joinedDate < sevenDaysAgo;
    }).length;
    const usersChange = previousNewUsers > 0 
        ? ((newUsers - previousNewUsers) / previousNewUsers * 100).toFixed(1)
        : 0;
    document.getElementById('users-change').textContent = `+${usersChange}% from last week`;
    
    // Total revenue
    const totalRevenue = calculateTotalRevenue();
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toLocaleString()}`;
    document.getElementById('revenue-change').textContent = '+12.5% from last month';
    
    // Premium users
    const premiumUsers = allUsers.filter(u => u.isPremium).length;
    document.getElementById('premium-users').textContent = premiumUsers.toLocaleString();
    const conversionRate = (premiumUsers / allUsers.length * 100).toFixed(1);
    document.getElementById('premium-change').textContent = `${conversionRate}% conversion rate`;
    
    // NPS Score
    const nps = calculateNPS();
    document.getElementById('nps-score').textContent = nps.score;
    const npsClass = nps.score > 50 ? 'positive' : nps.score > 0 ? '' : 'negative';
    document.getElementById('nps-change').textContent = nps.rating;
    document.getElementById('nps-change').className = `metric-change ${npsClass}`;
}

// Calculate total revenue
function calculateTotalRevenue() {
    let total = 0;
    
    allUsers.forEach(user => {
        // Premium subscriptions ($9.99/month)
        if (user.isPremium) {
            total += 9.99;
        }
        
        // App spending
        if (user.totalSpending) {
            total += user.totalSpending * 0.02; // 2% transaction fee
        }
        
        // Rewards claimed (cost to business)
        if (user.claimedRewards && Array.isArray(user.claimedRewards)) {
            // This is a cost, but we count it as revenue driver
            total += user.claimedRewards.length * 5; // Avg value
        }
    });
    
    return Math.round(total);
}

// Calculate NPS (adapted for 5-star rating system)
function calculateNPS() {
    if (npsRatings.length === 0) {
        return { score: 0, rating: 'No data', promoters: 0, passives: 0, detractors: 0, avgStars: 0 };
    }
    
    // For 5-star system:
    // Promoters: 5 stars
    // Passives: 4 stars
    // Detractors: 1-3 stars
    const promoters = npsRatings.filter(r => r.score === 5).length;
    const passives = npsRatings.filter(r => r.score === 4).length;
    const detractors = npsRatings.filter(r => r.score >= 1 && r.score <= 3).length;
    
    const promoterPercent = (promoters / npsRatings.length) * 100;
    const detractorPercent = (detractors / npsRatings.length) * 100;
    const npsScore = Math.round(promoterPercent - detractorPercent);
    
    // Calculate average star rating
    const totalStars = npsRatings.reduce((sum, r) => sum + (r.score || 0), 0);
    const avgStars = (totalStars / npsRatings.length).toFixed(1);
    
    let rating;
    if (npsScore >= 70) rating = 'Excellent';
    else if (npsScore >= 50) rating = 'Great';
    else if (npsScore >= 30) rating = 'Good';
    else if (npsScore >= 0) rating = 'Needs Improvement';
    else rating = 'Poor';
    
    return {
        score: npsScore,
        rating,
        promoters,
        passives,
        detractors,
        avgStars
    };
}

// Render recent activity
function renderRecentActivity() {
    const activityContainer = document.getElementById('recent-activity');
    const activities = [];
    
    // Get recent user signups
    const recentUsers = [...allUsers]
        .sort((a, b) => b.joinedDate - a.joinedDate)
        .slice(0, 3);
    
    recentUsers.forEach(user => {
        activities.push({
            icon: 'blue',
            title: `${user.name || 'New user'} joined`,
            time: getTimeAgo(user.joinedDate),
            type: 'signup'
        });
    });
    
    // Get recent fraud reports
    const recentFraud = [...fraudReports]
        .sort((a, b) => b.reportedAt - a.reportedAt)
        .slice(0, 2);
    
    recentFraud.forEach(report => {
        activities.push({
            icon: 'orange',
            title: `Fraud reported by ${report.userName}`,
            time: getTimeAgo(report.reportedAt),
            type: 'fraud'
        });
    });
    
    // Sort by time
    activities.sort((a, b) => {
        // This is a simplified sort, you'd need to add actual timestamps
        return 0;
    });
    
    if (activities.length === 0) {
        activityContainer.innerHTML = '<p class="empty-state">No recent activity</p>';
        return;
    }
    
    activityContainer.innerHTML = activities.slice(0, 5).map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.icon}">
                <svg fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z"></path>
                </svg>
            </div>
            <div class="activity-content">
                <p class="activity-title">${activity.title}</p>
                <p class="activity-time">${activity.time}</p>
            </div>
        </div>
    `).join('');
}

// Update user stats
function updateUserStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    // Active users (30 days)
    const activeUsers = allUsers.filter(u => u.lastActive && u.lastActive >= thirtyDaysAgo).length;
    document.getElementById('active-users').textContent = activeUsers.toLocaleString();
    
    // New users (7 days)
    const newUsers = allUsers.filter(u => u.joinedDate >= sevenDaysAgo).length;
    document.getElementById('new-users').textContent = newUsers.toLocaleString();
    
    // Conversion rate
    const premiumUsers = allUsers.filter(u => u.isPremium).length;
    const conversionRate = allUsers.length > 0 
        ? ((premiumUsers / allUsers.length) * 100).toFixed(1)
        : 0;
    document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
    
    // Average spending
    const totalSpending = allUsers.reduce((sum, u) => sum + (u.totalSpending || 0), 0);
    const avgSpending = allUsers.length > 0 ? totalSpending / allUsers.length : 0;
    document.getElementById('avg-spending').textContent = `$${avgSpending.toFixed(2)}`;
}

// Update revenue metrics
function updateRevenueMetrics() {
    let appSpending = 0;
    let premiumRevenue = 0;
    let affiliateRevenue = 0;
    let totalTransactions = 0;
    
    allUsers.forEach(user => {
        // App spending
        if (user.totalSpending) {
            appSpending += user.totalSpending;
            totalTransactions += 1;
        }
        
        // Premium revenue
        if (user.isPremium) {
            premiumRevenue += 9.99;
        }
        
        // Affiliate revenue (simulated)
        if (user.claimedRewards && Array.isArray(user.claimedRewards)) {
            const creditCardRewards = user.claimedRewards.filter(r => r.includes('card'));
            affiliateRevenue += creditCardRewards.length * 50; // $50 per card approval
        }
    });
    
    document.getElementById('total-transactions').textContent = totalTransactions.toLocaleString();
    document.getElementById('transactions-change').textContent = '+8.3% from last month';
    document.getElementById('app-spending').textContent = `$${appSpending.toLocaleString()}`;
    document.getElementById('premium-revenue').textContent = `$${premiumRevenue.toLocaleString()}`;
    document.getElementById('affiliate-revenue').textContent = `$${affiliateRevenue.toLocaleString()}`;
    
    // Render revenue sources
    renderRevenueSources(appSpending, premiumRevenue, affiliateRevenue);
    
    // Render top spenders
    renderTopSpenders();
}

// Render revenue sources
function renderRevenueSources(appSpending, premiumRevenue, affiliateRevenue) {
    const total = appSpending + premiumRevenue + affiliateRevenue;
    const sources = [
        { name: 'App Transactions', amount: appSpending, color: '#3b82f6' },
        { name: 'Premium Subscriptions', amount: premiumRevenue, color: '#a855f7' },
        { name: 'Affiliate Commissions', amount: affiliateRevenue, color: '#22c55e' }
    ];
    
    const container = document.getElementById('revenue-sources');
    container.innerHTML = sources.map(source => {
        const percentage = total > 0 ? (source.amount / total * 100).toFixed(1) : 0;
        return `
            <div class="revenue-source-item">
                <div class="source-info">
                    <div class="source-color" style="background-color: ${source.color}"></div>
                    <span class="source-name">${source.name}</span>
                </div>
                <div>
                    <span class="source-amount">$${source.amount.toLocaleString()}</span>
                    <span style="color: var(--slate-500); font-size: 0.875rem; margin-left: 0.5rem;">${percentage}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// Render top spenders
function renderTopSpenders() {
    const topSpenders = [...allUsers]
        .filter(u => u.totalSpending && u.totalSpending > 0)
        .sort((a, b) => (b.totalSpending || 0) - (a.totalSpending || 0))
        .slice(0, 5);
    
    const container = document.getElementById('top-spenders');
    
    if (topSpenders.length === 0) {
        container.innerHTML = '<p class="empty-state">No spending data yet</p>';
        return;
    }
    
    container.innerHTML = topSpenders.map((user, index) => `
        <div class="spender-item">
            <div class="spender-rank">${index + 1}</div>
            <span class="spender-name">${user.name || 'Unknown'}</span>
            <span class="spender-amount">$${(user.totalSpending || 0).toLocaleString()}</span>
        </div>
    `).join('');
}

// Update rewards metrics
function updateRewardsMetrics() {
    // Count users who have accessed rewards
    const rewardsUsers = allUsers.filter(u => u.totalSpending && u.totalSpending > 0).length;
    document.getElementById('rewards-users').textContent = rewardsUsers.toLocaleString();
    
    // Count total rewards claimed
    const totalClaimed = allUsers.reduce((sum, u) => {
        return sum + (u.claimedRewards?.length || 0);
    }, 0);
    document.getElementById('rewards-claimed').textContent = totalClaimed.toLocaleString();
    
    // Most popular reward
    const rewardCounts = {};
    allUsers.forEach(u => {
        if (u.claimedRewards && Array.isArray(u.claimedRewards)) {
            u.claimedRewards.forEach(reward => {
                rewardCounts[reward] = (rewardCounts[reward] || 0) + 1;
            });
        }
    });
    
    const popularReward = Object.keys(rewardCounts).length > 0
        ? Object.keys(rewardCounts).reduce((a, b) => rewardCounts[a] > rewardCounts[b] ? a : b)
        : 'None';
    document.getElementById('popular-reward').textContent = popularReward;
    
    // Average spending for rewards users
    const rewardsUserSpending = allUsers
        .filter(u => u.totalSpending && u.totalSpending > 0)
        .reduce((sum, u) => sum + (u.totalSpending || 0), 0);
    const avgRewardsSpending = rewardsUsers > 0 ? rewardsUserSpending / rewardsUsers : 0;
    document.getElementById('avg-rewards-spending').textContent = `$${avgRewardsSpending.toFixed(2)}`;
    
    // Render tier distribution
    renderTierDistribution();
}

// Render tier distribution
function renderTierDistribution() {
    const tiers = {
        bronze: { min: 0, max: 499, count: 0 },
        silver: { min: 500, max: 1999, count: 0 },
        gold: { min: 2000, max: 4999, count: 0 },
        platinum: { min: 5000, max: Infinity, count: 0 }
    };
    
    allUsers.forEach(user => {
        const spending = user.totalSpending || 0;
        if (spending >= tiers.platinum.min) tiers.platinum.count++;
        else if (spending >= tiers.gold.min) tiers.gold.count++;
        else if (spending >= tiers.silver.min) tiers.silver.count++;
        else tiers.bronze.count++;
    });
    
    const container = document.getElementById('tier-distribution');
    container.innerHTML = Object.keys(tiers).map(tier => `
        <div class="tier-item ${tier}">
            <div class="tier-name">${tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
            <div class="tier-count">${tiers[tier].count}</div>
            <p style="font-size: 0.75rem; color: var(--slate-600); margin-top: 0.5rem;">
                $${tiers[tier].min} - ${tiers[tier].max === Infinity ? '+' : '$' + tiers[tier].max}
            </p>
        </div>
    `).join('');
}

// Update fraud metrics
function updateFraudMetrics() {
    document.getElementById('total-fraud-reports').textContent = fraudReports.length.toLocaleString();
    
    // Count by risk level
    const critical = fraudReports.filter(r => {
        const score = r.loan.fraudScore || 0;
        return score > 50;
    }).length;
    document.getElementById('critical-cases').textContent = critical.toLocaleString();
    
    // Simulated resolved and false positives
    const resolved = Math.floor(fraudReports.length * 0.6);
    const falsePositives = Math.floor(fraudReports.length * 0.1);
    document.getElementById('resolved-cases').textContent = resolved.toLocaleString();
    document.getElementById('false-positives').textContent = falsePositives.toLocaleString();
    
    const change = fraudReports.length > 10 ? '+15% from last month' : 'First reports';
    document.getElementById('fraud-change').textContent = change;
}

// Update NPS display
function updateNPSDisplay() {
    const nps = calculateNPS();
    
    // Update NPS number and gauge
    document.getElementById('nps-number').textContent = nps.score;
    document.getElementById('nps-rating').textContent = `${nps.rating} (${nps.avgStars}⭐)`;
    
    // Update gauge fill (NPS ranges from -100 to +100, we map to 0-251.2 stroke-dashoffset)
    const gaugeOffset = 251.2 - ((nps.score + 100) / 200) * 251.2;
    const gaugeFill = document.getElementById('nps-gauge-fill');
    if (gaugeFill) {
        gaugeFill.style.strokeDashoffset = gaugeOffset;
        
        // Color based on score
        if (nps.score >= 50) gaugeFill.style.stroke = '#22c55e'; // Green
        else if (nps.score >= 30) gaugeFill.style.stroke = '#3b82f6'; // Blue
        else if (nps.score >= 0) gaugeFill.style.stroke = '#f59e0b'; // Orange
        else gaugeFill.style.stroke = '#ef4444'; // Red
    }
    
    // Update rating color
    const ratingEl = document.getElementById('nps-rating');
    if (ratingEl) {
        if (nps.score >= 50) ratingEl.style.color = '#22c55e';
        else if (nps.score >= 30) ratingEl.style.color = '#3b82f6';
        else if (nps.score >= 0) ratingEl.style.color = '#f59e0b';
        else ratingEl.style.color = '#ef4444';
    }
    
    // Update breakdown (for 5-star system)
    const total = npsRatings.length || 1;
    document.getElementById('promoters-count').textContent = `${nps.promoters} (5⭐)`;
    document.getElementById('promoters-percent').textContent = `${((nps.promoters / total) * 100).toFixed(0)}%`;
    
    document.getElementById('passives-count').textContent = `${nps.passives} (4⭐)`;
    document.getElementById('passives-percent').textContent = `${((nps.passives / total) * 100).toFixed(0)}%`;
    
    document.getElementById('detractors-count').textContent = `${nps.detractors} (1-3⭐)`;
    document.getElementById('detractors-percent').textContent = `${((nps.detractors / total) * 100).toFixed(0)}%`;
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    
    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
        return;
    }
    
    const usersToShow = allUsers.slice(0, 50); // Show first 50
    
    tbody.innerHTML = usersToShow.map(user => {
        const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const status = user.isPremium ? 'premium' : 'free';
        const spending = user.totalSpending || 0;
        
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <h4>${user.name || 'Unknown'}</h4>
                        </div>
                    </div>
                </td>
                <td>${user.email || 'No email'}</td>
                <td>${user.creditScore || '---'}</td>
                <td><span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                <td>$${spending.toLocaleString()}</td>
                <td>${user.joinedDate ? user.joinedDate.toLocaleDateString() : '---'}</td>
                <td>
                    <button class="action-btn" onclick="viewUserDetails('${user.id}')">View</button>
                    <button class="action-btn" onclick="openReportTypeModal('${user.id}', '${user.name}', '${user.email}')">Generate Report</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render fraud table
function renderFraudTable() {
    const tbody = document.getElementById('fraud-table-body');
    
    if (fraudReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No fraud reports</td></tr>';
        return;
    }
    
    tbody.innerHTML = fraudReports.map(report => {
        const fraudScore = report.loan.fraudScore || 0;
        let riskLevel = 'low';
        if (fraudScore > 50) riskLevel = 'critical';
        else if (fraudScore > 30) riskLevel = 'high';
        else if (fraudScore > 15) riskLevel = 'medium';
        
        return `
            <tr>
                <td>${report.userName}</td>
                <td>${report.loan.name || 'Unknown'}</td>
                <td><span class="status-badge ${riskLevel}">${riskLevel.toUpperCase()}</span></td>
                <td>${fraudScore}</td>
                <td>${report.reportedAt.toLocaleDateString()}</td>
                <td><span class="status-badge medium">Under Review</span></td>
                <td>
                    <button class="action-btn" onclick="viewFraudDetails('${report.userId}', '${report.loan.id}')">View</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render feedback list
function renderFeedbackList() {
    const container = document.getElementById('feedback-list');
    
    if (npsRatings.length === 0) {
        container.innerHTML = '<p class="empty-state">No feedback yet</p>';
        return;
    }
    
    const recentFeedback = [...npsRatings]
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 20);
    
    container.innerHTML = recentFeedback.map(rating => {
        // For 5-star system: 5=promoter, 4=passive, 1-3=detractor
        let category = 'detractor';
        if (rating.score === 5) category = 'promoter';
        else if (rating.score === 4) category = 'passive';
        
        // Generate star display
        const stars = '⭐'.repeat(rating.score);
        
        return `
            <div class="feedback-item ${category}">
                <div class="feedback-header">
                    <span class="feedback-user">${rating.userEmail || 'Anonymous'}</span>
                    <span class="feedback-score">
                        <span>${stars}</span> ${rating.score}/5
                    </span>
                </div>
                ${rating.message ? `<p class="feedback-comment">"${rating.message}"</p>` : ''}
                <p class="feedback-time">${getTimeAgo(rating.submittedAt)}</p>
            </div>
        `;
    }).join('');
}

// Setup NPS rating buttons (for 5-star system)
function setupNPSRatingButtons() {
    const container = document.getElementById('rating-buttons');
    if (!container) return; // Container might not exist in admin panel
    
    container.innerHTML = '';
    
    // Create 5 star buttons
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'rating-btn';
        btn.innerHTML = '⭐'.repeat(i);
        btn.title = `${i} star${i > 1 ? 's' : ''}`;
        btn.onclick = () => selectNPSRating(i);
        container.appendChild(btn);
    }
}

// Select NPS rating
function selectNPSRating(score) {
    selectedNPSRating = score;
    
    // Update button states
    document.querySelectorAll('.rating-btn').forEach((btn, index) => {
        if (index === score) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    // Show comment section
    document.getElementById('nps-comment-section').style.display = 'block';
}

// Submit NPS feedback
async function submitNPSFeedback() {
    if (selectedNPSRating === null) {
        alert('Please select a rating');
        return;
    }
    
    const comment = document.getElementById('nps-comment').value.trim();
    
    try {
        // Save to Firestore
        const ratingData = {
            score: selectedNPSRating,
            comment: comment || '',
            userId: currentPaymentUser?.uid || 'anonymous',
            userName: currentPaymentUser?.name || 'Anonymous',
            userEmail: currentPaymentUser?.email || '',
            submittedAt: serverTimestamp(),
            source: 'post-payment'
        };
        
        await setDoc(doc(collection(db, 'nps_ratings')), ratingData);
        
        alert('Thank you for your feedback!');
        closeNPSModal();
        
        // Reload NPS data
        await loadNPSRatings();
        updateNPSDisplay();
        renderFeedbackList();
        
    } catch (error) {
        console.error('Error submitting NPS feedback:', error);
        alert('Failed to submit feedback. Please try again.');
    }
}

// Show NPS modal (called after payment)
window.showNPSModal = function(user) {
    currentPaymentUser = user;
    selectedNPSRating = null;
    document.getElementById('nps-comment').value = '';
    document.getElementById('nps-comment-section').style.display = 'none';
    
    // Reset buttons
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('nps-modal').classList.add('active');
};

// Close NPS modal
function closeNPSModal() {
    document.getElementById('nps-modal').classList.remove('active');
    selectedNPSRating = null;
    currentPaymentUser = null;
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${sectionName}`) {
            item.classList.add('active');
        }
    });
}

// View user details
window.viewUserDetails = async function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('user-modal');
    const content = document.getElementById('user-details-content');
    
    content.innerHTML = `
        <h3>${user.name || 'Unknown'}</h3>
        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
        <p><strong>Credit Score:</strong> ${user.creditScore || 'N/A'}</p>
        <p><strong>Status:</strong> ${user.isPremium ? 'Premium' : 'Free'}</p>
        <p><strong>Total Spending:</strong> $${(user.totalSpending || 0).toLocaleString()}</p>
        <p><strong>Joined:</strong> ${user.joinedDate ? user.joinedDate.toLocaleDateString() : 'N/A'}</p>
        <p><strong>Last Active:</strong> ${user.lastActive ? user.lastActive.toLocaleDateString() : 'N/A'}</p>
    `;
    
    modal.classList.add('active');
};

// Close user modal
function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

// View fraud details
window.viewFraudDetails = function(userId, loanId) {
    alert(`Viewing fraud details for loan ${loanId} (User: ${userId})`);
    // Implement detailed fraud view
};

// Filter functions
window.filterUsers = function() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    // Implement search filtering
    console.log('Filtering users:', searchTerm);
};

window.filterFraudReports = function() {
    const filter = document.getElementById('fraud-filter').value;
    console.log('Filtering fraud reports:', filter);
    // Implement fraud filtering
};

window.filterFeedback = function() {
    const filter = document.getElementById('feedback-filter').value;
    console.log('Filtering feedback:', filter);
    // Implement feedback filtering
};

// Export users
window.exportUsers = function() {
    // Create CSV
    const csv = [
        ['Name', 'Email', 'Credit Score', 'Status', 'Spending', 'Joined'].join(','),
        ...allUsers.map(u => [
            u.name || '',
            u.email || '',
            u.creditScore || '',
            u.isPremium ? 'Premium' : 'Free',
            u.totalSpending || 0,
            u.joinedDate ? u.joinedDate.toLocaleDateString() : ''
        ].join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
};

// Refresh data
window.refreshData = async function() {
    await loadAllData();
    alert('Data refreshed successfully!');
};

window.refreshNPS = async function() {
    await loadNPSRatings();
    updateNPSDisplay();
    renderFeedbackList();
    alert('NPS data refreshed!');
};

// Handle date filter
window.handleDateFilter = function() {
    const days = parseInt(document.getElementById('date-filter').value);
    console.log('Filtering by days:', days);
    // Implement date filtering
};

// Logout
window.handleLogout = async function() {
    try {
        await firebaseLogout();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout');
    }
};

// ============================================
// RFM ANALYSIS FUNCTIONS
// ============================================

// Calculate RFM scores for all users
function calculateAndRenderRFM() {
    const now = new Date();
    const rfmUsers = [];
    
    allUsers.forEach(user => {
        // Recency: Days since last activity (lower is better)
        const lastActive = user.lastActive || user.joinedDate || now;
        const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
        
        // Frequency: Number of transactions (higher is better)
        // For now, we'll use a simulated transaction count
        const frequency = user.totalSpending > 0 ? Math.max(1, Math.floor(user.totalSpending / 100)) : 0;
        
        // Monetary: Total spending (higher is better)
        const monetary = user.totalSpending || 0;
        
        rfmUsers.push({
            user,
            recency: daysSinceActive,
            frequency,
            monetary,
            rScore: 0,
            fScore: 0,
            mScore: 0,
            segment: ''
        });
    });
    
    // Calculate quintiles for each metric
    const recencyValues = rfmUsers.map(u => u.recency).sort((a, b) => a - b);
    const frequencyValues = rfmUsers.map(u => u.frequency).sort((a, b) => a - b);
    const monetaryValues = rfmUsers.map(u => u.monetary).sort((a, b) => a - b);
    
    // Assign scores (1-5 scale)
    rfmUsers.forEach(rfmUser => {
        // Recency: Lower is better, so reverse the scoring
        rfmUser.rScore = getQuintileScore(rfmUser.recency, recencyValues, true);
        // Frequency: Higher is better
        rfmUser.fScore = getQuintileScore(rfmUser.frequency, frequencyValues, false);
        // Monetary: Higher is better
        rfmUser.mScore = getQuintileScore(rfmUser.monetary, monetaryValues, false);
        
        // Determine segment
        rfmUser.segment = determineRFMSegment(rfmUser.rScore, rfmUser.fScore, rfmUser.mScore);
    });
    
    // Render RFM data
    renderRFMOverview(rfmUsers);
    renderRFMSegments(rfmUsers);
    renderRFMChart(rfmUsers);
    renderRFMTable(rfmUsers);
    
    // Store globally for filtering
    window.allRFMUsers = rfmUsers;
}

// Get quintile score (1-5)
function getQuintileScore(value, sortedValues, reverse = false) {
    if (sortedValues.length === 0) return 3;
    
    const quintileSize = Math.ceil(sortedValues.length / 5);
    const index = sortedValues.indexOf(value);
    
    if (index === -1) return 3;
    
    let score = Math.floor(index / quintileSize) + 1;
    score = Math.min(5, score);
    
    // Reverse scoring for recency (lower days = higher score)
    if (reverse) {
        score = 6 - score;
    }
    
    return score;
}

// Determine RFM segment based on scores
function determineRFMSegment(r, f, m) {
    const avgScore = (r + f + m) / 3;
    
    // Champions: Best customers (RFM: 5-5-5, 5-5-4, 5-4-5)
    if (r >= 4 && f >= 4 && m >= 4) {
        return 'champions';
    }
    // Loyal Customers: Spend good money, often (RFM: 4-4-4, 4-5-4, 5-4-4)
    else if (r >= 3 && f >= 4 && m >= 3) {
        return 'loyal';
    }
    // Potential Loyalists: Recent customers, good frequency
    else if (r >= 4 && f >= 3 && m >= 2) {
        return 'potential';
    }
    // Promising: Recent shoppers with average spending
    else if (r >= 4 && f <= 2) {
        return 'promising';
    }
    // Need Attention: Above average recency, frequency & monetary
    else if (r >= 3 && f >= 2 && m >= 2) {
        return 'need-attention';
    }
    // About To Sleep: Below average recency & frequency
    else if (r >= 2 && r <= 3 && f <= 2) {
        return 'about-to-sleep';
    }
    // At Risk: Spent big money, haven't returned for long time
    else if (r <= 2 && f >= 3 && m >= 3) {
        return 'at-risk';
    }
    // Can't Lose Them: Made big purchases, long time ago
    else if (r <= 2 && f >= 4 && m >= 4) {
        return 'cant-lose';
    }
    // Hibernating: Last purchase long back, low spenders
    else if (r <= 2 && f <= 2 && m >= 2) {
        return 'hibernating';
    }
    // Lost: Lowest recency, frequency & monetary scores
    else {
        return 'lost';
    }
}

// Render RFM overview cards
function renderRFMOverview(rfmUsers) {
    // Average Recency
    const avgRecency = rfmUsers.length > 0
        ? Math.round(rfmUsers.reduce((sum, u) => sum + u.recency, 0) / rfmUsers.length)
        : 0;
    document.getElementById('avg-recency').textContent = `${avgRecency} days`;
    
    // Average Frequency
    const avgFrequency = rfmUsers.length > 0
        ? (rfmUsers.reduce((sum, u) => sum + u.frequency, 0) / rfmUsers.length).toFixed(1)
        : 0;
    document.getElementById('avg-frequency').textContent = avgFrequency;
    
    // Average Monetary
    const avgMonetary = rfmUsers.length > 0
        ? Math.round(rfmUsers.reduce((sum, u) => sum + u.monetary, 0) / rfmUsers.length)
        : 0;
    document.getElementById('avg-monetary').textContent = `$${avgMonetary.toLocaleString()}`;
    
    // Champions count
    const championsCount = rfmUsers.filter(u => u.segment === 'champions').length;
    document.getElementById('champions-count').textContent = championsCount;
}

// Render RFM segments grid
function renderRFMSegments(rfmUsers) {
    const segments = {
        champions: { name: 'Champions', color: '#22c55e', icon: '👑', count: 0 },
        loyal: { name: 'Loyal Customers', color: '#3b82f6', icon: '💙', count: 0 },
        potential: { name: 'Potential Loyalists', color: '#8b5cf6', icon: '🌟', count: 0 },
        promising: { name: 'Promising', color: '#06b6d4', icon: '✨', count: 0 },
        'need-attention': { name: 'Need Attention', color: '#f59e0b', icon: '⚠️', count: 0 },
        'about-to-sleep': { name: 'About To Sleep', color: '#f97316', icon: '😴', count: 0 },
        'at-risk': { name: 'At Risk', color: '#ef4444', icon: '🚨', count: 0 },
        'cant-lose': { name: "Can't Lose Them", color: '#dc2626', icon: '💎', count: 0 },
        hibernating: { name: 'Hibernating', color: '#64748b', icon: '💤', count: 0 },
        lost: { name: 'Lost', color: '#475569', icon: '👻', count: 0 }
    };
    
    // Count users in each segment
    rfmUsers.forEach(u => {
        if (segments[u.segment]) {
            segments[u.segment].count++;
        }
    });
    
    const container = document.getElementById('rfm-segments');
    container.innerHTML = Object.keys(segments).map(key => {
        const seg = segments[key];
        const percentage = rfmUsers.length > 0 
            ? ((seg.count / rfmUsers.length) * 100).toFixed(1) 
            : 0;
        
        return `
            <div class="rfm-segment-card" style="border-left: 4px solid ${seg.color}">
                <div class="segment-icon">${seg.icon}</div>
                <div class="segment-info">
                    <h4 class="segment-name">${seg.name}</h4>
                    <div class="segment-stats">
                        <span class="segment-count">${seg.count}</span>
                        <span class="segment-percent">(${percentage}%)</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render RFM chart (simple bar chart)
function renderRFMChart(rfmUsers) {
    const container = document.getElementById('rfm-chart');
    container.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 600;
    canvas.height = 300;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Count by segment
    const segmentCounts = {
        'Champions': 0,
        'Loyal': 0,
        'Potential': 0,
        'Promising': 0,
        'Need Attention': 0,
        'At Risk': 0,
        'Others': 0
    };
    
    rfmUsers.forEach(u => {
        if (u.segment === 'champions') segmentCounts['Champions']++;
        else if (u.segment === 'loyal') segmentCounts['Loyal']++;
        else if (u.segment === 'potential') segmentCounts['Potential']++;
        else if (u.segment === 'promising') segmentCounts['Promising']++;
        else if (u.segment === 'need-attention') segmentCounts['Need Attention']++;
        else if (u.segment === 'at-risk' || u.segment === 'cant-lose') segmentCounts['At Risk']++;
        else segmentCounts['Others']++;
    });
    
    const labels = Object.keys(segmentCounts);
    const counts = Object.values(segmentCounts);
    const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#64748b'];
    
    // Chart dimensions
    const padding = { top: 30, right: 30, bottom: 60, left: 50 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Find max value
    const maxCount = Math.max(...counts, 1);
    const yScale = chartHeight / (maxCount * 1.2);
    const barWidth = chartWidth / labels.length * 0.7;
    const barSpacing = chartWidth / labels.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    counts.forEach((count, index) => {
        const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2;
        const barHeight = count * yScale;
        const y = canvas.height - padding.bottom - barHeight;
        
        // Bar
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Value on top
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(count, x + barWidth / 2, y - 5);
    });
    
    // Draw labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    labels.forEach((label, index) => {
        const x = padding.left + index * barSpacing + barSpacing / 2;
        const y = canvas.height - padding.bottom + 15;
        
        // Rotate labels for better fit
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });
    
    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Customer Segments Distribution', padding.left, 20);
}

// Render RFM users table
function renderRFMTable(rfmUsers) {
    const tbody = document.getElementById('rfm-table-body');
    
    if (rfmUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No RFM data available</td></tr>';
        return;
    }
    
    // Sort by overall RFM score (descending)
    const sortedUsers = [...rfmUsers].sort((a, b) => {
        const scoreA = a.rScore + a.fScore + a.mScore;
        const scoreB = b.rScore + b.fScore + b.mScore;
        return scoreB - scoreA;
    });
    
    const usersToShow = sortedUsers.slice(0, 50);
    
    tbody.innerHTML = usersToShow.map(rfmUser => {
        const user = rfmUser.user;
        const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        // Segment badge color
        let segmentClass = 'medium';
        if (rfmUser.segment === 'champions' || rfmUser.segment === 'loyal') segmentClass = 'premium';
        else if (rfmUser.segment === 'at-risk' || rfmUser.segment === 'cant-lose' || rfmUser.segment === 'lost') segmentClass = 'critical';
        
        const segmentName = rfmUser.segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <h4>${user.name || 'Unknown'}</h4>
                            <p>${user.email || 'No email'}</p>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${segmentClass}">${segmentName}</span></td>
                <td><span class="rfm-score">${rfmUser.rScore}</span></td>
                <td><span class="rfm-score">${rfmUser.fScore}</span></td>
                <td><span class="rfm-score">${rfmUser.mScore}</span></td>
                <td>${rfmUser.recency} days ago</td>
                <td>$${rfmUser.monetary.toLocaleString()}</td>
                <td>
                    <button class="action-btn" onclick="viewUserDetails('${user.id}')">View</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter RFM users by segment
window.filterRFMUsers = function() {
    const filter = document.getElementById('rfm-segment-filter').value;
    
    if (!window.allRFMUsers) return;
    
    let filteredUsers = window.allRFMUsers;
    
    if (filter !== 'all') {
        filteredUsers = window.allRFMUsers.filter(u => u.segment === filter);
    }
    
    renderRFMTable(filteredUsers);
};

// Export RFM data to CSV
window.exportRFMData = function() {
    if (!window.allRFMUsers || window.allRFMUsers.length === 0) {
        alert('No RFM data to export');
        return;
    }
    
    const csv = [
        ['Name', 'Email', 'Segment', 'R Score', 'F Score', 'M Score', 'Recency (days)', 'Frequency', 'Monetary', 'Total RFM Score'].join(','),
        ...window.allRFMUsers.map(u => [
            u.user.name || '',
            u.user.email || '',
            u.segment,
            u.rScore,
            u.fScore,
            u.mScore,
            u.recency,
            u.frequency,
            u.monetary,
            u.rScore + u.fScore + u.mScore
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rfm_analysis.csv';
    a.click();
};

// ============================================
// CLV (CUSTOMER LIFETIME VALUE) ANALYSIS
// ============================================

// Calculate CLV for all users
function calculateAndRenderCLV() {
    const now = new Date();
    const clvUsers = [];
    
    allUsers.forEach(user => {
        // Calculate customer lifespan in months
        const joinedDate = user.joinedDate || now;
        const monthsSinceJoined = Math.max(1, Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24 * 30)));
        
        // Total spending
        const totalSpending = user.totalSpending || 0;
        
        // Calculate purchase frequency (transactions per month)
        // For demo: assume 1 transaction per $100 spent
        const totalTransactions = Math.max(1, Math.floor(totalSpending / 100));
        const purchaseFrequency = totalTransactions / monthsSinceJoined;
        
        // Average Order Value (AOV)
        const aov = totalTransactions > 0 ? totalSpending / totalTransactions : 0;
        
        // Customer Value (per month) = AOV × Purchase Frequency
        const customerValue = aov * purchaseFrequency;
        
        // Predicted Customer Lifespan (in months)
        // For active users: 24 months, for less active: based on recency
        const daysSinceActive = Math.floor((now - (user.lastActive || joinedDate)) / (1000 * 60 * 60 * 24));
        let predictedLifespan = 24; // Default 2 years
        
        if (daysSinceActive > 90) predictedLifespan = 12; // 1 year if inactive
        else if (daysSinceActive > 60) predictedLifespan = 18; // 1.5 years
        else if (totalSpending > 1000) predictedLifespan = 36; // 3 years for high spenders
        
        // Profit Margin (assume 20%)
        const profitMargin = 0.20;
        
        // CLV Formula: Customer Value × Customer Lifespan × Profit Margin
        const clv = customerValue * predictedLifespan * profitMargin;
        
        // Determine tier
        let tier = 'starter';
        if (clv >= 2000) tier = 'platinum';
        else if (clv >= 1000) tier = 'gold';
        else if (clv >= 500) tier = 'silver';
        else if (clv >= 100) tier = 'bronze';
        
        clvUsers.push({
            user,
            clv: Math.round(clv),
            aov: Math.round(aov),
            purchaseFrequency: purchaseFrequency.toFixed(2),
            customerValue: Math.round(customerValue),
            predictedLifespan,
            totalSpending,
            monthsSinceJoined,
            tier
        });
    });
    
    // Render CLV data
    renderCLVOverview(clvUsers);
    renderCLVMetrics(clvUsers);
    renderCLVChart(clvUsers);
    renderCLVTiers(clvUsers);
    renderCLVTable(clvUsers);
    
    // Store globally for filtering
    window.allCLVUsers = clvUsers;
}

// Render CLV overview cards
function renderCLVOverview(clvUsers) {
    // Average CLV
    const avgCLV = clvUsers.length > 0
        ? Math.round(clvUsers.reduce((sum, u) => sum + u.clv, 0) / clvUsers.length)
        : 0;
    document.getElementById('avg-clv').textContent = `$${avgCLV.toLocaleString()}`;
    
    // Total CLV
    const totalCLV = clvUsers.reduce((sum, u) => sum + u.clv, 0);
    document.getElementById('total-clv').textContent = `$${Math.round(totalCLV).toLocaleString()}`;
    
    // High-value customers (CLV > $1000)
    const highValueCount = clvUsers.filter(u => u.clv > 1000).length;
    document.getElementById('high-value-count').textContent = highValueCount;
    
    // Average lifespan
    const avgLifespan = clvUsers.length > 0
        ? (clvUsers.reduce((sum, u) => sum + u.predictedLifespan, 0) / clvUsers.length).toFixed(1)
        : 0;
    document.getElementById('avg-lifespan').textContent = `${avgLifespan} months`;
}

// Render CLV metrics breakdown
function renderCLVMetrics(clvUsers) {
    if (clvUsers.length === 0) return;
    
    // Average Order Value
    const avgAOV = Math.round(clvUsers.reduce((sum, u) => sum + u.aov, 0) / clvUsers.length);
    document.getElementById('aov-value').textContent = `$${avgAOV.toLocaleString()}`;
    
    // Purchase Frequency
    const avgFrequency = (clvUsers.reduce((sum, u) => sum + parseFloat(u.purchaseFrequency), 0) / clvUsers.length).toFixed(2);
    document.getElementById('purchase-frequency').textContent = `${avgFrequency}/month`;
    
    // Customer Lifespan
    const avgLifespan = (clvUsers.reduce((sum, u) => sum + u.predictedLifespan, 0) / clvUsers.length).toFixed(1);
    document.getElementById('customer-lifespan').textContent = `${avgLifespan} months`;
    
    // Customer Value
    const avgCustomerValue = Math.round(clvUsers.reduce((sum, u) => sum + u.customerValue, 0) / clvUsers.length);
    document.getElementById('customer-value').textContent = `$${avgCustomerValue.toLocaleString()}/month`;
    
    // Retention Rate (simplified: active users / total users)
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = allUsers.filter(u => u.lastActive && u.lastActive >= thirtyDaysAgo).length;
    const retentionRate = allUsers.length > 0 ? ((activeUsers / allUsers.length) * 100).toFixed(1) : 0;
    document.getElementById('retention-rate').textContent = `${retentionRate}%`;
    
    // Profit Margin (fixed at 20% for demo)
    document.getElementById('profit-margin').textContent = '20%';
}

// Render CLV distribution chart
function renderCLVChart(clvUsers) {
    const container = document.getElementById('clv-chart');
    container.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 600;
    canvas.height = 300;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // CLV ranges
    const ranges = {
        'Platinum\n$2000+': 0,
        'Gold\n$1000-2000': 0,
        'Silver\n$500-1000': 0,
        'Bronze\n$100-500': 0,
        'Starter\n<$100': 0
    };
    
    clvUsers.forEach(u => {
        if (u.clv >= 2000) ranges['Platinum\n$2000+']++;
        else if (u.clv >= 1000) ranges['Gold\n$1000-2000']++;
        else if (u.clv >= 500) ranges['Silver\n$500-1000']++;
        else if (u.clv >= 100) ranges['Bronze\n$100-500']++;
        else ranges['Starter\n<$100']++;
    });
    
    const labels = Object.keys(ranges);
    const counts = Object.values(ranges);
    const colors = ['#a855f7', '#eab308', '#64748b', '#cd7f32', '#94a3b8'];
    
    // Chart dimensions
    const padding = { top: 30, right: 30, bottom: 70, left: 50 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Find max value
    const maxCount = Math.max(...counts, 1);
    const yScale = chartHeight / (maxCount * 1.2);
    const barWidth = chartWidth / labels.length * 0.7;
    const barSpacing = chartWidth / labels.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    counts.forEach((count, index) => {
        const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2;
        const barHeight = count * yScale;
        const y = canvas.height - padding.bottom - barHeight;
        
        // Create gradient for bars
        const barGradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding.bottom);
        barGradient.addColorStop(0, colors[index]);
        barGradient.addColorStop(1, colors[index] + 'aa');
        
        // Bar
        ctx.fillStyle = barGradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Value on top
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(count, x + barWidth / 2, y - 5);
    });
    
    // Draw labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    labels.forEach((label, index) => {
        const x = padding.left + index * barSpacing + barSpacing / 2;
        const y = canvas.height - padding.bottom + 15;
        
        // Split label by newline
        const lines = label.split('\n');
        lines.forEach((line, lineIndex) => {
            ctx.fillText(line, x, y + lineIndex * 12);
        });
    });
    
    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CLV Distribution by Tier', padding.left, 20);
}

// Render CLV tiers
function renderCLVTiers(clvUsers) {
    const tiers = {
        platinum: { name: 'Platinum', color: '#a855f7', icon: '💎', range: '$2000+', count: 0, totalValue: 0 },
        gold: { name: 'Gold', color: '#eab308', icon: '🥇', range: '$1000-$2000', count: 0, totalValue: 0 },
        silver: { name: 'Silver', color: '#64748b', icon: '🥈', range: '$500-$1000', count: 0, totalValue: 0 },
        bronze: { name: 'Bronze', color: '#cd7f32', icon: '🥉', range: '$100-$500', count: 0, totalValue: 0 },
        starter: { name: 'Starter', color: '#94a3b8', icon: '🌱', range: '<$100', count: 0, totalValue: 0 }
    };
    
    // Count and sum CLV for each tier
    clvUsers.forEach(u => {
        if (tiers[u.tier]) {
            tiers[u.tier].count++;
            tiers[u.tier].totalValue += u.clv;
        }
    });
    
    const container = document.getElementById('clv-tiers');
    container.innerHTML = Object.keys(tiers).map(key => {
        const tier = tiers[key];
        const percentage = clvUsers.length > 0 
            ? ((tier.count / clvUsers.length) * 100).toFixed(1) 
            : 0;
        const avgCLV = tier.count > 0 ? Math.round(tier.totalValue / tier.count) : 0;
        
        return `
            <div class="clv-tier-card" style="border-left: 4px solid ${tier.color}">
                <div class="tier-icon-large">${tier.icon}</div>
                <div class="tier-info-large">
                    <h4 class="tier-name-large">${tier.name}</h4>
                    <p class="tier-range">${tier.range}</p>
                    <div class="tier-stats-large">
                        <div class="tier-stat">
                            <span class="stat-label-sm">Customers</span>
                            <span class="stat-value-sm">${tier.count} (${percentage}%)</span>
                        </div>
                        <div class="tier-stat">
                            <span class="stat-label-sm">Avg CLV</span>
                            <span class="stat-value-sm">$${avgCLV.toLocaleString()}</span>
                        </div>
                        <div class="tier-stat">
                            <span class="stat-label-sm">Total Value</span>
                            <span class="stat-value-sm">$${Math.round(tier.totalValue).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render CLV users table
function renderCLVTable(clvUsers) {
    const tbody = document.getElementById('clv-table-body');
    
    if (clvUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No CLV data available</td></tr>';
        return;
    }
    
    // Sort by CLV (descending)
    const sortedUsers = [...clvUsers].sort((a, b) => b.clv - a.clv);
    const usersToShow = sortedUsers.slice(0, 50);
    
    tbody.innerHTML = usersToShow.map(clvUser => {
        const user = clvUser.user;
        const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        // Tier badge color
        let tierClass = 'medium';
        if (clvUser.tier === 'platinum') tierClass = 'premium';
        else if (clvUser.tier === 'gold') tierClass = 'high';
        else if (clvUser.tier === 'starter') tierClass = 'low';
        
        const tierName = clvUser.tier.charAt(0).toUpperCase() + clvUser.tier.slice(1);
        
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <h4>${user.name || 'Unknown'}</h4>
                            <p>${user.email || 'No email'}</p>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${tierClass}">${tierName}</span></td>
                <td><strong>$${clvUser.clv.toLocaleString()}</strong></td>
                <td>$${clvUser.aov.toLocaleString()}</td>
                <td>${clvUser.purchaseFrequency}/mo</td>
                <td>${clvUser.predictedLifespan} months</td>
                <td>$${clvUser.totalSpending.toLocaleString()}</td>
                <td>
                    <button class="action-btn" onclick="viewUserDetails('${user.id}')">View</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter CLV users by tier
window.filterCLVUsers = function() {
    const filter = document.getElementById('clv-tier-filter').value;
    
    if (!window.allCLVUsers) return;
    
    let filteredUsers = window.allCLVUsers;
    
    if (filter !== 'all') {
        filteredUsers = window.allCLVUsers.filter(u => u.tier === filter);
    }
    
    renderCLVTable(filteredUsers);
};

// Export CLV data to CSV
window.exportCLVData = function() {
    if (!window.allCLVUsers || window.allCLVUsers.length === 0) {
        alert('No CLV data to export');
        return;
    }
    
    const csv = [
        ['Name', 'Email', 'Tier', 'Predicted CLV', 'AOV', 'Purchase Frequency', 'Customer Value', 'Lifespan (months)', 'Total Spending'].join(','),
        ...window.allCLVUsers.map(u => [
            u.user.name || '',
            u.user.email || '',
            u.tier,
            u.clv,
            u.aov,
            u.purchaseFrequency,
            u.customerValue,
            u.predictedLifespan,
            u.totalSpending
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clv_analysis.csv';
    a.click();
};

// ============================================
// CHART RENDERING FUNCTIONS
// ============================================

// Render Revenue Chart
function renderRevenueChart() {
    const container = document.getElementById('revenue-chart');
    container.innerHTML = ''; // Clear existing content
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 600;
    canvas.height = 300;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Generate revenue data for last 6 months
    const months = [];
    const revenueData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date.toLocaleDateString('en-US', { month: 'short' }));
        
        // Calculate revenue for this month (simulated with growth)
        const baseRevenue = 5000;
        const growth = (5 - i) * 1500;
        const variance = Math.random() * 2000;
        revenueData.push(Math.round(baseRevenue + growth + variance));
    }
    
    // Chart dimensions
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Find max value for scaling
    const maxRevenue = Math.max(...revenueData);
    const yScale = chartHeight / (maxRevenue * 1.2); // 1.2 for some top padding
    const xScale = chartWidth / (months.length - 1);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxRevenue * 1.2 * (1 - i / 5);
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('$' + Math.round(value / 1000) + 'k', padding.left - 10, y + 4);
    }
    
    // Draw gradient fill area
    const gradient = ctx.createLinearGradient(0, padding.top, 0, canvas.height - padding.bottom);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, canvas.height - padding.bottom);
    
    revenueData.forEach((value, index) => {
        const x = padding.left + index * xScale;
        const y = canvas.height - padding.bottom - (value * yScale);
        if (index === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
    ctx.closePath();
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    revenueData.forEach((value, index) => {
        const x = padding.left + index * xScale;
        const y = canvas.height - padding.bottom - (value * yScale);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw data points
    revenueData.forEach((value, index) => {
        const x = padding.left + index * xScale;
        const y = canvas.height - padding.bottom - (value * yScale);
        
        // Outer circle
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw X-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    months.forEach((month, index) => {
        const x = padding.left + index * xScale;
        const y = canvas.height - padding.bottom + 20;
        ctx.fillText(month, x, y);
    });
    
    // Draw title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Monthly Revenue Trend', padding.left, 20);
}

// Render User Growth Chart
function renderUserGrowthChart() {
    const container = document.getElementById('user-chart');
    container.innerHTML = ''; // Clear existing content
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 600;
    canvas.height = 300;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Generate user data for last 6 months
    const months = [];
    const userCounts = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date.toLocaleDateString('en-US', { month: 'short' }));
        
        // Calculate users for this month based on actual data
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const usersInMonth = allUsers.filter(u => {
            return u.joinedDate >= monthStart && u.joinedDate <= monthEnd;
        }).length;
        
        // Cumulative count
        const cumulativeUsers = allUsers.filter(u => u.joinedDate <= monthEnd).length;
        userCounts.push(cumulativeUsers);
    }
    
    // Chart dimensions
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Find max value for scaling
    const maxUsers = Math.max(...userCounts, 10); // Minimum 10 for scale
    const yScale = chartHeight / (maxUsers * 1.2);
    const xScale = chartWidth / (months.length - 1);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxUsers * 1.2 * (1 - i / 5);
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(value), padding.left - 10, y + 4);
    }
    
    // Draw bars
    const barWidth = (chartWidth / months.length) * 0.6;
    
    userCounts.forEach((count, index) => {
        const x = padding.left + index * xScale - barWidth / 2;
        const barHeight = count * yScale;
        const y = canvas.height - padding.bottom - barHeight;
        
        // Create gradient for bars
        const barGradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding.bottom);
        barGradient.addColorStop(0, '#3b82f6');
        barGradient.addColorStop(1, '#60a5fa');
        
        // Draw bar with rounded corners
        ctx.fillStyle = barGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [8, 8, 0, 0]);
        ctx.fill();
        
        // Draw value on top of bar
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(count, x + barWidth / 2, y - 10);
    });
    
    // Draw X-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    months.forEach((month, index) => {
        const x = padding.left + index * xScale;
        const y = canvas.height - padding.bottom + 20;
        ctx.fillText(month, x, y);
    });
    
    // Draw title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('User Growth (Cumulative)', padding.left, 20);
}

// Polyfill for roundRect (for older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'number') {
            radius = [radius, radius, radius, radius];
        }
        const [tl, tr, br, bl] = radius;
        
        this.moveTo(x + tl, y);
        this.lineTo(x + width - tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + tr);
        this.lineTo(x + width, y + height - br);
        this.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
        this.lineTo(x + bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
    };
}

// Helper function: get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
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
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

// Make functions globally available
window.showSection = showSection;
window.closeNPSModal = closeNPSModal;
window.closeUserModal = closeUserModal;
window.submitNPSFeedback = submitNPSFeedback;

// =============================================================================
// REPORT GENERATION SYSTEM
// =============================================================================

let currentReportUser = null;

// Open report type selection modal
window.openReportTypeModal = function(userId, userName, userEmail) {
    currentReportUser = {
        id: userId,
        name: userName,
        email: userEmail,
        data: allUsers.find(u => u.id === userId)
    };
    
    document.getElementById('report-type-modal').classList.add('active');
};

// Close report type modal
window.closeReportTypeModal = function() {
    document.getElementById('report-type-modal').classList.remove('active');
    currentReportUser = null;
};

// Close generated report modal
window.closeGeneratedReportModal = function() {
    document.getElementById('generated-report-modal').classList.remove('active');
};

// Generate user report based on type
window.generateUserReport = function(reportType) {
    if (!currentReportUser) return;
    
    closeReportTypeModal();
    
    const user = currentReportUser.data;
    const reportTitle = document.getElementById('report-title');
    const reportContent = document.getElementById('report-content');
    
    // Set report title
    const reportTypeNames = {
        basic: 'Basic Report',
        premium: 'Premium Report',
        enterprise: 'Enterprise Report'
    };
    reportTitle.textContent = `${reportTypeNames[reportType]} - ${currentReportUser.name}`;
    
    // Generate report content based on type
    let content = '';
    
    if (reportType === 'basic') {
        content = generateBasicReport(user);
    } else if (reportType === 'premium') {
        content = generatePremiumReport(user);
    } else if (reportType === 'enterprise') {
        content = generateEnterpriseReport(user);
    }
    
    reportContent.innerHTML = content;
    
    // Show report modal
    document.getElementById('generated-report-modal').classList.add('active');
};

// Generate Basic Report
function generateBasicReport(user) {
    const spending = user.totalSpending || 0;
    const avgMonthlySpending = spending / 12;
    const status = user.isPremium ? 'Premium' : 'Free';
    
    return `
        <div class="report-section">
            <div class="report-user-header">
                <div class="report-user-avatar">${(user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
                <div>
                    <h3>${user.name || 'Unknown User'}</h3>
                    <p>${user.email || 'No email'}</p>
                </div>
            </div>
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Account Overview</h3>
            <div class="report-grid">
                <div class="report-stat">
                    <span class="report-stat-label">Account Status</span>
                    <span class="report-stat-value">${status}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Credit Score</span>
                    <span class="report-stat-value">${user.creditScore || 'Not Set'}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Member Since</span>
                    <span class="report-stat-value">${user.joinedDate ? user.joinedDate.toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Credit Level</span>
                    <span class="report-stat-value">${user.creditLevel?.label || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Spending Summary</h3>
            <div class="report-grid">
                <div class="report-stat">
                    <span class="report-stat-label">Total Spending</span>
                    <span class="report-stat-value">$${spending.toLocaleString()}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Avg Monthly</span>
                    <span class="report-stat-value">$${avgMonthlySpending.toFixed(2)}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Active Loans</span>
                    <span class="report-stat-value">${user.loans?.length || 0}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Credit Cards</span>
                    <span class="report-stat-value">${user.creditCards?.length || 0}</span>
                </div>
            </div>
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Activity Insights</h3>
            <div class="report-insight">
                <svg class="insight-icon" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path>
                </svg>
                <div>
                    <p class="insight-title">User is ${status === 'Premium' ? 'a premium subscriber' : 'on the free tier'}</p>
                    <p class="insight-description">Account created ${getTimeAgo(user.joinedDate || new Date())}</p>
                </div>
            </div>
        </div>
    `;
}

// Generate Premium Report (with RFM and CLV)
function generatePremiumReport(user) {
    const spending = user.totalSpending || 0;
    const transactions = user.transactions || [];
    
    // Calculate RFM metrics
    const rfmData = calculateUserRFM(user);
    const clvData = calculateUserCLV(user);
    
    return `
        ${generateBasicReport(user)}

        <div class="report-section">
            <h3 class="report-section-title">RFM Analysis</h3>
            <div class="report-grid">
                <div class="report-stat">
                    <span class="report-stat-label">Recency Score</span>
                    <span class="report-stat-value rfm-score">${rfmData.recency}/5</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Frequency Score</span>
                    <span class="report-stat-value rfm-score">${rfmData.frequency}/5</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Monetary Score</span>
                    <span class="report-stat-value rfm-score">${rfmData.monetary}/5</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Customer Segment</span>
                    <span class="report-stat-value">${rfmData.segment}</span>
                </div>
            </div>
            <div class="report-insight">
                <svg class="insight-icon premium" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31l-56,56V200H224A8,8,0,0,1,232,208Z"></path>
                </svg>
                <div>
                    <p class="insight-title">RFM Segment: ${rfmData.segment}</p>
                    <p class="insight-description">${getRFMSegmentDescription(rfmData.segment)}</p>
                </div>
            </div>
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Customer Lifetime Value (CLV)</h3>
            <div class="report-grid">
                <div class="report-stat">
                    <span class="report-stat-label">Predicted CLV</span>
                    <span class="report-stat-value">$${clvData.predictedCLV.toLocaleString()}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Value Tier</span>
                    <span class="report-stat-value">${clvData.tier}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Avg Order Value</span>
                    <span class="report-stat-value">$${clvData.avgOrderValue.toFixed(2)}</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-label">Purchase Frequency</span>
                    <span class="report-stat-value">${clvData.frequency.toFixed(1)}x/year</span>
                </div>
            </div>
            <div class="report-insight">
                <svg class="insight-icon premium" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M184,89.57V84c0-25.08-37.83-44-88-44S8,58.92,8,84v40c0,20.89,26.25,37.49,64,42.46V172c0,25.08,37.83,44,88,44s88-18.92,88-44V132C248,111.3,222.58,94.68,184,89.57Z"></path>
                </svg>
                <div>
                    <p class="insight-title">CLV Tier: ${clvData.tier}</p>
                    <p class="insight-description">${getCLVTierDescription(clvData.tier)}</p>
                </div>
            </div>
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Transaction History</h3>
            <div class="report-table-wrapper">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.slice(0, 5).map(t => `
                            <tr>
                                <td>${t.date?.toLocaleDateString() || 'N/A'}</td>
                                <td>${t.type || 'Purchase'}</td>
                                <td>$${t.amount?.toLocaleString() || '0'}</td>
                                <td>${t.description || 'No description'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" style="text-align: center;">No transactions found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Generate Enterprise Report (Full suite with recommendations)
function generateEnterpriseReport(user) {
    const rfmData = calculateUserRFM(user);
    const clvData = calculateUserCLV(user);
    const recommendations = generatePersonalizedRecommendations(user, rfmData, clvData);
    
    return `
        ${generatePremiumReport(user)}

        <div class="report-section highlight">
            <h3 class="report-section-title">Personalized Recommendations</h3>
            ${recommendations.map(rec => `
                <div class="report-recommendation">
                    <div class="rec-header">
                        <svg class="rec-icon ${rec.priority}" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm40-68a28,28,0,0,1-28,28h-4v8a8,8,0,0,1-16,0v-8H104a8,8,0,0,1,0-16h36a12,12,0,0,0,0-24H116a28,28,0,0,1,0-56h4V72a8,8,0,0,1,16,0v8h16a8,8,0,0,1,0,16H116a12,12,0,0,0,0,24h24A28,28,0,0,1,168,148Z"></path>
                        </svg>
                        <div>
                            <h4>${rec.title}</h4>
                            <span class="priority-badge ${rec.priority}">${rec.priority.toUpperCase()}</span>
                        </div>
                    </div>
                    <p class="rec-description">${rec.description}</p>
                    <div class="rec-actions">
                        <strong>Recommended Actions:</strong>
                        <ul>
                            ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="rec-impact">
                        <strong>Expected Impact:</strong> ${rec.impact}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Risk Assessment</h3>
            ${generateRiskAssessment(user)}
        </div>

        <div class="report-section">
            <h3 class="report-section-title">Growth Opportunities</h3>
            ${generateGrowthOpportunities(user, rfmData, clvData)}
        </div>
    `;
}

// Calculate RFM for a user
function calculateUserRFM(user) {
    const now = new Date();
    const joinedDate = user.joinedDate || new Date();
    const daysSinceJoined = Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24));
    
    // Recency: How recently did they transact (1-5, 5 being most recent)
    const recency = daysSinceJoined < 30 ? 5 : daysSinceJoined < 60 ? 4 : daysSinceJoined < 90 ? 3 : daysSinceJoined < 180 ? 2 : 1;
    
    // Frequency: How often do they transact (based on transactions)
    const transactionCount = user.transactions?.length || 0;
    const frequency = transactionCount > 20 ? 5 : transactionCount > 15 ? 4 : transactionCount > 10 ? 3 : transactionCount > 5 ? 2 : 1;
    
    // Monetary: How much do they spend
    const spending = user.totalSpending || 0;
    const monetary = spending > 10000 ? 5 : spending > 5000 ? 4 : spending > 2000 ? 3 : spending > 500 ? 2 : 1;
    
    // Determine segment
    const avgScore = (recency + frequency + monetary) / 3;
    let segment = 'Need Attention';
    
    if (avgScore >= 4.5) segment = 'Champions';
    else if (avgScore >= 4) segment = 'Loyal Customers';
    else if (avgScore >= 3.5) segment = 'Potential Loyalists';
    else if (avgScore >= 3) segment = 'Promising';
    else if (avgScore >= 2.5) segment = 'Need Attention';
    else if (avgScore >= 2) segment = 'At Risk';
    else segment = 'Lost';
    
    return { recency, frequency, monetary, segment };
}

// Calculate CLV for a user
function calculateUserCLV(user) {
    const spending = user.totalSpending || 0;
    const transactionCount = user.transactions?.length || 1;
    const avgOrderValue = spending / transactionCount;
    const frequency = transactionCount / 12; // transactions per month
    const lifespan = 36; // assumed 3 years
    
    const predictedCLV = avgOrderValue * frequency * 12 * lifespan;
    
    let tier = 'Starter';
    if (predictedCLV >= 50000) tier = 'Platinum';
    else if (predictedCLV >= 20000) tier = 'Gold';
    else if (predictedCLV >= 10000) tier = 'Silver';
    else if (predictedCLV >= 5000) tier = 'Bronze';
    
    return {
        predictedCLV,
        tier,
        avgOrderValue,
        frequency: frequency * 12, // per year
        lifespan
    };
}

// Generate personalized recommendations
function generatePersonalizedRecommendations(user, rfmData, clvData) {
    const recommendations = [];
    const spending = user.totalSpending || 0;
    const creditScore = user.creditScore || 0;
    
    // Recommendation based on RFM segment
    if (rfmData.segment === 'Champions' || rfmData.segment === 'Loyal Customers') {
        recommendations.push({
            title: 'Reward and Retain',
            priority: 'high',
            description: 'This user is a top performer. Focus on retention strategies.',
            actions: [
                'Offer exclusive premium features or early access',
                'Provide personalized financial consulting',
                'Create VIP rewards program tier'
            ],
            impact: 'Increase retention rate by 25-30%'
        });
    } else if (rfmData.segment === 'At Risk' || rfmData.segment === 'Lost') {
        recommendations.push({
            title: 'Re-engagement Required',
            priority: 'critical',
            description: 'User shows signs of disengagement. Immediate action needed.',
            actions: [
                'Send personalized re-engagement email campaign',
                'Offer time-limited discount or bonus',
                'Survey to understand pain points'
            ],
            impact: 'Potential to recover 15-20% of at-risk customers'
        });
    }
    
    // Credit score recommendations
    if (creditScore < 650) {
        recommendations.push({
            title: 'Credit Score Improvement Plan',
            priority: 'high',
            description: 'User has below-average credit score. Guide them to improvement.',
            actions: [
                'Suggest credit builder loan or secured credit card',
                'Provide educational content on payment history',
                'Recommend credit utilization reduction strategies'
            ],
            impact: 'Improve credit score by 50-100 points in 6-12 months'
        });
    }
    
    // Spending recommendations
    if (spending < 1000) {
        recommendations.push({
            title: 'Increase Engagement',
            priority: 'medium',
            description: 'Low spending user. Encourage more platform usage.',
            actions: [
                'Introduce gamification elements (badges, streaks)',
                'Offer cashback rewards on purchases',
                'Send personalized product recommendations'
            ],
            impact: 'Increase average spending by 40-60%'
        });
    }
    
    // Premium upsell
    if (!user.isPremium && clvData.tier !== 'Starter') {
        recommendations.push({
            title: 'Premium Subscription Opportunity',
            priority: 'high',
            description: 'User profile suggests high value. Perfect candidate for premium tier.',
            actions: [
                'Offer 1-month free trial of premium features',
                'Highlight ROI of premium subscription',
                'Provide comparison showing premium benefits'
            ],
            impact: 'Potential $500-1000 additional annual revenue'
        });
    }
    
    return recommendations;
}

// Generate risk assessment
function generateRiskAssessment(user) {
    const creditScore = user.creditScore || 0;
    const loans = user.loans || [];
    const spending = user.totalSpending || 0;
    
    let riskLevel = 'Low';
    let riskColor = 'success';
    const riskFactors = [];
    
    if (creditScore < 600) {
        riskLevel = 'High';
        riskColor = 'danger';
        riskFactors.push('Credit score below 600');
    } else if (creditScore < 670) {
        riskLevel = 'Medium';
        riskColor = 'warning';
        riskFactors.push('Credit score in fair range');
    }
    
    if (loans.length > 3) {
        riskFactors.push(`Multiple active loans (${loans.length})`);
        if (riskLevel === 'Low') riskLevel = 'Medium';
    }
    
    if (spending > user.creditScore * 10) {
        riskFactors.push('High spending relative to credit score');
        if (riskLevel === 'Low') riskLevel = 'Medium';
    }
    
    if (riskFactors.length === 0) {
        riskFactors.push('No significant risk factors detected');
    }
    
    return `
        <div class="risk-assessment ${riskColor}">
            <div class="risk-level">
                <span class="risk-label">Overall Risk Level:</span>
                <span class="risk-badge ${riskColor}">${riskLevel}</span>
            </div>
            <div class="risk-factors">
                <strong>Risk Factors:</strong>
                <ul>
                    ${riskFactors.map(factor => `<li>${factor}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Generate growth opportunities
function generateGrowthOpportunities(user, rfmData, clvData) {
    const opportunities = [];
    
    if (clvData.predictedCLV > 20000) {
        opportunities.push({
            title: 'High-Value Partnership',
            description: 'Consider offering exclusive partnership opportunities or premium services',
            potential: '$5,000 - $10,000 additional revenue'
        });
    }
    
    if (rfmData.frequency < 3) {
        opportunities.push({
            title: 'Increase Transaction Frequency',
            description: 'Implement automated reminders, subscription services, or recurring payment plans',
            potential: '50-100% increase in transaction frequency'
        });
    }
    
    if (!user.creditCards || user.creditCards.length === 0) {
        opportunities.push({
            title: 'Credit Card Acquisition',
            description: 'Recommend co-branded or partner credit cards to increase engagement',
            potential: '$200-500 commission per card + ongoing interchange fees'
        });
    }
    
    return `
        <div class="opportunities-list">
            ${opportunities.map(opp => `
                <div class="opportunity-card">
                    <h4>${opp.title}</h4>
                    <p>${opp.description}</p>
                    <div class="opportunity-potential">
                        <strong>Revenue Potential:</strong> ${opp.potential}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Helper functions for descriptions
function getRFMSegmentDescription(segment) {
    const descriptions = {
        'Champions': 'Bought recently, buy often and spend the most. Reward them!',
        'Loyal Customers': 'Spend good money with us often. Upsell higher value products.',
        'Potential Loyalists': 'Recent customers with average frequency. Offer membership or loyalty program.',
        'Promising': 'Recent shoppers, but haven\'t spent much. Create brand awareness.',
        'Need Attention': 'Above average recency, frequency and monetary values. Reactivate them.',
        'At Risk': 'Spent big money and purchased often but long time ago. Bring them back!',
        'Lost': 'Lowest recency, frequency and monetary scores. Lost them to competition.'
    };
    return descriptions[segment] || 'Customer segment analysis in progress.';
}

function getCLVTierDescription(tier) {
    const descriptions = {
        'Platinum': 'Top-tier customer with exceptional lifetime value. VIP treatment recommended.',
        'Gold': 'High-value customer with strong potential. Focus on retention and upselling.',
        'Silver': 'Valuable customer with room for growth. Implement engagement strategies.',
        'Bronze': 'Emerging customer with potential. Nurture relationship for growth.',
        'Starter': 'New or low-value customer. Focus on activation and education.'
    };
    return descriptions[tier] || 'Customer value analysis in progress.';
}

// Download report as PDF (simulated)
window.downloadReport = function() {
    alert('PDF download functionality would be implemented here using a library like jsPDF');
};

// Print report
window.printReport = function() {
    window.print();
};

console.log('🎉 Admin Panel JavaScript loaded');

