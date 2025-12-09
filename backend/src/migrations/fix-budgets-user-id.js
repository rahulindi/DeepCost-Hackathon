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

async function fixBudgetsUserId() {
    try {
        console.log('🔧 Fixing budgets.user_id to BIGINT...\n');
        
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected\n');
        
        // Check current type
        const checkQuery = `
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'budgets' AND column_name = 'user_id'
        `;
        const checkResult = await pool.query(checkQuery);
        
        if (checkResult.rows.length === 0) {
            console.log('⚠️  budgets table or user_id column does not exist');
            await pool.end();
            return;
        }
        
        const currentType = checkResult.rows[0].data_type;
        console.log(`Current budgets.user_id type: ${currentType}`);
        
        if (currentType === 'bigint') {
            console.log('✅ Already BIGINT, no change needed');
            await pool.end();
            return;
        }
        
        console.log('\n🔄 Converting to BIGINT...');
        
        // Alter column type
        await pool.query('ALTER TABLE budgets ALTER COLUMN user_id TYPE BIGINT');
        
        console.log('✅ budgets.user_id converted to BIGINT');
        
        // Verify
        const verifyResult = await pool.query(checkQuery);
        console.log(`\n✅ Verified: budgets.user_id is now ${verifyResult.rows[0].data_type}`);
        
        await pool.end();
        console.log('\n🎉 Migration complete!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

fixBudgetsUserId();
