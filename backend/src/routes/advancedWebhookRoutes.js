const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const webhookService = require('../services/webhookService'); // Existing service

const router = express.Router();

/**
 * ENHANCED WEBHOOK API ROUTES
 * Additive to existing webhook endpoints
 * New subscription management under /api/webhooks/subscriptions/
 */

// Available event types
const EVENT_TYPES = {
    'cost.export.completed': {
        name: 'Export Job Completed',
        description: 'Triggered when an export job completes successfully',
        schema: {
            job: 'object',
            downloadUrl: 'string', 
            recordCount: 'number'
        }
    },
    'cost.export.failed': {
        name: 'Export Job Failed',
        description: 'Triggered when an export job fails',
        schema: {
            job: 'object',
            error: 'string',
            retryAvailable: 'boolean'
        }
    },
    'cost.anomaly.detected': {
        name: 'Cost Anomaly Detected',
        description: 'Triggered when unusual cost patterns are detected',
        schema: {
            service: 'string',
            anomalyType: 'string',
            currentCost: 'number',
            expectedCost: 'number',
            deviation: 'number'
        }
    },
    'cost.budget.exceeded': {
        name: 'Budget Threshold Exceeded',
        description: 'Triggered when costs exceed budget thresholds',
        schema: {
            budgetName: 'string',
            threshold: 'number',
            currentSpend: 'number',
            percentageUsed: 'number'
        }
    },
    'cost.forecast.alert': {
        name: 'Cost Forecast Alert',
        description: 'Triggered for forecasted cost threshold breaches',
        schema: {
            forecastedAmount: 'number',
            timeframe: 'string',
            confidence: 'number'
        }
    },
    'resource.discovered': {
        name: 'New Resource Discovered',
        description: 'Triggered when new AWS resources are discovered',
        schema: {
            resourceType: 'string',
            resourceId: 'string',
            region: 'string',
            estimatedCost: 'number'
        }
    },
    'integration.connected': {
        name: 'Data Lake Integration Connected',
        description: 'Triggered when data lake integration is established',
        schema: {
            provider: 'string',
            connectionId: 'string',
            status: 'string'
        }
    }
};

/**
 * Get available event types
 * GET /api/webhooks/events
 */
router.get('/events', authenticateToken, (req, res) => {
    res.json({
        success: true,
        eventTypes: EVENT_TYPES,
        total: Object.keys(EVENT_TYPES).length
    });
});

/**
 * Enhanced health check with subscription info
 * GET /api/webhooks/advanced-health
 */
router.get('/advanced-health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'advanced-webhook-system',
        version: '2.0.0',
        features: [
            'subscription-management',
            'event-types-catalog',
            'delivery-history',
            'retry-configuration',
            'signature-verification',
            'event-filtering'
        ],
        endpoints: {
            'GET /api/webhooks/events': 'List available event types',
            'POST /api/webhooks/subscriptions': 'Create webhook subscription',
            'GET /api/webhooks/subscriptions': 'List webhook subscriptions',
            'GET /api/webhooks/subscriptions/:id': 'Get subscription details',
            'PUT /api/webhooks/subscriptions/:id': 'Update subscription',
            'DELETE /api/webhooks/subscriptions/:id': 'Delete subscription',
            'POST /api/webhooks/subscriptions/:id/test': 'Test webhook endpoint',
            'GET /api/webhooks/subscriptions/:id/deliveries': 'Get delivery history',
            'POST /api/webhooks/simulate': 'Simulate webhook events'
        },
        eventTypes: Object.keys(EVENT_TYPES),
        integrations: {
            database: 'PostgreSQL with file fallback',
            retries: 'Configurable with exponential backoff',
            security: 'HMAC SHA-256 signatures'
        }
    });
});

/**
 * Create webhook subscription
 * POST /api/webhooks/subscriptions
 */
router.post('/subscriptions',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionData = req.body;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('🎯 Creating webhook subscription for user:', userId, '(DB ID:', dbUserId, ')');

            // Validate required fields
            if (!subscriptionData.url) {
                return res.status(400).json({
                    success: false,
                    error: 'Webhook URL is required'
                });
            }

            if (!subscriptionData.events || subscriptionData.events.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one event type is required'
                });
            }

            // Validate URL format
            try {
                new URL(subscriptionData.url);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid webhook URL format'
                });
            }

            // Validate event types
            const invalidEvents = subscriptionData.events.filter(event => 
                !EVENT_TYPES[event]
            );
            
            if (invalidEvents.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid event types: ${invalidEvents.join(', ')}`
                });
            }

            // Use existing webhook service to create
            const result = await webhookService.createWebhookConfig(dbUserId, {
                webhook_url: subscriptionData.url,
                events: subscriptionData.events,
                is_active: subscriptionData.isActive !== false,
                organization: subscriptionData.organization || null
            });

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'Webhook subscription created successfully',
                    subscription: {
                        id: result.config.id,
                        url: result.config.webhook_url,
                        events: result.config.events,
                        isActive: result.config.is_active,
                        created_at: result.config.created_at,
                        secret_key: result.secret_key // Return once for initial setup
                    },
                    links: {
                        self: `/api/webhooks/subscriptions/${result.config.id}`,
                        test: `/api/webhooks/subscriptions/${result.config.id}/test`,
                        deliveries: `/api/webhooks/subscriptions/${result.config.id}/deliveries`
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Webhook subscription creation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create webhook subscription'
            });
        }
    }
);

/**
 * List webhook subscriptions
 * GET /api/webhooks/subscriptions
 */
router.get('/subscriptions',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const options = {
                organization: req.query.organization,
                status: req.query.status,
                event: req.query.event
            };

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            const result = await webhookService.getWebhookConfigs(dbUserId, options.organization);

            if (result.success) {
                let subscriptions = result.configs;

                // Apply filters
                if (options.status) {
                    subscriptions = subscriptions.filter(config => 
                        config.is_active === (options.status === 'active')
                    );
                }
                
                if (options.event) {
                    subscriptions = subscriptions.filter(config => 
                        config.events.includes(options.event)
                    );
                }

                // Format response with links
                const formattedSubscriptions = subscriptions.map(config => ({
                    id: config.id,
                    url: config.webhook_url,
                    events: config.events,
                    isActive: config.is_active,
                    organization: config.organization,
                    created_at: config.created_at,
                    updated_at: config.updated_at,
                    links: {
                        self: `/api/webhooks/subscriptions/${config.id}`,
                        test: `/api/webhooks/subscriptions/${config.id}/test`,
                        deliveries: `/api/webhooks/subscriptions/${config.id}/deliveries`
                    }
                }));

                res.json({
                    success: true,
                    subscriptions: formattedSubscriptions,
                    total: formattedSubscriptions.length,
                    filters: options
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Webhook subscriptions listing error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list webhook subscriptions'
            });
        }
    }
);

/**
 * Get specific webhook subscription
 * GET /api/webhooks/subscriptions/:id
 */
router.get('/subscriptions/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionId = req.params.id;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            // Get all user configs and find the specific one
            const result = await webhookService.getWebhookConfigs(dbUserId);

            if (result.success) {
                const subscription = result.configs.find(config => 
                    config.id.toString() === subscriptionId
                );

                if (subscription) {
                    res.json({
                        success: true,
                        subscription: {
                            id: subscription.id,
                            url: subscription.webhook_url,
                            events: subscription.events,
                            isActive: subscription.is_active,
                            organization: subscription.organization,
                            created_at: subscription.created_at,
                            updated_at: subscription.updated_at,
                            links: {
                                self: `/api/webhooks/subscriptions/${subscription.id}`,
                                test: `/api/webhooks/subscriptions/${subscription.id}/test`,
                                deliveries: `/api/webhooks/subscriptions/${subscription.id}/deliveries`,
                                update: `/api/webhooks/subscriptions/${subscription.id}`,
                                delete: `/api/webhooks/subscriptions/${subscription.id}`
                            }
                        }
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Webhook subscription not found'
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Webhook subscription details error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get webhook subscription details'
            });
        }
    }
);

/**
 * Update webhook subscription
 * PUT /api/webhooks/subscriptions/:id
 */
router.put('/subscriptions/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionId = req.params.id;
            const updates = req.body;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('🔄 Updating webhook subscription:', subscriptionId);

            // Map frontend field names to database field names
            const dbUpdates = {};
            if (updates.url) dbUpdates.webhook_url = updates.url;
            if (updates.events) dbUpdates.events = updates.events;
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
            if (updates.organization) dbUpdates.organization = updates.organization;

            const result = await webhookService.updateWebhookConfig(subscriptionId, dbUserId, dbUpdates);

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Webhook subscription updated successfully',
                    subscription: {
                        id: result.config.id,
                        url: result.config.webhook_url,
                        events: result.config.events,
                        isActive: result.config.is_active,
                        organization: result.config.organization,
                        updated_at: result.config.updated_at
                    }
                });
            } else {
                if (result.error === 'Webhook configuration not found or access denied') {
                    res.status(404).json({
                        success: false,
                        error: 'Webhook subscription not found'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error
                    });
                }
            }

        } catch (error) {
            console.error('❌ Webhook subscription update error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update webhook subscription'
            });
        }
    }
);

/**
 * Delete webhook subscription
 * DELETE /api/webhooks/subscriptions/:id
 */
router.delete('/subscriptions/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionId = req.params.id;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('🗑️ Deleting webhook subscription:', subscriptionId);

            const result = await webhookService.deleteWebhookConfig(subscriptionId, dbUserId);

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                if (result.error === 'Webhook configuration not found or access denied') {
                    res.status(404).json({
                        success: false,
                        error: 'Webhook subscription not found'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error
                    });
                }
            }

        } catch (error) {
            console.error('❌ Webhook subscription deletion error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete webhook subscription'
            });
        }
    }
);

/**
 * Test webhook subscription
 * POST /api/webhooks/subscriptions/:id/test
 */
router.post('/subscriptions/:id/test',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionId = req.params.id;
            const customEvent = req.body.event || 'webhook.test';

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('🧪 Testing webhook subscription:', subscriptionId);

            // Get subscription details first
            const configsResult = await webhookService.getWebhookConfigs(dbUserId);
            
            if (!configsResult.success) {
                return res.status(500).json({
                    success: false,
                    error: configsResult.error
                });
            }

            const subscription = configsResult.configs.find(config => 
                config.id.toString() === subscriptionId
            );

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook subscription not found'
                });
            }

            // Create test payload
            const testPayload = {
                event: customEvent,
                timestamp: new Date().toISOString(),
                data: {
                    message: 'This is a test webhook delivery from AWS Cost Tracker Pro',
                    test: true,
                    subscriptionId: subscriptionId,
                    eventType: customEvent,
                    sampleData: EVENT_TYPES[customEvent] ? {
                        ...Object.keys(EVENT_TYPES[customEvent].schema).reduce((acc, key) => {
                            const type = EVENT_TYPES[customEvent].schema[key];
                            switch (type) {
                                case 'string':
                                    acc[key] = `sample_${key}`;
                                    break;
                                case 'number':
                                    acc[key] = 123.45;
                                    break;
                                case 'boolean':
                                    acc[key] = true;
                                    break;
                                case 'object':
                                    acc[key] = { sample: 'data' };
                                    break;
                                default:
                                    acc[key] = 'sample_value';
                            }
                            return acc;
                        }, {})
                    } : undefined
                },
                delivery: {
                    id: require('crypto').randomUUID(),
                    attempt: 1,
                    test: true
                }
            };

            // Test using existing webhook service
            const result = await webhookService.testWebhook(subscription.webhook_url);

            res.json({
                success: result.success,
                test: {
                    url: subscription.webhook_url,
                    status: result.status,
                    response: result.response,
                    message: result.message,
                    payload: testPayload
                },
                message: result.success ? 
                    'Test webhook delivered successfully' : 
                    'Test webhook delivery failed'
            });

        } catch (error) {
            console.error('❌ Webhook test error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to test webhook subscription'
            });
        }
    }
);

/**
 * Get webhook delivery history
 * GET /api/webhooks/subscriptions/:id/deliveries
 */
router.get('/subscriptions/:id/deliveries',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionId = req.params.id;
            const limit = parseInt(req.query.limit) || 50;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('📊 Getting delivery history for subscription:', subscriptionId);

            const result = await webhookService.getDeliveryHistory(subscriptionId, dbUserId, limit);

            if (result.success) {
                res.json({
                    success: true,
                    deliveries: result.deliveries,
                    total: result.deliveries.length,
                    limit: limit
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Delivery history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get delivery history'
            });
        }
    }
);

/**
 * Test webhook endpoint (alternative path)
 * POST /api/webhooks/test/:id
 */
router.post('/test/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const subscriptionId = req.params.id;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('🧪 Testing webhook subscription:', subscriptionId);

            // Get all user configs and find the specific one
            const result = await webhookService.getWebhookConfigs(dbUserId);
            
            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

            const subscription = result.configs.find(config => 
                config.id.toString() === subscriptionId
            );

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook subscription not found'
                });
            }

            // Test the webhook
            const testResult = await webhookService.testWebhook(subscription.webhook_url);

            res.json({
                success: testResult.success,
                message: testResult.message,
                test: {
                    url: subscription.webhook_url,
                    status: testResult.status,
                    response: testResult.response
                }
            });

        } catch (error) {
            console.error('❌ Webhook test error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to test webhook'
            });
        }
    }
);

/**
 * Get delivery history (general endpoint for UI)
 * GET /api/webhooks/delivery-history
 */
router.get('/delivery-history',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            console.log('📊 Getting delivery history for user:', userId, '(DB ID:', dbUserId, ')');

            // Get all webhook configs for user
            const configResult = await webhookService.getWebhookConfigs(dbUserId);
            
            if (!configResult.success) {
                return res.status(500).json({
                    success: false,
                    error: configResult.error
                });
            }

            // Get delivery history for all subscriptions
            let allDeliveries = [];
            for (const config of configResult.configs) {
                const deliveryResult = await webhookService.getDeliveryHistory(config.id.toString(), dbUserId, limit);
                if (deliveryResult.success) {
                    allDeliveries.push(...deliveryResult.deliveries);
                }
            }

            // Sort by delivery time (most recent first)
            allDeliveries.sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at));

            // Limit results
            allDeliveries = allDeliveries.slice(0, limit);

            res.json({
                success: true,
                deliveries: allDeliveries,
                total: allDeliveries.length,
                limit: limit
            });

        } catch (error) {
            console.error('❌ Delivery history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get delivery history'
            });
        }
    }
);

/**
 * Simulate webhook events for testing
 * POST /api/webhooks/simulate
 */
router.post('/simulate',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { eventType, customPayload, subscriptionIds } = req.body;

            if (!eventType) {
                return res.status(400).json({
                    success: false,
                    error: 'Event type is required'
                });
            }

            if (!EVENT_TYPES[eventType]) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid event type'
                });
            }

            console.log('🎭 Simulating webhook event:', eventType);

            // Create sample payload if not provided
            const payload = customPayload || {
                message: `Simulated ${eventType} event`,
                timestamp: new Date().toISOString(),
                simulation: true,
                sampleData: Object.keys(EVENT_TYPES[eventType].schema).reduce((acc, key) => {
                    const type = EVENT_TYPES[eventType].schema[key];
                    switch (type) {
                        case 'string':
                            acc[key] = `sample_${key}`;
                            break;
                        case 'number':
                            acc[key] = Math.floor(Math.random() * 1000);
                            break;
                        case 'boolean':
                            acc[key] = Math.random() > 0.5;
                            break;
                        case 'object':
                            acc[key] = { sample: 'data', id: Math.floor(Math.random() * 1000) };
                            break;
                        default:
                            acc[key] = 'sample_value';
                    }
                    return acc;
                }, {})
            };

            // Send webhook using existing service
            const result = await webhookService.sendWebhook(eventType, payload, {
                organizationId: req.query.organization
            });

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    eventType: eventType,
                    payload: payload,
                    deliveries: result.deliveries
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Webhook simulation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to simulate webhook event'
            });
        }
    }
);

/**
 * Get webhook subscription statistics
 * GET /api/webhooks/stats
 */
router.get('/stats',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;

            // Convert user ID for database compatibility
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;

            const result = await webhookService.getWebhookConfigs(dbUserId);

            if (result.success) {
                const subscriptions = result.configs;
                
                const stats = {
                    totalSubscriptions: subscriptions.length,
                    activeSubscriptions: subscriptions.filter(sub => sub.is_active).length,
                    inactiveSubscriptions: subscriptions.filter(sub => !sub.is_active).length,
                    eventTypeDistribution: {},
                    organizationDistribution: {}
                };

                // Analyze event type distribution
                subscriptions.forEach(sub => {
                    sub.events.forEach(event => {
                        stats.eventTypeDistribution[event] = 
                            (stats.eventTypeDistribution[event] || 0) + 1;
                    });
                    
                    const org = sub.organization || 'default';
                    stats.organizationDistribution[org] = 
                        (stats.organizationDistribution[org] || 0) + 1;
                });

                res.json({
                    success: true,
                    statistics: stats
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Webhook stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get webhook statistics'
            });
        }
    }
);

module.exports = router;
