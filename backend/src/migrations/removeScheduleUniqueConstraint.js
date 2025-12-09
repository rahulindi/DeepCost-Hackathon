// Migration: Remove unique constraint on resource_schedules
// Allows multiple schedules for the same resource and action type

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

async function removeScheduleUniqueConstraint() {
    console.log('🔧 Removing unique constraint from resource_schedules...');

    try {
        // Remove the unique constraint
        await DatabaseService.query(`
            ALTER TABLE resource_schedules 
            DROP CONSTRAINT IF EXISTS resource_schedules_resource_id_schedule_type_key;
        `);
        console.log('✅ Unique constraint removed');

        // Clean up inactive schedules
        const result = await DatabaseService.query(`
            DELETE FROM resource_schedules 
            WHERE is_active = false
            RETURNING id;
        `);
        console.log(`✅ Cleaned up ${result.rows.length} inactive schedules`);

        console.log('🎉 Migration completed successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Error removing constraint:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    removeScheduleUniqueConstraint()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = removeScheduleUniqueConstraint;
