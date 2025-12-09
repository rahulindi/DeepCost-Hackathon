require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');

(async () => {
    try {
        const result = await DatabaseService.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'resource_schedules'
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ resource_schedules table does not exist!');
            console.log('Need to run migration to create it.');
        } else {
            console.log('✅ resource_schedules table columns:');
            result.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
