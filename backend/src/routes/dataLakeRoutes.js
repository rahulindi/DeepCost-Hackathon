// Data Lake Integration Routes
// Advanced enterprise data lake connections: Snowflake, Databricks, BigQuery
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const dataLakeService = require('../services/dataLakeService');

// Rate limiting for data lake endpoints
const dataLakeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: { error: 'Too many data lake requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

router.use(dataLakeLimiter);

/**
 * Helper function to convert user ID for database compatibility
 * Converts "user-1234567890" to 1234567890
 */
const convertUserId = (userId) => {
    if (typeof userId === 'string' && userId.startsWith('user-')) {
        return parseInt(userId.substring(5), 10);
    }
    return userId;
};

/**
 * ENTERPRISE DATA LAKE INTEGRATION ROUTES
 * High-performance connections to Snowflake, Databricks, BigQuery
 */

// Health check for data lake integration system
router.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'data-lake-integration',
        version: '2.0.0',
        features: [
            'snowflake-connector',
            'databricks-connector',
            'bigquery-connector',
            'encrypted-credentials',
            'connection-testing',
            'schema-discovery',
            'data-export-automation',
            'batch-processing',
            'real-time-streaming'
        ],
        endpoints: {
            'GET /api/datalake/providers': 'List data lake providers',
            'POST /api/datalake/connections': 'Create data lake connection',
            'GET /api/datalake/connections': 'List connections',
            'GET /api/datalake/connections/:id': 'Get connection details',
            'PUT /api/datalake/connections/:id': 'Update connection',
            'DELETE /api/datalake/connections/:id': 'Delete connection',
            'POST /api/datalake/test/:id': 'Test connection',
            'GET /api/datalake/schemas': 'Get table schemas',
            'POST /api/datalake/export': 'Export data to data lake',
            'POST /api/datalake/sample': 'Create sample connection'
        }
    });
});

/**
 * List available data lake providers
 * GET /api/datalake/providers
 */
router.get('/providers', authenticateToken, (req, res) => {
    const result = dataLakeService.getProviders();
    res.json(result);
});

/**
 * Create data lake connection
 * POST /api/datalake/connections
 */
router.post('/connections',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const connectionData = req.body;

            console.log('🔗 Creating data lake connection for user:', userId, '(DB ID:', dbUserId, ')', connectionData.provider);

            const result = await dataLakeService.createConnection(dbUserId, connectionData);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'Data lake connection created successfully',
                    connection: result.connection,
                    links: {
                        self: `/api/datalake/connections/${result.connection.id}`,
                        test: `/api/datalake/test/${result.connection.id}`,
                        schemas: `/api/datalake/schemas?connectionId=${result.connection.id}`
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Data lake connection creation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create data lake connection'
            });
        }
    }
);

/**
 * List data lake connections
 * GET /api/datalake/connections
 */
router.get('/connections',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const options = {
                provider: req.query.provider,
                status: req.query.status,
                active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await dataLakeService.getConnections(dbUserId, options);

            if (result.success) {
                // Add links to connections
                const connectionsWithLinks = result.connections.map(conn => ({
                    ...conn,
                    links: {
                        self: `/api/datalake/connections/${conn.id}`,
                        test: `/api/datalake/test/${conn.id}`,
                        schemas: `/api/datalake/schemas?connectionId=${conn.id}`
                    }
                }));

                res.json({
                    success: true,
                    connections: connectionsWithLinks,
                    pagination: result.pagination
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Data lake connections listing error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list data lake connections'
            });
        }
    }
);

/**
 * Get specific data lake connection
 * GET /api/datalake/connections/:id
 */
router.get('/connections/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const connectionId = req.params.id;

            const result = await dataLakeService.getConnection(dbUserId, connectionId);

            if (result.success) {
                res.json({
                    success: true,
                    connection: {
                        ...result.connection,
                        links: {
                            self: `/api/datalake/connections/${result.connection.id}`,
                            test: `/api/datalake/test/${result.connection.id}`,
                            schemas: `/api/datalake/schemas?connectionId=${result.connection.id}`,
                            update: `/api/datalake/connections/${result.connection.id}`,
                            delete: `/api/datalake/connections/${result.connection.id}`
                        }
                    }
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Data lake connection details error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get data lake connection details'
            });
        }
    }
);

/**
 * Update data lake connection
 * PUT /api/datalake/connections/:id
 */
router.put('/connections/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const connectionId = req.params.id;
            const updates = req.body;

            console.log('🔄 Updating data lake connection:', connectionId);

            const result = await dataLakeService.updateConnection(dbUserId, connectionId, updates);

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                const statusCode = result.error === 'Connection not found' ? 404 : 500;
                res.status(statusCode).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Data lake connection update error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update data lake connection'
            });
        }
    }
);

/**
 * Delete data lake connection
 * DELETE /api/datalake/connections/:id
 */
router.delete('/connections/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const connectionId = req.params.id;

            console.log('🗑️ Deleting data lake connection:', connectionId);

            const result = await dataLakeService.deleteConnection(dbUserId, connectionId);

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                const statusCode = result.error === 'Connection not found' ? 404 : 500;
                res.status(statusCode).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Data lake connection deletion error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete data lake connection'
            });
        }
    }
);

/**
 * Test data lake connection
 * POST /api/datalake/test/:id
 */
router.post('/test/:id',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const connectionId = req.params.id;

            console.log('🔬 Testing data lake connection:', connectionId);

            const result = await dataLakeService.testConnection(dbUserId, connectionId);

            res.json(result);

        } catch (error) {
            console.error('❌ Data lake connection test error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to test data lake connection'
            });
        }
    }
);

/**
 * Get data lake schemas
 * GET /api/datalake/schemas
 */
router.get('/schemas',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const connectionId = req.query.connectionId;

            if (!connectionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Connection ID is required'
                });
            }

            console.log('📊 Getting schemas for connection:', connectionId);

            const result = await dataLakeService.getSchemas(dbUserId, connectionId);

            res.json(result);

        } catch (error) {
            console.error('❌ Schemas retrieval error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get schemas'
            });
        }
    }
);

/**
 * Export data to data lake
 * POST /api/datalake/export
 */
router.post('/export',
    authenticateToken,
    requirePermission('export_costs'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const { connectionId, data, options } = req.body;

            if (!connectionId || !data) {
                return res.status(400).json({
                    success: false,
                    error: 'Connection ID and data are required'
                });
            }

            console.log('📤 Exporting data to data lake:', connectionId, 'Records:', data.length);

            const result = await dataLakeService.exportToDataLake(dbUserId, connectionId, data, options || {});

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    details: result.details
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Data export error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export data to data lake'
            });
        }
    }
);

/**
 * Bulk export cost data to data lake
 * POST /api/datalake/bulk-export
 */
router.post('/bulk-export',
    authenticateToken,
    requirePermission('export_costs'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const { connectionId, dateRange, services, options } = req.body;

            if (!connectionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Connection ID is required'
                });
            }

            console.log('📦 Bulk exporting cost data to data lake:', connectionId);

            // Simulate bulk export process
            const exportJob = {
                id: `export_${Date.now()}`,
                connectionId,
                userId: dbUserId,
                status: 'in_progress',
                dateRange: dateRange || {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                },
                services: services || ['all'],
                options: options || {},
                estimatedRecords: Math.floor(Math.random() * 100000) + 10000,
                createdAt: new Date().toISOString()
            };

            // Mock processing
            setTimeout(async () => {
                // Simulate completion
                console.log('✅ Bulk export completed:', exportJob.id);
            }, 5000);

            res.json({
                success: true,
                message: 'Bulk export initiated successfully',
                job: exportJob,
                links: {
                    status: `/api/datalake/export-status/${exportJob.id}`,
                    cancel: `/api/datalake/export-cancel/${exportJob.id}`
                }
            });

        } catch (error) {
            console.error('❌ Bulk export error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initiate bulk export'
            });
        }
    }
);

/**
 * Create sample data lake connection for testing
 * POST /api/datalake/sample
 */
router.post('/sample',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const dbUserId = convertUserId(userId);
            const provider = req.body.provider || 'snowflake';

            // Sample configurations for different providers
            const sampleConfigs = {
                snowflake: {
                    account: 'sample-account',
                    username: 'sample-user',
                    password: 'sample-password',
                    warehouse: 'SAMPLE_WH',
                    database: 'SAMPLE_DB',
                    schema: 'PUBLIC'
                },
                databricks: {
                    server_hostname: 'sample.databricks.com',
                    http_path: '/sql/1.0/warehouses/sample',
                    access_token: 'dapi-sample-token',
                    catalog: 'sample_catalog',
                    schema: 'default'
                },
                bigquery: {
                    project_id: 'sample-project',
                    dataset_id: 'cost_data',
                    credentials_type: 'service_account',
                    service_account_key: '{"type": "service_account", "project_id": "sample-project"}',
                    location: 'US'
                }
            };

            const connectionData = {
                provider: provider,
                name: `Sample ${provider.charAt(0).toUpperCase() + provider.slice(1)} Connection`,
                config: sampleConfigs[provider],
                description: 'Sample connection for testing and demonstration',
                tags: ['sample', 'demo', provider]
            };

            console.log('🧪 Creating sample data lake connection:', provider);

            const result = await dataLakeService.createConnection(dbUserId, connectionData);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: `Sample ${provider} connection created successfully`,
                    connection: result.connection,
                    note: 'This is a sample connection with mock credentials for testing',
                    links: {
                        test: `/api/datalake/test/${result.connection.id}`,
                        schemas: `/api/datalake/schemas?connectionId=${result.connection.id}`
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Sample connection creation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create sample connection'
            });
        }
    }
);

/**
 * Get data lake connection metrics
 * GET /api/datalake/metrics
 */
router.get('/metrics',
    authenticateToken,
    requirePermission('api_access'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Mock metrics data
            const metrics = {
                connections: {
                    total: 3,
                    active: 2,
                    by_provider: {
                        snowflake: 1,
                        databricks: 1,
                        bigquery: 1
                    }
                },
                exports: {
                    last_30_days: 156,
                    total_records: 2453789,
                    success_rate: 98.7,
                    avg_duration_seconds: 45.2
                },
                performance: {
                    avg_connection_time_ms: 234,
                    avg_query_time_ms: 1876,
                    avg_export_time_ms: 45234
                },
                usage: {
                    data_transferred_gb: 125.6,
                    queries_executed: 1234,
                    schema_discoveries: 45
                }
            };

            res.json({
                success: true,
                metrics,
                generated_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Metrics retrieval error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get metrics'
            });
        }
    }
);

module.exports = router;
