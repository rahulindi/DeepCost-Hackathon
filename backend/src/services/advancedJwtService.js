const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const KeyGenerator = require('../utils/keyGenerator');
const SessionManager = require('./redisSessionManager');

class AdvancedJwtService {
    constructor() {
        this.keys = null;
        this.loadKeys();
    }

    loadKeys() {
        try {
            this.keys = KeyGenerator.loadKeys();
            KeyGenerator.validateKeys(this.keys);
            console.log('🔐 RSA keys loaded and validated for JWT signing');
        } catch (error) {
            console.error('❌ Failed to load RSA keys:', error);
            throw new Error('JWT service initialization failed');
        }
    }

    generateTokenId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async generateAccessToken(user, sessionId, deviceInfo = {}) {
        try {
            const tokenId = this.generateTokenId();
            const issuedAt = Math.floor(Date.now() / 1000);
            const expiresAt = issuedAt + (15 * 60); // 15 minutes

            const payload = {
                // Standard claims
                iss: 'aws-cost-tracker-pro', // Issuer
                sub: user.id, // Subject (user ID)
                aud: 'aws-cost-tracker-client', // Audience
                exp: expiresAt, // Expiration time
                iat: issuedAt, // Issued at
                jti: tokenId, // JWT ID for blacklisting
                
                // Custom claims
                email: user.email,
                username: user.username,
                subscription_tier: user.subscription_tier,
                role: user.role,
                permissions: user.permissions,
                
                // Security claims
                sessionId: sessionId,
                deviceFingerprint: deviceInfo.fingerprint,
                ipAddress: deviceInfo.ipAddress,
                userAgent: deviceInfo.userAgent,
                
                // Token metadata
                tokenType: 'access',
                version: '2.0'
            };

            const token = jwt.sign(payload, this.keys.privateKey, {
                algorithm: 'RS256',
                header: {
                    alg: 'RS256',
                    typ: 'JWT',
                    kid: 'primary' // Key ID for key rotation
                }
            });

            console.log(`🔐 Access token generated: ${tokenId.substring(0, 8)}... (expires in 15min)`);
            
            return {
                token,
                tokenId,
                expiresAt: expiresAt * 1000, // Convert to milliseconds
                expiresIn: 15 * 60 // 15 minutes in seconds
            };
        } catch (error) {
            console.error('❌ Error generating access token:', error);
            throw error;
        }
    }

    async generateRefreshToken(userId, sessionId, deviceInfo = {}) {
        try {
            const tokenId = this.generateTokenId();
            const issuedAt = Math.floor(Date.now() / 1000);
            const expiresAt = issuedAt + (7 * 24 * 60 * 60); // 7 days

            const payload = {
                // Standard claims
                iss: 'aws-cost-tracker-pro',
                sub: userId,
                aud: 'aws-cost-tracker-client',
                exp: expiresAt,
                iat: issuedAt,
                jti: tokenId,
                
                // Refresh token specific claims
                sessionId: sessionId,
                deviceFingerprint: deviceInfo.fingerprint,
                
                // Token metadata
                tokenType: 'refresh',
                version: '2.0'
            };

            const token = jwt.sign(payload, this.keys.privateKey, {
                algorithm: 'RS256',
                header: {
                    alg: 'RS256',
                    typ: 'JWT',
                    kid: 'primary'
                }
            });

            console.log(`🔄 Refresh token generated: ${tokenId.substring(0, 8)}... (expires in 7 days)`);
            
            return {
                token,
                tokenId,
                expiresAt: expiresAt * 1000, // Convert to milliseconds
                expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
            };
        } catch (error) {
            console.error('❌ Error generating refresh token:', error);
            throw error;
        }
    }

    async verifyToken(token, tokenType = 'access') {
        try {
            // Decode without verification first to get token ID
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.payload.jti) {
                return { success: false, error: 'Invalid token format' };
            }

            const tokenId = decoded.payload.jti;

            // Check if token is blacklisted
            const isBlacklisted = await SessionManager.isTokenBlacklisted(tokenId);
            if (isBlacklisted) {
                return { success: false, error: 'Token has been revoked', code: 'TOKEN_BLACKLISTED' };
            }

            // Verify token signature and claims
            const payload = jwt.verify(token, this.keys.publicKey, {
                algorithms: ['RS256'],
                issuer: 'aws-cost-tracker-pro',
                audience: 'aws-cost-tracker-client'
            });

            // Validate token type
            if (payload.tokenType !== tokenType) {
                return { success: false, error: `Invalid token type. Expected ${tokenType}` };
            }

            // Check if session still exists (for added security)
            if (payload.sessionId) {
                const session = await SessionManager.getSession(payload.sessionId);
                if (!session) {
                    return { success: false, error: 'Session has expired', code: 'SESSION_EXPIRED' };
                }

                // Update session activity
                await SessionManager.updateSession(payload.sessionId, {
                    lastTokenUse: Date.now(),
                    lastActivity: Date.now()
                });
            }

            console.log(`✅ Token verified: ${tokenId.substring(0, 8)}... (type: ${tokenType})`);
            
            return {
                success: true,
                payload,
                tokenId,
                sessionId: payload.sessionId
            };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' };
            } else if (error.name === 'JsonWebTokenError') {
                return { success: false, error: 'Invalid token signature', code: 'INVALID_SIGNATURE' };
            } else if (error.name === 'NotBeforeError') {
                return { success: false, error: 'Token not active yet', code: 'TOKEN_NOT_ACTIVE' };
            }
            
            console.error('❌ Token verification error:', error);
            return { success: false, error: 'Token verification failed' };
        }
    }

    async blacklistToken(tokenId, expiryTime = null) {
        try {
            await SessionManager.blacklistToken(tokenId, expiryTime);
            console.log(`🚫 Token blacklisted: ${tokenId.substring(0, 8)}...`);
            return true;
        } catch (error) {
            console.error('❌ Error blacklisting token:', error);
            return false;
        }
    }

    async refreshAccessToken(refreshToken, deviceInfo = {}) {
        try {
            // Verify refresh token
            const refreshResult = await this.verifyToken(refreshToken, 'refresh');
            if (!refreshResult.success) {
                return refreshResult;
            }

            const { payload, sessionId } = refreshResult;

            // Validate device fingerprint (if available)
            if (payload.deviceFingerprint && deviceInfo.fingerprint) {
                if (payload.deviceFingerprint !== deviceInfo.fingerprint) {
                    console.warn('⚠️ Device fingerprint mismatch during token refresh');
                    return { 
                        success: false, 
                        error: 'Device fingerprint mismatch', 
                        code: 'DEVICE_MISMATCH' 
                    };
                }
            }

            // Get user info from session
            const session = await SessionManager.getSession(sessionId);
            if (!session) {
                return { success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' };
            }

            // Generate new access token
            const user = {
                id: payload.sub,
                email: payload.email,
                username: payload.username,
                subscription_tier: payload.subscription_tier,
                role: payload.role,
                permissions: payload.permissions
            };

            const newAccessToken = await this.generateAccessToken(user, sessionId, deviceInfo);

            console.log(`🔄 Access token refreshed for user: ${payload.sub}`);
            
            return {
                success: true,
                accessToken: newAccessToken.token,
                tokenId: newAccessToken.tokenId,
                expiresIn: newAccessToken.expiresIn,
                user
            };
        } catch (error) {
            console.error('❌ Error refreshing access token:', error);
            return { success: false, error: 'Token refresh failed' };
        }
    }

    async revokeAllUserTokens(userId, keepCurrentSession = null) {
        try {
            // Get all user sessions
            const sessions = await SessionManager.getUserSessions(userId);
            let revokedCount = 0;

            for (const session of sessions) {
                if (keepCurrentSession && session.sessionId === keepCurrentSession) {
                    continue; // Keep current session
                }

                // Destroy session (this will invalidate all tokens for that session)
                await SessionManager.destroySession(session.sessionId);
                revokedCount++;
            }

            console.log(`🚫 Revoked ${revokedCount} sessions for user: ${userId}`);
            return { success: true, revokedSessions: revokedCount };
        } catch (error) {
            console.error('❌ Error revoking user tokens:', error);
            return { success: false, error: 'Token revocation failed' };
        }
    }

    async rotateKeys() {
        try {
            console.log('🔄 Starting JWT key rotation...');
            
            // Generate new keys
            const newKeys = KeyGenerator.rotateKeys();
            
            // Update current keys
            this.keys = newKeys;
            
            // Validate new keys
            KeyGenerator.validateKeys(this.keys);
            
            console.log('✅ JWT key rotation completed successfully');
            console.log('⚠️ Note: Existing tokens will become invalid after key rotation');
            
            return { success: true, message: 'Keys rotated successfully' };
        } catch (error) {
            console.error('❌ Key rotation failed:', error);
            return { success: false, error: 'Key rotation failed' };
        }
    }

    getTokenStats() {
        return {
            algorithm: 'RS256',
            keySize: '2048 bits',
            accessTokenExpiry: '15 minutes',
            refreshTokenExpiry: '7 days',
            features: [
                'RSA256 asymmetric signing',
                'Token blacklisting',
                'Session management',
                'Device fingerprinting',
                'Key rotation support'
            ]
        };
    }
}

// Export singleton instance
module.exports = new AdvancedJwtService();
