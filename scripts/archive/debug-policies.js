/**
 * Debug script to check policy visibility issue
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const DatabaseService = require('./backend/src/services/databaseService');

async function debugPolicies() {
    console.log('🔍 Debugging Policy Visibility Issue\n');
    console.log('='.repeat(70));
    
    try {
        // Check all policies
        console.log('\n📋 All Policies in Database:');
        const allPolicies = await DatabaseService.query(`
            SELECT id, user_id, type, name, active, created_at
            FROM governance_policies
            ORDER BY created_at DESC
        `);
        
        console.log(`Total: ${allPolicies.rows.length} policies\n`);
        allPolicies.rows.forEach((p, i) => {
            console.log(`${i + 1}. Policy ID: ${p.id}`);
            console.log(`   User ID: ${p.user_id}`);
            console.log(`   Type: ${p.type}`);
            console.log(`   Name: ${p.name}`);
            console.log(`   Active: ${p.active}`);
            console.log(`   Created: ${p.created_at}\n`);
        });
        
        // Check users
        console.log('👥 Users in System:');
        const users = await DatabaseService.query(`
            SELECT id, email
            FROM users
            ORDER BY id
        `);
        
        users.rows.forEach(u => {
            console.log(`  - User ID ${u.id}: ${u.email}`);
        });
        
        // Check what the API would return for each user
        console.log('\n🔍 Testing API Query for Each User:');
        for (const user of users.rows) {
            const userPolicies = await DatabaseService.query(`
                SELECT * FROM governance_policies 
                WHERE user_id = $1 AND active = true 
                ORDER BY priority NULLS LAST, created_at DESC
            `, [user.id]);
            
            console.log(`\n  User ${user.id} (${user.email}):`);
            console.log(`    Would see ${userPolicies.rows.length} policies`);
            if (userPolicies.rows.length > 0) {
                userPolicies.rows.forEach(p => {
                    console.log(`      - ${p.name} (${p.type})`);
                });
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ Debug complete!\n');
        
        console.log('💡 SOLUTION:');
        console.log('   If you\'re logged in as a different user than the one who created');
        console.log('   the policies, you won\'t see them (this is correct for security).');
        console.log('\n   To fix:');
        console.log('   1. Login as testdemo2@test.com (user ID 2) to see the policies');
        console.log('   2. OR create new policies with your current logged-in user');
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    } finally {
        process.exit(0);
    }
}

debugPolicies();
