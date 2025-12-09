// Debug script for AnomalyDetectionService
const AnomalyDetectionService = require('./anomalyDetectionService');

console.log('Debugging Anomaly Detection Service...\n');

// Test data with obvious anomalies
const testData = [
    { date: '2025-09-01', service_name: 'EC2', cost_amount: 100.00 },
    { date: '2025-09-02', service_name: 'EC2', cost_amount: 105.00 },
    { date: '2025-09-03', service_name: 'EC2', cost_amount: 95.00 },
    { date: '2025-09-04', service_name: 'EC2', cost_amount: 102.00 },
    { date: '2025-09-05', service_name: 'EC2', cost_amount: 1000.00 }, // Obvious anomaly
    { date: '2025-09-06', service_name: 'EC2', cost_amount: 98.00 },
];

console.log('Test data:', testData);

// Test detectAnomalies function
console.log('\n--- Testing detectAnomalies ---');
const anomalies = AnomalyDetectionService.detectAnomalies(testData, 2.0); // Lower threshold
console.log('Detected anomalies:', anomalies);
console.log('Number of anomalies detected:', anomalies.length);

// Let's manually calculate mean and std dev to verify
const values = testData.map(item => item.cost_amount);
console.log('\nValues:', values);
const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
console.log('Mean:', mean);
const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
const stdDev = Math.sqrt(variance);
console.log('Standard deviation:', stdDev);

// Calculate z-scores manually
console.log('\nManual z-score calculations:');
values.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    console.log(`Value ${value} at index ${index}: z-score = ${zScore}`);
});

console.log('\nTest completed!');