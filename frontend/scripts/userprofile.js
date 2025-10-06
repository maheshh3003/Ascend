// Import Firebase functions
import { 
    checkAuthState, 
    getUserData,
    updateUserProfile,
    updateUserCreditScore,
    updateUserLoans,
    logout 
} from './auth.js';

// Import fraud detection system (DFS-based algorithm)
import {
    analyzeLoanFraud,
    getLoanFraudReport,
    validateNewLoan
} from './fraudDetection.js';

let currentUser = null;
let userData = null;
let isEditMode = false;
let userLoans = [];
let userCreditCards = [];

// Check authentication state
checkAuthState(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData(user.uid);
        await loadLoans();
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
            updateProfilePage();
        } else {
            console.error('Failed to load user data:', result.error);
            // Set default values if data fetch fails
            setDefaultValues();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        setDefaultValues();
    }
}

// Load loans
async function loadLoans() {
    try {
        const result = await getUserData(currentUser.uid);
        if (result.success && result.data.loans) {
            userLoans = result.data.loans;
        } else {
            // Initialize with default loans if none exist
            userLoans = [
                {
                    id: Date.now() + '-1',
                    name: 'Auto Loan',
                    provider: 'Prestige Auto Finance',
                    remaining: 15000,
                    total: 25000,
                    isFraud: false
                },
                {
                    id: Date.now() + '-2',
                    name: 'Student Loan',
                    provider: 'Federal Loan Servicing',
                    remaining: 8000,
                    total: 20000,
                    isFraud: false
                }
            ];
        }
        renderLoans();
        
        // Run fraud detection analysis after loading loans
        runFraudDetectionAnalysis();
    } catch (error) {
        console.error('Error loading loans:', error);
        userLoans = [];
        renderLoans();
    }
}

// Load credit cards
async function loadCreditCards() {
    try {
        const result = await getUserData(currentUser.uid);
        if (result.success && result.data.creditCards) {
            userCreditCards = result.data.creditCards;
        } else {
            // Initialize with default cards if none exist
            userCreditCards = [
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
        renderCreditCards();
    } catch (error) {
        console.error('Error loading credit cards:', error);
        userCreditCards = [];
        renderCreditCards();
    }
}

// Render credit cards
function renderCreditCards() {
    const cardsList = document.getElementById('credit-cards-list');
    
    if (userCreditCards.length === 0) {
        cardsList.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Z"></path>
                </svg>
                <p>No credit cards added yet.</p>
            </div>
        `;
        return;
    }
    
    cardsList.innerHTML = userCreditCards.map(card => {
        const utilization = ((card.balance / card.limit) * 100).toFixed(1);
        const availableCredit = card.limit - card.balance;
        
        return `
            <div class="info-item">
                <div class="info-left">
                    <h3>${escapeHtml(card.name)}</h3>
                    <p>${escapeHtml(card.bank)}</p>
                    <p style="font-size: 0.75rem; color: var(--slate-500); margin-top: 0.25rem;">
                        Available: $${formatNumber(availableCredit)} | Utilization: ${utilization}%
                    </p>
                </div>
                <div class="info-right">
                    <p class="amount">$${formatNumber(card.balance)} / $${formatNumber(card.limit)}</p>
                    <p class="label">Balance / Limit</p>
                </div>
            </div>
        `;
    }).join('');
}

// Render loans
function renderLoans() {
    const loansList = document.getElementById('loans-list');
    
    if (userLoans.length === 0) {
        loansList.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path>
                </svg>
                <p>No loans yet. Click "Add Loan" to get started.</p>
            </div>
        `;
        return;
    }
    
    loansList.innerHTML = userLoans.map(loan => `
        <div class="loan-item ${loan.isFraud ? 'fraud' : ''}" data-loan-id="${loan.id}">
            <div class="loan-content">
                <div class="info-left">
                    <h3>
                        ${escapeHtml(loan.name)}
                        ${loan.isFraud ? '<span class="fraud-badge"><svg class="icon-sm" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"></path></svg>FRAUD</span>' : ''}
                    </h3>
                    <p>${escapeHtml(loan.provider)}</p>
                </div>
                <div class="info-right">
                    <p class="amount">$${formatNumber(loan.remaining)} / $${formatNumber(loan.total)}</p>
                    <p class="label">Remaining / Total</p>
                </div>
            </div>
            ${!loan.isFraud ? `
                <div class="loan-actions">
                    <button class="btn-icon danger" onclick="openFraudModal('${loan.id}')" title="Report Fraud">
                        <svg class="icon-sm" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                            <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"></path>
                        </svg>
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

// Modal functions
function openAddLoanModal() {
    document.getElementById('add-loan-modal').classList.add('active');
}

function closeAddLoanModal() {
    document.getElementById('add-loan-modal').classList.remove('active');
    document.getElementById('add-loan-form').reset();
}

function openFraudModal(loanId) {
    document.getElementById('fraud-loan-id').value = loanId;
    document.getElementById('fraud-modal').classList.add('active');
}

function closeFraudModal() {
    document.getElementById('fraud-modal').classList.remove('active');
    document.getElementById('fraud-form').reset();
}

// Add loan handler
document.getElementById('add-loan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('loan-name').value.trim();
    const provider = document.getElementById('loan-provider').value.trim();
    const remaining = parseFloat(document.getElementById('loan-remaining').value);
    const total = parseFloat(document.getElementById('loan-total').value);
    
    if (remaining > total) {
        alert('Remaining amount cannot be greater than total amount');
        return;
    }
    
    const newLoan = {
        id: Date.now().toString(),
        name,
        provider,
        remaining,
        total,
        isFraud: false
    };
    
    // DFS FRAUD VALIDATION: Check if new loan shows fraud patterns
    const validation = validateNewLoan(newLoan, userLoans);
    
    console.log('🔍 New Loan Fraud Validation:', validation);
    
    // Warn user if loan is high-risk
    if (!validation.isValid) {
        const confirmAdd = confirm(
            `⚠️ WARNING: This loan shows fraud risk patterns!\n\n` +
            `Risk Level: ${validation.riskLevel}\n` +
            `Fraud Score: ${validation.fraudScore}\n\n` +
            `Warnings:\n${validation.warnings.join('\n')}\n\n` +
            `Do you still want to add this loan?`
        );
        
        if (!confirmAdd) {
            return; // User cancelled
        }
        
        // Auto-flag if high risk
        if (validation.shouldFlag) {
            newLoan.isFraud = true;
            newLoan.fraudReport = {
                reason: 'Auto-flagged by fraud detection system',
                details: validation.warnings.join('; '),
                reportedAt: new Date().toISOString(),
                autoFlagged: true
            };
        }
    }
    
    userLoans.push(newLoan);
    await saveLoans();
    renderLoans();
    
    // Re-run fraud analysis with new loan
    runFraudDetectionAnalysis();
    
    closeAddLoanModal();
});

// Fraud report handler
document.getElementById('fraud-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loanId = document.getElementById('fraud-loan-id').value;
    const reason = document.getElementById('fraud-reason').value;
    const details = document.getElementById('fraud-details').value;
    const contact = document.getElementById('fraud-contact').value;
    
    const loanIndex = userLoans.findIndex(l => l.id === loanId);
    if (loanIndex !== -1) {
        userLoans[loanIndex].isFraud = true;
        userLoans[loanIndex].fraudReport = {
            reason,
            details,
            contact,
            reportedAt: new Date().toISOString()
        };
        
        await saveLoans();
        renderLoans();
        closeFraudModal();
        alert('Fraud report submitted successfully. Our team will review this loan.');
    }
});

// Save loans to Firestore
async function saveLoans() {
    try {
        const result = await updateUserLoans(currentUser.uid, userLoans);
        if (!result.success) {
            console.error('Failed to save loans:', result.error);
            alert('Failed to save changes. Please try again.');
        }
    } catch (error) {
        console.error('Error saving loans:', error);
        alert('An error occurred while saving. Please try again.');
    }
}

// DFS-BASED FRAUD DETECTION: Analyze loan network for fraud patterns
function runFraudDetectionAnalysis() {
    if (userLoans.length === 0) {
        console.log('🔍 No loans to analyze for fraud');
        return;
    }
    
    console.log('🔍 Running DFS-based fraud detection analysis...');
    
    // Run comprehensive fraud analysis using DFS algorithm
    const fraudAnalysis = analyzeLoanFraud(userLoans);
    
    console.log('📊 Fraud Detection Results:', fraudAnalysis);
    
    // Display fraud warnings if any high-risk loans detected
    if (fraudAnalysis.overallRisk !== 'LOW' && fraudAnalysis.overallRisk !== 'NONE') {
        displayFraudWarning(fraudAnalysis);
    }
    
    // Auto-flag high-risk loans
    if (fraudAnalysis.flaggedLoans.length > 0) {
        fraudAnalysis.flaggedLoans.forEach(flaggedLoan => {
            if (flaggedLoan.riskLevel === 'CRITICAL' || flaggedLoan.riskLevel === 'HIGH') {
                const loan = userLoans.find(l => l.id === flaggedLoan.loanId);
                if (loan && !loan.isFraud) {
                    console.warn(`⚠️ Auto-flagging loan "${loan.name}" due to ${flaggedLoan.riskLevel} risk`);
                    // You can optionally auto-flag here or just warn
                }
            }
        });
    }
    
    return fraudAnalysis;
}

// Display fraud warning banner
function displayFraudWarning(fraudAnalysis) {
    const loansList = document.getElementById('loans-list');
    
    // Create warning banner
    const warningBanner = document.createElement('div');
    warningBanner.className = `fraud-warning-banner risk-${fraudAnalysis.overallRisk.toLowerCase()}`;
    warningBanner.innerHTML = `
        <div class="warning-header">
            <svg class="icon-md" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"></path>
            </svg>
            <h3>Fraud Detection Alert: ${fraudAnalysis.overallRisk} Risk</h3>
        </div>
        <p><strong>${fraudAnalysis.flaggedLoans.length}</strong> loan(s) show suspicious patterns</p>
        <ul class="recommendations-list">
            ${fraudAnalysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        <p class="small-text">Analysis powered by DFS graph traversal algorithm</p>
    `;
    
    // Insert at the top of loans list
    loansList.insertBefore(warningBanner, loansList.firstChild);
}

// Update profile page with user data
function updateProfilePage() {
    // Update name
    const nameInputs = document.querySelectorAll('.user-name');
    nameInputs.forEach(input => {
        input.value = currentUser.displayName || userData.name || 'User';
    });
    
    // Update email
    const emailInputs = document.querySelectorAll('.user-email');
    emailInputs.forEach(input => {
        input.value = currentUser.email || userData.email || 'No email';
    });
    
    // Update credit score
    const creditScoreInputs = document.querySelectorAll('.user-credit-score');
    creditScoreInputs.forEach(input => {
        if (userData.creditScore) {
            input.value = userData.creditScore;
        } else {
            input.value = 'Not set';
        }
    });
    
    // Update account created date
    const createdDateInputs = document.querySelectorAll('.user-created-date');
    createdDateInputs.forEach(input => {
        if (userData.createdAt) {
            const date = new Date(userData.createdAt);
            input.value = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            input.value = 'Unknown';
        }
    });
}

// Set default values if data loading fails
function setDefaultValues() {
    const nameInputs = document.querySelectorAll('.user-name');
    nameInputs.forEach(input => {
        input.value = currentUser?.displayName || 'User';
    });
    
    const emailInputs = document.querySelectorAll('.user-email');
    emailInputs.forEach(input => {
        input.value = currentUser?.email || 'No email';
    });
    
    const creditScoreInputs = document.querySelectorAll('.user-credit-score');
    creditScoreInputs.forEach(input => {
        input.value = 'Not set';
    });
    
    const createdDateInputs = document.querySelectorAll('.user-created-date');
    createdDateInputs.forEach(input => {
        input.value = 'Unknown';
    });
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const nameInput = document.getElementById('name');
    const creditScoreInput = document.getElementById('credit-score');
    const editBtn = document.getElementById('edit-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    if (isEditMode) {
        // Enable editing
        nameInput.removeAttribute('readonly');
        creditScoreInput.removeAttribute('readonly');
        nameInput.classList.add('editable');
        creditScoreInput.classList.add('editable');
        
        // Show/hide buttons
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
    } else {
        // Disable editing
        nameInput.setAttribute('readonly', true);
        creditScoreInput.setAttribute('readonly', true);
        nameInput.classList.remove('editable');
        creditScoreInput.classList.remove('editable');
        
        // Show/hide buttons
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        
        // Reset values
        updateProfilePage();
    }
}

// Save profile changes
async function saveProfileChanges() {
    const nameInput = document.getElementById('name');
    const creditScoreInput = document.getElementById('credit-score');
    
    const newName = nameInput.value.trim();
    const newCreditScore = creditScoreInput.value.trim();
    
    // Validate inputs
    if (!newName) {
        alert('Name cannot be empty');
        return;
    }
    
    // Validate credit score if provided
    if (newCreditScore && newCreditScore !== 'Not set') {
        const score = parseInt(newCreditScore);
        if (isNaN(score) || score < 300 || score > 850) {
            alert('Please enter a valid credit score (300-850)');
            return;
        }
    }
    
    try {
        // Show loading state
        const saveBtn = document.getElementById('save-profile-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Update name if changed
        if (newName !== userData.name) {
            const nameResult = await updateUserProfile(newName);
            if (!nameResult.success) {
                throw new Error('Failed to update name: ' + nameResult.error);
            }
        }
        
        // Update credit score if changed
        if (newCreditScore && newCreditScore !== 'Not set') {
            const score = parseInt(newCreditScore);
            if (score !== userData.creditScore) {
                const scoreResult = await updateUserCreditScore(currentUser.uid, score);
                if (!scoreResult.success) {
                    throw new Error('Failed to update credit score: ' + scoreResult.error);
                }
            }
        }
        
        // Reload data and exit edit mode
        await loadUserData(currentUser.uid);
        toggleEditMode();
        
        alert('Profile updated successfully!');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + error.message);
        
        // Reset button
        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = false;
    }
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

// Make functions globally available
window.handleLogout = handleLogout;
window.toggleEditMode = toggleEditMode;
window.saveProfileChanges = saveProfileChanges;
window.openAddLoanModal = openAddLoanModal;
window.closeAddLoanModal = closeAddLoanModal;
window.openFraudModal = openFraudModal;
window.closeFraudModal = closeFraudModal;
