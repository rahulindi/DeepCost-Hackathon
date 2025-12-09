const { Pool } = require('./backend/node_modules/pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
    try {
        const result = await pool.query('SELECT * FROM users LIMIT 10');
        console.log('📋 Existing users:');
        result.rows.forEach(user => {
            console.log(`   User:`, user);
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers();
