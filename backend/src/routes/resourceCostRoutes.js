// Resource Cost Allocation Routes - Updated 2025-11-26
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
// Clear require cache to force reload
delete require.cache[require.resolve('../services/resourceCostAllocationService')];
const ResourceCostAllocationService = require('../services/resourceCostAllocationService');

/**
 * Helper function to convert user ID for database compatibility
 */
const convertUserId = (userId) => {
    if (typeof userId === 'string' && userId.startsWith('user-')) {
        return parseInt(userId.substring(5), 10);
    }
    return userId;
};

// Initialize service
const costAllocationService = new ResourceCostAllocationService();

/**
 * Get allocation summary
 */
router.get('/allocation-summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 [ROUTE v2] Getting allocation summary for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`🔍 [ROUTE v2] Service type:`, costAllocationService.constructor.name);
        
        const result = await costAllocationService.getAllocationSummary(dbUserId);
        
        // 🔒 FORCE NEW RESPONSE STRUCTURE
        if (result.success) {
            res.json({
                success: true,
                VERSION: "NEW_CODE_V3",
                ...result
            });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Allocation summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get allocation summary'
        });
    }
});

/**
 * Get tag compliance
 */
router.get('/tag-compliance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting tag compliance for user: ${userId} (DB ID: ${dbUserId})`);
        
        const result = await costAllocationService.getTagCompliance(dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Tag compliance error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tag compliance'
        });
    }
});

/**
 * Get cost breakdown
 */
router.get('/cost-breakdown', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting cost breakdown for user: ${userId} (DB ID: ${dbUserId})`);
        
        const result = await costAllocationService.getCostBreakdown(dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Cost breakdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get cost breakdown'
        });
    }
});

/**
 * Get top cost centers
 */
router.get('/top-cost-centers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const limit = parseInt(req.query.limit) || 10;
        console.log(`🔍 Getting top cost centers for user: ${userId} (DB ID: ${dbUserId})`);
        
        const result = await costAllocationService.getTopCostCenters(dbUserId, limit);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Top cost centers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get top cost centers'
        });
    }
});

/**
 * Create allocation rule
 */
router.post('/allocation-rules', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`📝 Creating allocation rule for user: ${userId} (DB ID: ${dbUserId})`);
        
        const ruleData = req.body;
        const result = await costAllocationService.createAllocationRule(ruleData, dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Create allocation rule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create allocation rule'
        });
    }
});

/**
 * Get allocation rules
 */
router.get('/allocation-rules', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting allocation rules for user: ${userId} (DB ID: ${dbUserId})`);
        
        const result = await costAllocationService.getAllocationRules(dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Get allocation rules error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get allocation rules'
        });
    }
});

/**
 * Generate chargeback report
 */
router.post('/chargeback-report', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`📊 Generating chargeback report for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`   Report data:`, req.body);
        
        const reportData = req.body;
        const result = await costAllocationService.generateChargebackReport(reportData, dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Generate chargeback report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate chargeback report'
        });
    }
});

/**
 * Get chargeback reports
 */
router.get('/chargeback-reports', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        console.log(`🔍 Getting chargeback reports for user: ${userId} (DB ID: ${dbUserId})`);
        
        const result = await costAllocationService.getChargebackReports(dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Get chargeback reports error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chargeback reports'
        });
    }
});

/**
 * Bulk delete chargeback reports
 */
router.delete('/chargeback-reports/bulk-delete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { reportIds } = req.body;
        
        console.log(`🗑️ Bulk deleting chargeback reports for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`   Report IDs:`, reportIds);
        
        if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'reportIds array is required'
            });
        }
        
        const result = await costAllocationService.bulkDeleteChargebackReports(reportIds, dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Bulk delete chargeback reports error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete chargeback reports'
        });
    }
});

/**
 * Download chargeback reports
 */
router.post('/chargeback-reports/download', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { reportIds } = req.body;
        
        console.log(`📥 Downloading chargeback reports for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`   Report IDs:`, reportIds);
        
        if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'reportIds array is required'
            });
        }
        
        const result = await costAllocationService.downloadChargebackReports(reportIds, dbUserId);
        
        if (result.success) {
            // Set headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="chargeback-reports-${new Date().toISOString().split('T')[0]}.xlsx"`);
            res.send(result.data);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Download chargeback reports error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download chargeback reports'
        });
    }
});

/**
 * Bulk delete cost breakdown records
 */
router.delete('/cost-breakdown/bulk-delete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { breakdownCriteria } = req.body;
        
        console.log(`🗑️ Bulk deleting cost breakdown records for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`   Breakdown criteria:`, breakdownCriteria);
        
        if (!breakdownCriteria || !Array.isArray(breakdownCriteria) || breakdownCriteria.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'breakdownCriteria array is required'
            });
        }
        
        const result = await costAllocationService.bulkDeleteCostBreakdown(breakdownCriteria, dbUserId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Bulk delete cost breakdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete cost breakdown records'
        });
    }
});

/**
 * Download cost breakdown records
 */
router.post('/cost-breakdown/download', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { breakdownCriteria } = req.body;
        
        console.log(`📥 Downloading cost breakdown records for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`   Breakdown criteria:`, breakdownCriteria);
        
        if (!breakdownCriteria || !Array.isArray(breakdownCriteria) || breakdownCriteria.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'breakdownCriteria array is required'
            });
        }
        
        const result = await costAllocationService.downloadCostBreakdown(breakdownCriteria, dbUserId);
        
        if (result.success) {
            // Set headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="cost-breakdown-${new Date().toISOString().split('T')[0]}.xlsx"`);
            res.send(result.data);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Download cost breakdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download cost breakdown records'
        });
    }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Resource Cost Allocation',
        version: '1.0.0',
        features: {
            allocationSummary: 'active',
            tagCompliance: 'active',
            costBreakdown: 'active',
            costBreakdownBulkOps: 'active',
            topCostCenters: 'active',
            allocationRules: 'active',
            chargebackReports: 'active',
            chargebackBulkOps: 'active'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
