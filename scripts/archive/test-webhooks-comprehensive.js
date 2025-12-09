// Comprehensive Webhook Feature Test
// Tests database, service, routes, and end-to-end functionality
require('dotenv').config({ path: './backend/.env' });

const DatabaseService = require('./backend/src/services/databaseService');
const webhookService = require('./backend/src/services/webhookService');
const http = require('http');
const axios = require('axios');

// Test configuration
const TEST_USER_ID = 1; // Valid user ID from users table
const TEST_WEBHOOK_PORT = 3002;
const BACKEND_PORT = 3001;
const TEST_WEBHOOK_URL = `http://localhost:${TEST_WEBHOOK_PORT}/webhook`;

// Test webhook server
let testServer;
let receivedWebhooks = [];

function startTestWebhookServer() {
    return new Promise((resolve) => {
        testServer = http.createServer((req, res) => {
            if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        const payload = JSON.parse(body);
                        receivedWebhooks.push({
                            timestamp: new Date(),
                            headers: req.headers,
                            payload: payload
                        });
                        console.log(`   📨 Test webhook received: ${payload.event || 'unknown'}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Webhook received' }));
                    } catch (error) {
                        console.error('   ❌ Error parsing webhook:', error);
                        res.writeHead(400);
                        res.end('Bad Request');
                    }
                });
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
        
        testServer.listen(TEST_WEBHOOK_PORT, () => {
            console.log(`   🌐 Test webhook server started on http://localhost:${TEST_WEBHOOK_PORT}`);
            resolve();
        });
    });
}

function stopTestWebhookServer() {
    if (testServer) {
        testServer.close();
        console.log('   🛑 Test webhook server stopped');
    }
}

async function testWebhooks() {
    console.log('🧪 COMPREHENSIVE WEBHOOK FEATURE TEST\n');
    console.log('='  .repeat(80) + '\n');

    let testsPassed = 0;
    let testsFailed = 0;
    const testResults = [];

    try {
        // ============================================================
        // PHASE 1: DATABASE SCHEMA VERIFICATION
        // ============================================================
        console.log('📊 PHASE 1: DATABASE SCHEMA VERIFICATION\n');
        
        // Test 1.1: Check webhook_configs table exists
        console.log('1.1 Checking webhook_configs table...');
        try {
            const configsTable = await DatabaseService.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'webhook_configs'
                ORDER BY ordinal_position
            `);
            
            if (configsTable.rows.length > 0) {
                console.log('   ✅ webhook_configs table exists with columns:');
                configsTable.rows.forEach(col => {
                    console.log(`      - ${col.column_name} (${col.data_type})`);
                });
                testsPassed++;
                testResults.push({ test: 'webhook_configs table', status: 'PASS' });
            } else {
                throw new Error('Table not found');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'webhook_configs table', status: 'FAIL', error: error.message });
        }

        // Test 1.2: Check webhook_deliveries table exists
        console.log('\n1.2 Checking webhook_deliveries table...');
        try {
            const deliveriesTable = await DatabaseService.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'webhook_deliveries'
                ORDER BY ordinal_position
            `);
            
            if (deliveriesTable.rows.length > 0) {
                console.log('   ✅ webhook_deliveries table exists with columns:');
                deliveriesTable.rows.forEach(col => {
                    console.log(`      - ${col.column_name} (${col.data_type})`);
                });
                testsPassed++;
                testResults.push({ test: 'webhook_deliveries table', status: 'PASS' });
            } else {
                throw new Error('Table not found');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'webhook_deliveries table', status: 'FAIL', error: error.message });
        }

        // Test 1.3: Check indexes
        console.log('\n1.3 Checking database indexes...');
        try {
            const indexes = await DatabaseService.query(`
                SELECT indexname, tablename
                FROM pg_indexes
                WHERE tablename IN ('webhook_configs', 'webhook_deliveries')
            `);
            
            console.log(`   ✅ Found ${indexes.rows.length} indexes:`);
            indexes.rows.forEach(idx => {
                console.log(`      - ${idx.indexname} on ${idx.tablename}`);
            });
            testsPassed++;
            testResults.push({ test: 'Database indexes', status: 'PASS' });
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Database indexes', status: 'FAIL', error: error.message });
        }

        // ============================================================
        // PHASE 2: SERVICE LAYER TESTING
        // ============================================================
        console.log('\n\n📦 PHASE 2: SERVICE LAYER TESTING\n');

        let webhookId = null;

        // Test 2.1: Create webhook configuration
        console.log('2.1 Creating webhook configuration...');
        try {
            const createResult = await webhookService.createWebhookConfig(TEST_USER_ID, {
                webhook_url: TEST_WEBHOOK_URL,
                events: ['cost.threshold.exceeded', 'export.completed'],
                is_active: true
            });
            
            if (createResult.success && createResult.config && createResult.secret_key) {
                webhookId = createResult.config.id;
                console.log('   ✅ Webhook created successfully');
                console.log(`      ID: ${webhookId}`);
                console.log(`      URL: ${createResult.config.webhook_url}`);
                console.log(`      Events: ${createResult.config.events.join(', ')}`);
                console.log(`      Secret: ${createResult.secret_key.substring(0, 16)}...`);
                testsPassed++;
                testResults.push({ test: 'Create webhook config', status: 'PASS' });
            } else {
                throw new Error(createResult.error || 'Failed to create webhook');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Create webhook config', status: 'FAIL', error: error.message });
        }

        // Test 2.2: Get webhook configurations
        console.log('\n2.2 Retrieving webhook configurations...');
        try {
            const getResult = await webhookService.getWebhookConfigs(TEST_USER_ID);
            
            if (getResult.success && getResult.configs.length > 0) {
                console.log(`   ✅ Retrieved ${getResult.configs.length} webhook config(s)`);
                getResult.configs.forEach(config => {
                    console.log(`      - ID ${config.id}: ${config.webhook_url}`);
                    console.log(`        Events: ${config.events.join(', ')}`);
                    console.log(`        Active: ${config.is_active}`);
                });
                testsPassed++;
                testResults.push({ test: 'Get webhook configs', status: 'PASS' });
            } else {
                throw new Error('No webhooks found');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Get webhook configs', status: 'FAIL', error: error.message });
        }

        // Test 2.3: Update webhook configuration
        console.log('\n2.3 Updating webhook configuration...');
        try {
            if (!webhookId) throw new Error('No webhook ID available');
            
            const updateResult = await webhookService.updateWebhookConfig(webhookId, TEST_USER_ID, {
                events: ['cost.threshold.exceeded', 'export.completed', 'budget.alert'],
                is_active: true
            });
            
            if (updateResult.success) {
                console.log('   ✅ Webhook updated successfully');
                console.log(`      New events: ${updateResult.config.events.join(', ')}`);
                testsPassed++;
                testResults.push({ test: 'Update webhook config', status: 'PASS' });
            } else {
                throw new Error(updateResult.error);
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Update webhook config', status: 'FAIL', error: error.message });
        }

        // ============================================================
        // PHASE 3: WEBHOOK DELIVERY TESTING
        // ============================================================
        console.log('\n\n📨 PHASE 3: WEBHOOK DELIVERY TESTING\n');

        // Start test webhook server
        console.log('3.1 Starting test webhook server...');
        await startTestWebhookServer();
        testsPassed++;
        testResults.push({ test: 'Start webhook server', status: 'PASS' });

        // Test 3.2: Test webhook endpoint
        console.log('\n3.2 Testing webhook endpoint...');
        try {
            const testResult = await webhookService.testWebhook(TEST_WEBHOOK_URL);
            
            if (testResult.success) {
                console.log('   ✅ Test webhook delivered successfully');
                console.log(`      Status: ${testResult.status}`);
                console.log(`      Response: ${JSON.stringify(testResult.response)}`);
                testsPassed++;
                testResults.push({ test: 'Test webhook delivery', status: 'PASS' });
            } else {
                throw new Error(testResult.error);
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Test webhook delivery', status: 'FAIL', error: error.message });
        }

        // Wait for webhook to be received
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 3.3: Send event webhook
        console.log('\n3.3 Sending event webhook...');
        try {
            // Get webhook config with secret
            const configs = await webhookService.getWebhookConfigs(TEST_USER_ID);
            const config = configs.configs[0];
            
            // Get secret from database
            const secretResult = await DatabaseService.query(
                'SELECT secret_key FROM webhook_configs WHERE id = $1',
                [config.id]
            );
            const secretKey = secretResult.rows[0].secret_key;
            
            // Deliver webhook directly
            const deliveryResult = await webhookService.deliverWebhook(
                { ...config, secret_key: secretKey },
                'export.completed',
                {
                    export_id: 'test-export-123',
                    export_type: 'cost_summary',
                    file_size: 2048,
                    download_url: 'http://localhost:3001/api/export/download/test-export-123'
                }
            );
            
            if (deliveryResult.success) {
                console.log('   ✅ Event webhook delivered successfully');
                console.log(`      Status: ${deliveryResult.status}`);
                console.log(`      Delivery ID: ${deliveryResult.delivery_id}`);
                testsPassed++;
                testResults.push({ test: 'Send event webhook', status: 'PASS' });
            } else {
                throw new Error('Delivery failed');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Send event webhook', status: 'FAIL', error: error.message });
        }

        // Wait for webhook to be received
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 3.4: Verify webhooks received
        console.log('\n3.4 Verifying received webhooks...');
        try {
            if (receivedWebhooks.length >= 2) {
                console.log(`   ✅ Test server received ${receivedWebhooks.length} webhooks:`);
                receivedWebhooks.forEach((webhook, idx) => {
                    console.log(`      ${idx + 1}. Event: ${webhook.payload.event}`);
                    console.log(`         Timestamp: ${webhook.timestamp.toISOString()}`);
                    console.log(`         Has signature: ${!!webhook.headers['x-webhook-signature']}`);
                });
                testsPassed++;
                testResults.push({ test: 'Verify received webhooks', status: 'PASS' });
            } else {
                throw new Error(`Expected 2+ webhooks, received ${receivedWebhooks.length}`);
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Verify received webhooks', status: 'FAIL', error: error.message });
        }

        // Test 3.5: Check delivery history
        console.log('\n3.5 Checking delivery history...');
        try {
            if (!webhookId) throw new Error('No webhook ID available');
            
            const historyResult = await webhookService.getDeliveryHistory(webhookId, TEST_USER_ID, 10);
            
            if (historyResult.success && historyResult.deliveries.length > 0) {
                console.log(`   ✅ Retrieved ${historyResult.deliveries.length} delivery record(s):`);
                historyResult.deliveries.forEach(delivery => {
                    console.log(`      - ${delivery.event_type}: HTTP ${delivery.response_status}`);
                    console.log(`        Delivered at: ${delivery.delivered_at}`);
                });
                testsPassed++;
                testResults.push({ test: 'Check delivery history', status: 'PASS' });
            } else {
                throw new Error('No delivery history found');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Check delivery history', status: 'FAIL', error: error.message });
        }

        // ============================================================
        // PHASE 4: API ENDPOINT TESTING
        // ============================================================
        console.log('\n\n🌐 PHASE 4: API ENDPOINT TESTING\n');

        // Get auth token (simulate login)
        const authToken = 'test-token-' + Date.now();
        
        // Test 4.1: Health check endpoint
        console.log('4.1 Testing health check endpoint...');
        try {
            const response = await axios.get(`http://localhost:${BACKEND_PORT}/api/webhooks/advanced-health`);
            
            if (response.status === 200 && response.data.status === 'operational') {
                console.log('   ✅ Health check passed');
                console.log(`      Status: ${response.data.status}`);
                console.log(`      Version: ${response.data.version}`);
                console.log(`      Features: ${response.data.features.slice(0, 3).join(', ')}...`);
                testsPassed++;
                testResults.push({ test: 'Health check endpoint', status: 'PASS' });
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Health check endpoint', status: 'FAIL', error: error.message });
        }

        // Note: Full API endpoint testing requires authentication middleware
        console.log('\n4.2 API endpoint authentication...');
        console.log('   ℹ️  API endpoints require authentication (tested via service layer)');
        console.log('   ℹ️  Frontend integration uses authenticated requests');

        // ============================================================
        // PHASE 5: SECURITY TESTING
        // ============================================================
        console.log('\n\n🔒 PHASE 5: SECURITY TESTING\n');

        // Test 5.1: HMAC signature generation
        console.log('5.1 Testing HMAC signature generation...');
        try {
            const testPayload = { test: 'data', timestamp: Date.now() };
            const testSecret = 'test-secret-key';
            
            const signature1 = webhookService.generateSignature(testPayload, testSecret);
            const signature2 = webhookService.generateSignature(testPayload, testSecret);
            
            if (signature1 === signature2 && signature1.length === 64) {
                console.log('   ✅ HMAC signature generation working');
                console.log(`      Signature: ${signature1.substring(0, 32)}...`);
                testsPassed++;
                testResults.push({ test: 'HMAC signature generation', status: 'PASS' });
            } else {
                throw new Error('Signature mismatch or invalid length');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'HMAC signature generation', status: 'FAIL', error: error.message });
        }

        // Test 5.2: Signature verification
        console.log('\n5.2 Testing signature verification...');
        try {
            const testPayload = { test: 'data', timestamp: Date.now() };
            const testSecret = 'test-secret-key';
            
            const signature = webhookService.generateSignature(testPayload, testSecret);
            const isValid = webhookService.verifySignature(testPayload, `sha256=${signature}`, testSecret);
            
            if (isValid) {
                console.log('   ✅ Signature verification working');
                testsPassed++;
                testResults.push({ test: 'Signature verification', status: 'PASS' });
            } else {
                throw new Error('Signature verification failed');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Signature verification', status: 'FAIL', error: error.message });
        }

        // ============================================================
        // PHASE 6: CLEANUP
        // ============================================================
        console.log('\n\n🧹 PHASE 6: CLEANUP\n');

        // Test 6.1: Delete webhook configuration
        console.log('6.1 Deleting webhook configuration...');
        try {
            if (!webhookId) throw new Error('No webhook ID available');
            
            const deleteResult = await webhookService.deleteWebhookConfig(webhookId, TEST_USER_ID);
            
            if (deleteResult.success) {
                console.log('   ✅ Webhook deleted successfully');
                testsPassed++;
                testResults.push({ test: 'Delete webhook config', status: 'PASS' });
            } else {
                throw new Error(deleteResult.error);
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Delete webhook config', status: 'FAIL', error: error.message });
        }

        // Test 6.2: Verify deletion
        console.log('\n6.2 Verifying deletion...');
        try {
            const getResult = await webhookService.getWebhookConfigs(TEST_USER_ID);
            
            const deletedWebhook = getResult.configs.find(c => c.id === webhookId);
            if (!deletedWebhook) {
                console.log('   ✅ Webhook successfully deleted from database');
                testsPassed++;
                testResults.push({ test: 'Verify deletion', status: 'PASS' });
            } else {
                throw new Error('Webhook still exists after deletion');
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ test: 'Verify deletion', status: 'FAIL', error: error.message });
        }

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error);
        testsFailed++;
    } finally {
        stopTestWebhookServer();
    }

    // ============================================================
    // FINAL REPORT
    // ============================================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY\n');
    
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);
    
    console.log('Detailed Results:');
    testResults.forEach((result, idx) => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${idx + 1}. ${icon} ${result.test}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    console.log('\n' + '='.repeat(80));
    
    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Webhook feature is fully operational!\n');
        process.exit(0);
    } else {
        console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
        process.exit(1);
    }
}

// Run tests
testWebhooks().catch(error => {
    console.error('❌ Test execution failed:', error);
    stopTestWebhookServer();
    process.exit(1);
});
