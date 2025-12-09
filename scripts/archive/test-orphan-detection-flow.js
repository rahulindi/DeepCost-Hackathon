// Test script to verify orphan detection flow with AWS credentials
require('dotenv').config({ path: './backend/.env' });

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const OrphanDetectionService = require('./backend/src/services/orphanDetectionService');
const ResourceLifecycleService = require('./backend/src/services/resourceLifecycleService');

async function testOrphanDetectionFlow() {
    console.log('🧪 Testing Orphan Detection Flow\n');

    // Test user ID (from your auth token)
    const testUserId = 'user-1763658402716'; // Actual user ID from credentials
    const dbUserId = parseInt(testUserId.substring(5), 10);
    
    console.log(`1️⃣ Testing with User ID: ${testUserId}`);
    console.log(`   Database User ID: ${dbUserId}\n`);

    // Step 1: Check if credentials exist
    console.log('2️⃣ Checking AWS credentials...');
    const creds = SimpleAwsCredentials.get(dbUserId);
    if (!creds.success) {
        console.error(`❌ No AWS credentials found for user ${dbUserId}`);
        console.log('\n💡 Please run: node store-aws-creds.js');
        process.exit(1);
    }
    console.log(`✅ AWS credentials found for region: ${creds.credentials.region}\n`);

    // Step 2: Test OrphanDetectionService directly
    console.log('3️⃣ Testing OrphanDetectionService.detectOrphans()...');
    const orphanService = new OrphanDetectionService();
    
    try {
        const orphans = await orphanService.detectOrphans('test-account', null, testUserId);
        console.log(`✅ OrphanDetectionService worked! Found ${orphans.length} orphans\n`);
    } catch (error) {
        console.error(`❌ OrphanDetectionService failed:`, error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }

    // Step 3: Test ResourceLifecycleService
    console.log('4️⃣ Testing ResourceLifecycleService.detectOrphanedResources()...');
    const lifecycleService = new ResourceLifecycleService();
    
    try {
        const result = await lifecycleService.detectOrphanedResources('test-account', null, testUserId);
        console.log(`✅ ResourceLifecycleService worked!`);
        console.log(`   Detected: ${result.detected} orphans`);
        console.log(`   Success: ${result.success}\n`);
    } catch (error) {
        console.error(`❌ ResourceLifecycleService failed:`, error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }

    console.log('🎉 All tests passed! Orphan detection flow is working correctly.');
    process.exit(0);
}

testOrphanDetectionFlow().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
