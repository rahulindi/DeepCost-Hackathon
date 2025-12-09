/**
 * Check what data is actually in the database
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function checkDatabaseData() {
    try {
        console.log('🔍 Checking database for cost records...\n');
        
        // Check total records
        const totalQuery = 'SELECT COUNT(*) as count FROM cost_records';
        const totalResult = await pool.query(totalQuery);
        console.log(`📊 Total cost records: ${totalResult.rows[0].count}`);
        
        // Check records by region
        const regionQuery = `
            SELECT region, COUNT(*) as count, SUM(cost_amount) as total_cost
            FROM cost_records
            GROUP BY region
            ORDER BY count DESC
        `;
        const regionResult = await pool.query(regionQuery);
        console.log('\n📍 Records by Region:');
        regionResult.rows.forEach(row => {
            console.log(`   ${row.region || 'NULL'}: ${row.count} records, $${parseFloat(row.total_cost || 0).toFixed(2)}`);
        });
        
        // Check recent records
        const recentQuery = `
            SELECT date, service_name, cost_amount, region, user_id
            FROM cost_records
            ORDER BY date DESC
            LIMIT 10
        `;
        const recentResult = await pool.query(recentQuery);
        console.log('\n📅 Recent 10 Records:');
        recentResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.date} | ${row.service_name} | $${row.cost_amount} | ${row.region} | User: ${row.user_id}`);
        });
        
        // Check user_id column
        const userQuery = `
            SELECT user_id, COUNT(*) as count
            FROM cost_records
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY count DESC
        `;
        const userResult = await pool.query(userQuery);
        console.log('\n👤 Records by User ID:');
        if (userResult.rows.length === 0) {
            console.log('   ⚠️  No records have user_id set!');
            console.log('   This is why exports show dummy data - no data is associated with users');
        } else {
            userResult.rows.forEach(row => {
                console.log(`   User ${row.user_id}: ${row.count} records`);
            });
        }
        
        // Check if cost_records table has the expected columns
        const columnsQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cost_records'
            ORDER BY ordinal_position
        `;
        const columnsResult = await pool.query(columnsQuery);
        console.log('\n📋 cost_records Table Columns:');
        columnsResult.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type}`);
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkDatabaseData();
