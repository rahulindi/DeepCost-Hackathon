const Redis = require('ioredis');
const crypto = require('crypto');

class RedisSessionManager {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.initializeRedis();
    }

    async initializeRedis() {
        try {
            // Try to connect to Redis - fallback gracefully if not available
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || null,
                db: process.env.REDIS_DB || 0,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                connectionTimeout: 5000,
                commandTimeout: 3000
            });

            // Test connection
            await this.redis.connect();
            await this.redis.ping();
            
            this.isConnected = true;
            console.log('✅ Redis connected successfully for session management');
            
            // Set up event listeners
            this.redis.on('error', (error) => {
                console.warn('⚠️ Redis connection error:', error.message);
                this.isConnected = false;
            });

            this.redis.on('connect', () => {
                console.log('🔄 Redis reconnected');
                this.isConnected = true;
            });

        } catch (error) {
            console.warn('⚠️ Redis not available, falling back to in-memory storage:', error.message);
            this.isConnected = false;
            this.redis = null;
        }
    }

    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    async createSession(userId, sessionData) {
        const sessionId = this.generateSessionId();
        const sessionInfo = {
            userId,
            ...sessionData,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            activityCount: 1
        };

        try {
            if (this.isConnected && this.redis) {
                // Store in Redis with TTL
                const ttl = sessionData.expiresIn || 7 * 24 * 60 * 60; // 7 days default
                await this.redis.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionInfo));
                
                // Track user sessions for concurrent session management
                await this.redis.sadd(`user_sessions:${userId}`, sessionId);
                await this.redis.expire(`user_sessions:${userId}`, ttl);
                
                console.log(`✅ Session created in Redis: ${sessionId.substring(0, 8)}...`);
            } else {
                // Fallback to in-memory storage (existing behavior)
                if (!this.inMemorySessions) {
                    this.inMemorySessions = new Map();
                }
                this.inMemorySessions.set(sessionId, sessionInfo);
                console.log(`✅ Session created in memory: ${sessionId.substring(0, 8)}...`);
            }

            return sessionId;
        } catch (error) {
            console.error('❌ Error creating session:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        try {
            if (this.isConnected && this.redis) {
                const sessionData = await this.redis.get(`session:${sessionId}`);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    // Update last activity
                    session.lastActivity = Date.now();
                    session.activityCount = (session.activityCount || 1) + 1;
                    
                    // Update in Redis with sliding expiry
                    const ttl = await this.redis.ttl(`session:${sessionId}`);
                    if (ttl > 0) {
                        await this.redis.setex(`session:${sessionId}`, Math.max(ttl, 3600), JSON.stringify(session));
                    }
                    
                    return session;
                }
            } else {
                // Fallback to in-memory
                if (this.inMemorySessions && this.inMemorySessions.has(sessionId)) {
                    const session = this.inMemorySessions.get(sessionId);
                    session.lastActivity = Date.now();
                    session.activityCount = (session.activityCount || 1) + 1;
                    return session;
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting session:', error);
            return null;
        }
    }

    async updateSession(sessionId, updateData) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                return false;
            }

            const updatedSession = { ...session, ...updateData, lastActivity: Date.now() };

            if (this.isConnected && this.redis) {
                const ttl = await this.redis.ttl(`session:${sessionId}`);
                await this.redis.setex(`session:${sessionId}`, Math.max(ttl, 3600), JSON.stringify(updatedSession));
            } else {
                if (this.inMemorySessions) {
                    this.inMemorySessions.set(sessionId, updatedSession);
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Error updating session:', error);
            return false;
        }
    }

    async destroySession(sessionId) {
        try {
            if (this.isConnected && this.redis) {
                const sessionData = await this.redis.get(`session:${sessionId}`);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    await this.redis.del(`session:${sessionId}`);
                    await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
                    console.log(`🗑️ Session destroyed: ${sessionId.substring(0, 8)}...`);
                    return true;
                }
            } else {
                if (this.inMemorySessions && this.inMemorySessions.has(sessionId)) {
                    this.inMemorySessions.delete(sessionId);
                    console.log(`🗑️ Session destroyed from memory: ${sessionId.substring(0, 8)}...`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error destroying session:', error);
            return false;
        }
    }

    async getUserSessions(userId) {
        try {
            if (this.isConnected && this.redis) {
                const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
                const sessions = [];
                
                for (const sessionId of sessionIds) {
                    const sessionData = await this.redis.get(`session:${sessionId}`);
                    if (sessionData) {
                        sessions.push({ sessionId, ...JSON.parse(sessionData) });
                    } else {
                        // Clean up stale session ID
                        await this.redis.srem(`user_sessions:${userId}`, sessionId);
                    }
                }
                
                return sessions;
            } else {
                // Fallback to in-memory
                if (!this.inMemorySessions) return [];
                
                const sessions = [];
                for (const [sessionId, sessionData] of this.inMemorySessions) {
                    if (sessionData.userId === userId) {
                        sessions.push({ sessionId, ...sessionData });
                    }
                }
                return sessions;
            }
        } catch (error) {
            console.error('❌ Error getting user sessions:', error);
            return [];
        }
    }

    async destroyAllUserSessions(userId) {
        try {
            const sessions = await this.getUserSessions(userId);
            let destroyedCount = 0;

            for (const session of sessions) {
                if (await this.destroySession(session.sessionId)) {
                    destroyedCount++;
                }
            }

            console.log(`🧹 Destroyed ${destroyedCount} sessions for user ${userId}`);
            return destroyedCount;
        } catch (error) {
            console.error('❌ Error destroying user sessions:', error);
            return 0;
        }
    }

    async blacklistToken(tokenId, expiryTime = null) {
        try {
            const ttl = expiryTime ? Math.ceil((expiryTime - Date.now()) / 1000) : 24 * 60 * 60; // 24h default
            
            if (this.isConnected && this.redis) {
                await this.redis.setex(`blacklisted_token:${tokenId}`, ttl, Date.now().toString());
                console.log(`🚫 Token blacklisted: ${tokenId.substring(0, 8)}...`);
            } else {
                if (!this.blacklistedTokens) {
                    this.blacklistedTokens = new Map();
                }
                this.blacklistedTokens.set(tokenId, { blacklistedAt: Date.now(), expiryTime });
                console.log(`🚫 Token blacklisted in memory: ${tokenId.substring(0, 8)}...`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error blacklisting token:', error);
            return false;
        }
    }

    async isTokenBlacklisted(tokenId) {
        try {
            if (this.isConnected && this.redis) {
                const result = await this.redis.get(`blacklisted_token:${tokenId}`);
                return result !== null;
            } else {
                if (!this.blacklistedTokens) return false;
                
                const tokenData = this.blacklistedTokens.get(tokenId);
                if (!tokenData) return false;
                
                // Check if token has expired
                if (tokenData.expiryTime && Date.now() > tokenData.expiryTime) {
                    this.blacklistedTokens.delete(tokenId);
                    return false;
                }
                
                return true;
            }
        } catch (error) {
            console.error('❌ Error checking token blacklist:', error);
            return false; // Fail open for availability
        }
    }

    async getStats() {
        try {
            if (this.isConnected && this.redis) {
                const keys = await this.redis.keys('session:*');
                const blacklistedKeys = await this.redis.keys('blacklisted_token:*');
                const userSessionKeys = await this.redis.keys('user_sessions:*');
                
                return {
                    activeSessions: keys.length,
                    blacklistedTokens: blacklistedKeys.length,
                    usersWithSessions: userSessionKeys.length,
                    redisConnected: true
                };
            } else {
                return {
                    activeSessions: this.inMemorySessions ? this.inMemorySessions.size : 0,
                    blacklistedTokens: this.blacklistedTokens ? this.blacklistedTokens.size : 0,
                    usersWithSessions: 0,
                    redisConnected: false
                };
            }
        } catch (error) {
            console.error('❌ Error getting session stats:', error);
            return null;
        }
    }

    async cleanup() {
        try {
            if (this.redis) {
                await this.redis.disconnect();
                console.log('🔌 Redis connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing Redis connection:', error);
        }
    }
}

// Export singleton instance
module.exports = new RedisSessionManager();
