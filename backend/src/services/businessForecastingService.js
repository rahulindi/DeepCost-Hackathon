// Cost Forecasting with Business Context Service
// Enterprise-grade forecasting with revenue correlation and scenario modeling
const DatabaseService = require('./databaseService');

class BusinessForecastingService {
  // Generate business-aware cost forecast with revenue correlation
  static async generateBusinessForecast(userId, options = {}) {
    try {
      const { months = 6, includeSeasonality = true, businessMetrics = null } = options;
      
      // Get historical cost and business data
      const costHistory = await this.getHistoricalCostData(userId, months * 2);
      const businessHistory = businessMetrics || await this.getBusinessMetrics(userId);
      
      // Analyze cost patterns and correlations (now async)
      const patterns = await this.analyzeCostPatterns(costHistory, userId);
      const correlations = this.analyzeBusinessCorrelations(costHistory, businessHistory);
      
      // Generate seasonal predictions
      const seasonalForecasts = includeSeasonality 
        ? this.generateSeasonalForecasts(patterns, months)
        : null;
      
      // Create base forecast
      const baseForecast = this.generateBaseForecast(costHistory, patterns, months);
      
      // Apply business context adjustments
      const businessAdjustedForecast = this.applyBusinessContext(baseForecast, correlations, businessHistory);
      
      return {
        success: true,
        forecast: {
          periods: businessAdjustedForecast,
          businessMetrics: {
            revenuePerDollar: correlations.revenueEfficiency,
            costGrowthRate: patterns.growthRate,
            seasonalityStrength: patterns.seasonalityIndex,
            businessCorrelation: correlations.correlationStrength
          },
          patterns: patterns,
          correlations: correlations,
          seasonal: seasonalForecasts,
          confidence: this.calculateConfidence(patterns, correlations),
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Advanced scenario modeling for business planning
  static async generateScenarioModels(userId, scenarios) {
    try {
      // ✅ FIX: Validate scenarios input
      if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
        return { 
          success: false, 
          error: 'No scenarios provided. Please provide at least one scenario.' 
        };
      }
      
      const baseForecast = await this.generateBusinessForecast(userId);
      
      // ✅ FIX: Check if base forecast was generated successfully
      if (!baseForecast.success || !baseForecast.forecast || !baseForecast.forecast.periods) {
        return { 
          success: false, 
          error: 'Unable to generate base forecast. Please ensure you have cost data in the system.' 
        };
      }
      
      const scenarioResults = [];

      for (const scenario of scenarios) {
        const { name, businessGrowth, seasonalityMultiplier, externalFactors } = scenario;
        
        // Apply scenario adjustments to base forecast
        const adjustedForecast = this.applyScenarioAdjustments(
          baseForecast.forecast.periods,
          {
            businessGrowth: businessGrowth || 1.0,
            seasonality: seasonalityMultiplier || 1.0,
            external: externalFactors || {}
          }
        );
        
        // Calculate scenario metrics
        const scenarioMetrics = this.calculateScenarioMetrics(adjustedForecast, scenario);
        
        scenarioResults.push({
          name,
          scenario,
          forecast: adjustedForecast,
          metrics: scenarioMetrics,
          impact: this.calculateScenarioImpact(baseForecast.forecast.periods, adjustedForecast)
        });
      }

      return {
        success: true,
        scenarios: scenarioResults,
        baseCase: baseForecast.forecast,
        comparisonMatrix: this.createScenarioComparison(scenarioResults)
      };
    } catch (error) {
      console.error('❌ Error generating scenario models:', error);
      return { success: false, error: error.message };
    }
  }

  // Analyze historical cost patterns and trends
  static async analyzeCostPatterns(costHistory, userId) {
    if (!costHistory.length) return { growthRate: 0, seasonalityIndex: 1.0, volatility: 0, serviceTrends: {} };
    
    // Handle single month case
    if (costHistory.length === 1) {
      const serviceTrends = await this.analyzeServiceTrends(userId);
      return {
        growthRate: 0,
        volatility: 0,
        seasonalityIndex: 1.0,
        serviceTrends: serviceTrends,
        trendDirection: 'stable'
      };
    }
    
    // Calculate month-over-month growth
    const monthlyChanges = [];
    for (let i = 1; i < costHistory.length; i++) {
      const prevCost = costHistory[i-1].cost;
      const currCost = costHistory[i].cost;
      if (prevCost > 0) {
        const change = (currCost - prevCost) / prevCost;
        monthlyChanges.push(change);
      }
    }
    
    const avgGrowthRate = monthlyChanges.length > 0 
      ? monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length 
      : 0;
      
    const volatility = monthlyChanges.length > 0
      ? Math.sqrt(monthlyChanges.reduce((sum, change) => sum + Math.pow(change - avgGrowthRate, 2), 0) / monthlyChanges.length)
      : 0;
    
    // Detect seasonality patterns
    const seasonalityIndex = this.calculateSeasonality(costHistory);
    
    // ✅ REAL DATA: Identify cost trends by service (now async)
    const serviceTrends = await this.analyzeServiceTrends(userId);
    
    return {
      growthRate: isNaN(avgGrowthRate) ? 0 : avgGrowthRate,
      volatility: isNaN(volatility) ? 0 : volatility,
      seasonalityIndex: isNaN(seasonalityIndex) ? 1.0 : seasonalityIndex,
      serviceTrends: serviceTrends,
      trendDirection: avgGrowthRate > 0.05 ? 'increasing' : avgGrowthRate < -0.05 ? 'decreasing' : 'stable'
    };
  }

  // Analyze business metric correlations
  static analyzeBusinessCorrelations(costHistory, businessMetrics) {
    if (!businessMetrics || !businessMetrics.length || !costHistory || !costHistory.length) {
      return {
        revenueEfficiency: 0,
        correlationStrength: 0,
        predictiveValue: 'low'
      };
    }

    // Align data by matching months - take the minimum length
    const minLength = Math.min(costHistory.length, businessMetrics.length);
    const alignedCosts = costHistory.slice(0, minLength);
    const alignedMetrics = businessMetrics.slice(0, minLength);

    // Calculate cost-to-revenue efficiency
    let totalEfficiency = 0;
    let validPairs = 0;
    
    for (let i = 0; i < minLength; i++) {
      const cost = alignedCosts[i]?.cost || 0;
      const revenue = alignedMetrics[i]?.revenue || 0;
      if (cost > 0 && revenue > 0) {
        totalEfficiency += revenue / cost;
        validPairs++;
      }
    }
    
    const revenueEfficiency = validPairs > 0 ? totalEfficiency / validPairs : 0;

    // Calculate correlation coefficient between cost and business metrics
    const costs = alignedCosts.map(c => c.cost).filter(c => c > 0);
    const revenues = alignedMetrics.map(m => m.revenue).filter(r => r > 0);
    
    const correlationStrength = costs.length === revenues.length && costs.length > 1
      ? this.calculateCorrelation(costs, revenues)
      : 0;

    return {
      revenueEfficiency: revenueEfficiency,
      correlationStrength: Math.abs(correlationStrength),
      predictiveValue: Math.abs(correlationStrength) > 0.7 ? 'high' : Math.abs(correlationStrength) > 0.4 ? 'medium' : 'low',
      optimalCostRatio: this.calculateOptimalCostRatio(alignedCosts, alignedMetrics)
    };
  }

  // Generate seasonal forecasts with external factors
  static generateSeasonalForecasts(patterns, months) {
    const seasonalFactors = [
      { month: 1, factor: 0.85, reason: 'Post-holiday reduction' },
      { month: 2, factor: 0.90, reason: 'Q1 budget optimization' },
      { month: 3, factor: 1.05, reason: 'Q1 close activities' },
      { month: 4, factor: 1.10, reason: 'New initiatives' },
      { month: 5, factor: 1.15, reason: 'Spring product launches' },
      { month: 6, factor: 1.20, reason: 'Mid-year scaling' },
      { month: 7, factor: 1.10, reason: 'Summer campaigns' },
      { month: 8, factor: 0.95, reason: 'Summer slowdown' },
      { month: 9, factor: 1.25, reason: 'Back-to-school surge' },
      { month: 10, factor: 1.30, reason: 'Holiday prep' },
      { month: 11, factor: 1.40, reason: 'Black Friday/Cyber Monday' },
      { month: 12, factor: 1.35, reason: 'Holiday season peak' }
    ];

    const forecast = [];
    const currentMonth = new Date().getMonth() + 1;
    
    for (let i = 0; i < months; i++) {
      const targetMonth = ((currentMonth + i - 1) % 12) + 1;
      const seasonalData = seasonalFactors.find(sf => sf.month === targetMonth);
      
      forecast.push({
        month: targetMonth,
        seasonalFactor: seasonalData.factor * patterns.seasonalityIndex,
        externalFactors: seasonalData.reason,
        adjustedGrowth: patterns.growthRate * seasonalData.factor
      });
    }
    
    return forecast;
  }

  // Apply business context to base forecasting
  static applyBusinessContext(baseForecast, correlations, businessHistory) {
    return baseForecast.map((period, idx) => {
      const businessGrowth = businessHistory?.length > 0 
        ? this.predictBusinessGrowth(businessHistory, idx)
        : 1.0;
      
      const contextualAdjustment = correlations.revenueEfficiency > 0 
        ? businessGrowth * correlations.correlationStrength
        : 1.0;
      
      return {
        ...period,
        businessAdjustedCost: period.cost * contextualAdjustment,
        businessGrowthFactor: businessGrowth,
        confidenceLevel: this.calculatePeriodConfidence(correlations, idx),
        revenueProjection: period.cost * correlations.revenueEfficiency,
        costEfficiencyRatio: correlations.revenueEfficiency
      };
    });
  }

  // Helper methods
  static async getHistoricalCostData(userId, months) {
    try {
      // 🔒 SECURITY: Filter by user_id to prevent data leaks
      const query = `
        SELECT DATE_TRUNC('month', date) as month, SUM(cost_amount) as cost
        FROM cost_records 
        WHERE user_id = $1 
          AND date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month DESC
        LIMIT ${months}
      `;
      const result = await DatabaseService.query(query, [DatabaseService.getUserIdForDatabase(userId)]);
      
      if (result.rows.length === 0) {
        console.warn(`⚠️  No cost data found for the last ${months} months`);
        return [];
      }
      
      console.log(`✅ Loaded ${result.rows.length} months of real cost data`);
      return result.rows.map(row => ({
        date: row.month,
        cost: parseFloat(row.cost) || 0
      }));
    } catch (error) {
      console.error('❌ Error fetching cost data:', error.message);
      return [];
    }
  }

  static async getBusinessMetrics(userId) {
    try {
      // ✅ REAL DATA: Query actual business_metrics table and aggregate to monthly
      const query = `
        SELECT 
          DATE_TRUNC('month', date) as month,
          SUM(revenue) as revenue,
          AVG(active_users) as "activeUsers",
          SUM(transactions) as transactions
        FROM business_metrics 
        WHERE user_id = $1 
          AND date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month DESC
        LIMIT 12
      `;
      
      const result = await DatabaseService.query(query, [userId]);
      
      if (result.rows.length > 0) {
        console.log(`✅ Loaded ${result.rows.length} months of real business metrics for user ${userId}`);
        return result.rows.map(row => ({
          month: row.month,
          revenue: parseFloat(row.revenue) || 0,
          activeUsers: Math.round(parseFloat(row.activeUsers)) || 0,
          transactions: parseInt(row.transactions) || 0
        }));
      }
      
      // If no data found, return empty array (better than fake data)
      console.warn(`⚠️  No business metrics found for user ${userId}. Forecasting will use cost-only analysis.`);
      return [];
      
    } catch (error) {
      console.error('❌ Error fetching business metrics:', error.message);
      // Return empty array instead of fake data
      return [];
    }
  }

  static generateBaseForecast(costHistory, patterns, months) {
    if (!costHistory.length) return [];
    
    const lastCost = costHistory[0].cost;
    if (!lastCost || lastCost <= 0) return [];
    
    const forecast = [];
    const growthRate = isNaN(patterns.growthRate) ? 0 : patterns.growthRate;
    const volatility = isNaN(patterns.volatility) ? 0 : patterns.volatility;
    
    for (let i = 1; i <= months; i++) {
      const projectedCost = lastCost * Math.pow(1 + growthRate, i);
      const volatilityAdjustment = projectedCost * volatility * (Math.random() - 0.5);
      const finalCost = projectedCost + volatilityAdjustment;
      
      forecast.push({
        period: i,
        date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000),
        cost: isNaN(finalCost) || finalCost <= 0 ? lastCost : finalCost,
        baseCost: isNaN(projectedCost) || projectedCost <= 0 ? lastCost : projectedCost,
        confidence: Math.max(0.5, 0.95 - (i * 0.1)) // Confidence decreases over time
      });
    }
    
    return forecast;
  }

  static calculateSeasonality(costHistory) {
    // Simplified seasonality calculation
    if (costHistory.length < 12) return 1.0;
    
    const monthlyAvgs = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    costHistory.forEach(record => {
      const month = new Date(record.date).getMonth();
      monthlyAvgs[month] += record.cost;
      monthlyCounts[month]++;
    });
    
    // Calculate average cost per month
    for (let i = 0; i < 12; i++) {
      monthlyAvgs[i] = monthlyCounts[i] > 0 ? monthlyAvgs[i] / monthlyCounts[i] : 0;
    }
    
    const overallAvg = monthlyAvgs.reduce((sum, avg) => sum + avg, 0) / 12;
    const seasonalVariance = monthlyAvgs.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / 12;
    
    return Math.sqrt(seasonalVariance) / overallAvg || 1.0;
  }

  static calculateCorrelation(costs, revenues) {
    if (!costs.length || !revenues.length || costs.length !== revenues.length) return 0;
    
    const n = costs.length;
    const costMean = costs.reduce((sum, c) => sum + c, 0) / n;
    const revMean = revenues.reduce((sum, r) => sum + r, 0) / n;
    
    const numerator = costs.reduce((sum, cost, i) => sum + (cost - costMean) * (revenues[i] - revMean), 0);
    const costVar = costs.reduce((sum, cost) => sum + Math.pow(cost - costMean, 2), 0);
    const revVar = revenues.reduce((sum, rev) => sum + Math.pow(rev - revMean, 2), 0);
    
    return numerator / Math.sqrt(costVar * revVar) || 0;
  }

  static applyScenarioAdjustments(baseForecast, adjustments) {
    return baseForecast.map((period, idx) => ({
      ...period,
      scenarioAdjustedCost: period.cost * adjustments.businessGrowth * adjustments.seasonality,
      growthFactor: adjustments.businessGrowth,
      seasonalityFactor: adjustments.seasonality
    }));
  }

  static calculateConfidence(patterns, correlations) {
    const volatilityScore = Math.max(0, 1 - (patterns.volatility || 0) * 2);
    const correlationScore = correlations.correlationStrength || 0;
    const dataQualityScore = patterns.growthRate !== undefined && !isNaN(patterns.growthRate) ? 0.8 : 0.5;
    
    const confidence = Math.round((volatilityScore + correlationScore + dataQualityScore) / 3 * 100);
    return isNaN(confidence) ? 50 : Math.max(0, Math.min(100, confidence));
  }

  static calculateOptimalCostRatio(costHistory, businessMetrics) {
    // Simplified optimal cost ratio calculation
    if (!businessMetrics?.length) return 0.1;
    
    const ratios = costHistory.map((cost, idx) => {
      const revenue = businessMetrics[idx]?.revenue || 0;
      return revenue > 0 ? cost.cost / revenue : 0;
    }).filter(r => r > 0);
    
    return ratios.length > 0 ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length : 0.1;
  }

  static predictBusinessGrowth(businessHistory, periodIndex) {
    // Predict business growth based on historical trends
    if (!businessHistory.length) return 1.0;
    
    const recentGrowth = businessHistory.length > 1 
      ? (businessHistory[0].revenue - businessHistory[1].revenue) / businessHistory[1].revenue
      : 0.05;
    
    return 1 + (recentGrowth * (1 + periodIndex * 0.1)); // Compound growth with time
  }

  static calculatePeriodConfidence(correlations, periodIndex) {
    const baseConfidence = correlations.correlationStrength * 100;
    const timeDecay = Math.max(0.3, 1 - (periodIndex * 0.15)); // Confidence decreases over time
    return Math.round(baseConfidence * timeDecay);
  }

  static calculateScenarioMetrics(forecast, scenario) {
    // ✅ FIX: Handle empty or invalid forecast arrays
    if (!forecast || !Array.isArray(forecast) || forecast.length === 0) {
      return {
        totalProjectedCost: 0,
        averageMonthlyCost: 0,
        peakMonth: null,
        costVariance: 0
      };
    }
    
    const totalCost = forecast.reduce((sum, period) => sum + (period.scenarioAdjustedCost || 0), 0);
    const avgMonthlyCost = totalCost / forecast.length;
    
    // Find peak month safely
    const peakMonth = forecast.reduce((max, period) => {
      const maxCost = max?.scenarioAdjustedCost || 0;
      const periodCost = period?.scenarioAdjustedCost || 0;
      return periodCost > maxCost ? period : max;
    }, forecast[0]);
    
    // Calculate variance safely
    const costs = forecast.map(f => f.scenarioAdjustedCost || 0).filter(c => c > 0);
    const costVariance = costs.length > 0 ? this.calculateVariance(costs) : 0;
    
    return {
      totalProjectedCost: totalCost,
      averageMonthlyCost: avgMonthlyCost,
      peakMonth: peakMonth,
      costVariance: costVariance
    };
  }

  static calculateScenarioImpact(baseForecast, scenarioForecast) {
    // ✅ FIX: Handle empty or invalid forecast arrays
    if (!baseForecast || !Array.isArray(baseForecast) || baseForecast.length === 0 ||
        !scenarioForecast || !Array.isArray(scenarioForecast) || scenarioForecast.length === 0) {
      return {
        percentageImpact: '0.0%',
        absoluteImpact: 0,
        direction: 'stable'
      };
    }
    
    const baseTotal = baseForecast.reduce((sum, p) => sum + (p.cost || 0), 0);
    const scenarioTotal = scenarioForecast.reduce((sum, p) => sum + (p.scenarioAdjustedCost || 0), 0);
    
    // Prevent division by zero
    const impact = baseTotal > 0 ? (scenarioTotal - baseTotal) / baseTotal : 0;
    
    return {
      percentageImpact: (impact * 100).toFixed(1) + '%',
      absoluteImpact: scenarioTotal - baseTotal,
      direction: impact > 0 ? 'increase' : impact < 0 ? 'decrease' : 'stable'
    };
  }

  static createScenarioComparison(scenarios) {
    return scenarios.map(s => ({
      name: s.name,
      totalCost: s.metrics.totalProjectedCost,
      avgMonthlyCost: s.metrics.averageMonthlyCost,
      impact: s.impact.percentageImpact,
      riskLevel: s.metrics.costVariance > 1000 ? 'high' : s.metrics.costVariance > 500 ? 'medium' : 'low'
    }));
  }

  static async analyzeServiceTrends(userId) {
    try {
      // ✅ REAL DATA: Query actual service costs from database
      const dbUserId = DatabaseService.getUserIdForDatabase(userId);
      const query = `
        SELECT 
          service_name,
          COUNT(*) as record_count,
          AVG(cost_amount) as avg_cost,
          SUM(cost_amount) as total_cost,
          MIN(date) as first_date,
          MAX(date) as last_date
        FROM cost_records
        WHERE user_id = $1
          AND date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY service_name
        HAVING COUNT(*) >= 5
        ORDER BY total_cost DESC
        LIMIT 10
      `;
      
      const result = await DatabaseService.query(query, [dbUserId]);
      
      if (result.rows.length === 0) {
        console.warn(`⚠️  No service data found for user ${userId}`);
        return {};
      }
      
      // Analyze trend for each service
      const serviceTrends = {};
      
      for (const row of result.rows) {
        const serviceName = row.service_name;
        
        // Get time-series data for this service
        const trendQuery = `
          SELECT date, cost_amount
          FROM cost_records
          WHERE user_id = $1 
            AND service_name = $2
            AND date >= CURRENT_DATE - INTERVAL '90 days'
          ORDER BY date ASC
        `;
        
        const trendResult = await DatabaseService.query(trendQuery, [dbUserId, serviceName]);
        
        // Calculate trend direction
        const trend = this.calculateTrendDirection(trendResult.rows);
        
        serviceTrends[serviceName] = {
          trend: trend.direction,
          confidence: trend.confidence,
          avgCost: parseFloat(row.avg_cost),
          totalCost: parseFloat(row.total_cost),
          recordCount: parseInt(row.record_count)
        };
      }
      
      console.log(`✅ Analyzed trends for ${Object.keys(serviceTrends).length} services`);
      return serviceTrends;
      
    } catch (error) {
      console.error('❌ Error analyzing service trends:', error.message);
      return {};
    }
  }
  
  static calculateTrendDirection(dataPoints) {
    if (dataPoints.length < 5) {
      return { direction: 'insufficient_data', confidence: 0 };
    }
    
    // Simple linear regression to determine trend
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    dataPoints.forEach((point, index) => {
      const x = index;
      const y = parseFloat(point.cost_amount) || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgCost = sumY / n;
    const slopePercent = (slope / avgCost) * 100;
    
    // Determine trend direction
    let direction;
    if (slopePercent > 5) direction = 'increasing';
    else if (slopePercent < -5) direction = 'decreasing';
    else direction = 'stable';
    
    // Calculate confidence based on data consistency
    const confidence = Math.min(95, Math.max(50, 70 + (n * 2)));
    
    return { direction, confidence };
  }

  static calculateVariance(values) {
    // ✅ FIX: Handle empty or invalid arrays
    if (!values || !Array.isArray(values) || values.length === 0) {
      return 0;
    }
    
    const mean = values.reduce((sum, v) => sum + (v || 0), 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow((v || 0) - mean, 2), 0) / values.length;
  }
}

module.exports = BusinessForecastingService;
