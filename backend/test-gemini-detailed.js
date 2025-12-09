/**
 * Detailed Gemini API Test with Full Error Messages
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function detailedTest() {
    console.log('🔍 Detailed Gemini API Test\n');
    
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT FOUND');
    console.log('API Key Length:', apiKey ? apiKey.length : 0);
    console.log('');
    
    if (!apiKey) {
        console.error('❌ No API key found!');
        return;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Test with the simplest model name
        console.log('Testing: gemini-pro\n');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        console.log('Sending request to Gemini API...');
        const result = await model.generateContent('Say hello');
        
        console.log('\n✅ SUCCESS!');
        const response = await result.response;
        const text = response.text();
        console.log('Response:', text);
        
    } catch (error) {
        console.error('\n❌ FULL ERROR DETAILS:\n');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('\nFull Error Object:');
        console.error(JSON.stringify(error, null, 2));
        
        if (error.response) {
            console.error('\nResponse Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        
        console.log('\n💡 Possible Solutions:');
        console.log('1. Wait 5-10 minutes after enabling the API');
        console.log('2. Check if billing is required: https://console.cloud.google.com/billing');
        console.log('3. Verify API is enabled: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
        console.log('4. Try regenerating the API key');
        console.log('5. Check API restrictions on the key');
    }
}

detailedTest();
