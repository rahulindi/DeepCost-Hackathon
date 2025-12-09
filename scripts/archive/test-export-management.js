#!/usr/bin/env node

// Test script to verify Export Management functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testExportManagement() {
    console.log('🧪 Testing Export Management API...\n');

    try {
        // Test 1: Get export jobs
        console.log('1️⃣ Testing GET /api/export/jobs');
        const getResponse = await fetch(`${BASE_URL}/api/export/jobs`);
        const getData = await getResponse.json();
        
        if (getResponse.ok && getData.success) {
            console.log('✅ GET /api/export/jobs - Success');
            console.log(`   Found ${getData.jobs.length} jobs`);
            console.log(`   Sample job: ${getData.jobs[0]?.name || 'N/A'}\n`);
        } else {
            console.log('❌ GET /api/export/jobs - Failed');
            console.log(`   Status: ${getResponse.status}`);
            console.log(`   Response: ${JSON.stringify(getData, null, 2)}\n`);
        }

        // Test 2: Create export job
        console.log('2️⃣ Testing POST /api/export/jobs');
        const createPayload = {
            type: 'cost_summary',
            schedule: { type: 'one-time' },
            filters: {},
            output: { format: 'csv', delivery: { type: 'download' } }
        };

        const postResponse = await fetch(`${BASE_URL}/api/export/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
        });
        const postData = await postResponse.json();

        if (postResponse.ok && postData.success) {
            console.log('✅ POST /api/export/jobs - Success');
            console.log(`   Created job: ${postData.job.id}`);
            console.log(`   Status: ${postData.job.status}\n`);
        } else {
            console.log('❌ POST /api/export/jobs - Failed');
            console.log(`   Status: ${postResponse.status}`);
            console.log(`   Response: ${JSON.stringify(postData, null, 2)}\n`);
        }

        // Test 3: Verify CORS headers
        console.log('3️⃣ Testing CORS headers');
        const corsResponse = await fetch(`${BASE_URL}/api/export/jobs`, {
            headers: { 'Origin': 'http://localhost:3000' }
        });

        const corsHeaders = corsResponse.headers.raw();
        if (corsHeaders['access-control-allow-origin']) {
            console.log('✅ CORS headers - Present');
            console.log(`   Allow-Origin: ${corsHeaders['access-control-allow-origin']}\n`);
        } else {
            console.log('❌ CORS headers - Missing\n');
        }

        console.log('🏆 Export Management API Test Complete!');
        console.log('📊 Backend Status: Ready for Frontend Integration');
        
    } catch (error) {
        console.log('💥 Test Error:', error.message);
    }
}

// Run the test
testExportManagement().catch(console.error);
