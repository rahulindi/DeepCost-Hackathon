const redisSessionManager = require('./redisSessionManager');
const deviceFingerprintService = require('./deviceFingerprintService');
const logger = require('../utils/logger');

/**
 * SessionManagerService - Advanced session management with security
 * Handles concurrent sessions, activity tracking, and threat detection
 */
class SessionManagerService {
  constructor() {
    this.maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5;
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 86400; // 24 hours
    this.activityTimeout = parseInt(process.env.ACTIVITY_TIMEOUT) || 1800; // 30 minutes
    this.suspiciousActivityThreshold = 3;
  }

  /**
   * Create new session with device fingerprinting
   * @param {String} userId - User ID
   * @param {Object} req - Express request object
   * @param {Object} additionalData - Additional session data
   * @returns {Object} Session creation result
   */
  async createSession(userId, req, additionalData = {}) {
    try {
      // Extract device fingerprint
      const clientData = deviceFingerprintService.extractClientData(req);
      const fingerprint = deviceFingerprintService.generateFingerprint(clientData);

      // Check for existing sessions
      const existingSessions = await this.getUserSessions(userId);
      
      // Enforce concurrent session limits
      if (existingSessions.length >= this.maxConcurrentSessions) {
        await this.enforceSessionLimits(userId, existingSessions);
      }

      // Create session data
      const sessionData = {
        userId,
        deviceFingerprint: fingerprint,
        ipAddress: clientData.ipAddress,
        userAgent: clientData.userAgent,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        activityCount: 1,
        riskLevel: 'low',
        flags: [],
        metadata: {
          ...additionalData,
          browser: this.extractBrowserInfo(clientData.userAgent),
          location: await this.getLocationInfo(clientData.ipAddress)
        }
      };

      // Check for suspicious activity
      await this.analyzeSuspiciousActivity(userId, fingerprint, existingSessions);

      // Create session
      const sessionId = await redisSessionManager.createSession(userId, sessionData, this.sessionTimeout);

      logger.info('Session created', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId,
        deviceId: fingerprint.deviceId.substring(0, 8) + '...',
        riskLevel: sessionData.riskLevel
      });

      return {
        success: true,
        sessionId,
        expiresAt: new Date(Date.now() + this.sessionTimeout * 1000).toISOString(),
        riskLevel: sessionData.riskLevel,
        deviceFingerprint: fingerprint
      };

    } catch (error) {
      logger.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update session activity and validate device
   * @param {String} sessionId - Session ID
   * @param {Object} req - Express request object
   * @returns {Object} Activity update result
   */
  async updateActivity(sessionId, req) {
    try {
      const session = await redisSessionManager.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // Generate current device fingerprint
      const clientData = deviceFingerprintService.extractClientData(req);
      const currentFingerprint = deviceFingerprintService.generateFingerprint(clientData);

      // Compare with stored fingerprint
      const comparison = deviceFingerprintService.compareFingerprints(
        session.deviceFingerprint,
        currentFingerprint
      );

      // Update session data
      const updatedData = {
        ...session,
        lastActivity: new Date().toISOString(),
        activityCount: (session.activityCount || 0) + 1,
        riskLevel: comparison.riskLevel
      };

      // Handle suspicious activity
      if (comparison.suspicious || comparison.riskLevel === 'high') {
        updatedData.flags.push({
          type: 'device_mismatch',
          timestamp: new Date().toISOString(),
          similarity: comparison.similarity,
          details: comparison
        });

        logger.warn('Suspicious session activity detected', {
          sessionId: sessionId.substring(0, 8) + '...',
          userId: session.userId,
          riskLevel: comparison.riskLevel,
          similarity: comparison.similarity
        });

        // Auto-terminate high-risk sessions
        if (comparison.riskLevel === 'high' && !comparison.exactMatch) {
          await this.terminateSession(sessionId, 'security_violation');
          return { success: false, error: 'Session terminated for security reasons' };
        }
      }

      // Update session
      await redisSessionManager.updateSession(sessionId, updatedData);

      return {
        success: true,
        riskLevel: updatedData.riskLevel,
        suspicious: comparison.suspicious
      };

    } catch (error) {
      logger.error('Error updating session activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active sessions for a user
   * @param {String} userId - User ID
   * @returns {Array} Array of user sessions
   */
  async getUserSessions(userId) {
    try {
      return await redisSessionManager.getUserSessions(userId);
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Terminate specific session
   * @param {String} sessionId - Session ID to terminate
   * @param {String} reason - Termination reason
   * @returns {Boolean} Success status
   */
  async terminateSession(sessionId, reason = 'manual') {
    try {
      const session = await redisSessionManager.getSession(sessionId);
      if (session) {
        logger.info('Session terminated', {
          sessionId: sessionId.substring(0, 8) + '...',
          userId: session.userId,
          reason
        });
      }

      await redisSessionManager.deleteSession(sessionId);
      return true;
    } catch (error) {
      logger.error('Error terminating session:', error);
      return false;
    }
  }

  /**
   * Terminate all sessions for a user
   * @param {String} userId - User ID
   * @param {String} excludeSessionId - Session ID to exclude from termination
   * @returns {Number} Number of sessions terminated
   */
  async terminateAllUserSessions(userId, excludeSessionId = null) {
    try {
      const sessions = await this.getUserSessions(userId);
      let terminatedCount = 0;

      for (const session of sessions) {
        if (session.sessionId !== excludeSessionId) {
          await this.terminateSession(session.sessionId, 'user_logout_all');
          terminatedCount++;
        }
      }

      logger.info('All user sessions terminated', {
        userId,
        count: terminatedCount,
        excluded: excludeSessionId ? 1 : 0
      });

      return terminatedCount;
    } catch (error) {
      logger.error('Error terminating all user sessions:', error);
      return 0;
    }
  }

  /**
   * Enforce concurrent session limits
   * @param {String} userId - User ID
   * @param {Array} existingSessions - Existing sessions
   */
  async enforceSessionLimits(userId, existingSessions) {
    if (existingSessions.length < this.maxConcurrentSessions) {
      return;
    }

    // Sort by last activity (oldest first)
    existingSessions.sort((a, b) => 
      new Date(a.lastActivity) - new Date(b.lastActivity)
    );

    // Terminate oldest sessions to make room
    const sessionsToTerminate = existingSessions.length - this.maxConcurrentSessions + 1;
    
    for (let i = 0; i < sessionsToTerminate; i++) {
      await this.terminateSession(existingSessions[i].sessionId, 'session_limit_exceeded');
    }

    logger.info('Session limit enforced', {
      userId,
      terminatedCount: sessionsToTerminate,
      remainingCount: this.maxConcurrentSessions - 1
    });
  }

  /**
   * Analyze suspicious activity patterns
   * @param {String} userId - User ID
   * @param {Object} fingerprint - Device fingerprint
   * @param {Array} existingSessions - Existing sessions
   */
  async analyzeSuspiciousActivity(userId, fingerprint, existingSessions) {
    try {
      // Check for multiple different devices in short time
      const recentSessions = existingSessions.filter(session => {
        const timeDiff = Date.now() - new Date(session.createdAt).getTime();
        return timeDiff < 3600000; // 1 hour
      });

      const uniqueDevices = new Set(
        recentSessions.map(session => session.deviceFingerprint.deviceId)
      );

      if (uniqueDevices.size > this.suspiciousActivityThreshold) {
        logger.warn('Suspicious activity detected - multiple devices', {
          userId,
          uniqueDevices: uniqueDevices.size,
          timeWindow: '1 hour'
        });
      }

      // Check for rapid location changes
      const uniqueIPs = new Set(recentSessions.map(session => session.ipAddress));
      if (uniqueIPs.size > 2) {
        logger.warn('Suspicious activity detected - multiple locations', {
          userId,
          uniqueIPs: uniqueIPs.size,
          timeWindow: '1 hour'
        });
      }

    } catch (error) {
      logger.error('Error analyzing suspicious activity:', error);
    }
  }

  /**
   * Extract browser information from user agent
   * @param {String} userAgent - User agent string
   * @returns {Object} Browser info
   */
  extractBrowserInfo(userAgent) {
    if (!userAgent) return { name: 'unknown', version: 'unknown' };

    const browsers = [
      { name: 'Chrome', regex: /Chrome\/(\d+\.\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+\.\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+\.\d+)/ },
      { name: 'Edge', regex: /Edge\/(\d+\.\d+)/ }
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      if (match) {
        return { name: browser.name, version: match[1] };
      }
    }

    return { name: 'unknown', version: 'unknown' };
  }

  /**
   * Get location info from IP address (placeholder)
   * @param {String} ipAddress - IP address
   * @returns {Object} Location info
   */
  async getLocationInfo(ipAddress) {
    // Placeholder for IP geolocation
    // In production, integrate with service like MaxMind or ipapi
    return {
      country: 'unknown',
      region: 'unknown',
      city: 'unknown'
    };
  }

  /**
   * Get session statistics
   * @param {String} userId - User ID (optional)
   * @returns {Object} Session statistics
   */
  async getSessionStats(userId = null) {
    try {
      if (userId) {
        const sessions = await this.getUserSessions(userId);
        return {
          totalSessions: sessions.length,
          activeSessions: sessions.filter(s => this.isSessionActive(s)).length,
          highRiskSessions: sessions.filter(s => s.riskLevel === 'high').length,
          oldestSession: sessions.length > 0 ? 
            Math.min(...sessions.map(s => new Date(s.createdAt).getTime())) : null
        };
      }

      // Global statistics would require scanning all sessions
      // This is expensive and should be implemented with caching
      return {
        message: 'Global statistics require separate implementation'
      };

    } catch (error) {
      logger.error('Error getting session stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Check if session is still active
   * @param {Object} session - Session object
   * @returns {Boolean} Is session active
   */
  isSessionActive(session) {
    const lastActivity = new Date(session.lastActivity).getTime();
    const now = Date.now();
    return (now - lastActivity) < (this.activityTimeout * 1000);
  }

  /**
   * Cleanup expired sessions
   * @returns {Number} Number of sessions cleaned up
   */
  async cleanupExpiredSessions() {
    try {
      // This would be implemented as a background job
      // For now, it's a placeholder
      logger.info('Session cleanup initiated');
      return 0;
    } catch (error) {
      logger.error('Error during session cleanup:', error);
      return 0;
    }
  }
}

module.exports = new SessionManagerService();
