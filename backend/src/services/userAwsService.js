const { Pool } = require('pg');
const crypto = require('crypto');

class UserAwsService {
    static async saveUserCredentials(userId, awsAccessKey, awsSecretKey, region = 'us-east-1') {
        // 🔒 SECURITY: Require ENCRYPTION_KEY to be set
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        
        // 🔒 SECURITY: Use createCipheriv instead of deprecated createCipher
        // NOTE: Static salt is used for key derivation. The IV (initialization vector)
        // is randomly generated per encryption operation, providing uniqueness.
        // For production, consider using a per-user salt stored alongside credentials.
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'aws-creds-salt-v1', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encryptedSecret = cipher.update(awsSecretKey, 'utf8', 'hex');
        encryptedSecret += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Store IV and authTag with encrypted data for decryption
        const encryptedData = {
            encrypted: encryptedSecret,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };

        // Mock implementation - skip database for now
        console.log('💾 Mock: Saved AWS credentials for user:', userId);
        return { success: true, encryptedData };
    }

    static async getUserCredentials(userId) {
        // Mock implementation
        return {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: 'us-east-1'
        };
    }

    /**
     * 🔒 SECURITY: Decrypt AWS credentials using modern encryption
     * @param {Object} encryptedData - Object containing encrypted, iv, and authTag
     * @returns {string} Decrypted secret key
     */
    static decryptCredentials(encryptedData) {
        // 🔒 SECURITY: Require ENCRYPTION_KEY to be set
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }

        const algorithm = 'aes-256-gcm';
        // NOTE: Salt must match the one used during encryption
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'aws-creds-salt-v1', 32);
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

module.exports = UserAwsService;