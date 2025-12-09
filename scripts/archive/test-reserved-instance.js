// Test script to verify Reserved Instance functionality
require('dotenv').config({ path: './backend/.env' });

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const ReservedInstanceService = require('./backend/src/services/reservedInstanceService');

async function testReservedInstance() {
    console.log('🧪 Testing Reserved Instance Feature\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    // Test 1: Check AWS Credentials
    console.log('2️⃣ Checking AWS credentials...');
    const creds = SimpleAwsCredentials.get(dbUserId);
    if (creds.success) {
        console.log('✅ AWS credentials loaded');
        console.log(`   Region: ${creds.credentials.region}`);
    } else {
        console.log('❌ AWS credentials not found');
        console.log('   Run: node store-aws-creds.js');
        process.exit(1);
    }

    // Test 2: Analyze Reserved Instances
    console.log('\n3️⃣ Testing analyzeReservedInstances()...');
    try {
        const analysis = await ReservedInstanceService.analyzeReservedInstances(
            creds.credentials,
            {
                includeRIRecommendations: true,
                analyzePeriod: 30,
                minSavingsThreshold: 10
            }
        );

        if (analysis.success) {
            console.log('✅ RI analysis completed');
            console.log(`   Total savings potential: $${analysis.data.savings.monthly.toFixed(2)}/month`);
            console.log(`   Annual savings: $${analysis.data.savings.annual.toFixed(2)}/year`);
            console.log(`   Recommendations: ${analysis.data.recommendations.length}`);
            
            if (analysis.data.recommendations.length > 0) {
                console.log('\n   Sample recommendation:');
                const rec = analysis.data.recommendations[0];
                console.log(`   - Instance Type: ${rec.instanceType}`);
                console.log(`   - Quantity: ${rec.quantity}`);
                console.log(`   - Monthly Savings: $${rec.monthlySavings.toFixed(2)}`);
            }
            
            console.log(`\n   Current RI Coverage: ${analysis.data.coverage.percentage.toFixed(1)}%`);
            console.log(`   Instances covered: ${analysis.data.coverage.coveredInstances}`);
            console.log(`   Instances not covered: ${analysis.data.coverage.uncoveredInstances}`);
        } else {
            console.log(`❌ Analysis failed: ${analysis.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.error(error.stack);
    }

    console.log('\n🎉 Reserved Instance testing complete!');
    process.exit(0);
}

testReservedInstance().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
