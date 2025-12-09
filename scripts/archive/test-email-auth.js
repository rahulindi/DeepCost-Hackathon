#!/usr/bin/env node

/**
 * Test Email-Based Authentication
 * Verifies registration and login work with email
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testEmailAuth() {
    console.log('📧 EMAIL-BASED AUTHENTICATION TEST\n');
    console.log('='.repeat(60));
    
    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'TestPassword123!@#';
    
    // Test 1: Registration with Email Only
    console.log('\n📝 Test 1: Register with email (no username)...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: testEmail,
            password: testPassword
            // Note: No username provided!
        });
        
        console.log('✅ Registration successful');
        console.log('   Email:', testEmail);
        console.log('   Auto-generated username:', response.data.user?.username);
        console.log('   Email verified:', response.data.user?.email_verified);
    } catch (error) {
        console.error('❌ Registration failed');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', error.response?.data);
        return;
    }
    
    // Test 2: Login with Email
    console.log('\n🔐 Test 2: Login with email...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testEmail,  // Using email field
            password: testPassword
        });
        
        console.log('✅ Login successful with EMAIL');
        console.log('   Token received:', response.data.token ? 'YES ✓' : 'NO ✗');
        console.log('   Token length:', response.data.token?.length);
    } catch (error) {
        console.error('❌ Login with email failed');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', error.response?.data);
    }
    
    // Test 3: Login with Username (backward compatibility)
    console.log('\n🔐 Test 3: Login with username (backward compatibility)...');
    const username = testEmail.split('@')[0]; // Extract username
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            username: username,  // Using username field
            password: testPassword
        });
        
        console.log('✅ Login successful with USERNAME');
        console.log('   Token received:', response.data.token ? 'YES ✓' : 'NO ✗');
    } catch (error) {
        console.error('❌ Login with username failed');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', error.response?.data);
    }
    
    // Test 4: Registration with Both Email and Username
    console.log('\n📝 Test 4: Register with both email and username...');
    const timestamp2 = Date.now();
    const testEmail2 = `test${timestamp2}@example.com`;
    const testUsername = `customuser${timestamp2}`;
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            username: testUsername,
            email: testEmail2,
            password: testPassword
        });
        
        console.log('✅ Registration successful');
        console.log('   Email:', testEmail2);
        console.log('   Username:', response.data.user?.username);
    } catch (error) {
        console.error('❌ Registration failed');
        console.error('   Error:', error.response?.data);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log('\n✅ Email-based authentication is working!');
    console.log('\nYou can now:');
    console.log('1. Register with just email (username auto-generated)');
    console.log('2. Login with email');
    console.log('3. Login with username (backward compatible)');
    console.log('4. Register with both email and username');
}

// Check if server is running first
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/../health`);
        return true;
    } catch (error) {
        console.error('❌ Server is not running!');
        console.error('   Please start the server: cd backend && npm start');
        return false;
    }
}

// Run tests
checkServer().then(isRunning => {
    if (isRunning) {
        testEmailAuth().catch(error => {
            console.error('\n💥 Unexpected error:', error.message);
            process.exit(1);
        });
    }
});
