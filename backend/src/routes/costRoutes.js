const express = require('express');
const AwsCostService = require('../services/awsCostService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// 🔒 SECURITY: Added authentication to protect cost data
router.get('/weekly', authenticateToken, async (req, res) => {
    try {
        const result = await AwsCostService.getWeeklyCosts();

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
