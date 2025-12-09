/**
 * Fix User 2 Credentials - Remove Corrupted Encrypted Credentials
 * This will clear the corrupted encrypted credentials so you can store fresh ones
 */

const fs = require('fs');
const path = require('path');

const encryptedFile = path.join(__dirname, 'backend/src/data/aws-credentials.json');

console.log('🔧 Fixing User 2 Credentials\n');

try {
    if (fs.existsSync(encryptedFile)) {
        const data = JSON.parse(fs.readFileSync(encryptedFile, 'utf8'));
        
        console.log('Current encrypted credentials for users:', Object.keys(data));
        
        if (data['2']) {
            console.log('\n⚠️  Found corrupted credentials for user 2');
            console.log('   Removing corrupted entry...');
            
            delete data['2'];
            
            fs.writeFileSync(encryptedFile, JSON.stringify(data, null, 2));
            
            console.log('✅ Corrupted credentials removed\n');
            console.log('📝 Next steps:');
            console.log('   1. Store fresh credentials using:');
            console.log('      node store-aws-creds-user2.js YOUR_ACCESS_KEY YOUR_SECRET_KEY ap-south-1');
            console.log('\n   2. Or use the simpler method:');
            console.log('      node quick-store-creds.js');
        } else {
            console.log('✅ No corrupted credentials found for user 2');
        }
    } else {
        console.log('✅ No encrypted credentials file found - starting fresh');
    }
} catch (error) {
    console.error('❌ Error:', error.message);
}
