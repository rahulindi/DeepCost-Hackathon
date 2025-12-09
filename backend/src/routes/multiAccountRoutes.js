// /Users/rahulindi/aws-cost-tracker/backend/src/routes/multiAccountRoutes.js
const express = require('express');
const MultiAccountService = require('../services/multiAccountService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// 🔒 SECURITY: Add authentication and user-specific account filtering
router.get('/accounts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🔍 Getting multi-account data for user: ${userId}`);
        
        // 🔒 Get user-specific account IDs from query or user's configured accounts
        const accountIds = req.query.accountIds 
            ? req.query.accountIds.split(',') 
            : []; // User should provide their own account IDs
        
        if (accountIds.length === 0) {
            return res.json({ 
                success: true, 
                accounts: [],
                message: 'No account IDs provided. Use ?accountIds=123,456,789'
            });
        }
        
        const accountCosts = await MultiAccountService.getAccountCosts(accountIds, userId);
        res.json({ success: true, accounts: accountCosts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔒 SECURITY: Add authentication and user-specific account filtering
router.get('/comparison', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🔍 Getting account comparison for user: ${userId}`);
        
        // 🔒 Get user-specific account IDs
        const accountIds = req.query.accountIds 
            ? req.query.accountIds.split(',') 
            : [];
            
        if (accountIds.length === 0) {
            return res.json({ 
                success: true, 
                comparison: [],
                message: 'No account IDs provided. Use ?accountIds=123,456,789'
            });
        }
        
        const accounts = await MultiAccountService.getAccountCosts(accountIds, userId);
        const comparison = await MultiAccountService.getAccountComparison(accounts);
        res.json({ success: true, comparison });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;