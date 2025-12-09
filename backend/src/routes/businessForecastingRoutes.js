// Business Forecasting API Routes
const express = require('express');
const router = express.Router();
const BusinessForecastingService = require('../services/businessForecastingService');
const DatabaseService = require('../services/databaseService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Helper function to convert user ID for database compatibility
 */
const convertUserId = (userId) => {
  if (typeof userId === 'string' && userId.startsWith('user-')) {
    return parseInt(userId.substring(5), 10);
  }
  return userId;
};

// Generate business-aware forecast
router.get('/forecast', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    const { months = 6, seasonality = 'true' } = req.query;
    
    console.log(`🔍 Generating business forecast for user: ${userId} (DB ID: ${dbUserId})`);
    
    const options = {
      months: parseInt(months),
      includeSeasonality: seasonality === 'true'
    };
    
    const forecast = await BusinessForecastingService.generateBusinessForecast(dbUserId, options);
    res.json(forecast);
  } catch (error) {
    console.error('Business forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate scenario models
router.post('/scenarios', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    const { scenarios } = req.body;
    
    console.log(`🎯 Generating scenarios for user: ${userId} (DB ID: ${dbUserId})`);
    
    if (!scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Scenarios array required' 
      });
    }
    
    const result = await BusinessForecastingService.generateScenarioModels(dbUserId, scenarios);
    res.json(result);
  } catch (error) {
    console.error('Scenario generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit business metrics (for correlation analysis)
router.post('/metrics', authenticateToken, async (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Business metrics array required' 
      });
    }
    
    // Store business metrics (implement based on your database schema)
    // For now, return success to indicate metrics received
    res.json({ 
      success: true, 
      message: 'Business metrics received',
      metricsCount: metrics.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'business-forecasting',
    features: [
      'revenue_correlation',
      'seasonal_prediction', 
      'scenario_modeling',
      'business_context_analysis'
    ],
    endpoints: [
      '/api/business-forecast/forecast',
      '/api/business-forecast/scenarios',
      '/api/business-forecast/metrics'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
