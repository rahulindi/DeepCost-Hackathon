require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testWorkingModels() {
  console.log('🧪 Testing Working Gemini Models\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test these models in order of preference
  const modelsToTest = [
    'gemini-2.5-flash',      // Latest stable flash model
    'gemini-2.5-pro',        // Latest stable pro model
    'gemini-flash-latest',   // Always points to latest flash
    'gemini-pro-latest'      // Always points to latest pro
  ];
  
  for (const modelName of modelsToTest) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${modelName}`);
    console.log('='.repeat(60));
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const prompt = "Say 'Hello! I am working correctly.' in one sentence.";
      console.log(`Prompt: ${prompt}\n`);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      console.log('✅ SUCCESS!');
      console.log(`Response: ${text}`);
      console.log(`\n🎉 Model "${modelName}" is working perfectly!`);
      
      // Test with a cost analysis question
      console.log('\n--- Testing with AWS cost question ---');
      const costPrompt = "What are the top 3 ways to reduce AWS costs?";
      const costResult = await model.generateContent(costPrompt);
      const costText = costResult.response.text();
      console.log(`Question: ${costPrompt}`);
      console.log(`Answer: ${costText.substring(0, 200)}...`);
      
      return modelName; // Return the working model name
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ None of the models worked!');
  return null;
}

testWorkingModels()
  .then(workingModel => {
    if (workingModel) {
      console.log(`\n\n${'='.repeat(60)}`);
      console.log('✅ RECOMMENDED MODEL FOR YOUR CODE:');
      console.log(`   Use: "${workingModel}"`);
      console.log('='.repeat(60));
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
  });
