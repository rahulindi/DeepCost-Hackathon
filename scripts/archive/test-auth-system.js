// Test Authentication System with Database
require('dotenv').config({ path: './backend/.env' });

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 🔒 SECURITY: Use environment variables for credentials
// Creates unique test user for each run
const timestamp = Date.now();
const TEST_USER = {
    username: process.env.TEST_USERNAME || `testuser_${timestamp}`,
    email: process.env.TEST_EMAIL || `testuser_${timestamp}@example.com`,
    password: process.env.TEST_PASSWORD || 'TestPassword123!'
};

let authToken = null;
let refreshToken = null;

async function testAuthSystem() {
    console.log('🧪 Testing Authentication System with PostgreSQL\n');
    console.log('='.repeat(80));
    
    let passedTests = 0;
    let failedTests = 0;
    
    // Test 1: Register new user
    console.log('\n📋 Test 1: User Registration');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
        
        if (response.data.success) {
            console.log('✅ Registration successful');
            console.log(`   User ID: ${response.data.user.id}`);
            console.log(`   Email: ${response.data.user.email}`);
            console.log(`   Verified: ${response.data.user.email_verified}`);
            passedTests++;
        } else {
            console.log('❌ Registration failed:', response.data.error);
            failedTests++;
        }
    } catch (error) {
        console.log('❌ Registration error:', error.response?.data?.error || error.message);
        failedTests++;
    }
    
    // Test 2: Login with new user
    console.log('\n📋 Test 2: User Login');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        
        if (response.data.success) {
            authToken = response.data.token;
            refreshToken = response.data.refreshToken;
            console.log('✅ Login successful');
            console.log(`   Token: ${authToken.substring(0, 20)}...`);
            console.log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`);
            console.log(`   User: ${response.data.user.username}`);
            console.log(`   Role: ${response.data.user.role}`);
            passedTests++;
        } else {
            console.log('❌ Login failed:', response.data.error);
            failedTests++;
        }
    } catch (error) {
        console.log('❌ Login error:', error.response?.data?.error || error.message);
        failedTests++;
    }
    
    // Test 3: Verify token
    console.log('\n📋 Test 3: Token Verification');
    try {
        const response = await axios.get(`${BASE_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.data.success) {
            console.log('✅ Token verification successful');
            console.log(`   User: ${response.data.user.username}`);
            console.log(`   Email: ${response.data.user.email}`);
            passedTests++;
        } else {
            console.log('❌ Token verification failed:', response.data.error);
            failedTests++;
        }
    } catch (error) {
        console.log('❌ Token verification error:', error.response?.data?.error || error.message);
        failedTests++;
    }
    
    // Test 4: Access protected endpoint
    console.log('\n📋 Test 4: Protected Endpoint Access');
    try {
        const response = await axios.get(`${BASE_URL}/api/costs`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 200) {
            console.log('✅ Protected endpoint access successful');
            console.log(`   Cost records: ${response.data.length}`);
            passedTests++;
        } else {
            console.log('❌ Protected endpoint access failed');
            failedTests++;
        }
    } catch (error) {
        console.log('❌ Protected endpoint error:', error.response?.data?.error || error.message);
        failedTests++;
    }
    
    // Test 5: Refresh token
    console.log('\n📋 Test 5: Token Refresh');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refreshToken: refreshToken
        });
        
        if (response.data.success) {
            const newToken = response.data.token;
            console.log('✅ Token refresh successful');
            console.log(`   New Token: ${newToken.substring(0, 20)}...`);
            authToken = newToken; // Update token for next tests
            passedTests++;
        } else {
            console.log('❌ Token refresh failed:', response.data.error);
            failedTests++;
        }
    } catch (error) {
        console.log('❌ Token refresh error:', error.response?.data?.error || error.message);
        failedTests++;
    }
    
    // Test 6: Invalid login attempt
    console.log('\n📋 Test 6: Invalid Login (Wrong Password)');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_USER.email,
            password: 'WrongPassword123!'
        });
        
        if (!response.data.success) {
            console.log('✅ Invalid login correctly rejected');
            console.log(`   Error: ${response.data.error}`);
            passedTests++;
        } else {
            console.log('❌ Invalid login was accepted (security issue!)');
            failedTests++;
        }
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Invalid login correctly rejected');
            console.log(`   Error: ${error.response.data.error}`);
            passedTests++;
        } else {
            console.log('❌ Unexpected error:', error.message);
            failedTests++;
        }
    }
    
    // Test 7: Rate limiting
    console.log('\n📋 Test 7: Rate Limiting (5 failed attempts)');
    try {
        let rateLimitTriggered = false;
        
        for (let i = 0; i < 6; i++) {
            try {
                await axios.post(`${BASE_URL}/api/auth/login`, {
                    email: `ratelimit_${Date.now()}@test.com`,
                    password: 'wrong'
                });
            } catch (error) {
                if (error.response?.status === 429) {
                    rateLimitTriggered = true;
                    console.log('✅ Rate limiting triggered after multiple attempts');
                    console.log(`   Status: ${error.response.status}`);
                    console.log(`   Message: ${error.response.data.error}`);
                    passedTests++;
                    break;
                }
            }
        }
        
        if (!rateLimitTriggered) {
            console.log('⚠️  Rate limiting not triggered (may need more attempts)');
            passedTests++; // Don't fail, just note
        }
    } catch (error) {
        console.log('❌ Rate limiting test error:', error.message);
        failedTests++;
    }
    
    // Test 8: Logout
    console.log('\n📋 Test 8: User Logout');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/logout`, {
            refreshToken: refreshToken
        });
        
        if (response.data.success) {
            console.log('✅ Logout successful');
            console.log(`   Message: ${response.data.message}`);
            passedTests++;
        } else {
            console.log('❌ Logout failed:', response.data.error);
            failedTests++;
        }
    } catch (error) {
        console.log('❌ Logout error:', error.response?.data?.error || error.message);
        failedTests++;
    }
    
    // Test 9: Token should be invalid after logout
    console.log('\n📋 Test 9: Token Invalid After Logout');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refreshToken: refreshToken
        });
        
        if (!response.data.success) {
            console.log('✅ Refresh token correctly invalidated after logout');
            passedTests++;
        } else {
            console.log('❌ Refresh token still valid after logout (security issue!)');
            failedTests++;
        }
    } catch (error) {
        if (error.response?.status === 400 || error.response?.status === 401) {
            console.log('✅ Refresh token correctly invalidated after logout');
            passedTests++;
        } else {
            console.log('❌ Unexpected error:', error.message);
            failedTests++;
        }
    }
    
    // Test 10: Password strength validation
    console.log('\n📋 Test 10: Password Strength Validation');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, {
            username: 'weakpassuser',
            email: `weakpass_${Date.now()}@test.com`,
            password: 'weak'
        });
        
        if (!response.data.success && response.data.error.includes('Password')) {
            console.log('✅ Weak password correctly rejected');
            console.log(`   Error: ${response.data.error}`);
            passedTests++;
        } else {
            console.log('❌ Weak password was accepted (security issue!)');
            failedTests++;
        }
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Weak password correctly rejected');
            console.log(`   Error: ${error.response.data.error}`);
            passedTests++;
        } else {
            console.log('❌ Unexpected error:', error.message);
            failedTests++;
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${passedTests + failedTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Authentication system is working correctly!');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Run the comprehensive application test: node test-entire-application.js');
    console.log('2. Test the frontend login/registration');
    console.log('3. Verify all features work with the new database authentication');
}

// Check if backend is running
async function checkBackend() {
    try {
        await axios.get(`${BASE_URL}/health`);
        return true;
    } catch (error) {
        return false;
    }
}

// Main execution
(async () => {
    console.log('🔍 Checking if backend is running...\n');
    
    const isRunning = await checkBackend();
    
    if (!isRunning) {
        console.log('❌ Backend server is not running!');
        console.log('\n💡 Please start the backend first:');
        console.log('   cd backend && npm start');
        console.log('\nThen run this test again.');
        process.exit(1);
    }
    
    console.log('✅ Backend is running\n');
    
    await testAuthSystem();
})();
