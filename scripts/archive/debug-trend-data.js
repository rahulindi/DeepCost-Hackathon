const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function debugTrendData() {
    console.log('🔍 Debugging Trend Data\n');

    try {
        // Login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        const token = loginResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // Get trend data
        console.log('📊 Fetching trend data...\n');
        const response = await axios.get(`${BASE_URL}/api/trends/monthly?months=6`, { headers });
        
        const trends = response.data.data;
        
        console.log(`Total months: ${trends.length}\n`);
        
        trends.forEach((trend, index) => {
            console.log(`Month ${index + 1}: ${trend.month_year}`);
            console.log(`  Total Cost: $${trend.total_cost}`);
            console.log(`  Growth Rate: ${trend.growth_rate}%`);
            console.log(`  Previous Cost: ${trend.prev_cost || 'N/A'}`);
            console.log(`  Record Count: ${trend.record_count}`);
            
            if (trend.service_breakdown) {
                const services = Object.keys(trend.service_breakdown).length;
                console.log(`  Services: ${services}`);
            }
            console.log('');
        });

        // Check if growth rate is null/0 for all
        const hasGrowthData = trends.some(t => t.growth_rate && t.growth_rate !== 0);
        console.log(`Has meaningful growth data: ${hasGrowthData}`);
        
        if (!hasGrowthData) {
            console.log('\n⚠️ ISSUE: No growth rate data available');
            console.log('Reason: Need at least 2 months of data for growth calculation');
            console.log('Current months: ' + trends.length);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

debugTrendData();
