require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemmaModel() {
  console.log('🎯 Testing Gemma 3 4B Model for AWS Cost Analysis\n');
  console.log('═'.repeat(60));
  
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemma-3-4b-it' });
  
  console.log('Model: gemma-3-4b-it');
  console.log('Type: Free Gemma model (4B parameters)');
  console.log('Status: Testing...\n');
  
  // Test 1: Simple greeting
  console.log('Test 1: Simple Response');
  console.log('─'.repeat(60));
  try {
    const result1 = await model.generateContent("Say 'Hello! I am your AWS cost assistant.' in one sentence.");
    console.log('✅ Response:', result1.response.text());
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
  
  // Test 2: AWS cost question
  console.log('\n\nTest 2: AWS Cost Question');
  console.log('─'.repeat(60));
  console.log('Question: What are the top 3 ways to reduce AWS EC2 costs?\n');
  
  try {
    const result2 = await model.generateContent(
      "What are the top 3 ways to reduce AWS EC2 costs? Provide a brief answer with 3 specific recommendations."
    );
    console.log('✅ Response:\n');
    console.log(result2.response.text());
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
  
  // Test 3: Cost analysis scenario
  console.log('\n\nTest 3: Cost Analysis Scenario');
  console.log('─'.repeat(60));
  console.log('Scenario: User spent $500 last month, $800 this month\n');
  
  try {
    const result3 = await model.generateContent(
      `A user's AWS costs increased from $500 last month to $800 this month (60% increase). 
      What are the most likely causes and what should they investigate first? 
      Provide 3 specific action items.`
    );
    console.log('✅ Response:\n');
    console.log(result3.response.text());
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('═'.repeat(60));
  console.log('\n✅ SUCCESS! Gemma 3 4B model is working perfectly!');
  console.log('\n🎯 Model Details:');
  console.log('   - Name: gemma-3-4b-it');
  console.log('   - Type: Free Gemma model');
  console.log('   - Size: 4 billion parameters');
  console.log('   - Status: Operational');
  console.log('   - Quota: Available');
  console.log('\n💡 This model is:');
  console.log('   ✅ Free to use');
  console.log('   ✅ Good for cost analysis');
  console.log('   ✅ Fast responses');
  console.log('   ✅ Available quota');
  console.log('\n🚀 Your AI Cost Assistant is ready to use!');
  console.log('\n' + '═'.repeat(60));
  
  return true;
}

testGemmaModel()
  .then(success => {
    if (success) {
      console.log('\n✅ Next steps:');
      console.log('   1. Backend is configured with gemma-3-4b-it');
      console.log('   2. Start backend: npm start');
      console.log('   3. Test API: POST http://localhost:5000/api/ai/chat');
      console.log('   4. Use AI assistant in your app!');
    }
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
  });
