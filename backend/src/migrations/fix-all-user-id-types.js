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

async function fixAllUserIdTypes() {
    try {
        console.log('🔧 Converting all user_id columns to BIGINT...\n');
        
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected\n');
        
        // Get all tables with user_id column
        const tablesQuery = `
            SELECT table_name, data_type 
            FROM information_schema.columns 
            WHERE column_name = 'user_id' 
            AND table_schema = 'public'
            ORDER BY table_name
        `;
        
        const result = await pool.query(tablesQuery);
        console.log(`Found ${result.rows.length} tables with user_id column:\n`);
        
        let converted = 0;
        let alreadyBigint = 0;
        
        for (const row of result.rows) {
            const tableName = row.table_name;
            const currentType = row.data_type;
            
            if (currentType === 'bigint') {
                console.log(`✅ ${tableName}.user_id: already BIGINT`);
                alreadyBigint++;
            } else {
                console.log(`🔄 ${tableName}.user_id: ${currentType} → BIGINT`);
                try {
                    await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN user_id TYPE BIGINT`);
                    console.log(`   ✅ Converted`);
                    converted++;
                } catch (error) {
                    console.log(`   ❌ Failed: ${error.message}`);
                }
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Already BIGINT: ${alreadyBigint}`);
        console.log(`   Converted: ${converted}`);
        console.log(`   Total: ${result.rows.length}`);
        
        await pool.end();
        console.log('\n🎉 Migration complete!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

fixAllUserIdTypes();
