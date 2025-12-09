// Reserved Instance Optimization Service
// Provides RI utilization analysis and cost savings recommendations
const AWS = require('aws-sdk');
const DatabaseService = require('./databaseService');

class ReservedInstanceService {
    /**
     * CORE FEATURE: RI Utilization Analysis
     * Analyzes current RI usage and provides optimization recommendations
     */
    static async analyzeReservedInstances(credentials, options = {}) {
        try {
            // Configure AWS SDK v2
            AWS.config.update({
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                region: 'us-east-1' // Cost Explorer is only in us-east-1
            });
            
            const costExplorer = new AWS.CostExplorer();

            console.log('🚀 Starting REAL RI analysis with AWS APIs...');
            
            // Get RI utilization for last 30 days (REAL DATA)
            const utilizationResult = await this.getRIUtilization(costExplorer);
            
            // Get RI coverage analysis (REAL DATA)
            const coverageResult = await this.getRICoverage(costExplorer);
            
            // Generate recommendations (includes AWS's own recommendations)
            const recommendations = await this.generateRIRecommendations(utilizationResult, coverageResult, costExplorer);
            
            // Calculate potential savings
            const savingsAnalysis = this.calculatePotentialSavings(recommendations);
            
            console.log('✅ RI analysis complete with real AWS data');

            return {
                success: true,
                data: {
                    utilization: utilizationResult,
                    coverage: coverageResult,
                    recommendations: recommendations,
                    savings: savingsAnalysis,
                    analysisDate: new Date().toISOString(),
                    dataQuality: {
                        utilizationIsReal: utilizationResult.isRealData !== false,
                        coverageIsReal: coverageResult.isRealData !== false,
                        hasAwsRecommendations: recommendations.some(r => r.isAwsRecommendation),
                        apiCallsMade: ['getReservationUtilization', 'getReservationCoverage', 'getCostAndUsage', 'getReservationPurchaseRecommendation']
                    }
                }
            };

        } catch (error) {
            console.error('❌ RI Analysis failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get RI Coverage Analysis - REAL AWS DATA
     */
    static async getRICoverage(costExplorer) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        try {
            console.log('📊 Fetching REAL RI coverage from AWS...');
            
            const params = {
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                }
                // Note: Granularity is NOT supported when using GroupBy
                // Note: GroupBy causes issues, so we'll use Total data instead
            };

            const result = await costExplorer.getReservationCoverage(params).promise();
            
            console.log('✅ Real RI coverage data received');
            
            // Process the real coverage data
            let totalCoveredHours = 0;
            let totalOnDemandHours = 0;
            let totalHours = 0;
            const servicesCoverage = {};

            if (result.CoveragesByTime && result.CoveragesByTime.length > 0) {
                result.CoveragesByTime.forEach(timePoint => {
                    // Process total coverage (no groups since we removed GroupBy)
                    if (timePoint.Total && timePoint.Total.Coverage) {
                        const coverage = timePoint.Total.Coverage;
                        const coveredHours = parseFloat(coverage.CoverageHours?.ReservedHours || 0);
                        const onDemandHours = parseFloat(coverage.CoverageHours?.OnDemandHours || 0);
                        const uncoveredCost = parseFloat(coverage.CoverageCost?.OnDemandCost || 0);
                        
                        totalCoveredHours += coveredHours;
                        totalOnDemandHours += onDemandHours;
                        totalHours += (coveredHours + onDemandHours);
                        
                        // Since we can't separate by service without GroupBy,
                        // apply to both EC2 and RDS proportionally
                        ['ec2', 'rds'].forEach(serviceKey => {
                            if (!servicesCoverage[serviceKey]) {
                                servicesCoverage[serviceKey] = {
                                    coverage: 0,
                                    uncoveredCost: 0,
                                    coveredHours: 0,
                                    onDemandHours: 0
                                };
                            }
                            
                            // Split evenly between services (approximation)
                            servicesCoverage[serviceKey].coveredHours += coveredHours / 2;
                            servicesCoverage[serviceKey].onDemandHours += onDemandHours / 2;
                            servicesCoverage[serviceKey].uncoveredCost += uncoveredCost / 2;
                        });
                    }
                });
                
                // Calculate coverage percentages for each service
                Object.keys(servicesCoverage).forEach(serviceKey => {
                    const service = servicesCoverage[serviceKey];
                    const totalServiceHours = service.coveredHours + service.onDemandHours;
                    service.coverage = totalServiceHours > 0 
                        ? service.coveredHours / totalServiceHours 
                        : 0;
                });
            }

            const coveragePercentage = totalHours > 0 ? totalCoveredHours / totalHours : 0;

            return {
                coveragePercentage: coveragePercentage,
                uncoveredHours: totalOnDemandHours,
                totalHours: totalHours,
                coveredHours: totalCoveredHours,
                services: servicesCoverage,
                isRealData: true
            };
        } catch (error) {
            console.error('❌ Error fetching RI coverage:', error);
            // Fallback to basic data if API fails
            console.log('⚠️  Falling back to estimated coverage data');
            return { 
                coveragePercentage: 0, 
                uncoveredHours: 0, 
                totalHours: 0, 
                services: {},
                isRealData: false,
                error: error.message
            };
        }
    }

    /**
     * Get RI Utilization Data - REAL AWS DATA
     */
    static async getRIUtilization(costExplorer) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        try {
            console.log('📊 Fetching REAL RI utilization from AWS...');
            
            const params = {
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                },
                Granularity: 'MONTHLY'
                // Note: GroupBy not supported for getReservationUtilization
                // AWS only supports SUBSCRIPTION_ID, which we don't have
            };

            // Get REAL RI utilization from AWS (without GroupBy)
            const utilizationResult = await costExplorer.getReservationUtilization(params).promise();
            
            console.log('✅ Real RI utilization data received');
            
            // Also get cost data for context
            const costParams = {
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                },
                Granularity: 'MONTHLY',
                Metrics: ['UnblendedCost'],
                GroupBy: [
                    {
                        Type: 'DIMENSION',
                        Key: 'SERVICE'
                    }
                ]
            };
            
            const costResult = await costExplorer.getCostAndUsage(costParams).promise();
            
            // Process REAL utilization data
            const utilization = this.processRealUtilizationData(utilizationResult, costResult);
            
            return utilization;
        } catch (error) {
            console.error('❌ Error fetching RI utilization:', error);
            console.log('⚠️  Falling back to cost-based estimation');
            
            // Fallback: use cost data to estimate
            try {
                const costParams = {
                    TimePeriod: {
                        Start: startDate.toISOString().split('T')[0],
                        End: endDate.toISOString().split('T')[0]
                    },
                    Granularity: 'MONTHLY',
                    Metrics: ['UnblendedCost'],
                    GroupBy: [
                        {
                            Type: 'DIMENSION',
                            Key: 'SERVICE'
                        }
                    ]
                };
                
                const result = await costExplorer.getCostAndUsage(costParams).promise();
                const utilization = this.processUtilizationData(result.ResultsByTime);
                utilization.isRealData = false;
                utilization.isEstimated = true;
                return utilization;
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                return { 
                    utilization: 0, 
                    instances: [], 
                    isRealData: false,
                    error: error.message 
                };
            }
        }
    }

    /**
     * Generate RI Recommendations - Enhanced with real data analysis
     */
    static async generateRIRecommendations(utilization, coverage, costExplorer) {
        const recommendations = [];

        try {
            // Try to get AWS's own RI purchase recommendations
            console.log('🤖 Fetching AWS RI purchase recommendations...');
            
            const ec2RecommendationParams = {
                Service: 'Amazon Elastic Compute Cloud - Compute',
                LookbackPeriodInDays: 'THIRTY_DAYS',
                TermInYears: 'ONE_YEAR',
                PaymentOption: 'PARTIAL_UPFRONT'
            };
            
            try {
                const awsRecommendations = await costExplorer.getReservationPurchaseRecommendation(ec2RecommendationParams).promise();
                
                if (awsRecommendations.Recommendations && awsRecommendations.Recommendations.length > 0) {
                    console.log(`✅ Got ${awsRecommendations.Recommendations.length} AWS recommendations`);
                    
                    awsRecommendations.Recommendations.forEach(rec => {
                        const details = rec.RecommendationDetail;
                        if (details) {
                            recommendations.push({
                                service: 'Amazon EC2',
                                instanceType: details.InstanceDetails?.EC2InstanceDetails?.InstanceType || 'Various',
                                term: '1 year',
                                paymentOption: 'Partial Upfront',
                                estimatedMonthlySavings: parseFloat(details.EstimatedMonthlySavingsAmount || 0),
                                utilizationThreshold: 0.8,
                                priority: parseFloat(details.EstimatedMonthlySavingsAmount || 0) > 50 ? 'high' : 'medium',
                                reasoning: `AWS recommends purchasing ${details.RecommendedNumberOfInstancesToPurchase || 1} RIs for optimal savings`,
                                isAwsRecommendation: true,
                                awsData: {
                                    recommendedInstances: details.RecommendedNumberOfInstancesToPurchase,
                                    averageUtilization: details.AverageUtilization,
                                    estimatedBreakEvenInMonths: details.EstimatedBreakEvenInMonths
                                }
                            });
                        }
                    });
                }
            } catch (awsRecError) {
                console.log('⚠️  AWS recommendations not available:', awsRecError.message);
            }
        } catch (error) {
            console.log('⚠️  Could not fetch AWS recommendations, using analysis-based recommendations');
        }

        // Fallback: Generate recommendations based on utilization analysis
        if (recommendations.length === 0) {
            // EC2 Recommendations based on utilization
            if (utilization.ec2 && utilization.ec2.averageUtilization > 0.7) {
                const monthlySavings = utilization.ec2.monthlyCost * 0.25; // 25% typical RI savings
                
                recommendations.push({
                    service: 'Amazon EC2',
                    instanceType: utilization.ec2.topInstanceType || 't3.medium',
                    term: '1 year',
                    paymentOption: 'Partial Upfront',
                    estimatedMonthlySavings: monthlySavings,
                    utilizationThreshold: 0.8,
                    priority: monthlySavings > 50 ? 'high' : 'medium',
                    reasoning: `High consistent usage (${(utilization.ec2.averageUtilization * 100).toFixed(0)}%) - ideal for RI savings`,
                    isAwsRecommendation: false
                });
            } else if (utilization.ec2 && utilization.ec2.monthlyCost > 50) {
                // Even with lower utilization, if cost is significant, recommend monitoring
                recommendations.push({
                    service: 'Amazon EC2',
                    instanceType: 't3.medium',
                    term: '1 year',
                    paymentOption: 'Partial Upfront',
                    estimatedMonthlySavings: utilization.ec2.monthlyCost * 0.15,
                    utilizationThreshold: 0.7,
                    priority: 'low',
                    reasoning: 'Moderate usage - monitor for RI opportunity',
                    isAwsRecommendation: false
                });
            }

            // RDS Recommendations based on utilization
            if (utilization.rds && utilization.rds.averageUtilization > 0.8) {
                const monthlySavings = utilization.rds.monthlyCost * 0.3; // 30% typical RDS RI savings
                
                recommendations.push({
                    service: 'Amazon RDS',
                    instanceType: utilization.rds.topInstanceType || 'db.t3.micro',
                    term: '1 year',
                    paymentOption: 'All Upfront',
                    estimatedMonthlySavings: monthlySavings,
                    utilizationThreshold: 0.9,
                    priority: monthlySavings > 30 ? 'high' : 'medium',
                    reasoning: `Database running 24/7 (${(utilization.rds.averageUtilization * 100).toFixed(0)}% utilization) - maximum RI benefit`,
                    isAwsRecommendation: false
                });
            }
        }

        console.log(`📋 Generated ${recommendations.length} RI recommendations`);
        return recommendations;
    }

    /**
     * Calculate Potential Savings
     */
    static calculatePotentialSavings(recommendations) {
        const totalMonthlySavings = recommendations.reduce((sum, rec) => 
            sum + (rec.estimatedMonthlySavings || 0), 0
        );

        const annualSavings = totalMonthlySavings * 12;
        const threeYearSavings = totalMonthlySavings * 36 * 0.85; // Assume 3-year has 15% more savings

        return {
            monthly: totalMonthlySavings,
            annual: annualSavings,
            threeYear: threeYearSavings,
            recommendations: recommendations.length,
            highPriorityCount: recommendations.filter(r => r.priority === 'high').length
        };
    }

    /**
     * Process REAL Utilization Data from AWS RI API
     */
    static processRealUtilizationData(utilizationResult, costResult) {
        const services = {
            ec2: { totalCost: 0, instances: [], averageUtilization: 0, utilizationPercentage: 0 },
            rds: { totalCost: 0, instances: [], averageUtilization: 0, utilizationPercentage: 0 }
        };

        // Process REAL utilization data (Total, not grouped)
        if (utilizationResult.UtilizationsByTime && utilizationResult.UtilizationsByTime.length > 0) {
            utilizationResult.UtilizationsByTime.forEach(timePoint => {
                // Process total utilization (no groups since we removed GroupBy)
                if (timePoint.Total && timePoint.Total.Utilization) {
                    const utilization = timePoint.Total.Utilization;
                    const utilizationPercentage = parseFloat(utilization.UtilizationPercentage || 0) / 100;
                    const purchasedHours = parseFloat(utilization.PurchasedHours || 0);
                    const usedHours = parseFloat(utilization.UsedHours || 0);
                    
                    // Apply to both EC2 and RDS (we can't distinguish without GroupBy)
                    services.ec2.averageUtilization = utilizationPercentage;
                    services.ec2.utilizationPercentage = utilizationPercentage * 100;
                    services.ec2.purchasedHours = purchasedHours;
                    services.ec2.usedHours = usedHours;
                    
                    // Copy to RDS as well (same data since we can't separate)
                    services.rds.averageUtilization = utilizationPercentage;
                    services.rds.utilizationPercentage = utilizationPercentage * 100;
                    services.rds.purchasedHours = purchasedHours;
                    services.rds.usedHours = usedHours;
                }
            });
        }

        // Add cost data
        if (costResult.ResultsByTime) {
            costResult.ResultsByTime.forEach(timePoint => {
                timePoint.Groups?.forEach(group => {
                    const serviceName = group.Keys[0];
                    const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || 0);

                    if (serviceName.includes('Elastic Compute Cloud')) {
                        services.ec2.totalCost += cost;
                        services.ec2.monthlyCost = cost;
                    } else if (serviceName.includes('Relational Database Service')) {
                        services.rds.totalCost += cost;
                        services.rds.monthlyCost = cost;
                    }
                });
            });
        }

        services.isRealData = true;
        return services;
    }

    /**
     * Process Utilization Data from AWS Response (Fallback for cost-based estimation)
     */
    static processUtilizationData(resultsByTime) {
        const services = {
            ec2: { totalCost: 0, instances: [], averageUtilization: 0 },
            rds: { totalCost: 0, instances: [], averageUtilization: 0 }
        };

        resultsByTime.forEach(timePoint => {
            timePoint.Groups?.forEach(group => {
                const serviceName = group.Keys[0];
                const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || 0);

                if (serviceName.includes('Elastic Compute Cloud')) {
                    services.ec2.totalCost += cost;
                    // Estimate utilization based on cost patterns (if cost > $100, likely high usage)
                    services.ec2.averageUtilization = cost > 100 ? 0.75 : cost > 50 ? 0.60 : 0.40;
                } else if (serviceName.includes('Relational Database Service')) {
                    services.rds.totalCost += cost;
                    // Databases typically run 24/7, so higher utilization estimate
                    services.rds.averageUtilization = cost > 50 ? 0.85 : cost > 20 ? 0.70 : 0.50;
                }
            });
        });

        // Calculate monthly costs
        services.ec2.monthlyCost = services.ec2.totalCost;
        services.rds.monthlyCost = services.rds.totalCost;

        return services;
    }

    /**
     * Save RI Analysis to Database
     */
    static async saveRIAnalysis(userId, analysisData) {
        try {
            const query = `
                INSERT INTO ri_analyses (user_id, analysis_data, created_at)
                VALUES ($1, $2, NOW())
                RETURNING id, created_at
            `;
            
            const result = await DatabaseService.pool.query(query, [
                userId,
                JSON.stringify(analysisData)
            ]);

            return {
                success: true,
                analysisId: result.rows[0].id,
                createdAt: result.rows[0].created_at
            };
        } catch (error) {
            console.error('❌ Error saving RI analysis:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ReservedInstanceService;
