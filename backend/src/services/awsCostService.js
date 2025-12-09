const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const { ResourceGroupsTaggingAPIClient, GetResourcesCommand } = require('@aws-sdk/client-resource-groups-tagging-api');
// Add error handler import while keeping existing imports
const { ErrorHandler } = require('../utils/errorHandler');

class AwsCostService {
    // Check if AWS Cost Explorer API is enabled
    static isAwsCostExplorerEnabled() {
        const enabled = process.env.ENABLE_AWS_COST_EXPLORER !== 'false';
        if (!enabled) {
            console.log('⏸️  AWS Cost Explorer API is DISABLED (using cached data only)');
        }
        return enabled;
    }

    // Return cached data response when API is disabled
    static getCachedDataResponse(message = 'AWS Cost Explorer API is disabled. Using cached database data.') {
        return {
            success: true,
            cached: true,
            message: message,
            data: [],
            note: 'Enable ENABLE_AWS_COST_EXPLORER=true in .env to fetch fresh data from AWS'
        };
    }
    // NEW: Get costs with tag-based grouping for Resource Allocation
    static async getCostsWithTagGrouping(userCredentials = null, days = 30) {
        // Check if AWS API is enabled
        if (!this.isAwsCostExplorerEnabled()) {
            return this.getCachedDataResponse('Tag grouping data from cache');
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];

        console.log(`🏷️  Fetching costs with TAG GROUPING: ${start} to ${end}`);

        let clientConfig = { region: 'us-east-1' };

        if (userCredentials && userCredentials.type === 'access_key') {
            clientConfig.credentials = {
                accessKeyId: userCredentials.accessKeyId,
                secretAccessKey: userCredentials.secretAccessKey
            };
        }

        const client = new CostExplorerClient(clientConfig);

        const params = {
            TimePeriod: { Start: start, End: end },
            Granularity: 'DAILY',
            Metrics: ['UnblendedCost'],
            GroupBy: [
                { Type: 'DIMENSION', Key: 'SERVICE' },
                { Type: 'TAG', Key: 'CostCenter' },
                { Type: 'TAG', Key: 'Department' },
                { Type: 'TAG', Key: 'Project' },
                { Type: 'TAG', Key: 'Environment' }
            ]
        };

        try {
            const response = await client.send(new GetCostAndUsageCommand(params));

            console.log(`✅ Fetched ${response.ResultsByTime?.length || 0} days with tag grouping`);

            return {
                success: true,
                data: response.ResultsByTime,
                period: { start, end },
                hasTagData: true
            };
        } catch (error) {
            console.error('❌ AWS Cost with Tags Error:', error);
            try {
                const structuredError = ErrorHandler.handleAwsError(error);
                return {
                    success: false,
                    error: structuredError.message
                };
            } catch (handlerError) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // NEW: Get AWS Cost Forecast (matches AWS Console projection)
    static async getCostForecast(userCredentials = null) {
        // Check if AWS API is enabled
        if (!this.isAwsCostExplorerEnabled()) {
            return this.getCachedDataResponse('Forecast data from cache');
        }

        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const start = today.toISOString().split('T')[0];
        const end = endOfMonth.toISOString().split('T')[0];

        console.log(`🔮 Fetching AWS COST FORECAST: ${start} to ${end}`);

        let clientConfig = { region: 'us-east-1' };

        if (userCredentials && userCredentials.type === 'access_key') {
            clientConfig.credentials = {
                accessKeyId: userCredentials.accessKeyId,
                secretAccessKey: userCredentials.secretAccessKey
            };
        }

        const { GetCostForecastCommand } = require('@aws-sdk/client-cost-explorer');
        const client = new CostExplorerClient(clientConfig);

        const params = {
            TimePeriod: { Start: start, End: end },
            Metric: 'UNBLENDED_COST',
            Granularity: 'MONTHLY'
        };

        try {
            const response = await client.send(new GetCostForecastCommand(params));

            console.log(`✅ AWS Forecast: $${response.Total?.Amount || '0'}`);

            return {
                success: true,
                forecastedCost: parseFloat(response.Total?.Amount || '0'),
                period: { start, end }
            };
        } catch (error) {
            console.error('❌ AWS Forecast Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // NEW: Get month-to-date costs (matches AWS Console)
    static async getMonthToDateCosts(userCredentials = null) {
        // Check if AWS API is enabled
        if (!this.isAwsCostExplorerEnabled()) {
            return this.getCachedDataResponse('Month-to-date costs from cache');
        }

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const start = startOfMonth.toISOString().split('T')[0];
        const end = today.toISOString().split('T')[0];

        console.log(`📅 Fetching MONTH-TO-DATE costs: ${start} to ${end}`);

        // 🔒 SECURITY: Create client with user-specific credentials or default
        let clientConfig = { region: 'us-east-1' };

        if (userCredentials && userCredentials.type === 'access_key') {
            clientConfig.credentials = {
                accessKeyId: userCredentials.accessKeyId,
                secretAccessKey: userCredentials.secretAccessKey
            };
            console.log('🔐 Using user-provided AWS credentials');
        } else {
            console.log('🔄 Using default AWS credentials (environment/IAM role)');
        }

        const client = new CostExplorerClient(clientConfig);

        const params = {
            TimePeriod: { Start: start, End: end },
            Granularity: 'DAILY',
            Metrics: ['UnblendedCost', 'BlendedCost'],
            GroupBy: [
                { Type: 'DIMENSION', Key: 'SERVICE' }
            ]
        };

        try {
            const response = await client.send(new GetCostAndUsageCommand(params));

            console.log(`✅ Fetched ${response.ResultsByTime?.length || 0} days of cost data`);

            if (!response.ResultsByTime || !Array.isArray(response.ResultsByTime)) {
                console.warn('⚠️ Unexpected AWS response structure:', response);
                return {
                    success: false,
                    error: 'Invalid response from AWS Cost Explorer'
                };
            }

            return {
                success: true,
                data: response.ResultsByTime,
                period: { start, end },
                isMonthToDate: true
            };
        } catch (error) {
            console.error('❌ AWS Cost Service Error:', error);
            try {
                const structuredError = ErrorHandler.handleAwsError(error);
                return {
                    success: false,
                    error: structuredError.message,
                    errorCode: structuredError.code,
                    details: structuredError.details
                };
            } catch (handlerError) {
                console.error('Error handler failed, using fallback:', handlerError);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    static async getWeeklyCosts(userCredentials = null, customStartDate = null, customEndDate = null) {
        // Check if AWS API is enabled
        if (!this.isAwsCostExplorerEnabled()) {
            return this.getCachedDataResponse('Weekly costs from cache');
        }

        // Use provided dates or default to last 30 days
        const endDate = customEndDate || new Date();
        const startDate = customStartDate || new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));

        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];

        console.log(`📅 getWeeklyCosts: Fetching data from ${start} to ${end}`);

        // 🔒 SECURITY: Create client with user-specific credentials or default
        let clientConfig = { region: 'us-east-1' };

        if (userCredentials && userCredentials.type === 'access_key') {
            clientConfig.credentials = {
                accessKeyId: userCredentials.accessKeyId,
                secretAccessKey: userCredentials.secretAccessKey
            };
            console.log('🔐 Using user-provided AWS credentials');
        } else {
            console.log('🔄 Using default AWS credentials (environment/IAM role)');
        }

        const client = new CostExplorerClient(clientConfig);

        const params = {
            TimePeriod: { Start: start, End: end },
            Granularity: 'DAILY',
            Metrics: ['UnblendedCost'],
            GroupBy: [
                { Type: 'DIMENSION', Key: 'SERVICE' },
                { Type: 'DIMENSION', Key: 'REGION' }
            ]
        };

        try {
            const response = await client.send(new GetCostAndUsageCommand(params));

            // Add debug logging
            console.log('🔍 Raw AWS Response:', JSON.stringify(response.ResultsByTime, null, 2));

            // Validate response structure (enhanced error handling)
            if (!response.ResultsByTime || !Array.isArray(response.ResultsByTime)) {
                console.warn('⚠️ Unexpected AWS response structure:', response);
                return {
                    success: false,
                    error: 'Invalid response from AWS Cost Explorer'
                };
            }

            return {
                success: true,
                data: response.ResultsByTime,
                period: { start, end }
            };
        } catch (error) {
            // Enhanced error handling while maintaining existing response format
            console.error('❌ AWS Cost Service Error:', error);

            // Try to create a structured error
            try {
                const structuredError = ErrorHandler.handleAwsError(error);
                return {
                    success: false,
                    error: structuredError.message,
                    errorCode: structuredError.code,
                    details: structuredError.details
                };
            } catch (handlerError) {
                console.error('Error handler failed, using fallback:', handlerError);
                // Fallback to existing behavior
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // NEW: Get resource-level cost data with tags
    static async getResourceLevelCosts(userCredentials = null, days = 7) {
        // Check if AWS API is enabled
        if (!this.isAwsCostExplorerEnabled()) {
            return this.getCachedDataResponse('Resource-level costs from cache');
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];

        let clientConfig = { region: 'us-east-1' };

        if (userCredentials && userCredentials.type === 'access_key') {
            clientConfig.credentials = {
                accessKeyId: userCredentials.accessKeyId,
                secretAccessKey: userCredentials.secretAccessKey
            };
        }

        try {
            const costClient = new CostExplorerClient(clientConfig);

            // Get resource-level cost data with tag-based grouping
            const params = {
                TimePeriod: { Start: start, End: end },
                Granularity: 'DAILY',
                Metrics: ['UnblendedCost'],
                GroupBy: [
                    { Type: 'DIMENSION', Key: 'SERVICE' },
                    { Type: 'DIMENSION', Key: 'REGION' },
                    { Type: 'TAG', Key: 'CostCenter' },
                    { Type: 'TAG', Key: 'Department' },
                    { Type: 'TAG', Key: 'Project' },
                    { Type: 'TAG', Key: 'Environment' }
                ]
            };

            console.log('🔍 Fetching resource-level cost data with tags...');
            const response = await costClient.send(new GetCostAndUsageCommand(params));

            // Enhance with resource tagging compliance data
            console.log('🏷️ Fetching resource tagging compliance data...');
            const resourceData = await this.getResourceTaggingData(clientConfig);

            return {
                success: true,
                data: response.ResultsByTime,
                resourceData: resourceData,
                period: { start, end }
            };

        } catch (error) {
            console.error('❌ Resource-level cost service error:', error);
            try {
                const structuredError = ErrorHandler.handleAwsError(error);
                return {
                    success: false,
                    error: structuredError.message,
                    errorCode: structuredError.code,
                    details: structuredError.details
                };
            } catch (handlerError) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // NEW: Get resource tagging compliance data
    static async getResourceTaggingData(clientConfig) {
        try {
            const taggingClient = new ResourceGroupsTaggingAPIClient(clientConfig);

            const requiredTags = ['CostCenter', 'Department', 'Project', 'Environment'];
            const resources = [];

            // Paginate through all resources (limit to avoid timeouts)
            let paginationToken = null;
            let pageCount = 0;
            const maxPages = 5; // Limit to prevent long execution times

            do {
                const params = {
                    ResourcesPerPage: 50, // Reduced for faster response
                    PaginationToken: paginationToken
                };

                const response = await taggingClient.send(new GetResourcesCommand(params));

                if (response.ResourceTagMappingList) {
                    resources.push(...response.ResourceTagMappingList);
                }

                paginationToken = response.PaginationToken;
                pageCount++;
            } while (paginationToken && pageCount < maxPages);

            // Analyze tag compliance
            const complianceData = resources.map(resource => {
                const actualTags = resource.Tags || [];
                const actualTagKeys = actualTags.map(tag => tag.Key);
                const missingTags = requiredTags.filter(reqTag => !actualTagKeys.includes(reqTag));

                return {
                    resourceArn: resource.ResourceARN,
                    actualTags: actualTags,
                    requiredTags: requiredTags,
                    missingTags: missingTags,
                    complianceScore: Math.round(((requiredTags.length - missingTags.length) / requiredTags.length) * 100),
                    isCompliant: missingTags.length === 0
                };
            });

            return {
                totalResources: resources.length,
                compliantResources: complianceData.filter(r => r.isCompliant).length,
                compliancePercentage: resources.length > 0 ? Math.round((complianceData.filter(r => r.isCompliant).length / resources.length) * 100) : 0,
                resources: complianceData.slice(0, 20), // Limit response size
                scannedPages: pageCount
            };

        } catch (error) {
            console.error('❌ Resource tagging data error:', error);
            return {
                totalResources: 0,
                compliantResources: 0,
                compliancePercentage: 0,
                resources: [],
                error: error.message,
                scannedPages: 0
            };
        }
    }

    // NEW: Get tag compliance summary for dashboard
    static async getTagComplianceSummary(userCredentials = null) {
        // Check if AWS API is enabled
        if (!this.isAwsCostExplorerEnabled()) {
            return this.getCachedDataResponse('Tag compliance from cache');
        }

        try {
            let clientConfig = { region: 'us-east-1' };

            if (userCredentials && userCredentials.type === 'access_key') {
                clientConfig.credentials = {
                    accessKeyId: userCredentials.accessKeyId,
                    secretAccessKey: userCredentials.secretAccessKey
                };
            }

            const resourceData = await this.getResourceTaggingData(clientConfig);

            return {
                success: true,
                summary: {
                    totalResources: resourceData.totalResources,
                    compliantResources: resourceData.compliantResources,
                    compliancePercentage: resourceData.compliancePercentage,
                    nonCompliantResources: resourceData.totalResources - resourceData.compliantResources
                },
                topMissingTags: this.getTopMissingTags(resourceData.resources)
            };

        } catch (error) {
            console.error('❌ Tag compliance summary error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper: Get most commonly missing tags
    static getTopMissingTags(resources) {
        const missingTagCounts = {};

        resources.forEach(resource => {
            resource.missingTags.forEach(tag => {
                missingTagCounts[tag] = (missingTagCounts[tag] || 0) + 1;
            });
        });

        return Object.entries(missingTagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }));
    }
}

module.exports = AwsCostService;