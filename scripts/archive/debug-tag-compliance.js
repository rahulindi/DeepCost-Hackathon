/**
 * Debug Tag Compliance - Find out why no violations are detected
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const DatabaseService = require('./backend/src/services/databaseService');

async function debugTagCompliance() {
    console.log('🔍 Debugging Tag Compliance Detection\n');
    
    const userId = 2; // Your user ID
    
    try {
        // Check 1: Total records for user
        console.log('📊 STEP 1: Total cost records for user', userId);
        const total = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records WHERE user_id = $1
        `, [userId]);
        console.log(`   Total records: ${total.rows[0].count}\n`);
        
        // Check 2: Sample of tag data
        console.log('📊 STEP 2: Sample tag data (first 10 records)');
        const sample = await DatabaseService.query(`
            SELECT service_name, region, tags, resource_id
            FROM cost_records 
            WHERE user_id = $1
            LIMIT 10
        `, [userId]);
        
        sample.rows.forEach((row, i) => {
            console.log(`\n   Record ${i + 1}:`);
            console.log(`   Service: ${row.service_name}, Region: ${row.region}`);
            console.log(`   Tags type: ${typeof row.tags}`);
            console.log(`   Tags value:`, row.tags);
            console.log(`   Tags is null: ${row.tags === null}`);
        });
        
        // Check 3: Count by tag status
        console.log('\n\n📊 STEP 3: Records by tag status');
        
        const nullTags = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records 
            WHERE user_id = $1 AND tags IS NULL
        `, [userId]);
        console.log(`   NULL tags: ${nullTags.rows[0].count}`);
        
        const emptyTags = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records 
            WHERE user_id = $1 AND tags = '{}'::jsonb
        `, [userId]);
        console.log(`   Empty object tags: ${emptyTags.rows[0].count}`);
        
        const withTags = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records 
            WHERE user_id = $1 AND tags IS NOT NULL AND tags != '{}'::jsonb
        `, [userId]);
        console.log(`   With tags: ${withTags.rows[0].count}`);
        
        // Check 4: Records missing specific required tags
        console.log('\n\n📊 STEP 4: Records missing required tags (Owner, CostCenter, Environment)');
        
        const missingOwner = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records 
            WHERE user_id = $1 
            AND (tags IS NULL OR NOT tags ? 'Owner')
        `, [userId]);
        console.log(`   Missing 'Owner' tag: ${missingOwner.rows[0].count}`);
        
        const missingCostCenter = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records 
            WHERE user_id = $1 
            AND (tags IS NULL OR NOT tags ? 'CostCenter')
        `, [userId]);
        console.log(`   Missing 'CostCenter' tag: ${missingCostCenter.rows[0].count}`);
        
        const missingEnvironment = await DatabaseService.query(`
            SELECT COUNT(*) as count FROM cost_records 
            WHERE user_id = $1 
            AND (tags IS NULL OR NOT tags ? 'Environment')
        `, [userId]);
        console.log(`   Missing 'Environment' tag: ${missingEnvironment.rows[0].count}`);
        
        // Check 5: Sample of records missing tags
        console.log('\n\n📊 STEP 5: Sample records missing required tags');
        const missingTags = await DatabaseService.query(`
            SELECT service_name, region, tags, cost_amount, resource_id
            FROM cost_records 
            WHERE user_id = $1 
            AND (
                tags IS NULL 
                OR NOT tags ? 'Owner'
                OR NOT tags ? 'CostCenter'
                OR NOT tags ? 'Environment'
            )
            ORDER BY cost_amount DESC
            LIMIT 5
        `, [userId]);
        
        if (missingTags.rows.length > 0) {
            console.log(`   Found ${missingTags.rows.length} records:\n`);
            missingTags.rows.forEach((row, i) => {
                console.log(`   ${i + 1}. ${row.service_name} in ${row.region}`);
                console.log(`      Cost: $${parseFloat(row.cost_amount).toFixed(2)}`);
                console.log(`      Resource: ${row.resource_id || 'N/A'}`);
                console.log(`      Tags:`, row.tags);
                console.log('');
            });
        } else {
            console.log('   ✅ All records have required tags!');
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ Debug complete!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

debugTagCompliance();
