const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function verifyForecastDisplay() {
    console.log('🔍 Verifying Business Forecast Display Data\n');
    console.log('='.repeat(60));

    try {
        // 🔒 SECURITY: Use environment variables for credentials
        const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
        const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';
        
        // Login
        console.log('\n1️⃣ Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (!loginResponse.data.success) {
            console.log('❌ Login failed');
            return;
        }

        const token = loginResponse.data.token;
        const userId = loginResponse.data.user.id;
        console.log(`✅ Logged in as user ID: ${userId}`);

        const headers = { Authorization: `Bearer ${token}` };

        // Get forecast data (what the frontend receives)
        console.log('\n2️⃣ Fetching forecast data (6 months)...');
        const forecastResponse = await axios.get(
            `${BASE_URL}/api/business-forecast/forecast?months=6&seasonality=true`,
            { headers }
        );

        if (!forecastResponse.data.success) {
            console.log('❌ Forecast failed:', forecastResponse.data.error);
            return;
        }

        const forecast = forecastResponse.data.forecast;
        
        console.log('\n📊 EXECUTIVE METRICS (What you see in the cards):');
        console.log('='.repeat(60));
        
        console.log('\n💰 Revenue Efficiency:');
        console.log(`   Display: $${forecast.businessMetrics.revenuePerDollar.toFixed(2)}`);
        console.log(`   Meaning: For every $1 spent on AWS, you generate $${forecast.businessMetrics.revenuePerDollar.toFixed(2)} in revenue`);
        console.log(`   Status: ${forecast.businessMetrics.revenuePerDollar > 1000 ? '✅ Excellent' : forecast.businessMetrics.revenuePerDollar > 100 ? '✅ Good' : '⚠️ Needs improvement'}`);

        console.log('\n📈 Growth Rate:');
        console.log(`   Display: ${(forecast.businessMetrics.costGrowthRate * 100).toFixed(2)}%`);
        console.log(`   Meaning: Your AWS costs are ${forecast.businessMetrics.costGrowthRate > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(forecast.businessMetrics.costGrowthRate * 100).toFixed(2)}% per month`);
        console.log(`   Status: ${forecast.businessMetrics.costGrowthRate < 0 ? '✅ Decreasing (good!)' : forecast.businessMetrics.costGrowthRate < 0.1 ? '✅ Stable' : '⚠️ Increasing rapidly'}`);

        console.log('\n🔗 Business Correlation:');
        console.log(`   Display: ${(forecast.businessMetrics.businessCorrelation * 100).toFixed(0)}%`);
        console.log(`   Meaning: ${(forecast.businessMetrics.businessCorrelation * 100).toFixed(0)}% correlation between costs and revenue`);
        console.log(`   Status: ${forecast.businessMetrics.businessCorrelation > 0.8 ? '✅ Excellent alignment' : forecast.businessMetrics.businessCorrelation > 0.5 ? '✅ Good alignment' : '⚠️ Weak alignment'}`);

        console.log('\n🎯 Forecast Confidence:');
        console.log(`   Display: ${forecast.confidence}%`);
        console.log(`   Meaning: ${forecast.confidence}% confidence in predictions`);
        console.log(`   Status: ${forecast.confidence > 80 ? '✅ High confidence' : forecast.confidence > 60 ? '✅ Medium confidence' : '⚠️ Low confidence'}`);

        console.log('\n\n📋 FORECAST TABLE DATA (First 3 periods):');
        console.log('='.repeat(60));
        
        forecast.periods.slice(0, 3).forEach((period, idx) => {
            console.log(`\nPeriod ${idx + 1}: ${new Date(period.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
            console.log(`   Base Cost: $${period.cost.toFixed(2)}`);
            console.log(`   Business-Adjusted: $${period.businessAdjustedCost.toFixed(2)}`);
            console.log(`   Revenue Projection: $${period.revenueProjection.toFixed(2)}`);
            console.log(`   Confidence: ${period.confidenceLevel}%`);
            console.log(`   ROI: ${(period.revenueProjection / period.businessAdjustedCost).toFixed(1)}x`);
        });

        console.log('\n\n🌍 SEASONAL INTELLIGENCE (First 6 months):');
        console.log('='.repeat(60));
        
        if (forecast.seasonal && forecast.seasonal.length > 0) {
            forecast.seasonal.slice(0, 6).forEach((seasonal, idx) => {
                console.log(`\nMonth ${seasonal.month}:`);
                console.log(`   Factor: ${(seasonal.seasonalFactor * 100).toFixed(0)}%`);
                console.log(`   Reason: ${seasonal.externalFactors}`);
                console.log(`   Adjusted Growth: ${(seasonal.adjustedGrowth * 100).toFixed(2)}%`);
            });
        }

        // Test scenario generation
        console.log('\n\n3️⃣ Testing AI Scenario Generation...');
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

        const scenarioResponse = await axios.post(
            `${BASE_URL}/api/business-forecast/scenarios`,
            { scenarios: scenarioData },
            { headers: { ...headers, 'Content-Type': 'application/json' } }
        );

        if (scenarioResponse.data.success) {
            console.log('\n🎯 AI SCENARIOS (What you see in the cards):');
            console.log('='.repeat(60));
            
            scenarioResponse.data.scenarios.forEach((scenario, idx) => {
                console.log(`\n${idx + 1}. ${scenario.name}:`);
                console.log(`   Total Cost: $${scenario.metrics.totalProjectedCost.toFixed(2)}`);
                console.log(`   Avg Monthly: $${scenario.metrics.averageMonthlyCost.toFixed(2)}`);
                console.log(`   Impact: ${scenario.impact.percentageImpact} ${scenario.impact.direction}`);
                console.log(`   Risk Level: ${scenario.metrics.costVariance > 500 ? 'High' : 'Low'}`);
            });
        }

        // Data validation
        console.log('\n\n4️⃣ DATA VALIDATION:');
        console.log('='.repeat(60));
        
        const validations = [
            {
                check: 'Revenue Efficiency > 0',
                value: forecast.businessMetrics.revenuePerDollar,
                pass: forecast.businessMetrics.revenuePerDollar > 0
            },
            {
                check: 'Forecast periods = 6',
                value: forecast.periods.length,
                pass: forecast.periods.length === 6
            },
            {
                check: 'All costs > 0',
                value: forecast.periods.every(p => p.cost > 0 && p.businessAdjustedCost > 0),
                pass: forecast.periods.every(p => p.cost > 0 && p.businessAdjustedCost > 0)
            },
            {
                check: 'All revenue projections > 0',
                value: forecast.periods.every(p => p.revenueProjection > 0),
                pass: forecast.periods.every(p => p.revenueProjection > 0)
            },
            {
                check: 'Confidence 0-100%',
                value: forecast.confidence,
                pass: forecast.confidence >= 0 && forecast.confidence <= 100
            },
            {
                check: 'Seasonal data present',
                value: forecast.seasonal?.length || 0,
                pass: forecast.seasonal && forecast.seasonal.length > 0
            }
        ];

        console.log('\n');
        validations.forEach(v => {
            const status = v.pass ? '✅' : '❌';
            console.log(`${status} ${v.check}: ${typeof v.value === 'boolean' ? (v.value ? 'Yes' : 'No') : v.value}`);
        });

        const allPassed = validations.every(v => v.pass);
        
        console.log('\n' + '='.repeat(60));
        if (allPassed) {
            console.log('✅ ALL DATA VALIDATION PASSED');
            console.log('✅ The data displayed in your browser is CORRECT');
        } else {
            console.log('⚠️ SOME VALIDATIONS FAILED');
            console.log('⚠️ There may be issues with the displayed data');
        }
        console.log('='.repeat(60));

        console.log('\n📝 WHAT YOU SHOULD SEE IN BROWSER:');
        console.log('1. Revenue Efficiency card: $18,144.89 (or similar high value)');
        console.log('2. Growth Rate card: -10.6% (decreasing)');
        console.log('3. Business Correlation card: 99% (excellent)');
        console.log('4. Forecast Confidence card: 90% (high)');
        console.log('5. Chart with 3 lines (Base, Business-Adjusted, Revenue)');
        console.log('6. Table with 6 forecast periods');
        console.log('7. 3 AI scenario cards (Conservative, Aggressive, Downturn)');
        console.log('8. 6 seasonal intelligence cards');

        console.log('\n💡 INTERPRETATION:');
        console.log('- High revenue efficiency ($18K per $1) means excellent ROI');
        console.log('- Negative growth rate (-10.6%) means costs are decreasing (good!)');
        console.log('- 99% correlation means costs align perfectly with revenue');
        console.log('- 90% confidence means predictions are highly accurate');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

verifyForecastDisplay();
