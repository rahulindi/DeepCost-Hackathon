#!/usr/bin/env node

/**
 * Test Dashboard vs Trend Analysis Consistency
 * 
 * This script verifies that:
 * 1. Dashboard and Trend Analysis use same service names
 * 2. Top services match between features
 * 3. Service breakdown shows real costs (not zero)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TOKEN = process.env.AUTH_TOKEN || '';

if (!TOKEN) {
    console.error('❌ Please set AUTH_TOKEN environment variable');
    console.log('Example: AUTH_TOKEN=your_token node test-dashboard-trend-consistency.js');
    process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };

async function testConsistency() {
    console.log('🧪 Testing Dashboard vs Trend Analysis Consistency\n');
    
    try {
        // 1. Fetch dashboard data
        console.log('📊 Fetching dashboard data...');
        const dashboardResponse = await axios.get(`${BASE_URL}/api/cost-data`, { headers });
        const dashboardData = dashboardResponse.data;
        
        // Process dashboard services
        const dashboardServices = new Map();
        dashboardData.ResultsByTime?.forEach(timePoint => {
            timePoint.Groups?.forEach(group => {
                const serviceName = group.Keys[0];
                const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                if (costData?.Amount) {
                    const cost = Math.abs(parseFloat(costData.Amount));
                    dashboardServices.set(serviceName, (dashboardServices.get(serviceName) || 0) + cost);
                }
            });
        });
        
        const dashboardTop5 = Array.from(dashboardServices.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        console.log('✅ Dashboard Top 5 Services:');
        dashboardTop5.forEach(([service, cost], index) => {
            console.log(`   ${index + 1}. ${service}: $${cost.toFixed(2)}`);
        });
        console.log('');
        
        // 2. Fetch trending services
        console.log('📈 Fetching trending services...');
        const trendingResponse = await axios.get(`${BASE_URL}/api/trends/trending-services?limit=5`, { headers });
        const trendingData = trendingResponse.data;
        
        if (!trendingData.success) {
            console.error('❌ Failed to fetch trending services');
            return;
        }
        
        console.log('✅ Trend Analysis Top 5 Services:');
        trendingData.data.forEach((service, index) => {
            console.log(`   ${index + 1}. ${service.service_name}: $${service.avg_cost}`);
        });
        console.log('');
        
        // 3. Fetch monthly trends for service breakdown
        console.log('📅 Fetching monthly trends...');
        const monthlyResponse = await axios.get(`${BASE_URL}/api/trends/monthly?months=1`, { headers });
        const monthlyData = monthlyResponse.data;
        
        if (!monthlyData.success || monthlyData.data.length === 0) {
            console.error('❌ Failed to fetch monthly trends');
            return;
        }
        
        const latestMonth = monthlyData.data[monthlyData.data.length - 1];
        const breakdown = latestMonth.service_breakdown;
        
        console.log('✅ Service Breakdown (Latest Month):');
        const breakdownEntries = Object.entries(breakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        breakdownEntries.forEach(([service, cost]) => {
            console.log(`   ${service}: $${cost.toFixed(2)}`);
        });
        console.log('');
        
        // 4. Verify consistency
        console.log('🔍 Consistency Check:\n');
        
        let allPassed = true;
        
        // Check 1: Service names match
        const dashboardServiceNames = new Set(dashboardTop5.map(([name]) => name));
        const trendingServiceNames = new Set(trendingData.data.map(s => s.service_name));
        
        const matchingServices = [...dashboardServiceNames].filter(name => trendingServiceNames.has(name));
        const matchPercentage = (matchingServices.length / dashboardTop5.length) * 100;
        
        if (matchPercentage >= 80) {
            console.log(`✅ Service Names Match: ${matchPercentage.toFixed(0)}% (${matchingServices.length}/${dashboardTop5.length})`);
        } else {
            console.log(`❌ Service Names Mismatch: Only ${matchPercentage.toFixed(0)}% match`);
            allPassed = false;
        }
        
        // Check 2: Service breakdown not zero
        const nonZeroBreakdown = breakdownEntries.filter(([, cost]) => cost > 0);
        if (nonZeroBreakdown.length === breakdownEntries.length) {
            console.log(`✅ Service Breakdown: All ${breakdownEntries.length} services have non-zero costs`);
        } else {
            console.log(`❌ Service Breakdown: ${breakdownEntries.length - nonZeroBreakdown.length} services have zero costs`);
            allPassed = false;
        }
        
        // Check 3: Consolidated names used
        const hasConsolidatedNames = trendingData.data.some(s => 
            s.service_name === 'Amazon S3' || s.service_name === 'Amazon EC2'
        );
        if (hasConsolidatedNames) {
            console.log('✅ Consolidated Names: Using "Amazon S3", "Amazon EC2" format');
        } else {
            console.log('⚠️  Consolidated Names: Not using consolidated format (may be okay if no S3/EC2 usage)');
        }
        
        // Check 4: Cost values reasonable
        const dashboardTotal = dashboardTop5.reduce((sum, [, cost]) => sum + cost, 0);
        const trendingTotal = trendingData.data.reduce((sum, s) => sum + parseFloat(s.avg_cost), 0);
        const costDiff = Math.abs(dashboardTotal - trendingTotal);
        const costDiffPercent = (costDiff / dashboardTotal) * 100;
        
        if (costDiffPercent < 10) {
            console.log(`✅ Cost Values: Dashboard and Trending within ${costDiffPercent.toFixed(1)}% ($${costDiff.toFixed(2)} difference)`);
        } else {
            console.log(`⚠️  Cost Values: Dashboard and Trending differ by ${costDiffPercent.toFixed(1)}% ($${costDiff.toFixed(2)} difference)`);
        }
        
        console.log('');
        
        // Final result
        if (allPassed) {
            console.log('🎉 SUCCESS! Dashboard and Trend Analysis are consistent!');
            console.log('✅ All checks passed');
        } else {
            console.log('⚠️  PARTIAL SUCCESS: Some inconsistencies detected');
            console.log('   Review the checks above for details');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
testConsistency();
