// Migration: Create Resource Lifecycle Management Tables
// Creates tables for scheduled actions, rightsizing, and orphaned resources

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

async function createLifecycleTables() {
    console.log('🔧 Creating Resource Lifecycle Management tables...');

    try {
        // 1. Create resource_schedules table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS resource_schedules (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                action VARCHAR(50) NOT NULL,
                schedule_type VARCHAR(50) NOT NULL,
                schedule_config JSONB,
                is_active BOOLEAN DEFAULT true,
                created_by BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_executed_at TIMESTAMP,
                next_execution_at TIMESTAMP
            );
        `);
        console.log('✅ Created resource_schedules table');

        // 2. Create resource_lifecycle table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS resource_lifecycle (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) UNIQUE NOT NULL,
                resource_type VARCHAR(100),
                service_name VARCHAR(100),
                region VARCHAR(50),
                current_state VARCHAR(50),
                cost_per_month DECIMAL(10, 2),
                last_used_at TIMESTAMP,
                created_by BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created resource_lifecycle table');

        // 3. Create rightsizing_recommendations table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS rightsizing_recommendations (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                current_type VARCHAR(100),
                recommended_type VARCHAR(100),
                current_cost DECIMAL(10, 2),
                estimated_cost DECIMAL(10, 2),
                potential_savings DECIMAL(10, 2),
                confidence_score DECIMAL(3, 2),
                reason TEXT,
                created_by BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                applied BOOLEAN DEFAULT false,
                applied_at TIMESTAMP
            );
        `);
        console.log('✅ Created rightsizing_recommendations table');

        // 4. Create orphaned_resources table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS orphaned_resources (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL,
                resource_type VARCHAR(100),
                service_name VARCHAR(100),
                region VARCHAR(50),
                orphan_type VARCHAR(50),
                monthly_cost DECIMAL(10, 2),
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by BIGINT,
                cleaned_up BOOLEAN DEFAULT false,
                cleaned_up_at TIMESTAMP
            );
        `);
        console.log('✅ Created orphaned_resources table');

        // 5. Create indexes for performance (skip if columns don't exist)
        try {
            await DatabaseService.query(`CREATE INDEX IF NOT EXISTS idx_resource_schedules_created_by ON resource_schedules(created_by);`);
            await DatabaseService.query(`CREATE INDEX IF NOT EXISTS idx_resource_schedules_active ON resource_schedules(is_active);`);
            await DatabaseService.query(`CREATE INDEX IF NOT EXISTS idx_resource_lifecycle_created_by ON resource_lifecycle(created_by);`);
            await DatabaseService.query(`CREATE INDEX IF NOT EXISTS idx_rightsizing_created_by ON rightsizing_recommendations(created_by);`);
            await DatabaseService.query(`CREATE INDEX IF NOT EXISTS idx_orphaned_created_by ON orphaned_resources(created_by);`);
            console.log('✅ Created indexes');
        } catch (indexError) {
            console.warn('⚠️ Some indexes could not be created (columns may not exist yet):', indexError.message);
        }

        console.log('🎉 Resource Lifecycle Management tables created successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Error creating lifecycle tables:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    createLifecycleTables()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = createLifecycleTables;
