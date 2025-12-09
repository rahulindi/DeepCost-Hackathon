/**
 * Debug script to check user ID matching between auth and database
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const { Pool } = require('pg');

const BASE_URL = 'http://localhost:3001';

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function debugUserIdMatching() {
    console.log('🔍 Debugging User ID Matching\n');
    console.log('='.repeat(60));
    
    // Step 1: Login and get user info
    console.log('\n📝 Step 1: Login and get user info...');
    let authToken, authUserId;
    
    try {
        // 🔒 SECURITY: Use environment variables for credentials
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            identifier: process.env.TEST_EMAIL || 'your-email@example.com',
            password: process.env.TEST_PASSWORD || 'your-password'
        });
        
        if (loginResponse.data.success) {
            authToken = loginResponse.data.token;
            authUserId = loginResponse.data.user.id;
            console.log('✅ Login successful');
            console.log(`   Auth User ID: ${authUserId}`);
            console.log(`   Email: ${loginResponse.data.user.email}`);
        } else {
            console.log('❌ Login failed');
            return;
        }
    } catch (error) {
        console.log('❌ Login error:', error.message);
        return;
    }
    
    // Step 2: Convert user ID to database format
    console.log('\n🔄 Step 2: Converting user ID to database format...');
    
    // Extract numeric part from user ID
    let dbUserId;
    if (authUserId.startsWith('user-')) {
        const numericPart = authUserId.substring(5);
        const bigNum = BigInt(numericPart);
        dbUserId = Number(bigNum % BigInt(2147483647));
        console.log(`   String User ID: ${authUserId}`);
        console.log(`   Numeric Part: ${numericPart}`);
        console.log(`   Database User ID (after modulo): ${dbUserId}`);
    } else {
        dbUserId = parseInt(authUserId);
        console.log(`   Database User ID: ${dbUserId}`);
    }
    
    // Step 3: Check what user IDs exist in database
    console.log('\n📊 Step 3: Checking user IDs in database...');
    
    try {
        const userQuery = `
            SELECT DISTINCT user_id, COUNT(*) as record_count
            FROM cost_records
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY record_count DESC
        `;
        const userResult = await pool.query(userQuery);
        
        console.log(`   Found ${userResult.rows.length} user(s) with cost data:`);
        userResult.rows.forEach((row, index) => {
            const match = row.user_id === dbUserId ? '✅ MATCH!' : '';
            console.log(`   ${index + 1}. User ID: ${row.user_id} (${row.record_count} records) ${match}`);
        });
        
        // Check if our converted ID matches any
        const hasMatch = userResult.rows.some(row => row.user_id === dbUserId);
        
        if (!hasMatch) {
            console.log('\n❌ PROBLEM FOUND: Your user ID does not match any data in database!');
            console.log(`   Your converted ID: ${dbUserId}`);
            console.log(`   Database has IDs: ${userResult.rows.map(r => r.user_id).join(', ')}`);
            console.log('\n💡 SOLUTION: The cost data needs to be associated with your user ID');
        } else {
            console.log('\n✅ Your user ID matches database records!');
        }
        
    } catch (error) {
        console.log('❌ Database query error:', error.message);
    }
    
    // Step 4: Check sample data for the converted user ID
    console.log('\n📋 Step 4: Checking if data exists for your user ID...');
    
    try {
        const dataQuery = `
            SELECT date, service_name, cost_amount, region
            FROM cost_records
            WHERE user_id = $1
            ORDER BY date DESC
            LIMIT 5
        `;
        const dataResult = await pool.query(dataQuery, [dbUserId]);
        
        if (dataResult.rows.length > 0) {
            console.log(`✅ Found ${dataResult.rows.length} records for your user:`);
            dataResult.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.date} | ${row.service_name} | $${row.cost_amount} | ${row.region}`);
            });
        } else {
            console.log(`❌ No records found for user ID: ${dbUserId}`);
            console.log('\n💡 This is why export shows "No data available"');
        }
        
    } catch (error) {
        console.log('❌ Query error:', error.message);
    }
    
    // Step 5: Show how to fix
    console.log('\n🔧 Step 5: How to fix this issue...');
    console.log('\nOption 1: Update existing data to use your user ID');
    console.log(`   UPDATE cost_records SET user_id = ${dbUserId} WHERE user_id IS NULL;`);
    console.log('\nOption 2: Import new data with your user ID');
    console.log('   When importing AWS cost data, ensure it\'s associated with your user ID');
    
    console.log('\n' + '='.repeat(60));
    
    await pool.end();
}

debugUserIdMatching().catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});
