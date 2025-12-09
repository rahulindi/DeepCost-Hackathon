// Migration: Update orphaned_resources table schema
// Adds missing columns and renames columns to match the service code

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

async function updateOrphanedResourcesSchema() {
    console.log('🔧 Updating orphaned_resources table schema...');

    try {
        // Add user_id column (alias for created_by for consistency)
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS user_id BIGINT;
        `);
        console.log('✅ Added user_id column');

        // Copy created_by to user_id for existing records
        await DatabaseService.query(`
            UPDATE orphaned_resources 
            SET user_id = created_by 
            WHERE user_id IS NULL AND created_by IS NOT NULL;
        `);
        console.log('✅ Migrated created_by to user_id');

        // Add potential_savings column (alias for monthly_cost)
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS potential_savings DECIMAL(10, 2);
        `);
        console.log('✅ Added potential_savings column');

        // Copy monthly_cost to potential_savings for existing records
        await DatabaseService.query(`
            UPDATE orphaned_resources 
            SET potential_savings = monthly_cost 
            WHERE potential_savings IS NULL AND monthly_cost IS NOT NULL;
        `);
        console.log('✅ Migrated monthly_cost to potential_savings');

        // Add last_activity column
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
        `);
        console.log('✅ Added last_activity column');

        // Add cleanup_risk_level column
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS cleanup_risk_level VARCHAR(20) DEFAULT 'medium';
        `);
        console.log('✅ Added cleanup_risk_level column');

        // Add detection_metadata column
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS detection_metadata JSONB;
        `);
        console.log('✅ Added detection_metadata column');

        // Add cleanup_status column (replaces cleaned_up boolean)
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS cleanup_status VARCHAR(50) DEFAULT 'detected';
        `);
        console.log('✅ Added cleanup_status column');

        // Migrate cleaned_up boolean to cleanup_status
        await DatabaseService.query(`
            UPDATE orphaned_resources 
            SET cleanup_status = CASE 
                WHEN cleaned_up = true THEN 'cleaned'
                ELSE 'detected'
            END
            WHERE cleanup_status = 'detected';
        `);
        console.log('✅ Migrated cleaned_up to cleanup_status');

        // Add cleaned_at column (alias for cleaned_up_at)
        await DatabaseService.query(`
            ALTER TABLE orphaned_resources 
            ADD COLUMN IF NOT EXISTS cleaned_at TIMESTAMP;
        `);
        console.log('✅ Added cleaned_at column');

        // Copy cleaned_up_at to cleaned_at
        await DatabaseService.query(`
            UPDATE orphaned_resources 
            SET cleaned_at = cleaned_up_at 
            WHERE cleaned_at IS NULL AND cleaned_up_at IS NOT NULL;
        `);
        console.log('✅ Migrated cleaned_up_at to cleaned_at');

        // Create index on user_id for performance
        await DatabaseService.query(`
            CREATE INDEX IF NOT EXISTS idx_orphaned_resources_user_id 
            ON orphaned_resources(user_id);
        `);
        console.log('✅ Created index on user_id');

        // Create index on cleanup_status for performance
        await DatabaseService.query(`
            CREATE INDEX IF NOT EXISTS idx_orphaned_resources_cleanup_status 
            ON orphaned_resources(cleanup_status);
        `);
        console.log('✅ Created index on cleanup_status');

        console.log('🎉 orphaned_resources table schema updated successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating orphaned_resources schema:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    updateOrphanedResourcesSchema()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = updateOrphanedResourcesSchema;
