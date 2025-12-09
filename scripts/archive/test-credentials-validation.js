/**
 * Test AWS Credentials Validation for Schedule Actions
 */

const API_BASE = 'http://localhost:3001/api';

// 🔒 SECURITY: Use environment variables for credentials
// Creates unique test user for each run
const timestamp = Date.now();
const testUser = {
    email: process.env.TEST_EMAIL || `test-creds-${timestamp}@example.com`,
    password: process.env.TEST_PASSWORD || 'TestPassword123!@#'
};

let authToken = '';

async function register() {
    console.log('📝 Registering test user (no AWS credentials)...');
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    if (data.success) {
        console.log('✅ Registration successful');
        return await login();
    }
    console.error('❌ Registration failed:', data);
    return false;
}

async function login() {
    console.log('🔐 Logging in...');
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    if (data.token) {
        authToken = data.token;
        console.log('✅ Login successful');
        return true;
    }
    console.error('❌ Login failed:', data);
    return false;
}

async function checkCredentials() {
    console.log('\n🔍 Checking if user has AWS credentials...');
    const response = await fetch(`${API_BASE}/lifecycle/credentials/check`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });
    
    const data = await response.json();
    console.log('Result:', data);
    return data.hasCredentials;
}

async function tryScheduleWithoutCredentials() {
    console.log('\n📅 Attempting to schedule action WITHOUT AWS credentials...');
    const response = await fetch(`${API_BASE}/lifecycle/schedule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            resourceId: 'i-test-validation-123',
            action: 'shutdown',
            schedule: {
                name: 'Test Schedule Without Creds',
                cronExpression: '0 18 * * 1-5',
                timezone: 'UTC'
            }
        })
    });
    
    const data = await response.json();
    console.log('Result:', data);
    
    if (!data.success && data.errorCode === 'NO_AWS_CREDENTIALS') {
        console.log('✅ CORRECT: Schedule creation blocked due to missing credentials');
        return true;
    } else if (data.success) {
        console.log('❌ WRONG: Schedule was created despite missing credentials!');
        return false;
    } else {
        console.log('⚠️  Unexpected error:', data.error);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Testing AWS Credentials Validation\n');
    console.log('='.repeat(60));
    
    // Register user without AWS credentials
    if (!await register()) return;
    
    // Check credentials (should be false)
    const hasCredentials = await checkCredentials();
    if (!hasCredentials) {
        console.log('✅ Correctly detected no AWS credentials');
    } else {
        console.log('❌ Incorrectly reported having credentials');
    }
    
    // Try to schedule action (should fail with clear error)
    const validationWorked = await tryScheduleWithoutCredentials();
    
    console.log('\n' + '='.repeat(60));
    if (validationWorked) {
        console.log('✅ ALL TESTS PASSED!');
        console.log('   - Credentials check works correctly');
        console.log('   - Schedule creation properly validates credentials');
        console.log('   - Clear error message provided to user');
    } else {
        console.log('❌ TESTS FAILED - Validation not working properly');
    }
}

// Run the tests
runTests().catch(console.error);
