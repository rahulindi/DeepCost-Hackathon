const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function addUserIdColumn() {
    try {
        console.log('🔧 Adding user_id column to cost_records table...');

        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Check if user_id column already exists
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cost_records' 
            AND column_name = 'user_id'
            AND table_schema = 'public'
        `);

        if (columnCheck.rows.length > 0) {
            console.log('✅ user_id column already exists in cost_records table');
        } else {
            // Add user_id column as BIGINT (to support large timestamp-based IDs)
            console.log('➕ Adding user_id column to cost_records...');
            await pool.query(`
                ALTER TABLE cost_records 
                ADD COLUMN user_id BIGINT
            `);
            console.log('✅ user_id column added successfully');

            // Create index for better query performance
            console.log('📊 Creating index on user_id...');
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_cost_records_user_id 
                ON cost_records(user_id)
            `);
            console.log('✅ Index created successfully');
        }

        // Also add user_id to monthly_trends if it doesn't exist
        const monthlyTrendsCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'monthly_trends' 
            AND column_name = 'user_id'
            AND table_schema = 'public'
        `);

        if (monthlyTrendsCheck.rows.length === 0) {
            console.log('➕ Adding user_id column to monthly_trends...');
            await pool.query(`
                ALTER TABLE monthly_trends 
                ADD COLUMN user_id BIGINT
            `);
            console.log('✅ user_id column added to monthly_trends');
        }

        // Also add user_id to service_trends if it doesn't exist
        const serviceTrendsCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'service_trends' 
            AND column_name = 'user_id'
            AND table_schema = 'public'
        `);

        if (serviceTrendsCheck.rows.length === 0) {
            console.log('➕ Adding user_id column to service_trends...');
            await pool.query(`
                ALTER TABLE service_trends 
                ADD COLUMN user_id BIGINT
            `);
            console.log('✅ user_id column added to service_trends');
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('📊 user_id column is now available in cost_records, monthly_trends, and service_trends tables');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

addUserIdColumn();
