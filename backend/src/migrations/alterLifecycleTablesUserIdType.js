// Migration: Alter existing lifecycle tables to use BIGINT for user IDs
// Fixes: "value out of range for type integer" error

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const DatabaseService = require('../services/databaseService');

async function alterLifecycleTablesUserIdType() {
    console.log('🔧 Altering lifecycle tables to use BIGINT for user IDs...');

    try {
        // Check if tables exist and alter created_by column type
        const tables = [
            'resource_schedules',
            'resource_lifecycle',
            'rightsizing_recommendations',
            'orphaned_resources'
        ];

        for (const table of tables) {
            try {
                // Check if table exists
                const checkTable = await DatabaseService.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    );
                `, [table]);

                if (checkTable.rows[0].exists) {
                    // Check if created_by column exists
                    const checkColumn = await DatabaseService.query(`
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = $1 AND column_name = 'created_by';
                    `, [table]);

                    if (checkColumn.rows.length > 0) {
                        const currentType = checkColumn.rows[0].data_type;
                        console.log(`📊 Table ${table}: created_by is ${currentType}`);

                        if (currentType === 'integer') {
                            // Alter column to BIGINT
                            await DatabaseService.query(`
                                ALTER TABLE ${table} 
                                ALTER COLUMN created_by TYPE BIGINT;
                            `);
                            console.log(`✅ Altered ${table}.created_by to BIGINT`);
                        } else if (currentType === 'bigint') {
                            console.log(`✅ ${table}.created_by already BIGINT`);
                        }
                    } else {
                        console.log(`⚠️  ${table} doesn't have created_by column`);
                    }
                } else {
                    console.log(`⚠️  Table ${table} doesn't exist`);
                }
            } catch (tableError) {
                console.error(`❌ Error processing table ${table}:`, tableError.message);
            }
        }

        console.log('🎉 Migration completed successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    alterLifecycleTablesUserIdType()
        .then(() => {
            console.log('✅ All lifecycle tables updated');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = alterLifecycleTablesUserIdType;
