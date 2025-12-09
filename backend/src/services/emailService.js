const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// File-based persistent storage for tokens
const VERIFICATION_TOKENS_FILE = path.join(__dirname, '../data/email_verification_tokens.json');
const PASSWORD_RESET_TOKENS_FILE = path.join(__dirname, '../data/password_reset_tokens.json');

// Ensure data directory exists
const dataDir = path.dirname(VERIFICATION_TOKENS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load verification tokens from file
function loadVerificationTokens() {
    try {
        if (fs.existsSync(VERIFICATION_TOKENS_FILE)) {
            const data = fs.readFileSync(VERIFICATION_TOKENS_FILE, 'utf8');
            const tokensArray = JSON.parse(data);
            const tokens = new Map();
            tokensArray.forEach(item => tokens.set(item.token, item.data));
            return tokens;
        }
    } catch (error) {
        console.error('❌ Error loading verification tokens:', error);
    }
    return new Map();
}

// Save verification tokens to file
function saveVerificationTokens(tokens) {
    try {
        const tokensArray = Array.from(tokens.entries()).map(([token, data]) => ({ token, data }));
        fs.writeFileSync(VERIFICATION_TOKENS_FILE, JSON.stringify(tokensArray, null, 2));
    } catch (error) {
        console.error('❌ Error saving verification tokens:', error);
    }
}

// Load password reset tokens from file
function loadPasswordResetTokens() {
    try {
        if (fs.existsSync(PASSWORD_RESET_TOKENS_FILE)) {
            const data = fs.readFileSync(PASSWORD_RESET_TOKENS_FILE, 'utf8');
            const tokensArray = JSON.parse(data);
            const tokens = new Map();
            tokensArray.forEach(item => tokens.set(item.token, item.data));
            return tokens;
        }
    } catch (error) {
        console.error('❌ Error loading password reset tokens:', error);
    }
    return new Map();
}

// Save password reset tokens to file
function savePasswordResetTokens(tokens) {
    try {
        const tokensArray = Array.from(tokens.entries()).map(([token, data]) => ({ token, data }));
        fs.writeFileSync(PASSWORD_RESET_TOKENS_FILE, JSON.stringify(tokensArray, null, 2));
    } catch (error) {
        console.error('❌ Error saving password reset tokens:', error);
    }
}

// Initialize persistent storage
const verificationTokens = loadVerificationTokens();
const passwordResetTokens = loadPasswordResetTokens();

class EmailService {
    static generateVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    static async sendVerificationEmail(email, token) {
        // Mock implementation - replace with real email service
        const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
        
        console.log('\n' + '✨'.repeat(30));
        console.log('📧 EMAIL VERIFICATION SENT');
        console.log('✨'.repeat(30));
        console.log(`📧 TO: \x1b[36m${email}\x1b[0m`);
        console.log(`🔗 VERIFICATION LINK:`);
        console.log(`   \x1b]8;;${verificationUrl}\x1b\\\x1b[32m${verificationUrl}\x1b[0m\x1b]8;;\x1b\\`);
        console.log(`⏰ EXPIRES: \x1b[33m24 hours from now\x1b[0m`);
        console.log(`📝 INSTRUCTIONS: \x1b[35mClick the link above to verify your email\x1b[0m`);
        console.log(`🔍 QUICK TEST: Run this command to test:`);
        console.log(`   \x1b[90mcurl -X GET "http://localhost:3001/api/users/verify-email/${token}"\x1b[0m`);
        console.log('✨'.repeat(30));
        console.log('');

        // Store token for verification
        verificationTokens.set(token, {
            email,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
        saveVerificationTokens(verificationTokens); // Save to file

        return { success: true, message: 'Verification email sent' };
    }

    static async sendPasswordResetEmail(email, token) {
        console.log(`📧 PASSWORD RESET EMAIL for ${email}`);
        console.log(`🔗 Reset link: http://localhost:3000/reset-password?token=${token}`);

        passwordResetTokens.set(token, {
            email,
            expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
        });
        savePasswordResetTokens(passwordResetTokens); // Save to file

        return { success: true, message: 'Password reset email sent' };
    }

    static verifyEmailToken(token) {
        const tokenData = verificationTokens.get(token);

        if (!tokenData || Date.now() > tokenData.expiresAt) {
            verificationTokens.delete(token);
            saveVerificationTokens(verificationTokens); // Save after deletion
            return { success: false, error: 'Invalid or expired verification token' };
        }

        verificationTokens.delete(token);
        saveVerificationTokens(verificationTokens); // Save after successful verification
        return { success: true, email: tokenData.email };
    }

    static verifyPasswordResetToken(token) {
        const tokenData = passwordResetTokens.get(token);

        if (!tokenData || Date.now() > tokenData.expiresAt) {
            passwordResetTokens.delete(token);
            return { success: false, error: 'Invalid or expired reset token' };
        }

        return { success: true, email: tokenData.email };
    }

    static invalidatePasswordResetToken(token) {
        passwordResetTokens.delete(token);
        savePasswordResetTokens(passwordResetTokens); // Save after deletion
    }
}

module.exports = EmailService;