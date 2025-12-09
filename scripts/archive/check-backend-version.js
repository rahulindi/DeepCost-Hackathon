// Check which version of the code is running
const axios = require('axios');

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function checkVersion() {
  try {
    // Login (credentials from environment variables)
    const login = await axios.post('http://localhost:3001/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = login.data.token;
    
    // Call allocation summary
    const response = await axios.get('http://localhost:3001/api/resource-costs/allocation-summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    console.log('\n🔍 Checking Backend Code Version:\n');
    console.log('Response keys:', Object.keys(data));
    
    if (data.data && data.data.breakdown) {
      console.log('\n❌ OLD CODE IS RUNNING');
      console.log('   Response has "data.breakdown" field');
      console.log('   This is from the OLD AWS API code');
      console.log('\n   ACTION: Backend server needs to be restarted!');
      console.log('   Try: killall node && cd backend && npm start');
    } else if (data.totalCost !== undefined || data.data?.totalCost !== undefined) {
      console.log('\n✅ NEW CODE IS RUNNING');
      console.log('   Response has "totalCost" field');
      console.log('   No "breakdown" field found');
      console.log('   Data isolation fixes are active!');
    } else {
      console.log('\n⚠️  UNKNOWN RESPONSE STRUCTURE');
      console.log('   Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkVersion();
