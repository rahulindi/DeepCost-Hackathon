/**
 * Real Orphan Detection - Scans AWS for Orphaned Resources
 * Finds: Unattached EBS volumes, Unused Elastic IPs, Stopped instances, etc.
 */

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const DatabaseService = require('./backend/src/services/databaseService');
const AWS = require('./backend/node_modules/aws-sdk');
require('dotenv').config({ path: './backend/.env' });

const userId = 1763658402716;

async function detectRealOrphans() {
    console.log('🔍 Detecting Real Orphaned Resources\n');
    console.log('='.repeat(60));
    
    try {
        // Get credentials
        console.log('\n1️⃣ Loading AWS credentials...');
        const creds = SimpleAwsCredentials.get(userId);
        if (!creds.success) {
            console.error('❌ No credentials found');
            return;
        }
        console.log('✅ Credentials loaded');
        
        // Initialize AWS
        AWS.config.update({
            accessKeyId: creds.credentials.accessKeyId,
            secretAccessKey: creds.credentials.secretAccessKey,
            region: creds.credentials.region
        });
        
        const ec2 = new AWS.EC2();
        const orphans = [];
        
        // 1. Find Unattached EBS Volumes
        console.log('\n2️⃣ Scanning for unattached EBS volumes...');
        const volumes = await ec2.describeVolumes().promise();
        
        volumes.Volumes.forEach(vol => {
            if (vol.State === 'available') { // Not attached to any instance
                const monthlyCost = calculateVolumeCost(vol);
                const daysSinceCreation = Math.floor((Date.now() - new Date(vol.CreateTime)) / (1000 * 60 * 60 * 24));
                
                orphans.push({
                    resource_id: vol.VolumeId,
                    resource_type: 'EBS Volume',
                    service_name: 'EC2',
                    region: creds.credentials.region,
                    orphan_type: 'unattached',
                    last_activity: vol.CreateTime,
                    monthly_cost: monthlyCost,
                    cleanup_risk_level: daysSinceCreation > 30 ? 'low' : 'medium',
                    metadata: {
                        size: vol.Size,
                        volumeType: vol.VolumeType,
                        daysSinceCreation: daysSinceCreation
                    }
                });
                
                console.log(`   📦 Found: ${vol.VolumeId} (${vol.Size}GB ${vol.VolumeType}) - $${monthlyCost.toFixed(2)}/mo`);
            }
        });
        
        // 2. Find Unused Elastic IPs
        console.log('\n3️⃣ Scanning for unused Elastic IPs...');
        const addresses = await ec2.describeAddresses().promise();
        
        addresses.Addresses.forEach(addr => {
            if (!addr.InstanceId && !addr.NetworkInterfaceId) { // Not associated
                const monthlyCost = 3.65; // Cost per unused EIP in ap-south-1
                
                orphans.push({
                    resource_id: addr.AllocationId,
                    resource_type: 'Elastic IP',
                    service_name: 'EC2',
                    region: creds.credentials.region,
                    orphan_type: 'unused',
                    last_activity: new Date().toISOString(),
                    monthly_cost: monthlyCost,
                    cleanup_risk_level: 'low',
                    metadata: {
                        publicIp: addr.PublicIp,
                        domain: addr.Domain
                    }
                });
                
                console.log(`   🌐 Found: ${addr.AllocationId} (${addr.PublicIp}) - $${monthlyCost.toFixed(2)}/mo`);
            }
        });
        
        // 3. Find Long-Stopped Instances
        console.log('\n4️⃣ Scanning for long-stopped instances...');
        const instances = await ec2.describeInstances().promise();
        
        instances.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                if (instance.State.Name === 'stopped') {
                    const stoppedTime = instance.StateTransitionReason.match(/\((\d{4}-\d{2}-\d{2})/)?.[1];
                    const daysStopped = stoppedTime ? 
                        Math.floor((Date.now() - new Date(stoppedTime)) / (1000 * 60 * 60 * 24)) : 0;
                    
                    if (daysStopped > 7) { // Stopped for more than 7 days
                        const name = instance.Tags?.find(t => t.Key === 'Name')?.Value || 'Unnamed';
                        const monthlyCost = 5; // Approximate cost for stopped instance (EBS volumes)
                        
                        orphans.push({
                            resource_id: instance.InstanceId,
                            resource_type: 'EC2 Instance (Stopped)',
                            service_name: 'EC2',
                            region: creds.credentials.region,
                            orphan_type: 'idle',
                            last_activity: stoppedTime || instance.LaunchTime,
                            monthly_cost: monthlyCost,
                            cleanup_risk_level: daysStopped > 30 ? 'low' : 'high',
                            metadata: {
                                instanceType: instance.InstanceType,
                                name: name,
                                daysStopped: daysStopped
                            }
                        });
                        
                        console.log(`   💤 Found: ${instance.InstanceId} (${name}) - Stopped ${daysStopped} days - $${monthlyCost.toFixed(2)}/mo`);
                    }
                }
            });
        });
        
        // Save to database
        console.log(`\n5️⃣ Saving ${orphans.length} orphaned resources to database...`);
        
        // Clear old orphans
        await DatabaseService.query(
            'DELETE FROM orphaned_resources WHERE created_by = $1',
            [userId]
        );
        
        for (const orphan of orphans) {
            await DatabaseService.query(`
                INSERT INTO orphaned_resources 
                (resource_id, resource_type, service_name, region, orphan_type,
                 monthly_cost, detected_at, created_by, cleaned_up)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, false)
            `, [
                orphan.resource_id, orphan.resource_type, orphan.service_name,
                orphan.region, orphan.orphan_type, orphan.monthly_cost, userId
            ]);
        }
        
        console.log('✅ Orphans saved to database');
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Orphan detection complete!`);
        console.log(`   - Total orphaned resources: ${orphans.length}`);
        console.log(`   - Total monthly waste: $${orphans.reduce((sum, o) => sum + o.monthly_cost, 0).toFixed(2)}`);
        console.log(`\n💡 Go to Lifecycle Management → Orphan Cleanup tab to see details`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function calculateVolumeCost(volume) {
    // Pricing for ap-south-1
    const pricePerGBMonth = {
        'gp3': 0.088,
        'gp2': 0.11,
        'io1': 0.138,
        'io2': 0.138,
        'st1': 0.054,
        'sc1': 0.028,
        'standard': 0.055
    };
    
    const pricePerGB = pricePerGBMonth[volume.VolumeType] || 0.11;
    return volume.Size * pricePerGB;
}

detectRealOrphans();
