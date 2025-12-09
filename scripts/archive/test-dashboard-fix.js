// Test to verify dashboard shows correct user-specific data
require('dotenv').config({ path: './backend/.env' });

const axios = require('axios');

async function testDashboardFix() {
    console.log('🧪 Testing Dashboard Data Fix\n');
    console.log('='  .repeat(80) + '\n');

    // Test user credentials
    // 🔒 SECURITY: Use environment variables for credentials
    const testUser = {
        email: process.env.TEST_EMAIL || 'your-email@example.com',
        password: process.env.TEST_PASSWORD || 'your-password'
    };

    try {
        // Step 1: Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', testUser);
        
        if (!loginResponse.data.token) {
            console.log('❌ Login failed - no token received');
            console.log('   Response:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.token;
        const userId = loginResponse.data.user.id;
        console.log(`✅ Logged in successfully`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);

        // Step 2: Fetch cost data
        console.log('\n2️⃣ Fetching cost data from /api/cost-data...');
        const costResponse = await axios.get('http://localhost:3001/api/cost-data', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Cost data received');
        console.log(`   Response keys: ${Object.keys(costResponse.data).join(', ')}`);
        
        if (costResponse.data.ResultsByTime) {
            console.log(`   ResultsByTime length: ${costResponse.data.ResultsByTime.length}`);
            
            // Calculate total cost
            let totalCost = 0;
            let totalServices = new Set();
            
            costResponse.data.ResultsByTime.forEach(timePoint => {
                if (timePoint.Groups) {
                    timePoint.Groups.forEach(group => {
                        const serviceName = group.Keys[0];
                        const cost = parseFloat(group.Metrics?.BlendedCost?.Amount || 0);
                        totalCost += cost;
                        totalServices.add(serviceName);
                    });
                }
            });
            
            console.log(`\n   📊 Dashboard Summary:`);
            console.log(`      Total Cost: $${totalCost.toFixed(2)}`);
            console.log(`      Unique Services: ${totalServices.size}`);
            console.log(`      Date Points: ${costResponse.data.ResultsByTime.length}`);
            
            // Show top services
            const serviceCosts = {};
            costResponse.data.ResultsByTime.forEach(timePoint => {
                if (timePoint.Groups) {
                    timePoint.Groups.forEach(group => {
                        const serviceName = group.Keys[0];
                        const cost = parseFloat(group.Metrics?.BlendedCost?.Amount || 0);
                        serviceCosts[serviceName] = (serviceCosts[serviceName] || 0) + cost;
                    });
                }
            });
            
            const sortedServices = Object.entries(serviceCosts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            console.log(`\n   🏆 Top 5 Services:`);
            sortedServices.forEach(([service, cost], idx) => {
                console.log(`      ${idx + 1}. ${service}: $${cost.toFixed(4)}`);
            });
        }

        // Step 3: Compare with database
        console.log('\n3️⃣ Comparing with database records...');
        const DatabaseService = require('./backend/src/services/databaseService');
        
        const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
            ? parseInt(userId.substring(5), 10)
            : userId;
        
        const dbResult = await DatabaseService.query(`
            SELECT 
                COUNT(*) as total_records,
                SUM(cost_amount) as total_cost,
                COUNT(DISTINCT service_name) as service_count,
                MIN(date) as earliest_date,
                MAX(date) as latest_date
            FROM cost_records
            WHERE user_id = $1
        `, [dbUserId]);
        
        if (dbResult.rows.length > 0) {
            const dbStats = dbResult.rows[0];
            console.log('✅ Database records found:');
            console.log(`   Total Records: ${dbStats.total_records}`);
            console.log(`   Total Cost: $${parseFloat(dbStats.total_cost || 0).toFixed(2)}`);
            console.log(`   Unique Services: ${dbStats.service_count}`);
            console.log(`   Date Range: ${dbStats.earliest_date} to ${dbStats.latest_date}`);
            
            // Verify match
            const apiTotal = totalCost;
            const dbTotal = parseFloat(dbStats.total_cost || 0);
            const difference = Math.abs(apiTotal - dbTotal);
            
            console.log(`\n   🔍 Verification:`);
            console.log(`      API Total: $${apiTotal.toFixed(2)}`);
            console.log(`      DB Total: $${dbTotal.toFixed(2)}`);
            console.log(`      Difference: $${difference.toFixed(2)}`);
            
            if (difference < 0.01) {
                console.log(`      ✅ MATCH! Dashboard shows correct user-specific data`);
            } else if (difference < 1.00) {
                console.log(`      ⚠️  Small difference (acceptable rounding)`);
            } else {
                console.log(`      ❌ MISMATCH! Dashboard may not be showing user-specific data`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ Dashboard fix test complete!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

testDashboardFix().catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});
