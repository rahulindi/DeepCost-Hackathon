// Test script for chargeback report bulk operations
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/resource-costs';

// Get auth token from command line or use default
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testBulkOperations() {
    console.log('🧪 Testing Chargeback Report Bulk Operations\n');

    try {
        // Step 1: Get existing reports
        console.log('1️⃣ Fetching existing chargeback reports...');
        const reportsResponse = await axios.get(`${BASE_URL}/chargeback-reports`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });

        if (!reportsResponse.data.success) {
            console.error('❌ Failed to fetch reports:', reportsResponse.data.error);
            return;
        }

        const reports = reportsResponse.data.data;
        console.log(`✅ Found ${reports.length} reports`);

        if (reports.length === 0) {
            console.log('\n⚠️ No reports found. Generate some reports first.');
            console.log('   You can generate a report from the UI or use the API:');
            console.log('   POST /api/resource-costs/chargeback-report');
            console.log('   Body: { "period": "monthly", "report_date": "2024-12-01" }');
            return;
        }

        // Display reports
        console.log('\n📊 Available Reports:');
        reports.forEach((report, index) => {
            console.log(`   ${index + 1}. ID: ${report.id} | Period: ${report.report_period} | Date: ${report.report_date} | Cost: $${report.total_cost}`);
        });

        // Step 2: Test bulk delete (if more than 1 report)
        if (reports.length >= 2) {
            console.log('\n2️⃣ Testing bulk delete...');
            const reportIdsToDelete = [reports[0].id, reports[1].id];
            console.log(`   Attempting to delete reports: ${reportIdsToDelete.join(', ')}`);

            // Uncomment to actually delete
            // const deleteResponse = await axios.delete(`${BASE_URL}/chargeback-reports/bulk-delete`, {
            //     headers: { 
            //         'Authorization': `Bearer ${AUTH_TOKEN}`,
            //         'Content-Type': 'application/json'
            //     },
            //     data: { reportIds: reportIdsToDelete }
            // });
            // console.log('✅ Delete response:', deleteResponse.data);

            console.log('   ⚠️ Bulk delete test skipped (uncomment code to test)');
        } else {
            console.log('\n2️⃣ Skipping bulk delete test (need at least 2 reports)');
        }

        // Step 3: Test download
        console.log('\n3️⃣ Testing bulk download...');
        const reportIdsToDownload = reports.slice(0, Math.min(3, reports.length)).map(r => r.id);
        console.log(`   Downloading reports: ${reportIdsToDownload.join(', ')}`);

        const downloadResponse = await axios.post(
            `${BASE_URL}/chargeback-reports/download`,
            { reportIds: reportIdsToDownload },
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
            const filename = `chargeback-reports-test-${Date.now()}.xlsx`;
            fs.writeFileSync(filename, downloadResponse.data);
            console.log(`✅ Downloaded ${reportIdsToDownload.length} reports to: ${filename}`);
            console.log(`   File size: ${(downloadResponse.data.length / 1024).toFixed(2)} KB`);
        } else {
            console.error('❌ Download failed:', downloadResponse.status);
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
console.log('  Chargeback Report Bulk Operations Test');
console.log('═══════════════════════════════════════════════════════════\n');

if (!AUTH_TOKEN || AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️  Please set AUTH_TOKEN environment variable');
    console.log('   Example: AUTH_TOKEN=your-token node test-chargeback-bulk-operations.js');
    console.log('\n   To get your token:');
    console.log('   1. Login to the application');
    console.log('   2. Open browser DevTools > Application > Local Storage');
    console.log('   3. Copy the value of "authToken"\n');
    process.exit(1);
}

testBulkOperations();
