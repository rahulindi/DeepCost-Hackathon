require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');

async function checkUsersTable() {
    try {
        // Check table structure
        const columns = await DatabaseService.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Current users table structure:');
        console.log('='.repeat(60));
        columns.rows.forEach(col => {
            console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable}`);
        });
        
        // Check data
        const users = await DatabaseService.query('SELECT * FROM users LIMIT 5');
        console.log(`\n👥 Users in database: ${users.rows.length}`);
        users.rows.forEach(user => {
            console.log(`  - ${user.email || user.username || user.id}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUsersTable();
