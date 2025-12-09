class PasswordValidator {
    static validate(password) {
        const errors = [];

        // Simplified validation for hackathon demo - minimum 6 characters
        if (password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = PasswordValidator;