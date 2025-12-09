const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const DatabaseService = require('./databaseService');

/**
 * Advanced Export Service with job scheduling and data lake integration
 * Extends existing ExportService with enterprise features
 */
class AdvancedExportService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.jobsDir = path.join(this.dataDir, 'export-jobs');
        this.outputsDir = path.join(this.jobsDir, 'outputs');
        this.jobsFile = path.join(this.jobsDir, 'jobs.json');

        this.activeJobs = new Map(); // Running jobs
        this.scheduledJobs = new Map(); // Cron jobs

        this.ensureDirectories();
        this.loadJobs();
        this.startScheduler();
    }

    /**
     * Ensure required directories exist
     */
    ensureDirectories() {
        [this.dataDir, this.jobsDir, this.outputsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('📁 Created directory:', dir);
            }
        });
    }

    /**
     * Load jobs from persistent storage
     */
    loadJobs() {
        try {
            if (fs.existsSync(this.jobsFile)) {
                const data = fs.readFileSync(this.jobsFile, 'utf8');
                const jobs = JSON.parse(data);
                console.log(`📊 Loaded ${jobs.length} export jobs from storage`);
                return jobs;
            }
        } catch (error) {
            console.error('❌ Error loading export jobs:', error);
        }
        return [];
    }

    /**
     * Save jobs to persistent storage
     */
    saveJobs(jobs) {
        try {
            fs.writeFileSync(this.jobsFile, JSON.stringify(jobs, null, 2));
        } catch (error) {
            console.error('❌ Error saving export jobs:', error);
        }
    }

    /**
     * Create new export job
     */
    async createJob(userId, jobConfig) {
        try {
            // Validate job configuration
            const validation = this.validateJobConfig(jobConfig);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            const jobId = uuidv4();
            const now = new Date().toISOString();

            const job = {
                id: jobId,
                userId: userId,
                name: jobConfig.name || `Export Job ${jobId.substring(0, 8)}`,
                type: jobConfig.type || 'csv',
                status: 'pending',
                schedule: jobConfig.schedule || { type: 'one-time' },
                filters: jobConfig.filters || {},
                output: {
                    format: jobConfig.output?.format || 'csv',
                    columns: jobConfig.output?.columns || ['service', 'cost', 'date'],
                    delivery: jobConfig.output?.delivery || { type: 'download' }
                },
                dataLake: jobConfig.dataLake || null,
                created_at: now,
                updated_at: now,
                next_run: jobConfig.schedule?.type === 'recurring' ?
                    this.calculateNextRun(jobConfig.schedule) : now,
                attempts: 0,
                max_attempts: jobConfig.max_attempts || 3
            };

            // Save job
            const jobs = this.loadJobs();
            jobs.push(job);
            this.saveJobs(jobs);

            // Schedule if recurring
            if (job.schedule.type === 'recurring' && job.schedule.cron) {
                this.scheduleJob(job);
            }

            // Execute immediately if one-time
            if (job.schedule.type === 'one-time') {
                setImmediate(() => this.executeJob(jobId));
            }

            console.log('✅ Export job created:', jobId);
            return { success: true, job };

        } catch (error) {
            console.error('❌ Error creating export job:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * List export jobs with filtering and pagination
     */
    async getJobs(userId, options = {}) {
        try {
            const jobs = this.loadJobs();
            let userJobs = jobs.filter(job => job.userId === userId);

            // Apply filters
            if (options.status) {
                userJobs = userJobs.filter(job => job.status === options.status);
            }
            if (options.type) {
                userJobs = userJobs.filter(job => job.type === options.type);
            }

            // Apply pagination
            const page = parseInt(options.page) || 1;
            const limit = parseInt(options.limit) || 20;
            const offset = (page - 1) * limit;

            const paginatedJobs = userJobs.slice(offset, offset + limit);

            return {
                success: true,
                jobs: paginatedJobs,
                pagination: {
                    page,
                    limit,
                    total: userJobs.length,
                    totalPages: Math.ceil(userJobs.length / limit)
                }
            };

        } catch (error) {
            console.error('❌ Error getting export jobs:', error);
            return { success: false, error: error.message, jobs: [] };
        }
    }

    /**
     * Get specific job details
     */
    async getJob(userId, jobId) {
        try {
            const jobs = this.loadJobs();
            const job = jobs.find(j => j.id === jobId && j.userId === userId);

            if (!job) {
                return { success: false, error: 'Job not found' };
            }

            return { success: true, job };
        } catch (error) {
            console.error('❌ Error getting export job:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cancel or delete export job
     */
    async deleteJob(userId, jobId) {
        try {
            console.log(`🔍 Attempting to delete job ${jobId} for user ${userId}`);

            const jobs = this.loadJobs();
            console.log(`📊 Total jobs in storage: ${jobs.length}`);

            // Find job by ID first, then check user
            const job = jobs.find(j => j.id === jobId);

            if (!job) {
                console.log(`❌ Job ${jobId} not found in storage`);
                console.log(`   Available job IDs: ${jobs.map(j => j.id).join(', ')}`);
                return { success: false, error: 'Job not found' };
            }

            console.log(`✅ Found job ${jobId}, owner: ${job.userId}, requesting user: ${userId}`);

            // Check if user owns this job (compare as numbers)
            const jobUserId = typeof job.userId === 'string' ? parseInt(job.userId) : job.userId;
            const requestUserId = typeof userId === 'string' ? parseInt(userId) : userId;

            if (jobUserId !== requestUserId) {
                console.log(`❌ User ${requestUserId} does not own job ${jobId} (owner: ${jobUserId})`);
                return { success: false, error: 'Job not found or access denied' };
            }

            // Find index for removal
            const jobIndex = jobs.findIndex(j => j.id === jobId);

            // Cancel if running
            if (this.activeJobs.has(jobId)) {
                this.activeJobs.delete(jobId);
                console.log(`   Cancelled active job`);
            }

            // Remove from scheduled jobs
            if (this.scheduledJobs.has(jobId)) {
                this.scheduledJobs.get(jobId).destroy();
                this.scheduledJobs.delete(jobId);
                console.log(`   Removed scheduled job`);
            }

            // Delete output file if exists
            if (job.output_file && require('fs').existsSync(job.output_file)) {
                require('fs').unlinkSync(job.output_file);
                console.log(`   Deleted output file: ${job.output_file}`);
            }

            // Remove from storage
            jobs.splice(jobIndex, 1);
            this.saveJobs(jobs);

            console.log(`✅ Export job deleted successfully: ${jobId}`);
            return { success: true, message: 'Job deleted successfully' };

        } catch (error) {
            console.error('❌ Error deleting export job:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute export job
     */
    async executeJob(jobId) {
        try {
            const jobs = this.loadJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);

            if (jobIndex === -1) {
                console.error('❌ Job not found for execution:', jobId);
                return;
            }

            const job = jobs[jobIndex];

            // Update job status
            job.status = 'running';
            job.attempts = (job.attempts || 0) + 1;
            job.updated_at = new Date().toISOString();
            this.saveJobs(jobs);

            this.activeJobs.set(jobId, { startTime: Date.now() });

            console.log('🔄 Executing export job:', jobId, job.name);

            // Generate export data
            const exportData = await this.generateExportData(job);

            if (!exportData.success) {
                throw new Error(exportData.error);
            }

            // Create output file
            const outputResult = await this.saveExportOutput(job, exportData.data);

            if (!outputResult.success) {
                throw new Error(outputResult.error);
            }

            // Update job with completion
            job.status = 'completed';
            job.completed_at = new Date().toISOString();
            job.output_file = outputResult.filePath;
            job.output_size = outputResult.size;

            // Handle delivery
            if (job.output.delivery.type !== 'download') {
                await this.handleDelivery(job, outputResult.filePath);
            }

            // Schedule next run if recurring
            if (job.schedule.type === 'recurring') {
                job.next_run = this.calculateNextRun(job.schedule);
            }

            this.saveJobs(jobs);
            this.activeJobs.delete(jobId);

            console.log('✅ Export job completed:', jobId);

            // Emit webhook event
            this.emitWebhookEvent('cost.export.completed', { job });

        } catch (error) {
            console.error('❌ Export job failed:', jobId, error);

            // Update job with failure
            const jobs = this.loadJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);

            if (jobIndex >= 0) {
                const job = jobs[jobIndex];
                job.status = 'failed';
                job.error = error.message;
                job.updated_at = new Date().toISOString();

                // Retry if under limit
                if (job.attempts < job.max_attempts) {
                    job.status = 'pending';
                    setTimeout(() => this.executeJob(jobId), 60000); // Retry in 1 minute
                }

                this.saveJobs(jobs);
            }

            this.activeJobs.delete(jobId);

            // Emit webhook event
            this.emitWebhookEvent('cost.export.failed', { job: jobs[jobIndex], error: error.message });
        }
    }

    /**
     * Generate export data based on job configuration
     */
    async generateExportData(job) {
        try {
            // Get cost data based on filters
            const costData = await this.getCostDataForJob(job);

            if (!costData.success) {
                return costData;
            }

            return {
                success: true,
                data: costData.data,
                metadata: {
                    recordCount: costData.data.length,
                    generatedAt: new Date().toISOString(),
                    filters: job.filters
                }
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get cost data for export job
     */
    async getCostDataForJob(job) {
        try {
            console.log(`📊 Getting data for export type: ${job.type}`);

            // Route to appropriate data generator based on job type
            switch (job.type) {
                case 'cost_summary':
                    return await this.getCostSummaryData(job);
                case 'resource_usage':
                    return await this.getResourceUsageData(job);
                case 'budget_analysis':
                    return await this.getBudgetAnalysisData(job);
                case 'custom_report':
                    return await this.getCustomReportData(job);
                default:
                    return await this.getCostSummaryData(job); // Default fallback
            }

        } catch (error) {
            console.error('❌ Error getting cost data for job:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Cost Summary data - aggregated by service
     */
    async getCostSummaryData(job) {
        try {
            const filters = job.filters;
            const userId = job.userId;

            const query = `
                SELECT 
                    service_name,
                    SUM(cost_amount) as total_cost,
                    COUNT(*) as record_count,
                    MIN(date) as first_date,
                    MAX(date) as last_date,
                    AVG(cost_amount) as avg_cost
                FROM cost_records
                WHERE user_id = $1
                ${filters.dateRange?.start ? 'AND date >= $2' : ''}
                ${filters.dateRange?.end ? 'AND date <= $3' : ''}
                GROUP BY service_name
                ORDER BY total_cost DESC
            `;

            const params = [userId];
            if (filters.dateRange?.start) params.push(filters.dateRange.start);
            if (filters.dateRange?.end) params.push(filters.dateRange.end);

            const result = await DatabaseService.query(query, params);

            const transformedData = result.rows.map(row => ({
                service: row.service_name,
                total_cost: parseFloat(row.total_cost || 0).toFixed(2),
                record_count: row.record_count,
                avg_cost: parseFloat(row.avg_cost || 0).toFixed(4),
                first_date: row.first_date ? new Date(row.first_date).toISOString().split('T')[0] : '',
                last_date: row.last_date ? new Date(row.last_date).toISOString().split('T')[0] : ''
            }));

            return { success: true, data: transformedData };
        } catch (error) {
            console.error('❌ Error getting cost summary:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Resource Usage data - detailed by date and service
     */
    async getResourceUsageData(job) {
        try {
            const filters = job.filters;
            const userId = job.userId;

            const query = `
                SELECT 
                    date,
                    service_name,
                    cost_amount,
                    cost_center,
                    department,
                    project
                FROM cost_records
                WHERE user_id = $1
                ${filters.dateRange?.start ? 'AND date >= $2' : ''}
                ${filters.dateRange?.end ? 'AND date <= $3' : ''}
                ORDER BY date DESC, cost_amount DESC
                LIMIT 10000
            `;

            const params = [userId];
            if (filters.dateRange?.start) params.push(filters.dateRange.start);
            if (filters.dateRange?.end) params.push(filters.dateRange.end);

            const result = await DatabaseService.query(query, params);

            const transformedData = result.rows.map(row => ({
                date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
                service: row.service_name,
                cost: parseFloat(row.cost_amount || 0).toFixed(2),
                cost_center: row.cost_center || 'Unallocated',
                department: row.department || 'Unallocated',
                project: row.project || 'Unallocated'
            }));

            return { success: true, data: transformedData };
        } catch (error) {
            console.error('❌ Error getting resource usage:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Budget Analysis data - monthly aggregation
     */
    async getBudgetAnalysisData(job) {
        try {
            const filters = job.filters;
            const userId = job.userId;

            const query = `
                SELECT 
                    TO_CHAR(date, 'YYYY-MM') as month,
                    service_name,
                    SUM(cost_amount) as monthly_cost,
                    COUNT(*) as record_count
                FROM cost_records
                WHERE user_id = $1
                ${filters.dateRange?.start ? 'AND date >= $2' : ''}
                ${filters.dateRange?.end ? 'AND date <= $3' : ''}
                GROUP BY TO_CHAR(date, 'YYYY-MM'), service_name
                ORDER BY month DESC, monthly_cost DESC
            `;

            const params = [userId];
            if (filters.dateRange?.start) params.push(filters.dateRange.start);
            if (filters.dateRange?.end) params.push(filters.dateRange.end);

            const result = await DatabaseService.query(query, params);

            const transformedData = result.rows.map(row => ({
                month: row.month,
                service: row.service_name,
                monthly_cost: parseFloat(row.monthly_cost || 0).toFixed(2),
                record_count: row.record_count,
                daily_average: (parseFloat(row.monthly_cost || 0) / 30).toFixed(2)
            }));

            return { success: true, data: transformedData };
        } catch (error) {
            console.error('❌ Error getting budget analysis:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Custom Report data - flexible columns
     */
    async getCustomReportData(job) {
        try {
            const filters = job.filters;
            const userId = job.userId;

            const query = `
                SELECT 
                    date,
                    service_name,
                    cost_amount,
                    cost_center,
                    department,
                    project,
                    environment,
                    team
                FROM cost_records
                WHERE user_id = $1
                ${filters.dateRange?.start ? 'AND date >= $2' : ''}
                ${filters.dateRange?.end ? 'AND date <= $3' : ''}
                ORDER BY date DESC, cost_amount DESC
                LIMIT 10000
            `;

            const params = [userId];
            if (filters.dateRange?.start) params.push(filters.dateRange.start);
            if (filters.dateRange?.end) params.push(filters.dateRange.end);

            const result = await DatabaseService.query(query, params);

            // Transform based on requested columns
            const transformedData = result.rows.map(record => {
                const row = {};
                const columns = job.output.columns || ['service', 'cost', 'date'];

                columns.forEach(column => {
                    switch (column) {
                        case 'service':
                            row.service = record.service_name || 'Unknown';
                            break;
                        case 'cost':
                            row.cost = parseFloat(record.cost_amount || 0).toFixed(2);
                            break;
                        case 'date':
                            row.date = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
                            break;
                        case 'cost_center':
                            row.cost_center = record.cost_center || 'Unallocated';
                            break;
                        case 'department':
                            row.department = record.department || 'Unallocated';
                            break;
                        case 'project':
                            row.project = record.project || 'Unallocated';
                            break;
                        case 'environment':
                            row.environment = record.environment || 'Unallocated';
                            break;
                        case 'team':
                            row.team = record.team || 'Unallocated';
                            break;
                        default:
                            if (record[column] !== undefined) {
                                row[column] = record[column];
                            }
                    }
                });
                return row;
            });

            return { success: true, data: transformedData };
        } catch (error) {
            console.error('❌ Error getting custom report:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save export output to file
     */
    async saveExportOutput(job, data) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${job.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${job.output.format}`;
            const filePath = path.join(this.outputsDir, filename);

            let content;

            switch (job.output.format) {
                case 'csv':
                    content = this.formatAsCSV(data, job.output.columns);
                    break;
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    break;
                default:
                    throw new Error(`Unsupported format: ${job.output.format}`);
            }

            fs.writeFileSync(filePath, content, 'utf8');
            const stats = fs.statSync(filePath);

            return {
                success: true,
                filePath: filePath,
                filename: filename,
                size: stats.size
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Format data as CSV
     */
    formatAsCSV(data, columns) {
        if (data.length === 0) return '';

        // FIX: Use actual columns from data, not job.output.columns
        // This allows each export type to have its own column structure
        const actualColumns = data.length > 0 ? Object.keys(data[0]) : columns;

        const header = actualColumns.join(',') + '\n';
        const rows = data.map(row =>
            actualColumns.map(col => `"${(row[col] || '').toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        return header + rows;
    }

    /**
     * Validate job configuration
     */
    validateJobConfig(config) {
        if (!config) {
            return { valid: false, error: 'Job configuration is required' };
        }

        if (config.schedule?.type === 'recurring' && !config.schedule.cron) {
            return { valid: false, error: 'Cron expression required for recurring jobs' };
        }

        const format = config.output?.format || config.type || 'csv';
        if (!['csv', 'json', 'parquet', 'xlsx'].includes(format)) {
            return { valid: false, error: `Invalid export format: ${format}` };
        }

        return { valid: true };
    }

    /**
     * Calculate next run time for recurring jobs
     */
    calculateNextRun(schedule) {
        if (schedule.type !== 'recurring' || !schedule.cron) {
            return null;
        }

        // Simple next run calculation - in production use proper cron parser
        const now = new Date();
        now.setHours(now.getHours() + 1); // Next hour as default
        return now.toISOString();
    }

    /**
     * Schedule recurring job
     */
    scheduleJob(job) {
        if (!job.schedule.cron) return;

        try {
            const task = cron.schedule(job.schedule.cron, () => {
                console.log('⏰ Executing scheduled job:', job.id, job.name);
                this.executeJob(job.id);
            }, {
                scheduled: true,
                timezone: job.schedule.timezone || 'UTC'
            });

            this.scheduledJobs.set(job.id, task);
            console.log('📅 Scheduled recurring job:', job.id, job.schedule.cron);

        } catch (error) {
            console.error('❌ Error scheduling job:', error);
        }
    }

    /**
     * Start scheduler for existing recurring jobs
     */
    startScheduler() {
        const jobs = this.loadJobs();
        const recurringJobs = jobs.filter(job =>
            job.schedule.type === 'recurring' &&
            job.status !== 'cancelled' &&
            job.schedule.cron
        );

        recurringJobs.forEach(job => {
            this.scheduleJob(job);
        });

        console.log(`📅 Started scheduler with ${recurringJobs.length} recurring jobs`);
    }

    /**
     * Handle export delivery
     */
    async handleDelivery(job, filePath) {
        try {
            switch (job.output.delivery.type) {
                case 'email':
                    await this.deliverViaEmail(job, filePath);
                    break;
                case 'webhook':
                    await this.deliverViaWebhook(job, filePath);
                    break;
                case 'data-lake':
                    await this.deliverToDataLake(job, filePath);
                    break;
            }
        } catch (error) {
            console.error('❌ Export delivery failed:', error);
        }
    }

    /**
     * Deliver export via email
     */
    async deliverViaEmail(job, filePath) {
        // Integration with email service
        console.log('📧 Email delivery not implemented yet:', job.output.delivery.config.email);
    }

    /**
     * Deliver export via webhook
     */
    async deliverViaWebhook(job, filePath) {
        // Integration with webhook service
        console.log('🔗 Webhook delivery not implemented yet:', job.output.delivery.config.url);
    }

    /**
     * Deliver export to data lake
     */
    async deliverToDataLake(job, filePath) {
        // Integration with data lake adapters
        console.log('🏗️ Data lake delivery not implemented yet:', job.dataLake.provider);
    }

    /**
     * Emit webhook event
     */
    emitWebhookEvent(eventType, payload) {
        try {
            // Integration with existing webhook service
            const WebhookService = require('./webhookService');
            WebhookService.sendWebhook(eventType, payload);
        } catch (error) {
            console.error('❌ Error emitting webhook event:', error);
        }
    }

    /**
     * Download export file
     */
    async downloadExport(userId, jobId) {
        try {
            const jobResult = await this.getJob(userId, jobId);

            if (!jobResult.success) {
                return jobResult;
            }

            const job = jobResult.job;

            if (job.status !== 'completed' || !job.output_file) {
                return { success: false, error: 'Export not available for download' };
            }

            if (!fs.existsSync(job.output_file)) {
                return { success: false, error: 'Export file not found' };
            }

            return {
                success: true,
                filePath: job.output_file,
                filename: path.basename(job.output_file),
                size: job.output_size
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get export statistics
     */
    async getStats(userId) {
        try {
            const jobs = this.loadJobs();
            const userJobs = jobs.filter(job => job.userId === userId);

            const stats = {
                total: userJobs.length,
                pending: userJobs.filter(j => j.status === 'pending').length,
                running: userJobs.filter(j => j.status === 'running').length,
                completed: userJobs.filter(j => j.status === 'completed').length,
                failed: userJobs.filter(j => j.status === 'failed').length,
                recurring: userJobs.filter(j => j.schedule.type === 'recurring').length
            };

            return { success: true, stats };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Download export job output
     */
    async downloadJob(jobId, userId) {
        try {
            const jobs = this.loadJobs();
            const job = jobs.find(j => j.id === jobId && j.userId === userId);

            if (!job) {
                return { success: false, error: 'Job not found' };
            }

            if (job.status !== 'completed') {
                return { success: false, error: `Job is ${job.status}, not ready for download` };
            }

            if (!job.output_file || !fs.existsSync(job.output_file)) {
                return { success: false, error: 'Export file not found' };
            }

            const data = fs.readFileSync(job.output_file, 'utf8');
            const filename = path.basename(job.output_file);

            const contentTypes = {
                'csv': 'text/csv',
                'json': 'application/json',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            return {
                success: true,
                data: data,
                filename: filename,
                contentType: contentTypes[job.output.format] || 'application/octet-stream'
            };

        } catch (error) {
            console.error('❌ Error downloading export job:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AdvancedExportService();
