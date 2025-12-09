// Test AWS credentials lookup with different user ID formats
require('dotenv').config({ path: './backend/.env' });
const AwsCredentialsService = require('./backend/src/services/awsCredentialsService');

async function testCredentialsLookup() {
    console.log('🧪 Testing AWS Credentials Lookup\n');
    console.log('='.repeat(60));
    
    // Test with number
    console.log('\n📋 Test 1: Lookup with number (1)');
    const result1 = await AwsCredentialsService.getCredentials(1);
    console.log('Result:', result1.success ? '✅ SUCCESS' : '❌ FAILED');
    if (result1.success) {
        console.log('Account:', result1.accountInfo.alias);
        console.log('Type:', result1.accountInfo.type);
    } else {
        console.log('Error:', result1.error);
    }
    
    // Test with string
    console.log('\n📋 Test 2: Lookup with string ("1")');
    const result2 = await AwsCredentialsService.getCredentials('1');
    console.log('Result:', result2.success ? '✅ SUCCESS' : '❌ FAILED');
    if (result2.success) {
        console.log('Account:', result2.accountInfo.alias);
        console.log('Type:', result2.accountInfo.type);
    } else {
        console.log('Error:', result2.error);
    }
    
    // List all credentials
    console.log('\n📋 Test 3: List all stored credentials');
    const userIds = await AwsCredentialsService.listAllCredentials();
    console.log('Total users with credentials:', userIds.length);
    
    console.log('\n' + '='.repeat(60));
    
    if (result1.success || result2.success) {
        console.log('✅ AWS credentials lookup is working!');
    } else {
        console.log('❌ AWS credentials lookup failed');
    }
}

testCredentialsLookup();
