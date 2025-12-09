// /Users/rahulindi/aws-cost-tracker/backend/src/routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const BudgetService = require('../services/budgetService');
const { authenticateToken } = require('../middleware/authMiddleware');

console.log('🔍 BudgetRoutes: BudgetService loaded:', !!BudgetService);
console.log('🔍 BudgetRoutes: BudgetService methods:', Object.keys(BudgetService || {}));

/**
 * @route   POST /api/budgets
 * @desc    Create a new budget
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 BudgetRoutes: Creating budget for user:', req.user.id);
        const result = await BudgetService.createBudget(req.body, req.user.id);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Budget created successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in create budget route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create budget'
        });
    }
});

/**
 * @route   GET /api/budgets
 * @desc    Get all budgets for user
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 BudgetRoutes: Getting budgets for user:', req.user.id);
        console.log('🔍 BudgetRoutes: BudgetService.getBudgets type:', typeof BudgetService.getBudgets);

        if (typeof BudgetService.getBudgets !== 'function') {
            console.error('❌ BudgetService.getBudgets is not a function');
            return res.status(500).json({
                success: false,
                error: 'Budget service not properly initialized'
            });
        }

        const result = await BudgetService.getBudgets(req.user.id);

        if (result.success) {
            // Enrich budgets with actual spending data
            const enrichedBudgets = [];
            for (const budget of result.data) {
                const spendingResult = await BudgetService.getActualSpending(budget);
                if (spendingResult.success) {
                    enrichedBudgets.push({
                        ...budget,
                        actual_spending: spendingResult.data
                    });
                } else {
                    enrichedBudgets.push({
                        ...budget,
                        actual_spending: { totalSpent: 0, percentage: 0 }
                    });
                }
            }

            res.json({
                success: true,
                data: enrichedBudgets
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in get budgets route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budgets'
        });
    }
});

/**
 * @route   GET /api/budgets/:id
 * @desc    Get specific budget
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const budgetId = parseInt(req.params.id);
        if (isNaN(budgetId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid budget ID'
            });
        }

        const result = await BudgetService.getBudget(budgetId, req.user.id);

        if (result.success) {
            // Enrich with actual spending data
            const spendingResult = await BudgetService.getActualSpending(result.data);
            if (spendingResult.success) {
                result.data.actual_spending = spendingResult.data;
            }

            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in get budget route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budget'
        });
    }
});

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update budget
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const budgetId = parseInt(req.params.id);
        if (isNaN(budgetId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid budget ID'
            });
        }

        const result = await BudgetService.updateBudget(budgetId, req.body, req.user.id);

        if (result.success) {
            res.json({
                success: true,
                message: 'Budget updated successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in update budget route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update budget'
        });
    }
});

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete budget
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const budgetId = parseInt(req.params.id);
        if (isNaN(budgetId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid budget ID'
            });
        }

        const result = await BudgetService.deleteBudget(budgetId, req.user.id);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in delete budget route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete budget'
        });
    }
});

/**
 * @route   GET /api/budgets/alerts
 * @desc    Get budget alerts for user
 * @access  Private
 */
router.get('/alerts', authenticateToken, async (req, res) => {
    try {
        const result = await BudgetService.getBudgetAlerts(req.user.id);

        if (result.success) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in get budget alerts route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budget alerts'
        });
    }
});

/**
 * @route   POST /api/budgets/:id/check
 * @desc    Manually check budget thresholds
 * @access  Private
 */
router.post('/:id/check', authenticateToken, async (req, res) => {
    try {
        const budgetId = parseInt(req.params.id);
        if (isNaN(budgetId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid budget ID'
            });
        }

        // Get the budget first
        const budgetResult = await BudgetService.getBudget(budgetId, req.user.id);
        if (!budgetResult.success) {
            return res.status(404).json({
                success: false,
                error: budgetResult.error
            });
        }

        // Check thresholds
        const checkResult = await BudgetService.checkBudgetThresholds(budgetResult.data);

        if (checkResult.success) {
            res.json({
                success: true,
                message: checkResult.alertCreated
                    ? 'Budget threshold exceeded, alert created'
                    : 'Budget check completed, no alerts needed',
                data: checkResult.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: checkResult.error
            });
        }
    } catch (error) {
        console.error('Error in check budget route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check budget'
        });
    }
});

module.exports = router;