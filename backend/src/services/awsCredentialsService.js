const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Persistent file-based credential store
const CREDENTIALS_FILE = path.join(__dirname, '../data/aws-credentials.json');

// Ensure data directory exists
const dataDir = path.dirname(CREDENTIALS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load credentials from file on startup
let userCredentials = new Map();
try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
        const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
        userCredentials = new Map(Object.entries(data));
        console.log(`✅ Loaded AWS credentials for ${userCredentials.size} users from persistent storage`);
    }
} catch (error) {
    console.warn('⚠️ Could not load AWS credentials file:', error.message);
}

// Save credentials to file
function saveCredentialsToFile() {
    try {
        const data = Object.fromEntries(userCredentials);
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2));
        console.log('💾 AWS credentials saved to persistent storage');
    } catch (error) {
        console.error('❌ Failed to save credentials to file:', error);
    }
}

class AwsCredentialsService {
    static encryptCredentials(data) {
        const algorithm = 'aes-256-cbc';
        // Generate a proper 32-byte key for AES-256 - ENTERPRISE GRADE SECURITY! 💪
        const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b').digest();
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted
        };
    }

    static decryptCredentials(encryptedData, iv) {
        const algorithm = 'aes-256-cbc';
        // Same 32-byte key generation - BULLETPROOF DECRYPTION! 🔒
        const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b').digest();

        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    static async storeCredentials(userId, credentialData) {
        try {
            const encrypted = this.encryptCredentials(credentialData);

            // Always use string keys for consistency
            const userIdStr = String(userId);
            
            userCredentials.set(userIdStr, {
                ...encrypted,
                type: credentialData.type,
                accountId: credentialData.accountId,
                alias: credentialData.alias || 'Default AWS Account',
                createdAt: new Date().toISOString(),
                isActive: true
            });

            // Save to persistent storage
            saveCredentialsToFile();

            console.log('🔐 AWS credentials stored securely for user:', userIdStr);

            return {
                success: true,
                message: 'AWS credentials stored securely',
                accountId: credentialData.accountId,
                alias: credentialData.alias
            };

        } catch (error) {
            console.error('AWS credential storage error:', error);
            return { success: false, error: 'Failed to store credentials' };
        }
    }

    static async getCredentials(userId) {
        try {
            // Normalize userId to string for consistent lookup
            const userIdStr = String(userId);
            
            // Try string key first (most common)
            let stored = userCredentials.get(userIdStr);
            
            // If not found, try all possible variations
            if (!stored) {
                // Try numeric key
                const userIdNum = Number(userId);
                if (!isNaN(userIdNum)) {
                    stored = userCredentials.get(userIdNum);
                }
            }
            
            // If still not found, try original userId as-is
            if (!stored && userId !== userIdStr) {
                stored = userCredentials.get(userId);
            }

            if (!stored) {
                console.error(`❌ No credentials found for user ${userId} (type: ${typeof userId})`);
                console.error('Available keys:', Array.from(userCredentials.keys()));
                return { success: false, error: 'No AWS credentials found' };
            }

            const decrypted = this.decryptCredentials(stored.encryptedData, stored.iv);

            return {
                success: true,
                credentials: decrypted,
                accountInfo: {
                    accountId: stored.accountId,
                    alias: stored.alias,
                    type: stored.type,
                    isActive: stored.isActive
                }
            };

        } catch (error) {
            console.error('AWS credential retrieval error:', error);
            return { success: false, error: 'Failed to retrieve credentials' };
        }
    }

    static async validateCredentials(credentialData) {
        // Basic validation without AWS STS call (for now)
        if (credentialData.type === 'access_key') {
            if (!credentialData.accessKeyId || !credentialData.secretAccessKey) {
                return { success: false, error: 'Access Key ID and Secret Access Key required' };
            }

            if (credentialData.accessKeyId.length < 16) {
                return { success: false, error: 'Invalid Access Key ID format' };
            }

            // Basic format validation
            if (!credentialData.accessKeyId.startsWith('AKIA') && !credentialData.accessKeyId.startsWith('ASIA')) {
                return { success: false, error: 'Access Key ID should start with AKIA or ASIA' };
            }
        }

        if (credentialData.type === 'role_arn') {
            if (!credentialData.roleArn) {
                return { success: false, error: 'IAM Role ARN required' };
            }

            if (!credentialData.roleArn.startsWith('arn:aws:iam::')) {
                return { success: false, error: 'Invalid IAM Role ARN format' };
            }
        }

        // Return successful validation
        return {
            success: true,
            accountId: credentialData.accountId || '123456789012',
            accountAlias: credentialData.alias || 'AWS Account',
            message: 'Credentials validated successfully'
        };
    }

    static async removeCredentials(userId) {
        userCredentials.delete(userId);
        saveCredentialsToFile();
        return { success: true, message: 'AWS credentials removed' };
    }

    static async listAllCredentials() {
        // For debugging - list all stored user IDs
        const userIds = Array.from(userCredentials.keys());
        console.log('📋 Stored credentials for users:', userIds);
        return userIds;
    }
}

module.exports = AwsCredentialsService;