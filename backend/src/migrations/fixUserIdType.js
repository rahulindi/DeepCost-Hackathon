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

async function fixUserIdType() {
    try {
        console.log('🔧 Fixing user_id column types to support large timestamps...');

        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Get all tables with user_id columns
        const tablesWithUserId = await pool.query(`
            SELECT DISTINCT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'user_id' 
            AND table_schema = 'public'
            ORDER BY table_name
        `);

        console.log(`📊 Found ${tablesWithUserId.rows.length} tables with user_id column`);

        for (const row of tablesWithUserId.rows) {
            const tableName = row.table_name;
            console.log(`\n🔄 Processing table: ${tableName}`);

            try {
                // Drop foreign key constraints first
                const constraints = await pool.query(`
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name = $1 
                    AND constraint_type = 'FOREIGN KEY'
                    AND constraint_name LIKE '%user_id%'
                `, [tableName]);

                for (const constraint of constraints.rows) {
                    console.log(`   ❌ Dropping constraint: ${constraint.constraint_name}`);
                    await pool.query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`);
                }

                // Change column type to BIGINT
                console.log(`   🔧 Changing user_id to BIGINT`);
                await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN user_id TYPE BIGINT`);

                // Re-add foreign key constraint if this references users table
                if (tableName !== 'users') {
                    console.log(`   ✅ Adding foreign key constraint`);
                    await pool.query(`
                        ALTER TABLE ${tableName} 
                        ADD CONSTRAINT ${tableName}_user_id_fkey 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    `);
                }

                console.log(`   ✅ Successfully updated ${tableName}`);
            } catch (tableError) {
                console.error(`   ❌ Error updating ${tableName}:`, tableError.message);
            }
        }

        // Also update users.id if it exists
        console.log(`\n🔄 Checking users table...`);
        const usersTable = await pool.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'id'
            AND table_schema = 'public'
        `);

        if (usersTable.rows.length > 0 && usersTable.rows[0].data_type === 'integer') {
            console.log(`   🔧 Changing users.id to BIGINT`);
            
            // Drop all foreign key constraints referencing users.id
            const fkConstraints = await pool.query(`
                SELECT 
                    tc.table_name, 
                    tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                    ON tc.constraint_name = ccu.constraint_name
                WHERE ccu.table_name = 'users' 
                AND ccu.column_name = 'id'
                AND tc.constraint_type = 'FOREIGN KEY'
            `);

            for (const fk of fkConstraints.rows) {
                console.log(`   ❌ Dropping FK: ${fk.table_name}.${fk.constraint_name}`);
                await pool.query(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT IF EXISTS ${fk.constraint_name}`);
            }

            // Change users.id to BIGINT
            await pool.query(`ALTER TABLE users ALTER COLUMN id TYPE BIGINT`);
            console.log(`   ✅ users.id changed to BIGINT`);

            // Recreate foreign keys
            for (const fk of fkConstraints.rows) {
                console.log(`   ✅ Recreating FK: ${fk.table_name}.${fk.constraint_name}`);
                await pool.query(`
                    ALTER TABLE ${fk.table_name} 
                    ADD CONSTRAINT ${fk.constraint_name} 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                `);
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('📊 All user_id columns are now BIGINT and can handle large timestamps');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

fixUserIdType();
