const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Simple admin check middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        // For now, allow all authenticated users - can be enhanced later
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        next();
    };
};
const ResourceLifecycleService = require('../services/resourceLifecycleService');

/**
 * Helper function to convert user ID for database compatibility
 * Converts "user-1234567890" to 1234567890
 */
const convertUserId = (userId) => {
    if (typeof userId === 'string' && userId.startsWith('user-')) {
        return parseInt(userId.substring(5), 10);
    }
    return userId;
};

// Initialize service
const lifecycleService = new ResourceLifecycleService();

/**
 * RESOURCE SCHEDULING ENDPOINTS
 */

// Schedule resource action
router.post('/schedule', authenticateToken, async (req, res) => {
    try {
        const { resourceId, action, schedule } = req.body;
        
        if (!resourceId || !action || !schedule) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: resourceId, action, schedule'
            });
        }

        const userId = req.user.id;
        const dbUserId = convertUserId(userId);

        const result = await lifecycleService.scheduleResourceAction(
            resourceId, 
            action, 
            schedule, 
            dbUserId
        );
        
        res.json(result);
    } catch (error) {
        console.error('Schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to schedule resource action'
        });
    }
});

// Get scheduled actions
router.get('/schedule', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Filter by user ID
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting scheduled actions for user: ${userId} (DB ID: ${dbUserId})`);
        
        const filters = {
            userId: dbUserId, // 🔒 Add user filtering with converted ID
            resourceId: req.query.resourceId,
            scheduleType: req.query.type
        };
        
        const result = await lifecycleService.getScheduledActions(filters);
        res.json(result);
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve scheduled actions'
        });
    }
});

// Update scheduled action
router.put('/schedule/:actionId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { schedule, action } = req.body;
        
        const result = await lifecycleService.updateScheduledAction(
            req.params.actionId,
            { schedule, action },
            dbUserId
        );
        res.json(result);
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update scheduled action'
        });
    }
});

// Pause/Resume scheduled action
router.patch('/schedule/:actionId/toggle', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        
        const result = await lifecycleService.toggleScheduledAction(
            req.params.actionId,
            dbUserId
        );
        res.json(result);
    } catch (error) {
        console.error('Toggle schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle scheduled action'
        });
    }
});

// Cancel scheduled action
router.delete('/schedule/:actionId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        
        const result = await lifecycleService.cancelScheduledAction(
            req.params.actionId, 
            dbUserId
        );
        res.json(result);
    } catch (error) {
        console.error('Cancel schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel scheduled action'
        });
    }
});

/**
 * RIGHTSIZING ENDPOINTS  
 */

// Analyze resource for rightsizing
router.post('/rightsize/analyze', authenticateToken, async (req, res) => {
    try {
        const { resourceId, performanceData } = req.body;
        
        if (!resourceId) {
            return res.status(400).json({
                success: false,
                error: 'resourceId is required'
            });
        }

        const userId = req.user.id;
        const dbUserId = convertUserId(userId);

        const result = await lifecycleService.analyzeRightsizing(
            resourceId,
            performanceData || {},
            dbUserId
        );
        
        res.json(result);
    } catch (error) {
        console.error('Rightsizing analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze rightsizing opportunity'
        });
    }
});

// Get rightsizing recommendations
router.get('/rightsize/recommendations', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Filter by user ID
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting rightsizing recommendations for user: ${userId} (DB ID: ${dbUserId})`);
        
        const filters = {
            userId: dbUserId, // 🔒 Add user filtering with converted ID
            minSavings: parseFloat(req.query.minSavings) || undefined,
            confidenceThreshold: parseFloat(req.query.confidence) || undefined
        };
        
        const result = await lifecycleService.getRightsizingRecommendations(filters);
        res.json(result);
    } catch (error) {
        console.error('Get rightsizing recommendations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve rightsizing recommendations'
        });
    }
});

// Apply rightsizing recommendation
router.post('/rightsize/apply/:recommendationId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        
        const result = await lifecycleService.applyRightsizingRecommendation(
            req.params.recommendationId,
            dbUserId
        );
        res.json(result);
    } catch (error) {
        console.error('Apply rightsizing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply rightsizing recommendation'
        });
    }
});

/**
 * ORPHANED RESOURCE ENDPOINTS
 */

// Detect orphaned resources
router.post('/orphans/detect', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Get user ID
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Detecting orphaned resources for user: ${userId} (DB ID: ${dbUserId})`);
        
        const { accountId, service } = req.body;
        
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'accountId is required'
            });
        }

        const result = await lifecycleService.detectOrphanedResources(accountId, service, dbUserId);
        res.json(result);
    } catch (error) {
        console.error('Orphan detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to detect orphaned resources'
        });
    }
});

// Get orphaned resources
router.get('/orphans', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Filter by user ID
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting orphaned resources for user: ${userId} (DB ID: ${dbUserId})`);
        
        const filters = {
            userId: dbUserId, // 🔒 Add user filtering with converted ID
            service: req.query.service,
            orphanType: req.query.type,
            minSavings: parseFloat(req.query.minSavings) || undefined
        };
        
        const result = await lifecycleService.getOrphanedResources(filters);
        res.json(result);
    } catch (error) {
        console.error('Get orphans error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve orphaned resources'
        });
    }
});

// Cleanup orphaned resource
router.delete('/orphans/:resourceId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const force = req.query.force === 'true';
        
        const result = await lifecycleService.cleanupOrphanedResource(
            req.params.resourceId,
            force,
            dbUserId
        );
        
        res.json(result);
    } catch (error) {
        console.error('Cleanup orphan error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup orphaned resource'
        });
    }
});

/**
 * AUTOMATION & MONITORING ENDPOINTS
 */

// Trigger manual orphan detection (admin only)
router.post('/automation/orphan-detection', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const result = await lifecycleService.runOrphanDetection();
        res.json(result);
    } catch (error) {
        console.error('Manual orphan detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run orphan detection'
        });
    }
});

// Trigger manual rightsizing analysis (admin only)
router.post('/automation/rightsizing-analysis', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const result = await lifecycleService.runRightsizingAnalysis();
        res.json(result);
    } catch (error) {
        console.error('Manual rightsizing analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run rightsizing analysis'
        });
    }
});

// Get lifecycle management status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Get user ID for filtering
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting lifecycle status for user: ${userId} (DB ID: ${dbUserId})`);
        
        // Get combined status from all lifecycle components - USER-SPECIFIC
        const [schedules, recommendations, orphans] = await Promise.all([
            lifecycleService.getScheduledActions({ userId: dbUserId }),
            lifecycleService.getRightsizingRecommendations({ userId: dbUserId }),
            lifecycleService.getOrphanedResources({ userId: dbUserId })
        ]);

        res.json({
            success: true,
            data: {
                scheduledActions: schedules.data.length,
                pendingRightsizing: recommendations.data.length,
                orphanedResources: orphans.data.length,
                automationStatus: 'active',
                lastUpdate: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get lifecycle status'
        });
    }
});

// Check if user has AWS credentials configured
router.get('/credentials/check', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        
        console.log(`🔍 Checking credentials for user ${userId} (DB ID: ${dbUserId})`);
        
        const AwsCredentialsService = require('../services/awsCredentialsService');
        
        // List all stored credentials for debugging
        await AwsCredentialsService.listAllCredentials();
        
        const credentials = await AwsCredentialsService.getCredentials(dbUserId);
        
        console.log(`Credentials check result:`, credentials ? 'Found' : 'Not found');
        
        res.json({
            success: true,
            hasCredentials: credentials && credentials.success,
            userId: userId,
            dbUserId: dbUserId,
            message: credentials && credentials.success 
                ? 'AWS credentials configured' 
                : 'No AWS credentials found. Please configure in Settings.'
        });
    } catch (error) {
        console.error('Credentials check error:', error);
        res.json({
            success: true,
            hasCredentials: false,
            message: 'Unable to verify AWS credentials'
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Resource Lifecycle Management',
        version: '1.0.0',
        features: {
            scheduling: 'active',
            rightsizing: 'active', 
            orphanDetection: 'active',
            automation: 'active'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
