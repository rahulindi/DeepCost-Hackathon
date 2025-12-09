const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class KeyGenerator {
    static generateRSAKeyPair() {
        console.log('🔐 Generating RSA256 key pair for JWT signing...');
        
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return { publicKey, privateKey };
    }

    static saveKeysSecurely(keys, keyDir = null) {
        const keysDir = keyDir || path.join(__dirname, '../keys');
        
        // Create keys directory if it doesn't exist
        if (!fs.existsSync(keysDir)) {
            fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 });
        }

        const privateKeyPath = path.join(keysDir, 'jwt_private.pem');
        const publicKeyPath = path.join(keysDir, 'jwt_public.pem');

        // Write private key (600 permissions - owner read/write only)
        fs.writeFileSync(privateKeyPath, keys.privateKey, { mode: 0o600 });
        
        // Write public key (644 permissions - owner read/write, others read)
        fs.writeFileSync(publicKeyPath, keys.publicKey, { mode: 0o644 });

        console.log('✅ RSA key pair saved securely:');
        console.log(`   Private key: ${privateKeyPath}`);
        console.log(`   Public key:  ${publicKeyPath}`);

        return {
            privateKeyPath,
            publicKeyPath
        };
    }

    static loadKeys(keyDir = null) {
        const keysDir = keyDir || path.join(__dirname, '../keys');
        const privateKeyPath = path.join(keysDir, 'jwt_private.pem');
        const publicKeyPath = path.join(keysDir, 'jwt_public.pem');

        try {
            if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
                console.log('🔑 RSA keys not found, generating new pair...');
                const keys = this.generateRSAKeyPair();
                this.saveKeysSecurely(keys, keyDir);
                return keys;
            }

            const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
            const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

            console.log('✅ Loaded existing RSA keys');
            return { privateKey, publicKey };
        } catch (error) {
            console.error('❌ Error loading RSA keys:', error);
            throw error;
        }
    }

    static rotateKeys(keyDir = null) {
        const keysDir = keyDir || path.join(__dirname, '../keys');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Backup existing keys
        try {
            const backupDir = path.join(keysDir, 'backup');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const privateKeyPath = path.join(keysDir, 'jwt_private.pem');
            const publicKeyPath = path.join(keysDir, 'jwt_public.pem');

            if (fs.existsSync(privateKeyPath)) {
                fs.copyFileSync(privateKeyPath, path.join(backupDir, `jwt_private_${timestamp}.pem`));
            }
            if (fs.existsSync(publicKeyPath)) {
                fs.copyFileSync(publicKeyPath, path.join(backupDir, `jwt_public_${timestamp}.pem`));
            }

            console.log('📦 Backed up existing keys');
        } catch (error) {
            console.warn('⚠️ Could not backup existing keys:', error.message);
        }

        // Generate and save new keys
        const newKeys = this.generateRSAKeyPair();
        this.saveKeysSecurely(newKeys, keyDir);

        console.log('🔄 Key rotation completed successfully');
        return newKeys;
    }

    static validateKeys(keys) {
        try {
            // Test signing and verification
            const testPayload = { test: 'payload', iat: Math.floor(Date.now() / 1000) };
            const testData = JSON.stringify(testPayload);
            
            // Sign with private key
            const signature = crypto.sign('RSA-SHA256', Buffer.from(testData), keys.privateKey);
            
            // Verify with public key
            const isValid = crypto.verify('RSA-SHA256', Buffer.from(testData), keys.publicKey, signature);
            
            if (!isValid) {
                throw new Error('Key pair validation failed - signature verification failed');
            }

            console.log('✅ RSA key pair validation successful');
            return true;
        } catch (error) {
            console.error('❌ RSA key pair validation failed:', error);
            return false;
        }
    }
}

module.exports = KeyGenerator;
