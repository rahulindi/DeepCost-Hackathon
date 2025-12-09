const DatabaseService = require('./backend/src/services/databaseService');
require('dotenv').config({ path: './backend/.env' });

async function testScheduleInsert() {
    console.log('🧪 Testing schedule insert...\n');
    
    try {
        // Test data
        const scheduleData = {
            resource_id: 'i-test-123',
            schedule_name: 'Test Schedule',
            schedule_type: 'shutdown',
            cron_expression: '0 18 * * 1-5',
            timezone: 'UTC',
            is_active: true,
            created_by: 1763658402716,
            metadata: JSON.stringify({})
        };

        console.log('Inserting schedule with data:', scheduleData);
        
        const result = await DatabaseService.query(
            `INSERT INTO resource_schedules 
             (resource_id, schedule_name, schedule_type, cron_expression, timezone, is_active, created_by, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [scheduleData.resource_id, scheduleData.schedule_name, scheduleData.schedule_type, 
             scheduleData.cron_expression, scheduleData.timezone, scheduleData.is_active, 
             scheduleData.created_by, scheduleData.metadata]
        );

        console.log('\n✅ Insert successful!');
        console.log('Result:', result.rows[0]);
        
    } catch (error) {
        console.error('\n❌ Insert failed:', error.message);
        console.error('Error details:', error);
    }
}

testScheduleInsert();
