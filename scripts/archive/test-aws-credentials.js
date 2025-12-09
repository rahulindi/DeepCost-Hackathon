/**
 * Test AWS Credentials Validity
 */

const AWS = require('./backend/node_modules/aws-sdk');
const AwsCredentialsService = require('./backend/src/services/awsCredentialsService');

async function testCredentials(userId) {
    console.log('🧪 Testing AWS Credentials\n');
    console.log('='.repeat(60));
    
    try {
        // Get stored credentials
        console.log(`\n1️⃣ Fetching credentials for user ${userId}...`);
        const result = await AwsCredentialsService.getCredentials(userId);
        
        if (!result.success) {
            console.error('❌ No credentials found for user');
            return;
        }
        
        console.log('✅ Credentials retrieved from storage');
        console.log('   Account ID:', result.accountInfo.accountId);
        console.log('   Alias:', result.accountInfo.alias);
        console.log('   Region:', result.credentials.region || 'us-east-1');
        
        // Test credentials with AWS STS
        console.log('\n2️⃣ Validating credentials with AWS STS...');
        AWS.config.update({
            accessKeyId: result.credentials.accessKeyId,
            secretAccessKey: result.credentials.secretAccessKey,
            region: result.credentials.region || 'us-east-1'
        });
        
        const sts = new AWS.STS();
        const identity = await sts.getCallerIdentity({}).promise();
        
        console.log('✅ Credentials are VALID!');
        console.log('   AWS Account:', identity.Account);
        console.log('   User ARN:', identity.Arn);
        console.log('   User ID:', identity.UserId);
        
        // Test EC2 access
        console.log('\n3️⃣ Testing EC2 access...');
        const ec2 = new AWS.EC2({ region: result.credentials.region || 'ap-south-1' });
        const instances = await ec2.describeInstances({ MaxResults: 5 }).promise();
        
        const totalInstances = instances.Reservations.reduce((sum, r) => sum + r.Instances.length, 0);
        console.log(`✅ EC2 access confirmed - found ${totalInstances} instances`);
        
        if (totalInstances > 0) {
            console.log('\n📋 Sample instances:');
            instances.Reservations.forEach(reservation => {
                reservation.Instances.forEach(instance => {
                    console.log(`   - ${instance.InstanceId} (${instance.State.Name}) in ${instance.Placement.AvailabilityZone}`);
                });
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL TESTS PASSED - Credentials are working correctly!');
        
    } catch (error) {
        console.error('\n❌ CREDENTIAL TEST FAILED');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'InvalidClientTokenId') {
            console.error('\n💡 The Access Key ID is invalid or does not exist');
        } else if (error.code === 'SignatureDoesNotMatch') {
            console.error('\n💡 The Secret Access Key is incorrect');
        } else if (error.code === 'AuthFailure') {
            console.error('\n💡 AWS could not validate the credentials');
        }
        
        console.log('\n📝 Please verify:');
        console.log('   1. Access Key ID is correct');
        console.log('   2. Secret Access Key is correct');
        console.log('   3. Credentials are not expired');
        console.log('   4. IAM user has necessary permissions (EC2:DescribeInstances, EC2:StopInstances)');
    }
}

// Get user ID from command line or use default
const userId = process.argv[2] ? parseInt(process.argv[2]) : 1763658402716;

testCredentials(userId);
