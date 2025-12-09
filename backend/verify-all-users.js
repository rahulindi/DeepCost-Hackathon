#!/usr/bin/env node

/**
 * Verify All Users Script
 * Sets email_verified = true for all users (for development/testing)
 */

const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'src/data/users.json');

console.log('🔧 EMAIL VERIFICATION FIX SCRIPT\n');
console.log('='.repeat(60));

// Check if users file exists
if (!fs.existsSync(usersFile)) {
    console.log('ℹ️  No users.json file found');
    console.log('   This is normal if no users have registered yet');
    console.log('   Users will be auto-verified on next registration');
    process.exit(0);
}

// Load users
let users;
try {
    const fileContent = fs.readFileSync(usersFile, 'utf8');
    users = JSON.parse(fileContent);
} catch (error) {
    console.error('❌ Error reading users file:', error.message);
    process.exit(1);
}

// Count users
const userCount = Object.keys(users).length;
console.log(`\n📊 Found ${userCount} user(s) in database`);

if (userCount === 0) {
    console.log('ℹ️  No users to verify');
    process.exit(0);
}

// Verify all users
let verifiedCount = 0;
let alreadyVerifiedCount = 0;

for (let [key, user] of Object.entries(users)) {
    console.log(`\n👤 User: ${user.username} (${user.email})`);
    
    if (user.email_verified) {
        console.log('   ✅ Already verified');
        alreadyVerifiedCount++;
    } else {
        users[key].email_verified = true;
        console.log('   🔧 Setting email_verified = true');
        verifiedCount++;
    }
}

// Save updated users
if (verifiedCount > 0) {
    try {
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        console.log(`\n✅ Successfully verified ${verifiedCount} user(s)`);
    } catch (error) {
        console.error('\n❌ Error saving users file:', error.message);
        process.exit(1);
    }
} else {
    console.log(`\n✅ All ${alreadyVerifiedCount} user(s) already verified`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ VERIFICATION COMPLETE');
console.log('='.repeat(60));
console.log('\nAll users can now log in without email verification.');
console.log('You can now test login with existing users.');
