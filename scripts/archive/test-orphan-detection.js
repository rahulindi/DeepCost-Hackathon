/**
 * Quick test to see if orphan detection finds your volume
 */

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const AWS = require('./backend/node_modules/aws-sdk');

const userId = 1763658402716;

async function testOrphanDetection() {
    console.log('🧪 Testing Orphan Detection\n');
    
    try {
        // Get credentials
        const creds = SimpleAwsCredentials.get(userId);
        if (!creds.success) {
            console.error('❌ No credentials found');
            return;
        }
        
        // Initialize AWS
        AWS.config.update({
            accessKeyId: creds.credentials.accessKeyId,
            secretAccessKey: creds.credentials.secretAccessKey,
            region: creds.credentials.region
        });
        
        const ec2 = new AWS.EC2();
        
        // Check for unattached volumes
        console.log('🔍 Scanning for unattached EBS volumes...\n');
        const volumes = await ec2.describeVolumes().promise();
        
        console.log(`Total volumes found: ${volumes.Volumes.length}\n`);
        
        volumes.Volumes.forEach(vol => {
            const status = vol.State === 'available' ? '❌ UNATTACHED (ORPHAN!)' : '✅ Attached';
            const attachments = vol.Attachments.length > 0 ? 
                `Attached to: ${vol.Attachments[0].InstanceId}` : 
                'Not attached to any instance';
            
            console.log(`Volume: ${vol.VolumeId}`);
            console.log(`  Status: ${status}`);
            console.log(`  Size: ${vol.Size} GB`);
            console.log(`  Type: ${vol.VolumeType}`);
            console.log(`  ${attachments}`);
            console.log(`  Created: ${vol.CreateTime}`);
            console.log('');
        });
        
        const orphanCount = volumes.Volumes.filter(v => v.State === 'available').length;
        
        if (orphanCount > 0) {
            console.log(`\n✅ Found ${orphanCount} orphaned volume(s)!`);
            console.log('These should appear in your app when you click Refresh.');
        } else {
            console.log('\n⚠️  No orphaned volumes found.');
            console.log('Make sure you created a volume and did NOT attach it to any instance.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testOrphanDetection();
