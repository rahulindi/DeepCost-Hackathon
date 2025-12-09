// Enterprise SAML/SSO Authentication Service
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const DatabaseService = require('./databaseService');
const { v4: uuidv4 } = require('uuid');

class SamlService {
    static initialize(app) {
        app.use(passport.initialize());
        app.use(passport.session());

        // Configure SAML Strategy
        this.configureSamlStrategy();
        
        // Configure Local Strategy (fallback)
        this.configureLocalStrategy();

        // Passport serialization
        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await DatabaseService.getUserById(id);
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });

        console.log('✅ SAML/SSO authentication initialized');
    }

    static configureSamlStrategy() {
        const samlOptions = {
            entryPoint: process.env.SAML_ENTRY_POINT || 'https://app.onelogin.com/trust/saml2/http-post/sso/123456',
            issuer: process.env.SAML_ISSUER || 'aws-cost-tracker-pro',
            callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/auth/saml/callback',
            cert: process.env.SAML_CERT || '', // X.509 certificate from IdP
            identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            signatureAlgorithm: 'sha256',
            digestAlgorithm: 'sha256',
            acceptedClockSkewMs: 60000,
            attributeConsumingServiceIndex: false,
            disableRequestedAuthnContext: true,
            forceAuthn: false
        };

        passport.use('saml', new SamlStrategy(samlOptions, async (profile, done) => {
            try {
                console.log('🔐 SAML authentication attempt:', {
                    nameID: profile.nameID,
                    attributes: profile.attributes || {}
                });

                // Extract user information from SAML assertion
                const email = profile.nameID || profile.attributes?.email?.[0];
                const firstName = profile.attributes?.firstName?.[0] || profile.attributes?.givenName?.[0] || '';
                const lastName = profile.attributes?.lastName?.[0] || profile.attributes?.surname?.[0] || '';
                const department = profile.attributes?.department?.[0] || '';
                const role = profile.attributes?.role?.[0] || 'user';
                const organization = profile.attributes?.organization?.[0] || profile.attributes?.company?.[0] || '';

                if (!email) {
                    return done(new Error('Email not found in SAML assertion'), null);
                }

                // Find or create user
                let user = await DatabaseService.getUserByEmail(email);
                
                if (!user) {
                    // Create new enterprise user
                    const userData = {
                        id: uuidv4(),
                        username: email.split('@')[0],
                        email: email,
                        first_name: firstName,
                        last_name: lastName,
                        department: department,
                        role: role,
                        organization: organization,
                        auth_provider: 'saml',
                        is_active: true,
                        subscription_tier: 'enterprise',
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    user = await DatabaseService.createEnterpriseUser(userData);
                    console.log('✅ Created new enterprise user via SAML:', email);
                } else {
                    // Update existing user
                    await DatabaseService.updateUser(user.id, {
                        last_login: new Date(),
                        auth_provider: 'saml',
                        department: department || user.department,
                        organization: organization || user.organization
                    });
                    console.log('✅ Updated existing user via SAML:', email);
                }

                return done(null, user);
            } catch (error) {
                console.error('❌ SAML authentication error:', error);
                return done(error, null);
            }
        }));
    }

    static configureLocalStrategy() {
        passport.use('local', new LocalStrategy(
            { usernameField: 'email', passwordField: 'password' },
            async (email, password, done) => {
                try {
                    const user = await DatabaseService.getUserByEmail(email);
                    
                    if (!user) {
                        return done(null, false, { message: 'Invalid credentials' });
                    }

                    if (user.auth_provider === 'saml') {
                        return done(null, false, { message: 'Please use SSO login' });
                    }

                    const isValidPassword = await bcrypt.compare(password, user.password_hash);
                    if (!isValidPassword) {
                        return done(null, false, { message: 'Invalid credentials' });
                    }

                    // Update last login
                    await DatabaseService.updateUser(user.id, { last_login: new Date() });
                    
                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        ));
    }

    static generateJwtToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            organization: user.organization,
            subscription_tier: user.subscription_tier
        };

        // 🔒 SECURITY: Require JWT_SECRET to be set
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is required');
        }
        
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'aws-cost-tracker-pro',
            audience: user.organization || 'default'
        });
    }

    static generateRefreshToken(user) {
        // 🔒 SECURITY: Require JWT_REFRESH_SECRET to be set
        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error('JWT_REFRESH_SECRET environment variable is required');
        }
        
        const payload = {
            id: user.id,
            type: 'refresh'
        };

        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '30d'
        });
    }

    // Role-based access control
    static checkPermission(requiredRole) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const userRole = req.user.role || 'user';
            const roleHierarchy = {
                'super_admin': 5,
                'admin': 4,
                'manager': 3,
                'analyst': 2,
                'user': 1
            };

            const userLevel = roleHierarchy[userRole] || 0;
            const requiredLevel = roleHierarchy[requiredRole] || 999;

            if (userLevel < requiredLevel) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: requiredRole,
                    current: userRole
                });
            }

            next();
        };
    }

    // Organization-based access control
    static checkOrganization(req, res, next) {
        if (!req.user || !req.user.organization) {
            return res.status(403).json({ error: 'Organization access required' });
        }
        next();
    }

    // SAML metadata generator
    static generateMetadata() {
        const samlp = require('samlp');
        const options = {
            issuer: process.env.SAML_ISSUER || 'aws-cost-tracker-pro',
            cert: process.env.SAML_CERT || '',
            key: process.env.SAML_PRIVATE_KEY || '',
            postUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/auth/saml/callback'
        };

        return samlp.metadata(options);
    }

    // Session management
    static async createSession(user, req) {
        const sessionData = {
            user_id: user.id,
            session_token: uuidv4(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date()
        };

        await DatabaseService.createUserSession(sessionData);
        return sessionData.session_token;
    }

    static async validateSession(sessionToken) {
        return await DatabaseService.validateUserSession(sessionToken);
    }

    static async revokeSession(sessionToken) {
        return await DatabaseService.revokeUserSession(sessionToken);
    }

    // Audit logging
    static async logAuthEvent(userId, event, details = {}) {
        const auditData = {
            user_id: userId,
            event_type: event,
            details: JSON.stringify(details),
            timestamp: new Date(),
            ip_address: details.ip_address || null,
            user_agent: details.user_agent || null
        };

        await DatabaseService.createAuditLog(auditData);
    }
}

module.exports = SamlService;
