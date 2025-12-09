const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * DeviceFingerprintService - Privacy-safe device identification
 * Hashes all client data with SHA-256 for security
 */
class DeviceFingerprintService {
  constructor() {
    this.salt = process.env.FINGERPRINT_SALT || 'aws-cost-tracker-device-salt-2024';
  }

  /**
   * Generate device fingerprint from client data
   * @param {Object} clientData - Raw client device information
   * @returns {Object} Hashed fingerprint object
   */
  generateFingerprint(clientData) {
    try {
      const {
        userAgent,
        timezone,
        screenResolution,
        platform,
        webglHash,
        ipAddress,
        language,
        colorDepth,
        hardwareConcurrency
      } = clientData;

      // Create base fingerprint string
      const fingerprintData = [
        userAgent || '',
        timezone || '',
        screenResolution || '',
        platform || '',
        webglHash || '',
        language || '',
        colorDepth || '',
        hardwareConcurrency || ''
      ].join('|');

      // Generate primary device hash
      const deviceHash = this.hashData(fingerprintData);
      
      // Generate IP hash separately (for geo-tracking)
      const ipHash = this.hashData(ipAddress || '');
      
      // Create component hashes for granular tracking
      const componentHashes = {
        browser: this.hashData(userAgent || ''),
        system: this.hashData(`${platform}|${hardwareConcurrency}|${colorDepth}`),
        display: this.hashData(`${screenResolution}|${colorDepth}`),
        locale: this.hashData(`${timezone}|${language}`)
      };

      const fingerprint = {
        deviceId: deviceHash,
        ipHash: ipHash,
        components: componentHashes,
        confidence: this.calculateConfidence(clientData),
        timestamp: new Date().toISOString()
      };

      logger.info('Device fingerprint generated', { 
        deviceId: deviceHash.substring(0, 8) + '...',
        confidence: fingerprint.confidence 
      });

      return fingerprint;
    } catch (error) {
      logger.error('Error generating device fingerprint:', error);
      return {
        deviceId: this.hashData('fallback-' + Date.now()),
        ipHash: '',
        components: {},
        confidence: 0.1,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Hash data with salt and SHA-256
   * @param {String} data - Data to hash
   * @returns {String} SHA-256 hash
   */
  hashData(data) {
    return crypto
      .createHash('sha256')
      .update(data + this.salt)
      .digest('hex');
  }

  /**
   * Calculate fingerprint confidence score
   * @param {Object} clientData - Client device data
   * @returns {Number} Confidence score 0-1
   */
  calculateConfidence(clientData) {
    let score = 0;
    const weights = {
      userAgent: 0.3,
      webglHash: 0.25,
      screenResolution: 0.15,
      timezone: 0.1,
      platform: 0.1,
      hardwareConcurrency: 0.1
    };

    Object.keys(weights).forEach(key => {
      if (clientData[key] && clientData[key].length > 0) {
        score += weights[key];
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Compare two fingerprints for similarity
   * @param {Object} fp1 - First fingerprint
   * @param {Object} fp2 - Second fingerprint
   * @returns {Object} Similarity analysis
   */
  compareFingerprints(fp1, fp2) {
    const exactMatch = fp1.deviceId === fp2.deviceId;
    
    let componentMatches = 0;
    let totalComponents = 0;
    
    Object.keys(fp1.components).forEach(key => {
      if (fp2.components[key]) {
        totalComponents++;
        if (fp1.components[key] === fp2.components[key]) {
          componentMatches++;
        }
      }
    });

    const similarity = totalComponents > 0 ? componentMatches / totalComponents : 0;
    const ipMatch = fp1.ipHash === fp2.ipHash;

    return {
      exactMatch,
      similarity,
      ipMatch,
      suspicious: !exactMatch && similarity > 0.8, // High similarity but not exact
      riskLevel: this.assessRisk(exactMatch, similarity, ipMatch)
    };
  }

  /**
   * Assess risk level based on fingerprint comparison
   * @param {Boolean} exactMatch - Device ID exact match
   * @param {Number} similarity - Component similarity score
   * @param {Boolean} ipMatch - IP address match
   * @returns {String} Risk level: low, medium, high
   */
  assessRisk(exactMatch, similarity, ipMatch) {
    if (exactMatch && ipMatch) return 'low';
    if (exactMatch && !ipMatch) return 'medium'; // Device changed location
    if (!exactMatch && similarity > 0.9) return 'high'; // Possible spoofing
    if (!exactMatch && similarity > 0.6) return 'medium'; // Partial match
    return 'high'; // Complete mismatch
  }

  /**
   * Validate fingerprint data structure
   * @param {Object} fingerprint - Fingerprint to validate
   * @returns {Boolean} Is valid fingerprint
   */
  isValidFingerprint(fingerprint) {
    return fingerprint &&
           fingerprint.deviceId &&
           typeof fingerprint.deviceId === 'string' &&
           fingerprint.deviceId.length === 64 && // SHA-256 hex length
           fingerprint.components &&
           typeof fingerprint.components === 'object';
  }

  /**
   * Extract client fingerprint data from HTTP request
   * @param {Object} req - Express request object
   * @returns {Object} Client fingerprint data
   */
  extractClientData(req) {
    const headers = req.headers;
    const clientFingerprint = req.body.fingerprint || {};
    
    return {
      userAgent: headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      timezone: clientFingerprint.timezone,
      screenResolution: clientFingerprint.screenResolution,
      platform: clientFingerprint.platform,
      webglHash: clientFingerprint.webglHash,
      language: headers['accept-language']?.split(',')[0],
      colorDepth: clientFingerprint.colorDepth,
      hardwareConcurrency: clientFingerprint.hardwareConcurrency
    };
  }
}

module.exports = new DeviceFingerprintService();
