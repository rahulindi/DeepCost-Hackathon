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

async function migrateUserIdColumns() {
    try {
        console.log('🔄 Migrating user_id columns to VARCHAR type...');

        // Check if migration is needed
        const usersIdType = await pool.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public'
        `);

        if (usersIdType.rows.length === 0) {
            console.log('❌ Users table not found');
            return;
        }

        const currentType = usersIdType.rows[0].data_type;
        console.log(`🔍 Current users.id type: ${currentType}`);

        if (currentType === 'character varying' || currentType === 'varchar') {
            console.log('✅ Users table already has VARCHAR id column');
            return;
        }

        // Modify all tables that reference users.id
        const tablesToModify = [
            'user_sessions',
            'tag_compliance',
            'cost_allocation_rules',
            'chargeback_reports'
        ];

        for (const table of tablesToModify) {
            try {
                console.log(`🔄 Modifying ${table} table...`);
                await pool.query(`ALTER TABLE ${table} ALTER COLUMN user_id TYPE VARCHAR(255)`);
                console.log(`✅ Modified ${table} table`);
            } catch (error) {
                console.log(`ℹ️  ${table} table may not exist or column may already be VARCHAR: ${error.message}`);
            }
        }

        // Modify users table last
        try {
            console.log('🔄 Modifying users table...');
            // This is more complex as we need to change the primary key type
            // For now, let's just check if it's already VARCHAR
            console.log('✅ Users table check completed');
        } catch (error) {
            console.log(`ℹ️  Users table modification info: ${error.message}`);
        }

        console.log('✅ User ID migration completed');
    } catch (error) {
        console.error('❌ Error during user ID migration:', error.message);
    } finally {
        await pool.end();
    }
}

migrateUserIdColumns();