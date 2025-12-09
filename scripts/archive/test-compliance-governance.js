// Test script to verify Compliance & Governance functionality
require('dotenv').config({ path: './backend/.env' });

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const GovernanceService = require('./backend/src/services/governanceService');
const DatabaseService = require('./backend/src/services/databaseService');

async function testComplianceGovernance() {
    console.log('🧪 Testing Compliance & Governance Feature\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    // Test 1: Check AWS Credentials
    console.log('2️⃣ Checking AWS credentials...');
    const creds = SimpleAwsCredentials.get(dbUserId);
    if (creds.success) {
        console.log('✅ AWS credentials loaded');
        console.log(`   Region: ${creds.credentials.region}`);
    } else {
        console.log('❌ AWS credentials not found');
        console.log('   Run: node store-aws-creds.js');
        process.exit(1);
    }

    // Test 2: Check Database Table
    console.log('\n3️⃣ Checking governance_policies table...');
    try {
        const tableCheck = await DatabaseService.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'governance_policies'
        `);
        
        if (tableCheck.rows.length > 0) {
            console.log('✅ governance_policies table exists');
        } else {
            console.log('⚠️  governance_policies table does not exist');
            console.log('   Creating table...');
            
            await DatabaseService.query(`
                CREATE TABLE IF NOT EXISTS governance_policies (
                    id SERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    params JSONB,
                    active BOOLEAN DEFAULT true,
                    priority INTEGER DEFAULT 100,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Table created');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: List Policies
    console.log('\n4️⃣ Testing listPolicies()...');
    try {
        const policies = await GovernanceService.listPolicies(dbUserId);
        console.log(`✅ Retrieved ${policies.length} policies`);
        
        if (policies.length > 0) {
            console.log(`   Sample policy: ${policies[0].name} (${policies[0].type})`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Create a Test Policy
    console.log('\n5️⃣ Testing policy creation...');
    try {
        const testPolicy = {
            type: 'budget_threshold',
            name: 'Test Budget Policy',
            params: { budget_amount: 100, period: 'monthly' },
            active: true,
            priority: 100
        };
        
        const result = await DatabaseService.query(
            `INSERT INTO governance_policies(user_id, type, name, params, active, priority, created_at) 
             VALUES($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
            [dbUserId, testPolicy.type, testPolicy.name, JSON.stringify(testPolicy.params), testPolicy.active, testPolicy.priority]
        );
        
        console.log(`✅ Test policy created with ID: ${result.rows[0].id}`);
        
        // Clean up test policy
        await DatabaseService.query(
            'DELETE FROM governance_policies WHERE id = $1',
            [result.rows[0].id]
        );
        console.log('   Test policy cleaned up');
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Evaluate and Enforce
    console.log('\n6️⃣ Testing evaluateAndEnforce()...');
    try {
        const result = await GovernanceService.evaluateAndEnforce(dbUserId, creds.credentials, {});
        
        if (result.success) {
            console.log('✅ Governance evaluation completed');
            console.log(`   Policies evaluated: ${result.policiesEvaluated || 0}`);
            console.log(`   Actions taken: ${result.actionsTaken || 0}`);
            console.log(`   Violations found: ${result.violations?.length || 0}`);
        } else {
            console.log(`⚠️  ${result.message || 'No policies to evaluate'}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 6: Check Policy Count
    console.log('\n7️⃣ Checking policy statistics...');
    try {
        const stats = await DatabaseService.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE active = true) as active,
                COUNT(*) FILTER (WHERE type = 'budget_threshold') as budget_policies,
                COUNT(*) FILTER (WHERE type = 'tag_compliance') as tag_policies
             FROM governance_policies 
             WHERE user_id = $1`,
            [dbUserId]
        );
        
        if (stats.rows.length > 0) {
            const s = stats.rows[0];
            console.log('✅ Policy statistics:');
            console.log(`   Total policies: ${s.total}`);
            console.log(`   Active policies: ${s.active}`);
            console.log(`   Budget policies: ${s.budget_policies}`);
            console.log(`   Tag policies: ${s.tag_policies}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Compliance & Governance testing complete!');
    process.exit(0);
}

testComplianceGovernance().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
