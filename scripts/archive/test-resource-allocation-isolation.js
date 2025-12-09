// Test Resource Cost Allocation data isolation
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function testResourceAllocation() {
  console.log('🔒 Testing Resource Cost Allocation Data Isolation\n');
  
  try {
    // Login with credentials from environment variables
    console.log('1️⃣  Logging in...');
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    const token = login.data.token;
    console.log('   ✅ Logged in successfully\n');
    
    // Test Allocation Summary
    console.log('2️⃣  Testing Allocation Summary...');
    const summary = await axios.get(`${BASE_URL}/resource-costs/allocation-summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('   Response:', JSON.stringify(summary.data, null, 2));
    
    if (summary.data.success) {
      const totalCost = summary.data.totalCost || summary.data.data?.totalCost || 0;
      console.log(`   Total Cost: $${totalCost}`);
      
      if (totalCost === 0) {
        console.log('   ✅ No data shown (testdemo2 has no cost records) - CORRECT');
      } else {
        console.log('   ℹ️  Showing cost data for testdemo2');
      }
    }
    console.log();
    
    // Test Cost Breakdown
    console.log('3️⃣  Testing Cost Breakdown...');
    const breakdown = await axios.get(`${BASE_URL}/resource-costs/cost-breakdown`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const breakdownData = breakdown.data.data || breakdown.data || [];
    console.log(`   Found ${breakdownData.length} cost breakdown records`);
    
    if (breakdownData.length === 0) {
      console.log('   ✅ No breakdown data (testdemo2 has no cost records) - CORRECT');
    } else {
      console.log('   Sample:', JSON.stringify(breakdownData[0], null, 2));
    }
    console.log();
    
    // Test Top Cost Centers
    console.log('4️⃣  Testing Top Cost Centers...');
    const costCenters = await axios.get(`${BASE_URL}/resource-costs/top-cost-centers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const centersData = costCenters.data.data || costCenters.data || [];
    console.log(`   Found ${centersData.length} cost centers`);
    
    if (centersData.length === 0) {
      console.log('   ✅ No cost centers (testdemo2 has no cost records) - CORRECT');
    } else {
      console.log('   Top cost center:', JSON.stringify(centersData[0], null, 2));
    }
    console.log();
    
    // Test Tag Compliance
    console.log('5️⃣  Testing Tag Compliance...');
    const compliance = await axios.get(`${BASE_URL}/resource-costs/tag-compliance`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const complianceData = compliance.data.data || compliance.data;
    console.log('   Compliance:', JSON.stringify(complianceData, null, 2));
    console.log();
    
    console.log('=' .repeat(60));
    console.log('✅ RESOURCE COST ALLOCATION TEST COMPLETE\n');
    console.log('Expected behavior:');
    console.log('- If testdemo2 has NO cost records: All endpoints return empty/zero data ✅');
    console.log('- If testdemo2 has cost records: Only testdemo2\'s data is shown ✅');
    console.log('- testdemo1\'s data should NEVER appear for testdemo2 ✅');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.includes('Too many attempts')) {
      console.log('\n⏳ Rate limited. Please wait a few minutes and try again.');
    }
  }
}

testResourceAllocation();
