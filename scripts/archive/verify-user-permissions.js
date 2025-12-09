const { Pool } = require('./backend/node_modules/pg');
const RoleService = require('./backend/src/services/roleService');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function verifyUserPermissions() {
    try {
        console.log('🔍 Verifying user permissions...');

        // Get the user from database
        const userResult = await pool.query(
            'SELECT id, username, email, subscription_tier FROM users WHERE email = $1',
            ['newstart@test.com']
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found with email: newstart@test.com');
            return;
        }

        const user = userResult.rows[0];
        console.log('👤 User Details:', user);

        // Get role and permissions using RoleService
        const userRole = RoleService.getUserRole(user.subscription_tier);
        const roleInfo = RoleService.getRoleInfo(userRole);

        console.log('\n🎭 Role Information:');
        console.log('   Subscription Tier:', user.subscription_tier);
        console.log('   User Role:', userRole);
        console.log('   Description:', roleInfo.description);

        console.log('\n🔑 Available Permissions:');
        roleInfo.permissions.forEach(permission => {
            console.log(`   ✅ ${permission}`);
        });

        // Test specific permission checks
        console.log('\n🧪 Permission Tests:');
        const testPermissions = ['view_costs', 'api_access', 'manage_users', 'unlimited_exports'];

        testPermissions.forEach(permission => {
            const hasPermission = RoleService.hasPermission(userRole, permission);
            console.log(`   ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission}`);
        });

        console.log('\n🎯 Summary:');
        console.log(`   Total Permissions: ${roleInfo.permissions.length}`);
        console.log(`   Can View All Costs: ${RoleService.hasPermission(userRole, 'view_costs') ? 'YES' : 'NO'}`);
        console.log(`   Can Access All Features: ${userRole === 'admin' ? 'YES' : 'NO'}`);

    } catch (error) {
        console.error('❌ Error verifying permissions:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

verifyUserPermissions();