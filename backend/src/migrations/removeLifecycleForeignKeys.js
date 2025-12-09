// Migration: Remove foreign key constraints from lifecycle tables
// Allows lifecycle features to work without strict user table references

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const DatabaseService = require('../services/databaseService');

async function removeLifecycleForeignKeys() {
    console.log('🔧 Removing foreign key constraints from lifecycle tables...');

    try {
        // Get all foreign key constraints on created_by columns
        const constraints = await DatabaseService.query(`
            SELECT 
                tc.table_name, 
                tc.constraint_name
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('resource_schedules', 'resource_lifecycle', 'rightsizing_recommendations', 'orphaned_resources')
            AND tc.constraint_name LIKE '%created_by%';
        `);

        if (constraints.rows.length === 0) {
            console.log('✅ No foreign key constraints found on created_by columns');
        } else {
            console.log(`📊 Found ${constraints.rows.length} foreign key constraint(s) to remove\n`);

            for (const row of constraints.rows) {
                try {
                    await DatabaseService.query(`
                        ALTER TABLE ${row.table_name} 
                        DROP CONSTRAINT IF EXISTS ${row.constraint_name};
                    `);
                    console.log(`✅ Removed ${row.constraint_name} from ${row.table_name}`);
                } catch (error) {
                    console.error(`❌ Error removing ${row.constraint_name}:`, error.message);
                }
            }
        }

        console.log('\n🎉 Foreign key constraints removed successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    removeLifecycleForeignKeys()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = removeLifecycleForeignKeys;
