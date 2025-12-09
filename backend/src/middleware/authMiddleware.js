// /Users/rahulindi/aws-cost-tracker/backend/src/middleware/authMiddleware.js
const AuthService = require('../services/authService');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const result = await AuthService.verifyToken(token);
        if (result.success) {
            req.user = result.user; // Extract the user object from the result
            next();
        } else {
            if (result.code === 'TOKEN_EXPIRED') {
                return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(403).json({ error: result.error || 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticateToken };