// Test script to verify the actual HTTP endpoint works
require('dotenv').config({ path: './backend/.env' });

const http = require('http');

async function testOrphanHTTPEndpoint() {
    console.log('🧪 Testing Orphan Detection HTTP Endpoint\n');

    // First, we need to get an auth token
    // For testing, we'll use the stored user ID directly
    const testUserId = 'user-1763658402716';
    
    console.log('⚠️  NOTE: This test requires the backend server to be running');
    console.log('   Run: npm start (in backend directory)\n');

    // Create a mock JWT token for testing
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
    
    const token = jwt.sign(
        { id: testUserId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    console.log('1️⃣ Generated test JWT token');
    console.log(`   User ID: ${testUserId}\n`);

    // Make the API call
    const postData = JSON.stringify({
        accountId: 'default',
        service: null
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/lifecycle/orphans/detect',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${token}`
        }
    };

    console.log('2️⃣ Making HTTP POST request to:');
    console.log(`   ${options.hostname}:${options.port}${options.path}\n`);

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`3️⃣ Response received (Status: ${res.statusCode})\n`);
                
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 200 && response.success) {
                        console.log('✅ SUCCESS!');
                        console.log(`   Detected: ${response.detected} orphaned resources`);
                        
                        if (response.data && response.data.length > 0) {
                            console.log('\n📋 Orphaned Resources:');
                            response.data.forEach((orphan, idx) => {
                                console.log(`   ${idx + 1}. ${orphan.resourceType}: ${orphan.resourceId}`);
                                console.log(`      Savings: $${orphan.potentialSavings}/month`);
                            });
                        }
                        
                        console.log('\n🎉 HTTP Endpoint Test PASSED!');
                        resolve(response);
                    } else {
                        console.error('❌ FAILED!');
                        console.error(`   Error: ${response.error || 'Unknown error'}`);
                        console.error('\nFull response:');
                        console.error(JSON.stringify(response, null, 2));
                        reject(new Error(response.error || 'API call failed'));
                    }
                } catch (error) {
                    console.error('❌ Failed to parse response:');
                    console.error(data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ HTTP Request failed:');
            console.error(error.message);
            console.error('\n💡 Make sure the backend server is running:');
            console.error('   cd backend && npm start');
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Run the test
testOrphanHTTPEndpoint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
