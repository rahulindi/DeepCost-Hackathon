// Reserved Instance Routes - SAFE ADDITION to existing system
// This file is completely independent and won't affect existing functionality
const express = require('express');
const router = express.Router();

// Import existing middleware (safe - already tested)
const { authenticateToken } = require('../middleware/authMiddleware');

// Health check endpoint - test the route works without touching AWS
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Reserved Instance service route is working',
        version: '1.0.0',
        features: {
            'RI Analysis': 'Available',
            'Recommendations': 'Available', 
            'Savings Calculator': 'Available'
        },
        timestamp: new Date().toISOString(),
        safe: true,
        existingSystemImpact: 'NONE - completely independent'
    });
});

// Test endpoint - verify authentication without AWS calls
router.get('/test', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'RI service authentication test successful',
        user: {
            id: req.user.id,
            username: req.user.username
        },
        readyForRealAnalysis: true,
        timestamp: new Date().toISOString()
    });
});

/**
 * Helper function to convert user ID for database compatibility
 */
const convertUserId = (userId) => {
    if (typeof userId === 'string' && userId.startsWith('user-')) {
        return parseInt(userId.substring(5), 10);
    }
    return userId;
};

// REAL AWS RI Analysis - Production Ready
router.get('/analysis', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Performing REAL RI analysis for user: ${userId} (DB ID: ${dbUserId})`);

        // Get user's AWS credentials using the proper encrypted service
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const credentialsResult = await AwsCredentialsService.getCredentials(dbUserId);
        
        if (!credentialsResult.success) {
            console.log(`❌ No AWS credentials found for user ${dbUserId}`);
            return res.status(403).json({
                success: false,
                error: 'AWS credentials not configured. Please set up your AWS connection first.',
                requiresAwsSetup: true,
                message: 'Please configure your AWS credentials in the dashboard first'
            });
        }
        
        console.log(`✅ AWS credentials loaded for user ${dbUserId}`);


        // Import and use the real RI service
        const ReservedInstanceService = require('../services/reservedInstanceService');
        
        console.log('⚡ Calling AWS Cost Explorer for RI analysis...');
        const analysis = await ReservedInstanceService.analyzeReservedInstances(
            credentialsResult.credentials,
            {
                includeRIRecommendations: true,
                analyzePeriod: 30, // Last 30 days
                minSavingsThreshold: 10 // Only recommend if saves $10+/month
            }
        );

        if (analysis.success) {
            // Save analysis to file storage (since DB is not available)
            const fs = require('fs');
            const path = require('path');
            const dataDir = path.join(__dirname, '../data');
            
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString();
            const filename = `ri-analysis-${req.user.id}-${timestamp.split('T')[0]}.json`;
            const filepath = path.join(dataDir, filename);
            
            const analysisWithMetadata = {
                userId: req.user.id,
                timestamp: timestamp,
                analysis: analysis.data,
                apiCost: 0.01, // AWS Cost Explorer API call cost
                version: '1.0.0'
            };
            
            fs.writeFileSync(filepath, JSON.stringify(analysisWithMetadata, null, 2));
            console.log('✅ RI analysis saved:', filename);
            
            // Return the analysis
            res.json({
                success: true,
                data: analysis.data,
                metadata: {
                    analysisTime: timestamp,
                    costOptimizationPotential: `$${analysis.data.savings.monthly.toFixed(2)}/month`,
                    recommendationCount: analysis.data.recommendations.length,
                    apiCost: '$0.01',
                    realData: true
                },
                message: 'Real AWS RI analysis completed successfully'
            });
        } else {
            console.error('❌ RI analysis failed:', analysis.error);
            res.status(500).json({
                success: false,
                error: analysis.error || 'RI analysis failed',
                message: 'Failed to analyze Reserved Instance opportunities'
            });
        }

    } catch (error) {
        console.error('❌ RI analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during RI analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
