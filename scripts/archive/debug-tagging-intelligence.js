// Debug Tagging Intelligence - Check why no data is showing
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// You'll need to replace this with your actual auth token
// Get it from: localStorage.getItem('authToken') in browser console
const AUTH_TOKEN = 'YOUR_TOKEN_HERE'; // <-- REPLACE THIS

async function debugTaggingIntelligence() {
  console.log('🔍 Debugging Tagging Intelligence\n');
  console.log('=====================================\n');

  try {
    // Test 1: Check if routes are accessible
    console.log('Test 1: Health Check');
    console.log('-------------------');
    try {
      const health = await axios.get(`${BASE_URL}/api/tagging/health`);
      console.log('✅ Tagging routes are registered');
      console.log('   Endpoints:', health.data.endpoints);
    } catch (e) {
      console.log('❌ Tagging routes NOT accessible');
      console.log('   Error:', e.message);
      return;
    }

    console.log('\n');

    // Test 2: Check analysis endpoint
    console.log('Test 2: Get Analysis');
    console.log('-------------------');
    try {
      const analysis = await axios.get(`${BASE_URL}/api/tagging/analysis`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      console.log('✅ Analysis endpoint works');
      console.log('   Response:', JSON.stringify(analysis.data, null, 2));
      
      if (analysis.data.success) {
        const data = analysis.data.analysis;
        console.log('\n📊 Analysis Summary:');
        console.log(`   Total Tagged Resources: ${data.totalTaggedResources}`);
        console.log(`   Common Tags: ${data.commonTags?.length || 0}`);
        console.log(`   Suggestions: ${data.suggestions?.length || 0}`);
        console.log(`   Compliance Score: ${data.complianceScore?.overall}%`);
        
        if (data.totalTaggedResources === 0) {
          console.log('\n⚠️  NO TAGGED RESOURCES FOUND!');
          console.log('   This is why the UI shows no data.');
          console.log('   Reason: The query looks for resources with tags != NULL');
        }
      }
    } catch (e) {
      console.log('❌ Analysis endpoint failed');
      console.log('   Status:', e.response?.status);
      console.log('   Error:', e.response?.data || e.message);
      
      if (e.response?.status === 401) {
        console.log('\n⚠️  AUTHENTICATION FAILED!');
        console.log('   Please update AUTH_TOKEN in this script.');
        console.log('   Get it from browser console: localStorage.getItem("authToken")');
        return;
      }
    }

    console.log('\n');

    // Test 3: Check compliance endpoint
    console.log('Test 3: Get Compliance Report');
    console.log('-------------------');
    try {
      const compliance = await axios.get(`${BASE_URL}/api/tagging/compliance`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      console.log('✅ Compliance endpoint works');
      
      if (compliance.data.success) {
        const data = compliance.data.compliance;
        console.log(`   Services found: ${data.length}`);
        
        if (data.length > 0) {
          console.log('\n📋 Sample Compliance Data:');
          data.slice(0, 3).forEach(item => {
            console.log(`   - ${item.service} (${item.region}): ${item.complianceRate}`);
          });
        } else {
          console.log('\n⚠️  NO COMPLIANCE DATA!');
          console.log('   No cost records found in last 30 days.');
        }
      }
    } catch (e) {
      console.log('❌ Compliance endpoint failed');
      console.log('   Error:', e.response?.data || e.message);
    }

    console.log('\n');

    // Test 4: Check database directly
    console.log('Test 4: Database Check (requires direct access)');
    console.log('-------------------');
    console.log('Run these SQL queries to diagnose:');
    console.log('');
    console.log('-- Check total cost records:');
    console.log('SELECT COUNT(*) FROM cost_records;');
    console.log('');
    console.log('-- Check tagged records:');
    console.log('SELECT COUNT(*) FROM cost_records WHERE tags IS NOT NULL;');
    console.log('');
    console.log('-- Check sample tags:');
    console.log('SELECT service_name, tags FROM cost_records WHERE tags IS NOT NULL LIMIT 5;');
    console.log('');
    console.log('-- Check records by user:');
    console.log('SELECT user_id, COUNT(*) as total, ');
    console.log('       COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as tagged');
    console.log('FROM cost_records GROUP BY user_id;');

  } catch (error) {
    console.log('\n❌ Unexpected error:', error.message);
  }

  console.log('\n');
  console.log('=====================================');
  console.log('🔍 Diagnosis Complete\n');
  
  console.log('💡 Common Issues:');
  console.log('1. No tagged data: Cost records have tags = NULL');
  console.log('   Solution: Click AUTO-TAG button or manually add tags');
  console.log('');
  console.log('2. Wrong user_id: Data exists but for different user');
  console.log('   Solution: Check user_id in database vs logged-in user');
  console.log('');
  console.log('3. No cost data: Empty cost_records table');
  console.log('   Solution: Load cost data first');
  console.log('');
  console.log('4. Auth token expired: 401 errors');
  console.log('   Solution: Get fresh token from browser');
}

// Instructions
console.log('📝 INSTRUCTIONS:');
console.log('1. Get your auth token from browser console:');
console.log('   localStorage.getItem("authToken")');
console.log('2. Replace AUTH_TOKEN in this file');
console.log('3. Run: node debug-tagging-intelligence.js');
console.log('');

if (AUTH_TOKEN === 'YOUR_TOKEN_HERE') {
  console.log('⚠️  Please update AUTH_TOKEN first!');
  console.log('');
  process.exit(1);
}

debugTaggingIntelligence();
