/**
 * Direct test of orphan detection service
 * This bypasses the API and directly tests the service logic
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });

const ResourceLifecycleService = require('./backend/src/services/resourceLifecycleService');
const DatabaseService = require('./backend/src/services/databaseService');

async function testDirectOrphanDetection() {
    console.log('🧪 Direct Orphan Detection Test\n');
    console.log('=' .repeat(70));
    
    try {
        // Use user ID 2 (from debug output, this user has 3 detected records)
        const userId = 2;
        
        console.log(`\n📊 BEFORE SCAN: Check current state for user ${userId}`);
        console.log('-'.repeat(70));
        
        const before = await DatabaseService.query(`
            SELECT resource_id, resource_type, cleanup_status
            FROM orphaned_resources
            WHERE user_id = $1
            ORDER BY resource_id;
        `, [userId]);
        
        console.log(`Found ${before.rows.length} records:`);
        before.rows.forEach(row => {
            console.log(`  - ${row.resource_type}: ${row.resource_id} (${row.cleanup_status})`);
        });
        
        // Initialize service
        console.log(`\n🔍 RUNNING SCAN for user ${userId}`);
        console.log('-'.repeat(70));
        
        const lifecycleService = new ResourceLifecycleService();
        const result = await lifecycleService.detectOrphanedResources('default', null, userId);
        
        console.log(`\nScan result:`);
        console.log(`  Success: ${result.success}`);
        console.log(`  Detected: ${result.detected} resources`);
        
        // Check after scan
        console.log(`\n📊 AFTER SCAN: Check updated state for user ${userId}`);
        console.log('-'.repeat(70));
        
        const after = await DatabaseService.query(`
            SELECT resource_id, resource_type, cleanup_status
            FROM orphaned_resources
            WHERE user_id = $1
            ORDER BY resource_id;
        `, [userId]);
        
        console.log(`Found ${after.rows.length} records:`);
        after.rows.forEach(row => {
            console.log(`  - ${row.resource_type}: ${row.resource_id} (${row.cleanup_status})`);
        });
        
        // Compare
        console.log(`\n📊 COMPARISON`);
        console.log('-'.repeat(70));
        console.log(`Before: ${before.rows.length} records`);
        console.log(`After:  ${after.rows.length} records`);
        console.log(`Change: ${after.rows.length - before.rows.length} records`);
        
        // Find removed
        const removed = before.rows.filter(b => 
            !after.rows.find(a => a.resource_id === b.resource_id)
        );
        
        if (removed.length > 0) {
            console.log(`\n✅ Removed ${removed.length} resources (no longer in AWS):`);
            removed.forEach(r => {
                console.log(`  - ${r.resource_type}: ${r.resource_id}`);
            });
        }
        
        // Find added
        const added = after.rows.filter(a => 
            !before.rows.find(b => b.resource_id === a.resource_id)
        );
        
        if (added.length > 0) {
            console.log(`\n✅ Added ${added.length} new resources (found in AWS):`);
            added.forEach(r => {
                console.log(`  - ${r.resource_type}: ${r.resource_id}`);
            });
        }
        
        if (removed.length === 0 && added.length === 0) {
            console.log(`\n✅ No changes - database is in sync with AWS`);
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ Test complete!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('\nError details:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

// Run test
testDirectOrphanDetection();
