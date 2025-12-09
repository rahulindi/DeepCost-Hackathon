// backend/src/utils/errorHandler.js
class AppError extends Error {
    constructor(message, statusCode, code = null, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ErrorHandler {
    static createError(type, message, details = null) {
        const errorTypes = {
            // Authentication Errors
            INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', status: 401, message: 'Invalid username or password' },
            TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', status: 401, message: 'Session expired. Please log in again' },
            TOKEN_INVALID: { code: 'TOKEN_INVALID', status: 401, message: 'Invalid authentication token' },

            // AWS Integration Errors
            AWS_CREDENTIALS_INVALID: { code: 'AWS_CREDENTIALS_INVALID', status: 400, message: 'Invalid AWS credentials provided' },
            AWS_CREDENTIALS_MISSING: { code: 'AWS_CREDENTIALS_MISSING', status: 400, message: 'AWS credentials not configured. Please set up your AWS account' },
            AWS_API_ERROR: { code: 'AWS_API_ERROR', status: 502, message: 'AWS service temporarily unavailable' },
            AWS_RATE_LIMIT: { code: 'AWS_RATE_LIMIT', status: 429, message: 'AWS API rate limit exceeded. Please try again later' },

            // Database Errors
            DATABASE_CONNECTION_ERROR: { code: 'DATABASE_CONNECTION_ERROR', status: 503, message: 'Database connection failed' },
            DATABASE_QUERY_ERROR: { code: 'DATABASE_QUERY_ERROR', status: 500, message: 'Database operation failed' },

            // Generic
            INTERNAL_SERVER_ERROR: { code: 'INTERNAL_SERVER_ERROR', status: 500, message: 'An unexpected error occurred' }
        };

        const errorConfig = errorTypes[type] || errorTypes.INTERNAL_SERVER_ERROR;
        const finalMessage = message || errorConfig.message;

        return new AppError(finalMessage, errorConfig.status, errorConfig.code, details);
    }

    static handleAwsError(error) {
        console.error('🔥 AWS Error Details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.$metadata?.httpStatusCode
        });

        // Keep existing behavior but add structured error info
        if (error.name === 'CredentialsError' || error.name === 'UnauthorizedOperation') {
            return this.createError('AWS_CREDENTIALS_INVALID', null, {
                awsError: error.message,
                suggestion: 'Please verify your AWS access keys and permissions'
            });
        }

        if (error.name === 'ThrottlingException' || error.code === 'Throttling') {
            return this.createError('AWS_RATE_LIMIT', null, {
                retryAfter: '60 seconds'
            });
        }

        // Default to existing error message format
        return this.createError('AWS_API_ERROR', error.message);
    }

    static sendErrorResponse(res, error) {
        // Maintain backward compatibility with existing error responses
        const statusCode = error.statusCode || 500;
        const response = {
            success: false,
            error: error.message || 'An error occurred'
        };

        // Add enhanced error info only if it's our custom error
        if (error.isOperational && error.code) {
            response.errorCode = error.code;
            response.timestamp = new Date().toISOString();

            if (error.details) {
                response.details = error.details;
            }
        }

        console.error(`🔥 Error Response [${statusCode}]:`, response);
        res.status(statusCode).json(response);
    }
}

module.exports = { AppError, ErrorHandler };