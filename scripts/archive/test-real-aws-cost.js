const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function testRealAWSCost() {
    try {
        console.log('🧪 Testing Real AWS Cost Data\n');
        console.log('='.repeat(60));

        // Login (credentials from environment variables)
        console.log('\n🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Fetch cost data
        console.log('\n📊 Fetching cost data from AWS...');
        const costResponse = await axios.get(`${BASE_URL}/api/cost-data`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('\n📈 Cost Data Analysis:');
        console.log('='.repeat(60));

        const data = costResponse.data;
        
        if (!data.ResultsByTime || data.ResultsByTime.length === 0) {
            console.log('⚠️  No cost data available');
            return;
        }

        console.log(`\n📅 Date Range: ${data.ResultsByTime.length} days`);
        console.log(`   First Day: ${data.ResultsByTime[data.ResultsByTime.length - 1]?.TimePeriod?.Start}`);
        console.log(`   Last Day: ${data.ResultsByTime[0]?.TimePeriod?.Start}`);

        // Calculate total cost
        let totalCost = 0;
        const serviceMap = new Map();

        data.ResultsByTime.forEach(timePoint => {
            let dayCost = 0;
            
            timePoint.Groups?.forEach(group => {
                const serviceName = group.Keys[0];
                const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                
                if (costData?.Amount) {
                    const cost = parseFloat(costData.Amount);
                    totalCost += cost;
                    dayCost += cost;
                    
                    if (serviceMap.has(serviceName)) {
                        serviceMap.set(serviceName, serviceMap.get(serviceName) + cost);
                    } else {
                        serviceMap.set(serviceName, cost);
                    }
                }
            });
            
            console.log(`   ${timePoint.TimePeriod.Start}: $${Math.abs(dayCost).toFixed(2)}`);
        });

        console.log('\n💰 Total Cost Summary:');
        console.log('='.repeat(60));
        console.log(`   TOTAL: $${Math.abs(totalCost).toFixed(2)}`);
        console.log(`   Average per day: $${Math.abs(totalCost / data.ResultsByTime.length).toFixed(2)}`);

        // Top services
        const topServices = Array.from(serviceMap.entries())
            .map(([service, cost]) => ({ service, cost: Math.abs(cost) }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);

        console.log('\n🏆 Top 5 Services:');
        console.log('='.repeat(60));
        topServices.forEach((item, index) => {
            const percentage = ((item.cost / Math.abs(totalCost)) * 100).toFixed(1);
            console.log(`   ${index + 1}. ${item.service}: $${item.cost.toFixed(2)} (${percentage}%)`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test Complete!');
        console.log('\n📝 Compare this total with your AWS Console:');
        console.log(`   Dashboard shows: $${Math.abs(totalCost).toFixed(2)}`);
        console.log(`   AWS Console should show: ~$${Math.abs(totalCost).toFixed(2)}`);
        console.log('\n💡 If numbers don't match, check:');
        console.log('   1. Date range (month-to-date vs custom)');
        console.log('   2. AWS region');
        console.log('   3. Linked accounts');
        console.log('   4. Cost type (Blended vs Unblended)');

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
    }
}

testRealAWSCost();
