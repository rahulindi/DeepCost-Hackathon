/**
 * Debug script to check orphaned resources sync behavior
 * This will help us understand what's happening step by step
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const DatabaseService = require('./backend/src/services/databaseService');

async function debugOrphanSync() {
    console.log('🔍 DEBUG: Orphaned Resources Sync\n');
    console.log('=' .repeat(70));
    
    try {
        // Step 1: Check table schema
        console.log('\n📋 STEP 1: Check orphaned_resources table schema');
        console.log('-'.repeat(70));
        
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'orphaned_resources'
            ORDER BY ordinal_position;
        `;
        
        const schema = await DatabaseService.query(schemaQuery);
        console.log('Table columns:');
        schema.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Step 2: Check current data
        console.log('\n📊 STEP 2: Current orphaned_resources data');
        console.log('-'.repeat(70));
        
        const allData = await DatabaseService.query(`
            SELECT 
                id, 
                resource_id, 
                resource_type, 
                user_id, 
                cleanup_status,
                detected_at
            FROM orphaned_resources
            ORDER BY detected_at DESC;
        `);
        
        console.log(`Total records: ${allData.rows.length}`);
        if (allData.rows.length > 0) {
            console.log('\nRecords:');
            allData.rows.forEach(row => {
                console.log(`  [${row.id}] ${row.resource_type}: ${row.resource_id}`);
                console.log(`      User: ${row.user_id}, Status: ${row.cleanup_status}, Detected: ${row.detected_at}`);
            });
        } else {
            console.log('  (No records found)');
        }
        
        // Step 3: Check by status
        console.log('\n📊 STEP 3: Records by cleanup_status');
        console.log('-'.repeat(70));
        
        const byStatus = await DatabaseService.query(`
            SELECT cleanup_status, COUNT(*) as count
            FROM orphaned_resources
            GROUP BY cleanup_status
            ORDER BY count DESC;
        `);
        
        if (byStatus.rows.length > 0) {
            byStatus.rows.forEach(row => {
                console.log(`  ${row.cleanup_status}: ${row.count} records`);
            });
        } else {
            console.log('  (No records found)');
        }
        
        // Step 4: Check by user
        console.log('\n📊 STEP 4: Records by user_id');
        console.log('-'.repeat(70));
        
        const byUser = await DatabaseService.query(`
            SELECT user_id, COUNT(*) as count
            FROM orphaned_resources
            GROUP BY user_id
            ORDER BY count DESC;
        `);
        
        if (byUser.rows.length > 0) {
            byUser.rows.forEach(row => {
                console.log(`  User ${row.user_id}: ${row.count} records`);
            });
        } else {
            console.log('  (No records found)');
        }
        
        // Step 5: Check for UNIQUE constraint on resource_id
        console.log('\n🔍 STEP 5: Check constraints');
        console.log('-'.repeat(70));
        
        const constraints = await DatabaseService.query(`
            SELECT 
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'orphaned_resources';
        `);
        
        if (constraints.rows.length > 0) {
            console.log('Constraints:');
            constraints.rows.forEach(row => {
                console.log(`  - ${row.constraint_type}: ${row.constraint_name} on ${row.column_name}`);
            });
        } else {
            console.log('  (No constraints found)');
        }
        
        // Step 6: Simulate the sync logic
        console.log('\n🧪 STEP 6: Simulate sync logic for user 1');
        console.log('-'.repeat(70));
        
        const userId = 1;
        
        // Show current state for user
        const userRecords = await DatabaseService.query(`
            SELECT resource_id, resource_type, cleanup_status
            FROM orphaned_resources
            WHERE user_id = $1
            ORDER BY resource_id;
        `, [userId]);
        
        console.log(`Current records for user ${userId}: ${userRecords.rows.length}`);
        userRecords.rows.forEach(row => {
            console.log(`  - ${row.resource_type}: ${row.resource_id} (${row.cleanup_status})`);
        });
        
        // Simulate marking as 'scanning'
        console.log('\nSimulating: Mark as "scanning"...');
        const markResult = await DatabaseService.query(`
            UPDATE orphaned_resources 
            SET cleanup_status = 'scanning' 
            WHERE user_id = $1 AND cleanup_status IN ('detected', 'scheduled')
            RETURNING resource_id, resource_type;
        `, [userId]);
        
        console.log(`  Marked ${markResult.rows.length} records as 'scanning'`);
        markResult.rows.forEach(row => {
            console.log(`    - ${row.resource_type}: ${row.resource_id}`);
        });
        
        // Show state after marking
        const afterMark = await DatabaseService.query(`
            SELECT resource_id, resource_type, cleanup_status
            FROM orphaned_resources
            WHERE user_id = $1
            ORDER BY resource_id;
        `, [userId]);
        
        console.log(`\nState after marking:`);
        afterMark.rows.forEach(row => {
            console.log(`  - ${row.resource_type}: ${row.resource_id} (${row.cleanup_status})`);
        });
        
        // Rollback the simulation
        console.log('\nRolling back simulation...');
        await DatabaseService.query(`
            UPDATE orphaned_resources 
            SET cleanup_status = 'detected' 
            WHERE user_id = $1 AND cleanup_status = 'scanning';
        `, [userId]);
        console.log('  ✅ Rolled back');
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ Debug complete!\n');
        
        console.log('💡 NEXT STEPS:');
        console.log('1. Run the migration: node backend/src/migrations/updateOrphanedResourcesSchema.js');
        console.log('2. Check if user_id column exists and has data');
        console.log('3. Test the scan with: node test-orphan-sync.js');
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        console.error('\nError details:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

// Run debug
debugOrphanSync();
