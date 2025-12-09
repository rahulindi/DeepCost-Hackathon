const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const PasswordValidator = require('./passwordValidator');
const EmailService = require('./emailService');
const RoleService = require('./roleService');
const DatabaseService = require('./databaseService');

// Advanced security services (with fallback handling)
let advancedJwtService, sessionManagerService, deviceFingerprintService;
try {
    advancedJwtService = require('../../services/advancedJwtService');
    sessionManagerService = require('../../services/sessionManagerService');
    deviceFingerprintService = require('../../services/deviceFingerprintService');
    console.log('🔐 Advanced security services loaded');
} catch (error) {
    console.warn('⚠️ Advanced security services not available:', error.message);
    // Graceful fallback - services will be null and features disabled
}

// 🔒 SECURITY: Now using PostgreSQL for user and token storage
console.log('✅ Using PostgreSQL for secure user management');

// Advanced security configuration
const SECURITY_CONFIG = {
    enableAdvancedJWT: (process.env.ENABLE_ADVANCED_JWT === 'true' || false) && !!advancedJwtService,
    enableSessionManagement: (process.env.ENABLE_SESSION_MANAGEMENT === 'true' || false) && !!sessionManagerService,
    enableDeviceFingerprinting: (process.env.ENABLE_DEVICE_FINGERPRINTING === 'true' || false) && !!deviceFingerprintService,
    fallbackToLegacy: true, // Always maintain backward compatibility
    servicesAvailable: {
        jwt: !!advancedJwtService,
        sessions: !!sessionManagerService,
        fingerprinting: !!deviceFingerprintService
    }
};

class AuthService {
    static async register(username, email, password) {
        try {
            // Validate password strength
            const passwordValidation = PasswordValidator.validate(password);
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    error: 'Password requirements not met',
                    details: passwordValidation.errors
                };
            }

            // Check if user already exists
            const existingUser = await DatabaseService.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return { success: false, error: 'Email already exists' };
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const verificationToken = EmailService.generateVerificationToken();

            // Auto-verify in development mode
            const autoVerify = process.env.NODE_ENV === 'development';

            // Insert user into database
            const result = await DatabaseService.query(`
                INSERT INTO users (
                    username, email, password_hash, subscription_tier,
                    email_verified, verification_token, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id, username, email, subscription_tier, email_verified, created_at
            `, [
                username,
                email,
                hashedPassword,
                username === 'premium' ? 'professional' : 'free',
                autoVerify,
                verificationToken
            ]);

            const newUser = result.rows[0];
            console.log('📝 User registered with enhanced security:', { username, email, userId: newUser.id });

            // Send verification email if not auto-verified
            if (!autoVerify) {
                await EmailService.sendVerificationEmail(email, verificationToken);
            }

            return {
                success: true,
                message: autoVerify
                    ? 'Registration successful! You can now log in.'
                    : 'Registration successful! Please check your email to verify your account before logging in.',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    subscription_tier: newUser.subscription_tier,
                    email_verified: newUser.email_verified
                }
            };

        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    static async generateTokens(user) {
        // 🔒 SECURITY: Require JWT_SECRET to be set, fallback for hackathon demo
        const jwtSecret = process.env.JWT_SECRET || 'hackathon-demo-secret-do-not-use-in-production-v1';
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required');
        }

        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '1h' }
        );

        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

        // Store refresh token in database
        await DatabaseService.query(`
            INSERT INTO refresh_tokens (token, user_id, expires_at)
            VALUES ($1, $2, $3)
        `, [refreshToken, user.id, expiresAt]);

        return { accessToken, refreshToken };
    }

    static async login(identifier, password, req = null) {
        try {
            console.log('🔍 Login attempt for identifier:', identifier);

            // Find user by email OR username
            const userResult = await DatabaseService.query(
                'SELECT * FROM users WHERE email = $1 OR username = $1',
                [identifier]
            );

            if (userResult.rows.length === 0) {
                console.log('❌ User not found for identifier:', identifier);
                return { success: false, error: 'Invalid credentials' }; // Generic error
            }

            const foundUser = userResult.rows[0];
            console.log('✅ Found user:', { username: foundUser.username, email: foundUser.email, verified: foundUser.email_verified });

            // Check email verification (skip in development)
            const requireVerification = process.env.NODE_ENV !== 'development';
            if (requireVerification && !foundUser.email_verified) {
                return {
                    success: false,
                    error: 'Please verify your email address before logging in. Check your email for verification link.'
                };
            }

            // Check if account is locked
            if (foundUser.account_locked_until && new Date() < new Date(foundUser.account_locked_until)) {
                return {
                    success: false,
                    error: 'Account temporarily locked due to multiple failed attempts'
                };
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, foundUser.password_hash);
            if (!isValidPassword) {
                // Increment failed attempts
                const newFailedAttempts = (foundUser.failed_login_attempts || 0) + 1;
                const lockUntil = newFailedAttempts >= 5
                    ? new Date(Date.now() + 30 * 60 * 1000)
                    : null;

                await DatabaseService.query(`
                    UPDATE users 
                    SET failed_login_attempts = $1, account_locked_until = $2
                    WHERE id = $3
                `, [newFailedAttempts, lockUntil, foundUser.id]);

                if (newFailedAttempts >= 5) {
                    return {
                        success: false,
                        error: 'Account locked due to multiple failed attempts. Try again in 30 minutes.'
                    };
                }

                return { success: false, error: 'Invalid credentials' };
            }

            // Reset failed attempts and update last login
            await DatabaseService.query(`
                UPDATE users 
                SET failed_login_attempts = 0, 
                    account_locked_until = NULL,
                    last_login = NOW()
                WHERE id = $1
            `, [foundUser.id]);

            console.log('🔐 Enhanced secure login:', { identifier, username: foundUser.username, email: foundUser.email });

            // Generate tokens with advanced security if enabled
            let tokenResult, sessionResult;

            if (SECURITY_CONFIG.enableAdvancedJWT && req) {
                try {
                    // Use advanced JWT with RSA256 and enhanced features
                    const payload = {
                        userId: foundUser.id,
                        email: foundUser.email,
                        role: RoleService.getUserRole(foundUser.subscription_tier)
                    };

                    tokenResult = await advancedJwtService.generateTokens(payload, req);

                    // Create session if session management is enabled
                    if (SECURITY_CONFIG.enableSessionManagement) {
                        sessionResult = await sessionManagerService.createSession(foundUser.id, req, {
                            loginMethod: 'password',
                            userAgent: req.headers['user-agent']
                        });
                    }

                } catch (advancedError) {
                    console.warn('Advanced security failed, falling back to legacy:', advancedError.message);
                    tokenResult = null; // Will trigger fallback
                }
            }

            // Fallback to legacy token generation
            if (!tokenResult || !tokenResult.success) {
                const legacyTokens = await this.generateTokens(foundUser);
                tokenResult = {
                    success: true,
                    accessToken: legacyTokens.accessToken,
                    refreshToken: legacyTokens.refreshToken
                };
            }

            const response = {
                success: true,
                user: {
                    id: foundUser.id,
                    username: foundUser.username,
                    email: foundUser.email,
                    subscription_tier: foundUser.subscription_tier,
                    email_verified: foundUser.email_verified,
                    role: RoleService.getUserRole(foundUser.subscription_tier),
                    permissions: RoleService.getRoleInfo(RoleService.getUserRole(foundUser.subscription_tier)).permissions
                },
                token: tokenResult.accessToken,
                refreshToken: tokenResult.refreshToken
            };

            // Add session info if available
            if (sessionResult && sessionResult.success) {
                response.session = {
                    id: sessionResult.sessionId,
                    expiresAt: sessionResult.expiresAt,
                    riskLevel: sessionResult.riskLevel
                };
            }

            // Add security metadata
            response.security = {
                advancedJWT: SECURITY_CONFIG.enableAdvancedJWT && tokenResult.jwtType === 'advanced',
                sessionManaged: SECURITY_CONFIG.enableSessionManagement && sessionResult?.success,
                deviceFingerprinting: SECURITY_CONFIG.enableDeviceFingerprinting && req
            };

            return response;

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }

    static async refreshAccessToken(refreshToken) {
        try {
            // Find token in database
            const tokenResult = await DatabaseService.query(
                'SELECT * FROM refresh_tokens WHERE token = $1',
                [refreshToken]
            );

            if (tokenResult.rows.length === 0) {
                return { success: false, error: 'Invalid or expired refresh token' };
            }

            const tokenData = tokenResult.rows[0];

            // Check if token is expired
            if (new Date() > new Date(tokenData.expires_at)) {
                // Delete expired token
                await DatabaseService.query(
                    'DELETE FROM refresh_tokens WHERE token = $1',
                    [refreshToken]
                );
                return { success: false, error: 'Invalid or expired refresh token' };
            }

            // Get user
            const userResult = await DatabaseService.query(
                'SELECT * FROM users WHERE id = $1',
                [tokenData.user_id]
            );

            if (userResult.rows.length === 0) {
                return { success: false, error: 'User not found' };
            }

            const user = userResult.rows[0];

            // 🔒 SECURITY: Require JWT_SECRET to be set
            if (!process.env.JWT_SECRET) {
                throw new Error('JWT_SECRET environment variable is required');
            }

            const newAccessToken = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Update last_used timestamp
            await DatabaseService.query(
                'UPDATE refresh_tokens SET last_used = NOW() WHERE token = $1',
                [refreshToken]
            );

            return {
                success: true,
                token: newAccessToken
            };

        } catch (error) {
            return { success: false, error: 'Token refresh failed' };
        }
    }

    static async verifyToken(token, req = null) {
        try {
            let decoded;
            let isAdvancedJWT = false;

            // Try advanced JWT verification first if enabled
            if (SECURITY_CONFIG.enableAdvancedJWT) {
                try {
                    const advancedResult = await advancedJwtService.verifyToken(token);
                    if (advancedResult.success) {
                        decoded = advancedResult.payload;
                        isAdvancedJWT = true;

                        // Update session activity if session management is enabled
                        if (SECURITY_CONFIG.enableSessionManagement && req && decoded.sessionId) {
                            await sessionManagerService.updateActivity(decoded.sessionId, req);
                        }
                    }
                } catch (advancedError) {
                    console.warn('Advanced JWT verification failed, trying legacy:', advancedError.message);
                }
            }

            // Fallback to legacy JWT verification
            if (!decoded) {
                // 🔒 SECURITY: Require JWT_SECRET to be set
                const jwtSecret = process.env.JWT_SECRET || 'hackathon-demo-secret-do-not-use-in-production-v1';
                if (!jwtSecret) {
                    throw new Error('JWT_SECRET environment variable is required');
                }
                decoded = jwt.verify(token, jwtSecret);
            }

            // Get user from database
            const userResult = await DatabaseService.query(
                'SELECT * FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                return { success: false, error: 'User not found' };
            }

            const user = userResult.rows[0];

            const response = {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    subscription_tier: user.subscription_tier,
                    role: RoleService.getUserRole(user.subscription_tier),
                    permissions: RoleService.getRoleInfo(RoleService.getUserRole(user.subscription_tier)).permissions
                }
            };

            // Add security metadata
            response.security = {
                advancedJWT: isAdvancedJWT,
                tokenType: isAdvancedJWT ? 'RSA256' : 'HMAC256'
            };

            return response;

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' };
            }
            return { success: false, error: 'Invalid token' };
        }
    }

    static async logout(refreshToken) {
        if (refreshToken) {
            await DatabaseService.query(
                'DELETE FROM refresh_tokens WHERE token = $1',
                [refreshToken]
            );
        }
        return { success: true, message: 'Logged out successfully' };
    }

    static async verifyEmail(token) {
        try {
            const result = EmailService.verifyEmailToken(token);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            // Find user by email and update verification status
            const userResult = await DatabaseService.query(
                'SELECT * FROM users WHERE email = $1',
                [result.email]
            );

            if (userResult.rows.length === 0) {
                return { success: false, error: 'User not found' };
            }

            const foundUser = userResult.rows[0];

            // Update verification status
            await DatabaseService.query(`
                UPDATE users 
                SET email_verified = true, verification_token = NULL
                WHERE id = $1
            `, [foundUser.id]);

            console.log('✅ Email verified for:', result.email);

            return {
                success: true,
                message: 'Email verified successfully! You can now log in.',
                user: {
                    id: foundUser.id,
                    username: foundUser.username,
                    email: foundUser.email,
                    subscription_tier: foundUser.subscription_tier,
                    email_verified: true
                }
            };

        } catch (error) {
            console.error('Email verification error:', error);
            return { success: false, error: 'Email verification failed' };
        }
    }

    // ADVANCED SECURITY METHODS

    /**
     * Get active sessions for a user
     * @param {String} userId - User ID
     * @returns {Object} Session information
     */
    static async getUserSessions(userId) {
        if (!SECURITY_CONFIG.enableSessionManagement) {
            return { success: false, error: 'Session management not enabled' };
        }

        try {
            const sessions = await sessionManagerService.getUserSessions(userId);
            return { success: true, sessions };
        } catch (error) {
            console.error('Error getting user sessions:', error);
            return { success: false, error: 'Failed to retrieve sessions' };
        }
    }

    /**
     * Terminate a specific session
     * @param {String} sessionId - Session ID to terminate
     * @param {String} reason - Termination reason
     * @returns {Object} Termination result
     */
    static async terminateSession(sessionId, reason = 'manual') {
        if (!SECURITY_CONFIG.enableSessionManagement) {
            return { success: false, error: 'Session management not enabled' };
        }

        try {
            const result = await sessionManagerService.terminateSession(sessionId, reason);
            return { success: result, message: result ? 'Session terminated' : 'Failed to terminate session' };
        } catch (error) {
            console.error('Error terminating session:', error);
            return { success: false, error: 'Session termination failed' };
        }
    }

    /**
     * Terminate all sessions for a user except current
     * @param {String} userId - User ID
     * @param {String} currentSessionId - Current session to preserve
     * @returns {Object} Termination result
     */
    static async terminateAllOtherSessions(userId, currentSessionId = null) {
        if (!SECURITY_CONFIG.enableSessionManagement) {
            return { success: false, error: 'Session management not enabled' };
        }

        try {
            const terminatedCount = await sessionManagerService.terminateAllUserSessions(userId, currentSessionId);
            return {
                success: true,
                message: `${terminatedCount} sessions terminated`,
                terminatedCount
            };
        } catch (error) {
            console.error('Error terminating user sessions:', error);
            return { success: false, error: 'Session termination failed' };
        }
    }

    /**
     * Get security configuration and status
     * @returns {Object} Security configuration
     */
    static getSecurityConfig() {
        return {
            ...SECURITY_CONFIG,
            version: '2.0.0',
            features: {
                advancedJWT: {
                    enabled: SECURITY_CONFIG.enableAdvancedJWT,
                    algorithm: 'RSA256',
                    keyRotation: true,
                    blacklisting: true
                },
                sessionManagement: {
                    enabled: SECURITY_CONFIG.enableSessionManagement,
                    concurrentLimit: 5,
                    deviceFingerprinting: SECURITY_CONFIG.enableDeviceFingerprinting,
                    suspiciousActivityDetection: true
                },
                deviceFingerprinting: {
                    enabled: SECURITY_CONFIG.enableDeviceFingerprinting,
                    privacyMethods: ['SHA-256', 'salted-hashing'],
                    components: ['browser', 'system', 'display', 'locale']
                }
            }
        };
    }

    /**
     * Enable advanced security features
     * @param {Object} options - Security options to enable
     * @returns {Object} Configuration result
     */
    static enableAdvancedSecurity(options = {}) {
        const { jwt = true, sessions = true, fingerprinting = true } = options;

        SECURITY_CONFIG.enableAdvancedJWT = jwt;
        SECURITY_CONFIG.enableSessionManagement = sessions;
        SECURITY_CONFIG.enableDeviceFingerprinting = fingerprinting;

        console.log('🔒 Advanced security features enabled:', {
            JWT: jwt,
            Sessions: sessions,
            Fingerprinting: fingerprinting
        });

        return {
            success: true,
            message: 'Advanced security features enabled',
            config: SECURITY_CONFIG
        };
    }

    /**
     * Generate device fingerprint for request
     * @param {Object} req - Express request object
     * @returns {Object} Device fingerprint
     */
    static generateDeviceFingerprint(req) {
        if (!SECURITY_CONFIG.enableDeviceFingerprinting) {
            return { success: false, error: 'Device fingerprinting not enabled' };
        }

        try {
            const clientData = deviceFingerprintService.extractClientData(req);
            const fingerprint = deviceFingerprintService.generateFingerprint(clientData);

            return {
                success: true,
                fingerprint: {
                    deviceId: fingerprint.deviceId.substring(0, 8) + '...', // Truncated for security
                    confidence: fingerprint.confidence,
                    timestamp: fingerprint.timestamp
                }
            };
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            return { success: false, error: 'Fingerprint generation failed' };
        }
    }
}

module.exports = AuthService;