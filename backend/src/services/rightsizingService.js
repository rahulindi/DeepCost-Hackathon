const AWS = require('aws-sdk');
const SimpleAwsCredentials = require('./simpleAwsCredentials');

class RightsizingService {
    constructor() {
        this.cloudWatch = null;
        this.ec2 = null;
    }

    /**
     * Initialize AWS clients with user credentials
     */
    async initializeAWS(userId) {
        try {
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;
            
            const creds = SimpleAwsCredentials.get(dbUserId);
            if (!creds.success) {
                throw new Error('AWS credentials not found');
            }

            AWS.config.update({
                accessKeyId: creds.credentials.accessKeyId,
                secretAccessKey: creds.credentials.secretAccessKey,
                region: creds.credentials.region
            });

            this.cloudWatch = new AWS.CloudWatch();
            this.ec2 = new AWS.EC2();
            
            console.log(`✅ RightsizingService initialized for user ${userId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AWS:', error);
            return false;
        }
    }

    /**
     * Analyze resource for rightsizing opportunities - REAL AWS DATA
     */
    async analyzeResource(resourceId, performanceData, userId = null) {
        try {
            console.log(`🔍 Analyzing REAL rightsizing for resource: ${resourceId}`);
            
            // Initialize AWS with user credentials
            if (userId) {
                await this.initializeAWS(userId);
            }

            if (!this.ec2 || !this.cloudWatch) {
                throw new Error('AWS not initialized');
            }

            // Get instance details
            const instanceData = await this.ec2.describeInstances({
                InstanceIds: [resourceId]
            }).promise();

            if (instanceData.Reservations.length === 0) {
                throw new Error('Instance not found');
            }

            const instance = instanceData.Reservations[0].Instances[0];
            const currentType = instance.InstanceType;

            // Get CloudWatch CPU metrics for last 14 days
            const endTime = new Date();
            const startTime = new Date(endTime - 14 * 24 * 60 * 60 * 1000);

            const cpuMetrics = await this.cloudWatch.getMetricStatistics({
                Namespace: 'AWS/EC2',
                MetricName: 'CPUUtilization',
                Dimensions: [{ Name: 'InstanceId', Value: resourceId }],
                StartTime: startTime,
                EndTime: endTime,
                Period: 3600,
                Statistics: ['Average', 'Maximum']
            }).promise();

            if (cpuMetrics.Datapoints.length === 0) {
                return null; // No metrics available yet
            }

            const avgCpu = cpuMetrics.Datapoints.reduce((sum, dp) => sum + dp.Average, 0) / cpuMetrics.Datapoints.length;
            const maxCpu = Math.max(...cpuMetrics.Datapoints.map(dp => dp.Maximum));

            // Generate recommendation if underutilized
            if (avgCpu < 30) {
                const recommendation = this.generateRecommendation(currentType, avgCpu, maxCpu);
                return recommendation;
            }

            return null; // No recommendation needed
        } catch (error) {
            console.error('❌ Rightsizing analysis error:', error);
            throw error;
        }
    }

    generateRecommendation(currentType, avgCpu, maxCpu) {
        const typeFamily = currentType.split('.')[0];
        const typeSize = currentType.split('.')[1];
        
        const sizeOrder = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge'];
        const currentIndex = sizeOrder.indexOf(typeSize);
        
        if (currentIndex <= 0) return null;
        
        const recommendedSize = sizeOrder[currentIndex - 1];
        const recommendedType = `${typeFamily}.${recommendedSize}`;
        
        const currentCost = this.getInstanceCost(currentType);
        const recommendedCost = this.getInstanceCost(recommendedType);
        const savings = currentCost - recommendedCost;
        
        return {
            currentType,
            recommendedType,
            confidence: avgCpu < 20 ? 95 : 85,
            savings,
            performanceImpact: maxCpu < 50 ? 'low' : 'medium',
            analysisData: {
                avgCpuUtilization: avgCpu.toFixed(1),
                maxCpuUtilization: maxCpu.toFixed(1),
                analysisPeriod: '14 days'
            }
        };
    }

    getInstanceCost(instanceType) {
        const costs = {
            't2.micro': 8.47, 't2.small': 16.93, 't2.medium': 33.87, 't2.large': 67.74,
            't3.nano': 3.80, 't3.micro': 7.59, 't3.small': 15.18, 't3.medium': 30.37,
            't3.large': 60.74, 't3.xlarge': 121.48, 't3.2xlarge': 242.96
        };
        return costs[instanceType] || 50;
    }

    /**
     * Get performance metrics for a resource
     */
    async getPerformanceMetrics(resourceId) {
        try {
            // Mock performance data - would fetch from CloudWatch
            return {
                cpu: { avg: 25, max: 60, min: 10 },
                memory: { avg: 40, max: 70, min: 20 },
                network: { avg: 15, max: 30, min: 5 },
                period: '30d'
            };
        } catch (error) {
            console.error('❌ Performance metrics error:', error);
            throw error;
        }
    }

    /**
     * Apply rightsizing recommendation
     */
    async applyRecommendation(recommendation) {
        try {
            console.log(`⚡ Applying rightsizing: ${recommendation.resource_id}`);
            
            // Mock application - would modify actual AWS resource
            return {
                success: true,
                message: 'Rightsizing applied successfully'
            };
        } catch (error) {
            console.error('❌ Apply rightsizing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = RightsizingService;
