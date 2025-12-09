const express = require('express');
const AuthService = require('../services/authService');
const RateLimitMiddleware = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = RateLimitMiddleware.createRateLimit(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

router.post('/register', authRateLimit, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // ✅ Email and password are required, username is optional (will use email if not provided)
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password required'
            });
        }

        // Use email as username if username not provided
        const finalUsername = username || email.split('@')[0];

        const result = await AuthService.register(finalUsername, email, password);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/login', authRateLimit, async (req, res) => {
    try {
        // ✅ Accept either 'email' or 'username' field
        const { username, email, password } = req.body;
        const loginIdentifier = email || username;

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email/username and password required'
            });
        }

        const result = await AuthService.login(loginIdentifier, password);

        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        const result = await AuthService.refreshAccessToken(refreshToken);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await AuthService.logout(refreshToken);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Logout failed' });
    }
});

router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const result = await AuthService.verifyToken(token);
        res.json(result);
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

module.exports = router;