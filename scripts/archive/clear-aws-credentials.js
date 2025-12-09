const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing ALL AWS Credentials\n');
console.log('='.repeat(60));

// Clear simple credentials file
const simpleCredsFile = path.join(__dirname, 'backend/src/data/aws-creds-simple.json');
if (fs.existsSync(simpleCredsFile)) {
    console.log('\n📁 Found simple credentials file');
    const data = JSON.parse(fs.readFileSync(simpleCredsFile, 'utf8'));
    console.log('   Users with credentials:', Object.keys(data));
    
    // Clear it
    fs.writeFileSync(simpleCredsFile, JSON.stringify({}, null, 2));
    console.log('✅ Simple credentials cleared');
} else {
    console.log('⚠️  No simple credentials file found');
}

// Clear encrypted credentials file
const encryptedCredsFile = path.join(__dirname, 'backend/src/data/aws-credentials.json');
if (fs.existsSync(encryptedCredsFile)) {
    console.log('\n📁 Found encrypted credentials file');
    const data = JSON.parse(fs.readFileSync(encryptedCredsFile, 'utf8'));
    console.log('   Users with credentials:', Object.keys(data));
    
    // Clear it
    fs.writeFileSync(encryptedCredsFile, JSON.stringify({}, null, 2));
    console.log('✅ Encrypted credentials cleared');
} else {
    console.log('⚠️  No encrypted credentials file found');
}

console.log('\n' + '='.repeat(60));
console.log('✅ All AWS credentials cleared!');
console.log('\n📝 Next steps:');
console.log('   1. Restart backend: cd backend && npm start');
console.log('   2. Refresh dashboard');
console.log('   3. Should show "❌ Not Connected"');
console.log('   4. Click "Setup AWS" to reconnect');
