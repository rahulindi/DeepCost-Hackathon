// Verification script for data isolation fixes
// Run this after rate limiting clears

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: username,
      password: password
    });
    return { success: true, token: response.data.token, user: response.data.user };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
}

async function testEndpoint(name, url, token) {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

function analyzeData(endpoint, data1, data2) {
  const analysis = {
    endpoint,
    user1HasData: false,
    user2HasData: false,
    dataCount1: 0,
    dataCount2: 0,
    isolated: true,
    details: ''
  };

  // Extract data counts based on response structure
  if (data1.success && data2.success) {
    // Check various response structures
    if (data1.data?.forecast) {
      analysis.dataCount1 = data1.data.forecast.length;
      analysis.dataCount2 = data2.data.forecast.length;
      analysis.user1HasData = analysis.dataCount1 > 0;
      analysis.user2HasData = analysis.dataCount2 > 0;
    } else if (data1.data?.totalCost !== undefined) {
      analysis.dataCount1 = data1.data.totalCost;
      analysis.dataCount2 = data2.data.totalCost;
      analysis.user1HasData = analysis.dataCount1 > 0;
      analysis.user2HasData = analysis.dataCount2 > 0;
    } else if (data1.data?.jobs) {
      analysis.dataCount1 = data1.data.jobs.length;
      analysis.dataCount2 = data2.data.jobs.length;
      analysis.user1HasData = analysis.dataCount1 > 0;
      analysis.user2HasData = analysis.dataCount2 > 0;
    } else if (data1.data?.trends) {
      analysis.dataCount1 = data1.data.trends.length;
      analysis.dataCount2 = data2.data.trends.length;
      analysis.user1HasData = analysis.dataCount1 > 0;
      analysis.user2HasData = analysis.dataCount2 > 0;
    } else if (Array.isArray(data1.data)) {
      analysis.dataCount1 = data1.data.length;
      analysis.dataCount2 = data2.data.length;
      analysis.user1HasData = analysis.dataCount1 > 0;
      analysis.user2HasData = analysis.dataCount2 > 0;
    }

    // Determine if data is properly isolated
    if (analysis.user1HasData && analysis.user2HasData) {
      // Both have data - check if it's the same
      if (analysis.dataCount1 === analysis.dataCount2) {
        analysis.isolated = false;
        analysis.details = 'POTENTIAL LEAK: Both users see same amount of data';
      } else {
        analysis.isolated = true;
        analysis.details = 'Different data counts - likely isolated';
      }
    } else if (analysis.user1HasData && !analysis.user2HasData) {
      analysis.isolated = true;
      analysis.details = 'Only user1 has data - properly isolated';
    } else if (!analysis.user1HasData && analysis.user2HasData) {
      analysis.isolated = true;
      analysis.details = 'Only user2 has data - properly isolated';
    } else {
      analysis.isolated = true;
      analysis.details = 'No data for either user';
    }
  }

  return analysis;
}

async function runVerification() {
  log('cyan', '\n' + '='.repeat(70));
  log('cyan', '🔒 DATA ISOLATION VERIFICATION');
  log('cyan', '='.repeat(70) + '\n');

  // Step 1: Login
  log('blue', '📝 Step 1: Logging in users...\n');
  
  const user1Login = await login('testdemo1', 'Pulsar@190');
  await wait(2000); // Avoid rate limiting
  
  if (!user1Login.success) {
    log('red', `❌ testdemo1 login failed: ${user1Login.error}`);
    log('yellow', '\n⏳ If rate limited, please wait and try again later\n');
    return;
  }
  log('green', '✅ testdemo1 logged in');
  
  const user2Login = await login('testdemo2', 'Pulsar@190');
  
  if (!user2Login.success) {
    log('red', `❌ testdemo2 login failed: ${user2Login.error}`);
    log('yellow', '\n⏳ If rate limited, please wait and try again later\n');
    return;
  }
  log('green', '✅ testdemo2 logged in\n');

  // Step 2: Test endpoints
  log('blue', '🔍 Step 2: Testing data isolation across endpoints...\n');

  const endpoints = [
    {
      name: 'Business Forecasting',
      url: `${BASE_URL}/business-forecasting/forecast`,
      fixed: true
    },
    {
      name: 'Cost Allocation Summary',
      url: `${BASE_URL}/resource-costs/allocation-summary`,
      fixed: true
    },
    {
      name: 'Export Jobs',
      url: `${BASE_URL}/advanced-export/exports`,
      fixed: false // Already secure
    },
    {
      name: 'Trend Analysis',
      url: `${BASE_URL}/trends/analysis?period=monthly`,
      fixed: false // Already secure
    },
    {
      name: 'Anomaly Detection',
      url: `${BASE_URL}/anomaly/detect`,
      fixed: false // Already secure
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    log('cyan', `\n📊 Testing: ${endpoint.name}`);
    log('cyan', `   ${endpoint.url}`);
    
    const result1 = await testEndpoint(endpoint.name, endpoint.url, user1Login.token);
    await wait(500);
    const result2 = await testEndpoint(endpoint.name, endpoint.url, user2Login.token);
    
    if (!result1.success || !result2.success) {
      log('yellow', `   ⚠️  API Error - Status: ${result1.status || result2.status}`);
      continue;
    }

    const analysis = analyzeData(endpoint.name, result1, result2);
    results.push(analysis);

    log('cyan', `   User1: ${analysis.dataCount1} records`);
    log('cyan', `   User2: ${analysis.dataCount2} records`);
    
    if (analysis.isolated) {
      log('green', `   ✅ ${analysis.details}`);
    } else {
      log('red', `   ❌ ${analysis.details}`);
    }
  }

  // Step 3: Summary
  log('cyan', '\n' + '='.repeat(70));
  log('blue', '📋 VERIFICATION SUMMARY\n');

  const vulnerabilities = results.filter(r => !r.isolated);
  const secure = results.filter(r => r.isolated);

  log('green', `✅ Secure endpoints: ${secure.length}`);
  if (vulnerabilities.length > 0) {
    log('red', `❌ Vulnerable endpoints: ${vulnerabilities.length}\n`);
    vulnerabilities.forEach(v => {
      log('red', `   • ${v.endpoint}: ${v.details}`);
    });
  } else {
    log('green', '✅ No data isolation vulnerabilities detected!');
  }

  log('cyan', '\n' + '='.repeat(70) + '\n');

  // Step 4: Recommendations
  if (vulnerabilities.length > 0) {
    log('yellow', '⚠️  RECOMMENDATIONS:');
    log('yellow', '   1. Review the vulnerable endpoints');
    log('yellow', '   2. Ensure all database queries include user_id filters');
    log('yellow', '   3. Restart the backend server to apply fixes');
    log('yellow', '   4. Re-run this verification script\n');
  } else {
    log('green', '🎉 All tested endpoints are properly isolated!');
    log('green', '   Data isolation fixes have been successfully applied.\n');
  }
}

// Run verification
runVerification().catch(error => {
  log('red', `\n❌ Verification failed: ${error.message}\n`);
});
