const fs = require('fs');
const path = require('path');

// File paths (same as in authService.js)
const USER_DATA_FILE = path.join(__dirname, 'src/data/users.json');

function checkCurrentUserStatus() {
    try {
        console.log('🔍 Checking current user status...');
        
        if (!fs.existsSync(USER_DATA_FILE)) {
            console.log('❌ Users file not found');
            return;
        }
        
        const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
        const users = JSON.parse(data);
        
        console.log(`📋 Total users: ${users.length}`);
        
        // Find the user
        const user = users.find(u => u.email === 'newstart@test.com' || u.username === 'newstart');
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('👤 Current user status:');
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('   Subscription Tier:', user.subscription_tier);
        console.log('   Email Verified:', user.email_verified);
        console.log('   Created:', user.created_at);
        console.log('   Last Login:', user.last_login);
        
        // Check what role this maps to
        const RoleService = require('./src/services/roleService');
        const userRole = RoleService.getUserRole(user.subscription_tier);
        const roleInfo = RoleService.getRoleInfo(userRole);
        
        console.log('\n🎭 Role Mapping:');
        console.log('   Subscription Tier:', user.subscription_tier);
        console.log('   Mapped Role:', userRole);
        console.log('   Description:', roleInfo.description);
        
        console.log('\n🔑 Available Permissions:');
        roleInfo.permissions.forEach(permission => {
            console.log(`   ✅ ${permission}`);
        });
        
        console.log('\n🎯 Status Summary:');
        console.log(`   Is Admin: ${userRole === 'admin' ? 'YES' : 'NO'}`);
        console.log(`   Can View All Costs: ${roleInfo.permissions.includes('view_costs') ? 'YES' : 'NO'}`);
        console.log(`   Has Maximum Permissions: ${userRole === 'admin' ? 'YES' : 'NO'}`);
        
        if (user.subscription_tier !== 'enterprise') {
            console.log('\n⚠️  ISSUE FOUND: User is not on enterprise tier!');
            console.log('   Current tier:', user.subscription_tier);
            console.log('   Expected tier: enterprise');
            console.log('   This explains why UI shows FREE Plan');
        } else {
            console.log('\n✅ User has correct enterprise tier');
            console.log('   The UI should show admin permissions');
            console.log('   If UI still shows FREE, try logging out and back in');
        }
        
    } catch (error) {
        console.error('❌ Error checking user status:', error.message);
    }
}

checkCurrentUserStatus();