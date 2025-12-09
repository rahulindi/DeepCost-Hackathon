// Test script to simulate the actual API flow for orphan detection
require('dotenv').config({ path: './backend/.env' });

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const ResourceLifecycleService = require('./backend/src/services/resourceLifecycleService');

async function testOrphanAPIFlow() {
    console.log('🧪 Testing Orphan Detection API Flow (Simulating Real Request)\n');

    // Simulate the request from frontend
    const mockRequest = {
        user: {
            id: 'user-1763658402716' // This comes from JWT token
        },
        body: {
            accountId: 'test-account',
            service: null
        }
    };

    console.log('1️⃣ Simulating API Request:');
    console.log(`   User ID from token: ${mockRequest.user.id}`);
    console.log(`   Account ID: ${mockRequest.body.accountId}\n`);

    // Step 1: Convert user ID (like the route does)
    const convertUserId = (userId) => {
        if (typeof userId === 'string' && userId.startsWith('user-')) {
            return parseInt(userId.substring(5), 10);
        }
        return userId;
    };

    const userId = mockRequest.user.id;
    const dbUserId = convertUserId(userId);
    
    console.log('2️⃣ User ID Conversion:');
    console.log(`   Original: ${userId}`);
    console.log(`   Converted: ${dbUserId}\n`);

    // Step 2: Check credentials exist
    console.log('3️⃣ Checking AWS Credentials:');
    const creds = SimpleAwsCredentials.get(dbUserId);
    if (!creds.success) {
        console.error(`❌ No AWS credentials found for user ${dbUserId}`);
        console.log('\n💡 Solution: Configure AWS credentials in the UI Settings');
        process.exit(1);
    }
    console.log(`✅ AWS credentials found\n`);

    // Step 3: Call the service (like the route does)
    console.log('4️⃣ Calling ResourceLifecycleService.detectOrphanedResources():');
    const lifecycleService = new ResourceLifecycleService();
    
    try {
        const result = await lifecycleService.detectOrphanedResources(
            mockRequest.body.accountId,
            mockRequest.body.service,
            dbUserId  // CRITICAL: Pass the converted userId
        );
        
        console.log(`✅ Success!`);
        console.log(`   Detected: ${result.detected} orphaned resources`);
        console.log(`   Data length: ${result.data.length}`);
        
        if (result.data.length > 0) {
            console.log('\n📋 Sample orphaned resource:');
            const sample = result.data[0];
            console.log(`   - Resource ID: ${sample.resourceId}`);
            console.log(`   - Type: ${sample.resourceType}`);
            console.log(`   - Service: ${sample.serviceName}`);
            console.log(`   - Potential Savings: $${sample.potentialSavings}/month`);
        }
        
        console.log('\n🎉 API Flow Test PASSED!');
        console.log('✅ The orphan detection is working correctly with user credentials.');
        process.exit(0);
        
    } catch (error) {
        console.error(`❌ API call failed:`, error.message);
        console.error('\nStack trace:');
        console.error(error.stack);
        process.exit(1);
    }
}

testOrphanAPIFlow().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
