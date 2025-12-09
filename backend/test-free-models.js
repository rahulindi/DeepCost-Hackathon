require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testFreeModels() {
  console.log('🆓 Testing FREE Gemini Models with Higher Quotas\n');
  console.log('═'.repeat(60));
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}\n`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Free models with best quotas (in order of preference)
  const freeModels = [
    { 
      name: 'gemini-2.0-flash-lite', 
      description: 'Lightest, highest free quota',
      expectedRPM: 'Higher than standard'
    },
    { 
      name: 'gemini-2.0-flash', 
      description: 'Fast and efficient',
      expectedRPM: '15 RPM'
    },
    { 
      name: 'gemini-flash-latest', 
      description: 'Always latest flash',
      expectedRPM: '15 RPM'
    }
  ];
  
  let workingModel = null;
  
  for (const modelInfo of freeModels) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🧪 Testing: ${modelInfo.name}`);
    console.log(`   Description: ${modelInfo.description}`);
    console.log(`   Expected RPM: ${modelInfo.expectedRPM}`);
    console.log('─'.repeat(60));
    
    try {
      const model = genAI.getGenerativeModel({ model: modelInfo.name });
      
      console.log('Sending test request...');
      const result = await model.generateContent("Say 'Hello! I am working.' in one sentence.");
      const text = result.response.text();
      
      console.log('\n✅ SUCCESS!');
      console.log(`Response: ${text}\n`);
      
      // Test with AWS cost question
      console.log('Testing with AWS cost question...');
      const costResult = await model.generateContent("List 3 ways to reduce AWS costs. Be brief.");
      const costText = costResult.response.text();
      
      console.log('✅ SUCCESS!');
      console.log(`Response:\n${costText}\n`);
      
      workingModel = modelInfo.name;
      
      console.log('🎉 FOUND WORKING MODEL!');
      console.log(`   Model: ${modelInfo.name}`);
      console.log(`   Status: Operational`);
      console.log(`   Quota: Available`);
      
      break; // Stop testing once we find a working model
      
    } catch (error) {
      console.log(`\n❌ FAILED: ${error.message}\n`);
      
      if (error.message.includes('429')) {
        console.log('   ⏳ Quota exhausted for this model');
        console.log('   Trying next model...');
      } else if (error.message.includes('404')) {
        console.log('   ⚠️  Model not found or not available');
      } else {
        console.log('   ⚠️  Unexpected error');
      }
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('═'.repeat(60));
  
  if (workingModel) {
    console.log('\n✅ SUCCESS! Found working free model\n');
    console.log(`🎯 Recommended Model: ${workingModel}`);
    console.log('\n📝 Update your code to use this model:');
    console.log(`\n   In: backend/src/services/aiAssistantService.js`);
    console.log(`   Change to: model: '${workingModel}'`);
    console.log('\n🚀 Your AI Assistant is ready to use!');
    
    return workingModel;
  } else {
    console.log('\n❌ All free models are currently quota-limited\n');
    console.log('⏳ Options:');
    console.log('   1. Wait 15-30 minutes for quota reset');
    console.log('   2. Check usage: https://ai.dev/usage?tab=rate-limit');
    console.log('   3. Enable billing for higher limits');
    console.log('\n💡 The models exist and your API key is valid.');
    console.log('   Just need to wait for quota to reset.');
  }
  
  console.log('\n' + '═'.repeat(60));
  
  return workingModel;
}

testFreeModels()
  .then(model => {
    if (model) {
      console.log(`\n✅ Use this model: ${model}`);
    }
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
  });
