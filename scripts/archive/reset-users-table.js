// Reset users table and migrate only testdemo1 user
require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');
const fs = require('fs');
const path = require('path');

const USER_DATA_FILE = path.join(__dirname, 'backend/src/data/users.json');

async function resetUsersTable() {
    console.log('🔄 Resetting Users Table - Fresh Start\n');
    console.log('='.repeat(80));
    
    try {
        // Step 1: Drop existing tables
        console.log('\n📋 Step 1: Dropping existing tables...');
        await DatabaseService.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
        await DatabaseService.query('DROP TABLE IF EXISTS users CASCADE');
        console.log('✅ Old tables dropped');
        
        // Step 2: Create fresh users table
        console.log('\n📋 Step 2: Creating fresh users table...');
        await DatabaseService.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                subscription_tier VARCHAR(50) DEFAULT 'free',
                email_verified BOOLEAN DEFAULT false,
                verification_token VARCHAR(255),
                failed_login_attempts INTEGER DEFAULT 0,
                account_locked_until TIMESTAMP,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Users table created');
        
        // Step 3: Create refresh_tokens table
        console.log('\n📋 Step 3: Creating refresh_tokens table...');
        await DatabaseService.query(`
            CREATE TABLE refresh_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                last_used TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Add indexes
        await DatabaseService.query('CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token)');
        await DatabaseService.query('CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)');
        await DatabaseService.query('CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)');
        console.log('✅ Refresh tokens table created with indexes');
        
        // Step 4: Load users from JSON file
        console.log('\n📋 Step 4: Loading users from JSON file...');
        
        if (!fs.existsSync(USER_DATA_FILE)) {
            console.log('⚠️  No users.json file found');
            console.log('✅ Fresh database ready for new registrations');
            return;
        }
        
        const usersData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
        console.log(`Found ${usersData.length} users in file`);
        
        // Step 5: Find and migrate only testdemo1 user
        console.log('\n📋 Step 5: Migrating testdemo1 user...');
        
        const testdemo1 = usersData.find(user => 
            user.email === 'testdemo1@example.com' || 
            user.username === 'testdemo1'
        );
        
        if (!testdemo1) {
            console.log('⚠️  testdemo1 user not found in users.json');
            console.log('Available users:');
            usersData.forEach(user => {
                console.log(`  - ${user.username || 'no username'} (${user.email || 'no email'})`);
            });
            console.log('\n✅ Fresh database ready - you can register testdemo1 manually');
            return;
        }
        
        // Insert testdemo1 user
        const result = await DatabaseService.query(`
            INSERT INTO users (
                username, email, password_hash, subscription_tier,
                email_verified, verification_token, failed_login_attempts,
                account_locked_until, last_login, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, username, email, subscription_tier, email_verified
        `, [
            testdemo1.username,
            testdemo1.email,
            testdemo1.password_hash,
            testdemo1.subscription_tier || 'free',
            testdemo1.email_verified || true, // Auto-verify for testing
            testdemo1.verification_token || null,
            testdemo1.failed_login_attempts || 0,
            testdemo1.account_locked_until || null,
            testdemo1.last_login || null,
            testdemo1.created_at || new Date().toISOString()
        ]);
        
        const migratedUser = result.rows[0];
        console.log('✅ testdemo1 user migrated successfully!');
        console.log(`   ID: ${migratedUser.id}`);
        console.log(`   Username: ${migratedUser.username}`);
        console.log(`   Email: ${migratedUser.email}`);
        console.log(`   Tier: ${migratedUser.subscription_tier}`);
        console.log(`   Verified: ${migratedUser.email_verified}`);
        
        // Step 6: Verify
        console.log('\n📋 Step 6: Verifying database...');
        const userCount = await DatabaseService.query('SELECT COUNT(*) as count FROM users');
        const tokenCount = await DatabaseService.query('SELECT COUNT(*) as count FROM refresh_tokens');
        
        console.log(`✅ Database verified:`);
        console.log(`   - ${userCount.rows[0].count} user(s)`);
        console.log(`   - ${tokenCount.rows[0].count} refresh token(s)`);
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ RESET COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('\n📝 Next Steps:');
        console.log('1. Start backend: cd backend && npm start');
        console.log('2. Test login with testdemo1 credentials');
        console.log('3. Or register new users through the API');
        console.log('\n💡 The database is now clean and ready to use!');
        
    } catch (error) {
        console.error('\n❌ Reset failed:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run reset
if (require.main === module) {
    resetUsersTable()
        .then(() => {
            console.log('\n✅ Reset script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Reset script failed:', error);
            process.exit(1);
        });
}

module.exports = resetUsersTable;
