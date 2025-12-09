// /Users/rahulindi/aws-cost-tracker/backend/src/routes/alertRoutes.js
const express = require('express');
const AlertService = require('../services/alertService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// 🔒 SECURITY: Added authentication to protect alert endpoints
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { alertName, thresholdAmount, serviceName, alertType } = req.body;
        const alertId = await AlertService.createAlert(alertName, thresholdAmount, serviceName, alertType);
        res.json({ success: true, alertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔒 SECURITY: Added authentication to protect alert notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT an.*, ca.alert_name, ca.service_name 
            FROM alert_notifications an 
            JOIN cost_alerts ca ON an.alert_id = ca.id 
            ORDER BY an.triggered_at DESC 
            LIMIT 10
        `;
        const result = await require('../services/databaseService').pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;