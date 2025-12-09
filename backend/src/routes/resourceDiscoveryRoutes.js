// Resource Discovery API Routes
const express = require('express');
const ResourceDiscoveryService = require('../services/resourceDiscoveryService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Get complete resource inventory
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Starting resource discovery for user:', req.user.id);

        // Get user's AWS credentials
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const credentialsResult = await AwsCredentialsService.getCredentials(req.user.id);
        
        if (!credentialsResult.success) {
            return res.status(403).json({
                success: false,
                error: 'AWS credentials not configured',
                requiresAwsSetup: true
            });
        }

        // Resource discovery options
        const options = {
            regions: req.query.regions ? req.query.regions.split(',') : ['us-east-1', 'ap-south-1'],
            includeMetrics: req.query.metrics !== 'false',
            includeCostProjections: req.query.costs !== 'false'
        };

        console.log('🔄 Running resource discovery with options:', options);
        
        const discovery = await ResourceDiscoveryService.discoverAllResources(
            credentialsResult.credentials,
            options
        );

        if (discovery.success) {
            res.json({
                success: true,
                data: discovery.data,
                metadata: discovery.metadata,
                message: 'Resource discovery completed successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: discovery.error,
                partialData: discovery.partialData
            });
        }

    } catch (error) {
        console.error('❌ Resource discovery error:', error);
        res.status(500).json({
            success: false,
            error: 'Resource discovery failed'
        });
    }
});

// Get optimization recommendations only
router.get('/optimizations', authenticateToken, async (req, res) => {
    try {
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const credentialsResult = await AwsCredentialsService.getCredentials(req.user.id);
        
        if (!credentialsResult.success) {
            return res.status(403).json({
                success: false,
                error: 'AWS credentials not configured'
            });
        }

        const discovery = await ResourceDiscoveryService.discoverAllResources(
            credentialsResult.credentials,
            { includeMetrics: true }
        );

        if (discovery.success) {
            res.json({
                success: true,
                optimizations: discovery.data.optimizations || [],
                summary: {
                    totalOpportunities: discovery.data.optimizations?.length || 0,
                    totalPotentialSavings: discovery.data.optimizations?.reduce((sum, opt) => 
                        sum + (opt.potentialSavings || 0), 0
                    ) || 0
                },
                lastAnalysis: discovery.data.summary.lastDiscovery
            });
        } else {
            res.status(500).json({
                success: false,
                error: discovery.error
            });
        }

    } catch (error) {
        console.error('❌ Optimization analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Optimization analysis failed'
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Resource Discovery service operational',
        features: {
            'EC2 Discovery': 'Available',
            'RDS Discovery': 'Available', 
            'S3 Discovery': 'Available',
            'Lambda Discovery': 'Available',
            'Cost Attribution': 'Available',
            'Rightsizing Recommendations': 'Available'
        },
        endpoints: {
            'GET /api/resources/inventory': 'Complete resource inventory',
            'GET /api/resources/optimizations': 'Optimization recommendations only'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
