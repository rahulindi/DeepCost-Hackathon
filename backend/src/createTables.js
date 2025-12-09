const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function createTables() {
    try {
        console.log('🔨 Creating database tables...');

        // Test database connection first
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Check existing users table structure
        const usersTableCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);

        let userIdType = 'integer'; // default assumption
        if (usersTableCheck.rows.length > 0) {
            const idColumn = usersTableCheck.rows.find(row => row.column_name === 'id');
            if (idColumn) {
                userIdType = idColumn.data_type === 'uuid' ? 'UUID' : 'INTEGER';
                console.log(`🔍 Found users.id type: ${idColumn.data_type}`);
            }
        }

        // Create users table if it doesn't exist
        if (usersTableCheck.rows.length === 0) {
            console.log('📊 Creating users table...');
            await pool.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    subscription_tier VARCHAR(20) DEFAULT 'free',
                    email_verified BOOLEAN DEFAULT false,
                    verification_token VARCHAR(255),
                    failed_login_attempts INTEGER DEFAULT 0,
                    account_locked_until TIMESTAMP,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            userIdType = 'INTEGER';
        } else {
            // Table exists, add missing columns for auth
            console.log('📊 Checking users table for missing auth columns...');
            const existingUserColumns = usersTableCheck.rows.map(row => row.column_name);
            
            const requiredUserColumns = [
                { name: 'email_verified', type: 'BOOLEAN DEFAULT false' },
                { name: 'verification_token', type: 'VARCHAR(255)' },
                { name: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
                { name: 'account_locked_until', type: 'TIMESTAMP' },
                { name: 'last_login', type: 'TIMESTAMP' }
            ];

            for (const column of requiredUserColumns) {
                if (!existingUserColumns.includes(column.name)) {
                    console.log(`➕ Adding missing users column: ${column.name}`);
                    await pool.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
                }
            }
        }

        // Create user_sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create refresh_tokens table for JWT refresh tokens
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) NOT NULL UNIQUE,
                user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                last_used TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);

        // Check if cost_records table exists and what columns it has
        const tableCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cost_records' AND table_schema = 'public'
        `);

        if (tableCheck.rows.length === 0) {
            // Table doesn't exist, create it with all columns
            console.log('📊 Creating new cost_records table with enhanced schema...');
            await pool.query(`
                CREATE TABLE cost_records (
                    id SERIAL PRIMARY KEY,
                    user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    service_name VARCHAR(255) NOT NULL,
                    region VARCHAR(100),
                    resource_id VARCHAR(500),
                    cost_amount DECIMAL(15,8) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'USD',
                    cost_center VARCHAR(100),
                    department VARCHAR(100),
                    project VARCHAR(100),
                    environment VARCHAR(50),
                    team VARCHAR(100),
                    business_unit VARCHAR(100),
                    tags JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } else {
            // Table exists, check which columns are missing and add them
            console.log('📊 cost_records table exists, checking for missing columns...');
            const existingColumns = tableCheck.rows.map(row => row.column_name);

            const requiredColumns = [
                { name: 'user_id', type: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' },
                { name: 'region', type: 'VARCHAR(100)' },
                { name: 'resource_id', type: 'VARCHAR(500)' },
                { name: 'currency', type: 'VARCHAR(10) DEFAULT \'USD\'' },
                { name: 'cost_center', type: 'VARCHAR(100)' },
                { name: 'department', type: 'VARCHAR(100)' },
                { name: 'project', type: 'VARCHAR(100)' },
                { name: 'environment', type: 'VARCHAR(50)' },
                { name: 'team', type: 'VARCHAR(100)' },
                { name: 'business_unit', type: 'VARCHAR(100)' },
                { name: 'tags', type: 'JSONB' }
            ];

            for (const column of requiredColumns) {
                if (!existingColumns.includes(column.name)) {
                    console.log(`➕ Adding missing column: ${column.name}`);
                    await pool.query(`ALTER TABLE cost_records ADD COLUMN ${column.name} ${column.type}`);
                }
            }
        }

        // Create indexes only after ensuring columns exist
        console.log('📊 Creating indexes for cost_records...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_records_date ON cost_records(date)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_records_service ON cost_records(service_name)`);

        // Check if cost_center column exists before creating index
        const costCenterExists = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'cost_records' AND column_name = 'cost_center' AND table_schema = 'public'
        `);

        if (costCenterExists.rows.length > 0) {
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_records_cost_center ON cost_records(cost_center)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_records_department ON cost_records(department)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_records_project ON cost_records(project)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_records_environment ON cost_records(environment)`);
        }

        // Tag compliance monitoring table with correct user_id type
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tag_compliance (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(500) NOT NULL,
                service_name VARCHAR(255) NOT NULL,
                region VARCHAR(100),
                required_tags JSONB NOT NULL,
                actual_tags JSONB,
                compliance_status VARCHAR(20) DEFAULT 'non_compliant',
                compliance_score INTEGER DEFAULT 0,
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_tag_compliance_status ON tag_compliance(compliance_status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_tag_compliance_service ON tag_compliance(service_name)`);

        // Cost center allocation rules table with correct user_id type
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cost_allocation_rules (
                id SERIAL PRIMARY KEY,
                rule_name VARCHAR(255) NOT NULL,
                rule_type VARCHAR(50) NOT NULL,
                condition_json JSONB NOT NULL,
                allocation_target JSONB NOT NULL,
                priority INTEGER DEFAULT 100,
                is_active BOOLEAN DEFAULT true,
                user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_allocation_rules_type ON cost_allocation_rules(rule_type)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_allocation_rules_active ON cost_allocation_rules(is_active)`);

        // Chargeback/showback reports table with correct user_id type
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chargeback_reports (
                id SERIAL PRIMARY KEY,
                report_period VARCHAR(20) NOT NULL,
                report_date DATE NOT NULL,
                cost_center VARCHAR(100),
                department VARCHAR(100),
                project VARCHAR(100),
                team VARCHAR(100),
                business_unit VARCHAR(100),
                total_cost DECIMAL(15,8) NOT NULL,
                service_breakdown JSONB,
                resource_breakdown JSONB,
                tag_breakdown JSONB,
                user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_chargeback_period_date ON chargeback_reports(report_period, report_date)`);

        // Monthly trends table for existing functionality
        await pool.query(`
            CREATE TABLE IF NOT EXISTS monthly_trends (
                id SERIAL PRIMARY KEY,
                month_year VARCHAR(7) UNIQUE NOT NULL,
                total_cost DECIMAL(15,8) NOT NULL,
                service_breakdown JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Daily summaries table for existing functionality
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_summaries (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                total_cost DECIMAL(15,8) NOT NULL,
                service_breakdown JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Service trends table for existing functionality
        await pool.query(`
            CREATE TABLE IF NOT EXISTS service_trends (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                service_name VARCHAR(255) NOT NULL,
                cost_amount DECIMAL(15,8) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_trends_date ON service_trends(date)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_trends_service ON service_trends(service_name)`);

        // Budgets table for budget management
        await pool.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(15,8) NOT NULL,
                period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly, yearly
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                service_name VARCHAR(255), -- NULL for overall budget
                region VARCHAR(100),
                cost_center VARCHAR(100),
                department VARCHAR(100),
                project VARCHAR(100),
                tags JSONB,
                notifications_enabled BOOLEAN DEFAULT true,
                notification_threshold DECIMAL(5,2) DEFAULT 80.00, -- Percentage
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date)`);

        // Budget alerts table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS budget_alerts (
                id SERIAL PRIMARY KEY,
                budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
                actual_amount DECIMAL(15,8) NOT NULL,
                threshold_amount DECIMAL(15,8) NOT NULL,
                percentage DECIMAL(5,2) NOT NULL,
                alert_type VARCHAR(20) NOT NULL, -- threshold_exceeded, forecast_exceed
                notified BOOLEAN DEFAULT false,
                notification_sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget ON budget_alerts(budget_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_type ON budget_alerts(alert_type)`);

        // Resource Lifecycle Management Tables
        console.log('📊 Creating resource lifecycle management tables...');

        // Resource Schedules Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resource_schedules (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                schedule_name VARCHAR(255) NOT NULL,
                schedule_type VARCHAR(50) NOT NULL,
                cron_expression VARCHAR(100) NOT NULL,
                timezone VARCHAR(50) DEFAULT 'UTC',
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(resource_id, schedule_type)
            )
        `);

        // Resource Lifecycle Tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resource_lifecycle (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL UNIQUE,
                resource_type VARCHAR(100) NOT NULL,
                service_name VARCHAR(100) NOT NULL,
                region VARCHAR(50) NOT NULL,
                account_id VARCHAR(20) NOT NULL,
                current_stage VARCHAR(50) DEFAULT 'active',
                lifecycle_metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Rightsizing Recommendations
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rightsizing_recommendations (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                current_instance_type VARCHAR(100) NOT NULL,
                recommended_instance_type VARCHAR(100) NOT NULL,
                confidence_score INTEGER,
                potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
                performance_impact VARCHAR(20),
                analysis_data JSONB DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'pending',
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                applied_at TIMESTAMP NULL
            )
        `);

        // Orphaned Resources
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orphaned_resources (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL UNIQUE,
                resource_type VARCHAR(100) NOT NULL,
                service_name VARCHAR(100) NOT NULL,
                region VARCHAR(50) NOT NULL,
                orphan_type VARCHAR(50) NOT NULL,
                last_activity TIMESTAMP NOT NULL,
                potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
                cleanup_risk_level VARCHAR(20),
                cleanup_status VARCHAR(20) DEFAULT 'detected',
                detection_metadata JSONB DEFAULT '{}',
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cleaned_at TIMESTAMP NULL
            )
        `);

        // Lifecycle Actions Log
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lifecycle_actions_log (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                action_details JSONB DEFAULT '{}',
                executed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                execution_status VARCHAR(20) DEFAULT 'pending',
                error_message TEXT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Resource Performance Metrics
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resource_performance_metrics (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                metric_name VARCHAR(100) NOT NULL,
                metric_value DECIMAL(10,4) NOT NULL,
                metric_unit VARCHAR(20) NOT NULL,
                collection_timestamp TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for lifecycle tables
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_resource_schedules_resource_id ON resource_schedules(resource_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_resource_lifecycle_resource_id ON resource_lifecycle(resource_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_rightsizing_recommendations_resource_id ON rightsizing_recommendations(resource_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orphaned_resources_resource_id ON orphaned_resources(resource_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_lifecycle_actions_log_resource_id ON lifecycle_actions_log(resource_id)`);

        // Add user_id to orphaned_resources if missing
        const orphanedColumnsCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'orphaned_resources' AND column_name = 'user_id' AND table_schema = 'public'
        `);
        if (orphanedColumnsCheck.rows.length === 0) {
            console.log('➕ Adding user_id column to orphaned_resources...');
            await pool.query(`ALTER TABLE orphaned_resources ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
        }

        // Webhook configs table
        console.log('📊 Creating webhook_configs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS webhook_configs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                organization VARCHAR(255),
                webhook_url TEXT,
                secret_key VARCHAR(255),
                events TEXT[] DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add missing columns to webhook_configs
        const wcColumnsCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'webhook_configs' AND table_schema = 'public'
        `);
        const wcExistingCols = wcColumnsCheck.rows.map(r => r.column_name);
        
        if (!wcExistingCols.includes('organization')) {
            console.log('➕ Adding organization column to webhook_configs...');
            await pool.query(`ALTER TABLE webhook_configs ADD COLUMN organization VARCHAR(255)`);
        }
        if (!wcExistingCols.includes('webhook_url')) {
            console.log('➕ Adding webhook_url column to webhook_configs...');
            await pool.query(`ALTER TABLE webhook_configs ADD COLUMN webhook_url TEXT`);
        }
        if (!wcExistingCols.includes('events')) {
            await pool.query(`ALTER TABLE webhook_configs ADD COLUMN events TEXT[] DEFAULT '{}'`);
        }
        if (!wcExistingCols.includes('secret_key')) {
            await pool.query(`ALTER TABLE webhook_configs ADD COLUMN secret_key VARCHAR(255)`);
        }
        
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_webhook_configs_user ON webhook_configs(user_id)`);

        // Business metrics table
        console.log('📊 Creating business_metrics table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_metrics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                date DATE,
                revenue DECIMAL(15,4) DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                transactions INTEGER DEFAULT 0,
                metric_name VARCHAR(255),
                metric_value DECIMAL(15,4),
                metric_type VARCHAR(50),
                period VARCHAR(20),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add missing columns to business_metrics if table already exists
        const bmColumnsCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'business_metrics' AND table_schema = 'public'
        `);
        const bmExistingCols = bmColumnsCheck.rows.map(r => r.column_name);
        
        if (!bmExistingCols.includes('date')) {
            console.log('➕ Adding date column to business_metrics...');
            await pool.query(`ALTER TABLE business_metrics ADD COLUMN date DATE`);
        }
        if (!bmExistingCols.includes('revenue')) {
            await pool.query(`ALTER TABLE business_metrics ADD COLUMN revenue DECIMAL(15,4) DEFAULT 0`);
        }
        if (!bmExistingCols.includes('active_users')) {
            await pool.query(`ALTER TABLE business_metrics ADD COLUMN active_users INTEGER DEFAULT 0`);
        }
        if (!bmExistingCols.includes('transactions')) {
            await pool.query(`ALTER TABLE business_metrics ADD COLUMN transactions INTEGER DEFAULT 0`);
        }
        
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_metrics_user ON business_metrics(user_id)`);
        // Only create date index if date column exists
        try {
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(date)`);
        } catch (e) {
            console.log('⚠️ Could not create date index on business_metrics');
        }

        // Governance policies table
        console.log('📊 Creating governance_policies table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS governance_policies (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50),
                name VARCHAR(255),
                params JSONB DEFAULT '{}',
                active BOOLEAN DEFAULT true,
                priority INTEGER DEFAULT 100,
                description TEXT,
                rules JSONB DEFAULT '{}',
                severity VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add missing columns to governance_policies
        const gpColumnsCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'governance_policies' AND table_schema = 'public'
        `);
        const gpExistingCols = gpColumnsCheck.rows.map(r => r.column_name);
        
        if (!gpExistingCols.includes('active')) {
            console.log('➕ Adding active column to governance_policies...');
            await pool.query(`ALTER TABLE governance_policies ADD COLUMN active BOOLEAN DEFAULT true`);
        }
        if (!gpExistingCols.includes('type')) {
            await pool.query(`ALTER TABLE governance_policies ADD COLUMN type VARCHAR(50)`);
        }
        if (!gpExistingCols.includes('name')) {
            await pool.query(`ALTER TABLE governance_policies ADD COLUMN name VARCHAR(255)`);
        }
        if (!gpExistingCols.includes('params')) {
            await pool.query(`ALTER TABLE governance_policies ADD COLUMN params JSONB DEFAULT '{}'`);
        }
        if (!gpExistingCols.includes('priority')) {
            await pool.query(`ALTER TABLE governance_policies ADD COLUMN priority INTEGER DEFAULT 100`);
        }
        
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_governance_policies_user ON governance_policies(user_id)`);

        // ========== ADDITIONAL MISSING TABLES ==========

        // Cost alerts table
        console.log('📊 Creating cost_alerts table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cost_alerts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                alert_name VARCHAR(255) NOT NULL,
                threshold_amount DECIMAL(15,2) NOT NULL,
                service_name VARCHAR(255),
                alert_type VARCHAR(50) DEFAULT 'threshold',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Alert notifications table
        console.log('📊 Creating alert_notifications table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS alert_notifications (
                id SERIAL PRIMARY KEY,
                alert_id INTEGER REFERENCES cost_alerts(id) ON DELETE CASCADE,
                triggered_amount DECIMAL(15,2) NOT NULL,
                notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Anomalies table
        console.log('📊 Creating anomalies table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS anomalies (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                service_name VARCHAR(255) NOT NULL,
                anomaly_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) DEFAULT 'medium',
                expected_value DECIMAL(15,4),
                actual_value DECIMAL(15,4),
                deviation_percent DECIMAL(10,2),
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'open',
                metadata JSONB DEFAULT '{}'
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_id)`);

        // Audit logs table
        console.log('📊 Creating audit_logs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100),
                resource_id VARCHAR(255),
                details JSONB DEFAULT '{}',
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);

        // Governance events table
        console.log('📊 Creating governance_events table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS governance_events (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                policy_id INTEGER REFERENCES governance_policies(id) ON DELETE CASCADE,
                event_type VARCHAR(50) NOT NULL,
                resource_id VARCHAR(255),
                details JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Integration configs table
        console.log('📊 Creating integration_configs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS integration_configs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                integration_type VARCHAR(50) NOT NULL,
                config JSONB NOT NULL DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Monthly service costs table
        console.log('📊 Creating monthly_service_costs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS monthly_service_costs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                month_year VARCHAR(7) NOT NULL,
                service_name VARCHAR(255) NOT NULL,
                cost_amount DECIMAL(15,4) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, month_year, service_name)
            )
        `);

        // RI analyses table
        console.log('📊 Creating ri_analyses table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ri_analyses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                analysis_data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Webhook deliveries table
        console.log('📊 Creating webhook_deliveries table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS webhook_deliveries (
                id SERIAL PRIMARY KEY,
                webhook_id INTEGER REFERENCES webhook_configs(id) ON DELETE CASCADE,
                event_type VARCHAR(50) NOT NULL,
                payload JSONB NOT NULL DEFAULT '{}',
                response_status INTEGER,
                response_body TEXT,
                delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT false
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id)`);

        console.log('✅ All cost tracking and resource allocation tables created/updated!');
        console.log('📊 Tables created/updated:');
        console.log('   - users (existing or created)');
        console.log('   - user_sessions (existing or created)');
        console.log('   - cost_records (enhanced with resource-level tracking)');
        console.log('   - tag_compliance (new - for monitoring tag compliance)');
        console.log('   - cost_allocation_rules (new - for automated allocation)');
        console.log('   - chargeback_reports (new - for team/department reports)');
        console.log('   - budgets (new - for budget management)');
        console.log('   - budget_alerts (new - for budget notifications)');
        console.log('   - monthly_trends (existing or created)');
        console.log('   - daily_summaries (existing or created)');
        console.log('   - service_trends (existing or created)');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Table creation failed:', error);
        await pool.end();
        process.exit(1);
    }
}

createTables();