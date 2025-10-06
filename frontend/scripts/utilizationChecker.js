// Credit Utilization Checker
// Calculates and warns users about credit utilization based on their credit category

/**
 * Get recommended utilization limit based on credit score category
 * @param {number} creditScore - User's credit score
 * @returns {Object} - Category info with recommended limits
 */
export function getCreditCategoryLimits(creditScore) {
    if (creditScore >= 300 && creditScore <= 579) {
        return {
            name: 'High Risk',
            recommendedLimit: 30,
            idealLimit: 10,
            warningThreshold: 25,
            dangerThreshold: 30,
            color: '#ef4444',
            message: 'Keep utilization below 30% to avoid further score damage'
        };
    } else if (creditScore >= 580 && creditScore <= 669) {
        return {
            name: 'Needs Improvement',
            recommendedLimit: 25,
            idealLimit: 10,
            warningThreshold: 20,
            dangerThreshold: 25,
            color: '#f59e0b',
            message: 'Aim for under 25% utilization to improve your score'
        };
    } else if (creditScore >= 670 && creditScore <= 739) {
        return {
            name: 'Moderate Risk',
            recommendedLimit: 20,
            idealLimit: 10,
            warningThreshold: 15,
            dangerThreshold: 20,
            color: '#eab308',
            message: 'Keep under 20% to move into "Low Risk" category'
        };
    } else if (creditScore >= 740 && creditScore <= 799) {
        return {
            name: 'Low Risk',
            recommendedLimit: 15,
            idealLimit: 10,
            warningThreshold: 12,
            dangerThreshold: 15,
            color: '#22c55e',
            message: 'Maintain under 15% to reach prime status'
        };
    } else if (creditScore >= 800 && creditScore <= 850) {
        return {
            name: 'Prime',
            recommendedLimit: 10,
            idealLimit: 5,
            warningThreshold: 8,
            dangerThreshold: 10,
            color: '#8b5cf6',
            message: 'Keep below 10% to maintain excellent credit'
        };
    }
    
    return null;
}

/**
 * Calculate total credit limit from all cards
 * @param {Array} cards - Array of credit card objects
 * @returns {number} - Total credit limit
 */
export function calculateTotalLimit(cards) {
    if (!cards || cards.length === 0) return 0;
    return cards.reduce((total, card) => total + (card.limit || 0), 0);
}

/**
 * Calculate current total balance from all cards
 * @param {Array} cards - Array of credit card objects
 * @returns {number} - Total current balance
 */
export function calculateCurrentBalance(cards) {
    if (!cards || cards.length === 0) return 0;
    return cards.reduce((total, card) => total + (card.balance || 0), 0);
}

/**
 * Calculate new utilization after a payment
 * @param {Array} cards - Array of credit card objects
 * @param {string} cardId - ID of card being used for payment
 * @param {number} paymentAmount - Amount of the payment
 * @returns {Object} - Utilization analysis
 */
export function calculateNewUtilization(cards, cardId, paymentAmount) {
    const totalLimit = calculateTotalLimit(cards);
    const currentBalance = calculateCurrentBalance(cards);
    const currentUtilization = totalLimit > 0 ? (currentBalance / totalLimit) * 100 : 0;
    
    // Find the card being used
    const paymentCard = cards.find(card => card.id === cardId);
    if (!paymentCard) {
        return {
            error: 'Card not found',
            canProceed: false
        };
    }
    
    // Check if card has sufficient limit
    const availableCredit = paymentCard.limit - paymentCard.balance;
    if (availableCredit < paymentAmount) {
        return {
            error: 'Insufficient credit limit',
            canProceed: false,
            availableCredit,
            paymentAmount,
            shortfall: paymentAmount - availableCredit
        };
    }
    
    // Calculate new balance after payment
    const newCardBalance = paymentCard.balance + paymentAmount;
    const newTotalBalance = currentBalance + paymentAmount;
    const newUtilization = (newTotalBalance / totalLimit) * 100;
    const utilizationIncrease = newUtilization - currentUtilization;
    
    // Calculate individual card utilization
    const cardUtilization = (newCardBalance / paymentCard.limit) * 100;
    
    return {
        canProceed: true,
        totalLimit,
        currentBalance,
        currentUtilization: parseFloat(currentUtilization.toFixed(2)),
        newBalance: newTotalBalance,
        newUtilization: parseFloat(newUtilization.toFixed(2)),
        utilizationIncrease: parseFloat(utilizationIncrease.toFixed(2)),
        paymentCard: {
            name: paymentCard.name,
            currentBalance: paymentCard.balance,
            newBalance: newCardBalance,
            limit: paymentCard.limit,
            availableCredit,
            cardUtilization: parseFloat(cardUtilization.toFixed(2))
        }
    };
}

/**
 * Generate warning message based on utilization and credit category
 * @param {number} creditScore - User's credit score
 * @param {Object} utilizationData - Data from calculateNewUtilization
 * @returns {Object} - Warning information
 */
export function getUtilizationWarning(creditScore, utilizationData) {
    const categoryLimits = getCreditCategoryLimits(creditScore);
    
    if (!categoryLimits) {
        return {
            level: 'none',
            message: 'Unable to determine credit category'
        };
    }
    
    const { newUtilization } = utilizationData;
    
    // Determine warning level
    let level = 'safe';
    let icon = '✅';
    let message = '';
    let recommendation = '';
    
    if (newUtilization >= categoryLimits.dangerThreshold) {
        level = 'danger';
        icon = '🚨';
        message = `Critical: Your utilization will be ${newUtilization.toFixed(1)}%, exceeding the ${categoryLimits.dangerThreshold}% recommended limit for ${categoryLimits.name} category.`;
        recommendation = `This could negatively impact your credit score. Consider paying down existing balances or using a different payment method.`;
    } else if (newUtilization >= categoryLimits.warningThreshold) {
        level = 'warning';
        icon = '⚠️';
        message = `Warning: Your utilization will be ${newUtilization.toFixed(1)}%, approaching the ${categoryLimits.dangerThreshold}% limit for ${categoryLimits.name} category.`;
        recommendation = `Try to keep utilization below ${categoryLimits.warningThreshold}% for optimal credit health.`;
    } else if (newUtilization >= categoryLimits.idealLimit) {
        level = 'caution';
        icon = '💡';
        message = `Your utilization will be ${newUtilization.toFixed(1)}%. This is acceptable but not ideal.`;
        recommendation = `Aim for under ${categoryLimits.idealLimit}% utilization for the best credit score impact.`;
    } else {
        level = 'safe';
        icon = '✅';
        message = `Excellent! Your utilization will be ${newUtilization.toFixed(1)}%, well below the recommended limit.`;
        recommendation = `You're maintaining healthy credit habits for ${categoryLimits.name} category.`;
    }
    
    return {
        level,
        icon,
        message,
        recommendation,
        categoryName: categoryLimits.name,
        categoryColor: categoryLimits.color,
        recommendedLimit: categoryLimits.recommendedLimit,
        idealLimit: categoryLimits.idealLimit,
        currentUtilization: utilizationData.currentUtilization,
        newUtilization: utilizationData.newUtilization,
        utilizationIncrease: utilizationData.utilizationIncrease
    };
}

/**
 * Format currency for display
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Get all cards that can handle the payment
 * @param {Array} cards - Array of credit card objects
 * @param {number} paymentAmount - Amount needed
 * @returns {Array} - Filtered cards with sufficient limit
 */
export function getEligibleCards(cards, paymentAmount) {
    if (!cards || cards.length === 0) return [];
    
    return cards.filter(card => {
        const availableCredit = card.limit - card.balance;
        return availableCredit >= paymentAmount;
    }).map(card => ({
        ...card,
        availableCredit: card.limit - card.balance,
        utilizationAfterPayment: ((card.balance + paymentAmount) / card.limit * 100).toFixed(1)
    }));
}

/**
 * Generate detailed utilization report
 * @param {number} creditScore 
 * @param {Array} cards 
 * @param {string} cardId 
 * @param {number} paymentAmount 
 * @returns {Object}
 */
export function generateUtilizationReport(creditScore, cards, cardId, paymentAmount) {
    const utilizationData = calculateNewUtilization(cards, cardId, paymentAmount);
    
    if (!utilizationData.canProceed) {
        return {
            success: false,
            error: utilizationData.error,
            details: utilizationData
        };
    }
    
    const warning = getUtilizationWarning(creditScore, utilizationData);
    const categoryLimits = getCreditCategoryLimits(creditScore);
    
    return {
        success: true,
        utilizationData,
        warning,
        categoryLimits,
        shouldProceed: warning.level !== 'danger',
        canProceedAnyway: true, // User can override warning
        formattedData: {
            currentBalance: formatCurrency(utilizationData.currentBalance),
            newBalance: formatCurrency(utilizationData.newBalance),
            totalLimit: formatCurrency(utilizationData.totalLimit),
            paymentAmount: formatCurrency(paymentAmount),
            cardCurrentBalance: formatCurrency(utilizationData.paymentCard.currentBalance),
            cardNewBalance: formatCurrency(utilizationData.paymentCard.newBalance),
            cardLimit: formatCurrency(utilizationData.paymentCard.limit),
            cardAvailableCredit: formatCurrency(utilizationData.paymentCard.availableCredit)
        }
    };
}
