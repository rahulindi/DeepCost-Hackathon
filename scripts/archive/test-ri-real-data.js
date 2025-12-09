// Test Reserved Instance Feature with Real AWS Data
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function testRIFeature() {
    console.log('🧪 Testing Reserved Instance Feature with Real AWS Data\n');
    console.log('='.repeat(60));
    
    try {
        // Step 1: Login (credentials from environment variables)
        console.log('\n1️⃣ Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Logged in successfully');
        
        // Step 2: Test RI Analysis
        console.log('\n2️⃣ Requesting RI Analysis...');
        console.log('   This will call REAL AWS APIs:');
        console.log('   - getReservationUtilization');
        console.log('   - getReservationCoverage');
        console.log('   - getReservationPurchaseRecommendation');
        console.log('   - getCostAndUsage');
        console.log('');
        
        const riResponse = await axios.get(`${BASE_URL}/api/ri/analysis`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (riResponse.data.success) {
            console.log('✅ RI Analysis completed successfully!\n');
            
            const data = riResponse.data.data;
            
            // Check data quality
            console.log('📊 Data Quality Check:');
            console.log('   Utilization is real:', data.dataQuality?.utilizationIsReal);
            console.log('   Coverage is real:', data.dataQuality?.coverageIsReal);
            console.log('   Has AWS recommendations:', data.dataQuality?.hasAwsRecommendations);
            console.log('   APIs called:', data.dataQuality?.apiCallsMade?.length || 0);
            console.log('');
            
            // Show utilization
            console.log('📈 RI Utilization:');
            if (data.utilization.ec2) {
                console.log(`   EC2: ${(data.utilization.ec2.averageUtilization * 100).toFixed(1)}%`);
                console.log(`   EC2 Monthly Cost: $${data.utilization.ec2.monthlyCost?.toFixed(2) || 0}`);
            }
            if (data.utilization.rds) {
                console.log(`   RDS: ${(data.utilization.rds.averageUtilization * 100).toFixed(1)}%`);
                console.log(`   RDS Monthly Cost: $${data.utilization.rds.monthlyCost?.toFixed(2) || 0}`);
            }
            console.log('');
            
            // Show coverage
            console.log('🎯 RI Coverage:');
            console.log(`   Coverage: ${(data.coverage.coveragePercentage * 100).toFixed(1)}%`);
            console.log(`   Covered Hours: ${data.coverage.coveredHours || 0}`);
            console.log(`   Uncovered Hours: ${data.coverage.uncoveredHours || 0}`);
            console.log('');
            
            // Show recommendations
            console.log('💡 Recommendations:');
            console.log(`   Total: ${data.recommendations.length}`);
            data.recommendations.forEach((rec, idx) => {
                console.log(`\n   ${idx + 1}. ${rec.service} - ${rec.instanceType}`);
                console.log(`      Priority: ${rec.priority.toUpperCase()}`);
                console.log(`      Monthly Savings: $${rec.estimatedMonthlySavings.toFixed(2)}`);
                console.log(`      AWS Recommendation: ${rec.isAwsRecommendation ? 'YES ✅' : 'No (analysis-based)'}`);
                console.log(`      Reasoning: ${rec.reasoning}`);
            });
            console.log('');
            
            // Show savings
            console.log('💰 Potential Savings:');
            console.log(`   Monthly: $${data.savings.monthly.toFixed(2)}`);
            console.log(`   Annual: $${data.savings.annual.toFixed(2)}`);
            console.log(`   3-Year: $${data.savings.threeYear.toFixed(2)}`);
            console.log('');
            
            // Final verdict
            console.log('='.repeat(60));
            if (data.dataQuality?.utilizationIsReal && data.dataQuality?.coverageIsReal) {
                console.log('✅ SUCCESS: Using 100% REAL AWS DATA!');
            } else {
                console.log('⚠️  PARTIAL: Some data is estimated (AWS APIs may have failed)');
            }
            console.log('='.repeat(60));
            
        } else {
            console.log('❌ RI Analysis failed:', riResponse.data.error);
            
            if (riResponse.data.requiresAwsSetup) {
                console.log('\n💡 TIP: You need to configure AWS credentials first');
                console.log('   Go to Dashboard → Settings → AWS Connection');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 TIP: Update login credentials in this script');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 TIP: Make sure backend is running on port 3001');
        }
    }
}

console.log('📝 Reserved Instance Real Data Test');
console.log('');
console.log('This test will:');
console.log('1. Login to your account');
console.log('2. Call the RI analysis endpoint');
console.log('3. Verify real AWS data is being used');
console.log('4. Show utilization, coverage, and recommendations');
console.log('');
console.log('⚠️  NOTE: This will make real AWS API calls (~$0.04 cost)');
console.log('');

testRIFeature();
