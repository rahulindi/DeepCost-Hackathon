// Enterprise Webhook Service
// Handles webhook configurations and deliveries for integrations
const crypto = require('crypto');
const axios = require('axios');
const DatabaseService = require('./databaseService');
const { v4: uuidv4 } = require('uuid');

class WebhookService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Create a new webhook configuration
     */
    async createWebhookConfig(userId, config) {
        try {
            // Validate required fields
            if (!config.webhook_url || !config.events || config.events.length === 0) {
                throw new Error('webhook_url and events are required');
            }

            // Validate webhook URL format
            try {
                new URL(config.webhook_url);
            } catch (error) {
                throw new Error('Invalid webhook URL format');
            }

            // Generate secret key for webhook security
            const secretKey = crypto.randomBytes(32).toString('hex');

            const webhookConfig = {
                user_id: userId,
                organization: config.organization || null,
                webhook_url: config.webhook_url,
                secret_key: secretKey,
                events: config.events,
                is_active: config.is_active !== undefined ? config.is_active : true,
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await DatabaseService.query(`
                INSERT INTO webhook_configs (user_id, organization, webhook_url, secret_key, events, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
            `, [
                webhookConfig.user_id,
                webhookConfig.organization,
                webhookConfig.webhook_url,
                webhookConfig.secret_key,
                webhookConfig.events,
                webhookConfig.is_active,
                webhookConfig.created_at,
                webhookConfig.updated_at
            ]);

            // Don't return the secret key in the response
            const responseConfig = { ...result.rows[0] };
            delete responseConfig.secret_key;

            console.log('✅ Webhook configuration created:', config.webhook_url);
            return {
                success: true,
                config: responseConfig,
                secret_key: secretKey // Return separately for initial setup
            };
        } catch (error) {
            console.error('❌ Error creating webhook config:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get webhook configurations for a user
     */
    async getWebhookConfigs(userId, organizationId = null) {
        try {
            let query = `
                SELECT id, user_id, organization, webhook_url, events, is_active, created_at, updated_at
                FROM webhook_configs 
                WHERE user_id = $1
            `;
            const params = [userId];

            if (organizationId) {
                query += ' AND organization = $2';
                params.push(organizationId);
            }

            query += ' ORDER BY created_at DESC';

            const result = await DatabaseService.query(query, params);
            
            return {
                success: true,
                configs: result.rows
            };
        } catch (error) {
            console.error('❌ Error getting webhook configs:', error);
            return {
                success: false,
                error: error.message,
                configs: []
            };
        }
    }

    /**
     * Update webhook configuration
     */
    async updateWebhookConfig(configId, userId, updates) {
        try {
            const setClause = Object.keys(updates)
                .map((key, index) => `${key} = $${index + 3}`)
                .join(', ');

            const query = `
                UPDATE webhook_configs 
                SET ${setClause}, updated_at = NOW() 
                WHERE id = $1 AND user_id = $2
                RETURNING id, user_id, organization, webhook_url, events, is_active, created_at, updated_at;
            `;
            
            const values = [configId, userId, ...Object.values(updates)];
            const result = await DatabaseService.query(query, values);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Webhook configuration not found or access denied'
                };
            }

            console.log('✅ Webhook configuration updated:', configId);
            return {
                success: true,
                config: result.rows[0]
            };
        } catch (error) {
            console.error('❌ Error updating webhook config:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete webhook configuration
     */
    async deleteWebhookConfig(configId, userId) {
        try {
            const result = await DatabaseService.query(`
                DELETE FROM webhook_configs 
                WHERE id = $1 AND user_id = $2
                RETURNING id;
            `, [configId, userId]);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Webhook configuration not found or access denied'
                };
            }

            console.log('✅ Webhook configuration deleted:', configId);
            return {
                success: true,
                message: 'Webhook configuration deleted successfully'
            };
        } catch (error) {
            console.error('❌ Error deleting webhook config:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send webhook notification
     */
    async sendWebhook(eventType, payload, options = {}) {
        try {
            // Get all active webhook configs for this event type
            const query = `
                SELECT * FROM webhook_configs 
                WHERE is_active = true 
                AND $1 = ANY(events)
                ${options.organizationId ? 'AND organization = $2' : ''}
            `;
            
            const params = [eventType];
            if (options.organizationId) {
                params.push(options.organizationId);
            }

            const result = await DatabaseService.query(query, params);
            const webhookConfigs = result.rows;

            if (webhookConfigs.length === 0) {
                console.log('📭 No webhook configurations found for event:', eventType);
                return {
                    success: true,
                    message: 'No webhook configurations to notify',
                    deliveries: []
                };
            }

            console.log(`📨 Sending webhook for event ${eventType} to ${webhookConfigs.length} endpoints`);

            // Send webhooks to all configured endpoints
            const deliveries = await Promise.allSettled(
                webhookConfigs.map(config => this.deliverWebhook(config, eventType, payload))
            );

            const results = deliveries.map((delivery, index) => ({
                webhook_config_id: webhookConfigs[index].id,
                webhook_url: webhookConfigs[index].webhook_url,
                status: delivery.status,
                result: delivery.value || delivery.reason
            }));

            return {
                success: true,
                message: `Webhook delivered to ${webhookConfigs.length} endpoints`,
                deliveries: results
            };
        } catch (error) {
            console.error('❌ Error sending webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deliver webhook to a specific endpoint with retries
     */
    async deliverWebhook(webhookConfig, eventType, payload, retryCount = 0) {
        const deliveryId = uuidv4();
        const timestamp = new Date();
        
        // Create webhook payload with metadata
        const webhookPayload = {
            id: deliveryId,
            event: eventType,
            timestamp: timestamp.toISOString(),
            data: payload,
            organization: webhookConfig.organization
        };

        // Generate signature for security
        const signature = this.generateSignature(webhookPayload, webhookConfig.secret_key);

        try {
            console.log(`🔄 Delivering webhook (attempt ${retryCount + 1}):`, webhookConfig.webhook_url);

            const response = await axios.post(webhookConfig.webhook_url, webhookPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': `sha256=${signature}`,
                    'X-Webhook-Event': eventType,
                    'X-Webhook-Delivery': deliveryId,
                    'User-Agent': 'AWS-Cost-Tracker-Pro-Webhook/1.0'
                },
                timeout: this.timeout,
                validateStatus: (status) => status >= 200 && status < 300
            });

            // Log successful delivery
            await this.logDelivery(webhookConfig.id, eventType, webhookPayload, response.status, response.data, timestamp);

            console.log('✅ Webhook delivered successfully:', webhookConfig.webhook_url, 'Status:', response.status);
            return {
                success: true,
                status: response.status,
                response: response.data,
                delivery_id: deliveryId
            };

        } catch (error) {
            console.error(`❌ Webhook delivery failed (attempt ${retryCount + 1}):`, error.message);

            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`🔄 Retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
                return this.deliverWebhook(webhookConfig, eventType, payload, retryCount + 1);
            }

            // Log failed delivery
            await this.logDelivery(
                webhookConfig.id, 
                eventType, 
                webhookPayload, 
                error.response?.status || 0,
                error.message,
                timestamp,
                this.maxRetries
            );

            throw new Error(`Webhook delivery failed after ${this.maxRetries + 1} attempts: ${error.message}`);
        }
    }

    /**
     * Generate HMAC signature for webhook security
     */
    generateSignature(payload, secretKey) {
        const payloadString = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', secretKey)
            .update(payloadString)
            .digest('hex');
    }

    /**
     * Verify webhook signature
     */
    verifySignature(payload, signature, secretKey) {
        const expectedSignature = this.generateSignature(payload, secretKey);
        return crypto.timingSafeEqual(
            Buffer.from(`sha256=${expectedSignature}`),
            Buffer.from(signature)
        );
    }

    /**
     * Log webhook delivery attempt
     */
    async logDelivery(webhookConfigId, eventType, payload, responseStatus, responseBody, deliveredAt, retryCount = 0) {
        try {
            await DatabaseService.query(`
                INSERT INTO webhook_deliveries 
                (webhook_config_id, event_type, payload, response_status, response_body, delivered_at, created_at, retry_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `, [
                webhookConfigId,
                eventType,
                JSON.stringify(payload),
                responseStatus,
                typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
                deliveredAt,
                new Date(),
                retryCount
            ]);
        } catch (error) {
            console.error('❌ Error logging webhook delivery:', error);
        }
    }

    /**
     * Get webhook delivery history
     */
    async getDeliveryHistory(webhookConfigId, userId, limit = 50) {
        try {
            const result = await DatabaseService.query(`
                SELECT wd.* 
                FROM webhook_deliveries wd
                JOIN webhook_configs wc ON wd.webhook_config_id = wc.id
                WHERE wc.id = $1 AND wc.user_id = $2
                ORDER BY wd.created_at DESC
                LIMIT $3;
            `, [webhookConfigId, userId, limit]);

            return {
                success: true,
                deliveries: result.rows
            };
        } catch (error) {
            console.error('❌ Error getting delivery history:', error);
            return {
                success: false,
                error: error.message,
                deliveries: []
            };
        }
    }

    /**
     * Test webhook endpoint
     */
    async testWebhook(webhookUrl, secretKey = null) {
        try {
            const testPayload = {
                id: uuidv4(),
                event: 'webhook.test',
                timestamp: new Date().toISOString(),
                data: {
                    message: 'This is a test webhook from AWS Cost Tracker Pro',
                    test: true
                }
            };

            const headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Event': 'webhook.test',
                'X-Webhook-Delivery': testPayload.id,
                'User-Agent': 'AWS-Cost-Tracker-Pro-Webhook/1.0'
            };

            if (secretKey) {
                const signature = this.generateSignature(testPayload, secretKey);
                headers['X-Webhook-Signature'] = `sha256=${signature}`;
            }

            const response = await axios.post(webhookUrl, testPayload, {
                headers,
                timeout: this.timeout,
                validateStatus: (status) => status >= 200 && status < 500
            });

            return {
                success: response.status >= 200 && response.status < 300,
                status: response.status,
                response: response.data,
                message: response.status >= 200 && response.status < 300 
                    ? 'Webhook test successful' 
                    : 'Webhook test failed'
            };
        } catch (error) {
            console.error('❌ Webhook test error:', error);
            return {
                success: false,
                error: error.message,
                status: error.response?.status || 0
            };
        }
    }
}

module.exports = new WebhookService();
