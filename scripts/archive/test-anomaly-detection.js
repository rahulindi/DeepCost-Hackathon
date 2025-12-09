// Test script to verify Anomaly Detection functionality
require('dotenv').config({ path: './backend/.env' });

const AnomalyDetectionService = require('./backend/src/services/anomalyDetectionService');
const DatabaseService = require('./backend/src/services/databaseService');

async function testAnomalyDetection() {
    console.log('🧪 Testing Anomaly Detection Feature\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    // Test 1: Get Cost Records
    console.log('2️⃣ Testing getCostRecordsForAnomalyDetection()...');
    try {
        const options = {
            userId: testUserId,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            limit: 100
        };
        
        const records = await AnomalyDetectionService.getCostRecordsForAnomalyDetection(options);
        console.log(`✅ Retrieved ${records.length} cost records`);
        
        if (records.length > 0) {
            console.log(`   Sample record: ${records[0].service_name} - $${records[0].cost_amount}`);
        } else {
            console.log('   ⚠️  No cost records found (this is normal if no costs yet)');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Perform Anomaly Detection
    console.log('\n3️⃣ Testing performAnomalyDetection()...');
    try {
        const options = {
            userId: testUserId,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            threshold: 2.5
        };
        
        const result = await AnomalyDetectionService.performAnomalyDetection(options);
        
        if (result.success) {
            console.log('✅ Anomaly detection completed');
            console.log(`   Total anomalies: ${result.data.totalAnomalies}`);
            console.log(`   High severity: ${result.data.severityBreakdown.high}`);
            console.log(`   Medium severity: ${result.data.severityBreakdown.medium}`);
            console.log(`   Low severity: ${result.data.severityBreakdown.low}`);
            
            if (result.data.topServices && result.data.topServices.length > 0) {
                console.log(`   Top service: ${result.data.topServices[0].service}`);
            }
        } else {
            console.log(`⚠️  ${result.message}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Detect Service Anomalies
    console.log('\n4️⃣ Testing detectServiceAnomalies()...');
    try {
        // Get some cost records first
        const records = await AnomalyDetectionService.getCostRecordsForAnomalyDetection({
            userId: testUserId,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            limit: 100
        });
        
        if (records.length > 0) {
            const anomalies = AnomalyDetectionService.detectServiceAnomalies(records);
            console.log(`✅ Detected ${anomalies.length} service anomalies`);
            
            if (anomalies.length > 0) {
                console.log(`   Sample anomaly: ${anomalies[0].service_name} - Severity: ${anomalies[0].severity}`);
            }
        } else {
            console.log('⚠️  No records to analyze');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Generate Anomaly Report
    console.log('\n5️⃣ Testing generateAnomalyReport()...');
    try {
        const records = await AnomalyDetectionService.getCostRecordsForAnomalyDetection({
            userId: testUserId,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            limit: 100
        });
        
        const anomalies = AnomalyDetectionService.detectServiceAnomalies(records);
        const report = AnomalyDetectionService.generateAnomalyReport(anomalies);
        
        console.log('✅ Report generated');
        console.log(`   Total anomalies: ${report.totalAnomalies}`);
        console.log(`   Severity breakdown: High=${report.severityBreakdown.high}, Medium=${report.severityBreakdown.medium}, Low=${report.severityBreakdown.low}`);
        console.log(`   Recommendations: ${report.recommendations ? report.recommendations.length : 0}`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Check Database for Cost Records
    console.log('\n6️⃣ Testing database cost records...');
    try {
        const result = await DatabaseService.query(
            `SELECT COUNT(*) as count, 
                    MIN(date) as earliest, 
                    MAX(date) as latest,
                    SUM(cost_amount) as total_cost
             FROM cost_records 
             WHERE user_id = $1`,
            [dbUserId]
        );
        
        if (result.rows.length > 0) {
            const stats = result.rows[0];
            console.log('✅ Database query successful');
            console.log(`   Total records: ${stats.count}`);
            console.log(`   Date range: ${stats.earliest} to ${stats.latest}`);
            console.log(`   Total cost: $${parseFloat(stats.total_cost || 0).toFixed(2)}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 6: Test with Mock Data (if no real data)
    console.log('\n7️⃣ Testing with mock data...');
    try {
        // Create mock cost data with an anomaly
        const mockData = [];
        const baseDate = new Date();
        
        // Normal costs for 20 days
        for (let i = 20; i >= 1; i--) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() - i);
            mockData.push({
                date: date.toISOString().split('T')[0],
                service_name: 'Amazon EC2',
                cost_amount: 10 + Math.random() * 2, // $10-12
                total_cost: 10 + Math.random() * 2
            });
        }
        
        // Add an anomaly (spike)
        const anomalyDate = new Date(baseDate);
        anomalyDate.setDate(anomalyDate.getDate() - 1);
        mockData.push({
            date: anomalyDate.toISOString().split('T')[0],
            service_name: 'Amazon EC2',
            cost_amount: 50, // Spike!
            total_cost: 50
        });
        
        const anomalies = AnomalyDetectionService.detectAnomalies(mockData, {
            threshold: 2.0,
            algorithms: ['zscore', 'iqr']
        });
        
        console.log(`✅ Mock data test completed`);
        console.log(`   Created ${mockData.length} mock records`);
        console.log(`   Detected ${anomalies.length} anomalies`);
        
        if (anomalies.length > 0) {
            console.log(`   Anomaly detected: $${anomalies[0].value} (Z-Score: ${anomalies[0].zScore?.toFixed(2)})`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Anomaly Detection testing complete!');
    process.exit(0);
}

testAnomalyDetection().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
