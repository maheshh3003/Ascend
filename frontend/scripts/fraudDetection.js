// DFS-Based Fraud Detection System
// Uses graph traversal to detect connected fraud patterns in loan networks

/**
 * Build a relationship graph from loans based on shared attributes
 * @param {Array} loans - Array of loan objects
 * @returns {Object} - Adjacency list representation of loan relationships
 */
function buildLoanRelationshipGraph(loans) {
    const graph = {};
    
    // Initialize graph
    loans.forEach(loan => {
        graph[loan.id] = [];
    });
    
    // Create edges between loans with shared attributes
    for (let i = 0; i < loans.length; i++) {
        for (let j = i + 1; j < loans.length; j++) {
            const loan1 = loans[i];
            const loan2 = loans[j];
            
            // Check for suspicious shared attributes
            const hasConnection = 
                loan1.provider === loan2.provider || // Same provider (common)
                (loan1.email && loan2.email && loan1.email === loan2.email) || // Same email (suspicious)
                (loan1.phone && loan2.phone && loan1.phone === loan2.phone) || // Same phone (suspicious)
                (loan1.address && loan2.address && loan1.address === loan2.address); // Same address (suspicious)
            
            if (hasConnection) {
                // Create bidirectional edge
                graph[loan1.id].push(loan2.id);
                graph[loan2.id].push(loan1.id);
            }
        }
    }
    
    return graph;
}

/**
 * DFS traversal to detect fraud network starting from a loan
 * @param {string} startLoanId - Starting loan ID
 * @param {Object} graph - Loan relationship graph
 * @param {Array} loans - Original loans array
 * @param {number} maxDepth - Maximum traversal depth (default: 3)
 * @returns {Object} - Fraud analysis result
 */
function detectFraudNetworkDFS(startLoanId, graph, loans, maxDepth = 3) {
    const visited = new Set();
    const fraudPath = [];
    let fraudScore = 0;
    let connectedLoans = 0;
    
    // Helper to get loan by ID
    const getLoanById = (id) => loans.find(l => l.id === id);
    
    /**
     * DFS recursive function
     * @param {string} loanId - Current loan ID
     * @param {number} depth - Current depth in graph
     * @param {Array} path - Current path taken
     */
    function dfs(loanId, depth, path) {
        // Base cases
        if (visited.has(loanId) || depth > maxDepth) return;
        
        visited.add(loanId);
        connectedLoans++;
        
        const currentLoan = getLoanById(loanId);
        if (!currentLoan) return;
        
        const currentPath = [...path, loanId];
        
        // Calculate fraud indicators for this loan
        let loanFraudScore = 0;
        
        // 1. Check if explicitly marked as fraud
        if (currentLoan.isFraud) {
            loanFraudScore += 20;
        }
        
        // 2. Check for suspicious amount patterns
        if (currentLoan.total > 50000 && currentLoan.remaining > currentLoan.total * 0.95) {
            loanFraudScore += 10; // Large loan, almost no payments made
        }
        
        // 3. Check for suspicious provider patterns
        if (currentLoan.provider && currentLoan.provider.toLowerCase().includes('unknown')) {
            loanFraudScore += 15;
        }
        
        // 4. Check for high utilization
        const utilizationRate = (currentLoan.remaining / currentLoan.total) * 100;
        if (utilizationRate > 95) {
            loanFraudScore += 5; // Very little paid off
        }
        
        // 5. Check connection count (highly connected = suspicious)
        const connectionCount = graph[loanId]?.length || 0;
        if (connectionCount > 3) {
            loanFraudScore += connectionCount * 2; // More connections = more suspicious
        }
        
        // Add to total fraud score
        fraudScore += loanFraudScore;
        
        // Track fraud path if this loan is suspicious
        if (loanFraudScore > 10) {
            fraudPath.push({
                loanId,
                name: currentLoan.name,
                provider: currentLoan.provider,
                fraudScore: loanFraudScore,
                depth,
                path: currentPath
            });
        }
        
        // Explore connected loans (DFS recursive call)
        const neighbors = graph[loanId] || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                dfs(neighborId, depth + 1, currentPath);
            }
        }
    }
    
    // Start DFS from the starting loan
    dfs(startLoanId, 0, []);
    
    // Determine risk level based on fraud score
    let riskLevel = 'LOW';
    if (fraudScore > 50) riskLevel = 'CRITICAL';
    else if (fraudScore > 30) riskLevel = 'HIGH';
    else if (fraudScore > 15) riskLevel = 'MEDIUM';
    
    return {
        riskLevel,
        fraudScore,
        connectedLoans,
        networkDepth: visited.size,
        fraudPath,
        visited: Array.from(visited)
    };
}

/**
 * Analyze all loans for fraud patterns
 * @param {Array} loans - Array of all user loans
 * @returns {Object} - Complete fraud analysis
 */
export function analyzeLoanFraud(loans) {
    if (!loans || loans.length === 0) {
        return {
            overallRisk: 'NONE',
            totalLoans: 0,
            flaggedLoans: [],
            recommendations: ['No loans to analyze']
        };
    }
    
    // Build relationship graph
    const graph = buildLoanRelationshipGraph(loans);
    
    // Analyze each loan using DFS
    const loanAnalyses = loans.map(loan => {
        const analysis = detectFraudNetworkDFS(loan.id, graph, loans);
        return {
            loanId: loan.id,
            loanName: loan.name,
            provider: loan.provider,
            ...analysis
        };
    });
    
    // Find highest risk loans
    const flaggedLoans = loanAnalyses
        .filter(a => a.riskLevel !== 'LOW')
        .sort((a, b) => b.fraudScore - a.fraudScore);
    
    // Determine overall risk
    let overallRisk = 'LOW';
    const maxRisk = Math.max(...loanAnalyses.map(a => a.fraudScore));
    if (maxRisk > 50) overallRisk = 'CRITICAL';
    else if (maxRisk > 30) overallRisk = 'HIGH';
    else if (maxRisk > 15) overallRisk = 'MEDIUM';
    
    // Generate recommendations
    const recommendations = generateRecommendations(flaggedLoans, loans);
    
    return {
        overallRisk,
        totalLoans: loans.length,
        analyzedLoans: loanAnalyses,
        flaggedLoans,
        recommendations,
        graphStats: {
            totalNodes: Object.keys(graph).length,
            totalEdges: Object.values(graph).reduce((sum, edges) => sum + edges.length, 0) / 2
        }
    };
}

/**
 * Generate fraud prevention recommendations
 * @param {Array} flaggedLoans - Loans with fraud concerns
 * @param {Array} allLoans - All loans
 * @returns {Array} - Array of recommendation strings
 */
function generateRecommendations(flaggedLoans, allLoans) {
    const recommendations = [];
    
    if (flaggedLoans.length === 0) {
        recommendations.push('✅ No fraud patterns detected in your loan portfolio');
        recommendations.push('💡 Continue monitoring loan activity regularly');
        return recommendations;
    }
    
    // Critical risk recommendations
    const critical = flaggedLoans.filter(l => l.riskLevel === 'CRITICAL');
    if (critical.length > 0) {
        recommendations.push(`🚨 CRITICAL: ${critical.length} loan(s) show severe fraud patterns`);
        recommendations.push('📞 Contact your financial institution immediately');
        recommendations.push('🔒 Freeze credit reports with all three bureaus');
    }
    
    // High risk recommendations
    const high = flaggedLoans.filter(l => l.riskLevel === 'HIGH');
    if (high.length > 0) {
        recommendations.push(`⚠️ HIGH RISK: ${high.length} loan(s) need immediate review`);
        recommendations.push('📋 Request detailed statements from loan providers');
        recommendations.push('🔍 Verify all loan details and recent transactions');
    }
    
    // Medium risk recommendations
    const medium = flaggedLoans.filter(l => l.riskLevel === 'MEDIUM');
    if (medium.length > 0) {
        recommendations.push(`⚡ MEDIUM RISK: ${medium.length} loan(s) show unusual patterns`);
        recommendations.push('📝 Review loan documentation carefully');
        recommendations.push('🔔 Set up fraud alerts on your credit accounts');
    }
    
    // Connected network warning
    const highlyConnected = flaggedLoans.filter(l => l.connectedLoans > 3);
    if (highlyConnected.length > 0) {
        recommendations.push('🌐 Multiple loans show interconnected patterns');
        recommendations.push('🔎 Investigate shared providers or account details');
    }
    
    return recommendations;
}

/**
 * Get detailed fraud report for a specific loan
 * @param {string} loanId - Loan ID to analyze
 * @param {Array} loans - All loans
 * @returns {Object} - Detailed fraud report
 */
export function getLoanFraudReport(loanId, loans) {
    const graph = buildLoanRelationshipGraph(loans);
    const analysis = detectFraudNetworkDFS(loanId, graph, loans);
    
    const loan = loans.find(l => l.id === loanId);
    
    return {
        loan: {
            id: loan.id,
            name: loan.name,
            provider: loan.provider,
            amount: loan.total,
            remaining: loan.remaining
        },
        ...analysis,
        timestamp: new Date().toISOString()
    };
}

/**
 * Check if a new loan should be flagged before adding
 * @param {Object} newLoan - Loan to check
 * @param {Array} existingLoans - Existing loans
 * @returns {Object} - Validation result
 */
export function validateNewLoan(newLoan, existingLoans) {
    // Create temporary loan array with new loan
    const tempLoans = [...existingLoans, { ...newLoan, id: 'temp-' + Date.now() }];
    
    const graph = buildLoanRelationshipGraph(tempLoans);
    const analysis = detectFraudNetworkDFS(tempLoans[tempLoans.length - 1].id, graph, tempLoans);
    
    const isValid = analysis.fraudScore < 20;
    const warnings = [];
    
    if (analysis.fraudScore >= 20) {
        warnings.push('⚠️ This loan shows high-risk fraud patterns');
    }
    if (analysis.connectedLoans > 3) {
        warnings.push('🔗 This loan has many connections to existing loans');
    }
    if (newLoan.total > 50000) {
        warnings.push('💰 Large loan amount - verify legitimacy');
    }
    
    return {
        isValid,
        fraudScore: analysis.fraudScore,
        riskLevel: analysis.riskLevel,
        warnings,
        shouldFlag: analysis.fraudScore >= 15
    };
}
