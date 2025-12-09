// Test script for cost breakdown bulk operations
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/resource-costs';

// Get auth token from command line or use default
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testCostBreakdownOperations() {
    console.log('🧪 Testing Cost Breakdown Bulk Operations\n');

    try {
        // Step 1: Get cost breakdown data
        console.log('1️⃣ Fetching cost breakdown data...');
        const breakdownResponse = await axios.get(`${BASE_URL}/cost-breakdown`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });

        if (!breakdownResponse.data.success) {
            console.error('❌ Failed to fetch cost breakdown:', breakdownResponse.data.error);
            return;
        }

        const breakdown = breakdownResponse.data.data;
        console.log(`✅ Found ${breakdown.length} cost breakdown groups`);

        if (breakdown.length === 0) {
            console.log('\n⚠️ No cost breakdown data found.');
            console.log('   Make sure you have cost records in the database.');
            console.log('   You can add test data using the cost data generation scripts.');
            return;
        }

        // Display breakdown
        console.log('\n📊 Cost Breakdown Groups:');
        breakdown.slice(0, 5).forEach((group, index) => {
            console.log(`   ${index + 1}. Cost Center: ${group.cost_center} | Dept: ${group.department} | Project: ${group.project} | Env: ${group.environment}`);
            console.log(`      Total Cost: $${group.total_cost} | Records: ${group.record_count}`);
        });

        if (breakdown.length > 5) {
            console.log(`   ... and ${breakdown.length - 5} more groups`);
        }

        // Step 2: Test download
        if (breakdown.length >= 1) {
            console.log('\n2️⃣ Testing download...');
            const breakdownToDownload = breakdown.slice(0, Math.min(2, breakdown.length)).map(b => ({
                cost_center: b.cost_center,
                department: b.department,
                project: b.project,
                environment: b.environment
            }));

            console.log(`   Downloading ${breakdownToDownload.length} breakdown group(s)...`);

            const downloadResponse = await axios.post(
                `${BASE_URL}/cost-breakdown/download`,
                { breakdownCriteria: breakdownToDownload },
                {
                    headers: { 
                        'Authorization': `Bearer ${AUTH_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );

            if (downloadResponse.status === 200) {
                const fs = require('fs');
                const filename = `cost-breakdown-test-${Date.now()}.xlsx`;
                fs.writeFileSync(filename, downloadResponse.data);
                console.log(`✅ Downloaded cost breakdown to: ${filename}`);
                console.log(`   File size: ${(downloadResponse.data.length / 1024).toFixed(2)} KB`);
            } else {
                console.error('❌ Download failed:', downloadResponse.status);
            }
        }

        // Step 3: Test bulk delete (commented out for safety)
        if (breakdown.length >= 1) {
            console.log('\n3️⃣ Testing bulk delete...');
            const breakdownToDelete = breakdown.slice(0, 1).map(b => ({
                cost_center: b.cost_center,
                department: b.department,
                project: b.project,
                environment: b.environment
            }));

            console.log(`   Would delete ${breakdownToDelete.length} breakdown group(s):`);
            breakdownToDelete.forEach(b => {
                console.log(`   - ${b.cost_center}/${b.department}/${b.project}/${b.environment}`);
            });

            // Uncomment to actually delete
            // const deleteResponse = await axios.delete(`${BASE_URL}/cost-breakdown/bulk-delete`, {
            //     headers: { 
            //         'Authorization': `Bearer ${AUTH_TOKEN}`,
            //         'Content-Type': 'application/json'
            //     },
            //     data: { breakdownCriteria: breakdownToDelete }
            // });
            // console.log('✅ Delete response:', deleteResponse.data);

            console.log('   ⚠️ Bulk delete test skipped (uncomment code to test)');
        }

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Run tests
console.log('═══════════════════════════════════════════════════════════');
console.log('  Cost Breakdown Bulk Operations Test');
console.log('═══════════════════════════════════════════════════════════\n');

if (!AUTH_TOKEN || AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️  Please set AUTH_TOKEN environment variable');
    console.log('   Example: AUTH_TOKEN=your-token node test-cost-breakdown-operations.js');
    console.log('\n   To get your token:');
    console.log('   1. Login to the application');
    console.log('   2. Open browser DevTools > Application > Local Storage');
    console.log('   3. Copy the value of "authToken"\n');
    process.exit(1);
}

testCostBreakdownOperations();
