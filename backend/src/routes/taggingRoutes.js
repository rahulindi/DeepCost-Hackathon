// Tagging Intelligence API Routes
const express = require('express');
const router = express.Router();
const TaggingIntelligenceService = require('../services/taggingIntelligenceService');
const { authenticateToken } = require('../middleware/authMiddleware');

// Analyze tagging patterns and get suggestions
router.get('/analysis', authenticateToken, async (req, res) => {
  try {
    const analysis = await TaggingIntelligenceService.analyzeTaggingPatterns(req.user.id);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tag compliance report
router.get('/compliance', authenticateToken, async (req, res) => {
  try {
    const report = await TaggingIntelligenceService.getComplianceReport(req.user.id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-apply tags based on rules
router.post('/auto-tag', authenticateToken, async (req, res) => {
  try {
    const { tagRules } = req.body;
    if (!tagRules || !Array.isArray(tagRules)) {
      return res.status(400).json({ success: false, error: 'Tag rules array required' });
    }
    
    const result = await TaggingIntelligenceService.autoTagResources(req.user.id, tagRules);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'tagging-intelligence',
    features: ['pattern_analysis', 'automated_suggestions', 'compliance_scoring', 'auto_tagging'],
    endpoints: [
      '/api/tagging/analysis',
      '/api/tagging/compliance', 
      '/api/tagging/auto-tag'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
