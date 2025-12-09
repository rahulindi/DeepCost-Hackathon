// Test script to verify Trend Analysis functionality
require('dotenv').config({ path: './backend/.env' });

const DatabaseService = require('./backend/src/services/databaseService');

async function testTrendAnalysis() {
    console.log('🧪 Testing Trend Analysis Feature\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    // Test 1: Get Monthly Trends
    console.log('2️⃣ Testing getMonthlyTrends()...');
    try {
        const trends = await DatabaseService.getMonthlyTrends(6, dbUserId);
        console.log(`✅ Retrieved ${trends.length} months of trend data`);
        
        if (trends.length > 0) {
            console.log(`   Latest month: ${trends[0].month_year} - $${trends[0].total_cost}`);
            console.log(`   Growth rate: ${trends[0].growth_rate || 0}%`);
        } else {
            console.log('   ⚠️  No trend data found (normal if no cost records yet)');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Get Service Trends
    console.log('\n3️⃣ Testing getServiceTrends()...');
    try {
        const serviceName = 'Amazon EC2';
        const trends = await DatabaseService.getServiceTrends(serviceName, 30, dbUserId);
        console.log(`✅ Retrieved ${trends.length} days of service trend data for ${serviceName}`);
        
        if (trends.length > 0) {
            console.log(`   Latest: ${trends[0].date} - $${trends[0].cost_amount}`);
        } else {
            console.log(`   ⚠️  No trend data for ${serviceName}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Calculate Trend Statistics
    console.log('\n4️⃣ Calculating trend statistics...');
    try {
        const trends = await DatabaseService.getMonthlyTrends(6, dbUserId);
        
        if (trends.length > 0) {
            const costs = trends.map(t => parseFloat(t.total_cost));
            const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
            const maxCost = Math.max(...costs);
            const minCost = Math.min(...costs);
            
            // Calculate trend direction
            const firstHalf = costs.slice(0, Math.floor(costs.length / 2));
            const secondHalf = costs.slice(Math.floor(costs.length / 2));
            const firstAvg = firstHalf.reduce((sum, cost) => sum + cost, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, cost) => sum + cost, 0) / secondHalf.length;
            const trendDiff = ((secondAvg - firstAvg) / firstAvg) * 100;
            
            let trendDirection = 'stable';
            if (trendDiff > 5) trendDirection = 'increasing';
            else if (trendDiff < -5) trendDirection = 'decreasing';
            
            console.log('✅ Trend statistics calculated');
            console.log(`   Average monthly cost: $${avgCost.toFixed(2)}`);
            console.log(`   Highest month: $${maxCost.toFixed(2)}`);
            console.log(`   Lowest month: $${minCost.toFixed(2)}`);
            console.log(`   Trend direction: ${trendDirection}`);
            console.log(`   Trend change: ${trendDiff.toFixed(1)}%`);
        } else {
            console.log('⚠️  No data to calculate statistics');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Check Cost Records Count
    console.log('\n5️⃣ Checking cost records...');
    try {
        const result = await DatabaseService.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT service_name) as services,
                MIN(date) as earliest,
                MAX(date) as latest,
                SUM(cost_amount) as total_cost
             FROM cost_records 
             WHERE user_id = $1`,
            [dbUserId]
        );
        
        if (result.rows.length > 0) {
            const stats = result.rows[0];
            console.log('✅ Cost records statistics:');
            console.log(`   Total records: ${stats.total}`);
            console.log(`   Unique services: ${stats.services}`);
            console.log(`   Date range: ${stats.earliest} to ${stats.latest}`);
            console.log(`   Total cost: $${parseFloat(stats.total_cost || 0).toFixed(2)}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Test Different Time Ranges
    console.log('\n6️⃣ Testing different time ranges...');
    try {
        const ranges = [3, 6, 12];
        
        for (const months of ranges) {
            const trends = await DatabaseService.getMonthlyTrends(months, dbUserId);
            console.log(`   ${months} months: ${trends.length} data points`);
        }
        console.log('✅ All time ranges working');
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Trend Analysis testing complete!');
    process.exit(0);
}

testTrendAnalysis().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
