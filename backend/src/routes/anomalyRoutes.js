// /Users/rahulindi/aws-cost-tracker/backend/src/routes/anomalyRoutes.js
const express = require('express');
const router = express.Router();
const AnomalyDetectionService = require('../services/anomalyDetectionService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/anomalies/detect
 * @desc    Detect cost anomalies
 * @access  Private
 */
router.get('/detect', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Get user ID from authenticated token
        const userId = req.user.id;
        console.log(`🔍 Detecting anomalies for user: ${userId}`);

        // Get query parameters
        const { days, threshold } = req.query;

        // Set default values with USER FILTERING
        const options = {
            userId: userId, // 🔒 Filter by user
            startDate: new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            threshold: parseFloat(threshold) || 2.5
        };

        // Perform anomaly detection - USER-SPECIFIC
        const result = await AnomalyDetectionService.performAnomalyDetection(options);

        res.json(result);
    } catch (error) {
        console.error('Error in anomaly detection route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform anomaly detection'
        });
    }
});

/**
 * @route   GET /api/anomalies/report
 * @desc    Get anomaly report
 * @access  Private
 */
router.get('/report', authenticateToken, async (req, res) => {
    try {
        // 🔒 SECURITY: Get user ID from authenticated token
        const userId = req.user.id;
        console.log(`📊 Generating anomaly report for user: ${userId}`);

        // Get query parameters
        const { days } = req.query;

        // Set default values with USER FILTERING
        const options = {
            userId: userId, // 🔒 Filter by user
            startDate: new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        // Calculate requested date range
        const requestedDateRange = {
            start: options.startDate,
            end: new Date().toISOString().split('T')[0]
        };
        
        // Get cost records for report generation - USER-SPECIFIC
        const costRecords = await AnomalyDetectionService.getCostRecordsForAnomalyDetection(options);

        if (costRecords.length === 0) {
            return res.json({
                success: true,
                message: 'No cost data available for anomaly report',
                data: AnomalyDetectionService.generateAnomalyReport([], { requestedDateRange })
            });
        }

        // Detect anomalies
        const anomalies = AnomalyDetectionService.detectServiceAnomalies(costRecords);

        // Generate report with requested date range
        const report = AnomalyDetectionService.generateAnomalyReport(anomalies, { requestedDateRange });

        res.json({
            success: true,
            message: 'Anomaly report generated successfully',
            data: report
        });
    } catch (error) {
        console.error('Error in anomaly report route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate anomaly report'
        });
    }
});

module.exports = router;