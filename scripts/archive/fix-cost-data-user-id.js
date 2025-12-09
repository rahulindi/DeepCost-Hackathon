/**
 * Fix cost data by associating it with the current logged-in user
 * This will allow exports to show data for your user
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// Load users from file storage
const USER_DATA_FILE = path.join(__dirname, 'backend/src/data/users.json');

async function fixCostDataUserId() {
    try {
        console.log('🔧 Fixing Cost Data User ID Association\n');
        console.log('='.repeat(60));
        
        // Step 1: Load users from file storage
        console.log('\n📋 Step 1: Loading users from file storage...');
        
        if (!fs.existsSync(USER_DATA_FILE)) {
            console.log('❌ Users file not found:', USER_DATA_FILE);
            console.log('   Please ensure users are registered first');
            return;
        }
        
        const usersData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
        console.log(`✅ Found ${usersData.length} registered user(s):`);
        
        usersData.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
        });
        
        // Step 2: Find testdemo1@demo.com user
        const targetUser = usersData.find(u => u.email === 'testdemo1@demo.com');
        
        if (!targetUser) {
            console.log('\n❌ User testdemo1@demo.com not found');
            console.log('   Available users:', usersData.map(u => u.email).join(', '));
            return;
        }
        
        console.log(`\n✅ Target user found: ${targetUser.email}`);
        console.log(`   User ID: ${targetUser.id}`);
        
        // Step 3: Convert user ID to database format
        console.log('\n🔄 Step 3: Converting user ID to database format...');
        
        let dbUserId;
        if (targetUser.id.startsWith('user-')) {
            const numericPart = targetUser.id.substring(5);
            const bigNum = BigInt(numericPart);
            dbUserId = Number(bigNum % BigInt(2147483647));
            console.log(`   String ID: ${targetUser.id}`);
            console.log(`   Database ID: ${dbUserId}`);
        } else {
            dbUserId = parseInt(targetUser.id);
            console.log(`   Database ID: ${dbUserId}`);
        }
        
        // Step 4: Check current data distribution
        console.log('\n📊 Step 4: Checking current data distribution...');
        
        const currentQuery = `
            SELECT 
                user_id,
                COUNT(*) as record_count,
                MIN(date) as earliest_date,
                MAX(date) as latest_date
            FROM cost_records
            GROUP BY user_id
            ORDER BY record_count DESC
        `;
        
        const currentResult = await pool.query(currentQuery);
        console.log(`   Current distribution:`);
        currentResult.rows.forEach((row, index) => {
            const userIdLabel = row.user_id === null ? 'NULL (unassigned)' : `User ${row.user_id}`;
            console.log(`   ${index + 1}. ${userIdLabel}: ${row.record_count} records (${row.earliest_date} to ${row.latest_date})`);
        });
        
        // Step 5: Check if target user already has data
        const targetDataQuery = `
            SELECT COUNT(*) as count
            FROM cost_records
            WHERE user_id = $1
        `;
        const targetDataResult = await pool.query(targetDataQuery, [dbUserId]);
        const existingCount = parseInt(targetDataResult.rows[0].count);
        
        if (existingCount > 0) {
            console.log(`\n✅ User already has ${existingCount} cost records!`);
            console.log('   No update needed. Exports should work now.');
            await pool.end();
            return;
        }
        
        console.log(`\n⚠️  User has 0 cost records`);
        
        // Step 6: Offer to assign unassigned data
        const unassignedQuery = `
            SELECT COUNT(*) as count
            FROM cost_records
            WHERE user_id IS NULL
        `;
        const unassignedResult = await pool.query(unassignedQuery);
        const unassignedCount = parseInt(unassignedResult.rows[0].count);
        
        if (unassignedCount > 0) {
            console.log(`\n💡 Found ${unassignedCount} unassigned cost records`);
            console.log(`   Assigning them to user: ${targetUser.email}`);
            
            const updateQuery = `
                UPDATE cost_records
                SET user_id = $1
                WHERE user_id IS NULL
            `;
            
            const updateResult = await pool.query(updateQuery, [dbUserId]);
            console.log(`✅ Updated ${updateResult.rowCount} records`);
        } else {
            // Assign data from first user with data
            const firstUserWithData = currentResult.rows.find(r => r.user_id !== null);
            
            if (firstUserWithData) {
                console.log(`\n💡 Assigning data from user ${firstUserWithData.user_id} to ${targetUser.email}`);
                console.log(`   This will transfer ${firstUserWithData.record_count} records`);
                
                const transferQuery = `
                    UPDATE cost_records
                    SET user_id = $1
                    WHERE user_id = $2
                `;
                
                const transferResult = await pool.query(transferQuery, [dbUserId, firstUserWithData.user_id]);
                console.log(`✅ Transferred ${transferResult.rowCount} records`);
            } else {
                console.log('\n❌ No cost data found in database to assign');
                console.log('   Please import AWS cost data first');
            }
        }
        
        // Step 7: Verify the fix
        console.log('\n✅ Step 7: Verifying the fix...');
        
        const verifyQuery = `
            SELECT COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
            FROM cost_records
            WHERE user_id = $1
        `;
        const verifyResult = await pool.query(verifyQuery, [dbUserId]);
        const finalCount = parseInt(verifyResult.rows[0].count);
        
        if (finalCount > 0) {
            console.log(`✅ SUCCESS! User now has ${finalCount} cost records`);
            console.log(`   Date range: ${verifyResult.rows[0].earliest} to ${verifyResult.rows[0].latest}`);
            console.log('\n🎉 Exports should now show real data!');
        } else {
            console.log('❌ User still has no data');
            console.log('   Please import AWS cost data');
        }
        
        console.log('\n' + '='.repeat(60));
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

fixCostDataUserId();
