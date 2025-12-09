require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testExperimentalModels() {
  console.log('🧪 Testing EXPERIMENTAL Gemini Models (May Have Separate Quotas)\n');
  console.log('═'.repeat(60));
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}\n`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Experimental models that might have separate quotas
  const experimentalModels = [
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    'learnlm-2.0-flash-experimental',
    'gemma-3-4b-it',
    'gemma-3-1b-it'
  ];
  
  let workingModel = null;
  
  for (const modelName of experimentalModels) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🧪 Testing: ${modelName}`);
    console.log('─'.repeat(60));
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      console.log('Sending test request...');
      const result = await model.generateContent("Say 'Hello' in one word.");
      const text = result.response.text();
      
      console.log('\n✅ SUCCESS!');
      console.log(`Response: ${text}\n`);
      
      workingModel = modelName;
      
      console.log('🎉 FOUND WORKING MODEL!');
      console.log(`   Model: ${modelName}`);
      console.log(`   Status: Operational`);
      
      break;
      
    } catch (error) {
      const errorMsg = error.message.substring(0, 150);
      console.log(`\n❌ FAILED: ${errorMsg}...\n`);
      
      if (error.message.includes('429')) {
        console.log('   ⏳ Quota exhausted');
      } else if (error.message.includes('404')) {
        console.log('   ⚠️  Not available');
      }
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (workingModel) {
    console.log(`\n✅ SUCCESS! Found working model: ${workingModel}\n`);
    return workingModel;
  } else {
    console.log('\n❌ All experimental models also quota-limited or unavailable\n');
    console.log('💡 Your API key has exhausted its daily/hourly quota.');
    console.log('⏰ Wait time: 15-60 minutes for quota reset\n');
    console.log('📊 Check: https://ai.dev/usage?tab=rate-limit');
  }
  
  console.log('\n' + '═'.repeat(60));
  
  return workingModel;
}

testExperimentalModels();
