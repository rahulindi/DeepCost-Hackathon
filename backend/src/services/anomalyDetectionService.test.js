// Test for AnomalyDetectionService
const AnomalyDetectionService = require('./anomalyDetectionService');

// Test data
const testData = [
    { date: '2025-09-01', service_name: 'EC2', cost_amount: 100.00 },
    { date: '2025-09-02', service_name: 'EC2', cost_amount: 105.00 },
    { date: '2025-09-03', service_name: 'EC2', cost_amount: 95.00 },
    { date: '2025-09-04', service_name: 'EC2', cost_amount: 102.00 },
    { date: '2025-09-05', service_name: 'EC2', cost_amount: 1000.00 }, // Obvious anomaly
    { date: '2025-09-06', service_name: 'EC2', cost_amount: 98.00 },
];

console.log('Testing Anomaly Detection Service...');

// Test detectAnomalies function
const anomalies = AnomalyDetectionService.detectAnomalies(testData, 2.0);
console.log('Detected anomalies:', anomalies);

// Test detectServiceAnomalies function
const serviceAnomalies = AnomalyDetectionService.detectServiceAnomalies(testData);
console.log('Service anomalies:', serviceAnomalies);

// Test generateAnomalyReport function
const report = AnomalyDetectionService.generateAnomalyReport(anomalies);
console.log('Anomaly report:', JSON.stringify(report, null, 2));

console.log('Test completed successfully!');