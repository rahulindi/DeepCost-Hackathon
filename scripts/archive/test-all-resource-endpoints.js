// Test all resource cost allocation endpoints
const axios = require('axios');

// 🔒 SECURITY: Use environment variables for credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';

async function testAll() {
  try {
    const login = await axios.post('http://localhost:3001/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = login.data.token;
    console.log('\n🔍 Testing All Resource Cost Allocation Endpoints\n');
    console.log('='.repeat(60));
    
    // 1. Allocation Summary
    console.log('\n1️⃣  ALLOCATION SUMMARY:');
    const summary = await axios.get('http://localhost:3001/api/resource-costs/allocation-summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Keys:', Object.keys(summary.data));
    if (summary.data.data?.breakdown) {
      console.log('   ❌ OLD CODE - has breakdown field');
      console.log('   Total from breakdown:', summary.data.data.totalCost);
    } else if (summary.data.totalCost !== undefined) {
      console.log('   ✅ NEW CODE - direct totalCost');
      console.log('   Total Cost:', summary.data.totalCost);
      console.log('   Total Records:', summary.data.totalRecords);
    }
    
    // 2. Cost Breakdown
    console.log('\n2️⃣  COST BREAKDOWN:');
    const breakdown = await axios.get('http://localhost:3001/api/resource-costs/cost-breakdown', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const breakdownData = breakdown.data.data || [];
    console.log('   Records:', breakdownData.length);
    if (breakdownData.length > 0) {
      console.log('   First record cost:', breakdownData[0].total_cost);
      console.log('   First record count:', breakdownData[0].record_count);
    }
    
    // 3. Top Cost Centers
    console.log('\n3️⃣  TOP COST CENTERS:');
    const centers = await axios.get('http://localhost:3001/api/resource-costs/top-cost-centers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const centersData = centers.data.data || [];
    console.log('   Cost Centers:', centersData.length);
    if (centersData.length > 0) {
      console.log('   Top center:', centersData[0].cost_center, '-', centersData[0].total_cost);
    }
    
    // 4. Tag Compliance
    console.log('\n4️⃣  TAG COMPLIANCE:');
    const compliance = await axios.get('http://localhost:3001/api/resource-costs/tag-compliance', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const compData = compliance.data.data || compliance.data;
    console.log('   Total Resources:', compData.summary?.totalResources);
    console.log('   Compliant:', compData.summary?.compliantResources);
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log('If you see "OLD CODE" above, the backend needs restart');
    console.log('If you see "NEW CODE" with matching record counts, it\'s working!');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAll();
