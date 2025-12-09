// Slack Integration Service
// Handles Slack app integration, notifications, and slash commands
const { WebClient } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');
const WebhookService = require('./webhookService');
const DatabaseService = require('./databaseService');

class SlackService {
    constructor() {
        this.clients = new Map(); // Store Slack clients by organization
        this.eventAdapters = new Map(); // Store event adapters by organization
    }

    /**
     * Configure Slack integration for an organization
     */
    async configureSlackIntegration(userId, organizationId, config) {
        try {
            // Validate required Slack configuration
            if (!config.bot_token) {
                throw new Error('Slack bot token is required');
            }

            // Create Slack Web API client
            const slack = new WebClient(config.bot_token);

            // Test the connection
            const authTest = await slack.auth.test();
            if (!authTest.ok) {
                throw new Error('Invalid Slack bot token');
            }

            console.log('✅ Slack auth test successful:', authTest.team, authTest.user);

            // Store integration configuration
            const integrationConfig = {
                user_id: userId,
                organization: organizationId,
                integration_type: 'slack',
                config: {
                    bot_token: config.bot_token,
                    signing_secret: config.signing_secret,
                    team_id: authTest.team_id,
                    team_name: authTest.team,
                    bot_user_id: authTest.user_id,
                    channels: config.channels || [],
                    notifications: config.notifications || {
                        cost_alerts: true,
                        anomaly_detection: true,
                        budget_threshold: true,
                        daily_summary: false,
                        weekly_summary: true
                    }
                },
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Check if integration already exists
            const existingConfig = await DatabaseService.query(`
                SELECT id FROM integration_configs 
                WHERE user_id = $1 AND organization = $2 AND integration_type = 'slack'
            `, [userId, organizationId]);

            let result;
            if (existingConfig.rows.length > 0) {
                // Update existing configuration
                result = await DatabaseService.query(`
                    UPDATE integration_configs 
                    SET config = $3, is_active = $4, updated_at = $5
                    WHERE id = $1 AND user_id = $2
                    RETURNING *;
                `, [
                    existingConfig.rows[0].id,
                    userId,
                    JSON.stringify(integrationConfig.config),
                    integrationConfig.is_active,
                    integrationConfig.updated_at
                ]);
            } else {
                // Create new configuration
                result = await DatabaseService.query(`
                    INSERT INTO integration_configs (user_id, organization, integration_type, config, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *;
                `, [
                    integrationConfig.user_id,
                    integrationConfig.organization,
                    integrationConfig.integration_type,
                    JSON.stringify(integrationConfig.config),
                    integrationConfig.is_active,
                    integrationConfig.created_at,
                    integrationConfig.updated_at
                ]);
            }

            // Store the Slack client for this organization
            this.clients.set(organizationId, slack);

            console.log('✅ Slack integration configured for organization:', organizationId);
            return {
                success: true,
                message: 'Slack integration configured successfully',
                config: {
                    ...result.rows[0],
                    config: { ...integrationConfig.config, bot_token: '[REDACTED]' }
                }
            };
        } catch (error) {
            console.error('❌ Error configuring Slack integration:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get Slack client for organization
     */
    async getSlackClient(organizationId) {
        if (this.clients.has(organizationId)) {
            return this.clients.get(organizationId);
        }

        // Load configuration from database
        try {
            const result = await DatabaseService.query(`
                SELECT config FROM integration_configs 
                WHERE organization = $1 AND integration_type = 'slack' AND is_active = true
                ORDER BY updated_at DESC LIMIT 1
            `, [organizationId]);

            if (result.rows.length === 0) {
                throw new Error('No active Slack integration found for organization');
            }

            const config = result.rows[0].config;
            const slack = new WebClient(config.bot_token);
            this.clients.set(organizationId, slack);

            return slack;
        } catch (error) {
            console.error('❌ Error getting Slack client:', error);
            throw error;
        }
    }

    /**
     * Send cost alert to Slack
     */
    async sendCostAlert(organizationId, alertData) {
        try {
            const slack = await this.getSlackClient(organizationId);
            const config = await this.getSlackConfig(organizationId);

            if (!config.notifications.cost_alerts) {
                console.log('📭 Cost alerts disabled for organization:', organizationId);
                return { success: true, message: 'Cost alerts disabled' };
            }

            // Format alert message
            const blocks = [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🚨 Cost Alert Triggered'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Service:* ${alertData.service_name}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Current Cost:* $${alertData.current_cost.toFixed(2)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Threshold:* $${alertData.threshold.toFixed(2)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Overage:* $${(alertData.current_cost - alertData.threshold).toFixed(2)}`
                        }
                    ]
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `Alert triggered at ${new Date().toLocaleString()}`
                        }
                    ]
                }
            ];

            // Send to configured channels
            const results = await Promise.allSettled(
                config.channels.map(channel =>
                    slack.chat.postMessage({
                        channel: channel,
                        text: `Cost alert: ${alertData.service_name} exceeded threshold`,
                        blocks: blocks,
                        username: 'AWS Cost Tracker Pro',
                        icon_emoji: ':money_with_wings:'
                    })
                )
            );

            console.log('✅ Cost alert sent to Slack channels:', config.channels.length);
            return {
                success: true,
                message: `Alert sent to ${config.channels.length} Slack channels`,
                results: results
            };
        } catch (error) {
            console.error('❌ Error sending Slack cost alert:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send anomaly detection alert to Slack
     */
    async sendAnomalyAlert(organizationId, anomalyData) {
        try {
            const slack = await this.getSlackClient(organizationId);
            const config = await this.getSlackConfig(organizationId);

            if (!config.notifications.anomaly_detection) {
                console.log('📭 Anomaly alerts disabled for organization:', organizationId);
                return { success: true, message: 'Anomaly alerts disabled' };
            }

            const severityEmoji = {
                high: '🔴',
                medium: '🟡',
                low: '🟢'
            };

            const blocks = [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${severityEmoji[anomalyData.severity]} Cost Anomaly Detected`
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Service:* ${anomalyData.service_name}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Severity:* ${anomalyData.severity.toUpperCase()}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Current Cost:* $${anomalyData.cost_amount.toFixed(2)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Expected:* $${anomalyData.mean.toFixed(2)} ± $${anomalyData.stdDev.toFixed(2)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Deviation:* ${anomalyData.zScore.toFixed(2)}σ`
                        }
                    ]
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `Detected at ${new Date(anomalyData.detectedAt).toLocaleString()}`
                        }
                    ]
                }
            ];

            const results = await Promise.allSettled(
                config.channels.map(channel =>
                    slack.chat.postMessage({
                        channel: channel,
                        text: `Cost anomaly detected: ${anomalyData.service_name}`,
                        blocks: blocks,
                        username: 'AWS Cost Tracker Pro',
                        icon_emoji: ':warning:'
                    })
                )
            );

            console.log('✅ Anomaly alert sent to Slack channels:', config.channels.length);
            return {
                success: true,
                message: `Anomaly alert sent to ${config.channels.length} Slack channels`,
                results: results
            };
        } catch (error) {
            console.error('❌ Error sending Slack anomaly alert:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send daily/weekly cost summary to Slack
     */
    async sendCostSummary(organizationId, summaryData, type = 'daily') {
        try {
            const slack = await this.getSlackClient(organizationId);
            const config = await this.getSlackConfig(organizationId);

            const notificationKey = `${type}_summary`;
            if (!config.notifications[notificationKey]) {
                console.log(`📭 ${type} summary disabled for organization:`, organizationId);
                return { success: true, message: `${type} summary disabled` };
            }

            const titleEmoji = type === 'daily' ? '📅' : '📊';
            const blocks = [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${titleEmoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Cost Summary`
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Total Cost:* $${summaryData.totalCost.toFixed(2)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Previous Period:* $${summaryData.previousCost.toFixed(2)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Change:* ${summaryData.change > 0 ? '📈' : '📉'} ${Math.abs(summaryData.change).toFixed(1)}%`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Top Service:* ${summaryData.topService.name} ($${summaryData.topService.cost.toFixed(2)})`
                        }
                    ]
                }
            ];

            // Add top services section
            if (summaryData.services && summaryData.services.length > 0) {
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*Top Services:*\n' + summaryData.services
                            .slice(0, 5)
                            .map(service => `• ${service.name}: $${service.cost.toFixed(2)}`)
                            .join('\n')
                    }
                });
            }

            const results = await Promise.allSettled(
                config.channels.map(channel =>
                    slack.chat.postMessage({
                        channel: channel,
                        text: `${type} cost summary`,
                        blocks: blocks,
                        username: 'AWS Cost Tracker Pro',
                        icon_emoji: ':chart_with_upwards_trend:'
                    })
                )
            );

            console.log(`✅ ${type} summary sent to Slack channels:`, config.channels.length);
            return {
                success: true,
                message: `${type} summary sent to ${config.channels.length} Slack channels`,
                results: results
            };
        } catch (error) {
            console.error(`❌ Error sending Slack ${type} summary:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle Slack slash commands
     */
    async handleSlashCommand(payload) {
        try {
            const { command, text, user_id, team_id, channel_id } = payload;

            // Basic cost query command
            if (command === '/aws-cost') {
                const organizationId = team_id; // Use team_id as organization identifier
                
                if (!text || text.trim() === '') {
                    return {
                        response_type: 'ephemeral',
                        text: 'Usage: `/aws-cost [service_name]` or `/aws-cost summary`'
                    };
                }

                const query = text.trim().toLowerCase();
                
                if (query === 'summary') {
                    // Get cost summary
                    const summary = await this.getCostSummary(organizationId);
                    return {
                        response_type: 'in_channel',
                        text: `💰 Current AWS costs: $${summary.totalCost.toFixed(2)} | Top service: ${summary.topService.name} ($${summary.topService.cost.toFixed(2)})`
                    };
                } else {
                    // Get specific service cost
                    const serviceCost = await this.getServiceCost(organizationId, query);
                    return {
                        response_type: 'ephemeral',
                        text: serviceCost ? 
                            `💰 ${serviceCost.serviceName}: $${serviceCost.cost.toFixed(2)} (current period)` :
                            `❓ No cost data found for service: ${query}`
                    };
                }
            }

            return {
                response_type: 'ephemeral',
                text: 'Unknown command'
            };
        } catch (error) {
            console.error('❌ Error handling Slack slash command:', error);
            return {
                response_type: 'ephemeral',
                text: 'Sorry, there was an error processing your command.'
            };
        }
    }

    /**
     * Get Slack configuration for organization
     */
    async getSlackConfig(organizationId) {
        try {
            const result = await DatabaseService.query(`
                SELECT config FROM integration_configs 
                WHERE organization = $1 AND integration_type = 'slack' AND is_active = true
                ORDER BY updated_at DESC LIMIT 1
            `, [organizationId]);

            if (result.rows.length === 0) {
                throw new Error('No Slack configuration found');
            }

            return result.rows[0].config;
        } catch (error) {
            console.error('❌ Error getting Slack config:', error);
            throw error;
        }
    }

    /**
     * Get cost summary for Slack commands
     */
    async getCostSummary(organizationId) {
        // This would integrate with your existing cost data
        // For now, return mock data
        return {
            totalCost: 1234.56,
            topService: {
                name: 'Amazon EC2',
                cost: 567.89
            }
        };
    }

    /**
     * Get specific service cost for Slack commands
     */
    async getServiceCost(organizationId, serviceName) {
        // This would integrate with your existing cost data
        // For now, return mock data
        if (serviceName.includes('ec2') || serviceName.includes('compute')) {
            return {
                serviceName: 'Amazon EC2',
                cost: 567.89
            };
        }
        return null;
    }

    /**
     * Test Slack integration
     */
    async testSlackIntegration(organizationId) {
        try {
            const slack = await this.getSlackClient(organizationId);
            const config = await this.getSlackConfig(organizationId);

            const testMessage = {
                text: '✅ AWS Cost Tracker Pro integration test successful!',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '✅ *AWS Cost Tracker Pro Integration Test*\n\nYour Slack integration is working correctly!'
                        }
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `Test performed at ${new Date().toLocaleString()}`
                            }
                        ]
                    }
                ]
            };

            if (config.channels.length === 0) {
                return {
                    success: false,
                    error: 'No Slack channels configured'
                };
            }

            const results = await Promise.allSettled(
                config.channels.map(channel =>
                    slack.chat.postMessage({
                        channel: channel,
                        ...testMessage
                    })
                )
            );

            return {
                success: true,
                message: `Test message sent to ${config.channels.length} channels`,
                results: results
            };
        } catch (error) {
            console.error('❌ Error testing Slack integration:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new SlackService();
