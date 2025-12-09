// frontend/src/utils/errorHandler.ts
export interface ErrorResponse {
    success: false;
    error: string;
    errorCode?: string;
    details?: any;
    timestamp?: string;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: any;
    statusCode?: number;
}

export class ErrorHandler {
    static handleApiError(error: any): ApiError {
        // Handle different error types gracefully

        // Axios error with response
        if (error.response) {
            const data = error.response.data;
            return {
                message: data.error || 'API request failed',
                code: data.errorCode,
                details: data.details,
                statusCode: error.response.status
            };
        }

        // Network error
        if (error.request) {
            return {
                message: 'Network error - unable to connect to server',
                code: 'NETWORK_ERROR',
                statusCode: 0
            };
        }

        // Other errors
        return {
            message: error.message || 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR'
        };
    }

    static getErrorMessage(error: any): string {
        const apiError = this.handleApiError(error);

        // Provide user-friendly messages based on error codes
        switch (apiError.code) {
            case 'AWS_CREDENTIALS_MISSING':
                return 'Please configure your AWS credentials in the setup wizard';
            case 'AWS_CREDENTIALS_INVALID':
                return 'Your AWS credentials are invalid. Please check your access keys';
            case 'AWS_RATE_LIMIT':
                return 'Too many AWS requests. Please wait a moment and try again';
            case 'TOKEN_EXPIRED':
                return 'Your session has expired. Please log in again';
            case 'NETWORK_ERROR':
                return 'Cannot connect to server. Please check your internet connection';
            default:
                return apiError.message;
        }
    }

    static shouldRetry(error: any): boolean {
        const apiError = this.handleApiError(error);

        // Determine if the operation should be retried
        const retryableCodes = ['AWS_RATE_LIMIT', 'NETWORK_ERROR', 'AWS_API_ERROR'];
        return retryableCodes.includes(apiError.code || '');
    }

    static getRetryDelay(error: any): number {
        const apiError = this.handleApiError(error);

        // Return appropriate retry delay in milliseconds
        switch (apiError.code) {
            case 'AWS_RATE_LIMIT':
                return 60000; // 60 seconds
            case 'NETWORK_ERROR':
                return 5000;  // 5 seconds
            default:
                return 3000;  // 3 seconds
        }
    }
}

export default ErrorHandler;