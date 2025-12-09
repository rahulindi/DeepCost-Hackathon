require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');

async function checkTrendData() {
    console.log('🔍 Checking Trend Data Directly from Database\n');

    try {
        // Get all users
        const usersResult = await DatabaseService.query('SELECT id, email FROM users');
        console.log(`Found ${usersResult.rows.length} users:\n`);
        
        for (const user of usersResult.rows) {
            console.log(`\n👤 User: ${user.email} (ID: ${user.id})`);
            console.log('='.repeat(60));
            
            // Get monthly trends
            const trends = await DatabaseService.getMonthlyTrends(6, user.id);
            console.log(`\n📊 Monthly Trends (${trends.length} months):`);
            
            if (trends.length === 0) {
                console.log('   ⚠️ No trend data available');
                continue;
            }
            
            trends.forEach((trend, index) => {
                console.log(`\n   Month ${index + 1}: ${trend.month_year}`);
                console.log(`   - Total Cost: $${parseFloat(trend.total_cost).toFixed(2)}`);
                console.log(`   - Growth Rate: ${trend.growth_rate || 0}%`);
                console.log(`   - Previous Cost: ${trend.prev_cost ? '$' + parseFloat(trend.prev_cost).toFixed(2) : 'N/A'}`);
                console.log(`   - Records: ${trend.record_count}`);
                
                if (trend.service_breakdown) {
                    const serviceCount = Object.keys(trend.service_breakdown).length;
                    console.log(`   - Services: ${serviceCount}`);
                    
                    // Show top 3 services
                    const topServices = Object.entries(trend.service_breakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);
                    
                    if (topServices.length > 0) {
                        console.log('   - Top Services:');
                        topServices.forEach(([service, cost]) => {
                            console.log(`     • ${service}: $${cost.toFixed(2)}`);
                        });
                    }
                }
            });
            
            // Analysis
            console.log('\n📈 Analysis:');
            const hasMultipleMonths = trends.length > 1;
            const hasGrowthData = trends.some(t => t.growth_rate && t.growth_rate !== 0);
            
            console.log(`   - Multiple months: ${hasMultipleMonths ? '✅ Yes' : '❌ No'}`);
            console.log(`   - Growth data available: ${hasGrowthData ? '✅ Yes' : '❌ No'}`);
            
            if (!hasMultipleMonths) {
                console.log('\n   ⚠️ ISSUE: Only 1 month of data');
                console.log('   Solution: Growth rate requires at least 2 months');
                console.log('   The chart will show 0% for the first month (no previous month to compare)');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkTrendData();
