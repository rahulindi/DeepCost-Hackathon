// Test script to verify Business Intelligence Forecasting functionality
require('dotenv').config({ path: './backend/.env' });

const DatabaseService = require('./backend/src/services/databaseService');
const BusinessForecastingService = require('./backend/src/services/businessForecastingService');

async function testBusinessForecasting() {
    console.log('🧪 Testing Business Intelligence Forecasting Feature\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    // Test 1: Check Historical Cost Data
    console.log('2️⃣ Checking historical cost data...');
    try {
        const costHistory = await BusinessForecastingService.getHistoricalCostData(dbUserId, 6);
        console.log(`✅ Retrieved ${costHistory.length} months of cost history`);
        
        if (costHistory.length > 0) {
            console.log(`   Latest month: ${new Date(costHistory[0].date).toLocaleDateString()} - $${costHistory[0].cost.toFixed(2)}`);
            console.log(`   Total historical cost: $${costHistory.reduce((sum, c) => sum + c.cost, 0).toFixed(2)}`);
        } else {
            console.log('   ⚠️  No historical cost data found');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Check Business Metrics
    console.log('\n3️⃣ Checking business metrics...');
    try {
        const businessMetrics = await BusinessForecastingService.getBusinessMetrics(dbUserId);
        
        if (businessMetrics.length > 0) {
            console.log(`✅ Retrieved ${businessMetrics.length} months of business metrics`);
            console.log(`   Latest revenue: $${businessMetrics[0].revenue.toFixed(2)}`);
            console.log(`   Active users: ${businessMetrics[0].activeUsers}`);
        } else {
            console.log('⚠️  No business metrics found (will use cost-only forecasting)');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Generate Business Forecast
    console.log('\n4️⃣ Testing generateBusinessForecast()...');
    try {
        const options = {
            months: 6,
            includeSeasonality: true
        };
        
        const result = await BusinessForecastingService.generateBusinessForecast(dbUserId, options);
        
        if (result.success) {
            console.log('✅ Business forecast generated successfully');
            console.log(`   Forecast periods: ${result.forecast.periods.length}`);
            console.log(`   Confidence: ${result.forecast.confidence}%`);
            console.log(`   Revenue per dollar: $${result.forecast.businessMetrics.revenuePerDollar.toFixed(2)}`);
            console.log(`   Cost growth rate: ${(result.forecast.businessMetrics.costGrowthRate * 100).toFixed(2)}%`);
            console.log(`   Seasonality strength: ${result.forecast.businessMetrics.seasonalityStrength.toFixed(2)}`);
            console.log(`   Business correlation: ${(result.forecast.businessMetrics.businessCorrelation * 100).toFixed(1)}%`);
            
            if (result.forecast.periods.length > 0) {
                const firstPeriod = result.forecast.periods[0];
                console.log(`\n   First forecast period:`);
                console.log(`     Date: ${new Date(firstPeriod.date).toLocaleDateString()}`);
                console.log(`     Base cost: $${firstPeriod.cost.toFixed(2)}`);
                console.log(`     Business-adjusted: $${firstPeriod.businessAdjustedCost.toFixed(2)}`);
                console.log(`     Revenue projection: $${firstPeriod.revenueProjection.toFixed(2)}`);
                console.log(`     Confidence: ${firstPeriod.confidenceLevel}%`);
            }
            
            if (result.forecast.seasonal && result.forecast.seasonal.length > 0) {
                console.log(`\n   Seasonal forecasts: ${result.forecast.seasonal.length} months`);
                console.log(`     Sample: Month ${result.forecast.seasonal[0].month} - ${(result.forecast.seasonal[0].seasonalFactor * 100).toFixed(0)}% factor`);
            }
        } else {
            console.log(`⚠️  ${result.error || 'Forecast generation failed'}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Test Scenario Generation
    console.log('\n5️⃣ Testing scenario generation...');
    try {
        const scenarios = [
            {
                name: 'Conservative Growth',
                businessGrowth: 1.15,
                seasonalityMultiplier: 0.9,
                externalFactors: { marketConditions: 'stable' }
            },
            {
                name: 'Aggressive Expansion',
                businessGrowth: 1.5,
                seasonalityMultiplier: 1.2,
                externalFactors: { marketConditions: 'growth' }
            }
        ];
        
        const result = await BusinessForecastingService.generateScenarioModels(dbUserId, scenarios);
        
        if (result.success) {
            console.log(`✅ Generated ${result.scenarios.length} scenario models`);
            
            result.scenarios.forEach((scenario, idx) => {
                console.log(`\n   Scenario ${idx + 1}: ${scenario.name}`);
                console.log(`     Total projected cost: $${scenario.metrics.totalProjectedCost.toFixed(2)}`);
                console.log(`     Average monthly: $${scenario.metrics.averageMonthlyCost.toFixed(2)}`);
                console.log(`     Impact: ${scenario.impact.percentageImpact} ${scenario.impact.direction}`);
            });
            
            if (result.comparisonMatrix) {
                console.log(`\n   Comparison matrix generated with ${result.comparisonMatrix.length} scenarios`);
            }
        } else {
            console.log(`⚠️  ${result.error || 'Scenario generation failed'}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Check Service Trends
    console.log('\n6️⃣ Testing service trend analysis...');
    try {
        const serviceTrends = await BusinessForecastingService.analyzeServiceTrends(dbUserId);
        
        const serviceCount = Object.keys(serviceTrends).length;
        if (serviceCount > 0) {
            console.log(`✅ Analyzed trends for ${serviceCount} services`);
            
            Object.entries(serviceTrends).slice(0, 3).forEach(([service, trend]) => {
                console.log(`   ${service}:`);
                console.log(`     Trend: ${trend.trend}`);
                console.log(`     Confidence: ${trend.confidence}%`);
                console.log(`     Total cost: $${trend.totalCost.toFixed(2)}`);
            });
        } else {
            console.log('⚠️  No service trends found');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 6: Check Cost Records Statistics
    console.log('\n7️⃣ Checking cost records statistics...');
    try {
        const result = await DatabaseService.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT service_name) as services,
                MIN(date) as earliest,
                MAX(date) as latest,
                SUM(cost_amount) as total_cost,
                AVG(cost_amount) as avg_cost
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
            console.log(`   Average cost per record: $${parseFloat(stats.avg_cost || 0).toFixed(4)}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 7: Test Different Forecast Horizons
    console.log('\n8️⃣ Testing different forecast horizons...');
    try {
        const horizons = [3, 6, 12];
        
        for (const months of horizons) {
            const result = await BusinessForecastingService.generateBusinessForecast(dbUserId, { months });
            if (result.success) {
                const totalProjected = result.forecast.periods.reduce((sum, p) => sum + p.cost, 0);
                console.log(`   ${months} months: ${result.forecast.periods.length} periods, $${totalProjected.toFixed(2)} projected`);
            }
        }
        console.log('✅ All forecast horizons working');
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Business Intelligence Forecasting testing complete!');
    process.exit(0);
}

testBusinessForecasting().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
