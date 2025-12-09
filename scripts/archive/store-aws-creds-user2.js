/**
 * Store AWS Credentials for User 2
 * Usage: node store-aws-creds-user2.js <ACCESS_KEY> <SECRET_KEY> [REGION]
 */

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');

const accessKeyId = process.argv[2];
const secretAccessKey = process.argv[3];
const region = process.argv[4] || 'ap-south-1';
const userId = 2; // User ID from the error message

if (!accessKeyId || !secretAccessKey) {
    console.log('❌ Missing credentials');
    console.log('\nUsage:');
    console.log('  node store-aws-creds-user2.js <ACCESS_KEY> <SECRET_KEY> [REGION]');
    console.log('\nExample:');
    console.log('  node store-aws-creds-user2.js AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY ap-south-1');
    process.exit(1);
}

console.log('💾 Storing AWS Credentials for User 2\n');
console.log('User ID:', userId);
console.log('Access Key:', accessKeyId.substring(0, 8) + '...');
console.log('Region:', region);

const result = SimpleAwsCredentials.store(userId, accessKeyId, secretAccessKey, region);

if (result.success) {
    console.log('\n✅ Credentials stored successfully!');
    console.log('\n🧪 Testing connection...');
    
    // Test the credentials
    const AWS = require('./backend/node_modules/aws-sdk');
    AWS.config.update({ accessKeyId, secretAccessKey, region });
    
    const sts = new AWS.STS();
    sts.getCallerIdentity({}, (err, data) => {
        if (err) {
            console.log('❌ Credentials test failed:', err.message);
            console.log('\nPossible reasons:');
            console.log('1. Invalid access key or secret key');
            console.log('2. Credentials are not active in AWS');
            console.log('3. Network connectivity issues');
        } else {
            console.log('✅ Credentials are VALID!');
            console.log('   Account:', data.Account);
            console.log('   ARN:', data.Arn);
            console.log('\n🎉 Ready to use! The orphan detection should now work.');
            console.log('\nTest it with:');
            console.log('  node test-orphan-credentials-fix.js');
        }
    });
} else {
    console.log('❌ Failed to store credentials:', result.error);
}
