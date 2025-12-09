// Test script to verify lifecycle schedules are being saved
require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');

async function testSchedules() {
    console.log('🔍 Checking scheduled actions in database...\n');

    try {
        const result = await DatabaseService.query(`
            SELECT * FROM resource_schedules 
            ORDER BY created_at DESC 
            LIMIT 10;
        `);

        if (result.rows.length === 0) {
            console.log('📭 No scheduled actions found yet.');
            console.log('💡 Try creating one in the Lifecycle Management UI!\n');
        } else {
            console.log(`✅ Found ${result.rows.length} scheduled action(s):\n`);
            result.rows.forEach((row, index) => {
                console.log(`${index + 1}. Resource: ${row.resource_id}`);
                console.log(`   Action: ${row.action}`);
                console.log(`   Schedule: ${row.schedule_type}`);
                console.log(`   Active: ${row.is_active}`);
                console.log(`   Created: ${row.created_at}`);
                console.log(`   User ID: ${row.created_by}\n`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testSchedules();
