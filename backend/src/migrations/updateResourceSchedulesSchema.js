// Migration: Update resource_schedules table schema
// Adds missing columns needed by the lifecycle service

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

async function updateResourceSchedulesSchema() {
    console.log('🔧 Updating resource_schedules table schema...');

    try {
        // Add schedule_name column if it doesn't exist
        await DatabaseService.query(`
            ALTER TABLE resource_schedules 
            ADD COLUMN IF NOT EXISTS schedule_name VARCHAR(255);
        `);
        console.log('✅ Added schedule_name column');

        // Add cron_expression column if it doesn't exist
        await DatabaseService.query(`
            ALTER TABLE resource_schedules 
            ADD COLUMN IF NOT EXISTS cron_expression VARCHAR(100);
        `);
        console.log('✅ Added cron_expression column');

        // Add timezone column if it doesn't exist
        await DatabaseService.query(`
            ALTER TABLE resource_schedules 
            ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
        `);
        console.log('✅ Added timezone column');

        // Add metadata column if it doesn't exist (rename schedule_config if needed)
        await DatabaseService.query(`
            ALTER TABLE resource_schedules 
            ADD COLUMN IF NOT EXISTS metadata JSONB;
        `);
        console.log('✅ Added metadata column');

        // Drop old action column if it exists (we use schedule_type instead)
        await DatabaseService.query(`
            ALTER TABLE resource_schedules 
            DROP COLUMN IF EXISTS action;
        `);
        console.log('✅ Removed old action column');

        console.log('🎉 resource_schedules schema updated successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating resource_schedules schema:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    updateResourceSchedulesSchema()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = updateResourceSchedulesSchema;
