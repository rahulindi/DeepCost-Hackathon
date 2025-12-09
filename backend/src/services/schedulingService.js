const AWS = require('aws-sdk');
const AwsCredentialsService = require('./awsCredentialsService');

class SchedulingService {
    constructor() {
        this.ec2 = null;
        this.rds = null;
        this.autoscaling = null;
        this.ecs = null;
        // Don't initialize AWS in constructor - will be initialized per-user when needed
    }

    async initializeAWS(userId = null) {
        try {
            console.log(`🔑 Initializing AWS clients for user ${userId}...`);
            
            // Try simple credentials first (no encryption issues)
            const SimpleAwsCredentials = require('./simpleAwsCredentials');
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;
            
            console.log(`📡 Fetching credentials for DB user ID: ${dbUserId}`);
            let credentials = SimpleAwsCredentials.get(dbUserId);
            
            // Fallback to encrypted credentials if simple ones don't exist
            if (!credentials || !credentials.success) {
                console.log('⚠️ Simple credentials not found, trying encrypted...');
                credentials = await AwsCredentialsService.getCredentials(dbUserId);
            }
            
            if (!credentials || !credentials.success) {
                console.error(`❌ Failed to get AWS credentials for user ${userId}`);
                console.error('Credentials response:', credentials);
                return false;
            }

            if (!credentials.credentials || !credentials.credentials.accessKeyId || !credentials.credentials.secretAccessKey) {
                console.error(`❌ Invalid credentials structure for user ${userId}`);
                console.error('Credentials:', credentials);
                return false;
            }
            
            // Update AWS config
            AWS.config.update({
                accessKeyId: credentials.credentials.accessKeyId,
                secretAccessKey: credentials.credentials.secretAccessKey,
                region: credentials.credentials.region || 'ap-south-1'
            });

            // Initialize AWS service clients
            this.ec2 = new AWS.EC2();
            this.rds = new AWS.RDS();
            this.autoscaling = new AWS.AutoScaling();
            this.ecs = new AWS.ECS();
            
            console.log(`✅ AWS clients initialized successfully for user ${userId} in region ${credentials.credentials.region || 'ap-south-1'}`);
            return true;
        } catch (error) {
            console.error(`❌ Error initializing AWS for user ${userId}:`, error);
            console.error('Error stack:', error.stack);
            return false;
        }
    }

    /**
     * Execute a scheduled action on a resource
     */
    async executeAction(resourceId, actionType, metadata = {}) {
        try {
            console.log(`⚡ Executing ${actionType} on resource ${resourceId} for user ${metadata.userId}`);

            // CRITICAL: Re-initialize AWS with user credentials BEFORE any action
            if (metadata.userId) {
                const initialized = await this.initializeAWS(metadata.userId);
                if (!initialized) {
                    throw new Error(`Failed to initialize AWS clients for user ${metadata.userId}. Please check AWS credentials.`);
                }
            } else {
                throw new Error('User ID is required for scheduled actions');
            }

            // Verify EC2 client is initialized
            if (!this.ec2) {
                throw new Error('EC2 client not initialized after credential setup');
            }

            switch (actionType) {
                case 'shutdown':
                    return await this.shutdownResource(resourceId, metadata);
                case 'startup':
                    return await this.startupResource(resourceId, metadata);
                case 'resize':
                    return await this.resizeResource(resourceId, metadata);
                case 'terminate':
                    return await this.terminateResource(resourceId, metadata);
                case 'scale_down':
                    return await this.scaleDownResource(resourceId, metadata);
                case 'scale_up':
                    return await this.scaleUpResource(resourceId, metadata);
                default:
                    throw new Error(`Unknown action type: ${actionType}`);
            }
        } catch (error) {
            console.error(`❌ Error executing action ${actionType}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * RESOURCE SHUTDOWN METHODS
     */

    async shutdownResource(resourceId, metadata) {
        try {
            const resourceType = await this.getResourceType(resourceId);

            // Auto-detect region if not provided
            if (!metadata.region && resourceType === 'ec2') {
                console.log('🔍 Region not specified, attempting auto-detection...');
                const detectedRegion = await this.findInstanceRegion(resourceId);
                if (detectedRegion) {
                    metadata.region = detectedRegion;
                    console.log(`✅ Using detected region: ${detectedRegion}`);
                }
            }

            switch (resourceType) {
                case 'ec2':
                    return await this.shutdownEC2Instance(resourceId, metadata);
                case 'rds':
                    return await this.shutdownRDSInstance(resourceId, metadata);
                case 'autoscaling':
                    return await this.scaleDownASG(resourceId, metadata);
                case 'ecs':
                    return await this.shutdownECSService(resourceId, metadata);
                default:
                    throw new Error(`Unsupported resource type for shutdown: ${resourceType}`);
            }
        } catch (error) {
            console.error('❌ Error shutting down resource:', error);
            return { success: false, error: error.message };
        }
    }

    async shutdownEC2Instance(instanceId, metadata) {
        try {
            if (!this.ec2) throw new Error('EC2 client not initialized');

            // If region is specified in metadata, create region-specific client
            if (metadata.region && metadata.region !== this.ec2.config.region) {
                console.log(`🌍 Creating EC2 client for region: ${metadata.region}`);
                const AWS = require('aws-sdk');
                const regionalEc2 = new AWS.EC2({ region: metadata.region });
                
                // Check instance state first
                const instanceData = await regionalEc2.describeInstances({
                    InstanceIds: [instanceId]
                }).promise();
                
                if (instanceData.Reservations.length === 0) {
                    throw new Error(`Instance ${instanceId} not found in region ${metadata.region}`);
                }

                const instance = instanceData.Reservations[0].Instances[0];
                
                if (instance.State.Name === 'stopped') {
                    return { success: true, message: 'Instance already stopped', skipped: true };
                }

                if (instance.State.Name !== 'running') {
                    return { success: false, error: `Instance is in ${instance.State.Name} state, cannot stop` };
                }

                // Stop the instance using regional client
                await regionalEc2.stopInstances({
                    InstanceIds: [instanceId],
                    Force: metadata.force || false
                }).promise();

                console.log(`✅ EC2 instance ${instanceId} shutdown initiated in region ${metadata.region}`);
                return { success: true, message: `EC2 instance shutdown initiated in ${metadata.region}` };
            }

            // Check instance state first
            const instanceData = await this.ec2.describeInstances({
                InstanceIds: [instanceId]
            }).promise();

            if (instanceData.Reservations.length === 0) {
                throw new Error(`Instance ${instanceId} not found`);
            }

            const instance = instanceData.Reservations[0].Instances[0];
            
            if (instance.State.Name === 'stopped') {
                return { success: true, message: 'Instance already stopped', skipped: true };
            }

            if (instance.State.Name !== 'running') {
                return { success: false, error: `Instance is in ${instance.State.Name} state, cannot stop` };
            }

            // Add shutdown protection tags if specified
            if (metadata.addTags) {
                await this.ec2.createTags({
                    Resources: [instanceId],
                    Tags: [
                        { Key: 'AutoShutdown', Value: 'true' },
                        { Key: 'ShutdownTime', Value: new Date().toISOString() },
                        { Key: 'ScheduledAction', Value: 'shutdown' }
                    ]
                }).promise();
            }

            // Stop the instance
            await this.ec2.stopInstances({
                InstanceIds: [instanceId],
                Force: metadata.force || false
            }).promise();

            console.log(`✅ EC2 instance ${instanceId} shutdown initiated`);
            return { success: true, message: 'EC2 instance shutdown initiated' };
        } catch (error) {
            console.error('❌ Error shutting down EC2 instance:', error);
            return { success: false, error: error.message };
        }
    }

    async shutdownRDSInstance(dbInstanceId, metadata) {
        try {
            if (!this.rds) throw new Error('RDS client not initialized');

            // Check current state
            const dbInstance = await this.rds.describeDBInstances({
                DBInstanceIdentifier: dbInstanceId
            }).promise();

            const instance = dbInstance.DBInstances[0];
            
            if (instance.DBInstanceStatus === 'stopped') {
                return { success: true, message: 'RDS instance already stopped', skipped: true };
            }

            if (instance.DBInstanceStatus !== 'available') {
                return { success: false, error: `RDS instance is in ${instance.DBInstanceStatus} state` };
            }

            // Stop RDS instance
            await this.rds.stopDBInstance({
                DBInstanceIdentifier: dbInstanceId,
                DBSnapshotIdentifier: metadata.createSnapshot ? 
                    `${dbInstanceId}-scheduled-shutdown-${Date.now()}` : undefined
            }).promise();

            console.log(`✅ RDS instance ${dbInstanceId} shutdown initiated`);
            return { success: true, message: 'RDS instance shutdown initiated' };
        } catch (error) {
            console.error('❌ Error shutting down RDS instance:', error);
            return { success: false, error: error.message };
        }
    }

    async scaleDownASG(asgName, metadata) {
        try {
            if (!this.autoscaling) throw new Error('AutoScaling client not initialized');

            // Get current ASG configuration
            const asgData = await this.autoscaling.describeAutoScalingGroups({
                AutoScalingGroupNames: [asgName]
            }).promise();

            if (asgData.AutoScalingGroups.length === 0) {
                throw new Error(`Auto Scaling Group ${asgName} not found`);
            }

            const asg = asgData.AutoScalingGroups[0];

            // Store original capacity if not already stored
            if (!metadata.originalCapacity) {
                metadata.originalCapacity = {
                    min: asg.MinSize,
                    max: asg.MaxSize,
                    desired: asg.DesiredCapacity
                };
            }

            // Scale down to minimum or specified capacity
            const targetCapacity = metadata.targetCapacity || 0;
            
            await this.autoscaling.updateAutoScalingGroup({
                AutoScalingGroupName: asgName,
                MinSize: targetCapacity,
                MaxSize: Math.max(targetCapacity, asg.MaxSize),
                DesiredCapacity: targetCapacity
            }).promise();

            console.log(`✅ Auto Scaling Group ${asgName} scaled down to ${targetCapacity}`);
            return { 
                success: true, 
                message: `Auto Scaling Group scaled down to ${targetCapacity}`,
                originalCapacity: metadata.originalCapacity
            };
        } catch (error) {
            console.error('❌ Error scaling down ASG:', error);
            return { success: false, error: error.message };
        }
    }

    async shutdownECSService(serviceName, metadata) {
        try {
            if (!this.ecs) throw new Error('ECS client not initialized');

            const clusterName = metadata.cluster || 'default';

            // Get current service
            const serviceData = await this.ecs.describeServices({
                cluster: clusterName,
                services: [serviceName]
            }).promise();

            if (serviceData.services.length === 0) {
                throw new Error(`ECS service ${serviceName} not found`);
            }

            const service = serviceData.services[0];

            // Store original task count
            if (!metadata.originalTaskCount) {
                metadata.originalTaskCount = service.desiredCount;
            }

            // Scale service to 0 tasks
            await this.ecs.updateService({
                cluster: clusterName,
                service: serviceName,
                desiredCount: 0
            }).promise();

            console.log(`✅ ECS service ${serviceName} scaled down to 0 tasks`);
            return { 
                success: true, 
                message: 'ECS service scaled down to 0 tasks',
                originalTaskCount: metadata.originalTaskCount
            };
        } catch (error) {
            console.error('❌ Error shutting down ECS service:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * RESOURCE STARTUP METHODS
     */

    async startupResource(resourceId, metadata) {
        try {
            const resourceType = await this.getResourceType(resourceId);

            switch (resourceType) {
                case 'ec2':
                    return await this.startupEC2Instance(resourceId, metadata);
                case 'rds':
                    return await this.startupRDSInstance(resourceId, metadata);
                case 'autoscaling':
                    return await this.scaleUpASG(resourceId, metadata);
                case 'ecs':
                    return await this.startupECSService(resourceId, metadata);
                default:
                    throw new Error(`Unsupported resource type for startup: ${resourceType}`);
            }
        } catch (error) {
            console.error('❌ Error starting up resource:', error);
            return { success: false, error: error.message };
        }
    }

    async startupEC2Instance(instanceId, metadata) {
        try {
            if (!this.ec2) throw new Error('EC2 client not initialized');

            const instanceData = await this.ec2.describeInstances({
                InstanceIds: [instanceId]
            }).promise();

            if (instanceData.Reservations.length === 0) {
                throw new Error(`Instance ${instanceId} not found`);
            }

            const instance = instanceData.Reservations[0].Instances[0];

            if (instance.State.Name === 'running') {
                return { success: true, message: 'Instance already running', skipped: true };
            }

            if (instance.State.Name !== 'stopped') {
                return { success: false, error: `Instance is in ${instance.State.Name} state, cannot start` };
            }

            // Start the instance
            await this.ec2.startInstances({
                InstanceIds: [instanceId]
            }).promise();

            console.log(`✅ EC2 instance ${instanceId} startup initiated`);
            return { success: true, message: 'EC2 instance startup initiated' };
        } catch (error) {
            console.error('❌ Error starting up EC2 instance:', error);
            return { success: false, error: error.message };
        }
    }

    async startupRDSInstance(dbInstanceId, metadata) {
        try {
            if (!this.rds) throw new Error('RDS client not initialized');

            const dbInstance = await this.rds.describeDBInstances({
                DBInstanceIdentifier: dbInstanceId
            }).promise();

            const instance = dbInstance.DBInstances[0];

            if (instance.DBInstanceStatus === 'available') {
                return { success: true, message: 'RDS instance already running', skipped: true };
            }

            if (instance.DBInstanceStatus !== 'stopped') {
                return { success: false, error: `RDS instance is in ${instance.DBInstanceStatus} state` };
            }

            // Start RDS instance
            await this.rds.startDBInstance({
                DBInstanceIdentifier: dbInstanceId
            }).promise();

            console.log(`✅ RDS instance ${dbInstanceId} startup initiated`);
            return { success: true, message: 'RDS instance startup initiated' };
        } catch (error) {
            console.error('❌ Error starting up RDS instance:', error);
            return { success: false, error: error.message };
        }
    }

    async scaleUpASG(asgName, metadata) {
        try {
            if (!this.autoscaling) throw new Error('AutoScaling client not initialized');

            if (!metadata.originalCapacity) {
                throw new Error('Original capacity metadata required for scale up');
            }

            // Restore original capacity
            await this.autoscaling.updateAutoScalingGroup({
                AutoScalingGroupName: asgName,
                MinSize: metadata.originalCapacity.min,
                MaxSize: metadata.originalCapacity.max,
                DesiredCapacity: metadata.originalCapacity.desired
            }).promise();

            console.log(`✅ Auto Scaling Group ${asgName} restored to original capacity`);
            return { success: true, message: 'Auto Scaling Group restored to original capacity' };
        } catch (error) {
            console.error('❌ Error scaling up ASG:', error);
            return { success: false, error: error.message };
        }
    }

    async startupECSService(serviceName, metadata) {
        try {
            if (!this.ecs) throw new Error('ECS client not initialized');

            const clusterName = metadata.cluster || 'default';

            if (!metadata.originalTaskCount) {
                throw new Error('Original task count metadata required for service startup');
            }

            // Restore original task count
            await this.ecs.updateService({
                cluster: clusterName,
                service: serviceName,
                desiredCount: metadata.originalTaskCount
            }).promise();

            console.log(`✅ ECS service ${serviceName} restored to ${metadata.originalTaskCount} tasks`);
            return { success: true, message: `ECS service restored to ${metadata.originalTaskCount} tasks` };
        } catch (error) {
            console.error('❌ Error starting up ECS service:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * RESOURCE RESIZE/TERMINATE METHODS
     */

    async resizeResource(resourceId, metadata) {
        try {
            const resourceType = await this.getResourceType(resourceId);

            if (resourceType !== 'ec2') {
                throw new Error(`Resize not supported for ${resourceType}`);
            }

            return await this.resizeEC2Instance(resourceId, metadata);
        } catch (error) {
            console.error('❌ Error resizing resource:', error);
            return { success: false, error: error.message };
        }
    }

    async resizeEC2Instance(instanceId, metadata) {
        try {
            if (!this.ec2) throw new Error('EC2 client not initialized');
            if (!metadata.newInstanceType) throw new Error('New instance type required');

            // Stop instance first if running
            const instanceData = await this.ec2.describeInstances({
                InstanceIds: [instanceId]
            }).promise();

            const instance = instanceData.Reservations[0].Instances[0];
            const wasRunning = instance.State.Name === 'running';

            if (wasRunning) {
                await this.ec2.stopInstances({
                    InstanceIds: [instanceId]
                }).promise();

                // Wait for instance to stop
                await this.ec2.waitFor('instanceStopped', {
                    InstanceIds: [instanceId]
                }).promise();
            }

            // Modify instance type
            await this.ec2.modifyInstanceAttribute({
                InstanceId: instanceId,
                InstanceType: { Value: metadata.newInstanceType }
            }).promise();

            // Restart instance if it was running
            if (wasRunning) {
                await this.ec2.startInstances({
                    InstanceIds: [instanceId]
                }).promise();
            }

            console.log(`✅ EC2 instance ${instanceId} resized to ${metadata.newInstanceType}`);
            return { success: true, message: `Instance resized to ${metadata.newInstanceType}` };
        } catch (error) {
            console.error('❌ Error resizing EC2 instance:', error);
            return { success: false, error: error.message };
        }
    }

    async terminateResource(resourceId, metadata) {
        try {
            const resourceType = await this.getResourceType(resourceId);

            if (resourceType !== 'ec2') {
                throw new Error(`Terminate only supported for EC2 instances`);
            }

            if (!metadata.force) {
                throw new Error('Force flag required for resource termination');
            }

            await this.ec2.terminateInstances({
                InstanceIds: [resourceId]
            }).promise();

            console.log(`✅ EC2 instance ${resourceId} termination initiated`);
            return { success: true, message: 'Instance termination initiated' };
        } catch (error) {
            console.error('❌ Error terminating resource:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * UTILITY METHODS
     */

    async getResourceType(resourceId) {
        // Determine resource type based on resource ID format
        if (resourceId.startsWith('i-')) return 'ec2';
        if (resourceId.includes('db-')) return 'rds';
        if (resourceId.includes('asg-') || resourceId.includes('autoscaling')) return 'autoscaling';
        if (resourceId.includes('ecs-') || resourceId.includes('service')) return 'ecs';
        
        // Default to EC2 for backward compatibility
        return 'ec2';
    }

    async findInstanceRegion(instanceId) {
        // Try to find the instance across all regions
        const AWS = require('aws-sdk');
        const regions = ['ap-south-1', 'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
        
        console.log(`🔍 Searching for instance ${instanceId} across regions...`);
        
        for (const region of regions) {
            try {
                const ec2 = new AWS.EC2({ region });
                const result = await ec2.describeInstances({
                    InstanceIds: [instanceId]
                }).promise();
                
                if (result.Reservations.length > 0) {
                    console.log(`✅ Found instance ${instanceId} in region ${region}`);
                    return region;
                }
            } catch (error) {
                // Instance not in this region, continue
                if (error.code !== 'InvalidInstanceID.NotFound') {
                    console.warn(`⚠️ Error checking region ${region}:`, error.message);
                }
            }
        }
        
        console.warn(`⚠️ Instance ${instanceId} not found in any checked region`);
        return null;
    }

    /**
     * Environment-specific scheduling helpers
     */

    async scheduleDevTestShutdown(environmentTag = 'development', schedule = '0 18 * * 1-5') {
        try {
            if (!this.ec2) throw new Error('EC2 client not initialized');

            // Find all dev/test instances
            const instances = await this.ec2.describeInstances({
                Filters: [
                    { Name: 'tag:Environment', Values: [environmentTag, 'dev', 'test', 'staging'] },
                    { Name: 'instance-state-name', Values: ['running'] }
                ]
            }).promise();

            const schedulePromises = [];

            for (const reservation of instances.Reservations) {
                for (const instance of reservation.Instances) {
                    schedulePromises.push(
                        this.scheduleResourceAction(instance.InstanceId, 'shutdown', {
                            name: `Dev/Test Shutdown - ${instance.InstanceId}`,
                            cronExpression: schedule,
                            timezone: 'America/New_York',
                            metadata: { addTags: true, environment: environmentTag }
                        }, 1) // System user
                    );
                }
            }

            const results = await Promise.allSettled(schedulePromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;

            console.log(`✅ Scheduled ${successful} dev/test instances for shutdown`);
            return { success: true, scheduled: successful };
        } catch (error) {
            console.error('❌ Error scheduling dev/test shutdown:', error);
            return { success: false, error: error.message };
        }
    }

    async scheduleWeekendShutdown(environments = ['dev', 'test', 'staging']) {
        try {
            // Friday 6 PM shutdown
            await this.scheduleDevTestShutdown(environments, '0 18 * * 5');
            
            // Monday 8 AM startup  
            await this.scheduleDevTestStartup(environments, '0 8 * * 1');

            return { success: true, message: 'Weekend shutdown/startup scheduled' };
        } catch (error) {
            console.error('❌ Error scheduling weekend shutdown:', error);
            return { success: false, error: error.message };
        }
    }

    async scheduleDevTestStartup(environmentTag = 'development', schedule = '0 8 * * 1-5') {
        try {
            if (!this.ec2) throw new Error('EC2 client not initialized');

            const instances = await this.ec2.describeInstances({
                Filters: [
                    { Name: 'tag:Environment', Values: [environmentTag, 'dev', 'test', 'staging'] },
                    { Name: 'instance-state-name', Values: ['stopped'] }
                ]
            }).promise();

            const schedulePromises = [];

            for (const reservation of instances.Reservations) {
                for (const instance of reservation.Instances) {
                    schedulePromises.push(
                        this.scheduleResourceAction(instance.InstanceId, 'startup', {
                            name: `Dev/Test Startup - ${instance.InstanceId}`,
                            cronExpression: schedule,
                            timezone: 'America/New_York',
                            metadata: { environment: environmentTag }
                        }, 1) // System user
                    );
                }
            }

            const results = await Promise.allSettled(schedulePromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;

            console.log(`✅ Scheduled ${successful} dev/test instances for startup`);
            return { success: true, scheduled: successful };
        } catch (error) {
            console.error('❌ Error scheduling dev/test startup:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = SchedulingService;
