// /Users/rahulindi/aws-cost-tracker/backend/src/services/notificationService.js
const nodemailer = require('nodemailer');

class NotificationService {
    static async sendCostAlert(email, alertData) {
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `🚨 AWS Cost Alert: ${alertData.serviceName}`,
            html: `
                <h2>Cost Alert Triggered</h2>
                <p><strong>Service:</strong> ${alertData.serviceName}</p>
                <p><strong>Current Cost:</strong> $${alertData.amount}</p>
                <p><strong>Threshold:</strong> $${alertData.threshold}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p>Consider optimizing your AWS usage to reduce costs.</p>
            `
        };

        return await transporter.sendMail(mailOptions);
    }

    static async sendDailySummary(email, summaryData) {
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '📊 Daily AWS Cost Summary',
            html: `
                <h2>Your Daily AWS Cost Report</h2>
                <p><strong>Total Cost Today:</strong> $${summaryData.totalCost}</p>
                <p><strong>Top Service:</strong> ${summaryData.topService}</p>
                <p><strong>Forecast:</strong> $${summaryData.forecast}</p>
            `
        };

        return await transporter.sendMail(mailOptions);
    }
}

module.exports = NotificationService;