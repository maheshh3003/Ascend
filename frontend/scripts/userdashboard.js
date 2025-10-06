// Import Firebase functions
import { 
    checkAuthState, 
    getUserData, 
    updateUserCreditScore,
    updateUserPayments,
    updateCreditCards,
    updateTotalSpending,
    logout,
    db
} from './auth.js';

// Import utilization checker utilities
import {
    generateUtilizationReport,
    getEligibleCards,
    formatCurrency
} from './utilizationChecker.js';

// Import sliding window algorithm for credit score trends
import {
    calculateCreditScoreTrend,
    analyzePaymentActivity,
    generateMockScoreHistory
} from './slidingWindow.js';

let currentUser = null;
let userData = null;
let userPayments = [];
let userCards = [];

// Check authentication state
checkAuthState(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData(user.uid);
        await loadPayments();
        await loadCreditCards();
    } else {
        // Redirect to login page if not authenticated
        window.location.href = '../index.html';
    }
});

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        const result = await getUserData(uid);
        
        if (result.success) {
            userData = result.data;
            
            // Check if user has set credit score
            if (userData.creditScore === null || userData.creditScore === undefined) {
                // Show credit score input popup
                showCreditScorePopup();
            } else {
                // Update dashboard with user data
                updateDashboard();
            }
        } else {
            console.error('Failed to load user data:', result.error);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Show credit score input popup
function showCreditScorePopup() {
    const modal = document.getElementById('creditScoreModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close credit score popup
function closeCreditScorePopup() {
    const modal = document.getElementById('creditScoreModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Handle credit score submission
async function handleCreditScoreSubmit(event) {
    event.preventDefault();
    
    const creditScoreInput = document.getElementById('credit-score-input');
    const creditScore = parseInt(creditScoreInput.value);
    
    // Validate credit score
    if (isNaN(creditScore) || creditScore < 300 || creditScore > 850) {
        alert('Please enter a valid credit score between 300 and 850');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const result = await updateUserCreditScore(currentUser.uid, creditScore);
        
        if (result.success) {
            // Reload user data
            await loadUserData(currentUser.uid);
            closeCreditScorePopup();
        } else {
            alert('Failed to save credit score: ' + result.error);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        alert('An error occurred while saving');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Update dashboard with user data
function updateDashboard() {
    // Update welcome message
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle && currentUser) {
        const userName = currentUser.displayName || userData.name || 'User';
        welcomeTitle.textContent = `Welcome back, ${userName} 👋`;
    }
    
    // Update credit score
    const creditScoreElements = document.querySelectorAll('.credit-score-value');
    creditScoreElements.forEach(el => {
        el.textContent = userData.creditScore || '---';
    });
    
    // Update credit level
    const creditLevelValue = document.querySelector('.credit-level-value');
    if (creditLevelValue && userData.creditLevel) {
        creditLevelValue.textContent = `Level ${userData.creditLevel.level}`;
    }
    
    const creditLevelLabel = document.querySelector('.credit-level-label');
    if (creditLevelLabel && userData.creditLevel) {
        creditLevelLabel.textContent = userData.creditLevel.label;
    }
    
    // Update last updated date
    const lastUpdatedElement = document.querySelector('.last-updated-value');
    if (lastUpdatedElement && userData.lastUpdated) {
        const date = new Date(userData.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Update chart with credit score
    updateChart();
}

// Load payments
async function loadPayments() {
    try {
        const result = await getUserData(currentUser.uid);
        if (result.success && result.data.payments) {
            userPayments = result.data.payments;
        } else {
            // Initialize with default payments if none exist
            userPayments = [
                {
                    id: Date.now() + '-1',
                    type: 'credit-card',
                    name: 'Platinum Card Payment',
                    amount: 250.00,
                    dueDate: getNextMonthDate(15),
                    payee: 'Bank of Ascend',
                    completed: false
                },
                {
                    id: Date.now() + '-2',
                    type: 'loan',
                    name: 'Auto Loan EMI',
                    amount: 450.00,
                    dueDate: getNextMonthDate(5),
                    payee: 'Prestige Auto Finance',
                    completed: false
                }
            ];
        }
        renderPayments();
    } catch (error) {
        console.error('Error loading payments:', error);
        userPayments = [];
        renderPayments();
    }
}

// Load credit cards from user profile
async function loadCreditCards() {
    try {
        const result = await getUserData(currentUser.uid);
        if (result.success && result.data.creditCards) {
            userCards = result.data.creditCards;
        } else {
            // Initialize with default cards if none exist
            userCards = [
                {
                    id: 'card-1',
                    name: 'Platinum Rewards Card',
                    bank: 'Bank of Ascend',
                    balance: 2500,
                    limit: 10000
                },
                {
                    id: 'card-2',
                    name: "Traveler's Elite",
                    bank: 'Global Trust Bank',
                    balance: 500,
                    limit: 5000
                }
            ];
        }
    } catch (error) {
        console.error('Error loading credit cards:', error);
        userCards = [];
    }
}

// Helper function to get next month's date
function getNextMonthDate(day) {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(day);
    return date.toISOString().split('T')[0];
}

// Render payments
function renderPayments() {
    const paymentsList = document.getElementById('payments-list');
    
    if (userPayments.length === 0) {
        paymentsList.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z"></path>
                </svg>
                <p>No upcoming payments. Click "Add Payment" to add one.</p>
            </div>
        `;
        return;
    }
    
    // Sort payments: incomplete first, then by due date
    const sortedPayments = [...userPayments].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    paymentsList.innerHTML = sortedPayments.map(payment => {
        const isOverdue = new Date(payment.dueDate) < new Date() && !payment.completed;
        const dueDate = new Date(payment.dueDate);
        const formattedDate = dueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        return `
            <div class="payment-item ${payment.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <div class="payment-info">
                    <div class="payment-header">
                        <span class="payment-name">${escapeHtml(payment.name)}</span>
                        ${payment.completed ? '<span class="payment-badge completed">✓ Paid</span>' : ''}
                        ${isOverdue ? '<span class="payment-badge overdue">Overdue</span>' : ''}
                    </div>
                    <div class="payment-details">${escapeHtml(payment.payee)} • ${payment.type.replace('-', ' ').toUpperCase()}</div>
                </div>
                <div class="payment-right">
                    <div class="payment-amount">
                        <div class="payment-amount-value">$${formatNumber(payment.amount)}</div>
                        <div class="payment-due">Due: ${formattedDate}</div>
                    </div>
                    <div class="payment-actions">
                        ${!payment.completed ? `
                            <button class="btn-icon success" onclick="markCompleted('${payment.id}')" title="Mark as Paid">
                                <svg class="icon-sm" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path>
                                </svg>
                            </button>
                            <button class="btn-pay" onclick="openPayNowModal('${payment.id}')">Pay Now</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Modal functions
function openAddPaymentModal() {
    document.getElementById('add-payment-modal').classList.add('active');
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment-due-date').setAttribute('min', today);
}

function closeAddPaymentModal() {
    document.getElementById('add-payment-modal').classList.remove('active');
    document.getElementById('add-payment-form').reset();
}

function openPayNowModal(paymentId) {
    const payment = userPayments.find(p => p.id === paymentId);
    if (!payment) return;
    
    document.getElementById('pay-payment-id').value = paymentId;
    document.getElementById('pay-payee').textContent = payment.payee;
    document.getElementById('pay-description').textContent = payment.name;
    document.getElementById('pay-due-date').textContent = new Date(payment.dueDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    document.getElementById('pay-amount').textContent = `$${formatNumber(payment.amount)}`;
    
    // Get eligible cards for this payment amount
    const eligibleCards = getEligibleCards(userCards, payment.amount);
    
    // Populate card dropdown
    const cardSelect = document.getElementById('payment-card');
    cardSelect.innerHTML = '<option value="">Select a card</option>';
    
    if (eligibleCards.length === 0) {
        cardSelect.innerHTML += '<option value="" disabled>No cards with sufficient limit</option>';
    } else {
        eligibleCards.forEach(card => {
            cardSelect.innerHTML += `
                <option value="${card.id}">
                    ${card.name} - ${card.bank} (Available: $${formatNumber(card.availableCredit)} | Will be ${card.utilizationAfterPayment}% utilized)
                </option>
            `;
        });
    }
    
    // Add event listener to card selection to show utilization warning
    cardSelect.addEventListener('change', function() {
        showUtilizationWarning(payment.amount, this.value);
    });
    
    // Clear any previous warnings
    const existingWarning = document.getElementById('utilization-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    document.getElementById('pay-now-modal').classList.add('active');
}

function closePayNowModal() {
    document.getElementById('pay-now-modal').classList.remove('active');
    document.getElementById('pay-now-form').reset();
    
    // Remove utilization warning if exists
    const existingWarning = document.getElementById('utilization-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
}

// Show utilization warning when card is selected
function showUtilizationWarning(paymentAmount, cardId) {
    if (!cardId || !userData || !userData.creditScore) {
        return;
    }
    
    // Remove existing warning
    const existingWarning = document.getElementById('utilization-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    // Generate utilization report
    const report = generateUtilizationReport(
        userData.creditScore,
        userCards,
        cardId,
        paymentAmount
    );
    
    if (!report.success) {
        return;
    }
    
    const { warning, utilizationData, formattedData, categoryLimits } = report;
    
    // Create warning element
    const warningDiv = document.createElement('div');
    warningDiv.id = 'utilization-warning';
    warningDiv.className = `utilization-alert alert-${warning.level}`;
    
    // Build warning HTML
    let warningHTML = `
        <div class="alert-header">
            <span class="alert-icon">${warning.icon}</span>
            <h4 class="alert-title">Credit Utilization Check</h4>
        </div>
        <div class="alert-body">
            <p class="alert-message"><strong>${warning.message}</strong></p>
            <p class="alert-recommendation">${warning.recommendation}</p>
            
            <div class="utilization-details">
                <div class="utilization-row">
                    <span class="detail-label">Current Total Utilization:</span>
                    <span class="detail-value">${utilizationData.currentUtilization}%</span>
                </div>
                <div class="utilization-row">
                    <span class="detail-label">After Payment:</span>
                    <span class="detail-value ${warning.level === 'danger' ? 'text-danger' : warning.level === 'warning' ? 'text-warning' : ''}">${utilizationData.newUtilization}%</span>
                </div>
                <div class="utilization-row">
                    <span class="detail-label">Increase:</span>
                    <span class="detail-value">+${utilizationData.utilizationIncrease}%</span>
                </div>
                <div class="utilization-divider"></div>
                <div class="utilization-row">
                    <span class="detail-label">Total Credit Limit:</span>
                    <span class="detail-value">${formattedData.totalLimit}</span>
                </div>
                <div class="utilization-row">
                    <span class="detail-label">Current Balance:</span>
                    <span class="detail-value">${formattedData.currentBalance}</span>
                </div>
                <div class="utilization-row">
                    <span class="detail-label">New Balance After Payment:</span>
                    <span class="detail-value">${formattedData.newBalance}</span>
                </div>
            </div>
            
            <div class="category-info">
                <span class="category-badge" style="background-color: ${categoryLimits.color}20; color: ${categoryLimits.color}; border: 1px solid ${categoryLimits.color}">
                    ${categoryLimits.name}
                </span>
                <span class="category-limits">
                    Recommended: ${categoryLimits.recommendedLimit}% | Ideal: ${categoryLimits.idealLimit}%
                </span>
            </div>
            
            <div class="card-specific-info">
                <h5>Selected Card Impact:</h5>
                <div class="utilization-row">
                    <span class="detail-label">${utilizationData.paymentCard.name}:</span>
                    <span class="detail-value">${formattedData.cardCurrentBalance} → ${formattedData.cardNewBalance}</span>
                </div>
                <div class="utilization-row">
                    <span class="detail-label">Card Utilization:</span>
                    <span class="detail-value ${utilizationData.paymentCard.cardUtilization > 30 ? 'text-danger' : ''}">${utilizationData.paymentCard.cardUtilization}%</span>
                </div>
            </div>
        </div>
    `;
    
    warningDiv.innerHTML = warningHTML;
    
    // Insert warning before the submit button
    const modalActions = document.querySelector('#pay-now-form .modal-actions');
    modalActions.parentNode.insertBefore(warningDiv, modalActions);
}

// Add payment handler
document.getElementById('add-payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('payment-type').value;
    const name = document.getElementById('payment-name').value.trim();
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const dueDate = document.getElementById('payment-due-date').value;
    const payee = document.getElementById('payment-payee').value.trim();
    
    const newPayment = {
        id: Date.now().toString(),
        type,
        name,
        amount,
        dueDate,
        payee,
        completed: false
    };
    
    userPayments.push(newPayment);
    await savePayments();
    renderPayments();
    closeAddPaymentModal();
});

// Pay now handler
document.getElementById('pay-now-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const paymentId = document.getElementById('pay-payment-id').value;
    const cardId = document.getElementById('payment-card').value;
    
    if (!cardId) {
        alert('Please select a credit card');
        return;
    }
    
    const payment = userPayments.find(p => p.id === paymentId);
    const card = userCards.find(c => c.id === cardId);
    
    if (!payment || !card) return;
    
    // Check if card has sufficient available balance
    const available = card.limit - card.balance;
    if (available < payment.amount) {
        alert('Insufficient credit limit on selected card');
        return;
    }
    
    // Generate utilization report for final check
    const report = generateUtilizationReport(
        userData.creditScore,
        userCards,
        cardId,
        payment.amount
    );
    
    // If utilization is dangerous, ask for confirmation
    if (report.success && report.warning.level === 'danger') {
        const confirmPayment = confirm(
            `⚠️ WARNING: This payment will increase your credit utilization to ${report.utilizationData.newUtilization}%, ` +
            `which exceeds the ${report.categoryLimits.recommendedLimit}% recommended limit for ${report.categoryLimits.name} category.\n\n` +
            `This could negatively impact your credit score.\n\n` +
            `Do you want to proceed anyway?`
        );
        
        if (!confirmPayment) {
            return;
        }
    }
    
    // Update card balance
    card.balance += payment.amount;
    
    // Update total spending for rewards
    if (!userData.totalSpending) {
        userData.totalSpending = 0;
    }
    userData.totalSpending += payment.amount;
    
    // Mark payment as completed
    payment.completed = true;
    payment.paidDate = new Date().toISOString();
    payment.paidWith = cardId;
    
    // Save all updates to Firestore
    await savePayments();
    await saveCreditCards();
    await saveTotalSpending();
    
    renderPayments();
    closePayNowModal();
    
    // Open NPS rating modal instead of showing alert
    openNPSModal(payment.id, {
        payee: payment.payee,
        amount: payment.amount,
        cardName: card.name,
        cardBalance: card.balance,
        utilization: report.success ? report.utilizationData.newUtilization : 'N/A',
        totalSpending: userData.totalSpending
    });
});

// Mark payment as completed (manual)
async function markCompleted(paymentId) {
    const confirmComplete = confirm('Mark this payment as completed?');
    if (!confirmComplete) return;
    
    const payment = userPayments.find(p => p.id === paymentId);
    if (payment) {
        payment.completed = true;
        payment.paidDate = new Date().toISOString();
        await savePayments();
        renderPayments();
    }
}

// Save payments to Firestore
async function savePayments() {
    try {
        const result = await updateUserPayments(currentUser.uid, userPayments);
        if (!result.success) {
            console.error('Failed to save payments:', result.error);
            alert('Failed to save changes. Please try again.');
        }
    } catch (error) {
        console.error('Error saving payments:', error);
        alert('An error occurred while saving. Please try again.');
    }
}

// Save credit cards to Firestore
async function saveCreditCards() {
    try {
        const result = await updateCreditCards(currentUser.uid, userCards);
        if (!result.success) {
            console.error('Failed to save credit cards:', result.error);
        }
    } catch (error) {
        console.error('Error saving credit cards:', error);
    }
}

// Save total spending to Firestore
async function saveTotalSpending() {
    try {
        const result = await updateTotalSpending(currentUser.uid, userData.totalSpending);
        if (!result.success) {
            console.error('Failed to save total spending:', result.error);
            alert('Failed to update rewards. Please try again.');
        } else {
            console.log(`✅ Total spending updated: $${userData.totalSpending}`);
        }
    } catch (error) {
        console.error('Error saving total spending:', error);
    }
}

// Update chart visualization
function updateChart() {
    const chartStatValue = document.querySelector('.chart-stat-value');
    if (chartStatValue) {
        chartStatValue.textContent = userData.creditScore || '---';
    }
    
    // SLIDING WINDOW ALGORITHM: Calculate real percentage change from historical data
    const percentageChange = calculatePercentageChangeWithSlidingWindow();
    const chartStatPercentage = document.querySelector('.chart-stat-percentage');
    if (chartStatPercentage) {
        chartStatPercentage.textContent = `${percentageChange >= 0 ? '+' : ''}${percentageChange}%`;
        chartStatPercentage.style.color = percentageChange >= 0 ? '#22c55e' : '#ef4444';
    }
}

// Calculate percentage change using Sliding Window algorithm (replaces mock data)
function calculatePercentageChangeWithSlidingWindow() {
    // Get or generate credit score history
    let scoreHistory = userData.scoreHistory;
    
    // If no history exists, generate mock data (remove this in production with real Firebase data)
    if (!scoreHistory || scoreHistory.length === 0) {
        scoreHistory = generateMockScoreHistory(userData.creditScore || 720, 90);
    }
    
    // Use sliding window to analyze last 30 days
    const trendAnalysis = calculateCreditScoreTrend(scoreHistory, 30);
    
    // Log analysis for debugging
    console.log('📊 Credit Score Trend Analysis:', trendAnalysis);
    
    return trendAnalysis.percentageChange;
}

// Handle logout
async function handleLogout() {
    const confirmLogout = confirm('Are you sure you want to log out?');
    if (!confirmLogout) return;
    
    try {
        const result = await logout();
        if (result.success) {
            window.location.href = '../index.html';
        } else {
            alert('Failed to logout: ' + result.error);
        }
    } catch (error) {
        alert('An error occurred during logout');
    }
}

// NPS Rating Modal Functions
let currentNPSPaymentId = null;
let currentNPSPaymentDetails = null;
let selectedRating = 0;

function openNPSModal(paymentId, paymentDetails) {
    currentNPSPaymentId = paymentId;
    currentNPSPaymentDetails = paymentDetails;
    selectedRating = 0;
    
    // Reset form
    document.getElementById('nps-message').value = '';
    
    // Reset stars
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show modal
    document.getElementById('nps-rating-modal').style.display = 'flex';
    
    // Add star click listeners
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStarSelection(selectedRating);
        });
    });
}

function updateStarSelection(rating) {
    document.querySelectorAll('.star-btn').forEach(btn => {
        const btnRating = parseInt(btn.dataset.rating);
        if (btnRating <= rating) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function closeNPSModal() {
    // Show success message without rating
    if (currentNPSPaymentDetails) {
        alert(`✅ Payment successful!\n\n` +
              `💳 Card: ${currentNPSPaymentDetails.cardName}\n` +
              `💰 Amount: $${formatNumber(currentNPSPaymentDetails.amount)}\n` +
              `📊 New card balance: $${formatNumber(currentNPSPaymentDetails.cardBalance)}\n` +
              `📈 Credit utilization: ${currentNPSPaymentDetails.utilization}%\n\n` +
              `🎁 Total spending: $${formatNumber(currentNPSPaymentDetails.totalSpending)} (Rewards updated!)`);
    }
    
    document.getElementById('nps-rating-modal').style.display = 'none';
    currentNPSPaymentId = null;
    currentNPSPaymentDetails = null;
    selectedRating = 0;
}

// Handle NPS form submission
document.getElementById('nps-rating-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (selectedRating === 0) {
        alert('Please select a rating');
        return;
    }
    
    const message = document.getElementById('nps-message').value.trim();
    
    try {
        // Import Firestore functions
        const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Save to Firebase
        const npsData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            score: selectedRating,  // Changed from 'rating' to 'score' to match admin panel
            message: message || '',
            paymentId: currentNPSPaymentId,
            paymentAmount: currentNPSPaymentDetails?.amount || 0,
            paymentPayee: currentNPSPaymentDetails?.payee || '',
            timestamp: new Date().toISOString(),
            submittedAt: Timestamp.now(),
            dateSubmitted: new Date().toLocaleDateString()
        };
        
        // Use 'nps_ratings' to match admin panel collection name
        await addDoc(collection(db, 'nps_ratings'), npsData);
        
        // Show success message with rating confirmation
        alert(`✅ Payment successful! Thank you for your ${selectedRating}-star rating!\n\n` +
              `💳 Card: ${currentNPSPaymentDetails.cardName}\n` +
              `💰 Amount: $${formatNumber(currentNPSPaymentDetails.amount)}\n` +
              `📊 New card balance: $${formatNumber(currentNPSPaymentDetails.cardBalance)}\n` +
              `📈 Credit utilization: ${currentNPSPaymentDetails.utilization}%\n\n` +
              `🎁 Total spending: $${formatNumber(currentNPSPaymentDetails.totalSpending)} (Rewards updated!)\n\n` +
              `⭐ Your feedback helps us improve!`);
        
        // Close modal
        document.getElementById('nps-rating-modal').style.display = 'none';
        currentNPSPaymentId = null;
        currentNPSPaymentDetails = null;
        selectedRating = 0;
    } catch (error) {
        console.error('Error saving NPS rating:', error);
        alert('Failed to save rating: ' + error.message);
    }
});

// Make functions globally available
window.handleCreditScoreSubmit = handleCreditScoreSubmit;
window.closeCreditScorePopup = closeCreditScorePopup;
window.handleLogout = handleLogout;
window.openAddPaymentModal = openAddPaymentModal;
window.closeAddPaymentModal = closeAddPaymentModal;
window.openPayNowModal = openPayNowModal;
window.closePayNowModal = closePayNowModal;
window.markCompleted = markCompleted;
window.closeNPSModal = closeNPSModal;

