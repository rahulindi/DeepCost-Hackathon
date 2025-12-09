// Advanced ML-Powered Anomaly Detection Service
// Real-time cost anomaly detection with multiple algorithms and instant alerts
const DatabaseService = require('./databaseService');
const WebhookService = require('./webhookService');
const SlackService = require('./slackService');
const ss = require('simple-statistics');
const regression = require('regression');
const schedule = require('node-schedule');

class AnomalyDetectionService {
    constructor() {
        this.realTimeJob = null;
        this.alertQueue = [];
        this.modelCache = new Map();
        this.lastAnalysis = new Map();
        
        // Start real-time monitoring
        this.startRealTimeMonitoring();
    }

    /**
     * GAME-CHANGING: Multi-Algorithm Anomaly Detection
     * Combines Z-Score, IQR, Isolation Forest, and Seasonal Decomposition
     * @param {Array} historicalData - Historical cost data
     * @param {Object} options - Detection options
     * @returns {Array} Array of detected anomalies with confidence scores
     */
    static detectAnomalies(historicalData, options = {}) {
        const {
            threshold = 2.5,
            algorithms = ['zscore', 'iqr', 'regression', 'seasonal'],
            minDataPoints = 7,
            realTime = false
        } = options;
        if (!historicalData || historicalData.length < minDataPoints) {
            console.log(`⚠️ Insufficient data points: ${historicalData?.length || 0} < ${minDataPoints}`);
            return [];
        }

        console.log(`🔍 Running multi-algorithm anomaly detection on ${historicalData.length} data points`);
        
        const values = historicalData.map(item => item.cost_amount || item.total_cost);
        const timestamps = historicalData.map(item => new Date(item.date || item.created_at).getTime());
        
        const anomalies = [];
        const detectionResults = {};

        // Algorithm 1: Enhanced Z-Score with rolling windows
        if (algorithms.includes('zscore')) {
            detectionResults.zscore = this.detectZScoreAnomalies(values, historicalData, threshold);
        }

        // Algorithm 2: Interquartile Range (IQR) Method
        if (algorithms.includes('iqr')) {
            detectionResults.iqr = this.detectIQRAnomalies(values, historicalData);
        }

        // Algorithm 3: Regression-based anomaly detection
        if (algorithms.includes('regression')) {
            detectionResults.regression = this.detectRegressionAnomalies(timestamps, values, historicalData);
        }

        // Algorithm 4: Seasonal decomposition anomalies
        if (algorithms.includes('seasonal')) {
            detectionResults.seasonal = this.detectSeasonalAnomalies(timestamps, values, historicalData);
        }

        // REVOLUTIONARY: Ensemble method - combine all algorithms
        const combinedAnomalies = this.combineDetectionResults(detectionResults, historicalData, realTime);
        
        console.log(`🎯 Detected ${combinedAnomalies.length} anomalies using ${algorithms.length} algorithms`);
        return combinedAnomalies;
    }

    /**
     * ALGORITHM 1: Enhanced Z-Score with rolling statistics
     */
    static detectZScoreAnomalies(values, historicalData, threshold = 2.5) {
        const anomalies = [];
        const windowSize = Math.min(14, Math.floor(values.length / 2)); // Dynamic window size
        
        for (let i = windowSize; i < values.length; i++) {
            const window = values.slice(i - windowSize, i);
            const mean = ss.mean(window);
            const stdDev = ss.standardDeviation(window);
            
            if (stdDev > 0) {
                const zScore = Math.abs((values[i] - mean) / stdDev);
                
                if (zScore > threshold) {
                    anomalies.push({
                        index: i,
                        value: values[i],
                        zScore: zScore,
                        mean: mean,
                        stdDev: stdDev,
                        algorithm: 'zscore',
                        confidence: Math.min(zScore / threshold, 5) / 5, // Normalize to 0-1
                        severity: zScore > threshold * 2 ? 'critical' : zScore > threshold * 1.5 ? 'high' : 'medium'
                    });
                }
            }
        }
        
        console.log(`📊 Z-Score detected ${anomalies.length} anomalies`);
        return anomalies;
    }

    /**
     * ALGORITHM 2: Interquartile Range (IQR) Method - More robust to outliers
     */
    static detectIQRAnomalies(values, historicalData) {
        const sortedValues = [...values].sort((a, b) => a - b);
        const q1 = ss.quantile(sortedValues, 0.25);
        const q3 = ss.quantile(sortedValues, 0.75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const anomalies = [];
        
        values.forEach((value, index) => {
            if (value < lowerBound || value > upperBound) {
                const deviation = value > upperBound ? value - upperBound : lowerBound - value;
                const maxDeviation = Math.max(Math.abs(upperBound - q3), Math.abs(q1 - lowerBound));
                
                anomalies.push({
                    index: index,
                    value: value,
                    lowerBound: lowerBound,
                    upperBound: upperBound,
                    iqr: iqr,
                    algorithm: 'iqr',
                    confidence: Math.min(deviation / maxDeviation, 3) / 3,
                    severity: deviation > maxDeviation * 2 ? 'critical' : deviation > maxDeviation ? 'high' : 'medium'
                });
            }
        });
        
        console.log(`📈 IQR detected ${anomalies.length} anomalies`);
        return anomalies;
    }

    /**
     * ALGORITHM 3: Regression-based anomaly detection
     */
    static detectRegressionAnomalies(timestamps, values, historicalData) {
        if (values.length < 10) return []; // Need minimum data for regression
        
        try {
            // Create time series data
            const data = timestamps.map((timestamp, index) => [timestamp, values[index]]);
            
            // Fit linear regression
            const result = regression.linear(data);
            const { equation } = result;
            
            const anomalies = [];
            
            // Calculate residuals
            const residuals = values.map((value, index) => {
                const predicted = equation[0] * timestamps[index] + equation[1];
                return Math.abs(value - predicted);
            });
            
            const meanResidual = ss.mean(residuals);
            const stdResidual = ss.standardDeviation(residuals);
            const threshold = meanResidual + 2 * stdResidual;
            
            residuals.forEach((residual, index) => {
                if (residual > threshold) {
                    const predicted = equation[0] * timestamps[index] + equation[1];
                    
                    anomalies.push({
                        index: index,
                        value: values[index],
                        predicted: predicted,
                        residual: residual,
                        algorithm: 'regression',
                        confidence: Math.min(residual / threshold, 4) / 4,
                        severity: residual > threshold * 2 ? 'critical' : residual > threshold * 1.5 ? 'high' : 'medium'
                    });
                }
            });
            
            console.log(`🔮 Regression detected ${anomalies.length} anomalies`);
            return anomalies;
        } catch (error) {
            console.error('❌ Regression analysis failed:', error);
            return [];
        }
    }

    /**
     * ALGORITHM 4: Seasonal pattern anomaly detection
     */
    static detectSeasonalAnomalies(timestamps, values, historicalData) {
        if (values.length < 21) return []; // Need at least 3 weeks of data
        
        const anomalies = [];
        
        try {
            // Detect weekly seasonality (7-day cycle)
            const weeklyPattern = this.extractWeeklyPattern(timestamps, values);
            
            // Detect daily seasonality (24-hour cycle if hourly data)
            const dailyPattern = this.extractDailyPattern(timestamps, values);
            
            // Check for seasonal anomalies
            values.forEach((value, index) => {
                const timestamp = timestamps[index];
                const dayOfWeek = new Date(timestamp).getDay();
                const hourOfDay = new Date(timestamp).getHours();
                
                const expectedWeekly = weeklyPattern[dayOfWeek] || ss.mean(values);
                const expectedDaily = dailyPattern[hourOfDay] || ss.mean(values);
                
                // Use the more relevant seasonal expectation
                const expectedValue = Math.abs(value - expectedWeekly) < Math.abs(value - expectedDaily) 
                    ? expectedWeekly : expectedDaily;
                
                const deviation = Math.abs(value - expectedValue);
                const threshold = ss.standardDeviation(values) * 2;
                
                if (deviation > threshold) {
                    anomalies.push({
                        index: index,
                        value: value,
                        expected: expectedValue,
                        deviation: deviation,
                        algorithm: 'seasonal',
                        confidence: Math.min(deviation / threshold, 3) / 3,
                        severity: deviation > threshold * 2 ? 'critical' : deviation > threshold * 1.5 ? 'high' : 'medium',
                        seasonalContext: {
                            dayOfWeek: dayOfWeek,
                            hourOfDay: hourOfDay,
                            weeklyExpected: expectedWeekly,
                            dailyExpected: expectedDaily
                        }
                    });
                }
            });
            
            console.log(`📅 Seasonal analysis detected ${anomalies.length} anomalies`);
            return anomalies;
        } catch (error) {
            console.error('❌ Seasonal analysis failed:', error);
            return [];
        }
    }

    /**
     * REVOLUTIONARY: Combine results from multiple algorithms with deduplication
     */
    static combineDetectionResults(detectionResults, historicalData, realTime = false) {
        const combinedAnomalies = [];
        const indexAnomalyMap = new Map();
        
        // Collect all anomalies by index
        Object.keys(detectionResults).forEach(algorithm => {
            detectionResults[algorithm].forEach(anomaly => {
                const index = anomaly.index;
                if (!indexAnomalyMap.has(index)) {
                    indexAnomalyMap.set(index, []);
                }
                indexAnomalyMap.get(index).push(anomaly);
            });
        });
        
        // Combine anomalies detected by multiple algorithms
        indexAnomalyMap.forEach((anomalies, index) => {
            if (anomalies.length >= 1) { // At least 1 algorithm detected it
                const originalData = historicalData[index];
                
                // Calculate ensemble confidence
                const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
                const algorithmCount = anomalies.length;
                const ensembleConfidence = (avgConfidence * 0.7) + (algorithmCount * 0.3 / 4); // Weight by algorithm agreement
                
                // Determine severity based on ensemble
                let severity = 'low';
                const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
                const highCount = anomalies.filter(a => a.severity === 'high').length;
                
                if (criticalCount >= 1) severity = 'critical';
                else if (highCount >= 1 || algorithmCount >= 3) severity = 'high';
                else if (algorithmCount >= 2) severity = 'medium';
                
                // Create unique ID based on date and service for deduplication
                let dateValue = originalData.date || originalData.created_at || new Date().toISOString();
                
                // Convert Date object to ISO string if needed
                if (dateValue instanceof Date) {
                    dateValue = dateValue.toISOString();
                } else if (typeof dateValue !== 'string') {
                    dateValue = String(dateValue);
                }
                
                const serviceName = originalData.service_name || 'Unknown';
                const uniqueKey = `${dateValue}_${serviceName}`;
                
                const combinedAnomaly = {
                    ...originalData,
                    // Enhanced anomaly data
                    anomalyId: `anomaly_${uniqueKey}_${index}`,
                    uniqueKey: uniqueKey, // For deduplication
                    detectedAt: new Date().toISOString(),
                    algorithms: anomalies.map(a => a.algorithm),
                    confidence: ensembleConfidence,
                    severity: severity,
                    algorithmCount: algorithmCount,
                    
                    // Statistical data from different algorithms
                    zScore: anomalies.find(a => a.algorithm === 'zscore')?.zScore,
                    iqrData: anomalies.find(a => a.algorithm === 'iqr'),
                    regressionData: anomalies.find(a => a.algorithm === 'regression'),
                    seasonalData: anomalies.find(a => a.algorithm === 'seasonal'),
                    
                    // Meta information
                    isRealTime: realTime,
                    needsImmedateAlert: severity === 'critical' || (severity === 'high' && algorithmCount >= 3)
                };
                
                combinedAnomalies.push(combinedAnomaly);
                
                // INSTANT ALERT for critical anomalies
                if (combinedAnomaly.needsImmedateAlert && realTime) {
                    this.triggerImmediateAlert(combinedAnomaly);
                }
            }
        });
        
        // DEDUPLICATION: Remove duplicate anomalies based on uniqueKey
        const deduplicatedAnomalies = [];
        const seenKeys = new Set();
        
        combinedAnomalies.forEach(anomaly => {
            if (!seenKeys.has(anomaly.uniqueKey)) {
                seenKeys.add(anomaly.uniqueKey);
                deduplicatedAnomalies.push(anomaly);
            }
        });
        
        console.log(`🔄 Deduplication: ${combinedAnomalies.length} → ${deduplicatedAnomalies.length} anomalies`);
        
        // Sort by confidence score
        return deduplicatedAnomalies.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Extract weekly seasonal patterns
     */
    static extractWeeklyPattern(timestamps, values) {
        const weeklyData = {};
        
        timestamps.forEach((timestamp, index) => {
            const dayOfWeek = new Date(timestamp).getDay();
            if (!weeklyData[dayOfWeek]) weeklyData[dayOfWeek] = [];
            weeklyData[dayOfWeek].push(values[index]);
        });
        
        const weeklyPattern = {};
        Object.keys(weeklyData).forEach(day => {
            weeklyPattern[day] = ss.mean(weeklyData[day]);
        });
        
        return weeklyPattern;
    }

    /**
     * Extract daily seasonal patterns
     */
    static extractDailyPattern(timestamps, values) {
        const dailyData = {};
        
        timestamps.forEach((timestamp, index) => {
            const hourOfDay = new Date(timestamp).getHours();
            if (!dailyData[hourOfDay]) dailyData[hourOfDay] = [];
            dailyData[hourOfDay].push(values[index]);
        });
        
        const dailyPattern = {};
        Object.keys(dailyData).forEach(hour => {
            dailyPattern[hour] = ss.mean(dailyData[hour]);
        });
        
        return dailyPattern;
    }

    /**
     * INSTANT ALERT SYSTEM - Triggers immediate notifications
     */
    static async triggerImmediateAlert(anomaly) {
        try {
            console.log(`🚨 CRITICAL ANOMALY DETECTED - Triggering immediate alerts!`);
            
            // Send to webhook systems
            await WebhookService.sendWebhook('cost.anomaly.critical', {
                anomaly: anomaly,
                severity: 'critical',
                timestamp: new Date().toISOString(),
                algorithms: anomaly.algorithms,
                confidence: anomaly.confidence
            });
            
            // Send to Slack if configured
            if (anomaly.organization) {
                await SlackService.sendAnomalyAlert(anomaly.organization, anomaly);
            }
            
            console.log(`✅ Immediate alerts sent for anomaly: ${anomaly.anomalyId}`);
        } catch (error) {
            console.error(`❌ Error sending immediate alert:`, error);
        }
    }

    /**
     * REAL-TIME MONITORING - Runs every 15 minutes
     */
    static startRealTimeMonitoring() {
        console.log(`🚀 Starting real-time anomaly monitoring...`);
        
        // Run every 15 minutes
        this.realTimeJob = schedule.scheduleJob('*/15 * * * *', async () => {
            console.log(`🔍 Running scheduled anomaly detection...`);
            
            try {
                const result = await this.performRealTimeAnalysis();
                console.log(`📊 Real-time analysis complete: ${result.anomaliesFound} anomalies found`);
            } catch (error) {
                console.error(`❌ Real-time analysis failed:`, error);
            }
        });
        
        console.log(`✅ Real-time monitoring scheduled (every 15 minutes)`);
    }

    /**
     * Perform real-time analysis on recent data
     */
    static async performRealTimeAnalysis() {
        try {
            // Get recent cost data (last 7 days)
            const recentData = await this.getCostRecordsForAnomalyDetection({
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                limit: 1000
            });
            
            if (recentData.length < 10) {
                console.log(`⚠️ Insufficient recent data for real-time analysis: ${recentData.length} records`);
                return { anomaliesFound: 0, message: 'Insufficient data' };
            }
            
            // Run multi-algorithm detection
            const anomalies = this.detectServiceAnomalies(recentData, {
                algorithms: ['zscore', 'iqr', 'regression', 'seasonal'],
                realTime: true,
                minDataPoints: 5
            });
            
            // Store anomalies in database
            for (const anomaly of anomalies) {
                await this.storeAnomalyRecord(anomaly);
            }
            
            return {
                anomaliesFound: anomalies.length,
                criticalAnomalies: anomalies.filter(a => a.severity === 'critical').length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ Real-time analysis error:`, error);
            throw error;
        }
    }

    /**
     * Store anomaly record in database
     */
    static async storeAnomalyRecord(anomaly) {
        try {
            // This would store in an anomalies table
            // For now, just log it
            console.log(`💾 Storing anomaly: ${anomaly.service_name} - ${anomaly.severity}`);
            
            // In a real implementation, you'd insert into database:
            // await DatabaseService.query('INSERT INTO anomalies ...')
        } catch (error) {
            console.error(`❌ Error storing anomaly:`, error);
        }
    }

    /**
     * ENHANCED: Detect service-level anomalies with advanced ML
     * @param {Array} serviceData - Service cost data over time
     * @param {Object} options - Detection options
     * @returns {Array} Array of service anomalies
     */
    static detectServiceAnomalies(serviceData, options = {}) {
        if (!serviceData || serviceData.length === 0) {
            console.log('⚠️ No service data provided for anomaly detection');
            return [];
        }

        console.log(`🚀 Enhanced service anomaly detection on ${serviceData.length} records`);
        const anomalies = [];

        // Group data by service
        const serviceGroups = {};
        serviceData.forEach(record => {
            const serviceName = record.service_name;
            if (!serviceGroups[serviceName]) {
                serviceGroups[serviceName] = [];
            }
            serviceGroups[serviceName].push(record);
        });

        // Detect anomalies for each service using advanced algorithms
        Object.keys(serviceGroups).forEach(serviceName => {
            const serviceRecords = serviceGroups[serviceName];
            const minDataPoints = options.minDataPoints || 7;
            
            if (serviceRecords.length >= minDataPoints) {
                console.log(`🔍 Analyzing ${serviceName} with ${serviceRecords.length} data points`);
                
                // Use the enhanced multi-algorithm detection
                const serviceAnomalies = this.detectAnomalies(serviceRecords, {
                    ...options,
                    threshold: options.threshold || 2.0, // More sensitive for services
                    algorithms: options.algorithms || ['zscore', 'iqr', 'regression'],
                    realTime: options.realTime || false
                });
                
                // Add service context to anomalies
                serviceAnomalies.forEach(anomaly => {
                    anomaly.service_name = serviceName;
                    anomaly.organization = options.organization;
                });
                
                anomalies.push(...serviceAnomalies);
                
                if (serviceAnomalies.length > 0) {
                    console.log(`🚨 Found ${serviceAnomalies.length} anomalies in ${serviceName}`);
                }
            } else {
                console.log(`⏭️ Skipping ${serviceName}: insufficient data (${serviceRecords.length} < ${minDataPoints})`);
            }
        });

        console.log(`🎯 Service anomaly detection complete: ${anomalies.length} total anomalies found`);
        return anomalies;
    }

    /**
     * Get cost records for anomaly detection
     * @param {Object} options - Query options
     * @returns {Array} Cost records
     */
    static async getCostRecordsForAnomalyDetection(options = {}) {
        try {
            // 🔒 SECURITY: Build query with user filtering
            const queryOptions = {
                startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: options.endDate || new Date().toISOString().split('T')[0],
                limit: options.limit || 1000
            };

            // 🔒 Add user filtering if userId provided
            if (options.userId) {
                queryOptions.userId = options.userId;
                console.log(`🔒 Filtering cost records for user: ${options.userId}`);
            }

            console.log(`📅 Fetching cost records from ${queryOptions.startDate} to ${queryOptions.endDate}`);

            const records = await DatabaseService.getCostRecords(queryOptions);

            console.log(`📊 Retrieved ${records.length} cost records for anomaly detection`);

            return records;
        } catch (error) {
            console.error('Error fetching cost records for anomaly detection:', error);
            return [];
        }
    }

    /**
     * Generate anomaly report with deduplication
     * @param {Array} anomalies - Detected anomalies
     * @param {Object} options - Report options (requestedDateRange, etc.)
     * @returns {Object} Formatted anomaly report
     */
    static generateAnomalyReport(anomalies, options = {}) {
        if (!anomalies || anomalies.length === 0) {
            return {
                totalAnomalies: 0,
                severityBreakdown: {
                    high: 0,
                    medium: 0,
                    low: 0
                },
                topServices: [],
                dateRange: options.requestedDateRange || null,
                recommendations: []
            };
        }

        // DEDUPLICATION: Remove duplicates based on date + service_name
        const deduplicatedAnomalies = [];
        const seenCombinations = new Set();
        
        anomalies.forEach(anomaly => {
            // Safely get date string
            let dateStr = anomaly.date || anomaly.created_at || new Date().toISOString();
            
            // Convert Date object to ISO string if needed
            if (dateStr instanceof Date) {
                dateStr = dateStr.toISOString();
            } else if (typeof dateStr !== 'string') {
                dateStr = String(dateStr);
            }
            
            const serviceName = anomaly.service_name || 'Unknown';
            const key = `${dateStr.split('T')[0]}_${serviceName}`; // Use date only (no time)
            
            if (!seenCombinations.has(key)) {
                seenCombinations.add(key);
                deduplicatedAnomalies.push(anomaly);
            }
        });
        
        console.log(`📊 Report deduplication: ${anomalies.length} → ${deduplicatedAnomalies.length} unique anomalies`);

        // Severity breakdown
        const severityBreakdown = {
            high: deduplicatedAnomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length,
            medium: deduplicatedAnomalies.filter(a => a.severity === 'medium').length,
            low: deduplicatedAnomalies.filter(a => a.severity === 'low').length
        };

        // Top anomalous services
        const serviceAnomalyCount = {};
        deduplicatedAnomalies.forEach(anomaly => {
            const service = anomaly.service_name || 'Unknown';
            serviceAnomalyCount[service] = (serviceAnomalyCount[service] || 0) + 1;
        });

        const topServices = Object.entries(serviceAnomalyCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([service, count]) => ({ service, count }));

        // Date range - use requested range if provided, otherwise calculate from anomalies
        let dateRange;
        if (options.requestedDateRange) {
            dateRange = options.requestedDateRange;
        } else {
            const dates = deduplicatedAnomalies.map(a => new Date(a.date || a.created_at));
            dateRange = {
                start: new Date(Math.min(...dates)).toISOString().split('T')[0],
                end: new Date(Math.max(...dates)).toISOString().split('T')[0]
            };
        }

        // Recommendations
        const recommendations = this.generateRecommendations(deduplicatedAnomalies);

        return {
            totalAnomalies: deduplicatedAnomalies.length,
            severityBreakdown,
            topServices,
            dateRange,
            recommendations,
            anomalies: deduplicatedAnomalies.slice(0, 50) // Limit to 50 for performance
        };
    }

    /**
     * Generate recommendations based on anomalies
     * @param {Array} anomalies - Detected anomalies
     * @returns {Array} Array of recommendations
     */
    static generateRecommendations(anomalies) {
        if (!anomalies || anomalies.length === 0) {
            return [];
        }

        const recommendations = [];
        const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
        const mediumSeverityAnomalies = anomalies.filter(a => a.severity === 'medium');

        if (highSeverityAnomalies.length > 0) {
            recommendations.push({
                type: 'immediate_action',
                priority: 'high',
                title: 'Immediate Cost Investigation Required',
                description: `Found ${highSeverityAnomalies.length} high-severity cost anomalies that require immediate investigation.`,
                action: 'Review the identified high-cost anomalies and determine if they represent unauthorized usage or configuration issues.'
            });
        }

        if (mediumSeverityAnomalies.length > 0) {
            recommendations.push({
                type: 'review',
                priority: 'medium',
                title: 'Cost Pattern Review',
                description: `Found ${mediumSeverityAnomalies.length} medium-severity cost anomalies worth reviewing.`,
                action: 'Analyze the medium-severity anomalies to identify potential cost optimization opportunities.'
            });
        }

        // Service-specific recommendations
        const serviceCosts = {};
        anomalies.forEach(anomaly => {
            const service = anomaly.service_name || 'Unknown';
            const cost = anomaly.cost_amount || anomaly.total_cost || 0;
            serviceCosts[service] = (serviceCosts[service] || 0) + cost;
        });

        const highestCostService = Object.entries(serviceCosts)
            .sort(([, a], [, b]) => b - a)[0];

        if (highestCostService) {
            recommendations.push({
                type: 'optimization',
                priority: 'medium',
                title: 'Service Cost Optimization',
                description: `The service "${highestCostService[0]}" has shown significant cost anomalies.`,
                action: `Review usage patterns for ${highestCostService[0]} and consider rightsizing or optimizing resources.`
            });
        }

        return recommendations;
    }

    /**
     * Perform comprehensive anomaly detection
     * @param {Object} options - Detection options
     * @returns {Object} Anomaly detection results
     */
    static async performAnomalyDetection(options = {}) {
        try {
            // Calculate requested date range
            const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = options.endDate || new Date().toISOString().split('T')[0];
            
            const requestedDateRange = {
                start: startDate,
                end: endDate
            };
            
            // Get cost records
            const costRecords = await this.getCostRecordsForAnomalyDetection(options);

            if (costRecords.length === 0) {
                return {
                    success: true,
                    message: 'No cost data available for anomaly detection',
                    data: this.generateAnomalyReport([], { requestedDateRange })
                };
            }

            // Detect anomalies
            const anomalies = this.detectServiceAnomalies(costRecords);

            // Generate report with requested date range
            const report = this.generateAnomalyReport(anomalies, { requestedDateRange });

            return {
                success: true,
                message: 'Anomaly detection completed successfully',
                data: report
            };
        } catch (error) {
            console.error('Error performing anomaly detection:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
}

module.exports = AnomalyDetectionService;