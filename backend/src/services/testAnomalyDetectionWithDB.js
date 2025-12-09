// Test Anomaly Detection Service with real database data
const AnomalyDetectionService = require('./anomalyDetectionService');

async function testAnomalyDetectionWithDB() {
    console.log('Testing Anomaly Detection Service with real database data...\n');

    try {
        // Test getCostRecordsForAnomalyDetection
        console.log('--- Testing getCostRecordsForAnomalyDetection ---');
        const records = await AnomalyDetectionService.getCostRecordsForAnomalyDetection({
            startDate: '2025-09-01',
            endDate: '2025-09-06',
            limit: 100
        });

        console.log('Retrieved records:', records.length);
        if (records.length > 0) {
            console.log('Sample records:', records.slice(0, 3));
        }

        // Test detectServiceAnomalies with real data
        console.log('\n--- Testing detectServiceAnomalies with real data ---');
        const serviceAnomalies = AnomalyDetectionService.detectServiceAnomalies(records);
        console.log('Service anomalies detected:', serviceAnomalies.length);
        if (serviceAnomalies.length > 0) {
            console.log('Sample anomalies:', serviceAnomalies.slice(0, 3));
        }

        // Test generateAnomalyReport
        console.log('\n--- Testing generateAnomalyReport ---');
        const report = AnomalyDetectionService.generateAnomalyReport(serviceAnomalies);
        console.log('Anomaly report generated:');
        console.log('Total anomalies:', report.totalAnomalies);
        console.log('Severity breakdown:', report.severityBreakdown);
        console.log('Top services:', report.topServices);
        console.log('Recommendations:', report.recommendations.length);

        // Test performAnomalyDetection
        console.log('\n--- Testing performAnomalyDetection ---');
        const result = await AnomalyDetectionService.performAnomalyDetection({
            startDate: '2025-09-01',
            endDate: '2025-09-06'
        });

        console.log('Anomaly detection result:', result.success);
        if (result.success) {
            console.log('Report data:', {
                totalAnomalies: result.data.totalAnomalies,
                severityBreakdown: result.data.severityBreakdown,
                recommendations: result.data.recommendations.length
            });
        } else {
            console.log('Error:', result.error);
        }

        console.log('\nTest completed successfully!');
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

testAnomalyDetectionWithDB();