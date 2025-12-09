// Test if business metrics data is being retrieved correctly
require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');
const BusinessForecastingService = require('./backend/src/services/businessForecastingService');

async function testBusinessMetrics() {
    console.log('🧪 Testing Business Metrics Data Retrieval\n');
    console.log('='.repeat(80));
    
    try {
        // Test 1: Check if business_metrics table exists and has data
        console.log('\n📋 Test 1: Checking business_metrics table...');
        const tableCheck = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM business_metrics
        `);
        console.log(`✅ Table exists with ${tableCheck.rows[0].count} records`);
        
        // Test 2: Get data for user ID 1
        console.log('\n📋 Test 2: Getting metrics for user ID 1...');
        const userMetrics = await DatabaseService.query(`
            SELECT * FROM business_metrics 
            WHERE user_id = 1 
            ORDER BY date DESC 
            LIMIT 5
        `);
        
        if (userMetrics.rows.length > 0) {
            console.log(`✅ Found ${userMetrics.rows.length} records for user 1:`);
            userMetrics.rows.forEach(row => {
                console.log(`   ${row.date}: Revenue $${row.revenue}, Users: ${row.active_users}`);
            });
        } else {
            console.log('❌ No metrics found for user 1');
        }
        
        // Test 3: Test the service method directly
        console.log('\n📋 Test 3: Testing BusinessForecastingService.getBusinessMetrics()...');
        const serviceMetrics = await BusinessForecastingService.getBusinessMetrics(1);
        
        if (serviceMetrics && serviceMetrics.length > 0) {
            console.log(`✅ Service returned ${serviceMetrics.length} months of data`);
            console.log('   Sample:', serviceMetrics[0]);
        } else {
            console.log('❌ Service returned no data');
        }
        
        // Test 4: Generate full forecast
        console.log('\n📋 Test 4: Generating full business forecast...');
        const forecast = await BusinessForecastingService.generateBusinessForecast(1, {
            months: 6,
            includeSeasonality: true
        });
        
        if (forecast.success) {
            console.log('✅ Forecast generated successfully!');
            console.log('   Business Metrics:');
            console.log(`     Revenue per Dollar: $${forecast.forecast.businessMetrics.revenuePerDollar.toFixed(2)}`);
            console.log(`     Cost Growth Rate: ${(forecast.forecast.businessMetrics.costGrowthRate * 100).toFixed(1)}%`);
            console.log(`     Business Correlation: ${(forecast.forecast.businessMetrics.businessCorrelation * 100).toFixed(0)}%`);
            console.log(`     Confidence: ${forecast.forecast.confidence}%`);
        } else {
            console.log('❌ Forecast generation failed:', forecast.error);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Test completed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testBusinessMetrics();
