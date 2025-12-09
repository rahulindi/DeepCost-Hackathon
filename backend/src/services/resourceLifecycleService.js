const AWS = require('aws-sdk');
const DatabaseService = require('./databaseService');
const SchedulingService = require('./schedulingService');
const RightsizingService = require('./rightsizingService');
const OrphanDetectionService = require('./orphanDetectionService');
const cron = require('node-cron');

class ResourceLifecycleService {
    constructor() {
        this.schedulingService = new SchedulingService();
        this.rightsizingService = new RightsizingService();
        this.orphanDetectionService = new OrphanDetectionService();
        this.scheduledTasks = new Map();
        this.initializeAutomation();
    }

    /**
     * Initialize automated lifecycle management
     */
    initializeAutomation() {
        console.log('🔄 Initializing Resource Lifecycle Management...');
        
        // Schedule daily orphan detection at 2 AM UTC
        cron.schedule('0 2 * * *', async () => {
            console.log('🔍 Running daily orphaned resource detection...');
            await this.runOrphanDetection();
        });

        // Schedule rightsizing analysis every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            console.log('📊 Running rightsizing analysis...');
            await this.runRightsizingAnalysis();
        });

        // Process scheduled resource actions every minute
        cron.schedule('* * * * *', async () => {
            await this.processScheduledActions();
        });

        console.log('✅ Resource Lifecycle automation initialized');
    }

    /**
     * RESOURCE SCHEDULING METHODS
     */

    async scheduleResourceAction(resourceId, action, schedule, userId) {
        try {
            console.log(`📅 Attempting to schedule ${action} for resource ${resourceId} by user ${userId}`);
            
            // CRITICAL: Validate user has AWS credentials BEFORE creating schedule
            const AwsCredentialsService = require('./awsCredentialsService');
            const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
                ? parseInt(userId.substring(5), 10)
                : userId;
            
            console.log(`🔑 Checking AWS credentials for user ${userId} (DB ID: ${dbUserId})...`);
            const credentialsCheck = await AwsCredentialsService.getCredentials(dbUserId);
            
            if (!credentialsCheck || !credentialsCheck.success) {
                console.error(`❌ User ${userId} has no AWS credentials configured`);
                return {
                    success: false,
                    error: 'AWS credentials not configured. Please configure your AWS credentials in Settings before scheduling resource actions.',
                    errorCode: 'NO_AWS_CREDENTIALS'
                };
            }

            console.log(`✅ AWS credentials verified for user ${userId}`);

            const scheduleData = {
                resource_id: resourceId,
                schedule_name: schedule.name || `${action}_${resourceId}`,
                schedule_type: action,
                cron_expression: schedule.cronExpression,
                timezone: schedule.timezone || 'UTC',
                is_active: true,
                created_by: userId,
                metadata: JSON.stringify(schedule.metadata || {})
            };

            const scheduleId = await DatabaseService.query(
                `INSERT INTO resource_schedules 
                 (resource_id, schedule_name, schedule_type, cron_expression, timezone, is_active, created_by, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [scheduleData.resource_id, scheduleData.schedule_name, scheduleData.schedule_type, 
                 scheduleData.cron_expression, scheduleData.timezone, scheduleData.is_active, 
                 scheduleData.created_by, scheduleData.metadata]
            );

            // Register the cron job
            this.registerCronJob(scheduleId.rows[0].id, scheduleData);

            console.log(`✅ Schedule created successfully with ID: ${scheduleId.rows[0].id}`);
            return {
                success: true,
                scheduleId: scheduleId.rows[0].id,
                message: `Resource ${action} scheduled successfully`
            };
        } catch (error) {
            console.error('❌ Error scheduling resource action:', error);
            return {
                success: false,
                error: error.message || 'Failed to schedule resource action'
            };
        }
    }

    async getScheduledActions(filters = {}) {
        try {
            let query = `
                SELECT rs.*, rl.resource_type, rl.service_name, rl.region
                FROM resource_schedules rs
                LEFT JOIN resource_lifecycle rl ON rs.resource_id = rl.resource_id
                WHERE rs.is_active = true
            `;
            const params = [];

            // 🔒 SECURITY: Filter by user ID (CRITICAL!)
            if (filters.userId) {
                const dbUserId = DatabaseService.getUserIdForDatabase(filters.userId);
                params.push(dbUserId);
                query += ` AND rs.created_by = $${params.length}`;
                console.log(`🔒 Filtering scheduled actions by userId: ${filters.userId} (DB: ${dbUserId}, type: ${typeof dbUserId})`);
            }

            if (filters.resourceId) {
                params.push(filters.resourceId);
                query += ` AND rs.resource_id = $${params.length}`;
            }

            if (filters.scheduleType) {
                params.push(filters.scheduleType);
                query += ` AND rs.schedule_type = $${params.length}`;
            }

            query += ' ORDER BY rs.created_at DESC';

            const result = await DatabaseService.query(query, params);
            console.log(`📊 Found ${result.rows.length} scheduled actions${filters.userId ? ' for user ' + filters.userId : ''}`);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('❌ Error fetching scheduled actions:', error);
            throw error;
        }
    }

    async updateScheduledAction(actionId, updates, userId) {
        try {
            const { schedule, action } = updates;
            const updateFields = [];
            const params = [];
            let paramCount = 1;

            if (schedule) {
                if (schedule.name) {
                    updateFields.push(`schedule_name = $${paramCount++}`);
                    params.push(schedule.name);
                }
                if (schedule.cronExpression) {
                    updateFields.push(`cron_expression = $${paramCount++}`);
                    params.push(schedule.cronExpression);
                }
                if (schedule.timezone) {
                    updateFields.push(`timezone = $${paramCount++}`);
                    params.push(schedule.timezone);
                }
            }

            if (action) {
                updateFields.push(`schedule_type = $${paramCount++}`);
                params.push(action);
            }

            if (updateFields.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            params.push(actionId, userId);
            const query = `
                UPDATE resource_schedules 
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount++} AND created_by = $${paramCount++}
                RETURNING *
            `;

            const result = await DatabaseService.query(query, params);

            if (result.rows.length === 0) {
                return { success: false, error: 'Schedule not found or unauthorized' };
            }

            // Re-register the cron job with new schedule
            if (schedule?.cronExpression) {
                if (this.scheduledTasks.has(actionId)) {
                    this.scheduledTasks.get(actionId).destroy();
                }
                this.registerCronJob(actionId, result.rows[0]);
            }

            return { 
                success: true, 
                message: 'Scheduled action updated successfully',
                data: result.rows[0]
            };
        } catch (error) {
            console.error('❌ Error updating scheduled action:', error);
            throw error;
        }
    }

    async toggleScheduledAction(actionId, userId) {
        try {
            // Get current state
            const current = await DatabaseService.query(
                'SELECT is_active FROM resource_schedules WHERE id = $1 AND created_by = $2',
                [actionId, userId]
            );

            if (current.rows.length === 0) {
                return { success: false, error: 'Schedule not found or unauthorized' };
            }

            const newState = !current.rows[0].is_active;

            // Update state
            await DatabaseService.query(
                'UPDATE resource_schedules SET is_active = $1, updated_at = NOW() WHERE id = $2 AND created_by = $3',
                [newState, actionId, userId]
            );

            // Handle cron job
            if (newState) {
                // Re-enable: fetch full schedule data and register
                const scheduleData = await DatabaseService.query(
                    'SELECT * FROM resource_schedules WHERE id = $1',
                    [actionId]
                );
                this.registerCronJob(actionId, scheduleData.rows[0]);
            } else {
                // Disable: remove from scheduler
                if (this.scheduledTasks.has(actionId)) {
                    this.scheduledTasks.get(actionId).destroy();
                    this.scheduledTasks.delete(actionId);
                }
            }

            return { 
                success: true, 
                message: `Scheduled action ${newState ? 'resumed' : 'paused'}`,
                isActive: newState
            };
        } catch (error) {
            console.error('❌ Error toggling scheduled action:', error);
            throw error;
        }
    }

    async cancelScheduledAction(actionId, userId) {
        try {
            await DatabaseService.query(
                'UPDATE resource_schedules SET is_active = false WHERE id = $1 AND created_by = $2',
                [actionId, userId]
            );

            // Remove from cron scheduler
            if (this.scheduledTasks.has(actionId)) {
                this.scheduledTasks.get(actionId).destroy();
                this.scheduledTasks.delete(actionId);
            }

            return { success: true, message: 'Scheduled action cancelled' };
        } catch (error) {
            console.error('❌ Error cancelling scheduled action:', error);
            throw error;
        }
    }

    /**
     * RIGHTSIZING METHODS
     */

    async analyzeRightsizing(resourceId, performanceData, userId) {
        try {
            const recommendation = await this.rightsizingService.analyzeResource(resourceId, performanceData, userId);
            
            if (recommendation) {
                // Save recommendation to database
                await DatabaseService.query(
                    `INSERT INTO rightsizing_recommendations 
                     (resource_id, current_instance_type, recommended_instance_type, confidence_score, 
                      potential_savings, performance_impact, analysis_data, user_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [resourceId, recommendation.currentType, recommendation.recommendedType,
                     recommendation.confidence, recommendation.savings, recommendation.performanceImpact,
                     JSON.stringify(recommendation.analysisData), userId]
                );

                return { success: true, recommendation };
            }

            return { success: true, message: 'No rightsizing recommendation needed' };
        } catch (error) {
            console.error('❌ Error analyzing rightsizing:', error);
            throw error;
        }
    }

    async getRightsizingRecommendations(filters = {}) {
        try {
            let query = `
                SELECT rr.*, rl.service_name, rl.region, rl.account_id
                FROM rightsizing_recommendations rr
                LEFT JOIN resource_lifecycle rl ON rr.resource_id = rl.resource_id
                WHERE rr.status = 'pending'
            `;
            const params = [];

            // 🔒 SECURITY: Filter by user ID (CRITICAL!)
            if (filters.userId) {
                params.push(DatabaseService.getUserIdForDatabase(filters.userId));
                query += ` AND rr.user_id = $${params.length}`;
                console.log(`🔒 Filtering rightsizing recommendations by userId: ${filters.userId}`);
            }

            if (filters.minSavings) {
                params.push(filters.minSavings);
                query += ` AND rr.potential_savings >= $${params.length}`;
            }

            if (filters.confidenceThreshold) {
                params.push(filters.confidenceThreshold);
                query += ` AND rr.confidence_score >= $${params.length}`;
            }

            query += ' ORDER BY rr.potential_savings DESC, rr.confidence_score DESC';

            const result = await DatabaseService.query(query, params);
            console.log(`📊 Found ${result.rows.length} rightsizing recommendations${filters.userId ? ' for user ' + filters.userId : ''}`);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('❌ Error fetching rightsizing recommendations:', error);
            throw error;
        }
    }

    async applyRightsizingRecommendation(recommendationId, userId) {
        try {
            // Get recommendation details
            const recommendation = await DatabaseService.query(
                'SELECT * FROM rightsizing_recommendations WHERE id = $1',
                [recommendationId]
            );

            if (recommendation.rows.length === 0) {
                throw new Error('Recommendation not found');
            }

            const rec = recommendation.rows[0];
            
            // Apply the rightsizing through AWS API
            const result = await this.rightsizingService.applyRecommendation(rec);

            if (result.success) {
                // Update recommendation status
                await DatabaseService.query(
                    'UPDATE rightsizing_recommendations SET status = $1, applied_at = CURRENT_TIMESTAMP WHERE id = $2',
                    ['applied', recommendationId]
                );

                return { success: true, message: 'Rightsizing recommendation applied successfully' };
            }

            return { success: false, message: 'Failed to apply recommendation' };
        } catch (error) {
            console.error('❌ Error applying rightsizing recommendation:', error);
            throw error;
        }
    }

    /**
     * ORPHANED RESOURCE METHODS
     */

    async detectOrphanedResources(accountId, service = null, userId = null) {
        try {
            console.log(`🔍 Detecting orphaned resources for account ${accountId}, user ${userId}`);
            
            // CRITICAL: Pass userId to initialize AWS credentials
            const orphanedResources = await this.orphanDetectionService.detectOrphans(accountId, service, userId);
            console.log(`   AWS scan found ${orphanedResources.length} orphaned resources`);

            // Save detected orphans to database with user_id
            const dbUserId = userId ? DatabaseService.getUserIdForDatabase(userId) : null;
            console.log(`   Using DB user ID: ${dbUserId} (type: ${typeof dbUserId})`);
            
            // 🔄 STEP 1: Get list of existing resource_ids for this user (only detected/scheduled, not cleaned)
            let existingResourceIds = [];
            if (dbUserId) {
                const existing = await DatabaseService.query(
                    `SELECT resource_id 
                     FROM orphaned_resources 
                     WHERE user_id = $1 AND cleanup_status IN ('detected', 'scheduled')`,
                    [dbUserId]
                );
                existingResourceIds = existing.rows.map(row => row.resource_id);
                console.log(`   Found ${existingResourceIds.length} existing orphaned resources in database`);
            }
            
            // 🔄 STEP 2: Insert/update currently detected orphans from AWS
            console.log(`   Inserting/updating ${orphanedResources.length} detected resources...`);
            const scannedResourceIds = [];
            for (const orphan of orphanedResources) {
                try {
                    await DatabaseService.query(
                        `INSERT INTO orphaned_resources 
                         (resource_id, resource_type, service_name, region, orphan_type, last_activity, 
                          potential_savings, cleanup_risk_level, detection_metadata, user_id, cleanup_status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'detected')
                         ON CONFLICT (resource_id) DO UPDATE SET
                         detected_at = CURRENT_TIMESTAMP, 
                         cleanup_status = 'detected', 
                         user_id = $10,
                         resource_type = $2,
                         service_name = $3,
                         region = $4,
                         orphan_type = $5,
                         last_activity = $6,
                         potential_savings = $7,
                         cleanup_risk_level = $8,
                         detection_metadata = $9`,
                        [orphan.resourceId, orphan.resourceType, orphan.serviceName, orphan.region,
                         orphan.orphanType, orphan.lastActivity, orphan.potentialSavings,
                         orphan.riskLevel, JSON.stringify(orphan.metadata || {}), dbUserId]
                    );
                    scannedResourceIds.push(orphan.resourceId);
                    console.log(`      ✓ ${orphan.resourceType}: ${orphan.resourceId}`);
                } catch (insertError) {
                    console.error(`      ✗ Failed to insert ${orphan.resourceType}: ${orphan.resourceId}`, insertError.message);
                }
            }
            
            // 🧹 STEP 3: Delete resources that were in database but NOT found in AWS scan
            // (These were deleted from AWS Console or cleaned up externally)
            if (dbUserId && existingResourceIds.length > 0) {
                const resourcesToDelete = existingResourceIds.filter(id => !scannedResourceIds.includes(id));
                
                if (resourcesToDelete.length > 0) {
                    console.log(`   Found ${resourcesToDelete.length} resources to clean up (no longer in AWS)`);
                    
                    const cleanupResult = await DatabaseService.query(
                        `DELETE FROM orphaned_resources 
                         WHERE user_id = $1 
                         AND resource_id = ANY($2::varchar[])
                         AND cleanup_status IN ('detected', 'scheduled')
                         RETURNING resource_id, resource_type`,
                        [dbUserId, resourcesToDelete]
                    );
                    
                    if (cleanupResult.rowCount > 0) {
                        console.log(`🧹 Cleaned up ${cleanupResult.rowCount} resolved orphaned resources (deleted externally):`);
                        cleanupResult.rows.forEach(row => {
                            console.log(`   - ${row.resource_type}: ${row.resource_id}`);
                        });
                    }
                } else {
                    console.log(`   No stale resources to clean up - all database records match AWS`);
                }
            }

            return { success: true, detected: orphanedResources.length, data: orphanedResources };
        } catch (error) {
            console.error('❌ Error detecting orphaned resources:', error);
            throw error;
        }
    }

    async getOrphanedResources(filters = {}) {
        try {
            let query = `
                SELECT * FROM orphaned_resources
                WHERE cleanup_status IN ('detected', 'scheduled')
            `;
            const params = [];

            // 🔒 SECURITY: Filter by user ID (CRITICAL!)
            if (filters.userId) {
                params.push(DatabaseService.getUserIdForDatabase(filters.userId));
                query += ` AND user_id = $${params.length}`;
                console.log(`🔒 Filtering orphaned resources by userId: ${filters.userId}`);
            }

            if (filters.service) {
                params.push(filters.service);
                query += ` AND service_name = $${params.length}`;
            }

            if (filters.orphanType) {
                params.push(filters.orphanType);
                query += ` AND orphan_type = $${params.length}`;
            }

            if (filters.minSavings) {
                params.push(filters.minSavings);
                query += ` AND potential_savings >= $${params.length}`;
            }

            query += ' ORDER BY potential_savings DESC, detected_at DESC';

            const result = await DatabaseService.query(query, params);
            console.log(`📊 Found ${result.rows.length} orphaned resources${filters.userId ? ' for user ' + filters.userId : ''}`);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('❌ Error fetching orphaned resources:', error);
            throw error;
        }
    }

    async cleanupOrphanedResource(resourceId, force = false, userId) {
        try {
            console.log(`🧹 Cleanup request for resource: ${resourceId} by user: ${userId}`);
            
            const orphanData = await DatabaseService.query(
                'SELECT * FROM orphaned_resources WHERE resource_id = $1',
                [resourceId]
            );

            if (orphanData.rows.length === 0) {
                throw new Error('Orphaned resource not found');
            }

            const orphan = orphanData.rows[0];
            console.log(`   Resource type: ${orphan.resource_type}`);
            console.log(`   Risk level: ${orphan.cleanup_risk_level}`);

            // Safety check for high-risk resources
            if (orphan.cleanup_risk_level === 'high' && !force) {
                return {
                    success: false,
                    message: 'High-risk resource requires force flag for cleanup',
                    riskLevel: orphan.cleanup_risk_level
                };
            }

            // CRITICAL: Pass userId to cleanup so it can initialize AWS credentials
            const cleanupResult = await this.orphanDetectionService.cleanupResource(orphan, userId);

            if (cleanupResult.success) {
                // Update status
                await DatabaseService.query(
                    'UPDATE orphaned_resources SET cleanup_status = $1, cleaned_at = CURRENT_TIMESTAMP WHERE resource_id = $2',
                    ['cleaned', resourceId]
                );

                return { success: true, message: 'Resource cleaned up successfully' };
            }

            return { success: false, message: 'Cleanup failed', error: cleanupResult.error };
        } catch (error) {
            console.error('❌ Error cleaning up orphaned resource:', error);
            throw error;
        }
    }

    /**
     * AUTOMATION METHODS
     */

    async runOrphanDetection() {
        try {
            console.log('🔍 Running automated orphan detection...');
            
            // Get all AWS accounts from credentials
            const accounts = await this.getMonitoredAccounts();
            
            let totalOrphans = 0;
            for (const account of accounts) {
                const result = await this.detectOrphanedResources(account.accountId);
                totalOrphans += result.detected;
            }

            console.log(`✅ Orphan detection complete: ${totalOrphans} orphans detected`);
            return { success: true, totalOrphans };
        } catch (error) {
            console.error('❌ Automated orphan detection failed:', error);
            return { success: false, error: error.message };
        }
    }

    async runRightsizingAnalysis() {
        try {
            console.log('📊 Running automated rightsizing analysis...');
            
            const accounts = await this.getMonitoredAccounts();
            let totalRecommendations = 0;

            for (const account of accounts) {
                const resources = await this.getActiveResources(account.accountId);
                
                for (const resource of resources) {
                    const performanceData = await this.rightsizingService.getPerformanceMetrics(resource.resourceId);
                    const result = await this.analyzeRightsizing(resource.resourceId, performanceData, 1); // System user ID
                    
                    if (result.success && result.recommendation) {
                        totalRecommendations++;
                    }
                }
            }

            console.log(`✅ Rightsizing analysis complete: ${totalRecommendations} recommendations generated`);
            return { success: true, totalRecommendations };
        } catch (error) {
            console.error('❌ Automated rightsizing analysis failed:', error);
            return { success: false, error: error.message };
        }
    }

    async processScheduledActions() {
        try {
            const currentTime = new Date();
            const activeSchedules = await DatabaseService.query(
                'SELECT * FROM resource_schedules WHERE is_active = true'
            );

            for (const schedule of activeSchedules.rows) {
                if (this.shouldExecuteSchedule(schedule, currentTime)) {
                    await this.executeScheduledAction(schedule);
                }
            }
        } catch (error) {
            console.error('❌ Error processing scheduled actions:', error);
        }
    }

    /**
     * UTILITY METHODS
     */

    async updateResourceLifecycleStage(resourceId, stage, userId) {
        try {
            await DatabaseService.query(
                `INSERT INTO resource_lifecycle (resource_id, lifecycle_stage, user_id, updated_at)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                 ON CONFLICT (resource_id) DO UPDATE SET
                 lifecycle_stage = $2, updated_at = CURRENT_TIMESTAMP`,
                [resourceId, stage, userId]
            );
        } catch (error) {
            console.error('❌ Error updating resource lifecycle stage:', error);
        }
    }

    registerCronJob(scheduleId, scheduleData) {
        try {
            const task = cron.schedule(scheduleData.cron_expression, async () => {
                await this.executeScheduledAction(scheduleData);
            }, {
                scheduled: true,
                timezone: scheduleData.timezone
            });

            this.scheduledTasks.set(scheduleId, task);
        } catch (error) {
            console.error('❌ Error registering cron job:', error);
        }
    }

    async executeScheduledAction(schedule) {
        try {
            console.log(`⚡ Executing scheduled action: ${schedule.schedule_type} for ${schedule.resource_id}`);
            
            // Parse metadata and add userId from schedule
            let metadata = {};
            if (schedule.metadata) {
                // Check if metadata is already an object or needs parsing
                if (typeof schedule.metadata === 'string') {
                    try {
                        metadata = JSON.parse(schedule.metadata);
                    } catch (e) {
                        console.warn('⚠️ Failed to parse metadata, using empty object:', e.message);
                        metadata = {};
                    }
                } else if (typeof schedule.metadata === 'object') {
                    metadata = schedule.metadata;
                }
            }
            metadata.userId = schedule.created_by; // Pass user ID for AWS credentials
            
            const result = await this.schedulingService.executeAction(
                schedule.resource_id,
                schedule.schedule_type,
                metadata
            );

            if (result.success) {
                console.log(`✅ Scheduled action completed: ${schedule.schedule_name}`);
            } else {
                console.error(`❌ Scheduled action failed: ${schedule.schedule_name}`, result.error);
            }
        } catch (error) {
            console.error('❌ Error executing scheduled action:', error);
        }
    }

    shouldExecuteSchedule(schedule, currentTime) {
        // This is a simplified check - in production you'd use a proper cron parser
        // For now, we'll rely on the cron jobs we register
        return false; // Handled by registered cron jobs
    }

    async getMonitoredAccounts() {
        // This should return the AWS accounts being monitored
        // For now, return a default account
        return [{ accountId: 'default' }];
    }

    async getActiveResources(accountId) {
        try {
            const result = await DatabaseService.query(
                `SELECT DISTINCT resource_id, resource_type, service_name, region 
                 FROM resource_lifecycle 
                 WHERE lifecycle_stage = 'active' AND account_id = $1`,
                [accountId]
            );
            return result.rows;
        } catch (error) {
            console.error('❌ Error fetching active resources:', error);
            return [];
        }
    }

    /**
     * ANALYTICS AND REPORTING
     */

    async getLifecycleAnalytics(timeframe = '30d') {
        try {
            const result = await DatabaseService.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE lifecycle_stage = 'active') as active_resources,
                    COUNT(*) FILTER (WHERE lifecycle_stage = 'scheduled') as scheduled_resources,
                    COUNT(*) FILTER (WHERE lifecycle_stage = 'orphaned') as orphaned_resources,
                    COUNT(*) FILTER (WHERE lifecycle_stage = 'terminated') as terminated_resources,
                    SUM(COALESCE((SELECT potential_savings FROM rightsizing_recommendations rr WHERE rr.resource_id = rl.resource_id LIMIT 1), 0)) as potential_rightsizing_savings,
                    SUM(COALESCE((SELECT potential_savings FROM orphaned_resources orph WHERE orph.resource_id = rl.resource_id LIMIT 1), 0)) as potential_cleanup_savings
                FROM resource_lifecycle rl
                WHERE created_at >= NOW() - INTERVAL '${timeframe.replace('d', ' days')}'
            `);

            return { success: true, analytics: result.rows[0] };
        } catch (error) {
            console.error('❌ Error fetching lifecycle analytics:', error);
            throw error;
        }
    }
}

module.exports = ResourceLifecycleService;
