const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function upgradeUser() {
    try {
        console.log('🔄 Connecting to database...');
        
        // First, let's see the current user
        const currentUser = await pool.query(
            'SELECT id, username, email, subscription_tier FROM users WHERE email = $1',
            ['newstart@test.com']
        );
        
        if (currentUser.rows.length === 0) {
            console.log('❌ User not found with email: newstart@test.com');
            return;
        }
        
        console.log('📋 Current user details:', currentUser.rows[0]);
        
        // Update the subscription tier to 'enterprise' (maximum permissions)
        const updateResult = await pool.query(
            'UPDATE users SET subscription_tier = $1 WHERE email = $2 RETURNING id, username, email, subscription_tier',
            ['enterprise', 'newstart@test.com']
        );
        
        if (updateResult.rows.length > 0) {
            console.log('✅ User updated successfully!');
            console.log('📋 Updated user details:', updateResult.rows[0]);
            console.log('🎯 New role mapping: enterprise → admin');
            console.log('🔑 New permissions: ALL PERMISSIONS');
            console.log('   ✅ view_costs - Can view all cost data');
            console.log('   ✅ export_costs - Can export data');
            console.log('   ✅ create_alerts - Can create alerts');
            console.log('   ✅ manage_alerts - Can manage all alerts');
            console.log('   ✅ manage_users - Can manage other users');
            console.log('   ✅ view_audit_logs - Can view audit logs');
            console.log('   ✅ bulk_operations - Can perform bulk operations');
            console.log('   ✅ api_access - Can access all APIs');
            console.log('   ✅ unlimited_exports - No export limits');
        } else {
            console.log('❌ Failed to update user');
        }
        
    } catch (error) {
        console.error('❌ Error updating user:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

upgradeUser();