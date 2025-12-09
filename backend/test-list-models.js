require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
  console.log('🔍 Listing All Available Gemini Models\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`API Key Length: ${apiKey.length}\n`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('📋 Fetching available models...\n');
    
    // Try to list models using the SDK
    const models = await genAI.listModels();
    
    console.log('✅ Available Models:\n');
    
    for (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`  Display Name: ${model.displayName || 'N/A'}`);
      console.log(`  Description: ${model.description || 'N/A'}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
      console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
      console.log('---');
    }
    
    console.log(`\n📊 Total Models Found: ${models.length}`);
    
    // Find models that support generateContent
    const contentModels = models.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log(`\n✨ Models Supporting generateContent: ${contentModels.length}`);
    contentModels.forEach(m => {
      console.log(`  - ${m.name}`);
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nFull Error:', error);
    
    // Try direct API call as fallback
    console.log('\n🔄 Trying direct API call...\n');
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Direct API Response:\n');
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Direct API Error:');
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (fetchError) {
      console.error('❌ Direct API call failed:', fetchError.message);
    }
  }
}

listAvailableModels();
