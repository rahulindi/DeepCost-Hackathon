/**
 * Test Anomaly Detection Date Range Filtering
 * Verifies that different day ranges return different results
 */

const AnomalyDetectionService = require('./backend/src/services/anomalyDetectionService');

async function testDateRangeFiltering() {
    console.log('🧪 Testing Anomaly Detection Date Range Filtering\n');
    
    // Test data spanning 90 days with anomalies at different times
    const testData = [];
    const baseDate = new Date('2025-09-01');
    
    // Generate 90 days of data
    for (let i = 0; i < 90; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        // Normal cost
        let cost = 10 + Math.random() * 2;
        
        // Add anomalies at specific days
        if (i === 5) cost = 50; // Day 5 anomaly (within 7 days)
        if (i === 25) cost = 45; // Day 25 anomaly (within 30 days)
        if (i === 85) cost = 55; // Day 85 anomaly (within 90 days)
        
        testData.push({
            date: date.toISOString(),
            service_name: 'EC2',
            cost_amount: cost,
            total_cost: cost
        });
    }
    
    console.log(`📥 Generated ${testData.length} days of test data\n`);
    
    // Test 7 days
    console.log('📊 Testing 7-day range:');
    const last7Days = testData.slice(-7);
    const anomalies7 = AnomalyDetectionService.detectServiceAnomalies(last7Days, {
        algorithms: ['zscore', 'iqr'],
        minDataPoints: 5
    });
    const report7 = AnomalyDetectionService.generateAnomalyReport(anomalies7);
    console.log(`   Anomalies found: ${report7.totalAnomalies}`);
    console.log(`   Date range: ${report7.dateRange?.start} to ${report7.dateRange?.end}\n`);
    
    // Test 30 days
    console.log('📊 Testing 30-day range:');
    const last30Days = testData.slice(-30);
    const anomalies30 = AnomalyDetectionService.detectServiceAnomalies(last30Days, {
        algorithms: ['zscore', 'iqr'],
        minDataPoints: 5
    });
    const report30 = AnomalyDetectionService.generateAnomalyReport(anomalies30);
    console.log(`   Anomalies found: ${report30.totalAnomalies}`);
    console.log(`   Date range: ${report30.dateRange?.start} to ${report30.dateRange?.end}\n`);
    
    // Test 90 days
    console.log('📊 Testing 90-day range:');
    const anomalies90 = AnomalyDetectionService.detectServiceAnomalies(testData, {
        algorithms: ['zscore', 'iqr'],
        minDataPoints: 5
    });
    const report90 = AnomalyDetectionService.generateAnomalyReport(anomalies90);
    console.log(`   Anomalies found: ${report90.totalAnomalies}`);
    console.log(`   Date range: ${report90.dateRange?.start} to ${report90.dateRange?.end}\n`);
    
    // Verify results are different
    console.log('✅ Verification:');
    
    const ranges = [
        { days: 7, count: report7.totalAnomalies, range: report7.dateRange },
        { days: 30, count: report30.totalAnomalies, range: report30.dateRange },
        { days: 90, count: report90.totalAnomalies, range: report90.dateRange }
    ];
    
    ranges.forEach(r => {
        console.log(`   ${r.days} days: ${r.count} anomalies (${r.range?.start} to ${r.range?.end})`);
    });
    
    // Check if date ranges are different
    const uniqueRanges = new Set(ranges.map(r => `${r.range?.start}_${r.range?.end}`));
    
    if (uniqueRanges.size === 3) {
        console.log('\n🎉 SUCCESS: Each time period has a different date range!');
    } else {
        console.log('\n⚠️  WARNING: Some date ranges are the same');
    }
    
    // Check if the data is actually being filtered
    const daysDiff7 = Math.round((new Date(report7.dateRange?.end) - new Date(report7.dateRange?.start)) / (1000 * 60 * 60 * 24));
    const daysDiff30 = Math.round((new Date(report30.dateRange?.end) - new Date(report30.dateRange?.start)) / (1000 * 60 * 60 * 24));
    const daysDiff90 = Math.round((new Date(report90.dateRange?.end) - new Date(report90.dateRange?.start)) / (1000 * 60 * 60 * 24));
    
    console.log('\n📅 Date range spans:');
    console.log(`   7-day request: ${daysDiff7} days`);
    console.log(`   30-day request: ${daysDiff30} days`);
    console.log(`   90-day request: ${daysDiff90} days`);
    
    if (daysDiff7 <= 7 && daysDiff30 <= 30 && daysDiff90 <= 90) {
        console.log('\n✅ Date filtering is working correctly!');
    } else {
        console.log('\n⚠️  Date filtering may not be working as expected');
    }
}

testDateRangeFiltering().catch(err => {
    console.error('❌ Test failed:', err);
});
