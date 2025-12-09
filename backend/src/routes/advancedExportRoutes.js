const express = require('express');
const exportService = require('../services/advancedExportService'); // This is already an instance
const DatabaseService = require('../services/databaseService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Helper function to convert user ID for database compatibility
 */
const convertUserId = (userId) => {
  if (typeof userId === 'string' && userId.startsWith('user-')) {
    return parseInt(userId.substring(5), 10);
  }
  return userId;
};

// 🔒 SECURITY: Test route removed - was exposing data without authentication
// If debugging is needed, use authenticated endpoints with proper user context

// Health check for export system
router.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'advanced-export-system',
        version: '2.0.0',
        features: [
            'scheduled-exports',
            'custom-report-builder', 
            'data-lake-integration',
            'webhook-delivery',
            'multiple-formats'
        ],
        endpoints: {
            'POST /api/export/jobs': 'Create export job',
            'GET /api/export/jobs': 'List export jobs', 
            'GET /api/export/jobs/:id': 'Get job details',
            'DELETE /api/export/jobs/:id': 'Cancel/delete job',
            'GET /api/export/jobs/:id/download': 'Download export',
            'POST /api/export/jobs/:id/retry': 'Retry failed job',
            'GET /api/export/stats': 'Export statistics'
        },
        formats: ['csv', 'json', 'parquet'],
        delivery_methods: ['download', 'email', 'webhook', 'data-lake'],
        data_lakes: ['snowflake', 'databricks', 'bigquery']
    });
});

/**
 * List export jobs with pagination and filtering
 * GET /api/export/jobs
 */
router.get('/jobs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        
        console.log(`🔍 Getting export jobs for user: ${userId} (DB ID: ${dbUserId})`);
        
        const options = {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
            type: req.query.type
        };

        const result = await exportService.getJobs(dbUserId, options);
        
        if (result.success) {
            res.json({
                success: true,
                jobs: result.jobs.map(job => ({
                    ...job,
                    links: {
                        self: `/api/export/jobs/${job.id}`,
                        download: job.status === 'completed' ? 
                            `/api/export/jobs/${job.id}/download` : null
                    }
                })),
                pagination: result.pagination
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Export jobs listing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list export jobs'
        });
    }
});

/**
 * Create new export job
 * POST /api/export/jobs
 */
router.post('/jobs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const jobConfig = req.body;

        console.log(`📊 Creating export job for user: ${userId} (DB ID: ${dbUserId})`);

        const result = await exportService.createJob(dbUserId, jobConfig);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Export job created successfully',
                job: result.job,
                links: {
                    self: `/api/export/jobs/${result.job.id}`,
                    download: result.job.status === 'completed' ? 
                        `/api/export/jobs/${result.job.id}/download` : null
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Export job creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create export job'
        });
    }
});

/**
 * Download completed export
 * GET /api/export/jobs/:id/download
 */
router.get('/jobs/:id/download', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const jobId = req.params.id;

        console.log(`📥 Downloading export job ${jobId} for user: ${userId} (DB ID: ${dbUserId})`);

        const result = await exportService.downloadJob(jobId, dbUserId);
        
        if (result.success) {
            res.setHeader('Content-Type', result.contentType || 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.data);
        } else {
            res.status(404).json({
                success: false,
                error: result.error || 'Export job not found or not ready'
            });
        }

    } catch (error) {
        console.error('❌ Export download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download export'
        });
    }
});

/**
 * Delete export job
 * DELETE /api/export/jobs/:id
 */
router.delete('/jobs/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUserId = convertUserId(userId);
        const jobId = req.params.id;

        console.log(`🗑️ Deleting export job ${jobId} for user: ${userId} (DB ID: ${dbUserId})`);

        const result = await exportService.deleteJob(dbUserId, jobId);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Export job deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error || 'Export job not found'
            });
        }

    } catch (error) {
        console.error('❌ Export delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete export job'
        });
    }
});

module.exports = router;
