// Migration: Move users and refresh tokens from JSON files to PostgreSQL
// This is a NON-BREAKING migration - keeps file backup for safety

require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('../services/databaseService');
const fs = require('fs');
const path = require('path');

const USER_DATA_FILE = path.join(__dirname, '../data/users.json');
const TOKEN_DATA_FILE = path.join(__dirname, '../data/tokens.json');

async function migrateUsersToDatabase() {
    console.log('🔄 Starting User & Token Migration to PostgreSQL\n');
    console.log('=' .repeat(80));
    
    try {
        // Step 1: Create users table
        console.log('\n📋 Step 1: Creating users table...');
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                legacy_id VARCHAR(255) UNIQUE,
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
        console.log('✅ Users table created/verified');

        // Step 2: Create refresh_tokens table
        console.log('\n📋 Step 2: Creating refresh_tokens table...');
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                last_used TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Add index for faster lookups
        await DatabaseService.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
        `);
        console.log('✅ Refresh tokens table created/verified');

        // Step 3: Migrate users from JSON file
        console.log('\n📋 Step 3: Migrating users from JSON file...');
        
        if (!fs.existsSync(USER_DATA_FILE)) {
            console.log('⚠️  No users.json file found - skipping user migration');
        } else {
            const usersData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
            console.log(`Found ${usersData.length} users to migrate`);
            
            let migratedCount = 0;
            let skippedCount = 0;
            
            for (const user of usersData) {
                try {
                    // Check if user already exists
                    const existing = await DatabaseService.query(
                        'SELECT id FROM users WHERE email = $1 OR legacy_id = $2',
                        [user.email, user.id]
                    );
                    
                    if (existing.rows.length > 0) {
                        console.log(`  ⏭️  Skipping ${user.email} (already exists)`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Insert user
                    await DatabaseService.query(`
                        INSERT INTO users (
                            legacy_id, username, email, password_hash, 
                            subscription_tier, email_verified, verification_token,
                            failed_login_attempts, account_locked_until, last_login, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [
                        user.id,
                        user.username,
                        user.email,
                        user.password_hash,
                        user.subscription_tier || 'free',
                        user.email_verified || false,
                        user.verification_token || null,
                        user.failed_login_attempts || 0,
                        user.account_locked_until || null,
                        user.last_login || null,
                        user.created_at || new Date().toISOString()
                    ]);
                    
                    console.log(`  ✅ Migrated: ${user.email}`);
                    migratedCount++;
                    
                } catch (error) {
                    console.error(`  ❌ Error migrating ${user.email}:`, error.message);
                }
            }
            
            console.log(`\n✅ User migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
        }

        // Step 4: Migrate refresh tokens
        console.log('\n📋 Step 4: Migrating refresh tokens...');
        
        if (!fs.existsSync(TOKEN_DATA_FILE)) {
            console.log('⚠️  No tokens.json file found - skipping token migration');
        } else {
            const tokensData = JSON.parse(fs.readFileSync(TOKEN_DATA_FILE, 'utf8'));
            console.log(`Found ${tokensData.length} tokens to migrate`);
            
            let tokenMigratedCount = 0;
            let tokenSkippedCount = 0;
            
            for (const tokenEntry of tokensData) {
                try {
                    const { token, data } = tokenEntry;
                    
                    // Find user by legacy_id
                    const userResult = await DatabaseService.query(
                        'SELECT id FROM users WHERE legacy_id = $1',
                        [data.userId]
                    );
                    
                    if (userResult.rows.length === 0) {
                        console.log(`  ⏭️  Skipping token (user not found: ${data.userId})`);
                        tokenSkippedCount++;
                        continue;
                    }
                    
                    const userId = userResult.rows[0].id;
                    
                    // Check if token already exists
                    const existingToken = await DatabaseService.query(
                        'SELECT id FROM refresh_tokens WHERE token = $1',
                        [token]
                    );
                    
                    if (existingToken.rows.length > 0) {
                        tokenSkippedCount++;
                        continue;
                    }
                    
                    // Insert token
                    await DatabaseService.query(`
                        INSERT INTO refresh_tokens (token, user_id, expires_at)
                        VALUES ($1, $2, $3)
                    `, [
                        token,
                        userId,
                        new Date(data.expiresAt)
                    ]);
                    
                    tokenMigratedCount++;
                    
                } catch (error) {
                    console.error(`  ❌ Error migrating token:`, error.message);
                }
            }
            
            console.log(`\n✅ Token migration complete: ${tokenMigratedCount} migrated, ${tokenSkippedCount} skipped`);
        }

        // Step 5: Verify migration
        console.log('\n📋 Step 5: Verifying migration...');
        
        const userCount = await DatabaseService.query('SELECT COUNT(*) as count FROM users');
        const tokenCount = await DatabaseService.query('SELECT COUNT(*) as count FROM refresh_tokens');
        
        console.log(`✅ Database now has:`);
        console.log(`   - ${userCount.rows[0].count} users`);
        console.log(`   - ${tokenCount.rows[0].count} refresh tokens`);

        // Step 6: Create backup of JSON files
        console.log('\n📋 Step 6: Creating backup of JSON files...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        if (fs.existsSync(USER_DATA_FILE)) {
            const backupUserFile = USER_DATA_FILE.replace('.json', `.backup-${timestamp}.json`);
            fs.copyFileSync(USER_DATA_FILE, backupUserFile);
            console.log(`✅ Users backup: ${path.basename(backupUserFile)}`);
        }
        
        if (fs.existsSync(TOKEN_DATA_FILE)) {
            const backupTokenFile = TOKEN_DATA_FILE.replace('.json', `.backup-${timestamp}.json`);
            fs.copyFileSync(TOKEN_DATA_FILE, backupTokenFile);
            console.log(`✅ Tokens backup: ${path.basename(backupTokenFile)}`);
        }

        // Step 7: Clean up expired tokens
        console.log('\n📋 Step 7: Cleaning up expired tokens...');
        const deleteResult = await DatabaseService.query(
            'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
        );
        console.log(`✅ Removed ${deleteResult.rowCount} expired tokens`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('\n📝 Next Steps:');
        console.log('1. Test authentication with existing users');
        console.log('2. Verify new registrations work');
        console.log('3. Check login/logout functionality');
        console.log('4. Once verified, you can delete the JSON files (backups are saved)');
        console.log('\n💡 The application will now use PostgreSQL for user management!');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    migrateUsersToDatabase()
        .then(() => {
            console.log('\n✅ Migration script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = migrateUsersToDatabase;
