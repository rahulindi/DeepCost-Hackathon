/**
 * Quick Store AWS Credentials for User 2
 * Interactive script - just run it and paste your credentials
 */

const readline = require('readline');
const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const AWS = require('./backend/node_modules/aws-sdk');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const userId = 2;

console.log('🔐 Quick AWS Credentials Setup for User 2\n');
console.log('This will store your AWS credentials securely.\n');

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    try {
        const accessKeyId = await question('Enter AWS Access Key ID: ');
        const secretAccessKey = await question('Enter AWS Secret Access Key: ');
        const region = await question('Enter AWS Region (default: ap-south-1): ') || 'ap-south-1';
        
        console.log('\n💾 Storing credentials...');
        
        const result = SimpleAwsCredentials.store(userId, accessKeyId.trim(), secretAccessKey.trim(), region.trim());
        
        if (!result.success) {
            console.log('❌ Failed to store credentials:', result.error);
            rl.close();
            return;
        }
        
        console.log('✅ Credentials stored!\n');
        console.log('🧪 Testing credentials...');
        
        AWS.config.update({
            accessKeyId: accessKeyId.trim(),
            secretAccessKey: secretAccessKey.trim(),
            region: region.trim()
        });
        
        const sts = new AWS.STS();
        
        sts.getCallerIdentity({}, (err, data) => {
            if (err) {
                console.log('❌ Credentials test FAILED:', err.message);
                console.log('\nThe credentials were stored but are not valid.');
                console.log('Please check:');
                console.log('1. Access Key ID is correct');
                console.log('2. Secret Access Key is correct');
                console.log('3. Credentials are active in AWS IAM');
            } else {
                console.log('✅ Credentials are VALID!\n');
                console.log('Account:', data.Account);
                console.log('User ARN:', data.Arn);
                console.log('\n🎉 Setup complete! Orphan detection should now work.');
                console.log('\nTest it with:');
                console.log('  node test-orphan-credentials-fix.js');
            }
            rl.close();
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
    }
}

main();
