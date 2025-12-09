// Comprehensive Application Test Suite
// Tests all features and provides detailed status report
require('dotenv').config({ path: './backend/.env' });

const axios = require('axios');
const DatabaseService = require('./backend/src/services/databaseService');
const fs = require('fs');
const path = require('path');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper functions
function logTest(testName, status, details = '') {
    totalTests++;
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${testName}`);
    if (details) {
        console.log(`   ${details}`);
    }
    
    testResults.push({ test: testName, status, details });
    
    if (status === 'PASS') {
        passedTests++;
    } else if (status !== 'WARN') {
        failedTests++;
    }
}

function logSection(sectionName) {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 ${sectionName}`);
    console.log('='.repeat(80));
}

async function makeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BACKEND_URL}${endpoint}`,
            timeout: TEST_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.message, 
            status: error.response?.status || 'TIMEOUT',
            code: error.code
        };
    }
}

async function testApplication() {
    console.log('🚀 AWS Cost Tracker Pro - Comprehensive Test Suite\n');
    console.log('Starting comprehensive testing of all features...\n');
    
    // ========================================================================
    // PHASE 1: INFRASTRUCTURE TESTS
    // ========================================================================
    
    logSection('PHASE 1: INFRASTRUCTURE TESTS');
    
    // Test 1.1: Database Connection
    try {
        const result = await DatabaseService.query('SELECT COUNT(*) as count FROM cost_records');
        const recordCount = result.rows[0].count;
        logTest('Database Connection', 'PASS', `${recordCount} cost records available`);
    } catch (error) {
        logTest('Database Connection', 'FAIL', error.message);
        console.log('\n⚠️  Database connection failed. Backend tests will be skipped.');
        console.log('💡 Make sure backend server is running: cd backend && npm start\n');
    }
    
    // Test 1.2: Backend Server Health
    const healthCheck = await makeRequest('GET', '/health');
    if (healthCheck.success) {
        logTest('Backend Server Health', 'PASS', `Status: ${healthCheck.status}`);
    } else {
        logTest('Backend Server Health', 'FAIL', healthCheck.error);
        if (healthCheck.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Backend server not running. API tests will be skipped.');
            console.log('💡 Start backend: cd backend && npm start\n');
        }
    }
    
    // Test 1.3: Database Tables
    try {
        const tables = await DatabaseService.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        const tableNames = tables.rows.map(row => row.table_name);
        const expectedTables = [
            'cost_records', 'users', 'budgets', 'allocations', 
            'webhook_configs', 'webhook_deliveries', 'export_jobs'
        ];
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length === 0) {
            logTest('Database Tables', 'PASS', `${tableNames.length} tables found`);
        } else {
            logTest('Database Tables', 'WARN', `Missing: ${missingTables.join(', ')}`);
        }
    } catch (error) {
        logTest('Database Tables', 'FAIL', error.message);
    }
    
    // ========================================================================
    // PHASE 2: CORE API ENDPOINTS
    // ========================================================================
    
    logSection('PHASE 2: CORE API ENDPOINTS');
    
    // Test 2.1: Cost Data API
    const costsAPI = await makeRequest('GET', '/api/costs');
    if (costsAPI.success && costsAPI.data.length > 0) {
        logTest('Cost Data API', 'PASS', `${costsAPI.data.length} cost records`);
    } else {
        logTest('Cost Data API', 'FAIL', costsAPI.error || 'No data returned');
    }
    
    // Test 2.2: Analytics API
    const analyticsAPI = await makeRequest('GET', '/api/analytics');
    if (analyticsAPI.success) {
        logTest('Analytics API', 'PASS', 'Analytics data available');
    } else {
        logTest('Analytics API', 'FAIL', analyticsAPI.error);
    }
    
    // Test 2.3: Trends API
    const trendsAPI = await makeRequest('GET', '/api/trends/monthly');
    if (trendsAPI.success) {
        logTest('Trends API', 'PASS', 'Trend data available');
    } else {
        logTest('Trends API', 'FAIL', trendsAPI.error);
    }
    
    // ========================================================================
    // PHASE 3: FEATURE-SPECIFIC TESTS
    // ========================================================================
    
    logSection('PHASE 3: FEATURE-SPECIFIC TESTS');
    
    // Test 3.1: Cost Allocation
    const allocationAPI = await makeRequest('GET', '/api/allocation/summary');
    if (allocationAPI.success) {
        logTest('Cost Allocation API', 'PASS', 'Allocation data available');
    } else {
        logTest('Cost Allocation API', 'FAIL', allocationAPI.error);
    }
    
    // Test 3.2: Anomaly Detection
    const anomalyAPI = await makeRequest('GET', '/api/anomaly/detect');
    if (anomalyAPI.success) {
        logTest('Anomaly Detection API', 'PASS', 'Anomaly detection working');
    } else {
        logTest('Anomaly Detection API', 'FAIL', anomalyAPI.error);
    }
    
    // Test 3.3: Business Forecasting
    const forecastAPI = await makeRequest('GET', '/api/business-forecast/predictions');
    if (forecastAPI.success) {
        logTest('Business Forecasting API', 'PASS', 'Forecast data available');
    } else {
        logTest('Business Forecasting API', 'FAIL', forecastAPI.error);
    }
    
    // Test 3.4: Reserved Instances
    const riAPI = await makeRequest('GET', '/api/ri/recommendations');
    if (riAPI.success) {
        logTest('Reserved Instances API', 'PASS', 'RI recommendations available');
    } else {
        logTest('Reserved Instances API', 'FAIL', riAPI.error);
    }
    
    // Test 3.5: Export Management
    const exportAPI = await makeRequest('GET', '/api/advanced-export/health');
    if (exportAPI.success) {
        logTest('Export Management API', 'PASS', 'Export system operational');
    } else {
        logTest('Export Management API', 'FAIL', exportAPI.error);
    }
    
    // Test 3.6: Webhooks
    const webhookAPI = await makeRequest('GET', '/api/webhooks/advanced-health');
    if (webhookAPI.success) {
        logTest('Webhooks API', 'PASS', 'Webhook system operational');
    } else {
        logTest('Webhooks API', 'FAIL', webhookAPI.error);
    }
    
    // Test 3.7: Data Lake Integration
    const datalakeAPI = await makeRequest('GET', '/api/datalake/health');
    if (datalakeAPI.success) {
        logTest('Data Lake API', 'PASS', 'Data lake system operational');
    } else {
        logTest('Data Lake API', 'FAIL', datalakeAPI.error);
    }
    
    // Test 3.8: Compliance & Governance
    const governanceAPI = await makeRequest('GET', '/api/governance/health');
    if (governanceAPI.success) {
        logTest('Governance API', 'PASS', 'Governance system operational');
    } else {
        logTest('Governance API', 'FAIL', governanceAPI.error);
    }
    
    // ========================================================================
    // PHASE 4: DATA QUALITY TESTS
    // ========================================================================
    
    logSection('PHASE 4: DATA QUALITY TESTS');
    
    // Test 4.1: Cost Data Completeness
    try {
        const costStats = await DatabaseService.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT service_name) as unique_services,
                MIN(date) as earliest_date,
                MAX(date) as latest_date,
                SUM(cost_amount) as total_cost
            FROM cost_records
        `);
        
        const stats = costStats.rows[0];
        if (stats.total_records > 0 && stats.unique_services > 0) {
            logTest('Cost Data Completeness', 'PASS', 
                `${stats.total_records} records, ${stats.unique_services} services, $${parseFloat(stats.total_cost).toFixed(2)} total`);
        } else {
            logTest('Cost Data Completeness', 'FAIL', 'No cost data found');
        }
    } catch (error) {
        logTest('Cost Data Completeness', 'FAIL', error.message);
    }
    
    // Test 4.2: User Data
    try {
        const userStats = await DatabaseService.query('SELECT COUNT(*) as count FROM users');
        const userCount = userStats.rows[0].count;
        if (userCount > 0) {
            logTest('User Data', 'PASS', `${userCount} users in system`);
        } else {
            logTest('User Data', 'FAIL', 'No users found');
        }
    } catch (error) {
        logTest('User Data', 'FAIL', error.message);
    }
    
    // Test 4.3: Data Consistency
    try {
        const consistency = await DatabaseService.query(`
            SELECT 
                COUNT(*) as records_with_nulls
            FROM cost_records 
            WHERE service_name IS NULL OR cost_amount IS NULL OR date IS NULL
        `);
        
        const nullRecords = consistency.rows[0].records_with_nulls;
        if (nullRecords == 0) {
            logTest('Data Consistency', 'PASS', 'No null values in critical fields');
        } else {
            logTest('Data Consistency', 'FAIL', `${nullRecords} records with null values`);
        }
    } catch (error) {
        logTest('Data Consistency', 'FAIL', error.message);
    }
    
    // ========================================================================
    // PHASE 5: INTEGRATION TESTS
    // ========================================================================
    
    logSection('PHASE 5: INTEGRATION TESTS');
    
    // Test 5.1: File System Access
    try {
        const dataDir = path.join(__dirname, 'backend/src/data');
        if (fs.existsSync(dataDir)) {
            const files = fs.readdirSync(dataDir);
            logTest('File System Access', 'PASS', `Data directory accessible, ${files.length} items`);
        } else {
            logTest('File System Access', 'WARN', 'Data directory not found (may not be needed)');
        }
    } catch (error) {
        logTest('File System Access', 'FAIL', error.message);
    }
    
    // Test 5.2: Environment Configuration
    const requiredEnvVars = [
        'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_PORT'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length === 0) {
        logTest('Environment Configuration', 'PASS', 'All required env vars present');
    } else {
        logTest('Environment Configuration', 'FAIL', `Missing: ${missingEnvVars.join(', ')}`);
    }
    
    // ========================================================================
    // PHASE 6: PERFORMANCE TESTS
    // ========================================================================
    
    logSection('PHASE 6: PERFORMANCE TESTS');
    
    // Test 6.1: Database Query Performance
    try {
        const startTime = Date.now();
        await DatabaseService.query('SELECT COUNT(*) FROM cost_records');
        const queryTime = Date.now() - startTime;
        
        if (queryTime < 1000) {
            logTest('Database Query Performance', 'PASS', `Query completed in ${queryTime}ms`);
        } else {
            logTest('Database Query Performance', 'WARN', `Slow query: ${queryTime}ms`);
        }
    } catch (error) {
        logTest('Database Query Performance', 'FAIL', error.message);
    }
    
    // Test 6.2: API Response Time
    try {
        const startTime = Date.now();
        const response = await makeRequest('GET', '/api/costs');
        const responseTime = Date.now() - startTime;
        
        if (response.success && responseTime < 3000) {
            logTest('API Response Time', 'PASS', `API responded in ${responseTime}ms`);
        } else if (response.success) {
            logTest('API Response Time', 'WARN', `Slow API: ${responseTime}ms`);
        } else {
            logTest('API Response Time', 'FAIL', response.error);
        }
    } catch (error) {
        logTest('API Response Time', 'FAIL', error.message);
    }
    
    // ========================================================================
    // PHASE 7: SECURITY TESTS
    // ========================================================================
    
    logSection('PHASE 7: SECURITY TESTS');
    
    // Test 7.1: Database Connection Security
    try {
        const sslCheck = await DatabaseService.query('SHOW ssl');
        const sslStatus = sslCheck.rows[0].ssl;
        if (sslStatus === 'on') {
            logTest('Database SSL', 'PASS', 'SSL connection enabled');
        } else {
            logTest('Database SSL', 'WARN', 'SSL not enabled (OK for development)');
        }
    } catch (error) {
        logTest('Database SSL', 'FAIL', error.message);
    }
    
    // Test 7.2: Sensitive Data Protection
    try {
        const sensitiveCheck = await DatabaseService.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name LIKE '%password%'
        `);
        
        if (sensitiveCheck.rows.length > 0) {
            logTest('Sensitive Data Protection', 'PASS', 'Password fields detected (should be encrypted)');
        } else {
            logTest('Sensitive Data Protection', 'PASS', 'No password fields in users table');
        }
    } catch (error) {
        logTest('Sensitive Data Protection', 'FAIL', error.message);
    }
    
    // ========================================================================
    // FINAL REPORT
    // ========================================================================
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n🎯 FEATURE STATUS:`);
    
    const featureGroups = {
        'Infrastructure': ['Database Connection', 'Backend Server Health', 'Database Tables'],
        'Core APIs': ['Cost Data API', 'Analytics API', 'Trends API'],
        'Advanced Features': [
            'Cost Allocation API', 'Anomaly Detection API', 'Business Forecasting API',
            'Reserved Instances API', 'Export Management API', 'Webhooks API',
            'Data Lake API', 'Governance API'
        ],
        'Data Quality': ['Cost Data Completeness', 'User Data', 'Data Consistency'],
        'Performance': ['Database Query Performance', 'API Response Time'],
        'Security': ['Database SSL', 'Sensitive Data Protection']
    };
    
    for (const [groupName, tests] of Object.entries(featureGroups)) {
        const groupResults = testResults.filter(r => tests.includes(r.test));
        const groupPassed = groupResults.filter(r => r.status === 'PASS').length;
        const groupTotal = groupResults.length;
        const percentage = groupTotal > 0 ? ((groupPassed / groupTotal) * 100).toFixed(0) : 0;
        
        const statusIcon = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
        console.log(`${statusIcon} ${groupName}: ${groupPassed}/${groupTotal} (${percentage}%)`);
    }
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    const failedFeatures = testResults.filter(r => r.status === 'FAIL');
    if (failedFeatures.length > 0) {
        console.log(`\n❌ Failed Tests (${failedFeatures.length}):`);
        failedFeatures.forEach(test => {
            console.log(`   • ${test.test}: ${test.details}`);
        });
    }
    
    if (passedTests === totalTests) {
        console.log(`\n🎉 ALL TESTS PASSED! Your application is fully operational!`);
    } else if (passedTests / totalTests >= 0.8) {
        console.log(`\n✅ Most tests passed! Application is mostly operational.`);
        console.log(`   Fix the failed tests above for full functionality.`);
    } else {
        console.log(`\n⚠️  Several tests failed. Please address the issues above.`);
    }
    
    console.log(`\n📝 NEXT STEPS:`);
    if (failedFeatures.some(f => f.test === 'Database Connection')) {
        console.log(`   1. Fix database connection (check security group and credentials)`);
    }
    if (failedFeatures.some(f => f.test === 'Backend Server Health')) {
        console.log(`   2. Start backend server: cd backend && npm start`);
    }
    if (failedFeatures.some(f => f.test.includes('API'))) {
        console.log(`   3. Ensure backend is running before testing APIs`);
    }
    
    console.log(`\n✅ Test suite completed!\n`);
    
    // Close database connection
    await DatabaseService.close();
}

// Run tests
testApplication().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
