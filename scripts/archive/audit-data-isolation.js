// Data Isolation Security Audit
// Tests if users can see each other's data

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 🔒 SECURITY: Use environment variables for credentials
const users = [
  { email: process.env.TEST_EMAIL_1 || 'your-email-1@example.com', password: process.env.TEST_PASSWORD_1 || 'your-password', name: 'user1' },
  { email: process.env.TEST_EMAIL_2 || 'your-email-2@example.com', password: process.env.TEST_PASSWORD_2 || 'your-password', name: 'user2' }
];

async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

async function testEndpoint(name, url, token, userName) {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    let recordCount = 0;
    
    // Count records based on response structure
    if (Array.isArray(data)) {
      recordCount = data.length;
    } else if (data.data && Array.isArray(data.data)) {
      recordCount = data.data.length;
    } else if (data.records && Array.isArray(data.records)) {
      recordCount = data.records.length;
    } else if (data.totalCost !== undefined) {
      recordCount = data.totalCost > 0 ? 1 : 0;
    }
    
    console.log(`  ${userName}: ${recordCount} records`);
    return { success: true, recordCount, data };
  } catch (error) {
    console.log(`  ${userName}: ERROR - ${error.response?.status || error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAudit() {
  console.log('🔒 DATA ISOLATION SECURITY AUDIT\n');
  console.log('=' .repeat(60));
  
  // Login both users
  console.log('\n📝 Logging in users...');
  const tokens = {};
  for (const user of users) {
    const token = await login(user.email, user.password);
    if (token) {
      tokens[user.name] = token;
      console.log(`✅ ${user.name} logged in`);
    } else {
      console.log(`❌ ${user.name} login failed`);
    }
  }
  
  if (Object.keys(tokens).length < 2) {
    console.log('\n❌ Cannot proceed - need both users logged in');
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING DATA ISOLATION\n');
  
  // Test endpoints
  const endpoints = [
    { name: 'Business Forecasting', url: `${BASE_URL}/business-forecasting/forecast` },
    { name: 'Cost Allocation Summary', url: `${BASE_URL}/cost-allocation/summary` },
    { name: 'Cost Allocation Rules', url: `${BASE_URL}/cost-allocation/rules` },
    { name: 'Trend Analysis', url: `${BASE_URL}/trends/analysis?period=monthly` },
    { name: 'Anomaly Detection', url: `${BASE_URL}/anomaly/detect` },
    { name: 'Export List', url: `${BASE_URL}/advanced-export/exports` },
    { name: 'Reserved Instances', url: `${BASE_URL}/ri/recommendations` },
    { name: 'Governance Policies', url: `${BASE_URL}/governance/policies` },
    { name: 'Data Lake Query', url: `${BASE_URL}/data-lake/query?metric=cost&period=daily` }
  ];
  
  const vulnerabilities = [];
  
  for (const endpoint of endpoints) {
    console.log(`\n📊 ${endpoint.name}`);
    console.log(`   ${endpoint.url}`);
    
    const results = {};
    for (const user of users) {
      const token = tokens[user.name];
      results[user.name] = await testEndpoint(endpoint.name, endpoint.url, token, user.name);
    }
    
    // Check if both users see data
    const user1HasData = results.testdemo1.success && results.testdemo1.recordCount > 0;
    const user2HasData = results.testdemo2.success && results.testdemo2.recordCount > 0;
    
    if (user1HasData && user2HasData) {
      console.log(`   ⚠️  POTENTIAL DATA LEAK - Both users see data`);
      vulnerabilities.push({
        endpoint: endpoint.name,
        url: endpoint.url,
        issue: 'Both users can see data - possible cross-user data leak'
      });
    } else if (user1HasData || user2HasData) {
      console.log(`   ✅ Data isolation appears correct`);
    } else {
      console.log(`   ℹ️  No data for either user`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 AUDIT SUMMARY\n');
  
  if (vulnerabilities.length === 0) {
    console.log('✅ No data isolation vulnerabilities found!');
  } else {
    console.log(`❌ Found ${vulnerabilities.length} potential vulnerabilities:\n`);
    vulnerabilities.forEach((vuln, index) => {
      console.log(`${index + 1}. ${vuln.endpoint}`);
      console.log(`   URL: ${vuln.url}`);
      console.log(`   Issue: ${vuln.issue}\n`);
    });
  }
  
  console.log('='.repeat(60));
}

runAudit().catch(console.error);
