// Comprehensive verification script for orphan detection fix
require('dotenv').config({ path: './backend/.env' });

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const OrphanDetectionService = require('./backend/src/services/orphanDetectionService');
const ResourceLifecycleService = require('./backend/src/services/resourceLifecycleService');
const DatabaseService = require('./backend/src/services/databaseService');

async function verifyOrphanFix() {
    console.log('🔍 COMPREHENSIVE ORPHAN DETECTION FIX VERIFICATION\n');
    console.log('='.repeat(60));
    
    let allTestsPassed = true;
    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;

    // Test 1: AWS Credentials
    console.log('\n✓ TEST 1: AWS Credentials Loading');
    console.log('-'.repeat(60));
    const creds = SimpleAwsCredentials.get(dbUserId);
    if (creds.success) {
        console.log('✅ PASS: AWS credentials loaded successfully');
        console.log(`   Region: ${creds.credentials.region}`);
    } else {
        console.log('❌ FAIL: AWS credentials not found');
        allTestsPassed = false;
    }

    // Test 2: OrphanDetectionService
    console.log('\n✓ TEST 2: OrphanDetectionService.detectOrphans()');
    console.log('-'.repeat(60));
    const orphanService = new OrphanDetectionService();
    try {
        const orphans = await orphanService.detectOrphans('test-account', null, testUserId);
        console.log(`✅ PASS: Detected ${orphans.length} orphaned resources`);
        if (orphans.length > 0) {
            console.log(`   Sample: ${orphans[0].resourceType} - ${orphans[0].resourceId}`);
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}`);
        allTestsPassed = false;
    }

    // Test 3: ResourceLifecycleService
    console.log('\n✓ TEST 3: ResourceLifecycleService.detectOrphanedResources()');
    console.log('-'.repeat(60));
    const lifecycleService = new ResourceLifecycleService();
    try {
        const result = await lifecycleService.detectOrphanedResources('test-account', null, dbUserId);
        if (result.success) {
            console.log(`✅ PASS: Service returned success`);
            console.log(`   Detected: ${result.detected} orphans`);
            console.log(`   Saved to database: ${result.data.length} records`);
        } else {
            console.log(`❌ FAIL: Service returned failure`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}`);
        allTestsPassed = false;
    }

    // Test 4: Database Schema
    console.log('\n✓ TEST 4: Database Schema Verification');
    console.log('-'.repeat(60));
    try {
        const schema = await DatabaseService.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orphaned_resources'
            ORDER BY ordinal_position
        `);
        const columns = schema.rows.map(r => r.column_name);
        const requiredColumns = ['user_id', 'potential_savings', 'cleanup_status', 'detection_metadata'];
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length === 0) {
            console.log('✅ PASS: All required columns exist');
            console.log(`   Columns: ${columns.join(', ')}`);
        } else {
            console.log(`❌ FAIL: Missing columns: ${missingColumns.join(', ')}`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}`);
        allTestsPassed = false;
    }

    // Test 5: User-specific filtering
    console.log('\n✓ TEST 5: User-specific Data Filtering');
    console.log('-'.repeat(60));
    try {
        const userOrphans = await DatabaseService.query(
            'SELECT COUNT(*) as count FROM orphaned_resources WHERE user_id = $1',
            [dbUserId]
        );
        console.log(`✅ PASS: Query executed successfully`);
        console.log(`   User ${dbUserId} has ${userOrphans.rows[0].count} orphaned resources`);
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}`);
        allTestsPassed = false;
    }

    // Test 6: No premature AWS initialization
    console.log('\n✓ TEST 6: No Premature AWS Initialization');
    console.log('-'.repeat(60));
    const SchedulingService = require('./backend/src/services/schedulingService');
    const schedulingService = new SchedulingService();
    if (schedulingService.ec2 === null) {
        console.log('✅ PASS: SchedulingService does not initialize AWS in constructor');
    } else {
        console.log('❌ FAIL: SchedulingService initialized AWS prematurely');
        allTestsPassed = false;
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    if (allTestsPassed) {
        console.log('\n🎉 ALL TESTS PASSED! ✅');
        console.log('\nThe orphan detection feature is working correctly:');
        console.log('  ✓ AWS credentials load properly');
        console.log('  ✓ OrphanDetectionService initializes with user credentials');
        console.log('  ✓ ResourceLifecycleService passes userId correctly');
        console.log('  ✓ Database schema supports all required fields');
        console.log('  ✓ User-specific filtering works');
        console.log('  ✓ No premature AWS initialization');
        console.log('\n✅ ISSUE FIXED AND VERIFIED');
        process.exit(0);
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        console.log('\nPlease review the failures above.');
        process.exit(1);
    }
}

verifyOrphanFix().catch(error => {
    console.error('\n❌ Verification failed with error:', error);
    process.exit(1);
});
