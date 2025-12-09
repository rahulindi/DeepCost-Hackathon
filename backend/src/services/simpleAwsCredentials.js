/**
 * Simple AWS Credentials Storage (No Encryption)
 * For development/demo purposes
 * WARNING: In production, use proper encryption!
 */

const fs = require('fs');
const path = require('path');

const CREDS_FILE = path.join(__dirname, '../data/aws-creds-simple.json');

// Load credentials on module initialization
let credentialsCache = {};
try {
    if (fs.existsSync(CREDS_FILE)) {
        credentialsCache = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
        console.log(`✅ SimpleAwsCredentials loaded for ${Object.keys(credentialsCache).length} users`);
    } else {
        console.log('⚠️ No aws-creds-simple.json file found');
    }
} catch (error) {
    console.error('❌ Error loading SimpleAwsCredentials:', error);
}

class SimpleAwsCredentials {
    static store(userId, accessKeyId, secretAccessKey, region = 'ap-south-1') {
        try {
            const dataDir = path.dirname(CREDS_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            credentialsCache[userId] = {
                accessKeyId,
                secretAccessKey,
                region,
                storedAt: new Date().toISOString()
            };

            fs.writeFileSync(CREDS_FILE, JSON.stringify(credentialsCache, null, 2));
            console.log(`✅ Credentials stored for user ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to store credentials:', error);
            return { success: false, error: error.message };
        }
    }

    static get(userId) {
        try {
            // Try to get credentials with the provided userId
            let creds = credentialsCache[userId];
            
            // If not found and userId is a string starting with 'user-', try numeric version
            if (!creds && typeof userId === 'string' && userId.startsWith('user-')) {
                const numericId = parseInt(userId.substring(5), 10);
                creds = credentialsCache[numericId];
            }
            
            // If not found and userId is numeric, try string version
            if (!creds && typeof userId === 'number') {
                creds = credentialsCache[String(userId)];
            }

            if (!creds) {
                // This is normal - will fallback to encrypted credentials
                console.log(`ℹ️  SimpleAwsCredentials: No credentials for user ${userId}, will try encrypted storage`);
                return { success: false, error: 'No credentials for this user' };
            }

            return {
                success: true,
                credentials: {
                    accessKeyId: creds.accessKeyId,
                    secretAccessKey: creds.secretAccessKey,
                    region: creds.region
                }
            };
        } catch (error) {
            console.error('❌ Failed to get credentials:', error);
            return { success: false, error: error.message };
        }
    }

    static remove(userId) {
        try {
            delete credentialsCache[userId];
            fs.writeFileSync(CREDS_FILE, JSON.stringify(credentialsCache, null, 2));
            
            console.log(`✅ Credentials removed for user ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to remove credentials:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = SimpleAwsCredentials;
