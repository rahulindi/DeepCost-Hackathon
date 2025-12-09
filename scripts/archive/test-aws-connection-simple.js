/**
 * Simple AWS Connection Test
 * Tests if we can connect to AWS with environment variables
 */

const AWS = require('./backend/node_modules/aws-sdk');

// Try to use credentials from environment or prompt
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.argv[2];
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.argv[3];
const region = process.env.AWS_REGION || 'ap-south-1';

if (!accessKeyId || !secretAccessKey) {
    console.log('❌ No AWS credentials provided');
    console.log('\nUsage:');
    console.log('  node test-aws-connection-simple.js <ACCESS_KEY_ID> <SECRET_ACCESS_KEY>');
    console.log('\nOr set environment variables:');
    console.log('  export AWS_ACCESS_KEY_ID=your_key');
    console.log('  export AWS_SECRET_ACCESS_KEY=your_secret');
    process.exit(1);
}

console.log('🧪 Testing AWS Connection\n');
console.log('Region:', region);
console.log('Access Key:', accessKeyId.substring(0, 8) + '...');

AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
});

async function testConnection() {
    try {
        // Test 1: STS GetCallerIdentity
        console.log('\n1️⃣ Testing credentials with STS...');
        const sts = new AWS.STS();
        const identity = await sts.getCallerIdentity({}).promise();
        console.log('✅ Credentials VALID!');
        console.log('   Account:', identity.Account);
        console.log('   User:', identity.Arn);
        
        // Test 2: List EC2 instances
        console.log('\n2️⃣ Listing EC2 instances...');
        const ec2 = new AWS.EC2({ region });
        const instances = await ec2.describeInstances({ MaxResults: 10 }).promise();
        
        const allInstances = [];
        instances.Reservations.forEach(r => {
            r.Instances.forEach(i => allInstances.push(i));
        });
        
        console.log(`✅ Found ${allInstances.length} EC2 instances`);
        
        if (allInstances.length > 0) {
            console.log('\n📋 Instances:');
            allInstances.forEach(i => {
                const name = i.Tags?.find(t => t.Key === 'Name')?.Value || 'Unnamed';
                console.log(`   - ${i.InstanceId} (${i.InstanceType}) - ${i.State.Name} - ${name}`);
            });
            
            console.log('\n✅ Ready for real rightsizing analysis!');
            console.log('💡 We can analyze these instances for rightsizing opportunities');
        } else {
            console.log('\n⚠️  No EC2 instances found');
            console.log('💡 Create a test instance to demo rightsizing');
        }
        
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.error('Code:', error.code);
    }
}

testConnection();
