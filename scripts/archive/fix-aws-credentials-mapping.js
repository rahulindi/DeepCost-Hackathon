// Fix AWS credentials mapping for new user IDs
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const DatabaseService = require('./backend/src/services/databaseService');

const AWS_CREDS_FILE = path.join(__dirname, 'backend/src/data/aws-credentials.json');

async function fixAwsCredentialsMapping() {
    console.log('🔧 Fixing AWS Credentials Mapping\n');
    console.log('='.repeat(80));
    
    try {
        // Step 1: Get current user from database
        console.log('\n📋 Step 1: Getting user from database...');
        const userResult = await DatabaseService.query('SELECT * FROM users WHERE email = $1', ['testdemo1@demo.com']);
        
        if (userResult.rows.length === 0) {
            console.log('❌ testdemo1 user not found in database');
            return;
        }
        
        const user = userResult.rows[0];
        console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);
        
        // Step 2: Load AWS credentials file
        console.log('\n📋 Step 2: Loading AWS credentials file...');
        
        if (!fs.existsSync(AWS_CREDS_FILE)) {
            console.log('⚠️  No aws-credentials.json file found');
            console.log('💡 You can add AWS credentials through the UI after login');
            return;
        }
        
        const awsCreds = JSON.parse(fs.readFileSync(AWS_CREDS_FILE, 'utf8'));
        console.log(`✅ Loaded credentials file`);
        console.log(`   Available user IDs: ${Object.keys(awsCreds).join(', ')}`);
        
        // Step 3: Check if credentials already exist for new user ID
        const newUserId = user.id.toString();
        
        if (awsCreds[newUserId]) {
            console.log(`\n✅ Credentials already exist for user ID ${newUserId}`);
            console.log('   No changes needed!');
            return;
        }
        
        // Step 4: Find old credentials (look for the most recent one)
        console.log('\n📋 Step 3: Looking for existing credentials to migrate...');
        
        const oldUserIds = Object.keys(awsCreds).filter(id => id !== newUserId);
        
        if (oldUserIds.length === 0) {
            console.log('⚠️  No existing credentials found');
            console.log('💡 You can add AWS credentials through the UI after login');
            return;
        }
        
        // Find the most recent credentials
        let mostRecentId = oldUserIds[0];
        let mostRecentDate = new Date(awsCreds[oldUserIds[0]].createdAt || 0);
        
        for (const oldId of oldUserIds) {
            const createdAt = new Date(awsCreds[oldId].createdAt || 0);
            if (createdAt > mostRecentDate) {
                mostRecentDate = createdAt;
                mostRecentId = oldId;
            }
        }
        
        console.log(`✅ Found credentials from user ID: ${mostRecentId}`);
        console.log(`   Created: ${awsCreds[mostRecentId].createdAt}`);
        console.log(`   Alias: ${awsCreds[mostRecentId].alias}`);
        
        // Step 5: Copy credentials to new user ID
        console.log('\n📋 Step 4: Copying credentials to new user ID...');
        
        awsCreds[newUserId] = {
            ...awsCreds[mostRecentId],
            createdAt: new Date().toISOString() // Update timestamp
        };
        
        // Step 6: Save updated credentials
        const backup = AWS_CREDS_FILE.replace('.json', `.backup-${Date.now()}.json`);
        fs.copyFileSync(AWS_CREDS_FILE, backup);
        console.log(`✅ Backup created: ${path.basename(backup)}`);
        
        fs.writeFileSync(AWS_CREDS_FILE, JSON.stringify(awsCreds, null, 2));
        console.log(`✅ Credentials file updated`);
        
        // Step 7: Verify
        console.log('\n📋 Step 5: Verifying...');
        const updatedCreds = JSON.parse(fs.readFileSync(AWS_CREDS_FILE, 'utf8'));
        
        if (updatedCreds[newUserId]) {
            console.log(`✅ Credentials successfully mapped to user ID ${newUserId}`);
            console.log(`   Alias: ${updatedCreds[newUserId].alias}`);
            console.log(`   Type: ${updatedCreds[newUserId].type}`);
            console.log(`   Active: ${updatedCreds[newUserId].isActive}`);
        } else {
            console.log('❌ Verification failed');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ AWS CREDENTIALS MAPPING FIXED!');
        console.log('='.repeat(80));
        console.log('\n📝 Summary:');
        console.log(`   User: ${user.username} (${user.email})`);
        console.log(`   Database ID: ${user.id}`);
        console.log(`   AWS Credentials: ✅ Mapped`);
        console.log('\n💡 You can now login and access AWS cost data!');
        
    } catch (error) {
        console.error('\n❌ Fix failed:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run fix
if (require.main === module) {
    fixAwsCredentialsMapping()
        .then(() => {
            console.log('\n✅ Fix script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Fix script failed:', error);
            process.exit(1);
        });
}

module.exports = fixAwsCredentialsMapping;
