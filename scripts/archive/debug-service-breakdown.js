#!/usr/bin/env node

/**
 * Debug Service Breakdown Issue
 * 
 * This script simulates the backend processing to see what's happening
 */

console.log('🔍 Debugging Service Breakdown Issue\n');

// Simulate AWS response data
const mockAwsData = [
    {
        TimePeriod: { Start: '2025-11-01', End: '2025-11-02' },
        Groups: [
            {
                Keys: ['Amazon Simple Storage Service'],
                Metrics: { BlendedCost: { Amount: '0.45', Unit: 'USD' } }
            },
            {
                Keys: ['Amazon Elastic Compute Cloud - Compute'],
                Metrics: { BlendedCost: { Amount: '1.23', Unit: 'USD' } }
            },
            {
                Keys: ['AWS Lambda'],
                Metrics: { BlendedCost: { Amount: '0.12', Unit: 'USD' } }
            }
        ]
    },
    {
        TimePeriod: { Start: '2025-11-02', End: '2025-11-03' },
        Groups: [
            {
                Keys: ['Amazon Simple Storage Service'],
                Metrics: { BlendedCost: { Amount: '0.52', Unit: 'USD' } }
            },
            {
                Keys: ['Amazon Elastic Compute Cloud - Compute'],
                Metrics: { BlendedCost: { Amount: '1.45', Unit: 'USD' } }
            }
        ]
    }
];

console.log('📊 Simulating backend processing...\n');

// Process like the backend does
const monthlyData = {};

mockAwsData.forEach(timePoint => {
    const date = new Date(timePoint.TimePeriod.Start);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
            month_year: monthKey, 
            total_cost: 0, 
            service_breakdown: {},
            growth_rate: 0
        };
    }
    
    timePoint.Groups?.forEach(group => {
        const serviceName = group.Keys[0];
        const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
        if (!costData || !costData.Amount) return;
        
        const cost = parseFloat(costData.Amount);
        
        // 🔧 CONSOLIDATE services (SAME as dashboard)
        let consolidatedName = serviceName;
        if (serviceName.includes('Simple Storage Service')) {
            consolidatedName = 'Amazon S3';
        } else if (serviceName.includes('Elastic Compute Cloud')) {
            consolidatedName = 'Amazon EC2';
        }
        
        const absCost = Math.abs(cost);
        monthlyData[monthKey].total_cost += absCost;
        monthlyData[monthKey].service_breakdown[consolidatedName] = 
            (monthlyData[monthKey].service_breakdown[consolidatedName] || 0) + absCost;
        
        console.log(`  ✓ ${serviceName} → ${consolidatedName}: $${absCost.toFixed(2)}`);
    });
});

console.log('\n📊 Processed Data:\n');

const trends = Object.values(monthlyData);
trends.forEach(trend => {
    console.log(`Month: ${trend.month_year}`);
    console.log(`Total Cost: $${trend.total_cost.toFixed(2)}`);
    console.log(`Service Breakdown:`);
    Object.entries(trend.service_breakdown).forEach(([service, cost]) => {
        const percentage = (cost / trend.total_cost) * 100;
        console.log(`  - ${service}: $${cost.toFixed(2)} (${percentage.toFixed(1)}%)`);
    });
    console.log('');
});

console.log('✅ Processing complete!\n');

console.log('🔍 What to check in your backend logs:\n');
console.log('1. Look for "📊 Raw AWS data points:" - should be > 0');
console.log('2. Look for "📊 Latest services:" - should be > 0');
console.log('3. Look for "📊 Service breakdown:" - should show actual services');
console.log('4. If all zeros, AWS might not be returning cost data\n');

console.log('💡 Possible causes of $0.00:\n');
console.log('1. AWS Free Tier - No costs incurred yet');
console.log('2. Wrong date range - Costs not in current month');
console.log('3. AWS credentials issue - Not fetching real data');
console.log('4. Cost data not yet available - AWS updates with delay\n');
