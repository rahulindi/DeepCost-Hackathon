require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testWhenQuotaResets() {
  console.log('🧪 Testing Gemini API (Run this after quota resets)\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`API Key Length: ${apiKey.length}\n`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use the correct model name
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  console.log('Model: gemini-2.5-flash');
  console.log('Sending test request...\n');
  
  try {
    const result = await model.generateContent("Say 'Hello! I am working correctly.' in one sentence.");
    const response = result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS!');
    console.log(`Response: ${text}\n`);
    
    // Test with AWS cost question
    console.log('Testing with AWS cost question...');
    const costResult = await model.generateContent("What are the top 3 ways to reduce AWS costs? Be brief.");
    const costText = costResult.response.text();
    
    console.log('✅ SUCCESS!');
    console.log(`Response: ${costText}\n`);
    
    console.log('🎉 Gemini API is working perfectly!');
    console.log('✅ Your AI Assistant is ready to use!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('429')) {
      console.log('\n⏳ QUOTA STILL EXHAUSTED');
      console.log('Please wait longer and try again.');
      console.log('\nCheck your usage: https://ai.dev/usage?tab=rate-limit');
      console.log('\nFree tier limits:');
      console.log('  - 15 requests per minute');
      console.log('  - 1,500 requests per day');
      console.log('  - Resets every 24 hours');
    } else if (error.message.includes('404')) {
      console.log('\n❌ MODEL NOT FOUND');
      console.log('The model name may be incorrect or not available.');
    } else {
      console.log('\nFull error:', error);
    }
  }
}

console.log('═'.repeat(60));
console.log('  GEMINI API TEST - Run After Quota Resets');
console.log('═'.repeat(60));
console.log('\n⏰ Wait at least 15 minutes after your last failed request');
console.log('📊 Check usage: https://ai.dev/usage?tab=rate-limit\n');

testWhenQuotaResets();
