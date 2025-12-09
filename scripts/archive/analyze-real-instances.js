/**
 * Real AWS Instance Analysis for Rightsizing
 * Fetches actual EC2 instances and generates rightsizing recommendations
 */

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const DatabaseService = require('./backend/src/services/databaseService');
const AWS = require('./backend/node_modules/aws-sdk');
require('dotenv').config({ path: './backend/.env' });

const userId = 1763658402716;

async function analyzeRealInstances() {
    console.log('🔍 Analyzing Real EC2 Instances for Rightsizing\n');
    console.log('='.repeat(60));
    
    try {
        // Get credentials
        console.log('\n1️⃣ Loading AWS credentials...');
        const creds = SimpleAwsCredentials.get(userId);
        if (!creds.success) {
            console.error('❌ No credentials found. Run store-aws-creds.js first');
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
        const cloudwatch = new AWS.CloudWatch();
        
        // Get all instances
        console.log('\n2️⃣ Fetching EC2 instances...');
        const instances = await ec2.describeInstances().promise();
        
        const allInstances = [];
        instances.Reservations.forEach(r => {
            r.Instances.forEach(i => {
                if (i.State.Name === 'running' || i.State.Name === 'stopped') {
                    allInstances.push(i);
                }
            });
        });
        
        console.log(`✅ Found ${allInstances.length} instances`);
        
        if (allInstances.length === 0) {
            console.log('\n⚠️  No instances found. Create some EC2 instances first.');
            return;
        }
        
        // Analyze each instance
        console.log('\n3️⃣ Analyzing instances for rightsizing opportunities...');
        const recommendations = [];
        
        for (const instance of allInstances) {
            const name = instance.Tags?.find(t => t.Key === 'Name')?.Value || 'Unnamed';
            console.log(`\n   Analyzing: ${instance.InstanceId} (${instance.InstanceType}) - ${name}`);
            
            // Get CloudWatch metrics for last 14 days
            const endTime = new Date();
            const startTime = new Date(endTime - 14 * 24 * 60 * 60 * 1000);
            
            try {
                const cpuMetrics = await cloudwatch.getMetricStatistics({
                    Namespace: 'AWS/EC2',
                    MetricName: 'CPUUtilization',
                    Dimensions: [{ Name: 'InstanceId', Value: instance.InstanceId }],
                    StartTime: startTime,
                    EndTime: endTime,
                    Period: 3600, // 1 hour
                    Statistics: ['Average', 'Maximum']
                }).promise();
                
                if (cpuMetrics.Datapoints.length > 0) {
                    const avgCpu = cpuMetrics.Datapoints.reduce((sum, dp) => sum + dp.Average, 0) / cpuMetrics.Datapoints.length;
                    const maxCpu = Math.max(...cpuMetrics.Datapoints.map(dp => dp.Maximum));
                    
                    console.log(`      CPU: Avg ${avgCpu.toFixed(1)}%, Max ${maxCpu.toFixed(1)}%`);
                    
                    // Generate recommendation if underutilized
                    if (avgCpu < 30 && instance.State.Name === 'running') {
                        const rec = generateRecommendation(instance, avgCpu, maxCpu);
                        if (rec) {
                            recommendations.push(rec);
                            console.log(`      💡 Rightsizing opportunity: ${rec.current_instance_type} → ${rec.recommended_instance_type}`);
                            console.log(`      💰 Potential savings: $${rec.potential_savings.toFixed(2)}/month`);
                        }
                    }
                } else {
                    console.log('      ⚠️  No metrics available (instance may be too new)');
                }
            } catch (error) {
                console.log(`      ⚠️  Could not fetch metrics: ${error.message}`);
            }
        }
        
        // Save recommendations to database
        console.log(`\n4️⃣ Saving ${recommendations.length} recommendations to database...`);
        
        // Clear old recommendations
        await DatabaseService.query(
            'DELETE FROM rightsizing_recommendations WHERE user_id = $1',
            [userId]
        );
        
        for (const rec of recommendations) {
            await DatabaseService.query(`
                INSERT INTO rightsizing_recommendations 
                (resource_id, current_instance_type, recommended_instance_type, 
                 confidence_score, potential_savings, performance_impact, 
                 service_name, region, account_id, analysis_data, user_id, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            `, [
                rec.resource_id, rec.current_instance_type, rec.recommended_instance_type,
                rec.confidence_score, rec.potential_savings, rec.performance_impact,
                'EC2', creds.credentials.region, '123456789012', 
                JSON.stringify(rec.analysis_data), userId, 'pending'
            ]);
        }
        
        console.log('✅ Recommendations saved');
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Analysis complete!`);
        console.log(`   - Analyzed: ${allInstances.length} instances`);
        console.log(`   - Recommendations: ${recommendations.length}`);
        console.log(`   - Total potential savings: $${recommendations.reduce((sum, r) => sum + r.potential_savings, 0).toFixed(2)}/month`);
        console.log(`\n💡 Go to Lifecycle Management → Rightsizing tab to see recommendations`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function generateRecommendation(instance, avgCpu, maxCpu) {
    const currentType = instance.InstanceType;
    
    // Simple rightsizing logic
    const typeFamily = currentType.split('.')[0]; // e.g., 't3' from 't3.large'
    const typeSize = currentType.split('.')[1]; // e.g., 'large' from 't3.large'
    
    const sizeOrder = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge', '4xlarge'];
    const currentIndex = sizeOrder.indexOf(typeSize);
    
    if (currentIndex <= 0) return null; // Already smallest
    
    // Recommend one size smaller if CPU < 30%
    const recommendedSize = sizeOrder[currentIndex - 1];
    const recommendedType = `${typeFamily}.${recommendedSize}`;
    
    // Estimate savings (rough approximation)
    const currentCost = getInstanceCost(currentType);
    const recommendedCost = getInstanceCost(recommendedType);
    const savings = currentCost - recommendedCost;
    
    if (savings <= 0) return null;
    
    return {
        resource_id: instance.InstanceId,
        current_instance_type: currentType,
        recommended_instance_type: recommendedType,
        confidence_score: avgCpu < 20 ? 95 : 85,
        potential_savings: savings,
        performance_impact: maxCpu < 50 ? 'low' : 'medium',
        analysis_data: {
            avgCpu: avgCpu.toFixed(1),
            maxCpu: maxCpu.toFixed(1),
            analysisPeriod: '14 days',
            reason: `CPU utilization averaging ${avgCpu.toFixed(1)}% over 14 days. Downsize recommended.`
        }
    };
}

function getInstanceCost(instanceType) {
    // Rough monthly costs (ap-south-1 pricing)
    const costs = {
        't3.nano': 3.80,
        't3.micro': 7.59,
        't3.small': 15.18,
        't3.medium': 30.37,
        't3.large': 60.74,
        't3.xlarge': 121.48,
        't3.2xlarge': 242.96,
        't2.micro': 8.47,
        't2.small': 16.93,
        't2.medium': 33.87,
        't2.large': 67.74,
        'm5.large': 70.08,
        'm5.xlarge': 140.16,
        'm5.2xlarge': 280.32,
        'c5.large': 62.05,
        'c5.xlarge': 124.10,
        'r5.large': 91.98,
        'r5.xlarge': 183.96
    };
    
    return costs[instanceType] || 50; // Default estimate
}

analyzeRealInstances();
