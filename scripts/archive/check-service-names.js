/**
 * Check actual service names in database
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const DatabaseService = require('./backend/src/services/databaseService');

async function checkServiceNames() {
    const userId = 2;
    
    console.log('🔍 Checking Service Names in Database\n');
    
    try {
        // Get all unique service names for this user
        const services = await DatabaseService.query(`
            SELECT DISTINCT service_name, COUNT(*) as count
            FROM cost_records
            WHERE user_id = $1
            GROUP BY service_name
            ORDER BY count DESC
        `, [userId]);
        
        console.log(`Found ${services.rows.length} unique services:\n`);
        services.rows.forEach((row, i) => {
            console.log(`${i + 1}. "${row.service_name}" (${row.count} records)`);
        });
        
        // Check which have resource_ids
        console.log('\n\n📊 Services with resource IDs:\n');
        const withResourceIds = await DatabaseService.query(`
            SELECT DISTINCT service_name, COUNT(*) as count
            FROM cost_records
            WHERE user_id = $1
            AND resource_id IS NOT NULL
            AND resource_id != ''
            GROUP BY service_name
            ORDER BY count DESC
        `, [userId]);
        
        withResourceIds.rows.forEach((row, i) => {
            console.log(`${i + 1}. "${row.service_name}" (${row.count} with resource IDs)`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkServiceNames();
