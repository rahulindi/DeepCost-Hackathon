// Create test users for data isolation audit
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 🔒 SECURITY: Use environment variables for credentials
const users = [
  { email: process.env.TEST_EMAIL_1 || 'your-email-1@example.com', password: process.env.TEST_PASSWORD_1 || 'your-password', name: 'Test User 1' },
  { email: process.env.TEST_EMAIL_2 || 'your-email-2@example.com', password: process.env.TEST_PASSWORD_2 || 'your-password', name: 'Test User 2' }
];

async function createUsers() {
  console.log('👥 Creating test users for audit...\n');
  
  for (const user of users) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, user);
      console.log(`✅ Created user: ${user.email}`);
      console.log(`   User ID: ${response.data.user?.id || 'N/A'}`);
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log(`ℹ️  User already exists: ${user.email}`);
      } else {
        console.error(`❌ Failed to create ${user.email}:`, error.response?.data || error.message);
      }
    }
  }
  
  console.log('\n✅ Test users ready for audit');
}

createUsers().catch(console.error);
