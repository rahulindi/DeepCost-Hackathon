const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
const AWS = require('aws-sdk');

/**
 * Helper function to convert user ID
 */
const convertUserId = (userId) => {
    if (typeof userId === 'string' && userId.startsWith('user-')) {
        return parseInt(userId.substring(5), 10);
    }
    return userId;
};

/**
 * Launch a new EC2 instance
 */
router.post('/launch', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { instanceType, name, ami } = req.body;

        console.log(`🚀 Launching EC2 instance for user ${userId}`);

        // Get AWS credentials
        const creds = SimpleAwsCredentials.get(dbUserId);
        if (!creds.success) {
            return res.status(403).json({
                success: false,
                error: 'AWS credentials not configured'
            });
        }

        // Initialize EC2
        AWS.config.update({
            accessKeyId: creds.credentials.accessKeyId,
            secretAccessKey: creds.credentials.secretAccessKey,
            region: creds.credentials.region
        });

        const ec2 = new AWS.EC2();

        // Default AMI for ap-south-1 (Amazon Linux 2)
        const defaultAmi = 'ami-0f58b397bc5c1f2e8';

        // Launch instance
        const params = {
            ImageId: ami || defaultAmi,
            InstanceType: instanceType || 't2.micro',
            MinCount: 1,
            MaxCount: 1,
            TagSpecifications: [
                {
                    ResourceType: 'instance',
                    Tags: [
                        { Key: 'Name', Value: name || 'Demo Instance' },
                        { Key: 'ManagedBy', Value: 'AWS Cost Tracker' },
                        { Key: 'CreatedAt', Value: new Date().toISOString() }
                    ]
                }
            ]
        };

        const result = await ec2.runInstances(params).promise();
        const instance = result.Instances[0];

        console.log(`✅ Instance launched: ${instance.InstanceId}`);

        res.json({
            success: true,
            instance: {
                instanceId: instance.InstanceId,
                instanceType: instance.InstanceType,
                state: instance.State.Name,
                launchTime: instance.LaunchTime
            },
            message: 'EC2 instance launched successfully'
        });

    } catch (error) {
        console.error('❌ Error launching instance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * List all EC2 instances
 */
router.get('/instances', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);

        console.log(`📋 Listing EC2 instances for user ${userId}`);

        // Get AWS credentials
        const creds = SimpleAwsCredentials.get(dbUserId);
        if (!creds.success) {
            return res.status(403).json({
                success: false,
                error: 'AWS credentials not configured'
            });
        }

        // Initialize EC2
        AWS.config.update({
            accessKeyId: creds.credentials.accessKeyId,
            secretAccessKey: creds.credentials.secretAccessKey,
            region: creds.credentials.region
        });

        const ec2 = new AWS.EC2();

        // Get all instances
        const result = await ec2.describeInstances().promise();

        const instances = [];
        result.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                const name = instance.Tags?.find(t => t.Key === 'Name')?.Value || 'Unnamed';
                instances.push({
                    instanceId: instance.InstanceId,
                    instanceType: instance.InstanceType,
                    state: instance.State.Name,
                    name: name,
                    launchTime: instance.LaunchTime,
                    privateIp: instance.PrivateIpAddress,
                    publicIp: instance.PublicIpAddress,
                    availabilityZone: instance.Placement.AvailabilityZone
                });
            });
        });

        console.log(`✅ Found ${instances.length} instances`);

        res.json({
            success: true,
            instances: instances,
            count: instances.length
        });

    } catch (error) {
        console.error('❌ Error listing instances:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Terminate an EC2 instance
 */
router.delete('/instances/:instanceId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { instanceId } = req.params;

        console.log(`🗑️  Terminating instance ${instanceId} for user ${userId}`);

        // Get AWS credentials
        const creds = SimpleAwsCredentials.get(dbUserId);
        if (!creds.success) {
            return res.status(403).json({
                success: false,
                error: 'AWS credentials not configured'
            });
        }

        // Initialize EC2
        AWS.config.update({
            accessKeyId: creds.credentials.accessKeyId,
            secretAccessKey: creds.credentials.secretAccessKey,
            region: creds.credentials.region
        });

        const ec2 = new AWS.EC2();

        // Terminate instance
        await ec2.terminateInstances({
            InstanceIds: [instanceId]
        }).promise();

        console.log(`✅ Instance ${instanceId} terminated`);

        res.json({
            success: true,
            message: 'Instance termination initiated'
        });

    } catch (error) {
        console.error('❌ Error terminating instance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
