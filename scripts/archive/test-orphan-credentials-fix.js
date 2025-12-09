/**
 * Test Orphan Detection Credentials Fix
 * Verifies that OrphanDetectionService can find credentials from both storage systems
 */

const OrphanDetectionService = require('./backend/src/services/orphanDetectionService');

const userId = 2; // User ID from the error message

async function testCredentialsFix() {
    console.log('🧪 Testing Orphan Detection Credentials Fix\n');
    console.log(`Testing with user ID: ${userId}\n`);
    
    try {
        const service = new OrphanDetectionService();
        
        console.log('Step 1: Initialize AWS with user credentials...');
        const initialized = await service.initializeAWS(userId);
        
        if (!initialized) {
            console.error('\n❌ FAILED: Could not initialize AWS credentials');
            console.log('\nPossible reasons:');
            console.log('1. No credentials stored for user 2');
            console.log('2. Credentials are invalid');
            console.log('\nTo fix: Run store-aws-creds.js to store credentials');
            return;
        }
        
        console.log('\n✅ SUCCESS: AWS credentials loaded successfully!');
        console.log('\nStep 2: Testing orphan detection...');
        
        const orphans = await service.detectOrphans('test-account', null, userId);
        
        console.log(`\n✅ Orphan detection completed successfully!`);
        console.log(`Found ${orphans.length} orphaned resources\n`);
        
        if (orphans.length > 0) {
            console.log('Sample orphaned resources:');
            orphans.slice(0, 3).forEach(orphan => {
                console.log(`  - ${orphan.resourceType}: ${orphan.resourceId}`);
                console.log(`    Potential savings: $${orphan.potentialSavings}/month`);
            });
        }
        
        console.log('\n🎉 All tests passed! The credentials fix is working.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nFull error:', error);
    }
}

testCredentialsFix();
