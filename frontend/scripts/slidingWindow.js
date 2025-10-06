// Sliding Window Algorithm Implementation
// Used for tracking credit score trends and activity metrics over time

/**
 * Calculate credit score trend using sliding window approach
 * @param {Array} scoreHistory - Array of {score, timestamp} objects
 * @param {number} windowDays - Number of days to analyze (default: 30)
 * @returns {Object} - Trend analysis with percentage change
 */
export function calculateCreditScoreTrend(scoreHistory, windowDays = 30) {
    if (!scoreHistory || scoreHistory.length === 0) {
        return {
            percentageChange: 0,
            direction: 'stable',
            dataPoints: 0,
            message: 'No historical data available'
        };
    }

    // Calculate window start time (windowDays ago from now)
    const now = Date.now();
    const windowStart = now - (windowDays * 24 * 60 * 60 * 1000);

    // SLIDING WINDOW: Filter entries within the time window
    const recentScores = scoreHistory.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= windowStart && entryTime <= now;
    });

    // Need at least 2 data points to calculate trend
    if (recentScores.length < 2) {
        return {
            percentageChange: 0,
            direction: 'stable',
            dataPoints: recentScores.length,
            message: recentScores.length === 1 ? 'Need more data for trend' : 'No data in window'
        };
    }

    // Sort by timestamp (oldest to newest)
    recentScores.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate percentage change: first vs last in window
    const oldestScore = recentScores[0].score;
    const newestScore = recentScores[recentScores.length - 1].score;
    
    const percentageChange = ((newestScore - oldestScore) / oldestScore) * 100;

    // Determine direction
    let direction = 'stable';
    if (percentageChange > 1) direction = 'up';
    else if (percentageChange < -1) direction = 'down';

    return {
        percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal
        direction,
        dataPoints: recentScores.length,
        oldestScore,
        newestScore,
        windowDays,
        message: `${direction === 'up' ? '📈' : direction === 'down' ? '📉' : '➡️'} ${Math.abs(percentageChange).toFixed(1)}% change in ${windowDays} days`
    };
}

/**
 * Analyze payment activity using sliding window
 * @param {Array} payments - Array of payment objects
 * @param {number} windowDays - Number of days to analyze (default: 90)
 * @returns {Object} - Payment activity metrics
 */
export function analyzePaymentActivity(payments, windowDays = 90) {
    if (!payments || payments.length === 0) {
        return {
            onTimeRate: 0,
            totalPayments: 0,
            completedPayments: 0,
            avgAmount: 0,
            status: 'No Activity'
        };
    }

    const now = Date.now();
    const windowStart = now - (windowDays * 24 * 60 * 60 * 1000);

    // SLIDING WINDOW: Filter payments within time window
    const recentPayments = payments.filter(payment => {
        const dueDate = new Date(payment.dueDate).getTime();
        return dueDate >= windowStart && dueDate <= now;
    });

    if (recentPayments.length === 0) {
        return {
            onTimeRate: 0,
            totalPayments: 0,
            completedPayments: 0,
            avgAmount: 0,
            status: 'No Recent Activity'
        };
    }

    // Calculate metrics within the window
    const completedPayments = recentPayments.filter(p => p.completed).length;
    const totalAmount = recentPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgAmount = totalAmount / recentPayments.length;
    const onTimeRate = (completedPayments / recentPayments.length) * 100;

    // Determine status
    let status = 'Active';
    if (onTimeRate >= 95) status = 'Excellent';
    else if (onTimeRate >= 80) status = 'Good';
    else if (onTimeRate >= 60) status = 'Fair';
    else status = 'Needs Attention';

    return {
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        totalPayments: recentPayments.length,
        completedPayments,
        avgAmount: Math.round(avgAmount * 100) / 100,
        status,
        windowDays
    };
}

/**
 * Track spending velocity for rewards tiers (moving average)
 * @param {Array} spendingHistory - Array of {amount, timestamp} objects
 * @param {number} windowDays - Rolling window size
 * @returns {Object} - Spending velocity analysis
 */
export function calculateSpendingVelocity(spendingHistory, windowDays = 30) {
    if (!spendingHistory || spendingHistory.length === 0) {
        return {
            avgDailySpending: 0,
            totalSpending: 0,
            projectedMonthly: 0,
            trend: 'No Data'
        };
    }

    const now = Date.now();
    const windowStart = now - (windowDays * 24 * 60 * 60 * 1000);

    // SLIDING WINDOW: Recent spending only
    const recentSpending = spendingHistory.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= windowStart && entryTime <= now;
    });

    if (recentSpending.length === 0) {
        return {
            avgDailySpending: 0,
            totalSpending: 0,
            projectedMonthly: 0,
            trend: 'No Recent Activity'
        };
    }

    const totalSpending = recentSpending.reduce((sum, entry) => sum + entry.amount, 0);
    const avgDailySpending = totalSpending / windowDays;
    const projectedMonthly = avgDailySpending * 30;

    // Determine trend (compare first half vs second half of window)
    const midPoint = windowStart + ((now - windowStart) / 2);
    const firstHalf = recentSpending.filter(e => new Date(e.timestamp).getTime() < midPoint);
    const secondHalf = recentSpending.filter(e => new Date(e.timestamp).getTime() >= midPoint);

    const firstHalfTotal = firstHalf.reduce((sum, e) => sum + e.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, e) => sum + e.amount, 0);

    let trend = 'Stable';
    if (secondHalfTotal > firstHalfTotal * 1.1) trend = 'Increasing';
    else if (secondHalfTotal < firstHalfTotal * 0.9) trend = 'Decreasing';

    return {
        avgDailySpending: Math.round(avgDailySpending * 100) / 100,
        totalSpending: Math.round(totalSpending * 100) / 100,
        projectedMonthly: Math.round(projectedMonthly * 100) / 100,
        trend,
        windowDays
    };
}

/**
 * Generate mock historical data for testing (remove in production)
 * @param {number} currentScore - Current credit score
 * @param {number} days - Number of days of history
 * @returns {Array} - Mock score history
 */
export function generateMockScoreHistory(currentScore, days = 90) {
    const history = [];
    const now = Date.now();
    
    // Generate scores with realistic variation
    let baseScore = currentScore - Math.floor(Math.random() * 50);
    
    for (let i = days; i >= 0; i--) {
        const timestamp = new Date(now - (i * 24 * 60 * 60 * 1000));
        
        // Random walk with slight upward bias
        const change = Math.floor(Math.random() * 10) - 4; // -4 to +5
        baseScore = Math.max(300, Math.min(850, baseScore + change));
        
        history.push({
            score: baseScore,
            timestamp: timestamp.toISOString()
        });
    }
    
    // Ensure last entry matches current score
    history[history.length - 1].score = currentScore;
    
    return history;
}
