// /Users/rahulindi/aws-cost-tracker/backend/src/services/budgetService.js
const DatabaseService = require('./databaseService');

class BudgetService {
    /**
     * Create a new budget
     * @param {Object} budgetData - Budget information
     * @param {number} userId - User ID
     * @returns {Object} Created budget
     */
    static async createBudget(budgetData, userId) {
        try {
            console.log('🔍 Creating budget for user:', userId);
            console.log('🔍 Budget data:', budgetData);

            const result = await DatabaseService.createBudget(budgetData, userId);
            console.log('🔍 Database createBudget result:', result);

            if (!result) {
                return {
                    success: false,
                    error: 'Failed to create budget'
                };
            }

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Error creating budget:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all budgets for a user
     * @param {number} userId - User ID
     * @returns {Array} List of budgets
     */
    static async getBudgets(userId) {
        try {
            console.log('🔍 Getting budgets for user:', userId);
            // Check if DatabaseService has the required method
            if (!DatabaseService || typeof DatabaseService.getBudgets !== 'function') {
                console.error('❌ DatabaseService.getBudgets is not a function');
                return {
                    success: false,
                    error: 'Database service not properly initialized'
                };
            }

            const result = await DatabaseService.getBudgets(userId);
            console.log('✅ Got budgets result:', result);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Error fetching budgets:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get a specific budget by ID
     * @param {number} budgetId - Budget ID
     * @param {number} userId - User ID
     * @returns {Object} Budget data
     */
    static async getBudget(budgetId, userId) {
        try {
            const result = await DatabaseService.getBudget(budgetId, userId);

            if (!result) {
                return {
                    success: false,
                    error: 'Budget not found'
                };
            }

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Error fetching budget:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update a budget
     * @param {number} budgetId - Budget ID
     * @param {Object} budgetData - Updated budget data
     * @param {number} userId - User ID
     * @returns {Object} Updated budget
     */
    static async updateBudget(budgetId, budgetData, userId) {
        try {
            const result = await DatabaseService.updateBudget(budgetId, budgetData, userId);

            if (!result) {
                return {
                    success: false,
                    error: 'Budget not found or unauthorized'
                };
            }

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Error updating budget:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete a budget
     * @param {number} budgetId - Budget ID
     * @param {number} userId - User ID
     * @returns {Object} Deletion result
     */
    static async deleteBudget(budgetId, userId) {
        try {
            const result = await DatabaseService.deleteBudget(budgetId, userId);

            if (!result) {
                return {
                    success: false,
                    error: 'Budget not found or unauthorized'
                };
            }

            return {
                success: true,
                message: 'Budget deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting budget:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get actual spending for a budget period
     * @param {Object} budget - Budget object
     * @returns {Object} Actual spending data
     */
    static async getActualSpending(budget) {
        try {
            // 🔒 SECURITY: Always include userId to prevent data leaks
            const filters = {
                startDate: budget.start_date,
                endDate: budget.end_date,
                userId: budget.user_id  // Critical: filter by user
            };

            // Add filters based on budget scope
            if (budget.service_name) {
                filters.serviceName = budget.service_name;
            }

            if (budget.region) {
                filters.region = budget.region;
            }

            if (budget.cost_center) {
                filters.costCenter = budget.cost_center;
            }

            if (budget.department) {
                filters.department = budget.department;
            }

            if (budget.project) {
                filters.project = budget.project;
            }

            const costRecords = await DatabaseService.getCostRecords(filters);
            const totalSpent = costRecords.reduce((sum, record) => sum + (record.cost_amount || 0), 0);

            return {
                success: true,
                data: {
                    totalSpent: totalSpent,
                    percentage: budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0
                }
            };
        } catch (error) {
            console.error('Error calculating actual spending:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check budget thresholds and create alerts if needed
     * @param {Object} budget - Budget object
     * @returns {Object} Alert creation result
     */
    static async checkBudgetThresholds(budget) {
        try {
            // Get actual spending
            const spendingResult = await this.getActualSpending(budget);
            if (!spendingResult.success) {
                return spendingResult;
            }

            const { totalSpent, percentage } = spendingResult.data;

            // Check if we've exceeded notification threshold
            if (percentage >= budget.notification_threshold && budget.notifications_enabled) {
                // Check if alert already exists
                const existingAlerts = await DatabaseService.getBudgetAlerts(budget.user_id);
                const thresholdAlertExists = existingAlerts.some(alert =>
                    alert.budget_id === budget.id &&
                    alert.percentage >= budget.notification_threshold &&
                    alert.alert_type === 'threshold_exceeded'
                );

                // Only create alert if it doesn't already exist
                if (!thresholdAlertExists) {
                    const alertData = {
                        budgetId: budget.id,
                        actualAmount: totalSpent,
                        thresholdAmount: (budget.amount * budget.notification_threshold / 100),
                        percentage: percentage,
                        alertType: 'threshold_exceeded'
                    };

                    const alertResult = await DatabaseService.createBudgetAlert(alertData);

                    if (alertResult) {
                        return {
                            success: true,
                            alertCreated: true,
                            data: {
                                budgetId: budget.id,
                                totalSpent: totalSpent,
                                percentage: percentage,
                                threshold: budget.notification_threshold
                            }
                        };
                    }
                }
            }

            return {
                success: true,
                alertCreated: false
            };
        } catch (error) {
            console.error('Error checking budget thresholds:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get budget alerts for a user
     * @param {number} userId - User ID
     * @returns {Array} List of budget alerts
     */
    static async getBudgetAlerts(userId) {
        try {
            const result = await DatabaseService.getBudgetAlerts(userId);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Error fetching budget alerts:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Mark budget alert as notified
     * @param {number} alertId - Alert ID
     * @returns {Object} Update result
     */
    static async markAlertAsNotified(alertId) {
        try {
            const result = await DatabaseService.markBudgetAlertAsNotified(alertId);

            if (!result) {
                return {
                    success: false,
                    error: 'Failed to mark alert as notified'
                };
            }

            return {
                success: true
            };
        } catch (error) {
            console.error('Error marking alert as notified:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BudgetService;