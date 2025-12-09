#!/usr/bin/env node

/**
 * Test JWT Generation
 * Verifies that JWT tokens can be generated with current environment
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const jwt = require('jsonwebtoken');

console.log('🔍 JWT GENERATION TEST\n');
console.log('='.repeat(60));

// Check if JWT_SECRET is loaded
console.log('\n1. Checking JWT_SECRET environment variable...');
if (process.env.JWT_SECRET) {
    console.log('✅ JWT_SECRET is set');
    console.log(`   Length: ${process.env.JWT_SECRET.length} characters`);
} else {
    console.error('❌ JWT_SECRET is NOT set');
    console.error('   This will cause authentication to fail!');
    process.exit(1);
}

// Test JWT token generation
console.log('\n2. Testing JWT token generation...');
try {
    const testPayload = {
        userId: 'test-user-123',
        email: 'test@example.com'
    };
    
    const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ JWT token generated successfully');
    console.log(`   Token: ${token.substring(0, 50)}...`);
    
    // Test token verification
    console.log('\n3. Testing JWT token verification...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT token verified successfully');
    console.log('   Decoded payload:', decoded);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL JWT TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nJWT generation is working correctly.');
    console.log('If authentication still fails, the issue is elsewhere.');
    
} catch (error) {
    console.error('❌ JWT test failed');
    console.error('   Error:', error.message);
    console.error('\n🔍 This indicates a problem with JWT configuration');
    process.exit(1);
}
