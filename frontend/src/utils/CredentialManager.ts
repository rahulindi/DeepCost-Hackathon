/**
 * Utility to manage AWS credentials in browser storage safely.
 * Implements "Ephemeral Mode" where credentials live in the client, not the server.
 */

// Keys for local/session storage
const AWS_CREDS_KEY = 'deepcost_aws_credentials';
const AWS_ACCOUNT_INFO_KEY = 'deepcost_aws_account_info';

interface AwsCredentials {
    type: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    roleArn?: string;
    accountId?: string;
    alias?: string;
    region?: string;
}

export const CredentialManager = {
    /**
     * Save credentials to local storage (encrypted conceptually, but here just JSON for demo)
     */
    saveCredentials: (creds: AwsCredentials) => {
        try {
            // In a real prod app, we might encrypt this string before saving
            localStorage.setItem(AWS_CREDS_KEY, JSON.stringify(creds));

            // Also save public account info separately for UI display
            const publicInfo = {
                accountId: creds.accountId,
                alias: creds.alias,
                region: creds.region,
                isConnected: true
            };
            localStorage.setItem(AWS_ACCOUNT_INFO_KEY, JSON.stringify(publicInfo));

            console.log('✅ AWS Credentials saved to local browser storage');
            return true;
        } catch (error) {
            console.error('Failed to save credentials locally:', error);
            return false;
        }
    },

    /**
     * Retrieve credentials to attach to API requests
     */
    getCredentials: (): AwsCredentials | null => {
        try {
            const stored = localStorage.getItem(AWS_CREDS_KEY);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (error) {
            return null;
        }
    },

    /**
     * Get non-sensitive account info for display
     */
    getAccountInfo: () => {
        try {
            const stored = localStorage.getItem(AWS_ACCOUNT_INFO_KEY);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (error) {
            return null;
        }
    },

    /**
     * Clear credentials (logout from AWS)
     */
    clearCredentials: () => {
        localStorage.removeItem(AWS_CREDS_KEY);
        localStorage.removeItem(AWS_ACCOUNT_INFO_KEY);
        console.log('🧹 AWS Credentials cleared from local browser storage');
    },

    /**
     * Check if user is connected
     */
    isAuthenticated: () => {
        return !!localStorage.getItem(AWS_CREDS_KEY);
    }
};
