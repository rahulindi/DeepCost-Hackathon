/**
 * Real-Time Compliance & Governance Testing
 * Tests all compliance features with actual AWS data
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const DatabaseService = require('./backend/src/services/databaseService');

const API_BASE = 'http://localhost:3001/api';
let authToken = '';
let userId = '';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_USER = {
    email: process.env.TEST_EMAIL || 'your-email@example.com',
    password: process.env.TEST_PASSWORD || 'your-password'
};

// Helper to make API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers: { Authorization: `Bearer ${authToken}` }
        };
        if (data) config.data = data;
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function login() {
    console.log('🔐 Step 1: Login');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
        if (response.data.success) {
            authToken = response.data.token;
            userId = response.data.user.id;
            console.log(`✅ Logged in as: ${response.data.user.email}`);
            console.log(`   User ID: ${userId}`);
            return true;
        }
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function checkHealthStatus() {
    console.log('\n📊 Step 2: Check Governance Service Health');
    console.log('-'.repeat(70));
    
    try {
        const response = await axios.get(`${API_BASE}/governance/health`);
        console.log('✅ Governance service is running');
        console.log('   Features:', response.data.features.join(', '));
        console.log('   Endpoints:', response.data.endpoints.join(', '));
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

async function checkCurrentSpend() {
    console.log('\n💰 Step 3: Check Current Spend (for budget compliance)');
    console.log('-'.repeat(70));
    
    const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
        ? parseInt(userId.substring(5), 10)
        : userId;
    
    try {
        // Get monthly spend
        const monthlyResult = await DatabaseService.query(`
            SELECT COALESCE(SUM(cost_amount), 0) AS total
            FROM cost_records
            WHERE user_id = $1 
            AND date >= date_trunc('month', CURRENT_DATE)
        `, [dbUserId]);
        
        const monthlySpend = parseFloat(monthlyResult.rows[0].total) || 0;
        
        // Get daily spend
        const dailyResult = await DatabaseService.query(`
            SELECT COALESCE(SUM(cost_amount), 0) AS total
            FROM cost_records
            WHERE user_id = $1 
            AND date >= CURRENT_DATE
        `, [dbUserId]);
        
        const dailySpend = parseFloat(dailyResult.rows[0].total) || 0;
        
        console.log(`✅ Current spend for user ${userId}:`);
        console.log(`   Monthly: $${monthlySpend.toFixed(2)}`);
        console.log(`   Daily: $${dailySpend.toFixed(2)}`);
        
        return { monthly: monthlySpend, daily: dailySpend };
    } catch (error) {
        console.error('❌ Failed to get spend:', error.message);
        return { monthly: 0, daily: 0 };
    }
}

async function listExistingPolicies() {
    console.log('\n📋 Step 4: List Existing Governance Policies');
    console.log('-'.repeat(70));
    
    const result = await apiCall('/governance/policies');
    
    if (result.success) {
        console.log(`✅ Found ${result.policies.length} active policies`);
        if (result.policies.length > 0) {
            result.policies.forEach((policy, idx) => {
                console.log(`\n   Policy ${idx + 1}:`);
                console.log(`   - ID: ${policy.id}`);
                console.log(`   - Type: ${policy.type}`);
                console.log(`   - Name: ${policy.name}`);
                console.log(`   - Active: ${policy.active}`);
                console.log(`   - Params:`, JSON.stringify(policy.params, null, 2).split('\n').join('\n     '));
            });
        } else {
            console.log('   (No policies configured yet)');
        }
        return result.policies;
    } else {
        console.error('❌ Failed to list policies');
        return [];
    }
}

async function createBudgetPolicy(budgetAmount, currentSpend) {
    console.log('\n📝 Step 5: Create Budget Threshold Policy');
    console.log('-'.repeat(70));
    
    // Set budget slightly below current spend to trigger violation
    const testBudget = Math.max(budgetAmount, currentSpend - 10);
    
    console.log(`   Setting budget: $${testBudget.toFixed(2)}`);
    console.log(`   Current spend: $${currentSpend.toFixed(2)}`);
    console.log(`   Expected: ${currentSpend >= testBudget ? 'VIOLATION ⚠️' : 'COMPLIANT ✅'}`);
    
    const result = await apiCall('/governance/policies', 'POST', {
        type: 'budget_threshold',
        name: 'Monthly Budget Limit',
        params: {
            budget_amount: testBudget,
            period: 'monthly',
            notify_webhook: null
        },
        active: true,
        priority: 1
    });
    
    if (result.success) {
        console.log(`✅ Budget policy created with ID: ${result.policyId}`);
        return result.policyId;
    } else {
        console.error('❌ Failed to create budget policy:', result.error);
        return null;
    }
}

async function createTagCompliancePolicy() {
    console.log('\n📝 Step 6: Create Tag Compliance Policy');
    console.log('-'.repeat(70));
    
    const result = await apiCall('/governance/policies', 'POST', {
        type: 'tag_compliance',
        name: 'Required Tags Check',
        params: {
            requiredTags: {
                Owner: '.*',
                CostCenter: '.*',
                Environment: '.*'
            },
            autoRemediate: false
        },
        active: true,
        priority: 2
    });
    
    if (result.success) {
        console.log(`✅ Tag compliance policy created with ID: ${result.policyId}`);
        return result.policyId;
    } else {
        console.error('❌ Failed to create tag policy:', result.error);
        return null;
    }
}

async function enforceAllPolicies() {
    console.log('\n⚡ Step 7: Enforce All Governance Policies');
    console.log('-'.repeat(70));
    
    const result = await apiCall('/governance/enforce', 'POST', {});
    
    if (result.success) {
        console.log(`✅ Policy enforcement complete`);
        console.log(`   Total policies evaluated: ${result.results.length}`);
        console.log(`   Policies enforced: ${result.enforcedCount}`);
        
        console.log('\n   Detailed Results:');
        result.results.forEach((r, idx) => {
            const status = r.enforced ? '⚠️  VIOLATION' : '✅ COMPLIANT';
            console.log(`\n   ${idx + 1}. Policy ID ${r.policyId} (${r.type}): ${status}`);
            if (r.details) {
                console.log(`      Details:`, JSON.stringify(r.details, null, 2).split('\n').join('\n      '));
            }
        });
        
        return result;
    } else {
        console.error('❌ Policy enforcement failed:', result.error);
        return null;
    }
}

async function checkGovernanceEvents() {
    console.log('\n📊 Step 8: Check Governance Events Log');
    console.log('-'.repeat(70));
    
    try {
        const result = await DatabaseService.query(`
            SELECT 
                event_type,
                details,
                created_at
            FROM governance_events
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        if (result.rows.length > 0) {
            console.log(`✅ Found ${result.rows.length} recent governance events:`);
            result.rows.forEach((event, idx) => {
                console.log(`\n   ${idx + 1}. ${event.event_type}`);
                console.log(`      Time: ${event.created_at}`);
                console.log(`      Details:`, JSON.stringify(event.details, null, 2).split('\n').join('\n      '));
            });
        } else {
            console.log('   (No governance events recorded yet)');
        }
    } catch (error) {
        console.error('❌ Failed to check events:', error.message);
    }
}

async function checkUntaggedResources() {
    console.log('\n🏷️  Step 9: Check Untagged Resources (Tag Compliance)');
    console.log('-'.repeat(70));
    
    const dbUserId = typeof userId === 'string' && userId.startsWith('user-') 
        ? parseInt(userId.substring(5), 10)
        : userId;
    
    try {
        const result = await DatabaseService.query(`
            SELECT 
                service_name,
                region,
                tags,
                cost_amount,
                date
            FROM cost_records
            WHERE user_id = $1 
            AND (tags IS NULL OR jsonb_typeof(tags) != 'object')
            ORDER BY cost_amount DESC
            LIMIT 10
        `, [dbUserId]);
        
        if (result.rows.length > 0) {
            console.log(`⚠️  Found ${result.rows.length} resources without proper tags:`);
            result.rows.forEach((resource, idx) => {
                console.log(`\n   ${idx + 1}. ${resource.service_name} in ${resource.region}`);
                console.log(`      Cost: $${parseFloat(resource.cost_amount).toFixed(2)}`);
                console.log(`      Date: ${resource.date}`);
                console.log(`      Tags: ${resource.tags || 'None'}`);
            });
        } else {
            console.log('✅ All resources are properly tagged!');
        }
    } catch (error) {
        console.error('❌ Failed to check untagged resources:', error.message);
    }
}

async function runComplianceTest() {
    console.log('🧪 REAL-TIME COMPLIANCE & GOVERNANCE TESTING\n');
    console.log('='.repeat(70));
    
    try {
        // Step 1: Login
        const loggedIn = await login();
        if (!loggedIn) {
            console.error('\n❌ Cannot proceed without authentication');
            return;
        }
        
        // Step 2: Health check
        const healthy = await checkHealthStatus();
        if (!healthy) {
            console.error('\n❌ Governance service is not available');
            return;
        }
        
        // Step 3: Check current spend
        const spend = await checkCurrentSpend();
        
        // Step 4: List existing policies
        const existingPolicies = await listExistingPolicies();
        
        // Step 5: Create budget policy
        await createBudgetPolicy(100, spend.monthly);
        
        // Step 6: Create tag compliance policy
        await createTagCompliancePolicy();
        
        // Step 7: Enforce all policies
        const enforcement = await enforceAllPolicies();
        
        // Step 8: Check governance events
        await checkGovernanceEvents();
        
        // Step 9: Check untagged resources
        await checkUntaggedResources();
        
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('✅ COMPLIANCE TEST COMPLETE!\n');
        
        console.log('📊 Summary:');
        console.log(`   - Current monthly spend: $${spend.monthly.toFixed(2)}`);
        console.log(`   - Policies evaluated: ${enforcement?.results?.length || 0}`);
        console.log(`   - Violations detected: ${enforcement?.enforcedCount || 0}`);
        console.log(`   - Existing policies: ${existingPolicies.length}`);
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Check the frontend Compliance & Governance page');
        console.log('   2. View policy violations and compliance status');
        console.log('   3. Create additional policies as needed');
        console.log('   4. Set up webhooks for real-time alerts');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('Error details:', error.message);
    } finally {
        process.exit(0);
    }
}

// Run the test
runComplianceTest();
