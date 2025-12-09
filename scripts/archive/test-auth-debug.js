#!/usr/bin/env node

/**
 * Authentication Debug Test
 * Tests registration and login to identify issues
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAuth() {
    console.log('🔍 AUTHENTICATION DEBUG TEST\n');
    console.log('='.repeat(60));
    
    // Test 1: Server Health
    console.log('\n📡 Test 1: Checking if server is running...');
    try {
        const response = await axios.get(`${BASE_URL}/../health`);
        console.log('✅ Server is running');
        console.log('   Response:', response.data);
    } catch (error) {
        console.error('❌ Server is NOT running or not responding');
        console.error('   Error:', error.message);
        console.error('\n💡 Please start the server first: cd backend && npm start');
        return;
    }
    
    // Test 2: Registration
    console.log('\n📝 Test 2: Testing user registration...');
    // 🔒 SECURITY: Use environment variables or generate unique test credentials
    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: process.env.TEST_PASSWORD || 'TestPassword123!@#'
    };
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
        console.log('✅ Registration successful');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Registration failed');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', error.response?.data || error.message);
        
        if (error.response?.status === 500) {
            console.error('\n🔍 Server Error Details:');
            console.error('   This is likely a backend issue.');
            console.error('   Check server logs for more details.');
        }
    }
    
    // Test 3: Login
    console.log('\n🔐 Test 3: Testing user login...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            username: testUser.username,
            password: testUser.password
        });
        console.log('✅ Login successful');
        console.log('   Token received:', response.data.token ? 'YES' : 'NO');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Login failed');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', error.response?.data || error.message);
        
        if (error.response?.status === 500) {
            console.error('\n🔍 Possible Issues:');
            console.error('   1. JWT_SECRET not set in environment');
            console.error('   2. Database connection issue');
            console.error('   3. AuthService error');
        }
    }
    
    // Test 4: Environment Variables
    console.log('\n🔧 Test 4: Checking environment configuration...');
    console.log('   Note: This test runs on client side, checking server response');
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log('\nIf you see errors above, check:');
    console.log('1. Server is running: npm start');
    console.log('2. .env file exists in backend/ directory');
    console.log('3. JWT_SECRET is set in .env');
    console.log('4. Database is accessible');
    console.log('5. Check server console for detailed error messages');
}

// Run the test
testAuth().catch(error => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
});
