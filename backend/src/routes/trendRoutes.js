// /Users/rahulindi/aws-cost-tracker/backend/src/routes/trendRoutes.js
const express = require('express');
const DatabaseService = require('../services/databaseService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Helper function to convert user ID for database compatibility
 */
const convertUserId = (userId) => {
    if (typeof userId === 'string' && userId.startsWith('user-')) {
        return parseInt(userId.substring(5), 10);
    }
    return userId;
};

/**
 * 🎃 DEMO MODE: Generate realistic demo data when AWS credentials not configured
 * This allows the app to be demonstrated without real AWS credentials
 */
const generateDemoTrendData = (months = 6) => {
    const trends = [];
    const now = new Date();
    
    // Base costs for realistic demo data
    const services = {
        'Amazon EC2': { base: 450, variance: 80 },
        'Amazon S3': { base: 120, variance: 30 },
        'Amazon RDS': { base: 280, variance: 50 },
        'AWS Lambda': { base: 45, variance: 15 },
        'Amazon CloudFront': { base: 65, variance: 20 },
        'Amazon VPC': { base: 35, variance: 10 },
        'Amazon Route 53': { base: 12, variance: 5 }
    };
    
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const serviceBreakdown = {};
        let totalCost = 0;
        
        // Generate costs with slight growth trend
        const growthFactor = 1 + (0.03 * (months - i - 1)); // 3% monthly growth
        
        Object.entries(services).forEach(([service, config]) => {
            const randomVariance = (Math.random() - 0.5) * 2 * config.variance;
            const cost = (config.base + randomVariance) * growthFactor;
            serviceBreakdown[service] = parseFloat(cost.toFixed(2));
            totalCost += cost;
        });
        
        trends.push({
            month_year: monthKey,
            total_cost: totalCost.toFixed(2),
            service_breakdown: serviceBreakdown,
            growth_rate: i < months - 1 ? parseFloat((Math.random() * 8 - 2).toFixed(1)) : 0
        });
    }
    
    return trends;
};

const generateDemoTrendingServices = () => {
    return [
        { service_name: 'Amazon EC2', avg_cost: '485.50', max_cost: '520.00', min_cost: '450.00', growth_rate: '5.2', months_active: 6 },
        { service_name: 'Amazon RDS', avg_cost: '295.00', max_cost: '320.00', min_cost: '270.00', growth_rate: '3.8', months_active: 6 },
        { service_name: 'Amazon S3', avg_cost: '125.00', max_cost: '145.00', min_cost: '105.00', growth_rate: '2.1', months_active: 6 },
        { service_name: 'Amazon CloudFront', avg_cost: '68.00', max_cost: '85.00', min_cost: '55.00', growth_rate: '4.5', months_active: 6 },
        { service_name: 'AWS Lambda', avg_cost: '48.00', max_cost: '62.00', min_cost: '38.00', growth_rate: '8.2', months_active: 6 },
        { service_name: 'Amazon VPC', avg_cost: '38.00', max_cost: '45.00', min_cost: '32.00', growth_rate: '1.5', months_active: 6 },
        { service_name: 'Amazon Route 53', avg_cost: '14.00', max_cost: '18.00', min_cost: '10.00', growth_rate: '0.8', months_active: 6 }
    ];
};

const generateDemoForecast = () => {
    return {
        forecast_available: true,
        forecasts: [
            { month_offset: 1, predicted_cost: 1125.00, confidence: 'high' },
            { month_offset: 2, predicted_cost: 1165.00, confidence: 'medium' },
            { month_offset: 3, predicted_cost: 1205.00, confidence: 'low' }
        ],
        trend_direction: 'increasing',
        monthly_change: 3.5,
        historical_months: 6
    };
};

// 🔒 SECURITY: Add authentication and user filtering - REAL-TIME AWS DATA
router.get('/monthly', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const months = req.query.months || 6;
        console.log(`📊 [REAL-TIME] Getting monthly trends for user: ${userId} (DB ID: ${dbUserId})`);
        
        // Get AWS credentials
        const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const AwsCostService = require('../services/awsCostService');
        
        let credentialsResult = SimpleAwsCredentials.get(dbUserId);
        if (!credentialsResult.success) {
            credentialsResult = await AwsCredentialsService.getCredentials(dbUserId);
        }

        if (!credentialsResult.success) {
            // 🎃 DEMO MODE: Return realistic demo data for hackathon presentation
            console.log(`🎃 [DEMO MODE] No AWS credentials - returning demo trend data for user: ${userId}`);
            const demoData = generateDemoTrendData(parseInt(months));
            return res.json({ 
                success: true, 
                data: demoData, 
                isDemo: true, 
                source: 'Demo Data (Configure AWS credentials for real data)' 
            });
        }

        // Fetch REAL-TIME data from AWS
        const days = months * 30; // Convert months to days
        const result = await AwsCostService.getMonthToDateCosts(credentialsResult.credentials);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        // Process AWS data with SAME consolidation as dashboard
        const monthlyData = {};
        result.data?.forEach(timePoint => {
            const date = new Date(timePoint.TimePeriod.Start);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { 
                    month_year: monthKey, 
                    total_cost: 0, 
                    service_breakdown: {},
                    growth_rate: 0
                };
            }
            
            timePoint.Groups?.forEach(group => {
                const serviceName = group.Keys[0];
                const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                if (!costData || !costData.Amount) return;
                
                const cost = parseFloat(costData.Amount);
                const absCost = Math.abs(cost);
                
                // Include ALL costs - even micro-costs (demonstrates precision)
                // Only skip true zeros
                if (absCost === 0) {
                    return;
                }
                
                // Log with precision indicator
                if (absCost < 0.01) {
                    console.log(`💎 Micro-cost tracked: ${serviceName} = $${absCost.toFixed(10)}`);
                }
                
                // 🔧 COMPREHENSIVE service consolidation (SAME as dashboard)
                let consolidatedName = serviceName;
                
                // S3 variations
                if (serviceName.includes('Simple Storage Service') || serviceName.includes('Amazon S3')) {
                    consolidatedName = 'Amazon S3';
                }
                // EC2 variations
                else if (serviceName.includes('Elastic Compute Cloud') || 
                         serviceName.includes('Amazon EC2') ||
                         serviceName.includes('EC2 Container Registry') ||
                         serviceName.includes('EC2 - Other')) {
                    consolidatedName = 'Amazon EC2';
                }
                // RDS variations
                else if (serviceName.includes('Relational Database Service') || serviceName.includes('Amazon RDS')) {
                    consolidatedName = 'Amazon RDS';
                }
                // VPC variations
                else if (serviceName.includes('Virtual Private Cloud') || serviceName.includes('Amazon VPC')) {
                    consolidatedName = 'Amazon VPC';
                }
                // Route 53
                else if (serviceName.includes('Route 53')) {
                    consolidatedName = 'Amazon Route 53';
                }
                // Lambda
                else if (serviceName.includes('Lambda')) {
                    consolidatedName = 'AWS Lambda';
                }
                // CloudFront
                else if (serviceName.includes('CloudFront')) {
                    consolidatedName = 'Amazon CloudFront';
                }
                // Glue
                else if (serviceName.includes('Glue')) {
                    consolidatedName = 'AWS Glue';
                }
                // Tax (keep as is)
                else if (serviceName === 'Tax') {
                    consolidatedName = 'Tax';
                }
                
                console.log(`✓ ${serviceName} → ${consolidatedName}: $${absCost.toFixed(2)}`);
                
                monthlyData[monthKey].total_cost += absCost;
                monthlyData[monthKey].service_breakdown[consolidatedName] = 
                    (monthlyData[monthKey].service_breakdown[consolidatedName] || 0) + absCost;
            });
        });

        // Convert to array and calculate growth rates
        const trends = Object.values(monthlyData).sort((a, b) => a.month_year.localeCompare(b.month_year));
        
        // 🔍 DEBUG: Log raw data before processing
        console.log(`📊 Raw AWS data points: ${result.data?.length || 0}`);
        console.log(`📊 Processed months: ${trends.length}`);
        if (trends.length > 0) {
            console.log(`📊 Latest month: ${trends[trends.length - 1].month_year}`);
            console.log(`📊 Latest total: $${trends[trends.length - 1].total_cost.toFixed(2)}`);
            console.log(`📊 Latest services: ${Object.keys(trends[trends.length - 1].service_breakdown).length}`);
            console.log(`📊 Service breakdown:`, JSON.stringify(trends[trends.length - 1].service_breakdown, null, 2));
        }
        
        // Calculate growth rates
        for (let i = 1; i < trends.length; i++) {
            const current = trends[i].total_cost;
            const previous = trends[i - 1].total_cost;
            if (previous > 0) {
                trends[i].growth_rate = ((current - previous) / previous) * 100;
            }
        }
        
        // Convert total_cost to string AND round service_breakdown values
        trends.forEach(trend => {
            trend.total_cost = trend.total_cost.toFixed(2);
            // Round service breakdown values to 2 decimals for consistency
            Object.keys(trend.service_breakdown).forEach(service => {
                trend.service_breakdown[service] = parseFloat(trend.service_breakdown[service].toFixed(2));
            });
        });
        
        console.log(`✅ REAL-TIME monthly trends: ${trends.length} months, services: ${Object.keys(trends[0]?.service_breakdown || {}).length}`);
        res.json({ success: true, data: trends, isRealTime: true, source: 'AWS Cost Explorer' });
    } catch (error) {
        console.error('Monthly trends error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🔒 SECURITY: Add authentication and user filtering - REAL-TIME AWS DATA
router.get('/service/:serviceName', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const { serviceName } = req.params;
        const days = req.query.days || 30;
        console.log(`📊 [REAL-TIME] Getting service trends for user: ${userId}, service: ${serviceName}`);
        
        // Get AWS credentials
        const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const AwsCostService = require('../services/awsCostService');
        
        let credentialsResult = SimpleAwsCredentials.get(dbUserId);
        if (!credentialsResult.success) {
            credentialsResult = await AwsCredentialsService.getCredentials(dbUserId);
        }

        if (!credentialsResult.success) {
            // 🎃 DEMO MODE: Return realistic demo data for specific service
            console.log(`🎃 [DEMO MODE] No AWS credentials - returning demo service trends for: ${serviceName}`);
            const baseCosts = {
                'Amazon EC2': 70, 'Amazon RDS': 42, 'Amazon S3': 18, 'AWS Lambda': 7,
                'Amazon CloudFront': 10, 'Amazon VPC': 5, 'Amazon Route 53': 2
            };
            const baseCost = baseCosts[serviceName] || 15;
            const demoServiceTrends = [];
            const now = new Date();
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const variance = 0.8 + Math.random() * 0.4;
                demoServiceTrends.push({
                    date: date.toISOString().split('T')[0],
                    cost: parseFloat((baseCost * variance).toFixed(2))
                });
            }
            return res.json({ 
                success: true, 
                data: demoServiceTrends, 
                isDemo: true, 
                source: 'Demo Data' 
            });
        }

        // Fetch REAL-TIME data from AWS
        const result = await AwsCostService.getMonthToDateCosts(credentialsResult.credentials);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        // Filter for specific service
        const serviceTrends = [];
        result.data?.forEach(timePoint => {
            const date = timePoint.TimePeriod.Start;
            let serviceCost = 0;
            
            timePoint.Groups?.forEach(group => {
                if (group.Keys[0] === serviceName) {
                    const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                    if (costData?.Amount) {
                        serviceCost += Math.abs(parseFloat(costData.Amount));
                    }
                }
            });
            
            if (serviceCost > 0) {
                serviceTrends.push({ date, cost: serviceCost });
            }
        });
        
        console.log(`✅ REAL-TIME service trends: ${serviceTrends.length} days for ${serviceName}`);
        res.json({ success: true, data: serviceTrends, isRealTime: true, source: 'AWS Cost Explorer' });
    } catch (error) {
        console.error('Service trends error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🆕 Get top trending services - REAL-TIME AWS DATA
router.get('/trending-services', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const limit = req.query.limit || 10;
        console.log(`📊 [REAL-TIME] Getting trending services for user: ${userId}`);
        
        // Get AWS credentials
        const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const AwsCostService = require('../services/awsCostService');
        
        let credentialsResult = SimpleAwsCredentials.get(dbUserId);
        if (!credentialsResult.success) {
            credentialsResult = await AwsCredentialsService.getCredentials(dbUserId);
        }

        if (!credentialsResult.success) {
            // 🎃 DEMO MODE: Return realistic demo data for hackathon presentation
            console.log(`🎃 [DEMO MODE] No AWS credentials - returning demo trending services for user: ${userId}`);
            const demoData = generateDemoTrendingServices();
            return res.json({ 
                success: true, 
                data: demoData, 
                isDemo: true, 
                source: 'Demo Data (Configure AWS credentials for real data)' 
            });
        }

        // Fetch REAL-TIME data from AWS
        const result = await AwsCostService.getMonthToDateCosts(credentialsResult.credentials);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        // Calculate service statistics with COMPREHENSIVE consolidation
        const serviceStats = new Map();
        result.data?.forEach(timePoint => {
            timePoint.Groups?.forEach(group => {
                const serviceName = group.Keys[0];
                const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                if (!costData || !costData.Amount) return;
                
                const cost = parseFloat(costData.Amount);
                const absCost = Math.abs(cost);
                
                // Include ALL costs - even micro-costs (demonstrates precision)
                // Only skip true zeros
                if (absCost === 0) return;
                
                // 🔧 COMPREHENSIVE service consolidation (SAME as monthly trends)
                let consolidatedName = serviceName;
                
                // S3 variations
                if (serviceName.includes('Simple Storage Service') || serviceName.includes('Amazon S3')) {
                    consolidatedName = 'Amazon S3';
                }
                // EC2 variations
                else if (serviceName.includes('Elastic Compute Cloud') || 
                         serviceName.includes('Amazon EC2') ||
                         serviceName.includes('EC2 Container Registry') ||
                         serviceName.includes('EC2 - Other')) {
                    consolidatedName = 'Amazon EC2';
                }
                // RDS variations
                else if (serviceName.includes('Relational Database Service') || serviceName.includes('Amazon RDS')) {
                    consolidatedName = 'Amazon RDS';
                }
                // VPC variations
                else if (serviceName.includes('Virtual Private Cloud') || serviceName.includes('Amazon VPC')) {
                    consolidatedName = 'Amazon VPC';
                }
                // Route 53
                else if (serviceName.includes('Route 53')) {
                    consolidatedName = 'Amazon Route 53';
                }
                // Lambda
                else if (serviceName.includes('Lambda')) {
                    consolidatedName = 'AWS Lambda';
                }
                // CloudFront
                else if (serviceName.includes('CloudFront')) {
                    consolidatedName = 'Amazon CloudFront';
                }
                // Glue
                else if (serviceName.includes('Glue')) {
                    consolidatedName = 'AWS Glue';
                }
                // Tax (keep as is)
                else if (serviceName === 'Tax') {
                    consolidatedName = 'Tax';
                }
                
                if (!serviceStats.has(consolidatedName)) {
                    serviceStats.set(consolidatedName, {
                        total: 0,
                        min: absCost,
                        max: absCost,
                        count: 0,
                        costs: []
                    });
                }
                
                const stats = serviceStats.get(consolidatedName);
                stats.total += absCost;
                stats.min = Math.min(stats.min, absCost);
                stats.max = Math.max(stats.max, absCost);
                stats.count++;
                stats.costs.push(absCost);
            });
        });

        // Format for frontend (matching TrendingService interface)
        const trending = Array.from(serviceStats.entries())
            .map(([serviceName, stats]) => {
                const avgCost = stats.total / stats.count;
                
                // Calculate growth rate (compare first half vs second half)
                const midPoint = Math.floor(stats.costs.length / 2);
                const firstHalf = stats.costs.slice(0, midPoint);
                const secondHalf = stats.costs.slice(midPoint);
                const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
                
                return {
                    service_name: serviceName,
                    avg_cost: avgCost.toFixed(2),
                    max_cost: stats.max.toFixed(2),
                    min_cost: stats.min.toFixed(2),
                    growth_rate: growthRate.toFixed(1),
                    months_active: 1 // Current month
                };
            })
            .sort((a, b) => parseFloat(b.avg_cost) - parseFloat(a.avg_cost))
            .slice(0, limit);
        
        console.log(`✅ REAL-TIME trending services: ${trending.length} services`);
        res.json({ success: true, data: trending, isRealTime: true, source: 'AWS Cost Explorer' });
    } catch (error) {
        console.error('Trending services error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🆕 Get cost forecast - REAL-TIME CALCULATION
router.get('/forecast', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const forecastMonths = parseInt(req.query.months) || 3;
        console.log(`🔮 [REAL-TIME] Calculating cost forecast for user: ${userId}`);
        
        // Get AWS credentials
        const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
        const AwsCredentialsService = require('../services/awsCredentialsService');
        const AwsCostService = require('../services/awsCostService');
        
        let credentialsResult = SimpleAwsCredentials.get(dbUserId);
        if (!credentialsResult.success) {
            credentialsResult = await AwsCredentialsService.getCredentials(dbUserId);
        }

        if (!credentialsResult.success) {
            // 🎃 DEMO MODE: Return realistic demo forecast for hackathon presentation
            console.log(`🎃 [DEMO MODE] No AWS credentials - returning demo forecast for user: ${userId}`);
            const demoData = generateDemoForecast();
            return res.json({ 
                success: true, 
                data: demoData, 
                isDemo: true, 
                source: 'Demo Data (Configure AWS credentials for real data)' 
            });
        }

        // Fetch REAL-TIME data from AWS
        const result = await AwsCostService.getMonthToDateCosts(credentialsResult.credentials);

        if (!result.success) {
            return res.json({
                success: true,
                data: {
                    forecast_available: false,
                    message: 'Could not fetch cost data'
                }
            });
        }

        // Calculate daily costs for trend analysis
        const dailyCosts = [];
        result.data?.forEach(timePoint => {
            let dayCost = 0;
            timePoint.Groups?.forEach(group => {
                const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                if (costData?.Amount) {
                    dayCost += Math.abs(parseFloat(costData.Amount));
                }
            });
            if (dayCost > 0) {
                dailyCosts.push(dayCost);
            }
        });

        if (dailyCosts.length < 7) {
            return res.json({
                success: true,
                data: {
                    forecast_available: false,
                    message: 'Insufficient data for forecast (need at least 7 days)'
                }
            });
        }

        // Simple linear regression forecast
        const avgDailyCost = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
        
        // Calculate trend (compare recent vs older data)
        const recentAvg = dailyCosts.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const olderAvg = dailyCosts.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        const monthlyChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
        const trendDirection = monthlyChange > 5 ? 'increasing' : monthlyChange < -5 ? 'decreasing' : 'stable';

        // Generate forecasts for next N months
        const forecasts = [];
        let currentMonthCost = avgDailyCost * 30; // Estimate current month
        
        for (let i = 1; i <= forecastMonths; i++) {
            // Apply trend to future months
            const trendFactor = 1 + (monthlyChange / 100);
            const predictedCost = currentMonthCost * Math.pow(trendFactor, i);
            
            forecasts.push({
                month_offset: i,
                predicted_cost: Math.round(predictedCost * 100) / 100,
                confidence: i === 1 ? 'high' : i === 2 ? 'medium' : 'low'
            });
        }

        const forecastData = {
            forecast_available: true,
            forecasts: forecasts,
            trend_direction: trendDirection,
            monthly_change: Math.round(monthlyChange * 10) / 10,
            historical_months: 1
        };

        console.log(`✅ REAL-TIME forecast: ${forecasts.length} months, trend: ${trendDirection}`);
        res.json({ success: true, data: forecastData, isRealTime: true });
    } catch (error) {
        console.error('Forecast error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🆕 Export trend data to CSV
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const months = req.query.months || 6;
        console.log(`📥 Exporting trend data for user: ${userId} (DB ID: ${dbUserId})`);
        
        const trends = await DatabaseService.getMonthlyTrends(months, dbUserId);
        
        // Convert to CSV
        let csv = 'Month,Total Cost,Growth Rate,Record Count\n';
        trends.forEach(trend => {
            csv += `${trend.month_year},${trend.total_cost},${trend.growth_rate || 0},${trend.record_count}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="cost-trends-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Cost Trend Analysis',
        version: '2.0.0',
        features: {
            monthlyTrends: 'active',
            serviceTrends: 'active',
            serviceBreakdown: 'active',
            trendingServices: 'active',
            costForecast: 'active',
            exportData: 'active',
            growthAnalysis: 'active',
            volatilityTracking: 'active'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;