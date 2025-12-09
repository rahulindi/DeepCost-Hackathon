/**
 * Store AWS Credentials - Simple & Direct
 * Usage: node store-aws-creds.js <ACCESS_KEY> <SECRET_KEY> [REGION]
 */

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');

const accessKeyId = process.argv[2];
const secretAccessKey = process.argv[3];
const region = process.argv[4] || 'ap-south-1';
const userId = 1763658402716;

if (!accessKeyId || !secretAccessKey) {
    console.log('❌ Missing credentials');
    console.log('\nUsage:');
    console.log('  node store-aws-creds.js AKIAS 88z8/u+g ap-south-1');
    console.log('\nExample:');
    console.log('  node store-aws-creds.js AKIASEI 88zap-south-1');
    process.exit(1);
}

console.log('💾 Storing AWS Credentials\n');
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
        } else {
            console.log('✅ Credentials are VALID!');
            console.log('   Account:', data.Account);
            console.log('   ARN:', data.Arn);
            console.log('\n🎉 Ready to use! Restart your backend.');
        }
    });
} else {
    console.log('❌ Failed to store credentials:', result.error);
}
