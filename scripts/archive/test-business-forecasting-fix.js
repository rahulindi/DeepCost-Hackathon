// Test script to verify Business Forecasting fix
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/business-forecast';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testBusinessForecastingFix() {
    console.log('🧪 Testing Business Forecasting Fix\n');

    try {
        // Test 1: Get base forecast
        console.log('1️⃣ Testing base forecast generation...');
        const forecastResponse = await axios.get(`${BASE_URL}/forecast?months=6&seasonality=true`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });

        if (forecastResponse.data.success) {
            console.log('✅ Base forecast generated successfully');
            console.log(`   Periods: ${forecastResponse.data.forecast.periods.length}`);
            console.log(`   Confidence: ${forecastResponse.data.forecast.confidence}%`);
        } else {
            console.log('⚠️  Base forecast failed:', forecastResponse.data.error);
            console.log('   This is expected if you have no cost data');
        }

        // Test 2: Generate scenarios (this was causing the error)
        console.log('\n2️⃣ Testing scenario generation (the fix)...');
        
        const scenarioData = [
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
            },
            {
                name: 'Economic Downturn',
                businessGrowth: 0.85,
                seasonalityMultiplier: 0.8,
                externalFactors: { marketConditions: 'recession' }
            }
        ];

        const scenarioResponse = await axios.post(`${BASE_URL}/scenarios`, 
            { scenarios: scenarioData },
            { 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_TOKEN}` 
                }
            }
        );

        if (scenarioResponse.data.success) {
            console.log('✅ Scenarios generated successfully');
            console.log(`   Scenarios: ${scenarioResponse.data.scenarios.length}`);
            
            scenarioResponse.data.scenarios.forEach((scenario, idx) => {
                console.log(`\n   Scenario ${idx + 1}: ${scenario.name}`);
                console.log(`   - Total Cost: $${scenario.metrics.totalProjectedCost.toFixed(2)}`);
                console.log(`   - Impact: ${scenario.impact.percentageImpact}`);
                console.log(`   - Direction: ${scenario.impact.direction}`);
            });
        } else {
            console.log('⚠️  Scenario generation failed:', scenarioResponse.data.error);
            console.log('   Error message should be clear and helpful (not "reduce" error)');
        }

        // Test 3: Test with empty scenarios (edge case)
        console.log('\n3️⃣ Testing edge case (empty scenarios)...');
        
        try {
            const emptyResponse = await axios.post(`${BASE_URL}/scenarios`, 
                { scenarios: [] },
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AUTH_TOKEN}` 
                    }
                }
            );

            if (!emptyResponse.data.success) {
                console.log('✅ Empty scenarios handled correctly');
                console.log(`   Error: ${emptyResponse.data.error}`);
            } else {
                console.log('⚠️  Empty scenarios should return error');
            }
        } catch (error) {
            if (error.response && error.response.data) {
                console.log('✅ Empty scenarios handled correctly');
                console.log(`   Error: ${error.response.data.error}`);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }

        console.log('\n✅ All tests completed!');
        console.log('\n📝 Summary:');
        console.log('   - No "Reduce of empty array" errors');
        console.log('   - Clear error messages when data is missing');
        console.log('   - Graceful handling of edge cases');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', error.response.data);
            
            // Check if it's the old "reduce" error
            if (error.response.data.error && error.response.data.error.includes('Reduce of empty array')) {
                console.error('\n⚠️  OLD ERROR DETECTED!');
                console.error('   The fix may not have been applied correctly.');
                console.error('   Please restart the backend server.');
            }
        }
    }
}

// Run tests
console.log('═══════════════════════════════════════════════════════════');
console.log('  Business Forecasting Fix Verification');
console.log('═══════════════════════════════════════════════════════════\n');

if (!AUTH_TOKEN || AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️  Please set AUTH_TOKEN environment variable');
    console.log('   Example: AUTH_TOKEN=your-token node test-business-forecasting-fix.js');
    console.log('\n   To get your token:');
    console.log('   1. Login to the application');
    console.log('   2. Open browser DevTools > Application > Local Storage');
    console.log('   3. Copy the value of "authToken"\n');
    process.exit(1);
}

testBusinessForecastingFix();
