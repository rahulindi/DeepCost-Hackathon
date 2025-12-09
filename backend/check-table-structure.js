const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function checkTableStructure() {
    try {
        console.log('🔍 Checking users table structure...');
        
        // Check what columns exist in the users table
        const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Users table columns:');
        tableStructure.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type})`);
        });
        
        // Check if our target user exists and what columns are available
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', ['newstart@test.com']);
        
        if (userCheck.rows.length > 0) {
            console.log('\n👤 Found user with email newstart@test.com:');
            console.log('   Available columns:', Object.keys(userCheck.rows[0]));
            console.log('   Current data:', userCheck.rows[0]);
        } else {
            console.log('\n❌ No user found with email: newstart@test.com');
        }
        
    } catch (error) {
        console.error('❌ Error checking table structure:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

checkTableStructure();