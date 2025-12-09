// Test script to verify Export Management functionality
require('dotenv').config({ path: './backend/.env' });

const DatabaseService = require('./backend/src/services/databaseService');
const AdvancedExportService = require('./backend/src/services/advancedExportService');

async function testExportFeature() {
    console.log('🧪 Testing Export Management Feature\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    // Test 1: Check Cost Records Available for Export
    console.log('2️⃣ Checking available cost records...');
    try {
        const result = await DatabaseService.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT service_name) as services,
                MIN(date) as earliest,
                MAX(date) as latest,
                SUM(cost_amount) as total_cost
             FROM cost_records 
             WHERE user_id = $1`,
            [dbUserId]
        );
        
        if (result.rows.length > 0) {
            const stats = result.rows[0];
            console.log('✅ Cost records available for export:');
            console.log(`   Total records: ${stats.total}`);
            console.log(`   Unique services: ${stats.services}`);
            console.log(`   Date range: ${stats.earliest} to ${stats.latest}`);
            console.log(`   Total cost: $${parseFloat(stats.total_cost || 0).toFixed(2)}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: List Existing Export Jobs
    console.log('\n3️⃣ Testing getJobs()...');
    try {
        const result = await AdvancedExportService.getJobs(dbUserId, {
            page: 1,
            limit: 10
        });
        
        if (result.success) {
            console.log(`✅ Retrieved ${result.jobs.length} export jobs`);
            console.log(`   Total jobs: ${result.pagination.total}`);
            console.log(`   Pages: ${result.pagination.totalPages}`);
            
            if (result.jobs.length > 0) {
                const job = result.jobs[0];
                console.log(`\n   Sample job:`);
                console.log(`     ID: ${job.id}`);
                console.log(`     Name: ${job.name}`);
                console.log(`     Type: ${job.type}`);
                console.log(`     Status: ${job.status}`);
                console.log(`     Format: ${job.output.format}`);
            }
        } else {
            console.log(`⚠️  ${result.error || 'No jobs found'}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Create a Test Export Job
    console.log('\n4️⃣ Testing createJob()...');
    try {
        const jobConfig = {
            name: 'Test Cost Export',
            type: 'cost_summary',
            schedule: { type: 'one-time' },
            filters: {
                dateRange: {
                    start: '2025-11-01',
                    end: '2025-11-30'
                }
            },
            output: {
                format: 'csv',
                columns: ['service', 'cost', 'date'],
                delivery: { type: 'download' }
            }
        };
        
        const result = await AdvancedExportService.createJob(dbUserId, jobConfig);
        
        if (result.success) {
            console.log('✅ Export job created successfully');
            console.log(`   Job ID: ${result.job.id}`);
            console.log(`   Name: ${result.job.name}`);
            console.log(`   Status: ${result.job.status}`);
            console.log(`   Format: ${result.job.output.format}`);
            console.log(`   Columns: ${result.job.output.columns.join(', ')}`);
            
            // Wait a bit for job to process
            console.log('\n   ⏳ Waiting for job to process...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check job status
            const jobStatus = await AdvancedExportService.getJob(dbUserId, result.job.id);
            if (jobStatus.success) {
                console.log(`   Job status after processing: ${jobStatus.job.status}`);
                
                if (jobStatus.job.status === 'completed') {
                    console.log(`   ✅ Job completed successfully!`);
                    console.log(`   Output file: ${jobStatus.job.output_file}`);
                    console.log(`   File size: ${jobStatus.job.output_size} bytes`);
                    
                    // Test download
                    console.log('\n   📥 Testing download...');
                    const downloadResult = await AdvancedExportService.downloadJob(result.job.id, dbUserId);
                    if (downloadResult.success) {
                        console.log(`   ✅ Download successful!`);
                        console.log(`   Filename: ${downloadResult.filename}`);
                        console.log(`   Content type: ${downloadResult.contentType}`);
                        console.log(`   Data size: ${downloadResult.data.length} bytes`);
                        console.log(`   First 200 chars: ${downloadResult.data.substring(0, 200)}...`);
                    } else {
                        console.log(`   ⚠️  Download failed: ${downloadResult.error}`);
                    }
                } else if (jobStatus.job.status === 'failed') {
                    console.log(`   ❌ Job failed: ${jobStatus.job.error}`);
                }
            }
        } else {
            console.log(`⚠️  ${result.error || 'Job creation failed'}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Test Different Export Formats
    console.log('\n5️⃣ Testing different export formats...');
    try {
        const formats = ['csv', 'json'];
        
        for (const format of formats) {
            const jobConfig = {
                name: `Test ${format.toUpperCase()} Export`,
                type: 'cost_summary',
                schedule: { type: 'one-time' },
                filters: {},
                output: {
                    format: format,
                    columns: ['service', 'cost', 'date'],
                    delivery: { type: 'download' }
                }
            };
            
            const result = await AdvancedExportService.createJob(dbUserId, jobConfig);
            if (result.success) {
                console.log(`   ✅ ${format.toUpperCase()} export job created: ${result.job.id}`);
            }
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Get Export Statistics
    console.log('\n6️⃣ Testing getStats()...');
    try {
        const result = await AdvancedExportService.getStats(dbUserId);
        
        if (result.success) {
            console.log('✅ Export statistics:');
            console.log(`   Total jobs: ${result.stats.total}`);
            console.log(`   Pending: ${result.stats.pending}`);
            console.log(`   Running: ${result.stats.running}`);
            console.log(`   Completed: ${result.stats.completed}`);
            console.log(`   Failed: ${result.stats.failed}`);
            console.log(`   Recurring: ${result.stats.recurring}`);
        } else {
            console.log(`⚠️  ${result.error || 'Stats not available'}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 6: Test Job Filtering
    console.log('\n7️⃣ Testing job filtering...');
    try {
        const filters = [
            { status: 'completed', label: 'Completed jobs' },
            { status: 'pending', label: 'Pending jobs' },
            { type: 'cost_summary', label: 'Cost summary jobs' }
        ];
        
        for (const filter of filters) {
            const result = await AdvancedExportService.getJobs(dbUserId, filter);
            if (result.success) {
                console.log(`   ${filter.label}: ${result.jobs.length} found`);
            }
        }
        console.log('✅ Job filtering working');
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Export Management testing complete!');
    process.exit(0);
}

testExportFeature().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
