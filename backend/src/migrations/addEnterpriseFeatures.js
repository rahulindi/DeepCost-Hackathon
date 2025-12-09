// Database schema extensions for enterprise features
// This migration adds enterprise tables without breaking existing functionality

const DatabaseService = require('../services/databaseService');

async function addEnterpriseFeatures() {
    console.log('🔄 Adding enterprise database features...');
    
    try {
        // Extend existing users table with enterprise fields
        await DatabaseService.query(`
            DO $$ 
            BEGIN
                -- Add enterprise fields to users table if they don't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'first_name') THEN
                    ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'last_name') THEN
                    ALTER TABLE users ADD COLUMN last_name VARCHAR(255);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'department') THEN
                    ALTER TABLE users ADD COLUMN department VARCHAR(255);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'organization') THEN
                    ALTER TABLE users ADD COLUMN organization VARCHAR(255);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'role') THEN
                    ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'auth_provider') THEN
                    ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'is_active') THEN
                    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'last_login') THEN
                    ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
                END IF;
            END $$;
        `);

        // Create user sessions table (users.id is INTEGER, not UUID)
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_token UUID UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                revoked_at TIMESTAMP
            );
        `);

        // Create audit logs table (users.id is INTEGER, not UUID)
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                event_type VARCHAR(100) NOT NULL,
                details JSONB,
                ip_address INET,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create webhook configurations table (users.id is INTEGER, not UUID)
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS webhook_configs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                organization VARCHAR(255),
                webhook_url TEXT NOT NULL,
                secret_key VARCHAR(255),
                events TEXT[] DEFAULT ARRAY[]::TEXT[],
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create webhook deliveries table for tracking
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS webhook_deliveries (
                id SERIAL PRIMARY KEY,
                webhook_config_id INTEGER REFERENCES webhook_configs(id) ON DELETE CASCADE,
                event_type VARCHAR(100) NOT NULL,
                payload JSONB NOT NULL,
                response_status INTEGER,
                response_body TEXT,
                delivered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                retry_count INTEGER DEFAULT 0
            );
        `);

        // Create integration_configs table for Slack/Teams (users.id is INTEGER, not UUID)
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS integration_configs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                organization VARCHAR(255),
                integration_type VARCHAR(50) NOT NULL, -- 'slack', 'teams', 'discord'
                config JSONB NOT NULL, -- Store integration-specific config
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create organization settings table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS organization_settings (
                id SERIAL PRIMARY KEY,
                organization VARCHAR(255) UNIQUE NOT NULL,
                settings JSONB DEFAULT '{}',
                saml_config JSONB,
                cost_thresholds JSONB,
                notification_preferences JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes for performance (only if tables exist)
        await DatabaseService.query(`
            DO $$ 
            BEGIN
                -- Index for user sessions (check table exists first)
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_token') THEN
                        CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
                    END IF;
                END IF;
                
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_user_expires') THEN
                        CREATE INDEX idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);
                    END IF;
                END IF;
                
                -- Index for audit logs (check table exists first)
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_user_timestamp') THEN
                        CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
                    END IF;
                    
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_event_timestamp') THEN
                        CREATE INDEX idx_audit_logs_event_timestamp ON audit_logs(event_type, timestamp);
                    END IF;
                END IF;
                
                -- Index for webhooks (check table exists first)
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_configs') THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_webhook_configs_user_active') THEN
                        CREATE INDEX idx_webhook_configs_user_active ON webhook_configs(user_id, is_active);
                    END IF;
                END IF;
                
                -- Index for integrations (check table exists first)
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_configs') THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_integration_configs_user_type') THEN
                        CREATE INDEX idx_integration_configs_user_type ON integration_configs(user_id, integration_type);
                    END IF;
                END IF;
                
                -- Index for organization settings (check table exists first)
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_settings') THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_settings_org') THEN
                        CREATE INDEX idx_organization_settings_org ON organization_settings(organization);
                    END IF;
                END IF;
                
                -- Index for users enterprise fields
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_organization') THEN
                    CREATE INDEX idx_users_organization ON users(organization) WHERE organization IS NOT NULL;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_auth_provider') THEN
                    CREATE INDEX idx_users_auth_provider ON users(auth_provider);
                END IF;
            END $$;
        `);

        console.log('✅ Enterprise database features added successfully');
        
        // Return summary of changes
        return {
            success: true,
            message: 'Enterprise features added successfully',
            features: [
                'Extended users table with enterprise fields',
                'Added user sessions management',
                'Added comprehensive audit logging',
                'Added webhook configuration system',
                'Added integration configs for Slack/Teams',
                'Added organization settings management',
                'Added performance indexes'
            ]
        };
        
    } catch (error) {
        console.error('❌ Error adding enterprise features:', error);
        throw error;
    }
}

// Helper function to extend DatabaseService with enterprise methods
function extendDatabaseService() {
    // Create enterprise user
    DatabaseService.createEnterpriseUser = async function(userData) {
        const query = `
            INSERT INTO users (
                id, username, email, password_hash, first_name, last_name, 
                department, organization, role, auth_provider, is_active, 
                subscription_tier, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING *;
        `;
        
        const values = [
            userData.id,
            userData.username,
            userData.email,
            userData.password_hash || null,
            userData.first_name,
            userData.last_name,
            userData.department,
            userData.organization,
            userData.role,
            userData.auth_provider,
            userData.is_active,
            userData.subscription_tier,
            userData.created_at,
            userData.updated_at
        ];
        
        const result = await this.query(query, values);
        return result.rows[0];
    };

    // User session management
    DatabaseService.createUserSession = async function(sessionData) {
        const query = `
            INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        
        const values = [
            sessionData.user_id,
            sessionData.session_token,
            sessionData.expires_at,
            sessionData.ip_address,
            sessionData.user_agent,
            sessionData.created_at
        ];
        
        const result = await this.query(query, values);
        return result.rows[0];
    };

    DatabaseService.validateUserSession = async function(sessionToken) {
        const query = `
            SELECT us.*, u.email, u.is_active 
            FROM user_sessions us
            JOIN users u ON us.user_id = u.id
            WHERE us.session_token = $1 
            AND us.expires_at > NOW() 
            AND us.revoked_at IS NULL
            AND u.is_active = true;
        `;
        
        const result = await this.query(query, [sessionToken]);
        return result.rows[0] || null;
    };

    DatabaseService.revokeUserSession = async function(sessionToken) {
        const query = `
            UPDATE user_sessions 
            SET revoked_at = NOW() 
            WHERE session_token = $1
            RETURNING *;
        `;
        
        const result = await this.query(query, [sessionToken]);
        return result.rows[0];
    };

    // Audit logging
    DatabaseService.createAuditLog = async function(auditData) {
        const query = `
            INSERT INTO audit_logs (user_id, event_type, details, ip_address, user_agent, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        
        const values = [
            auditData.user_id,
            auditData.event_type,
            auditData.details,
            auditData.ip_address,
            auditData.user_agent,
            auditData.timestamp
        ];
        
        const result = await this.query(query, values);
        return result.rows[0];
    };

    console.log('✅ DatabaseService extended with enterprise methods');
}

// Auto-run migration if called directly
if (require.main === module) {
    addEnterpriseFeatures()
        .then(() => {
            extendDatabaseService();
            console.log('✅ Enterprise features migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addEnterpriseFeatures, extendDatabaseService };
