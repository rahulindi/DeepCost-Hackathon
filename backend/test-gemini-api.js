/**
 * Test Gemini API Key and List Available Models
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
    console.log('🔍 Testing Gemini API Key...\n');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.error('❌ GEMINI_API_KEY not found in .env file');
        console.log('\n📝 Please add your API key to backend/.env:');
        console.log('GEMINI_API_KEY=your_actual_key_here');
        console.log('\n🔗 Get your key from: https://makersuite.google.com/app/apikey');
        process.exit(1);
    }
    
    console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
    console.log('');
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Try common model names
        console.log('🧪 Testing common model names...\n');
        
        const modelsToTest = [
            'gemini-pro',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'models/gemini-pro',
            'models/gemini-1.5-pro',
            'models/gemini-1.5-flash'
        ];
        
        for (const modelName of modelsToTest) {
            try {
                console.log(`Testing: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say "Hello"');
                const response = await result.response;
                const text = response.text();
                console.log(`✅ ${modelName} - WORKS! Response: ${text.substring(0, 50)}...`);
                console.log('');
                
                // If we found a working model, save it
                console.log(`\n🎉 SUCCESS! Use this model name: "${modelName}"\n`);
                break;
            } catch (error) {
                console.log(`❌ ${modelName} - Failed: ${error.message.substring(0, 80)}...`);
                console.log('');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Error testing API:');
        console.error(error.message);
        console.log('\n💡 Possible issues:');
        console.log('1. Invalid API key');
        console.log('2. API key not activated');
        console.log('3. Network/firewall blocking Google APIs');
        console.log('4. API quota exceeded');
        console.log('\n🔗 Check your API key at: https://makersuite.google.com/app/apikey');
    }
}

// Run the test
testGeminiAPI().catch(console.error);
