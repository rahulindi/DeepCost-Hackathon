/**
 * Middleware to extract AWS credentials from request headers.
 * Enables "Ephemeral Mode" where credentials are passed per-request
 * instead of being stored on the server.
 */

const extractAwsCredentials = (req, res, next) => {
    // Check custom headers used by "Ephemeral Mode"
    const accessKeyId = req.headers['x-aws-access-key'];
    const secretAccessKey = req.headers['x-aws-secret-key'];
    const region = req.headers['x-aws-region'] || 'us-east-1';

    // If headers are present, construct the credentials object
    if (accessKeyId && secretAccessKey) {
        req.awsCredentials = {
            type: 'access_key',
            accessKeyId,
            secretAccessKey,
            region
        };
        console.log('🔑 AWS Credentials found in request headers (Ephemeral Mode)');
    } else {
        // No headers found - downstream services will fall back to database/file storage
        // or return an error if configured to enforce ephemeral mode
        req.awsCredentials = null;
    }

    next();
};

module.exports = { extractAwsCredentials };
