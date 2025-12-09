/**
 * Test Anomaly Detection Deduplication
 * Verifies that duplicate anomalies are properly removed
 */

const AnomalyDetectionService = require('./backend/src/services/anomalyDetectionService');

async function testDeduplication() {
    console.log('🧪 Testing Anomaly Detection Deduplication\n');
    
    // Create test data with intentional duplicates and anomalies
    const testData = [
        // Normal baseline costs
        { date: '2025-11-25T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 1.00, total_cost: 1.00 },
        { date: '2025-11-26T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 1.05, total_cost: 1.05 },
        { date: '2025-11-27T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 0.95, total_cost: 0.95 },
        { date: '2025-11-28T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 1.10, total_cost: 1.10 },
        { date: '2025-11-29T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 1.02, total_cost: 1.02 },
        { date: '2025-11-30T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 0.98, total_cost: 0.98 },
        { date: '2025-12-01T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 1.05, total_cost: 1.05 },
        
        // ANOMALY: Sudden spike (duplicated 7 times - the bug!)
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 25.18, total_cost: 25.18 },
        
        // Back to normal
        { date: '2025-12-03T18:30:00.000Z', service_name: 'AWS Cost Explorer', cost_amount: 1.08, total_cost: 1.08 },
        
        // EC2 baseline
        { date: '2025-11-25T18:30:00.000Z', service_name: 'EC2', cost_amount: 10.00, total_cost: 10.00 },
        { date: '2025-11-26T18:30:00.000Z', service_name: 'EC2', cost_amount: 10.50, total_cost: 10.50 },
        { date: '2025-11-27T18:30:00.000Z', service_name: 'EC2', cost_amount: 9.80, total_cost: 9.80 },
        { date: '2025-11-28T18:30:00.000Z', service_name: 'EC2', cost_amount: 10.20, total_cost: 10.20 },
        { date: '2025-11-29T18:30:00.000Z', service_name: 'EC2', cost_amount: 10.10, total_cost: 10.10 },
        { date: '2025-11-30T18:30:00.000Z', service_name: 'EC2', cost_amount: 9.90, total_cost: 9.90 },
        { date: '2025-12-01T18:30:00.000Z', service_name: 'EC2', cost_amount: 10.05, total_cost: 10.05 },
        
        // ANOMALY: EC2 spike (duplicated 3 times)
        { date: '2025-12-02T18:30:00.000Z', service_name: 'EC2', cost_amount: 45.50, total_cost: 45.50 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'EC2', cost_amount: 45.50, total_cost: 45.50 },
        { date: '2025-12-02T18:30:00.000Z', service_name: 'EC2', cost_amount: 45.50, total_cost: 45.50 },
        
        // Back to normal
        { date: '2025-12-03T18:30:00.000Z', service_name: 'EC2', cost_amount: 10.15, total_cost: 10.15 }
    ];
    
    console.log(`📥 Input: ${testData.length} cost records (including 10 duplicates)\n`);
    
    // Test the anomaly detection with deduplication
    const anomalies = AnomalyDetectionService.detectServiceAnomalies(testData, {
        algorithms: ['zscore', 'iqr'],
        minDataPoints: 5
    });
    
    console.log(`\n📤 Output: ${anomalies.length} unique anomalies detected\n`);
    
    // Generate report (which also deduplicates)
    const report = AnomalyDetectionService.generateAnomalyReport(anomalies);
    
    console.log('📊 Report Summary:');
    console.log(`   Total Anomalies: ${report.totalAnomalies}`);
    console.log(`   High Severity: ${report.severityBreakdown.high}`);
    console.log(`   Medium Severity: ${report.severityBreakdown.medium}`);
    console.log(`   Low Severity: ${report.severityBreakdown.low}`);
    
    if (report.anomalies && report.anomalies.length > 0) {
        console.log('\n🔍 Unique Anomalies:');
        report.anomalies.forEach((anomaly, index) => {
            const date = new Date(anomaly.date || anomaly.created_at).toLocaleDateString();
            console.log(`   ${index + 1}. ${date} - ${anomaly.service_name} - $${(anomaly.cost_amount || anomaly.total_cost).toFixed(2)} - ${anomaly.severity || 'low'}`);
        });
        
        // Verify deduplication worked
        const uniqueDates = new Set(report.anomalies.map(a => {
            const date = a.date || a.created_at;
            return `${date.split('T')[0]}_${a.service_name}`;
        }));
        
        console.log(`\n✅ Deduplication Test:`);
        console.log(`   Input records: ${testData.length}`);
        console.log(`   Detected anomalies (before dedup): ${anomalies.length}`);
        console.log(`   Unique combinations: ${uniqueDates.size}`);
        console.log(`   Output anomalies (after dedup): ${report.anomalies.length}`);
        
        if (uniqueDates.size === report.anomalies.length) {
            console.log('\n🎉 SUCCESS: No duplicate anomalies found!');
            console.log('   Each date+service combination appears only once.');
        } else {
            console.log('\n⚠️  WARNING: Some duplicates may still exist');
        }
    } else {
        console.log('\n⚠️  No anomalies detected in test data');
        console.log('   This might mean the test data needs more variance');
    }
}

testDeduplication().catch(err => {
    console.error('❌ Test failed:', err);
});
