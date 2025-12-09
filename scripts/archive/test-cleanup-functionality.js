// Test script to verify resource cleanup functionality
require('dotenv').config({ path: './backend/.env' });

const OrphanDetectionService = require('./backend/src/services/orphanDetectionService');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function testCleanupFunctionality() {
    console.log('🧪 Testing Resource Cleanup Functionality\n');
    console.log('⚠️  WARNING: This will test REAL AWS resource deletion!');
    console.log('   Only proceed if you want to delete test resources.\n');

    const testUserId = 'user-1763658402716';
    
    // Step 1: Scan for orphaned resources
    console.log('1️⃣ Scanning for orphaned resources...\n');
    const orphanService = new OrphanDetectionService();
    
    try {
        const orphans = await orphanService.detectOrphans('test-account', null, testUserId);
        
        if (orphans.length === 0) {
            console.log('ℹ️  No orphaned resources found to test cleanup.');
            console.log('   Create a test resource (like an unattached ENI) and try again.');
            rl.close();
            process.exit(0);
        }
        
        console.log(`✅ Found ${orphans.length} orphaned resource(s):\n`);
        orphans.forEach((orphan, idx) => {
            console.log(`${idx + 1}. ${orphan.resourceType}: ${orphan.resourceId}`);
            console.log(`   Savings: $${orphan.potentialSavings}/month`);
            console.log(`   Risk: ${orphan.riskLevel}`);
            console.log('');
        });
        
        // Step 2: Ask user which resource to cleanup
        const answer = await question('Enter the number of the resource to cleanup (or "q" to quit): ');
        
        if (answer.toLowerCase() === 'q') {
            console.log('Cleanup test cancelled.');
            rl.close();
            process.exit(0);
        }
        
        const index = parseInt(answer) - 1;
        if (isNaN(index) || index < 0 || index >= orphans.length) {
            console.log('❌ Invalid selection.');
            rl.close();
            process.exit(1);
        }
        
        const selectedOrphan = orphans[index];
        console.log(`\n📋 Selected resource:`);
        console.log(`   Type: ${selectedOrphan.resourceType}`);
        console.log(`   ID: ${selectedOrphan.resourceId}`);
        console.log(`   Risk: ${selectedOrphan.riskLevel}\n`);
        
        // Step 3: Confirm deletion
        const confirm = await question('⚠️  Are you sure you want to DELETE this resource? (yes/no): ');
        
        if (confirm.toLowerCase() !== 'yes') {
            console.log('Cleanup cancelled.');
            rl.close();
            process.exit(0);
        }
        
        // Step 4: Perform cleanup
        console.log('\n2️⃣ Performing cleanup...\n');
        
        // Convert orphan object to match database format
        const orphanForCleanup = {
            resource_id: selectedOrphan.resourceId,
            resource_type: selectedOrphan.resourceType,
            potential_savings: selectedOrphan.potentialSavings
        };
        
        const cleanupResult = await orphanService.cleanupResource(orphanForCleanup, testUserId);
        
        if (cleanupResult.success) {
            console.log('✅ CLEANUP SUCCESSFUL!');
            console.log(`   Message: ${cleanupResult.message}`);
            console.log(`   Savings: $${cleanupResult.savings}/month`);
            console.log('\n🎉 Resource has been deleted from AWS!');
            console.log('   You can verify in the AWS Console.');
        } else {
            console.log('❌ CLEANUP FAILED!');
            console.log(`   Error: ${cleanupResult.error}`);
            if (cleanupResult.awsError) {
                console.log(`   AWS Error Code: ${cleanupResult.awsError}`);
            }
        }
        
        rl.close();
        process.exit(cleanupResult.success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        rl.close();
        process.exit(1);
    }
}

testCleanupFunctionality();
