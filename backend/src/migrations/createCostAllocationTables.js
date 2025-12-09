// Migration: Create Cost Allocation Tables
// Creates tables for allocation rules and chargeback reports

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

async function createCostAllocationTables() {
    console.log('🔧 Creating Cost Allocation tables...');

    try {
        // 1. Create cost_allocation_rules table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS cost_allocation_rules (
                id SERIAL PRIMARY KEY,
                rule_name VARCHAR(255) NOT NULL,
                rule_type VARCHAR(50) NOT NULL,
                condition_json JSONB NOT NULL,
                allocation_target JSONB NOT NULL,
                priority INTEGER DEFAULT 100,
                is_active BOOLEAN DEFAULT true,
                created_by BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created cost_allocation_rules table');

        // 2. Create chargeback_reports table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS chargeback_reports (
                id SERIAL PRIMARY KEY,
                report_period VARCHAR(50) NOT NULL,
                report_date DATE NOT NULL,
                cost_center VARCHAR(255),
                department VARCHAR(255),
                project VARCHAR(255),
                total_cost DECIMAL(15, 2) NOT NULL,
                report_data JSONB,
                created_by BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created chargeback_reports table');

        // 3. Create indexes for performance
        try {
            await DatabaseService.query(`
                CREATE INDEX IF NOT EXISTS idx_cost_allocation_rules_created_by 
                ON cost_allocation_rules(created_by);
            `);
            
            await DatabaseService.query(`
                CREATE INDEX IF NOT EXISTS idx_cost_allocation_rules_active 
                ON cost_allocation_rules(is_active);
            `);
            
            await DatabaseService.query(`
                CREATE INDEX IF NOT EXISTS idx_chargeback_reports_created_by 
                ON chargeback_reports(created_by);
            `);
            
            await DatabaseService.query(`
                CREATE INDEX IF NOT EXISTS idx_chargeback_reports_date 
                ON chargeback_reports(report_date);
            `);
            
            console.log('✅ Created indexes');
        } catch (indexError) {
            console.warn('⚠️  Some indexes could not be created (may already exist):', indexError.message);
        }

        console.log('🎉 Cost Allocation tables created successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Error creating cost allocation tables:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    createCostAllocationTables()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = createCostAllocationTables;
