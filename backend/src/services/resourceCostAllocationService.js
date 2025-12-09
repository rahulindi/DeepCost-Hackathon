// Resource Cost Allocation Service - Real AWS Cost Explorer Integration
const AWS = require('aws-sdk');
const DatabaseService = require('./databaseService');
const SimpleAwsCredentials = require('./simpleAwsCredentials');

class ResourceCostAllocationService {
    constructor() {
        this.costExplorer = null;
        this.resourceGroupsTaggingAPI = null;
    }

    /**
     * Initialize AWS clients with user credentials
     */
    async initializeAWS(userId) {
        try {
            console.log(`🔑 ResourceCostAllocationService: Initializing AWS for user ${userId}...`);

            const dbUserId = typeof userId === 'string' && userId.startsWith('user-')
                ? parseInt(userId.substring(5), 10)
                : userId;

            const creds = SimpleAwsCredentials.get(dbUserId);
            if (creds.success) {
                AWS.config.update({
                    accessKeyId: creds.credentials.accessKeyId,
                    secretAccessKey: creds.credentials.secretAccessKey,
                    region: creds.credentials.region
                });
                console.log(`✅ AWS credentials loaded for user ${dbUserId}`);
            } else {
                console.warn(`⚠️ AWS credentials not found for user ${dbUserId}. Proceeding without explicit credentials, AWS SDK will use default chain.`);
                // AWS SDK will rely on default credential provider chain (environment variables, shared credentials file, IAM role)
            }

            this.costExplorer = new AWS.CostExplorer({ region: 'us-east-1' }); // Cost Explorer is only in us-east-1
            this.resourceGroupsTaggingAPI = new AWS.ResourceGroupsTaggingAPI();

            console.log(`✅ ResourceCostAllocationService initialized for user ${userId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AWS:', error);
            return false;
        }
    }

    /**
     * Get allocation summary - DATABASE DATA (user-isolated)
     */
    async getAllocationSummary(userId) {
        try {
            console.log(`📊 [NEW CODE v2] Getting allocation summary for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            // 🔒 SECURITY: Get cost data from DATABASE filtered by user_id
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const query = `
                SELECT 
                    SUM(cost_amount) as total_cost,
                    SUM(CASE WHEN cost_center IS NOT NULL AND cost_center != 'unassigned' THEN cost_amount ELSE 0 END) as allocated_cost,
                    SUM(CASE WHEN cost_center IS NULL OR cost_center = 'unassigned' THEN cost_amount ELSE 0 END) as unallocated_cost,
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN cost_center IS NOT NULL AND cost_center != 'unassigned' THEN 1 END) as allocated_records
                FROM cost_records
                WHERE user_id = $1
                    AND date >= $2
                    AND date <= $3
            `;

            const result = await DatabaseService.query(query, [
                dbUserId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            ]);

            const row = result.rows[0] || {};
            const totalCost = parseFloat(row.total_cost) || 0;
            const allocatedCost = parseFloat(row.allocated_cost) || 0;
            const unallocatedCost = parseFloat(row.unallocated_cost) || 0;

            const allocationPercentage = totalCost > 0 ? (allocatedCost / totalCost) * 100 : 0;
            const totalRecords = parseInt(row.total_records) || 0;
            const allocatedRecords = parseInt(row.allocated_records) || 0;

            console.log(`✅ Allocation summary for user ${userId}: $${totalCost.toFixed(2)} total, ${allocatedRecords}/${totalRecords} records allocated`);

            return {
                success: true,
                totalCost: totalCost,
                allocatedCost: allocatedCost,
                unallocatedCost: unallocatedCost,
                allocationPercentages: {
                    assigned: allocationPercentage,
                    unassigned: 100 - allocationPercentage
                },
                totalRecords: totalRecords,
                allocatedRecords: allocatedRecords,
                period: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0]
                }
            };
        } catch (error) {
            console.error('❌ Error getting allocation summary:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get tag compliance - DATABASE DATA (user-isolated)
     */
    async getTagCompliance(userId) {
        try {
            console.log(`🏷️  Getting tag compliance for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            // 🔒 SECURITY: Get tag compliance from DATABASE filtered by user_id
            const query = `
                SELECT 
                    COUNT(*) as total_resources,
                    COUNT(CASE WHEN cost_center IS NOT NULL AND cost_center != 'unassigned' THEN 1 END) as has_cost_center,
                    COUNT(CASE WHEN department IS NOT NULL AND department != 'unassigned' THEN 1 END) as has_department,
                    COUNT(CASE WHEN project IS NOT NULL AND project != 'unassigned' THEN 1 END) as has_project,
                    COUNT(CASE WHEN environment IS NOT NULL AND environment != 'unassigned' THEN 1 END) as has_environment,
                    COUNT(CASE 
                        WHEN cost_center IS NOT NULL AND cost_center != 'unassigned'
                        AND department IS NOT NULL AND department != 'unassigned'
                        AND project IS NOT NULL AND project != 'unassigned'
                        AND environment IS NOT NULL AND environment != 'unassigned'
                        THEN 1 
                    END) as fully_compliant
                FROM cost_records
                WHERE user_id = $1
                    AND date >= CURRENT_DATE - INTERVAL '30 days'
            `;

            const result = await DatabaseService.query(query, [dbUserId]);
            const row = result.rows[0] || {};

            const totalResources = parseInt(row.total_resources) || 0;
            const compliantResources = parseInt(row.fully_compliant) || 0;
            const compliancePercentage = totalResources > 0
                ? (compliantResources / totalResources) * 100
                : 0;

            // Calculate missing tags
            const missingTagsCount = {
                CostCenter: totalResources - parseInt(row.has_cost_center || 0),
                Department: totalResources - parseInt(row.has_department || 0),
                Project: totalResources - parseInt(row.has_project || 0),
                Environment: totalResources - parseInt(row.has_environment || 0)
            };

            const topMissingTags = Object.entries(missingTagsCount)
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            console.log(`✅ Tag compliance for user ${userId}: ${compliancePercentage.toFixed(1)}%`);

            return {
                success: true,
                data: {
                    summary: {
                        totalResources,
                        compliantResources,
                        nonCompliantResources: totalResources - compliantResources,
                        compliancePercentage: compliancePercentage.toFixed(1)
                    },
                    topMissingTags
                }
            };
        } catch (error) {
            console.error('❌ Error getting tag compliance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get cost breakdown by allocation - DATABASE DATA (user-isolated)
     */
    async getCostBreakdown(userId) {
        try {
            console.log(`💰 Getting cost breakdown for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            // 🔒 SECURITY: Get breakdown from DATABASE filtered by user_id
            const query = `
                SELECT 
                    COALESCE(cost_center, 'unassigned') as cost_center,
                    COALESCE(department, 'unassigned') as department,
                    COALESCE(project, 'unassigned') as project,
                    COALESCE(environment, 'unassigned') as environment,
                    SUM(cost_amount) as total_cost,
                    COUNT(*) as record_count
                FROM cost_records
                WHERE user_id = $1
                    AND date >= $2
                    AND date <= $3
                GROUP BY cost_center, department, project, environment
                ORDER BY total_cost DESC
                LIMIT 100
            `;

            const result = await DatabaseService.query(query, [
                dbUserId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            ]);

            const breakdown = result.rows.map(row => ({
                cost_center: row.cost_center,
                department: row.department,
                project: row.project,
                environment: row.environment,
                total_cost: parseFloat(row.total_cost).toFixed(2),
                record_count: parseInt(row.record_count)
            }));

            console.log(`✅ Cost breakdown for user ${userId}: ${breakdown.length} groups`);

            return {
                success: true,
                data: breakdown
            };
        } catch (error) {
            console.error('❌ Error getting cost breakdown:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get top cost centers - DATABASE DATA (user-isolated)
     */
    async getTopCostCenters(userId, limit = 10) {
        try {
            console.log(`🏢 Getting top cost centers for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            // 🔒 SECURITY: Get top cost centers from DATABASE filtered by user_id
            const query = `
                SELECT 
                    COALESCE(cost_center, 'unassigned') as cost_center,
                    SUM(cost_amount) as total_cost,
                    COUNT(*) as resource_count,
                    COUNT(DISTINCT service_name) as service_count
                FROM cost_records
                WHERE user_id = $1
                    AND date >= $2
                    AND date <= $3
                GROUP BY cost_center
                HAVING SUM(cost_amount) > 0
                ORDER BY total_cost DESC
                LIMIT $4
            `;

            const result = await DatabaseService.query(query, [
                dbUserId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                limit
            ]);

            const costCenters = result.rows.map(row => ({
                cost_center: row.cost_center,
                total_cost: parseFloat(row.total_cost).toFixed(2),
                resource_count: parseInt(row.resource_count),
                service_count: parseInt(row.service_count)
            }));

            console.log(`✅ Top ${costCenters.length} cost centers for user ${userId}`);

            return {
                success: true,
                data: costCenters
            };
        } catch (error) {
            console.error('❌ Error getting top cost centers:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create allocation rule - DATABASE
     */
    async createAllocationRule(ruleData, userId) {
        try {
            console.log(`📝 Creating allocation rule for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            const result = await DatabaseService.query(
                `INSERT INTO cost_allocation_rules 
                 (rule_name, rule_type, condition_json, allocation_target, priority, is_active, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    ruleData.rule_name,
                    ruleData.rule_type,
                    JSON.stringify(ruleData.condition_json),
                    JSON.stringify(ruleData.allocation_target),
                    ruleData.priority || 100,
                    true,
                    dbUserId
                ]
            );

            return {
                success: true,
                data: result.rows[0]
            };
        } catch (error) {
            console.error('❌ Error creating allocation rule:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get allocation rules - DATABASE
     */
    async getAllocationRules(userId) {
        try {
            console.log(`📋 Getting allocation rules for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            const result = await DatabaseService.query(
                `SELECT * FROM cost_allocation_rules 
                 WHERE user_id = $1 
                 ORDER BY priority DESC, created_at DESC`,
                [dbUserId]
            );

            return {
                success: true,
                data: result.rows
            };
        } catch (error) {
            console.error('❌ Error getting allocation rules:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate chargeback report - REAL AWS DATA + DATABASE
     */
    async generateChargebackReport(reportData, userId) {
        try {
            console.log(`📊 Generating chargeback report for user ${userId}`);

            if (!this.costExplorer) {
                const initSuccess = await this.initializeAWS(userId);
                if (!initSuccess) {
                    return { success: false, error: 'AWS credentials not configured. Please connect your AWS account.' };
                }
            }

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            // Calculate date range based on period
            const reportDate = new Date(reportData.report_date);
            let startDate, endDate;

            switch (reportData.period) {
                case 'daily':
                    startDate = new Date(reportDate);
                    endDate = new Date(reportDate);
                    endDate.setDate(endDate.getDate() + 1);
                    break;
                case 'weekly':
                    startDate = new Date(reportDate);
                    startDate.setDate(startDate.getDate() - 7);
                    endDate = new Date(reportDate);
                    break;
                case 'monthly':
                    startDate = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
                    endDate = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);
                    break;
                case 'quarterly':
                    const quarter = Math.floor(reportDate.getMonth() / 3);
                    startDate = new Date(reportDate.getFullYear(), quarter * 3, 1);
                    endDate = new Date(reportDate.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'yearly':
                    startDate = new Date(reportDate.getFullYear(), 0, 1);
                    endDate = new Date(reportDate.getFullYear(), 11, 31);
                    break;
                default:
                    startDate = new Date(reportDate);
                    endDate = new Date(reportDate);
            }

            // Get cost data from AWS
            const params = {
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                },
                Granularity: 'MONTHLY',
                Metrics: ['UnblendedCost'],
                GroupBy: [
                    {
                        Type: 'TAG',
                        Key: 'CostCenter'
                    },
                    {
                        Type: 'TAG',
                        Key: 'Department'
                    }
                ]
            };

            const costData = await this.costExplorer.getCostAndUsage(params).promise();
            let totalCost = 0;

            if (costData.ResultsByTime && costData.ResultsByTime.length > 0) {
                costData.ResultsByTime.forEach(result => {
                    result.Groups.forEach(group => {
                        totalCost += parseFloat(group.Metrics.UnblendedCost.Amount);
                    });
                });
            }

            // Save report to database
            const result = await DatabaseService.query(
                `INSERT INTO chargeback_reports 
                 (report_period, report_date, cost_center, department, total_cost, service_breakdown, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    reportData.period,
                    reportDate,
                    null, // All cost centers
                    null, // All departments
                    totalCost,
                    JSON.stringify(costData), // Store in service_breakdown column
                    dbUserId
                ]
            );

            return {
                success: true,
                data: result.rows[0]
            };
        } catch (error) {
            console.error('❌ Error generating chargeback report:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get chargeback reports - DATABASE
     */
    async getChargebackReports(userId) {
        try {
            console.log(`📋 Getting chargeback reports for user ${userId}`);

            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            const result = await DatabaseService.query(
                `SELECT * FROM chargeback_reports 
                 WHERE user_id = $1 
                 ORDER BY report_date DESC, created_at DESC
                 LIMIT 50`,
                [dbUserId]
            );

            return {
                success: true,
                data: result.rows
            };
        } catch (error) {
            console.error('❌ Error getting chargeback reports:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete a chargeback report
    async deleteChargebackReport(reportId, userId) {
        try {
            console.log(`🗑️ Deleting chargeback report ${reportId} for user ${userId}`);
            const dbUserId = DatabaseService.getUserIdForDatabase(userId);
            const result = await DatabaseService.query(
                `DELETE FROM chargeback_reports WHERE id = $1 AND user_id = $2 RETURNING id`,
                [reportId, dbUserId]
            );
            if (result.rowCount > 0) {
                return { success: true, message: 'Report deleted' };
            } else {
                return { success: false, error: 'Report not found or not authorized' };
            }
        } catch (error) {
            console.error('❌ Error deleting chargeback report:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk delete cost breakdown records
     */
    async bulkDeleteCostBreakdown(breakdownCriteria, userId) {
        try {
            console.log(`🗑️ Bulk deleting cost breakdown records for user ${userId}`);
            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            let totalDeleted = 0;

            // Delete records for each breakdown criteria
            for (const criteria of breakdownCriteria) {
                const query = `
                    DELETE FROM cost_records 
                    WHERE user_id = $1
                        AND COALESCE(cost_center, 'unassigned') = $2
                        AND COALESCE(department, 'unassigned') = $3
                        AND COALESCE(project, 'unassigned') = $4
                        AND COALESCE(environment, 'unassigned') = $5
                    RETURNING id
                `;

                const result = await DatabaseService.query(query, [
                    dbUserId,
                    criteria.cost_center,
                    criteria.department,
                    criteria.project,
                    criteria.environment
                ]);

                totalDeleted += result.rowCount;
                console.log(`   Deleted ${result.rowCount} records for ${criteria.cost_center}/${criteria.department}/${criteria.project}/${criteria.environment}`);
            }

            console.log(`✅ Total deleted: ${totalDeleted} cost records`);

            return {
                success: true,
                deletedCount: totalDeleted,
                message: `Successfully deleted ${totalDeleted} cost record(s) from ${breakdownCriteria.length} breakdown group(s)`
            };
        } catch (error) {
            console.error('❌ Error bulk deleting cost breakdown:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Download cost breakdown records as Excel
     */
    async downloadCostBreakdown(breakdownCriteria, userId) {
        try {
            console.log(`📥 Downloading cost breakdown records for user ${userId}`);
            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            const allRecords = [];

            // Fetch records for each breakdown criteria
            for (const criteria of breakdownCriteria) {
                const query = `
                    SELECT 
                        id,
                        date,
                        service_name,
                        resource_id,
                        cost_amount,
                        COALESCE(cost_center, 'unassigned') as cost_center,
                        COALESCE(department, 'unassigned') as department,
                        COALESCE(project, 'unassigned') as project,
                        COALESCE(environment, 'unassigned') as environment,
                        region,
                        tags
                    FROM cost_records 
                    WHERE user_id = $1
                        AND COALESCE(cost_center, 'unassigned') = $2
                        AND COALESCE(department, 'unassigned') = $3
                        AND COALESCE(project, 'unassigned') = $4
                        AND COALESCE(environment, 'unassigned') = $5
                    ORDER BY date DESC, cost_amount DESC
                    LIMIT 1000
                `;

                const result = await DatabaseService.query(query, [
                    dbUserId,
                    criteria.cost_center,
                    criteria.department,
                    criteria.project,
                    criteria.environment
                ]);

                allRecords.push(...result.rows);
            }

            if (allRecords.length === 0) {
                return {
                    success: false,
                    error: 'No records found for the selected breakdown criteria'
                };
            }

            // Generate Excel file
            const XLSX = require('xlsx');
            
            // Prepare data for Excel
            const excelData = allRecords.map(record => ({
                'Record ID': record.id,
                'Date': new Date(record.date).toLocaleDateString(),
                'Service': record.service_name,
                'Resource ID': record.resource_id,
                'Cost': `$${parseFloat(record.cost_amount).toFixed(2)}`,
                'Cost Center': record.cost_center,
                'Department': record.department,
                'Project': record.project,
                'Environment': record.environment,
                'Region': record.region || 'N/A',
                'Tags': record.tags ? JSON.stringify(record.tags) : 'N/A'
            }));

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 10 },  // Record ID
                { wch: 12 },  // Date
                { wch: 20 },  // Service
                { wch: 25 },  // Resource ID
                { wch: 12 },  // Cost
                { wch: 15 },  // Cost Center
                { wch: 15 },  // Department
                { wch: 15 },  // Project
                { wch: 15 },  // Environment
                { wch: 15 },  // Region
                { wch: 30 }   // Tags
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Breakdown');

            // Generate buffer
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            console.log(`✅ Generated Excel file with ${allRecords.length} cost records`);

            return {
                success: true,
                data: buffer
            };
        } catch (error) {
            console.error('❌ Error downloading cost breakdown:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Bulk delete chargeback reports
     */
    async bulkDeleteChargebackReports(reportIds, userId) {
        try {
            console.log(`🗑️ Bulk deleting ${reportIds.length} chargeback reports for user ${userId}`);
            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            // Use parameterized query to prevent SQL injection
            const placeholders = reportIds.map((_, index) => `$${index + 2}`).join(',');
            const query = `DELETE FROM chargeback_reports 
                          WHERE id IN (${placeholders}) 
                          AND user_id = $1 
                          RETURNING id`;

            const result = await DatabaseService.query(query, [dbUserId, ...reportIds]);

            console.log(`✅ Deleted ${result.rowCount} reports`);

            return {
                success: true,
                deletedCount: result.rowCount,
                message: `Successfully deleted ${result.rowCount} report(s)`
            };
        } catch (error) {
            console.error('❌ Error bulk deleting chargeback reports:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Download chargeback reports as Excel
     */
    async downloadChargebackReports(reportIds, userId) {
        try {
            console.log(`📥 Downloading ${reportIds.length} chargeback reports for user ${userId}`);
            const dbUserId = DatabaseService.getUserIdForDatabase(userId);

            // Get the reports
            const placeholders = reportIds.map((_, index) => `$${index + 2}`).join(',');
            const query = `SELECT * FROM chargeback_reports 
                          WHERE id IN (${placeholders}) 
                          AND user_id = $1 
                          ORDER BY report_date DESC`;

            const result = await DatabaseService.query(query, [dbUserId, ...reportIds]);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'No reports found or not authorized'
                };
            }

            // Generate Excel file
            const XLSX = require('xlsx');
            
            // Prepare data for Excel
            const excelData = result.rows.map(report => ({
                'Report ID': report.id,
                'Period': report.report_period,
                'Report Date': new Date(report.report_date).toLocaleDateString(),
                'Cost Center': report.cost_center || 'All',
                'Department': report.department || 'All',
                'Project': report.project || 'All',
                'Team': report.team || 'All',
                'Business Unit': report.business_unit || 'All',
                'Total Cost': `$${parseFloat(report.total_cost).toFixed(2)}`,
                'Created At': new Date(report.created_at).toLocaleString()
            }));

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 10 },  // Report ID
                { wch: 12 },  // Period
                { wch: 15 },  // Report Date
                { wch: 15 },  // Cost Center
                { wch: 15 },  // Department
                { wch: 15 },  // Project
                { wch: 15 },  // Team
                { wch: 15 },  // Business Unit
                { wch: 15 },  // Total Cost
                { wch: 20 }   // Created At
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Chargeback Reports');

            // Generate buffer
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            console.log(`✅ Generated Excel file with ${result.rows.length} reports`);

            return {
                success: true,
                data: buffer
            };
        } catch (error) {
            console.error('❌ Error downloading chargeback reports:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ResourceCostAllocationService;
