// /Users/rahulindi/aws-cost-tracker/backend/src/services/multiAccountService.js
class MultiAccountService {
    static async getAccountCosts(accountIds, userId = null) {
        const results = [];

        for (const accountId of accountIds) {
            try {
                // 🔒 SECURITY: Fetch account-specific costs with user context
                const accountCosts = await this.fetchAccountSpecificCosts(accountId, userId);
                results.push({
                    accountId,
                    accountName: `Account-${accountId}`,
                    totalCost: accountCosts.total,
                    services: accountCosts.services,
                    status: 'success'
                });
            } catch (error) {
                results.push({
                    accountId,
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        return results;
    }

    static async fetchAccountSpecificCosts(accountId, userId = null) {
        // 🔒 SECURITY: In production, verify user has access to this account
        // For now, mock multi-account data
        // TODO: Query cost_records filtered by user_id and account_id
        console.log(`🔒 Fetching costs for account ${accountId}${userId ? ' for user ' + userId : ''}`);
        
        return {
            total: Math.random() * 1000,
            services: [
                { name: 'EC2', cost: Math.random() * 500 },
                { name: 'S3', cost: Math.random() * 200 },
                { name: 'RDS', cost: Math.random() * 300 }
            ]
        };
    }

    static async getAccountComparison(accounts) {
        const comparison = accounts.map(account => ({
            accountId: account.accountId,
            costEfficiency: this.calculateEfficiency(account),
            recommendations: this.generateAccountRecommendations(account)
        }));

        return comparison;
    }

    static calculateEfficiency(account) {
        return Math.random() * 100; // Mock efficiency score
    }

    static generateAccountRecommendations(account) {
        return [
            'Consider Reserved Instances',
            'Optimize S3 storage classes',
            'Review unused resources'
        ];
    }
}

module.exports = MultiAccountService;