// Cost Allocation Service - handles automated cost allocation based on tags and rules
const DatabaseService = require('./databaseService');

class CostAllocationService {
    // Apply allocation rules to cost data
    static async applyCostAllocationRules(costData, userId) {
        try {
            console.log('🎯 Applying cost allocation rules...');

            // Get active allocation rules for the user
            const rules = await this.getAllocationRules(userId);

            const allocatedCosts = [];

            for (const costRecord of costData) {
                let allocated = false;

                // Sort rules by priority (lower number = higher priority)
                const sortedRules = rules.sort((a, b) => a.priority - b.priority);

                for (const rule of sortedRules) {
                    if (this.matchesRule(costRecord, rule)) {
                        const allocatedRecord = {
                            ...costRecord,
                            cost_center: rule.allocation_target.cost_center || null,
                            department: rule.allocation_target.department || null,
                            project: rule.allocation_target.project || null,
                            environment: rule.allocation_target.environment || null,
                            team: rule.allocation_target.team || null,
                            business_unit: rule.allocation_target.business_unit || null
                        };

                        allocatedCosts.push(allocatedRecord);
                        allocated = true;
                        break; // First matching rule wins (priority-based)
                    }
                }

                // If no rule matched, add with default allocations
                if (!allocated) {
                    allocatedCosts.push({
                        ...costRecord,
                        cost_center: 'unassigned',
                        department: 'unassigned',
                        project: 'unassigned',
                        environment: 'production', // Default assumption
                        team: 'unassigned',
                        business_unit: 'unassigned'
                    });
                }
            }

            console.log(`✅ Allocated ${allocatedCosts.length} cost records`);
            return allocatedCosts;

        } catch (error) {
            console.error('❌ Cost allocation error:', error);
            // Return original data if allocation fails
            return costData || [];
        }
    }

    // Check if cost record matches allocation rule
    static matchesRule(costRecord, rule) {
        const condition = rule.condition_json;

        switch (rule.rule_type) {
            case 'service_based':
                return this.matchServiceRule(costRecord, condition);
            case 'region_based':
                return this.matchRegionRule(costRecord, condition);
            case 'tag_based':
                return this.matchTagRule(costRecord, condition);
            default:
                return false;
        }
    }

    // Match service-based rules
    static matchServiceRule(costRecord, condition) {
        if (condition.services && Array.isArray(condition.services)) {
            return condition.services.some(service =>
                costRecord.service_name.toLowerCase().includes(service.toLowerCase())
            );
        }
        return false;
    }

    // Match region-based rules
    static matchRegionRule(costRecord, condition) {
        if (condition.regions && Array.isArray(condition.regions)) {
            return condition.regions.includes(costRecord.region);
        }
        return false;
    }

    // Match tag-based rules
    static matchTagRule(costRecord, condition) {
        if (!costRecord.tags || !condition.tags) return false;

        // Check if all required tags match
        for (const [key, value] of Object.entries(condition.tags)) {
            const recordTagValue = costRecord.tags[key];
            if (!recordTagValue || recordTagValue !== value) {
                return false;
            }
        }
        return true;
    }

    // Get allocation rules from database
    static async getAllocationRules(userId) {
        try {
            // Try to get rules from database
            const dbRules = await DatabaseService.getCostAllocationRules(userId);

            // If we have rules from database, return them
            if (dbRules && dbRules.length > 0) {
                return dbRules;
            }
        } catch (error) {
            console.log('⚠️ Could not fetch allocation rules from database, using defaults');
        }

        // Return default rules if database is not available or has no rules
        return [
            {
                id: 1,
                rule_name: 'EC2 Production',
                rule_type: 'service_based',
                condition_json: { services: ['EC2', 'Elastic Compute'] },
                allocation_target: {
                    cost_center: 'infrastructure',
                    department: 'engineering',
                    environment: 'production'
                },
                priority: 10,
                is_active: true
            },
            {
                id: 2,
                rule_name: 'S3 Storage',
                rule_type: 'service_based',
                condition_json: { services: ['S3', 'Simple Storage'] },
                allocation_target: {
                    cost_center: 'storage',
                    department: 'engineering',
                    environment: 'production'
                },
                priority: 20,
                is_active: true
            }
        ];
    }

    // Generate chargeback report
    static async generateChargebackReport(period, reportDate, userId) {
        try {
            console.log(`📊 Generating ${period} chargeback report for ${reportDate}...`);

            // Get cost data for the period
            const costData = await this.getCostDataForPeriod(period, reportDate, userId);

            // If no data, return early
            if (!costData || costData.length === 0) {
                console.log('⚠️ No cost data found for the specified period');
                return {
                    report_period: period,
                    report_date: reportDate,
                    total_cost: 0,
                    service_breakdown: {},
                    resource_breakdown: {},
                    tag_breakdown: {},
                    user_id: userId
                };
            }

            // Group by cost center, department, etc.
            const breakdown = this.groupCostsByAllocation(costData);

            // Calculate totals
            const totalCost = costData.reduce((sum, record) => sum + parseFloat(record.cost_amount || 0), 0);

            // Create report data
            const reportData = {
                report_period: period,
                report_date: reportDate,
                total_cost: totalCost,
                service_breakdown: breakdown.services,
                resource_breakdown: breakdown.resources,
                tag_breakdown: breakdown.tags,
                user_id: userId
            };

            console.log('✅ Chargeback report generated successfully');
            return reportData;

        } catch (error) {
            console.error('❌ Chargeback report generation error:', error);
            // Return a basic report structure even if generation fails
            return {
                report_period: period,
                report_date: reportDate,
                total_cost: 0,
                service_breakdown: {},
                resource_breakdown: {},
                tag_breakdown: {},
                user_id: userId,
                error: error.message
            };
        }
    }

    // Group costs by various allocation dimensions
    static groupCostsByAllocation(costData) {
        const services = {};
        const costCenters = {};
        const departments = {};
        const projects = {};
        const resources = {};
        const tags = {};

        costData.forEach(record => {
            const cost = parseFloat(record.cost_amount || 0);

            // Group by service
            const serviceName = record.service_name || 'Unknown';
            services[serviceName] = (services[serviceName] || 0) + cost;

            // Group by cost center
            const costCenter = record.cost_center || 'unassigned';
            costCenters[costCenter] = (costCenters[costCenter] || 0) + cost;

            // Group by department
            const department = record.department || 'unassigned';
            departments[department] = (departments[department] || 0) + cost;

            // Group by project
            const project = record.project || 'unassigned';
            projects[project] = (projects[project] || 0) + cost;

            // Group by resource ID
            const resourceId = record.resource_id || 'Unknown';
            resources[resourceId] = (resources[resourceId] || 0) + cost;

            // Group by tags (if they exist)
            if (record.tags) {
                try {
                    const recordTags = typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags;
                    if (typeof recordTags === 'object' && recordTags !== null) {
                        for (const [key, value] of Object.entries(recordTags)) {
                            const tagKey = `${key}:${value}`;
                            tags[tagKey] = (tags[tagKey] || 0) + cost;
                        }
                    }
                } catch (e) {
                    console.log('⚠️ Error parsing tags for record:', record.resource_id);
                }
            }
        });

        return {
            services,
            costCenters,
            departments,
            projects,
            resources,
            tags
        };
    }

    // Get cost data for specific period (placeholder)
    static async getCostDataForPeriod(period, reportDate, userId) {
        try {
            // This will be implemented when we enhance DatabaseService
            // For now, return empty array
            console.log(`📊 Getting cost data for ${period} period: ${reportDate}`);

            // Import DatabaseService here to avoid circular dependencies
            const DatabaseService = require('./databaseService');

            // Calculate date range based on period
            let startDate, endDate;
            const reportDateTime = new Date(reportDate);

            switch (period) {
                case 'daily':
                    startDate = reportDate;
                    endDate = reportDate;
                    break;
                case 'weekly':
                    // Get the week starting from Sunday
                    const dayOfWeek = reportDateTime.getDay();
                    startDate = new Date(reportDateTime);
                    startDate.setDate(reportDateTime.getDate() - dayOfWeek);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    break;
                case 'monthly':
                    startDate = new Date(reportDateTime.getFullYear(), reportDateTime.getMonth(), 1);
                    endDate = new Date(reportDateTime.getFullYear(), reportDateTime.getMonth() + 1, 0);
                    break;
                case 'quarterly':
                    const quarter = Math.floor(reportDateTime.getMonth() / 3);
                    startDate = new Date(reportDateTime.getFullYear(), quarter * 3, 1);
                    endDate = new Date(reportDateTime.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'yearly':
                    startDate = new Date(reportDateTime.getFullYear(), 0, 1);
                    endDate = new Date(reportDateTime.getFullYear(), 11, 31);
                    break;
                default:
                    startDate = new Date(reportDateTime);
                    endDate = new Date(reportDateTime);
            }

            // Format dates as strings
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            console.log(`📅 Fetching cost data from ${startDateStr} to ${endDateStr} for user ${userId}`);

            // 🔒 SECURITY: ALWAYS include userId to prevent data leaks
            const costRecords = await DatabaseService.getCostRecords({
                startDate: startDateStr,
                endDate: endDateStr,
                userId: userId
            });

            console.log(`📊 Found ${costRecords.length} cost records for period (user: ${userId})`);
            return costRecords;
        } catch (error) {
            console.error('❌ Error getting cost data for period:', error);
            // Return empty array as fallback but log the error
            return [];
        }
    }

    // Get cost allocation summary
    static async getAllocationSummary(userId) {
        try {
            // Get recent cost data and apply allocation rules
            const costData = await this.getCostDataForPeriod('weekly', new Date().toISOString().split('T')[0], userId);
            const allocatedData = await this.applyCostAllocationRules(costData, userId);

            // Calculate summary statistics
            const summary = this.groupCostsByAllocation(allocatedData);
            const totalCost = allocatedData.reduce((sum, record) => sum + parseFloat(record.cost_amount || 0), 0);

            // Calculate allocation percentages
            const allocationPercentages = {
                assigned: allocatedData.filter(r => r.cost_center !== 'unassigned').length / allocatedData.length * 100,
                unassigned: allocatedData.filter(r => r.cost_center === 'unassigned').length / allocatedData.length * 100
            };

            return {
                success: true,
                totalCost,
                breakdown: summary,
                allocationPercentages,
                totalRecords: allocatedData.length
            };

        } catch (error) {
            console.error('❌ Allocation summary error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = CostAllocationService;