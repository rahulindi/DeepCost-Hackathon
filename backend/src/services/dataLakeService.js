const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Data Lake Integration Service
 * Provides pluggable adapters for enterprise data lakes
 * Supports Snowflake, Databricks, BigQuery with secure connection management
 */
class DataLakeService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.connectionsDir = path.join(this.dataDir, 'data-lake-connections');
        this.connectionsFile = path.join(this.connectionsDir, 'connections.json');
        
        this.ensureDirectories();
        this.initializeAdapters();
    }

    /**
     * Ensure required directories exist
     */
    ensureDirectories() {
        [this.dataDir, this.connectionsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('📁 Created data lake directory:', dir);
            }
        });
    }

    /**
     * Initialize data lake adapters
     */
    initializeAdapters() {
        this.adapters = {
            snowflake: new SnowflakeAdapter(),
            databricks: new DatabricksAdapter(),
            bigquery: new BigQueryAdapter()
        };

        this.providers = {
            snowflake: {
                name: 'Snowflake',
                description: 'Cloud data platform for analytics workloads',
                features: ['SQL Interface', 'Auto-scaling', 'Time Travel', 'Secure Data Sharing'],
                connectionFields: [
                    { name: 'account', type: 'string', required: true, description: 'Snowflake account identifier' },
                    { name: 'username', type: 'string', required: true, description: 'Username for authentication' },
                    { name: 'password', type: 'password', required: true, description: 'Password for authentication' },
                    { name: 'warehouse', type: 'string', required: true, description: 'Warehouse name' },
                    { name: 'database', type: 'string', required: true, description: 'Database name' },
                    { name: 'schema', type: 'string', required: false, description: 'Schema name (default: PUBLIC)' },
                    { name: 'role', type: 'string', required: false, description: 'Role name' }
                ],
                status: 'available'
            },
            databricks: {
                name: 'Databricks',
                description: 'Unified analytics platform for big data and machine learning',
                features: ['Apache Spark', 'MLflow', 'Delta Lake', 'Collaborative Notebooks'],
                connectionFields: [
                    { name: 'server_hostname', type: 'string', required: true, description: 'Databricks server hostname' },
                    { name: 'http_path', type: 'string', required: true, description: 'HTTP path for cluster/SQL warehouse' },
                    { name: 'access_token', type: 'password', required: true, description: 'Personal access token' },
                    { name: 'catalog', type: 'string', required: false, description: 'Unity Catalog name' },
                    { name: 'schema', type: 'string', required: false, description: 'Schema name (default: default)' }
                ],
                status: 'available'
            },
            bigquery: {
                name: 'Google BigQuery',
                description: 'Serverless, highly scalable data warehouse',
                features: ['Serverless', 'Machine Learning', 'Real-time Analytics', 'Geospatial Analysis'],
                connectionFields: [
                    { name: 'project_id', type: 'string', required: true, description: 'Google Cloud project ID' },
                    { name: 'dataset_id', type: 'string', required: true, description: 'BigQuery dataset ID' },
                    { name: 'credentials_type', type: 'select', required: true, options: ['service_account', 'oauth'], description: 'Authentication method' },
                    { name: 'service_account_key', type: 'textarea', required: false, description: 'Service account JSON key (if using service account)' },
                    { name: 'location', type: 'string', required: false, description: 'Data location (default: US)' }
                ],
                status: 'available'
            }
        };

        console.log('🏗️ Data lake adapters initialized:', Object.keys(this.adapters).join(', '));
    }

    /**
     * Get available data lake providers
     */
    getProviders() {
        return {
            success: true,
            providers: this.providers
        };
    }

    /**
     * Create data lake connection
     */
    async createConnection(userId, connectionData) {
        try {
            const connectionId = uuidv4();
            const now = new Date().toISOString();
            
            // Validate provider
            if (!this.adapters[connectionData.provider]) {
                return {
                    success: false,
                    error: `Unsupported data lake provider: ${connectionData.provider}`
                };
            }

            // Validate required fields
            const provider = this.providers[connectionData.provider];
            const requiredFields = provider.connectionFields.filter(field => field.required);
            const missingFields = requiredFields.filter(field => 
                !connectionData.config || !connectionData.config[field.name]
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: `Missing required fields: ${missingFields.map(f => f.name).join(', ')}`
                };
            }

            // Encrypt sensitive configuration
            const encryptedConfig = this.encryptConfig(connectionData.config);

            const connection = {
                id: connectionId,
                userId: userId,
                name: connectionData.name || `${provider.name} Connection`,
                provider: connectionData.provider,
                config: encryptedConfig,
                status: 'created',
                isActive: connectionData.isActive !== false,
                metadata: {
                    created_at: now,
                    updated_at: now,
                    last_tested: null,
                    last_sync: null,
                    total_exports: 0,
                    last_export_size: null
                },
                tags: connectionData.tags || [],
                description: connectionData.description || ''
            };

            // Save connection
            const connections = this.loadConnections();
            connections.push(connection);
            this.saveConnections(connections);

            console.log('✅ Data lake connection created:', connectionId, provider.name);

            // Return connection without sensitive config
            const sanitized = { ...connection };
            sanitized.config = this.sanitizeConfig(connection.config);

            return {
                success: true,
                connection: sanitized
            };

        } catch (error) {
            console.error('❌ Error creating data lake connection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load connections from file storage
     */
    loadConnections() {
        try {
            if (fs.existsSync(this.connectionsFile)) {
                const data = fs.readFileSync(this.connectionsFile, 'utf8');
                const connections = JSON.parse(data);
                return connections;
            }
        } catch (error) {
            console.error('❌ Error loading connections:', error);
        }
        return [];
    }

    /**
     * Save connections to file storage
     */
    saveConnections(connections) {
        try {
            fs.writeFileSync(this.connectionsFile, JSON.stringify(connections, null, 2));
        } catch (error) {
            console.error('❌ Error saving connections:', error);
        }
    }

    /**
     * Get user connections
     */
    async getConnections(userId, options = {}) {
        try {
            let connections = this.loadConnections()
                .filter(conn => conn.userId === userId);

            // Apply filters
            if (options.provider) {
                connections = connections.filter(conn => conn.provider === options.provider);
            }
            if (options.status) {
                connections = connections.filter(conn => conn.status === options.status);
            }
            if (options.active !== undefined) {
                connections = connections.filter(conn => conn.isActive === options.active);
            }

            // Apply pagination
            const page = parseInt(options.page) || 1;
            const limit = parseInt(options.limit) || 20;
            const offset = (page - 1) * limit;
            const paginatedConnections = connections.slice(offset, offset + limit);

            // Sanitize configurations
            const sanitizedConnections = paginatedConnections.map(conn => ({
                ...conn,
                config: this.sanitizeConfig(conn.config)
            }));

            return {
                success: true,
                connections: sanitizedConnections,
                pagination: {
                    page,
                    limit,
                    total: connections.length,
                    totalPages: Math.ceil(connections.length / limit)
                }
            };

        } catch (error) {
            console.error('❌ Error getting connections:', error);
            return { success: false, error: error.message, connections: [] };
        }
    }

    /**
     * Get specific connection
     */
    async getConnection(userId, connectionId) {
        try {
            const connections = this.loadConnections();
            const connection = connections.find(conn => 
                conn.id === connectionId && conn.userId === userId
            );

            if (!connection) {
                return { success: false, error: 'Connection not found' };
            }

            // Sanitize configuration
            const sanitized = { ...connection };
            sanitized.config = this.sanitizeConfig(connection.config);

            return { success: true, connection: sanitized };

        } catch (error) {
            console.error('❌ Error getting connection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update data lake connection
     */
    async updateConnection(userId, connectionId, updates) {
        try {
            const connections = this.loadConnections();
            const connectionIndex = connections.findIndex(conn => 
                conn.id === connectionId && conn.userId === userId
            );

            if (connectionIndex === -1) {
                return { success: false, error: 'Connection not found' };
            }

            const connection = connections[connectionIndex];

            // Update configuration with encryption if provided
            if (updates.config) {
                updates.config = this.encryptConfig(updates.config);
            }

            // Update connection
            connections[connectionIndex] = {
                ...connection,
                ...updates,
                metadata: {
                    ...connection.metadata,
                    updated_at: new Date().toISOString()
                }
            };

            this.saveConnections(connections);

            console.log('✅ Data lake connection updated:', connectionId);

            return { 
                success: true, 
                message: 'Connection updated successfully' 
            };

        } catch (error) {
            console.error('❌ Error updating connection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete data lake connection
     */
    async deleteConnection(userId, connectionId) {
        try {
            const connections = this.loadConnections();
            const connectionIndex = connections.findIndex(conn => 
                conn.id === connectionId && conn.userId === userId
            );

            if (connectionIndex === -1) {
                return { success: false, error: 'Connection not found' };
            }

            connections.splice(connectionIndex, 1);
            this.saveConnections(connections);

            console.log('✅ Data lake connection deleted:', connectionId);

            return { 
                success: true, 
                message: 'Connection deleted successfully' 
            };

        } catch (error) {
            console.error('❌ Error deleting connection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test data lake connection
     */
    async testConnection(userId, connectionId) {
        try {
            const connectionResult = await this.getConnection(userId, connectionId);
            
            if (!connectionResult.success) {
                return connectionResult;
            }

            const connection = connectionResult.connection;
            const adapter = this.adapters[connection.provider];

            if (!adapter) {
                return {
                    success: false,
                    error: `Adapter not available for provider: ${connection.provider}`
                };
            }

            // Decrypt configuration for testing
            const decryptedConfig = this.decryptConfig(connection.config);
            
            console.log(`🔬 Testing ${connection.provider} connection:`, connection.name);

            // Test connection using adapter
            const testResult = await adapter.testConnection(decryptedConfig);

            // Update connection metadata
            const connections = this.loadConnections();
            const connectionIndex = connections.findIndex(conn => 
                conn.id === connectionId && conn.userId === userId
            );

            if (connectionIndex >= 0) {
                connections[connectionIndex].metadata.last_tested = new Date().toISOString();
                connections[connectionIndex].status = testResult.success ? 'connected' : 'error';
                this.saveConnections(connections);
            }

            return testResult;

        } catch (error) {
            console.error('❌ Error testing connection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Export data to data lake
     */
    async exportToDataLake(userId, connectionId, exportData, options = {}) {
        try {
            const connectionResult = await this.getConnection(userId, connectionId);
            
            if (!connectionResult.success) {
                return connectionResult;
            }

            const connection = connectionResult.connection;
            const adapter = this.adapters[connection.provider];

            if (!adapter) {
                return {
                    success: false,
                    error: `Adapter not available for provider: ${connection.provider}`
                };
            }

            // Decrypt configuration
            const decryptedConfig = this.decryptConfig(connection.config);
            
            console.log(`📤 Exporting to ${connection.provider}:`, connection.name);

            // Export using adapter
            const exportResult = await adapter.exportData(decryptedConfig, exportData, options);

            if (exportResult.success) {
                // Update connection metadata
                const connections = this.loadConnections();
                const connectionIndex = connections.findIndex(conn => 
                    conn.id === connectionId && conn.userId === userId
                );

                if (connectionIndex >= 0) {
                    connections[connectionIndex].metadata.last_sync = new Date().toISOString();
                    connections[connectionIndex].metadata.total_exports++;
                    connections[connectionIndex].metadata.last_export_size = exportData.length;
                    this.saveConnections(connections);
                }
            }

            return exportResult;

        } catch (error) {
            console.error('❌ Error exporting to data lake:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get data lake schemas
     */
    async getSchemas(userId, connectionId) {
        try {
            const connectionResult = await this.getConnection(userId, connectionId);
            
            if (!connectionResult.success) {
                return connectionResult;
            }

            const connection = connectionResult.connection;
            const adapter = this.adapters[connection.provider];

            if (!adapter) {
                return {
                    success: false,
                    error: `Adapter not available for provider: ${connection.provider}`
                };
            }

            // Decrypt configuration
            const decryptedConfig = this.decryptConfig(connection.config);
            
            console.log(`📋 Getting schemas from ${connection.provider}:`, connection.name);

            // Get schemas using adapter
            return await adapter.getSchemas(decryptedConfig);

        } catch (error) {
            console.error('❌ Error getting schemas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Encrypt sensitive configuration data
     * 🔒 SECURITY: Uses modern AES-256-GCM encryption with IV and auth tag
     */
    encryptConfig(config) {
        const key = this.getEncryptionKey();
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Return encrypted data with IV and auth tag
        return JSON.stringify({
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        });
    }

    /**
     * Decrypt configuration data
     * 🔒 SECURITY: Uses modern decryption with IV and auth tag verification
     * Includes backward compatibility for old encryption format
     */
    decryptConfig(encryptedData) {
        try {
            const key = this.getEncryptionKey();
            const algorithm = 'aes-256-gcm';
            
            // Try to parse as new format (JSON with iv and authTag)
            let data;
            try {
                data = JSON.parse(encryptedData);
                if (!data.iv || !data.authTag || !data.encrypted) {
                    throw new Error('Invalid format');
                }
            } catch (parseError) {
                // Old format detected - log warning and return empty config
                console.warn('⚠️  Old encryption format detected. Please re-encrypt data.');
                console.warn('   Returning empty config for security. Data needs migration.');
                return {}; // Return empty config instead of failing
            }
            
            const iv = Buffer.from(data.iv, 'hex');
            const authTag = Buffer.from(data.authTag, 'hex');
            
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('❌ Decryption failed:', error.message);
            return {}; // Return empty config on error
        }
    }

    /**
     * Get encryption key
     * 🔒 SECURITY: Requires encryption key to be set, derives proper 32-byte key
     * NOTE: Static salt is used for key derivation. The IV is randomly generated
     * per encryption operation, providing uniqueness for each encrypted value.
     */
    getEncryptionKey() {
        if (!process.env.DATA_LAKE_ENCRYPTION_KEY) {
            throw new Error('DATA_LAKE_ENCRYPTION_KEY environment variable is required');
        }
        // Derive a 32-byte key from the environment variable
        return crypto.scryptSync(process.env.DATA_LAKE_ENCRYPTION_KEY, 'datalake-salt-v1', 32);
    }

    /**
     * Sanitize configuration for client response
     */
    sanitizeConfig(config) {
        return {
            configured: true,
            fields_count: Object.keys(this.decryptConfig(config)).length,
            last_updated: new Date().toISOString()
        };
    }
}

/**
 * Snowflake Adapter
 */
class SnowflakeAdapter {
    async testConnection(config) {
        // Simulated connection test
        console.log('🔬 Testing Snowflake connection...');
        
        // In production, use actual Snowflake connector
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: 'Snowflake connection successful',
            details: {
                account: config.account,
                warehouse: config.warehouse,
                database: config.database,
                version: 'Snowflake 8.0.0 (simulated)'
            }
        };
    }

    async exportData(config, data, options) {
        console.log('📤 Exporting to Snowflake...');
        
        // Simulated export
        const tableName = options.tableName || 'aws_cost_data';
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            success: true,
            message: `Data exported to Snowflake table: ${tableName}`,
            details: {
                table: `${config.database}.${config.schema || 'PUBLIC'}.${tableName}`,
                rows_inserted: data.length,
                export_time: new Date().toISOString()
            }
        };
    }

    async getSchemas(config) {
        console.log('📋 Getting Snowflake schemas...');
        
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            schemas: [
                {
                    name: 'PUBLIC',
                    tables: ['AWS_COST_DATA', 'BUDGET_ALERTS', 'COST_FORECASTS'],
                    default: true
                },
                {
                    name: 'ANALYTICS',
                    tables: ['MONTHLY_REPORTS', 'COST_TRENDS'],
                    default: false
                }
            ]
        };
    }
}

/**
 * Databricks Adapter  
 */
class DatabricksAdapter {
    async testConnection(config) {
        console.log('🔬 Testing Databricks connection...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: 'Databricks connection successful',
            details: {
                server: config.server_hostname,
                cluster: config.http_path,
                version: 'Databricks Runtime 13.0 (simulated)'
            }
        };
    }

    async exportData(config, data, options) {
        console.log('📤 Exporting to Databricks...');
        
        const tableName = options.tableName || 'aws_cost_data';
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            success: true,
            message: `Data exported to Databricks table: ${tableName}`,
            details: {
                table: `${config.catalog || 'main'}.${config.schema || 'default'}.${tableName}`,
                rows_inserted: data.length,
                format: 'Delta Lake',
                export_time: new Date().toISOString()
            }
        };
    }

    async getSchemas(config) {
        console.log('📋 Getting Databricks schemas...');
        
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            schemas: [
                {
                    name: 'default',
                    tables: ['aws_cost_data', 'budget_alerts'],
                    default: true
                },
                {
                    name: 'analytics',
                    tables: ['cost_analytics', 'ml_predictions'],
                    default: false
                }
            ]
        };
    }
}

/**
 * BigQuery Adapter
 */
class BigQueryAdapter {
    async testConnection(config) {
        console.log('🔬 Testing BigQuery connection...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: 'BigQuery connection successful',
            details: {
                project: config.project_id,
                dataset: config.dataset_id,
                location: config.location || 'US',
                version: 'BigQuery 2.0 (simulated)'
            }
        };
    }

    async exportData(config, data, options) {
        console.log('📤 Exporting to BigQuery...');
        
        const tableName = options.tableName || 'aws_cost_data';
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            success: true,
            message: `Data exported to BigQuery table: ${tableName}`,
            details: {
                table: `${config.project_id}.${config.dataset_id}.${tableName}`,
                rows_inserted: data.length,
                bytes_processed: data.length * 100, // Simulated
                export_time: new Date().toISOString()
            }
        };
    }

    async getSchemas(config) {
        console.log('📋 Getting BigQuery schemas...');
        
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            datasets: [
                {
                    name: config.dataset_id,
                    tables: ['aws_cost_data', 'cost_forecasts', 'budget_alerts'],
                    location: config.location || 'US'
                }
            ]
        };
    }
}

module.exports = new DataLakeService();
