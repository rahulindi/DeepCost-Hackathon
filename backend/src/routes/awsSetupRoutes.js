const express = require('express');
const AwsCredentialsService = require('../services/awsCredentialsService');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');

const router = express.Router();

// Store AWS credentials
router.post('/credentials', authenticateToken, requirePermission('api_access'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, accessKeyId, secretAccessKey, roleArn, accountId, alias, region } = req.body;

        // Convert user ID to database format for consistency
        const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
            ? parseInt(userId.substring(5), 10)
            : userId;

        console.log(`🔍 Storing credentials for user: ${userId} (DB ID: ${dbUserId})`);

        const credentialData = {
            type,
            accessKeyId,
            secretAccessKey,
            roleArn,
            accountId,
            alias,
            region: region || 'us-east-1'
        };

        // Validate credentials format
        const validation = await AwsCredentialsService.validateCredentials(credentialData);
        if (!validation.success) {
            return res.status(400).json(validation);
        }

        // Store encrypted credentials using DB user ID for consistency
        const result = await AwsCredentialsService.storeCredentials(dbUserId, credentialData);
        res.json(result);

    } catch (error) {
        console.error('❌ AWS credentials storage error:', error);
        res.status(500).json({ success: false, error: 'Failed to store AWS credentials' });
    }
});

// Get AWS account info
router.get('/account-info', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Convert user ID to database format for consistency
        const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
            ? parseInt(userId.substring(5), 10)
            : userId;
            
        console.log(`🔍 Getting account info for user: ${userId} (DB ID: ${dbUserId})`);

        const result = await AwsCredentialsService.getCredentials(dbUserId);

        if (result.success) {
            // Return account info without sensitive credentials
            res.json({
                success: true,
                accountInfo: result.accountInfo
            });
        } else {
            res.status(404).json(result);
        }

    } catch (error) {
        console.error('❌ AWS account info error:', error);
        res.status(500).json({ success: false, error: 'Failed to get account info' });
    }
});

// Remove AWS credentials
router.delete('/credentials', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Convert user ID to database format for consistency
        const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
            ? parseInt(userId.substring(5), 10)
            : userId;
            
        console.log(`🔍 Removing credentials for user: ${userId} (DB ID: ${dbUserId})`);
        console.log(`   User ID variations to remove: ${userId}, ${dbUserId}, ${String(dbUserId)}`);
        
        // Remove from both storage systems
        const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
        
        // Remove from encrypted storage (try all ID formats)
        await AwsCredentialsService.removeCredentials(dbUserId);
        await AwsCredentialsService.removeCredentials(userId);
        await AwsCredentialsService.removeCredentials(String(dbUserId));
        
        // Remove from simple storage (try all ID formats)
        SimpleAwsCredentials.remove(dbUserId);
        SimpleAwsCredentials.remove(userId);
        SimpleAwsCredentials.remove(String(dbUserId));
        SimpleAwsCredentials.remove(Number(dbUserId));
        
        // Also try with 'user-' prefix
        if (!String(userId).startsWith('user-')) {
            SimpleAwsCredentials.remove(`user-${userId}`);
            SimpleAwsCredentials.remove(`user-${dbUserId}`);
        }
        
        console.log(`✅ Credentials removed from all storage systems for user ${dbUserId}`);
        console.log(`   Removed from encrypted storage: ${dbUserId}, ${userId}, ${String(dbUserId)}`);
        console.log(`   Removed from simple storage: ${dbUserId}, ${userId}, ${String(dbUserId)}, ${Number(dbUserId)}`);
        
        res.json({ success: true, message: 'AWS credentials removed successfully' });
    } catch (error) {
        console.error('❌ Error removing credentials:', error);
        res.status(500).json({ success: false, error: 'Failed to remove credentials' });
    }
});

module.exports = router;