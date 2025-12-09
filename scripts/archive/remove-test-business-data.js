require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');

async function removeTestBusinessData() {
    console.log('🧹 Removing Test Business Metrics Data\n');
    console.log('='.repeat(60));

    try {
        // Check current data
        console.log('\n1️⃣ Checking current business metrics...');
        const checkResult = await DatabaseService.query(
            'SELECT COUNT(*) as count FROM business_metrics'
        );
        
        console.log(`   Current records: ${checkResult.rows[0].count}`);

        if (parseInt(checkResult.rows[0].count) === 0) {
            console.log('   ✅ No test data to remove');
        } else {
            // Delete all test business metrics
            console.log('\n2️⃣ Deleting test business metrics...');
            await DatabaseService.query('DELETE FROM business_metrics');
            console.log('   ✅ Test data removed');
        }

        // Verify deletion
        console.log('\n3️⃣ Verifying deletion...');
        const verifyResult = await DatabaseService.query(
            'SELECT COUNT(*) as count FROM business_metrics'
        );
        console.log(`   Remaining records: ${verifyResult.rows[0].count}`);

        // Test forecasting without business metrics
        console.log('\n4️⃣ Testing cost-only forecasting...');
        const BusinessForecastingService = require('./backend/src/services/businessForecastingService');
        
        const usersResult = await DatabaseService.query('SELECT id FROM users LIMIT 1');
        const userId = usersResult.rows[0].id;
        
        const forecast = await BusinessForecastingService.generateBusinessForecast(userId, {
            months: 6,
            includeSeasonality: true
        });

        if (forecast.success) {
            console.log('   ✅ Cost-only forecasting working!');
            console.log(`\n   Forecast Details:`);
            console.log(`     Periods: ${forecast.forecast.periods.length}`);
            console.log(`     Confidence: ${forecast.forecast.confidence}%`);
            console.log(`     Cost growth rate: ${(forecast.forecast.businessMetrics.costGrowthRate * 100).toFixed(2)}%`);
            console.log(`     Revenue per dollar: $${forecast.forecast.businessMetrics.revenuePerDollar.toFixed(2)} (will be 0 without business data)`);
            
            if (forecast.forecast.periods.length > 0) {
                const firstPeriod = forecast.forecast.periods[0];
                console.log(`\n   First Forecast Period:`);
                console.log(`     Date: ${new Date(firstPeriod.date).toLocaleDateString()}`);
                console.log(`     Predicted cost: $${firstPeriod.cost.toFixed(2)}`);
                console.log(`     Confidence: ${firstPeriod.confidence}%`);
            }
        } else {
            console.log('   ❌ Forecast failed:', forecast.error);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ TEST DATA REMOVED SUCCESSFULLY');
        console.log('='.repeat(60));
        
        console.log('\n📋 What Changed:');
        console.log('1. ✅ Removed all test business metrics');
        console.log('2. ✅ System now uses cost-only forecasting');
        console.log('3. ✅ Forecasts based purely on AWS cost patterns');
        console.log('4. ✅ No fake revenue/user data');
        
        console.log('\n🎯 What You\'ll See Now:');
        console.log('1. Revenue Efficiency: $0.00 (no business data)');
        console.log('2. Growth Rate: Based on real AWS cost trends');
        console.log('3. Business Correlation: 0% (no business data to correlate)');
        console.log('4. Forecast Confidence: Based on cost data quality');
        console.log('5. Forecasts: Pure cost predictions without revenue context');
        
        console.log('\n💡 To Add Real Business Data:');
        console.log('You can add your actual business metrics via:');
        console.log('1. POST /api/business-forecast/metrics endpoint');
        console.log('2. Or manually insert into business_metrics table:');
        console.log('   INSERT INTO business_metrics (user_id, date, revenue, active_users, transactions)');
        console.log('   VALUES (your_user_id, \'2025-11-01\', 50000, 1000, 5000);');
        
        console.log('\n🚀 Next Steps:');
        console.log('1. Refresh your browser (Cmd+Shift+R)');
        console.log('2. Navigate to Business Forecasting');
        console.log('3. You\'ll see cost-only forecasts (no revenue data)');
        console.log('4. Optionally add your real business metrics later');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

removeTestBusinessData();
