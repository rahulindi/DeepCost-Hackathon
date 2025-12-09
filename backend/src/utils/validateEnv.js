/**
 * 🔒 SECURITY: Environment Variable Validation
 * Ensures all required security-critical environment variables are set
 * Prevents application from starting with insecure defaults
 */

const REQUIRED_ENV_VARS = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'DATA_LAKE_ENCRYPTION_KEY',
    'SESSION_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
];

const RECOMMENDED_ENV_VARS = [
    'NODE_ENV',
    'PORT',
    'ALLOWED_ORIGINS'
];

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
function validateEnvironment() {
    console.log('🔒 Validating environment variables...');
    
    const missing = [];
    const weak = [];
    
    // These are not secrets - don't check for weak values
    const NON_SECRET_VARS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PORT'];
    
    // Check required variables
    for (const varName of REQUIRED_ENV_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        } else if (!NON_SECRET_VARS.includes(varName)) {
            // Check for weak/default values (only for secrets)
            const value = process.env[varName].toLowerCase();
            if (
                value.includes('change') ||
                value.includes('default') ||
                value.includes('secret-key-123') ||
                value.includes('your-') ||
                value.length < 16
            ) {
                weak.push(varName);
            }
        }
    }
    
    // Check recommended variables
    const missingRecommended = [];
    for (const varName of RECOMMENDED_ENV_VARS) {
        if (!process.env[varName]) {
            missingRecommended.push(varName);
        }
    }
    
    // Report results
    if (missing.length > 0) {
        console.error('❌ CRITICAL: Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\n📝 Please copy backend/.env.example to backend/.env and fill in values');
        console.error('💡 Generate secrets with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        throw new Error('Missing required environment variables. Application cannot start.');
    }
    
    if (weak.length > 0) {
        console.warn('⚠️  WARNING: Weak or default values detected:');
        weak.forEach(varName => {
            console.warn(`   - ${varName} (appears to be a default/weak value)`);
        });
        console.warn('\n🔒 Please use strong random secrets in production!');
        console.warn('💡 Generate secrets with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Weak secrets detected in production. Application cannot start.');
        }
    }
    
    if (missingRecommended.length > 0) {
        console.warn('ℹ️  Recommended environment variables not set:');
        missingRecommended.forEach(varName => {
            console.warn(`   - ${varName}`);
        });
    }
    
    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
        console.log('🔒 Running production environment checks...');
        
        if (!process.env.FORCE_HTTPS || process.env.FORCE_HTTPS !== 'true') {
            console.warn('⚠️  WARNING: FORCE_HTTPS is not enabled in production!');
        }
        
        if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.includes('localhost')) {
            console.warn('⚠️  WARNING: CORS allows localhost in production!');
        }
    }
    
    console.log('✅ Environment validation passed');
    return true;
}

/**
 * Generate a secure random secret
 * @param {number} bytes - Number of bytes (default: 32)
 * @returns {string} Hex-encoded random secret
 */
function generateSecret(bytes = 32) {
    return require('crypto').randomBytes(bytes).toString('hex');
}

module.exports = {
    validateEnvironment,
    generateSecret,
    REQUIRED_ENV_VARS,
    RECOMMENDED_ENV_VARS
};
