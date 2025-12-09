// Database Migration: Add Reserved Instance Analytics Tables
// Run this once to add RI analysis storage capabilities
const DatabaseService = require('../services/databaseService');

class RIAnalyticsMigration {
    static async up() {
        try {
            console.log('🔧 Running RI Analytics migration...');

            // Create RI analyses table
            const createRIAnalysesTable = `
                CREATE TABLE IF NOT EXISTS ri_analyses (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    analysis_data JSONB NOT NULL,
                    utilization_data JSONB,
                    recommendations JSONB,
                    savings_summary JSONB,
                    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            // Create RI recommendations table for tracking
            const createRIRecommendationsTable = `
                CREATE TABLE IF NOT EXISTS ri_recommendations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    analysis_id INTEGER REFERENCES ri_analyses(id) ON DELETE CASCADE,
                    service_name VARCHAR(100) NOT NULL,
                    instance_type VARCHAR(50),
                    term VARCHAR(20) NOT NULL,
                    payment_option VARCHAR(50),
                    estimated_monthly_savings DECIMAL(10,2),
                    priority VARCHAR(20) DEFAULT 'medium',
                    status VARCHAR(20) DEFAULT 'pending',
                    reasoning TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            // Create indexes for performance
            const createIndexes = `
                CREATE INDEX IF NOT EXISTS idx_ri_analyses_user_id ON ri_analyses(user_id);
                CREATE INDEX IF NOT EXISTS idx_ri_analyses_date ON ri_analyses(analysis_date);
                CREATE INDEX IF NOT EXISTS idx_ri_recommendations_user_id ON ri_recommendations(user_id);
                CREATE INDEX IF NOT EXISTS idx_ri_recommendations_priority ON ri_recommendations(priority);
                CREATE INDEX IF NOT EXISTS idx_ri_recommendations_status ON ri_recommendations(status);
            `;

            // Execute migrations
            if (DatabaseService.pool) {
                await DatabaseService.pool.query(createRIAnalysesTable);
                console.log('✅ Created ri_analyses table');

                await DatabaseService.pool.query(createRIRecommendationsTable);
                console.log('✅ Created ri_recommendations table');

                await DatabaseService.pool.query(createIndexes);
                console.log('✅ Created RI analytics indexes');

                return {
                    success: true,
                    message: 'RI Analytics migration completed successfully'
                };
            } else {
                console.log('📁 Database not available - will use file storage');
                return {
                    success: true,
                    message: 'Migration skipped - using file storage mode',
                    fileStorage: true
                };
            }

        } catch (error) {
            console.error('❌ RI Analytics migration failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Rollback migration if needed
    static async down() {
        try {
            if (DatabaseService.pool) {
                await DatabaseService.pool.query('DROP TABLE IF EXISTS ri_recommendations CASCADE;');
                await DatabaseService.pool.query('DROP TABLE IF EXISTS ri_analyses CASCADE;');
                console.log('✅ RI Analytics tables dropped');
            }
            return { success: true };
        } catch (error) {
            console.error('❌ RI Analytics rollback failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Test the migration
    static async test() {
        try {
            if (!DatabaseService.pool) {
                return { success: true, message: 'File storage mode - no database tests needed' };
            }

            // Test table creation
            const testQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('ri_analyses', 'ri_recommendations')
            `;
            
            const result = await DatabaseService.pool.query(testQuery);
            const tableCount = result.rows.length;

            if (tableCount === 2) {
                console.log('✅ RI Analytics tables verified');
                return {
                    success: true,
                    tablesCreated: tableCount,
                    tables: result.rows.map(row => row.table_name)
                };
            } else {
                return {
                    success: false,
                    error: `Expected 2 tables, found ${tableCount}`,
                    tables: result.rows.map(row => row.table_name)
                };
            }

        } catch (error) {
            console.error('❌ RI Analytics test failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = RIAnalyticsMigration;

// Auto-run migration if called directly
if (require.main === module) {
    (async () => {
        console.log('🚀 Running RI Analytics migration...');
        const result = await RIAnalyticsMigration.up();
        console.log('Migration result:', result);
        
        if (result.success && !result.fileStorage) {
            const testResult = await RIAnalyticsMigration.test();
            console.log('Test result:', testResult);
        }
        
        process.exit(0);
    })();
}
