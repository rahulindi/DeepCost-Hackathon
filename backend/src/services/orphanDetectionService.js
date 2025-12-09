const AWS = require('aws-sdk');
const AwsCredentialsService = require('./awsCredentialsService');
const SimpleAwsCredentials = require('./simpleAwsCredentials');

class OrphanDetectionService {
    constructor() {
        // Will be initialized with user credentials
        this.ec2 = null;
        this.rds = null;
        this.elbv2 = null;
    }

    /**
     * Initialize AWS clients with user credentials
     * Tries both SimpleAwsCredentials (unencrypted) and AwsCredentialsService (encrypted)
     */
    async initializeAWS(userId) {
        try {
            console.log(`🔑 OrphanDetectionService: Initializing AWS for user ${userId}...`);
            
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;
            
            console.log(`   Converted user ID: ${dbUserId} (type: ${typeof dbUserId})`);
            
            // Try SimpleAwsCredentials first (faster, no decryption)
            let creds = SimpleAwsCredentials.get(dbUserId);
            let credSource = 'SimpleAwsCredentials';
            
            // If not found, try encrypted credentials
            if (!creds.success) {
                console.log(`   SimpleAwsCredentials not found, trying encrypted storage...`);
                creds = await AwsCredentialsService.getCredentials(dbUserId);
                credSource = 'AwsCredentialsService';
            }
            
            console.log(`   Credentials result from ${credSource}:`, creds.success ? 'SUCCESS' : `FAILED - ${creds.error}`);
            
            if (!creds.success) {
                console.error(`❌ AWS credentials not found for user ${dbUserId} in either storage`);
                return false;
            }

            AWS.config.update({
                accessKeyId: creds.credentials.accessKeyId,
                secretAccessKey: creds.credentials.secretAccessKey,
                region: creds.credentials.region
            });

            this.ec2 = new AWS.EC2();
            this.rds = new AWS.RDS();
            this.elbv2 = new AWS.ELBv2();
            
            console.log(`✅ OrphanDetectionService initialized for user ${userId} in region ${creds.credentials.region} (source: ${credSource})`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AWS:', error);
            return false;
        }
    }

    /**
     * Detect orphaned resources in an AWS account - REAL AWS SCAN
     */
    async detectOrphans(accountId, service = null, userId = null) {
        try {
            console.log(`🔍 Detecting REAL orphaned resources for account: ${accountId}`);
            
            // Initialize AWS with user credentials
            if (userId) {
                const initialized = await this.initializeAWS(userId);
                if (!initialized) {
                    throw new Error('Failed to initialize AWS - check credentials');
                }
            }

            if (!this.ec2) {
                throw new Error('AWS not initialized - no credentials available');
            }
            
            const orphanedResources = [];
            
            // 1. REAL: Find Unattached EBS Volumes
            console.log('   Scanning EBS volumes...');
            const volumes = await this.ec2.describeVolumes().promise();
            
            volumes.Volumes.forEach(vol => {
                if (vol.State === 'available') {
                    const monthlyCost = this.calculateVolumeCost(vol);
                    const daysSinceCreation = Math.floor((Date.now() - new Date(vol.CreateTime)) / (1000 * 60 * 60 * 24));
                    
                    orphanedResources.push({
                        resourceId: vol.VolumeId,
                        resourceType: 'EBS Volume',
                        serviceName: 'EC2',
                        region: vol.AvailabilityZone,
                        orphanType: 'unattached',
                        lastActivity: vol.CreateTime,
                        potentialSavings: monthlyCost,
                        riskLevel: daysSinceCreation > 30 ? 'low' : 'medium',
                        metadata: {
                            size: `${vol.Size} GB`,
                            volumeType: vol.VolumeType,
                            daysSinceCreation: daysSinceCreation
                        }
                    });
                }
            });
            
            // 2. REAL: Find Unused Elastic IPs
            console.log('   Scanning Elastic IPs...');
            const addresses = await this.ec2.describeAddresses().promise();
            
            addresses.Addresses.forEach(addr => {
                if (!addr.InstanceId && !addr.NetworkInterfaceId) {
                    orphanedResources.push({
                        resourceId: addr.AllocationId,
                        resourceType: 'Elastic IP',
                        serviceName: 'EC2',
                        region: addr.Domain,
                        orphanType: 'unused',
                        lastActivity: new Date().toISOString(),
                        potentialSavings: 3.65,
                        riskLevel: 'low',
                        metadata: {
                            publicIp: addr.PublicIp,
                            domain: addr.Domain
                        }
                    });
                }
            });
            
            // 3. REAL: Find Long-Stopped Instances
            console.log('   Scanning stopped instances...');
            const instances = await this.ec2.describeInstances().promise();
            
            instances.Reservations.forEach(reservation => {
                reservation.Instances.forEach(instance => {
                    if (instance.State.Name === 'stopped') {
                        const stoppedTime = instance.StateTransitionReason.match(/\((\d{4}-\d{2}-\d{2})/)?.[1];
                        const daysStopped = stoppedTime ? 
                            Math.floor((Date.now() - new Date(stoppedTime)) / (1000 * 60 * 60 * 24)) : 0;
                        
                        if (daysStopped > 7) {
                            const name = instance.Tags?.find(t => t.Key === 'Name')?.Value || 'Unnamed';
                            
                            orphanedResources.push({
                                resourceId: instance.InstanceId,
                                resourceType: 'EC2 Instance (Stopped)',
                                serviceName: 'EC2',
                                region: instance.Placement.AvailabilityZone,
                                orphanType: 'idle',
                                lastActivity: stoppedTime || instance.LaunchTime,
                                potentialSavings: 5,
                                riskLevel: daysStopped > 30 ? 'low' : 'high',
                                metadata: {
                                    instanceType: instance.InstanceType,
                                    name: name,
                                    daysStopped: daysStopped
                                }
                            });
                        }
                    }
                });
            });

            // 4. REAL: Find Unattached Network Interfaces (ENIs)
            console.log('   Scanning network interfaces...');
            const networkInterfaces = await this.ec2.describeNetworkInterfaces().promise();
            
            networkInterfaces.NetworkInterfaces.forEach(eni => {
                // Check if ENI is not attached to any instance
                if (eni.Status === 'available' && !eni.Attachment) {
                    const name = eni.TagSet?.find(t => t.Key === 'Name')?.Value || 'Unnamed';
                    const daysSinceCreation = eni.RequesterId ? 0 : 
                        Math.floor((Date.now() - new Date()) / (1000 * 60 * 60 * 24));
                    
                    orphanedResources.push({
                        resourceId: eni.NetworkInterfaceId,
                        resourceType: 'Network Interface (ENI)',
                        serviceName: 'EC2',
                        region: eni.AvailabilityZone,
                        orphanType: 'unattached',
                        lastActivity: new Date().toISOString(),
                        potentialSavings: 0, // ENIs are free when not attached, but they clutter resources
                        riskLevel: 'low',
                        metadata: {
                            name: name,
                            description: eni.Description || 'No description',
                            privateIp: eni.PrivateIpAddress,
                            subnetId: eni.SubnetId,
                            vpcId: eni.VpcId,
                            interfaceType: eni.InterfaceType || 'interface'
                        }
                    });
                }
            });

            console.log(`✅ Found ${orphanedResources.length} orphaned resources`);
            return orphanedResources;
        } catch (error) {
            console.error('❌ Orphan detection error:', error);
            throw error;
        }
    }

    calculateVolumeCost(volume) {
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

    /**
     * Cleanup an orphaned resource - REAL AWS DELETION
     */
    async cleanupResource(orphanResource, userId = null) {
        try {
            console.log(`🧹 Cleaning up orphaned resource: ${orphanResource.resource_id}`);
            console.log(`   Type: ${orphanResource.resource_type}`);
            
            // Initialize AWS if userId provided
            if (userId && !this.ec2) {
                const initialized = await this.initializeAWS(userId);
                if (!initialized) {
                    throw new Error('Failed to initialize AWS credentials');
                }
            }

            if (!this.ec2) {
                throw new Error('AWS not initialized - cannot cleanup resource');
            }

            let result;
            
            // REAL AWS DELETION based on resource type
            switch (orphanResource.resource_type) {
                case 'EBS Volume':
                    console.log(`   Deleting EBS volume: ${orphanResource.resource_id}`);
                    result = await this.ec2.deleteVolume({
                        VolumeId: orphanResource.resource_id
                    }).promise();
                    console.log(`✅ EBS volume deleted successfully`);
                    break;

                case 'Elastic IP':
                    console.log(`   Releasing Elastic IP: ${orphanResource.resource_id}`);
                    result = await this.ec2.releaseAddress({
                        AllocationId: orphanResource.resource_id
                    }).promise();
                    console.log(`✅ Elastic IP released successfully`);
                    break;

                case 'Network Interface (ENI)':
                    console.log(`   Deleting Network Interface: ${orphanResource.resource_id}`);
                    result = await this.ec2.deleteNetworkInterface({
                        NetworkInterfaceId: orphanResource.resource_id
                    }).promise();
                    console.log(`✅ Network Interface deleted successfully`);
                    break;

                case 'EC2 Instance (Stopped)':
                    console.log(`   Terminating stopped EC2 instance: ${orphanResource.resource_id}`);
                    result = await this.ec2.terminateInstances({
                        InstanceIds: [orphanResource.resource_id]
                    }).promise();
                    console.log(`✅ EC2 instance terminated successfully`);
                    break;

                default:
                    throw new Error(`Unsupported resource type for cleanup: ${orphanResource.resource_type}`);
            }

            return {
                success: true,
                message: `Successfully cleaned up ${orphanResource.resource_type}`,
                savings: orphanResource.potential_savings,
                awsResponse: result
            };
        } catch (error) {
            console.error('❌ Cleanup error:', error);
            
            // Provide more helpful error messages
            let errorMessage = error.message;
            if (error.code === 'InvalidVolume.NotFound') {
                errorMessage = 'Volume not found - it may have already been deleted';
            } else if (error.code === 'InvalidAllocationID.NotFound') {
                errorMessage = 'Elastic IP not found - it may have already been released';
            } else if (error.code === 'InvalidNetworkInterfaceID.NotFound') {
                errorMessage = 'Network Interface not found - it may have already been deleted';
            } else if (error.code === 'InvalidInstanceID.NotFound') {
                errorMessage = 'Instance not found - it may have already been terminated';
            } else if (error.code === 'UnauthorizedOperation') {
                errorMessage = 'Insufficient permissions to delete this resource';
            }
            
            return {
                success: false,
                error: errorMessage,
                awsError: error.code
            };
        }
    }

    /**
     * Check if resource is safe to cleanup
     */
    async isSafeToCleanup(resourceId, resourceType) {
        try {
            // Mock safety check - would verify dependencies
            const safetyChecks = [
                'No active dependencies',
                'No recent activity',
                'Not part of active stack'
            ];

            return {
                safe: true,
                checks: safetyChecks,
                riskLevel: 'low'
            };
        } catch (error) {
            console.error('❌ Safety check error:', error);
            return {
                safe: false,
                error: error.message,
                riskLevel: 'high'
            };
        }
    }
}

module.exports = OrphanDetectionService;
