// Integration API Routes
// Handles webhook configurations and Slack/Teams integrations
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/authMiddleware');
const SamlService = require('../services/samlService');
const WebhookService = require('../services/webhookService');
const SlackService = require('../services/slackService');

const router = express.Router();

// Rate limiting for integration endpoints
const integrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many integration requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all integration routes
router.use(integrationLimiter);

// =============================================================================
// WEBHOOK MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * Create webhook configuration
 * POST /api/integrations/webhooks
 */
router.post('/webhooks', authenticateToken, async (req, res) => {
    try {
        const { webhook_url, events, organization, is_active } = req.body;

        // Validate required fields
        if (!webhook_url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'webhook_url and events array are required'
            });
        }

        // Validate events
        const validEvents = [
            'cost.alert',
            'cost.anomaly',
            'cost.threshold',
            'budget.exceeded',
            'daily.summary',
            'weekly.summary',
            'monthly.summary'
        ];

        const invalidEvents = events.filter(event => !validEvents.includes(event));
        if (invalidEvents.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid events: ${invalidEvents.join(', ')}`,
                valid_events: validEvents
            });
        }

        const result = await WebhookService.createWebhookConfig(req.user.id, {
            webhook_url,
            events,
            organization: organization || req.user.organization,
            is_active: is_active !== undefined ? is_active : true
        });

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ Error creating webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Get webhook configurations
 * GET /api/integrations/webhooks
 */
router.get('/webhooks', authenticateToken, async (req, res) => {
    try {
        const result = await WebhookService.getWebhookConfigs(
            req.user.id, 
            req.query.organization
        );

        res.json(result);
    } catch (error) {
        console.error('❌ Error getting webhooks:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Update webhook configuration
 * PUT /api/integrations/webhooks/:id
 */
router.put('/webhooks/:id', authenticateToken, async (req, res) => {
    try {
        const webhookId = parseInt(req.params.id);
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.user_id;
        delete updates.secret_key;
        delete updates.created_at;

        const result = await WebhookService.updateWebhookConfig(
            webhookId,
            req.user.id,
            updates
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('❌ Error updating webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Delete webhook configuration
 * DELETE /api/integrations/webhooks/:id
 */
router.delete('/webhooks/:id', authenticateToken, async (req, res) => {
    try {
        const webhookId = parseInt(req.params.id);
        const result = await WebhookService.deleteWebhookConfig(webhookId, req.user.id);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('❌ Error deleting webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Test webhook endpoint
 * POST /api/integrations/webhooks/test
 */
router.post('/webhooks/test', authenticateToken, async (req, res) => {
    try {
        const { webhook_url, secret_key } = req.body;

        if (!webhook_url) {
            return res.status(400).json({
                success: false,
                error: 'webhook_url is required'
            });
        }

        const result = await WebhookService.testWebhook(webhook_url, secret_key);
        res.json(result);
    } catch (error) {
        console.error('❌ Error testing webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Get webhook delivery history
 * GET /api/integrations/webhooks/:id/deliveries
 */
router.get('/webhooks/:id/deliveries', authenticateToken, async (req, res) => {
    try {
        const webhookId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit) || 50;

        const result = await WebhookService.getDeliveryHistory(webhookId, req.user.id, limit);
        res.json(result);
    } catch (error) {
        console.error('❌ Error getting delivery history:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// =============================================================================
// SLACK INTEGRATION ENDPOINTS
// =============================================================================

/**
 * Configure Slack integration
 * POST /api/integrations/slack
 */
router.post('/slack', authenticateToken, SamlService.checkPermission('manager'), async (req, res) => {
    try {
        const {
            bot_token,
            signing_secret,
            channels,
            notifications
        } = req.body;

        if (!bot_token) {
            return res.status(400).json({
                success: false,
                error: 'bot_token is required'
            });
        }

        const organizationId = req.user.organization || `user-${req.user.id}`;
        
        const result = await SlackService.configureSlackIntegration(
            req.user.id,
            organizationId,
            {
                bot_token,
                signing_secret,
                channels: channels || [],
                notifications: notifications || {}
            }
        );

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ Error configuring Slack:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Test Slack integration
 * POST /api/integrations/slack/test
 */
router.post('/slack/test', authenticateToken, async (req, res) => {
    try {
        const organizationId = req.user.organization || `user-${req.user.id}`;
        const result = await SlackService.testSlackIntegration(organizationId);
        res.json(result);
    } catch (error) {
        console.error('❌ Error testing Slack integration:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Send test cost alert to Slack
 * POST /api/integrations/slack/alert/test
 */
router.post('/slack/alert/test', authenticateToken, async (req, res) => {
    try {
        const organizationId = req.user.organization || `user-${req.user.id}`;
        
        const testAlert = {
            service_name: 'Amazon EC2',
            current_cost: 156.78,
            threshold: 100.00,
            period: 'current_month',
            triggered_at: new Date()
        };

        const result = await SlackService.sendCostAlert(organizationId, testAlert);
        res.json({
            success: result.success,
            message: 'Test cost alert sent',
            result: result
        });
    } catch (error) {
        console.error('❌ Error sending test alert:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Send test anomaly alert to Slack
 * POST /api/integrations/slack/anomaly/test
 */
router.post('/slack/anomaly/test', authenticateToken, async (req, res) => {
    try {
        const organizationId = req.user.organization || `user-${req.user.id}`;
        
        const testAnomaly = {
            service_name: 'Amazon S3',
            severity: 'high',
            cost_amount: 245.67,
            mean: 89.23,
            stdDev: 23.45,
            zScore: 6.67,
            detectedAt: new Date()
        };

        const result = await SlackService.sendAnomalyAlert(organizationId, testAnomaly);
        res.json({
            success: result.success,
            message: 'Test anomaly alert sent',
            result: result
        });
    } catch (error) {
        console.error('❌ Error sending test anomaly alert:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Handle Slack slash commands
 * POST /api/integrations/slack/commands
 */
router.post('/slack/commands', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req, res) => {
    try {
        // Parse URL-encoded payload from Slack
        const payload = new URLSearchParams(req.body.toString());
        const slackPayload = Object.fromEntries(payload);

        const result = await SlackService.handleSlashCommand(slackPayload);
        res.json(result);
    } catch (error) {
        console.error('❌ Error handling Slack command:', error);
        res.json({
            response_type: 'ephemeral',
            text: 'Sorry, there was an error processing your command.'
        });
    }
});

// =============================================================================
// INTEGRATION HEALTH AND STATUS
// =============================================================================

/**
 * Get integration status
 * GET /api/integrations/status
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const organizationId = req.user.organization;

        // Get webhook configurations
        const webhookResult = await WebhookService.getWebhookConfigs(userId, organizationId);
        const webhooks = webhookResult.success ? webhookResult.configs : [];

        // Get integration configurations from database
        const integrations = await require('../services/databaseService').query(`
            SELECT integration_type, config, is_active, updated_at
            FROM integration_configs 
            WHERE user_id = $1 
            ${organizationId ? 'AND organization = $2' : ''}
            ORDER BY integration_type, updated_at DESC
        `, organizationId ? [userId, organizationId] : [userId]);

        const status = {
            webhooks: {
                count: webhooks.length,
                active: webhooks.filter(w => w.is_active).length,
                configurations: webhooks.map(w => ({
                    id: w.id,
                    url: w.webhook_url,
                    events: w.events,
                    is_active: w.is_active,
                    created_at: w.created_at
                }))
            },
            integrations: {
                slack: {
                    configured: false,
                    active: false,
                    channels: 0,
                    last_updated: null
                },
                teams: {
                    configured: false,
                    active: false,
                    channels: 0,
                    last_updated: null
                }
            }
        };

        // Process integrations
        integrations.rows.forEach(integration => {
            if (integration.integration_type === 'slack') {
                status.integrations.slack = {
                    configured: true,
                    active: integration.is_active,
                    channels: integration.config.channels?.length || 0,
                    last_updated: integration.updated_at
                };
            } else if (integration.integration_type === 'teams') {
                status.integrations.teams = {
                    configured: true,
                    active: integration.is_active,
                    channels: integration.config.channels?.length || 0,
                    last_updated: integration.updated_at
                };
            }
        });

        res.json({
            success: true,
            status: status
        });
    } catch (error) {
        console.error('❌ Error getting integration status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Integration health check
 * GET /api/integrations/health
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Integration services operational',
        timestamp: new Date().toISOString(),
        services: {
            webhook_service: 'Available',
            slack_service: 'Available',
            teams_service: 'Available'
        },
        endpoints: {
            'POST /api/integrations/webhooks': 'Create webhook configuration',
            'GET /api/integrations/webhooks': 'Get webhook configurations',
            'POST /api/integrations/slack': 'Configure Slack integration',
            'POST /api/integrations/slack/test': 'Test Slack integration',
            'GET /api/integrations/status': 'Get integration status'
        }
    });
});

module.exports = router;
