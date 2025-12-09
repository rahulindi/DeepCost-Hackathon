const axios = require('axios');

async function debugTrendData() {
    try {
        // You'll need to replace this with a valid token
        const token = process.env.AUTH_TOKEN || 'your-token-here';
        
        console.log('🔍 Fetching trend data from API...\n');
        
        const response = await axios.get('http://localhost:3001/api/trends/monthly?months=6', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            const trends = response.data.data;
            console.log(`✅ Received ${trends.length} months of data\n`);
            
            // Check the latest month
            if (trends.length > 0) {
                const latest = trends[trends.length - 1];
                console.log('📊 Latest Month Data:');
                console.log(`   Month: ${latest.month_year}`);
                console.log(`   Total Cost: $${latest.total_cost}`);
                console.log(`   Growth Rate: ${latest.growth_rate || 0}%`);
                console.log(`   Service Breakdown:`, latest.service_breakdown);
                console.log('\n');
                
                // Check if service_breakdown exists and has data
                if (latest.service_breakdown) {
                    const services = Object.entries(latest.service_breakdown);
                    console.log(`   Number of services: ${services.length}`);
                    
                    if (services.length > 0) {
                        console.log('\n   Top 5 Services:');
                        services
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .forEach(([service, cost], index) => {
                                const percentage = (cost / parseFloat(latest.total_cost)) * 100;
                                console.log(`   ${index + 1}. "${service}": $${cost.toFixed(2)} (${percentage.toFixed(1)}%)`);
                                console.log(`      Service name length: ${service.length} characters`);
                                console.log(`      Service name type: ${typeof service}`);
                            });
                    } else {
                        console.log('   ⚠️  service_breakdown is empty!');
                    }
                } else {
                    console.log('   ⚠️  service_breakdown is null or undefined!');
                }
            }
            
            // Check trending services
            console.log('\n🔥 Fetching trending services...\n');
            const trendingResponse = await axios.get('http://localhost:3001/api/trends/trending-services?months=6&limit=5', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (trendingResponse.data.success) {
                const trending = trendingResponse.data.data;
                console.log(`✅ Received ${trending.length} trending services\n`);
                
                trending.forEach((service, index) => {
                    console.log(`${index + 1}. "${service.service_name}"`);
                    console.log(`   Avg Cost: $${service.avg_cost}`);
                    console.log(`   Growth Rate: ${service.growth_rate}%`);
                    console.log(`   Service name length: ${service.service_name.length} characters`);
                    console.log(`   Service name type: ${typeof service.service_name}`);
                    console.log('');
                });
            }
            
        } else {
            console.log('❌ API returned success: false');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

console.log('='.repeat(60));
console.log('DEBUG: Trend Analysis Frontend Data');
console.log('='.repeat(60));
console.log('\nTo use this script:');
console.log('1. Get your auth token from browser localStorage');
console.log('2. Run: AUTH_TOKEN=your-token node debug-trend-frontend.js');
console.log('='.repeat(60));
console.log('\n');

if (process.env.AUTH_TOKEN && process.env.AUTH_TOKEN !== 'your-token-here') {
    debugTrendData();
} else {
    console.log('⚠️  Please provide AUTH_TOKEN environment variable');
    console.log('Example: AUTH_TOKEN=eyJhbG... node debug-trend-frontend.js\n');
}
