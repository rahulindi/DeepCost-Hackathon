require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function checkDatabaseStructure() {
    try {
        console.log('🔍 Checking database structure...');

        // Check users table structure
        const usersTable = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 Users table structure:');
        usersTable.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Check chargeback_reports table structure
        const reportsTable = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'chargeback_reports' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 Chargeback reports table structure:');
        reportsTable.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Check a few sample users
        const users = await pool.query('SELECT id, username, email FROM users LIMIT 3');
        console.log('\n👥 Sample users from database:');
        users.rows.forEach(user => {
            console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });

        console.log('\n✅ Database structure check completed');
    } catch (error) {
        console.error('❌ Error checking database structure:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseStructure();