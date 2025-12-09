const DatabaseService = require('./databaseService');
const NotificationService = require('./notificationService');

class AlertService {
    static async createAlert(alertName, thresholdAmount, serviceName, alertType) {
        const query = `
            INSERT INTO cost_alerts (alert_name, threshold_amount, service_name, alert_type) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id
        `;
        const result = await DatabaseService.pool.query(query, [alertName, thresholdAmount, serviceName, alertType]);
        return result.rows[0].id;
    }

    static async checkThresholds(currentCosts) {
        const alerts = await DatabaseService.pool.query('SELECT * FROM cost_alerts WHERE is_active = true');

        for (const alert of alerts.rows) {
            const serviceCost = currentCosts.find(c => c.service === alert.service_name)?.cost || 0;

            if (serviceCost > alert.threshold_amount) {
                await this.triggerAlert(alert.id, serviceCost, alert);
            }
        }
    }

    static async triggerAlert(alertId, amount, alertData) {
        const query = `
            INSERT INTO alert_notifications (alert_id, triggered_amount) 
            VALUES ($1, $2)
        `;
        await DatabaseService.pool.query(query, [alertId, amount]);

        console.log(`🚨 ALERT TRIGGERED: $${amount}`);

        // Send email notification
        if (process.env.NOTIFICATION_EMAIL) {
            try {
                await NotificationService.sendCostAlert(process.env.NOTIFICATION_EMAIL, {
                    serviceName: alertData.service_name,
                    amount: amount,
                    threshold: alertData.threshold_amount
                });
                console.log('📧 Email notification sent');
            } catch (error) {
                console.error('❌ Email failed:', error.message);
            }
        }
    }
}

module.exports = AlertService;