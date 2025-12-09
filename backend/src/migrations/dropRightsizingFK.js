require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const DatabaseService = require('../services/databaseService');

async function dropFK() {
    console.log('Dropping foreign key...');
    await DatabaseService.query(`
        ALTER TABLE rightsizing_recommendations 
        DROP CONSTRAINT IF EXISTS rightsizing_recommendations_user_id_fkey
    `);
    console.log('✅ Done');
}

dropFK().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
