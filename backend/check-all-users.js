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

async function checkAllUsers() {
    try {
        console.log('🔍 Checking all users in database...');
        
        // Get all users
        const allUsers = await pool.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
        
        if (allUsers.rows.length === 0) {
            console.log('❌ No users found in database');
            console.log('💡 You may need to create a user first through the application');
        } else {
            console.log(`📋 Found ${allUsers.rows.length} users:`);
            allUsers.rows.forEach((user, index) => {
                console.log(`   ${index + 1}. Email: ${user.email}, Role: ${user.role}, Created: ${user.created_at}`);
            });
        }
        
        // Check if there are any other tables that might contain users
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        console.log('\n📋 All tables in database:');
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error checking users:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

checkAllUsers();