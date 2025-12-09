#!/usr/bin/env node

/**
 * 🔒 SECURITY: Secret Generator
 * Generates cryptographically secure random secrets for .env file
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating Secure Secrets for AWS Cost Tracker\n');
console.log('='.repeat(60));

// Generate secrets
const secrets = {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    DATA_LAKE_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex')
};

// Display generated secrets
console.log('\n📝 Generated Secrets (copy to your .env file):\n');
console.log('# JWT Secrets');
console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);
console.log(`JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`);
console.log('');
console.log('# Encryption Keys');
console.log(`ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}`);
console.log(`DATA_LAKE_ENCRYPTION_KEY=${secrets.DATA_LAKE_ENCRYPTION_KEY}`);
console.log('');
console.log('# Session Secret');
console.log(`SESSION_SECRET=${secrets.SESSION_SECRET}`);
console.log('');
console.log('='.repeat(60));

// Offer to create .env file
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
    console.log('\n⚠️  .env file already exists!');
    console.log('   Please manually copy the secrets above to your .env file');
    console.log('   or delete the existing .env file and run this script again.');
} else if (fs.existsSync(envExamplePath)) {
    console.log('\n💡 Would you like to create .env file from .env.example?');
    console.log('   Run: node generate-secrets.js --create');
    
    if (process.argv.includes('--create')) {
        try {
            // Read .env.example
            let envContent = fs.readFileSync(envExamplePath, 'utf8');
            
            // Replace placeholders with generated secrets
            envContent = envContent.replace(/JWT_SECRET=.*/,  `JWT_SECRET=${secrets.JWT_SECRET}`);
            envContent = envContent.replace(/JWT_REFRESH_SECRET=.*/, `JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`);
            envContent = envContent.replace(/ENCRYPTION_KEY=.*/, `ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}`);
            envContent = envContent.replace(/DATA_LAKE_ENCRYPTION_KEY=.*/, `DATA_LAKE_ENCRYPTION_KEY=${secrets.DATA_LAKE_ENCRYPTION_KEY}`);
            envContent = envContent.replace(/SESSION_SECRET=.*/, `SESSION_SECRET=${secrets.SESSION_SECRET}`);
            
            // Write .env file
            fs.writeFileSync(envPath, envContent);
            
            console.log('\n✅ Created .env file with generated secrets!');
            console.log('   Please review and update database credentials and other settings.');
        } catch (error) {
            console.error('\n❌ Error creating .env file:', error.message);
        }
    }
} else {
    console.log('\n⚠️  .env.example not found!');
    console.log('   Please manually create .env file with the secrets above.');
}

console.log('\n🔒 Security Notes:');
console.log('   1. Keep these secrets secure and never commit them to git');
console.log('   2. Use different secrets for dev/staging/production');
console.log('   3. Rotate secrets regularly in production');
console.log('   4. Store production secrets in a secure vault');
console.log('');
