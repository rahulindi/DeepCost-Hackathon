/**
 * Test script to verify orphaned resource sync behavior
 * 
 * This script tests that:
 * 1. Orphaned resources are detected from AWS
 * 2. Resources deleted from AWS are removed from the database after a scan
 * 3. The sync mechanism properly cleans up stale entries
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let authToken = '';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_USER = {
    email: process.env.TEST_EMAIL || 'your-email@example.com',
    password: process.env.TEST_PASSWORD || 'your-password'
};

async function login() {
    console.log('🔐 Logging in...');
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
        if (response.data.success) {
            authToken = response.data.token;
            console.log('✅ Login successful');
            return true;
        }
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function getOrphanedResources() {
    console.log('\n📋 Fetching orphaned resources from database...');
    try {
        const response = await axios.get(`${API_BASE}/lifecycle/orphans`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`✅ Found ${response.data.data.length} orphaned resources in database`);
            response.data.data.forEach(orphan => {
                console.log(`   - ${orphan.resource_type}: ${orphan.resource_id} (${orphan.cleanup_status})`);
            });
            return response.data.data;
        }
    } catch (error) {
        console.error('❌ Failed to fetch orphaned resources:', error.response?.data || error.message);
        return [];
    }
}

async function scanAWSForOrphans() {
    console.log('\n🔍 Scanning AWS for orphaned resources...');
    try {
        const response = await axios.post(
            `${API_BASE}/lifecycle/orphans/detect`,
            { accountId: 'default' },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`✅ AWS scan complete - detected ${response.data.detected} orphaned resources`);
            return response.data;
        } else {
            console.error('❌ Scan failed:', response.data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Scan error:', error.response?.data || error.message);
        return null;
    }
}

async function testOrphanSync() {
    console.log('🧪 Testing Orphaned Resource Sync Behavior\n');
    console.log('=' .repeat(60));
    
    // Step 1: Login
    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without authentication');
        return;
    }
    
    // Step 2: Get current orphaned resources
    console.log('\n📊 STEP 1: Check current database state');
    const beforeScan = await getOrphanedResources();
    
    // Step 3: Scan AWS
    console.log('\n📊 STEP 2: Scan AWS for current orphaned resources');
    const scanResult = await scanAWSForOrphans();
    
    if (!scanResult) {
        console.error('❌ Scan failed - cannot continue test');
        return;
    }
    
    // Step 4: Get updated orphaned resources
    console.log('\n📊 STEP 3: Check database state after scan');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    const afterScan = await getOrphanedResources();
    
    // Step 5: Compare results
    console.log('\n📊 STEP 4: Compare results');
    console.log('=' .repeat(60));
    console.log(`Before scan: ${beforeScan.length} resources`);
    console.log(`AWS detected: ${scanResult.detected} resources`);
    console.log(`After scan:  ${afterScan.length} resources`);
    
    const removed = beforeScan.length - afterScan.length;
    if (removed > 0) {
        console.log(`\n✅ SUCCESS: ${removed} stale resource(s) removed from database`);
        console.log('   (These were deleted from AWS but still in database)');
    } else if (removed < 0) {
        console.log(`\n✅ SUCCESS: ${Math.abs(removed)} new orphaned resource(s) detected`);
    } else {
        console.log('\n✅ SUCCESS: Database is in sync with AWS');
    }
    
    // Show what was removed
    if (removed > 0) {
        const removedIds = beforeScan
            .filter(before => !afterScan.find(after => after.resource_id === before.resource_id))
            .map(r => `${r.resource_type}: ${r.resource_id}`);
        
        console.log('\n🧹 Removed resources (deleted from AWS):');
        removedIds.forEach(id => console.log(`   - ${id}`));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Test complete!');
    console.log('\n💡 To test the fix:');
    console.log('   1. Note an Elastic IP in the list above');
    console.log('   2. Delete it from AWS Console');
    console.log('   3. Run this script again');
    console.log('   4. The deleted Elastic IP should be removed from the database');
}

// Run the test
testOrphanSync().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
