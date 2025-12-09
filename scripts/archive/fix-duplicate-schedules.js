/**
 * Fix duplicate schedule constraint issue
 * Option 1: Remove the unique constraint
 * Option 2: Delete old inactive schedules
 */

const DatabaseService = require('./backend/src/services/databaseService');
require('dotenv').config({ path: './backend/.env' });

async function fixDuplicateSchedules() {
    console.log('🔧 Fixing duplicate schedule constraint issue...\n');
    
    try {
        // Option 1: Check if constraint exists
        console.log('1️⃣ Checking for unique constraint...');
        const constraints = await DatabaseService.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'resource_schedules' 
            AND constraint_type = 'UNIQUE'
        `);
        
        console.log('Found constraints:', constraints.rows);
        
        // Option 2: Show duplicate schedules
        console.log('\n2️⃣ Finding duplicate schedules...');
        const duplicates = await DatabaseService.query(`
            SELECT resource_id, schedule_type, COUNT(*) as count
            FROM resource_schedules
            GROUP BY resource_id, schedule_type
            HAVING COUNT(*) > 1
        `);
        
        if (duplicates.rows.length > 0) {
            console.log(`Found ${duplicates.rows.length} duplicate combinations:`);
            duplicates.rows.forEach(d => {
                console.log(`   - ${d.resource_id} / ${d.schedule_type}: ${d.count} schedules`);
            });
        } else {
            console.log('✅ No duplicates found');
        }
        
        // Option 3: Show all schedules
        console.log('\n3️⃣ All schedules:');
        const all = await DatabaseService.query(`
            SELECT id, resource_id, schedule_type, is_active, created_at
            FROM resource_schedules
            ORDER BY resource_id, schedule_type, created_at DESC
        `);
        
        all.rows.forEach(s => {
            console.log(`   ${s.id}: ${s.resource_id} / ${s.schedule_type} (${s.is_active ? 'Active' : 'Inactive'}) - ${s.created_at}`);
        });
        
        // Option 4: Remove the unique constraint
        console.log('\n4️⃣ Removing unique constraint...');
        try {
            await DatabaseService.query(`
                ALTER TABLE resource_schedules 
                DROP CONSTRAINT IF EXISTS resource_schedules_resource_id_schedule_type_key
            `);
            console.log('✅ Unique constraint removed');
        } catch (error) {
            console.log('⚠️ Constraint may not exist:', error.message);
        }
        
        // Option 5: Delete inactive old schedules
        console.log('\n5️⃣ Cleaning up inactive schedules...');
        const deleted = await DatabaseService.query(`
            DELETE FROM resource_schedules 
            WHERE is_active = false
            RETURNING id
        `);
        console.log(`✅ Deleted ${deleted.rows.length} inactive schedules`);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Fix complete! You can now create new schedules.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixDuplicateSchedules();
