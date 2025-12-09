// Migration: Remove Foreign Key Constraints from Cost Allocation Tables
// Allows flexibility with user IDs like other features

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

async function removeCostAllocationForeignKeys() {
    console.log('🔧 Removing foreign key constraints from cost allocation tables...');

    try {
        // Find and drop all foreign key constraints on user_id
        const constraints = await DatabaseService.query(`
            SELECT constraint_name, table_name
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('cost_allocation_rules', 'chargeback_reports')
            AND tc.constraint_name LIKE '%user_id%';
        `);

        console.log(`Found ${constraints.rows.length} foreign key constraints to remove`);

        for (const constraint of constraints.rows) {
            console.log(`  Dropping ${constraint.constraint_name} from ${constraint.table_name}...`);
            await DatabaseService.query(`
                ALTER TABLE ${constraint.table_name} 
                DROP CONSTRAINT IF EXISTS ${constraint.constraint_name};
            `);
        }

        console.log('✅ Foreign key constraints removed');
        console.log('🎉 Migration completed successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Error removing foreign keys:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    removeCostAllocationForeignKeys()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = removeCostAllocationForeignKeys;
