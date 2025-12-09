// Simple test to verify data isolation issue
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_USER_1 = {
  email: process.env.TEST_EMAIL_1 || 'your-email-1@example.com',
  password: process.env.TEST_PASSWORD_1 || 'your-password'
};
const TEST_USER_2 = {
  email: process.env.TEST_EMAIL_2 || 'your-email-2@example.com',
  password: process.env.TEST_PASSWORD_2 || 'your-password'
};

async function testDataLeak() {
  console.log('🔒 TESTING DATA ISOLATION VULNERABILITY\n');
  console.log('Testing if user2 can see user1\'s data...\n');
  
  try {
    // Login as user1
    console.log('1️⃣  Logging in as user1...');
    const login1 = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password
    });
    const token1 = login1.data.token;
    console.log('   ✅ user1 logged in\n');
    
    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Login as user2
    console.log('2️⃣  Logging in as user2...');
    const login2 = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER_2.email,
      password: TEST_USER_2.password
    });
    const token2 = login2.data.token;
    console.log('   ✅ testdemo2 logged in\n');
    
    console.log('=' .repeat(60));
    console.log('🔍 TESTING ENDPOINTS FOR DATA LEAKS\n');
    
    // Test Business Forecasting
    console.log('📊 Testing Business Forecasting...');
    try {
      const forecast1 = await axios.get(`${BASE_URL}/business-forecasting/forecast`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      const forecast2 = await axios.get(`${BASE_URL}/business-forecasting/forecast`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      
      console.log(`   testdemo1: ${forecast1.data.forecast?.length || 0} forecast records`);
      console.log(`   testdemo2: ${forecast2.data.forecast?.length || 0} forecast records`);
      
      if (forecast1.data.forecast?.length > 0 && forecast2.data.forecast?.length > 0) {
        console.log('   ⚠️  POTENTIAL LEAK: Both users see forecast data\n');
      } else {
        console.log('   ✅ Appears isolated\n');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test Cost Allocation
    console.log('📊 Testing Cost Allocation Summary...');
    try {
      const alloc1 = await axios.get(`${BASE_URL}/resource-costs/allocation-summary`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      const alloc2 = await axios.get(`${BASE_URL}/resource-costs/allocation-summary`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      
      console.log(`   testdemo1: Total cost = $${alloc1.data.totalCost || 0}`);
      console.log(`   testdemo2: Total cost = $${alloc2.data.totalCost || 0}`);
      
      if (alloc1.data.totalCost > 0 && alloc2.data.totalCost > 0 && 
          alloc1.data.totalCost === alloc2.data.totalCost) {
        console.log('   ⚠️  POTENTIAL LEAK: Both users see same cost data\n');
      } else {
        console.log('   ✅ Appears isolated\n');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test Exports
    console.log('📊 Testing Export List...');
    try {
      const exports1 = await axios.get(`${BASE_URL}/advanced-export/exports`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      const exports2 = await axios.get(`${BASE_URL}/advanced-export/exports`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      
      console.log(`   testdemo1: ${exports1.data.jobs?.length || 0} export jobs`);
      console.log(`   testdemo2: ${exports2.data.jobs?.length || 0} export jobs`);
      
      if (exports1.data.jobs?.length > 0 && exports2.data.jobs?.length > 0) {
        // Check if they're seeing the same jobs
        const job1Ids = exports1.data.jobs.map(j => j.id).sort();
        const job2Ids = exports2.data.jobs.map(j => j.id).sort();
        if (JSON.stringify(job1Ids) === JSON.stringify(job2Ids)) {
          console.log('   ⚠️  POTENTIAL LEAK: Both users see same export jobs\n');
        } else {
          console.log('   ✅ Appears isolated\n');
        }
      } else {
        console.log('   ✅ Appears isolated\n');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test Trend Analysis
    console.log('📊 Testing Trend Analysis...');
    try {
      const trend1 = await axios.get(`${BASE_URL}/trends/analysis?period=monthly`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      const trend2 = await axios.get(`${BASE_URL}/trends/analysis?period=monthly`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      
      const records1 = trend1.data.trends?.length || 0;
      const records2 = trend2.data.trends?.length || 0;
      
      console.log(`   testdemo1: ${records1} trend records`);
      console.log(`   testdemo2: ${records2} trend records`);
      
      if (records1 > 0 && records2 > 0 && records1 === records2) {
        console.log('   ⚠️  POTENTIAL LEAK: Both users see same trend data\n');
      } else {
        console.log('   ✅ Appears isolated\n');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    console.log('=' .repeat(60));
    console.log('\n✅ Data isolation audit complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDataLeak().catch(console.error);
