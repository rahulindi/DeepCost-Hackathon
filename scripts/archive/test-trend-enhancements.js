const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function testTrendEnhancements() {
    console.log('🧪 Testing Trend Analysis Enhancements\n');
    console.log('=' .repeat(60));

    try {
        // Step 1: Login
        console.log('\n1️⃣ Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }

        const token = loginResponse.data.token;
        const userId = loginResponse.data.user.id;
        console.log(`✅ Logged in as: ${TEST_EMAIL} (ID: ${userId})`);

        const headers = { Authorization: `Bearer ${token}` };

        // Step 2: Test Monthly Trends with Service Breakdown
        console.log('\n2️⃣ Testing Monthly Trends with Service Breakdown...');
        const trendsResponse = await axios.get(`${BASE_URL}/api/trends/monthly?months=6`, { headers });
        
        if (trendsResponse.data.success) {
            const trends = trendsResponse.data.data;
            console.log(`✅ Retrieved ${trends.length} months of data`);
            
            if (trends.length > 0) {
                const latestMonth = trends[0];
                console.log(`\n📊 Latest Month: ${latestMonth.month_year}`);
                console.log(`   Total Cost: $${parseFloat(latestMonth.total_cost).toFixed(2)}`);
                console.log(`   Growth Rate: ${latestMonth.growth_rate || 0}%`);
                
                if (latestMonth.service_breakdown) {
                    const services = Object.keys(latestMonth.service_breakdown);
                    console.log(`   Service Breakdown: ${services.length} services`);
                    
                    // Show top 5 services
                    const sortedServices = Object.entries(latestMonth.service_breakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5);
                    
                    console.log('\n   Top 5 Services:');
                    sortedServices.forEach(([service, cost], index) => {
                        console.log(`   ${index + 1}. ${service}: $${cost.toFixed(2)}`);
                    });
                } else {
                    console.log('   ⚠️ No service breakdown available');
                }
            }
        } else {
            console.log('❌ Failed to fetch trends');
        }

        // Step 3: Test Trending Services
        console.log('\n3️⃣ Testing Trending Services...');
        const trendingResponse = await axios.get(`${BASE_URL}/api/trends/trending-services?months=3&limit=5`, { headers });
        
        if (trendingResponse.data.success) {
            const trending = trendingResponse.data.data;
            console.log(`✅ Retrieved ${trending.length} trending services`);
            
            if (trending.length > 0) {
                console.log('\n🔥 Top Trending Services:');
                trending.forEach((service, index) => {
                    const growthRate = parseFloat(service.growth_rate);
                    const trend = growthRate > 0 ? '📈' : growthRate < 0 ? '📉' : '➡️';
                    console.log(`\n${index + 1}. ${service.service_name} ${trend}`);
                    console.log(`   Avg Cost: $${parseFloat(service.avg_cost).toFixed(2)}`);
                    console.log(`   Range: $${parseFloat(service.min_cost).toFixed(2)} - $${parseFloat(service.max_cost).toFixed(2)}`);
                    console.log(`   Growth Rate: ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`);
                    console.log(`   Active Months: ${service.months_active}`);
                });
            } else {
                console.log('ℹ️ No trending data available yet (need more historical data)');
            }
        } else {
            console.log('❌ Failed to fetch trending services');
        }

        // Step 4: Test Cost Forecast
        console.log('\n4️⃣ Testing Cost Forecast...');
        const forecastResponse = await axios.get(`${BASE_URL}/api/trends/forecast?months=3`, { headers });
        
        if (forecastResponse.data.success) {
            const forecast = forecastResponse.data.data;
            
            if (forecast.forecast_available) {
                console.log(`✅ Forecast generated based on ${forecast.historical_months} months`);
                console.log(`   Trend Direction: ${forecast.trend_direction}`);
                console.log(`   Monthly Change: $${forecast.monthly_change?.toFixed(2) || 0}`);
                
                console.log('\n🔮 Predicted Costs:');
                forecast.forecasts.forEach(f => {
                    const confidenceEmoji = f.confidence === 'high' ? '🟢' : f.confidence === 'medium' ? '🟡' : '🔴';
                    console.log(`   Month +${f.month_offset}: $${f.predicted_cost.toFixed(2)} ${confidenceEmoji} (${f.confidence} confidence)`);
                });
            } else {
                console.log('ℹ️ Forecast not available:', forecast.message || 'Need more data');
            }
        } else {
            console.log('❌ Failed to fetch forecast');
        }

        // Step 5: Test Export
        console.log('\n5️⃣ Testing CSV Export...');
        try {
            const exportResponse = await axios.get(`${BASE_URL}/api/trends/export?months=6`, { 
                headers,
                responseType: 'text'
            });
            
            const csvLines = exportResponse.data.split('\n').filter(line => line.trim());
            console.log(`✅ CSV export successful`);
            console.log(`   Total lines: ${csvLines.length}`);
            console.log(`   Header: ${csvLines[0]}`);
            if (csvLines.length > 1) {
                console.log(`   Sample data: ${csvLines[1]}`);
            }
        } catch (err) {
            console.log('❌ Export failed:', err.message);
        }

        // Step 6: Test Health Check
        console.log('\n6️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/api/trends/health`);
        
        if (healthResponse.data.status === 'OK') {
            console.log(`✅ Service healthy - Version ${healthResponse.data.version}`);
            console.log('\n   Available Features:');
            Object.entries(healthResponse.data.features).forEach(([feature, status]) => {
                console.log(`   - ${feature}: ${status}`);
            });
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL TREND ENHANCEMENT TESTS COMPLETED');
        console.log('='.repeat(60));
        
        console.log('\n📋 Summary of New Features:');
        console.log('1. ✅ Service Breakdown per Month');
        console.log('2. ✅ Top Trending Services (growth/decline tracking)');
        console.log('3. ✅ Cost Forecasting (3-month prediction)');
        console.log('4. ✅ CSV Export functionality');
        console.log('5. ✅ Enhanced health monitoring');
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Refresh your browser (Cmd+Shift+R)');
        console.log('2. Navigate to Trends tab');
        console.log('3. Explore new features:');
        console.log('   - Service breakdown charts');
        console.log('   - Trending services panel');
        console.log('   - Cost forecast predictions');
        console.log('   - Export button for CSV download');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

// Run tests
testTrendEnhancements();
