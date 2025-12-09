const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// File paths (same as in authService.js)
const USER_DATA_FILE = path.join(__dirname, 'src/data/users.json');
const dataDir = path.dirname(USER_DATA_FILE);

async function createFileAdminUser() {
    try {
        console.log('🔄 Creating admin user in file storage...');
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('📁 Created data directory');
        }
        
        // Load existing users
        let users = [];
        if (fs.existsSync(USER_DATA_FILE)) {
            const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
            users = JSON.parse(data);
            console.log(`📋 Found ${users.length} existing users`);
        }
        
        // Check if admin user already exists
        const existingUser = users.find(user => user.email === 'newstart@test.com' || user.username === 'admin');
        
        if (existingUser) {
            console.log('👤 User already exists:', {
                username: existingUser.username,
                email: existingUser.email,
                subscription_tier: existingUser.subscription_tier
            });
            
            // Update to enterprise tier for maximum permissions
            existingUser.subscription_tier = 'enterprise';
            existingUser.updated_at = new Date().toISOString();
            
            // Save updated users
            fs.writeFileSync(USER_DATA_FILE, JSON.stringify(users, null, 2));
            console.log('✅ Updated user to enterprise tier (maximum permissions)');
            console.log('🔑 Login credentials:');
            console.log(`   Username: ${existingUser.username}`);
            console.log(`   Email: ${existingUser.email}`);
            console.log('   Password: (use existing password)');
            return;
        }
        
        // Create new admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const userId = uuidv4();
        
        const newUser = {
            id: userId,
            username: 'admin',  // THIS IS THE USERNAME YOU NEED
            email: 'newstart@test.com',
            password_hash: hashedPassword,
            subscription_tier: 'enterprise', // Maximum permissions
            created_at: new Date().toISOString(),
            failed_login_attempts: 0,
            last_failed_login: null,
            account_locked_until: null,
            email_verified: true, // Skip email verification
            verification_token: null,
            password_reset_token: null,
            password_reset_expires: null,
            last_login: null,
            login_history: [],
            security_settings: {
                two_factor_enabled: false,
                login_notifications: true,
                session_timeout: 24
            }
        };
        
        // Add to users array
        users.push(newUser);
        
        // Save to file
        fs.writeFileSync(USER_DATA_FILE, JSON.stringify(users, null, 2));
        
        console.log('✅ Admin user created successfully!');
        console.log('📋 New user details:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Subscription Tier: ${newUser.subscription_tier}`);
        
        console.log('\n🔑 LOGIN CREDENTIALS:');
        console.log('   Username: admin');
        console.log('   Email: newstart@test.com');
        console.log('   Password: admin123');
        console.log('   Role: enterprise → admin (MAXIMUM PERMISSIONS)');
        
        console.log('\n🎯 This user can now:');
        console.log('   ✅ View all cost data');
        console.log('   ✅ Export unlimited data');
        console.log('   ✅ Create and manage alerts');
        console.log('   ✅ Manage other users');
        console.log('   ✅ Access all API endpoints');
        console.log('   ✅ Perform all operations');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    }
}

createFileAdminUser();