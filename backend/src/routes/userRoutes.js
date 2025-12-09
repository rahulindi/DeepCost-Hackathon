const express = require('express');
const AuthService = require('../services/authService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Email verification
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const result = await AuthService.verifyEmail(token);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Email verification failed' });
    }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }

        const result = await AuthService.requestPasswordReset(email);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Password reset request failed' });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                error: 'Token and new password required'
            });
        }

        const result = await AuthService.resetPassword(token, password);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Password reset failed' });
    }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profile: user.profile || {}
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const profileData = req.body;

        const result = await AuthService.updateProfile(userId, profileData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Profile update failed' });
    }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password required'
            });
        }

        const result = await AuthService.changePassword(userId, currentPassword, newPassword);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Password change failed' });
    }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await AuthService.getUserSessions(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get sessions' });
    }
});

// Terminate session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await AuthService.terminateSession(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to terminate session' });
    }
});

module.exports = router;