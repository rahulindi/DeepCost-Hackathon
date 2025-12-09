const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// File paths
const USER_DATA_FILE = path.join(__dirname, 'src/data/users.json');

// 🔒 SECURITY: Require JWT_SECRET from environment, no fallback
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET environment variable is required');
    console.error('   Please set JWT_SECRET in your .env file');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

function refreshUserToken() {
    try {
        console.log('🔄 Refreshing user token with updated subscription tier...');
        
        // Load users
        const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
        const users = JSON.parse(data);
        
        // Find the user
        const user = users.find(u => u.email === 'newstart@test.com' || u.username === 'newstart');
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('👤 Current user data:');
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('   Subscription Tier:', user.subscription_tier);
        
        // Generate new JWT token with updated subscription tier
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            subscription_tier: user.subscription_tier, // This should be 'enterprise'
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };
        
        const newToken = jwt.sign(tokenPayload, JWT_SECRET);
        
        console.log('\n🔑 New JWT Token Generated:');
        console.log('   Token contains subscription_tier:', tokenPayload.subscription_tier);
        console.log('   Token expires in: 24 hours');
        
        console.log('\n📋 To fix the UI issue:');
        console.log('1. OPTION 1 (Easiest): Logout and login again');
        console.log('2. OPTION 2: Replace the token in browser localStorage');
        console.log('   - Open browser DevTools (F12)');
        console.log('   - Go to Application/Storage > Local Storage');
        console.log('   - Find "authToken" key');
        console.log('   - Replace with this new token:');
        console.log(`   ${newToken.substring(0, 50)}...`);
        
        console.log('\n✅ After updating the token, refresh the page');
        console.log('   The UI should show "ENTERPRISE Plan" instead of "FREE Plan"');
        
        // Verify the token contains correct data
        const decoded = jwt.decode(newToken);
        console.log('\n🔍 Token verification:');
        console.log('   Decoded subscription_tier:', decoded.subscription_tier);
        console.log('   Should show: ENTERPRISE Plan in UI');
        
    } catch (error) {
        console.error('❌ Error refreshing token:', error.message);
    }
}

refreshUserToken();