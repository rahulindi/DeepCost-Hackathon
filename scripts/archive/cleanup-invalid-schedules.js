/**
 * Cleanup schedules for users without AWS credentials
 */

const DatabaseService = require('./backend/src/services/databaseService');
const AwsCredentialsService = require('./backend/src/services/awsCredentialsService');
require('dotenv').config({ path: './backend/.env' });

async function cleanupInvalidSchedules() {
    console.log('🧹 Cleaning up schedules for users without AWS credentials...\n');
    
    try {
        // Get all active schedules
        const schedules = await DatabaseService.query(`
            SELECT id, resource_id, schedule_name, created_by 
            FROM resource_schedules 
            WHERE is_active = true
        `);
        
        console.log(`Found ${schedules.rows.length} active schedules\n`);
        
        let deactivated = 0;
        
        for (const schedule of schedules.rows) {
            console.log(`Checking schedule ${schedule.id} (${schedule.schedule_name}) for user ${schedule.created_by}...`);
            
            // Check if user has credentials
            const credentials = await AwsCredentialsService.getCredentials(schedule.created_by);
            
            if (!credentials || !credentials.success) {
                console.log(`  ❌ User ${schedule.created_by} has no AWS credentials - deactivating schedule`);
                
                await DatabaseService.query(
                    'UPDATE resource_schedules SET is_active = false WHERE id = $1',
                    [schedule.id]
                );
                
                deactivated++;
            } else {
                console.log(`  ✅ User ${schedule.created_by} has valid credentials - keeping schedule active`);
            }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Cleanup complete!`);
        console.log(`   - Total schedules checked: ${schedules.rows.length}`);
        console.log(`   - Schedules deactivated: ${deactivated}`);
        console.log(`   - Schedules kept active: ${schedules.rows.length - deactivated}`);
        
        if (deactivated > 0) {
            console.log(`\n💡 Tip: Users can reactivate schedules after configuring AWS credentials`);
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

cleanupInvalidSchedules();
