/**
 * Migrate AWS credentials from string user IDs to numeric DB IDs
 */

const fs = require('fs');
const path = require('path');

const CREDENTIALS_FILE = path.join(__dirname, 'backend/src/data/aws-credentials.json');

console.log('🔄 Migrating AWS credentials to use numeric user IDs...\n');

try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
        console.log('ℹ️  No credentials file found - nothing to migrate');
        process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    const migratedData = {};
    let migrated = 0;

    for (const [userId, credentials] of Object.entries(data)) {
        // Check if userId is in string format "user-123456"
        if (typeof userId === 'string' && userId.startsWith('user-')) {
            const numericId = parseInt(userId.substring(5), 10);
            console.log(`✓ Migrating ${userId} → ${numericId}`);
            migratedData[numericId] = credentials;
            migrated++;
        } else {
            // Already in correct format
            console.log(`✓ Keeping ${userId} (already numeric)`);
            migratedData[userId] = credentials;
        }
    }

    // Save migrated data
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(migratedData, null, 2));
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Migration complete!`);
    console.log(`   - Total credentials: ${Object.keys(data).length}`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Already correct: ${Object.keys(data).length - migrated}`);
    
} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
