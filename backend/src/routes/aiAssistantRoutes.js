/**
 * AI Cost Assistant API Routes
 * RESTful endpoints for AI chat functionality
 */

const express = require('express');
const router = express.Router();
const aiAssistantService = require('../services/aiAssistantService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/ai/chat
 * @desc    Send message to AI assistant
 * @access  Private
 */
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { message, context } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log(`💬 AI Chat request from user ${userId}`);

        const result = await aiAssistantService.chat(userId, message, context);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('❌ AI chat route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process chat message'
        });
    }
});

/**
 * @route   GET /api/ai/history
 * @desc    Get conversation history
 * @access  Private
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await aiAssistantService.getHistory(userId);
        res.json(result);
    } catch (error) {
        console.error('❌ AI history route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve conversation history'
        });
    }
});

/**
 * @route   POST /api/ai/reset
 * @desc    Reset conversation history
 * @access  Private
 */
router.post('/reset', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await aiAssistantService.resetConversation(userId);
        res.json(result);
    } catch (error) {
        console.error('❌ AI reset route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset conversation'
        });
    }
});

/**
 * @route   GET /api/ai/status
 * @desc    Get AI assistant status
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = aiAssistantService.getStatus();
        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('❌ AI status route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI status'
        });
    }
});

/**
 * @route   GET /api/ai/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
    const status = aiAssistantService.getStatus();
    res.json({
        service: 'ai-cost-assistant',
        version: '1.0.0',
        status: status.status,
        model: status.model,
        features: [
            'natural-language-queries',
            'cost-analysis',
            'optimization-recommendations',
            'anomaly-explanation',
            'budget-management',
            'multi-turn-conversations'
        ],
        endpoints: {
            'POST /api/ai/chat': 'Send message to AI',
            'GET /api/ai/history': 'Get conversation history',
            'POST /api/ai/reset': 'Reset conversation',
            'GET /api/ai/status': 'Get AI status'
        }
    });
});

module.exports = router;
