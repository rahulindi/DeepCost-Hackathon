// Test script to verify network interface detection
require('dotenv').config({ path: './backend/.env' });

const OrphanDetectionService = require('./backend/src/services/orphanDetectionService');

async function testNetworkInterfaceDetection() {
    console.log('🧪 Testing Network Interface Detection\n');

    const testUserId = 'user-1763658402716';
    
    console.log('1️⃣ Initializing OrphanDetectionService...');
    const orphanService = new OrphanDetectionService();
    
    try {
        console.log('2️⃣ Scanning AWS for orphaned resources...\n');
        const orphans = await orphanService.detectOrphans('test-account', null, testUserId);
        
        console.log(`✅ Scan complete! Found ${orphans.length} orphaned resources\n`);
        
        // Filter for network interfaces
        const networkInterfaces = orphans.filter(o => o.resourceType === 'Network Interface (ENI)');
        
        if (networkInterfaces.length > 0) {
            console.log(`🎉 Found ${networkInterfaces.length} unattached network interface(s):\n`);
            networkInterfaces.forEach((eni, idx) => {
                console.log(`${idx + 1}. ${eni.resourceId}`);
                console.log(`   Name: ${eni.metadata.name}`);
                console.log(`   Description: ${eni.metadata.description}`);
                console.log(`   Private IP: ${eni.metadata.privateIp}`);
                console.log(`   VPC: ${eni.metadata.vpcId}`);
                console.log(`   Subnet: ${eni.metadata.subnetId}`);
                console.log(`   Type: ${eni.metadata.interfaceType}`);
                console.log(`   Status: ${eni.orphanType}`);
                console.log('');
            });
        } else {
            console.log('ℹ️  No unattached network interfaces found.');
            console.log('   This could mean:');
            console.log('   - All ENIs are attached to instances');
            console.log('   - The ENI you created might still be initializing');
            console.log('   - The ENI might be in a different region\n');
        }
        
        // Show all detected orphans
        console.log('📋 All orphaned resources:');
        orphans.forEach((orphan, idx) => {
            console.log(`${idx + 1}. ${orphan.resourceType}: ${orphan.resourceId}`);
        });
        
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testNetworkInterfaceDetection();
