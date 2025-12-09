// Test to verify each export type shows different data
require('dotenv').config({ path: './backend/.env' });

const AdvancedExportService = require('./backend/src/services/advancedExportService');

async function testExportTypes() {
    console.log('🧪 Testing Different Export Types\n');
    console.log('='  .repeat(80) + '\n');

    const testUserId = 1763658402716;
    
    const exportTypes = [
        {
            name: 'Cost Summary',
            type: 'cost_summary',
            description: 'Aggregated by service with totals'
        },
        {
            name: 'Resource Usage',
            type: 'resource_usage',
            description: 'Detailed daily records'
        },
        {
            name: 'Budget Analysis',
            type: 'budget_analysis',
            description: 'Monthly aggregation'
        },
        {
            name: 'Custom Report',
            type: 'custom_report',
            description: 'Flexible columns'
        }
    ];

    for (const exportType of exportTypes) {
        console.log(`📊 Testing: ${exportType.name}`);
        console.log(`   Type: ${exportType.type}`);
        console.log(`   Description: ${exportType.description}`);
        console.log('-'.repeat(80));

        try {
            const jobConfig = {
                name: `Test ${exportType.name}`,
                type: exportType.type,
                schedule: { type: 'one-time' },
                filters: {},
                output: {
                    format: 'csv',
                    columns: ['service', 'cost', 'date'],
                    delivery: { type: 'download' }
                }
            };

            const result = await AdvancedExportService.createJob(testUserId, jobConfig);

            if (result.success) {
                console.log(`✅ Job created: ${result.job.id}`);
                
                // Wait for job to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check job status
                const jobStatus = await AdvancedExportService.getJob(testUserId, result.job.id);
                
                if (jobStatus.success && jobStatus.job.status === 'completed') {
                    console.log(`✅ Job completed`);
                    
                    // Download and check data
                    const downloadResult = await AdvancedExportService.downloadJob(result.job.id, testUserId);
                    
                    if (downloadResult.success) {
                        const lines = downloadResult.data.split('\n');
                        const header = lines[0];
                        const sampleData = lines.slice(1, 4).join('\n');
                        
                        console.log(`✅ Export generated:`);
                        console.log(`   File size: ${downloadResult.data.length} bytes`);
                        console.log(`   Total lines: ${lines.length}`);
                        console.log(`   Header: ${header}`);
                        console.log(`   Sample data (first 3 rows):`);
                        console.log(`   ${sampleData.substring(0, 200)}...`);
                        
                        // Verify columns are different for each type
                        if (exportType.type === 'cost_summary') {
                            if (header.includes('total_cost') && header.includes('record_count')) {
                                console.log(`   ✅ Correct columns for Cost Summary`);
                            } else {
                                console.log(`   ⚠️  Expected total_cost and record_count columns`);
                            }
                        } else if (exportType.type === 'budget_analysis') {
                            if (header.includes('month') && header.includes('monthly_cost')) {
                                console.log(`   ✅ Correct columns for Budget Analysis`);
                            } else {
                                console.log(`   ⚠️  Expected month and monthly_cost columns`);
                            }
                        }
                    } else {
                        console.log(`   ⚠️  Download failed: ${downloadResult.error}`);
                    }
                } else {
                    console.log(`   ⚠️  Job status: ${jobStatus.job?.status || 'unknown'}`);
                    if (jobStatus.job?.error) {
                        console.log(`   Error: ${jobStatus.job.error}`);
                    }
                }
            } else {
                console.log(`❌ Job creation failed: ${result.error}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        console.log('\n');
    }

    console.log('='  .repeat(80));
    console.log('\n✅ Export type testing complete!\n');
    
    console.log('SUMMARY:');
    console.log('1. Cost Summary: Should show aggregated totals by service');
    console.log('2. Resource Usage: Should show detailed daily records');
    console.log('3. Budget Analysis: Should show monthly aggregation');
    console.log('4. Custom Report: Should show flexible columns\n');
    
    process.exit(0);
}

testExportTypes().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
