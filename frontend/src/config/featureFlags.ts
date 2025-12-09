export interface FeatureFlags {
  enableAdvancedExports: boolean;
  enableWebhookManagement: boolean;
  enableDataLakeIntegration: boolean;
  enableEnterpriseFeatures: boolean;
}

// Feature flags configuration
export const featureFlags: FeatureFlags = {
  enableAdvancedExports: process.env.REACT_APP_ENABLE_ADVANCED_EXPORTS === 'true' || true, // Default enabled for development
  enableWebhookManagement: process.env.REACT_APP_ENABLE_WEBHOOK_MANAGEMENT === 'true' || true,
  enableDataLakeIntegration: process.env.REACT_APP_ENABLE_DATALAKE_INTEGRATION === 'true' || true,
  enableEnterpriseFeatures: process.env.REACT_APP_ENABLE_ENTERPRISE_FEATURES === 'true' || true,
};

export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return featureFlags[flag];
};

export const getEnabledEnterpriseFeatures = (): string[] => {
  const enabled = [];
  if (featureFlags.enableAdvancedExports) enabled.push('Advanced Exports');
  if (featureFlags.enableWebhookManagement) enabled.push('Webhook Management');
  if (featureFlags.enableDataLakeIntegration) enabled.push('Data Lake Integration');
  return enabled;
};
