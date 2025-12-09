// Enterprise Authentication Routes with SAML/SSO
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const SamlService = require('../services/samlService');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// SAML SSO login initiation
router.get('/sso/login', authLimiter, (req, res, next) => {
    const { organization } = req.query;
    
    // Log SSO attempt
    console.log('🔐 SSO login initiated for organization:', organization);
    
    // Store organization in session for callback
    req.session.ssoOrganization = organization;
    
    passport.authenticate('saml', {
        additionalParams: {
            organization: organization
        }
    })(req, res, next);
});

// SAML SSO callback
router.post('/sso/callback', authLimiter, (req, res, next) => {
    passport.authenticate('saml', async (err, user, info) => {
        if (err) {
            console.error('❌ SAML callback error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=saml_error&message=${encodeURIComponent(err.message)}`);
        }
        
        if (!user) {
            console.warn('⚠️ SAML authentication failed:', info);
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed&message=${encodeURIComponent(info?.message || 'Authentication failed')}`);
        }

        try {
            // Generate tokens
            const accessToken = SamlService.generateJwtToken(user);
            const refreshToken = SamlService.generateRefreshToken(user);
            
            // Create session
            const sessionToken = await SamlService.createSession(user, req);
            
            // Log successful authentication
            await SamlService.logAuthEvent(user.id, 'saml_login_success', {
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                organization: user.organization
            });

            console.log('✅ SAML authentication successful for:', user.email);

            // Redirect with tokens
            const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
            redirectUrl.searchParams.set('token', accessToken);
            redirectUrl.searchParams.set('refresh', refreshToken);
            redirectUrl.searchParams.set('session', sessionToken);
            
            res.redirect(redirectUrl.toString());
        } catch (error) {
            console.error('❌ Token generation error:', error);
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_error&message=Failed to generate authentication tokens`);
        }
    })(req, res, next);
});

// SAML metadata endpoint
router.get('/sso/metadata', (req, res) => {
    try {
        const metadata = SamlService.generateMetadata();
        res.type('application/xml');
        res.send(metadata);
    } catch (error) {
        console.error('❌ Metadata generation error:', error);
        res.status(500).json({ error: 'Failed to generate SAML metadata' });
    }
});

// Enhanced login with SSO detection
router.post('/login', authLimiter, async (req, res, next) => {
    const { email, password, organization } = req.body;
    
    try {
        // Check if user should use SSO
        const existingUser = await require('../services/databaseService').getUserByEmail(email);
        
        if (existingUser && existingUser.auth_provider === 'saml') {
            return res.json({
                success: false,
                requiresSSO: true,
                organization: existingUser.organization,
                message: 'This account uses SSO authentication. Please use the SSO login button.'
            });
        }

        // Standard local authentication using AuthService (no passport needed)
        try {
            const AuthService = require('../services/authService');
            const result = await AuthService.login(email, password); // Use email as username
            
            if (!result.success) {
                await SamlService.logAuthEvent(null, 'login_failed', {
                    email: email,
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    reason: result.error || 'Invalid credentials'
                });

                return res.status(401).json({ 
                    success: false, 
                    error: result.error || 'Authentication failed' 
                });
            }

            const user = result.user;

            // Generate tokens
            const accessToken = SamlService.generateJwtToken(user);
            const refreshToken = SamlService.generateRefreshToken(user);
            const sessionToken = await SamlService.createSession(user, req);

            // Log successful login
            await SamlService.logAuthEvent(user.id, 'local_login_success', {
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    organization: user.organization,
                    subscription_tier: user.subscription_tier
                },
                tokens: {
                    access: accessToken,
                    refresh: refreshToken,
                    session: sessionToken
                }
            });
        } catch (authError) {
            console.error('❌ Local auth error:', authError);
            return res.status(500).json({ 
                success: false, 
                error: 'Authentication service error' 
            });
        }

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login service error' 
        });
    }
});

// Standard registration (backup route)
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, username } = req.body;
    
    try {
        const AuthService = require('../services/authService');
        const result = await AuthService.register(username || email, email, password);
        
        if (result.success) {
            // Log successful registration
            await SamlService.logAuthEvent(result.user.id, 'registration_success', {
                email: email,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            
            res.json(result);
        } else {
            await SamlService.logAuthEvent(null, 'registration_failed', {
                email: email,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                reason: result.error
            });
            
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration service error' 
        });
    }
});

// Token refresh with enhanced validation
router.post('/refresh', authLimiter, async (req, res) => {
    const { refreshToken, sessionToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ 
            success: false, 
            error: 'Refresh token required' 
        });
    }

    try {
        // 🔒 SECURITY: Require JWT_REFRESH_SECRET to be set
        if (!process.env.JWT_REFRESH_SECRET) {
            return res.status(500).json({
                success: false,
                error: 'Server configuration error: JWT_REFRESH_SECRET not set'
            });
        }
        
        // Validate refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token type' 
            });
        }

        // Validate session if provided
        if (sessionToken) {
            const sessionValid = await SamlService.validateSession(sessionToken);
            if (!sessionValid) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Session expired' 
                });
            }
        }

        // Get user and generate new tokens
        const user = await require('../services/databaseService').getUserById(decoded.id);
        if (!user || !user.is_active) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not found or inactive' 
            });
        }

        const newAccessToken = SamlService.generateJwtToken(user);
        const newRefreshToken = SamlService.generateRefreshToken(user);

        // Log token refresh
        await SamlService.logAuthEvent(user.id, 'token_refresh', {
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            tokens: {
                access: newAccessToken,
                refresh: newRefreshToken
            }
        });
    } catch (error) {
        console.error('❌ Token refresh error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid refresh token' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Refresh token expired' 
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Token refresh failed' 
        });
    }
});

// Enhanced logout with session management
router.post('/logout', authenticateToken, async (req, res) => {
    const { sessionToken } = req.body;
    
    try {
        // Revoke session if provided
        if (sessionToken) {
            await SamlService.revokeSession(sessionToken);
        }

        // Log logout
        await SamlService.logAuthEvent(req.user.id, 'logout', {
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Logout failed' 
        });
    }
});

// Organization discovery endpoint
router.get('/discover-organization', authLimiter, async (req, res) => {
    const { email } = req.query;
    
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email required' 
        });
    }

    try {
        const user = await require('../services/databaseService').getUserByEmail(email);
        
        if (user && user.auth_provider === 'saml') {
            res.json({
                success: true,
                requiresSSO: true,
                organization: user.organization,
                authProvider: 'saml'
            });
        } else {
            res.json({
                success: true,
                requiresSSO: false,
                authProvider: 'local'
            });
        }
    } catch (error) {
        console.error('❌ Organization discovery error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Discovery failed' 
        });
    }
});

// User profile with enterprise fields
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                department: user.department,
                organization: user.organization,
                subscriptionTier: user.subscription_tier,
                authProvider: user.auth_provider,
                lastLogin: user.last_login,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('❌ Profile fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch profile' 
        });
    }
});

module.exports = router;
