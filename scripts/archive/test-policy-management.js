// Test Policy Management Features (Edit, Delete, Toggle)
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
// 🔒 SECURITY: Use environment variables for credentials
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'your-email@example.com',
  password: process.env.TEST_PASSWORD || 'your-password'
};

let authToken = '';
let testPolicyId = null;

async function login() {
  console.log('\n🔐 Logging in...');
  const res = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
  authToken = res.data.token;
  console.log('✅ Logged in successfully');
  return authToken;
}

async function createTestPolicy() {
  console.log('\n📝 Creating test policy...');
  const policy = {
    type: 'budget_threshold',
    name: 'Test Policy - Policy Management',
    params: {
      budget_amount: 100,
      period: 'monthly'
    },
    active: true,
    priority: 100
  };
  
  const res = await axios.post(`${BASE_URL}/api/governance/policies`, policy, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  testPolicyId = res.data.policyId;
  console.log(`✅ Policy created with ID: ${testPolicyId}`);
  return testPolicyId;
}

async function listPolicies() {
  console.log('\n📋 Listing all policies...');
  const res = await axios.get(`${BASE_URL}/api/governance/policies`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log(`✅ Found ${res.data.policies.length} policies:`);
  res.data.policies.forEach(p => {
    console.log(`   - ${p.name} (ID: ${p.id}, Active: ${p.active}, Type: ${p.type})`);
  });
  return res.data.policies;
}

async function updatePolicy(policyId) {
  console.log(`\n✏️  Updating policy ${policyId}...`);
  const updates = {
    name: 'Test Policy - UPDATED',
    params: {
      budget_amount: 200,
      period: 'daily'
    }
  };
  
  const res = await axios.put(`${BASE_URL}/api/governance/policies/${policyId}`, updates, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Policy updated:');
  console.log(`   Name: ${res.data.policy.name}`);
  console.log(`   Params: ${JSON.stringify(res.data.policy.params)}`);
  return res.data.policy;
}

async function togglePolicy(policyId) {
  console.log(`\n🔄 Toggling policy ${policyId}...`);
  const res = await axios.patch(`${BASE_URL}/api/governance/policies/${policyId}/toggle`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log(`✅ Policy toggled to: ${res.data.active ? 'ACTIVE' : 'INACTIVE'}`);
  return res.data.active;
}

async function deletePolicy(policyId) {
  console.log(`\n🗑️  Deleting policy ${policyId}...`);
  const res = await axios.delete(`${BASE_URL}/api/governance/policies/${policyId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Policy deleted successfully');
  return res.data;
}

async function testPolicyManagement() {
  try {
    console.log('🧪 Testing Policy Management Features');
    console.log('=====================================\n');
    
    // 1. Login
    await login();
    
    // 2. List existing policies
    await listPolicies();
    
    // 3. Create a test policy
    await createTestPolicy();
    
    // 4. List policies again to confirm creation
    await listPolicies();
    
    // 5. Update the policy
    await updatePolicy(testPolicyId);
    
    // 6. List policies to see the update
    await listPolicies();
    
    // 7. Toggle policy to inactive
    await togglePolicy(testPolicyId);
    
    // 8. List policies to see it's inactive
    await listPolicies();
    
    // 9. Toggle policy back to active
    await togglePolicy(testPolicyId);
    
    // 10. List policies to see it's active again
    await listPolicies();
    
    // 11. Delete the policy
    await deletePolicy(testPolicyId);
    
    // 12. List policies to confirm deletion
    await listPolicies();
    
    console.log('\n✅ ALL POLICY MANAGEMENT TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Create policy');
    console.log('   ✅ Update policy (name & params)');
    console.log('   ✅ Toggle policy (active/inactive)');
    console.log('   ✅ Delete policy');
    console.log('   ✅ List policies');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testPolicyManagement();
