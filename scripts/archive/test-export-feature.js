/**
 * Test Script for Export Management Feature
 * Tests that exports use real database data
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testExportFeature() {
    console.log('🧪 Testing Export Management Feature\n');
    console.log('=' .repeat(60));
    
    let authToken = null;
    
    // 🔒 SECURITY: Use environment variables for credentials
    const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@example.com';
    const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-password';
    
    // Step 1: Login
    console.log('\n📝 Step 1: Login...');
    try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            identifier: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        if (loginResponse.data.success) {
            authToken = loginResponse.data.token;
            console.log('✅ Login successful');
            console.log(`   User: ${loginResponse.data.user.email}`);
        } else {
            console.log('❌ Login failed:', loginResponse.data.error);
            return;
        }
    } catch (error) {
        console.log('❌ Login error:', error.response?.data || error.message);
        return;
    }
    
    // Step 2: Create Export Job
    console.log('\n📊 Step 2: Creating Cost Summary Export...');
    let jobId = null;
    try {
        const createResponse = await axios.post(
            `${BASE_URL}/api/export/jobs`,
            {
                type: 'cost_summary',
                output: { format: 'csv' },
                filters: {}
            },
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        
        if (createResponse.data.success) {
            jobId = createResponse.data.job.id;
            console.log('✅ Export job created');
            console.log(`   Job ID: ${jobId}`);
            console.log(`   Type: ${createResponse.data.job.type}`);
            console.log(`   Format: ${createResponse.data.job.output.format}`);
        } else {
            console.log('❌ Job creation failed:', createResponse.data.error);
            return;
        }
    } catch (error) {
        console.log('❌ Job creation error:', error.response?.data || error.message);
        return;
    }
    
    // Step 3: List Export Jobs
    console.log('\n📋 Step 3: Listing Export Jobs...');
    try {
        const listResponse = await axios.get(
            `${BASE_URL}/api/export/jobs`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        
        if (listResponse.data.success) {
            console.log(`✅ Found ${listResponse.data.jobs.length} export job(s)`);
            listResponse.data.jobs.forEach((job, index) => {
                console.log(`   ${index + 1}. ${job.type} (${job.status}) - ${job.id}`);
            });
        }
    } catch (error) {
        console.log('❌ List jobs error:', error.response?.data || error.message);
    }
    
    // Step 4: Download Export
    console.log('\n📥 Step 4: Downloading Export...');
    try {
        const downloadResponse = await axios.get(
            `${BASE_URL}/api/export/jobs/${jobId}/download`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'text/csv'
                }
            }
        );
        
        const csvData = downloadResponse.data;
        const lines = csvData.split('\n');
        
        console.log('✅ Export downloaded successfully');
        console.log(`   Size: ${csvData.length} bytes`);
        console.log(`   Lines: ${lines.length}`);
        console.log('\n📄 First 5 lines of export:');
        console.log('   ' + lines.slice(0, 5).join('\n   '));
        
        // Check if it's real data or dummy data
        if (csvData.includes('Math.random') || csvData.includes('fake') || csvData.includes('dummy')) {
            console.log('\n❌ WARNING: Export contains dummy/fake data!');
        } else if (csvData.includes('No data available')) {
            console.log('\n⚠️  No data available in database for this user');
            console.log('   This is expected if you haven\'t imported any cost data yet');
        } else {
            console.log('\n✅ Export appears to contain real data!');
            
            // Analyze the data
            const dataLines = lines.slice(1).filter(line => line.trim());
            if (dataLines.length > 0) {
                console.log(`   Data records: ${dataLines.length}`);
                
                // Check for real service names
                const hasRealServices = csvData.includes('Amazon EC2') || 
                                       csvData.includes('Amazon S3') || 
                                       csvData.includes('Amazon RDS');
                if (hasRealServices) {
                    console.log('   ✅ Contains real AWS service names');
                }
                
                // Check for dates
                const hasDate = /\d{4}-\d{2}-\d{2}/.test(csvData);
                if (hasDate) {
                    console.log('   ✅ Contains date information');
                }
                
                // Check for cost amounts
                const hasCosts = /\d+\.\d{2}/.test(csvData);
                if (hasCosts) {
                    console.log('   ✅ Contains cost amounts');
                }
            }
        }
        
    } catch (error) {
        console.log('❌ Download error:', error.response?.data || error.message);
    }
    
    // Step 5: Test Security (try without token)
    console.log('\n🔒 Step 5: Testing Security...');
    try {
        await axios.get(`${BASE_URL}/api/export/jobs`);
        console.log('❌ SECURITY ISSUE: Endpoint accessible without authentication!');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Security working: Unauthorized access blocked');
        } else {
            console.log('⚠️  Unexpected error:', error.message);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Export Feature Test Complete!\n');
}

// Run the test
testExportFeature().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
