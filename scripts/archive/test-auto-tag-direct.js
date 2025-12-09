// Direct test of auto-tag functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// STEP 1: Get your auth token from browser console
// Run: localStorage.getItem('authToken')
const AUTH_TOKEN = 'YOUR_TOKEN_HERE'; // <-- PASTE YOUR TOKEN HERE

async function testAutoTag() {
  console.log('🧪 Testing Auto-Tag Functionality\n');
  console.log('=====================================\n');

  if (AUTH_TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please update AUTH_TOKEN first!');
    console.log('\n📝 Steps:');
    console.log('1. Open browser console (F12)');
    console.log('2. Run: localStorage.getItem("authToken")');
    console.log('3. Copy the token');
    console.log('4. Paste it in this file as AUTH_TOKEN');
    console.log('5. Run: node test-auto-tag-direct.js\n');
    return;
  }

  try {
    // Step 1: Check if we have cost records
    console.log('Step 1: Checking backend health...');
    const health = await axios.get(`${BASE_URL}/api/tagging/health`);
    console.log('✅ Backend is running');
    console.log('   Endpoints:', health.data.endpoints.join(', '));
    console.log('');

    // Step 2: Get current analysis (before auto-tag)
    console.log('Step 2: Getting current analysis...');
    const beforeAnalysis = await axios.get(`${BASE_URL}/api/tagging/analysis`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    
    console.log('✅ Analysis endpoint works');
    console.log('   Tagged resources BEFORE:', beforeAnalysis.data.analysis.totalTaggedResources);
    console.log('   Compliance score BEFORE:', beforeAnalysis.data.analysis.complianceScore.overall + '%');
    console.log('');

    // Step 3: Call auto-tag
    console.log('Step 3: Calling auto-tag...');
    const tagRules = [
      { tagKey: 'Owner', tagValue: 'unassigned', service: null, region: null },
      { tagKey: 'Environment', tagValue: 'unknown', service: null, region: null },
      { tagKey: 'CostCenter', tagValue: 'general', service: null, region: null }
    ];

    const autoTagResult = await axios.post(
      `${BASE_URL}/api/tagging/auto-tag`,
      { tagRules },
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AUTH_TOKEN}` }}
    );

    console.log('✅ Auto-tag completed!');
    console.log('   Response:', JSON.stringify(autoTagResult.data, null, 2));
    console.log('');

    if (autoTagResult.data.success) {
      console.log('📊 Auto-Tag Results:');
      console.log(`   Total resources tagged: ${autoTagResult.data.totalResourcesTagged}`);
      
      if (autoTagResult.data.appliedTags) {
        autoTagResult.data.appliedTags.forEach((at, idx) => {
          console.log(`   Rule ${idx + 1}: ${at.rule.tagKey} = ${at.rule.tagValue}`);
          console.log(`      Resources tagged: ${at.resourcesTagged}`);
        });
      }
    } else {
      console.log('❌ Auto-tag failed:', autoTagResult.data.error);
    }
    console.log('');

    // Step 4: Get analysis again (after auto-tag)
    console.log('Step 4: Getting updated analysis...');
    const afterAnalysis = await axios.get(`${BASE_URL}/api/tagging/analysis`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });

    console.log('✅ Analysis updated');
    console.log('   Tagged resources AFTER:', afterAnalysis.data.analysis.totalTaggedResources);
    console.log('   Compliance score AFTER:', afterAnalysis.data.analysis.complianceScore.overall + '%');
    console.log('');

    // Step 5: Compare before/after
    console.log('Step 5: Comparison');
    console.log('=====================================');
    const beforeCount = beforeAnalysis.data.analysis.totalTaggedResources;
    const afterCount = afterAnalysis.data.analysis.totalTaggedResources;
    const beforeScore = beforeAnalysis.data.analysis.complianceScore.overall;
    const afterScore = afterAnalysis.data.analysis.complianceScore.overall;

    console.log(`Tagged Resources: ${beforeCount} → ${afterCount} (${afterCount > beforeCount ? '✅ INCREASED' : '❌ NO CHANGE'})`);
    console.log(`Compliance Score: ${beforeScore}% → ${afterScore}% (${afterScore > beforeScore ? '✅ IMPROVED' : '❌ NO CHANGE'})`);
    console.log('');

    if (afterCount === beforeCount && beforeCount === 0) {
      console.log('⚠️  PROBLEM DETECTED: No resources were tagged!');
      console.log('');
      console.log('Possible causes:');
      console.log('1. No cost records in database');
      console.log('2. All cost records already have tags');
      console.log('3. Database query error');
      console.log('4. User ID mismatch');
      console.log('');
      console.log('🔍 Debug steps:');
      console.log('1. Check backend logs for errors');
      console.log('2. Check browser Network tab for API responses');
      console.log('3. Run SQL: SELECT COUNT(*) FROM cost_records;');
      console.log('4. Run SQL: SELECT COUNT(*) FROM cost_records WHERE tags IS NULL;');
    } else if (afterCount > beforeCount) {
      console.log('✅ SUCCESS! Auto-tag is working correctly.');
    }

  } catch (error) {
    console.log('\n❌ Error occurred:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.error || error.message);
    console.log('');
    
    if (error.response?.status === 401) {
      console.log('🔒 Authentication failed!');
      console.log('   Your token may be expired or invalid.');
      console.log('   Get a fresh token from browser console.');
    } else if (error.response?.status === 500) {
      console.log('💥 Server error!');
      console.log('   Check backend logs for details.');
      console.log('   Full error:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

testAutoTag();
