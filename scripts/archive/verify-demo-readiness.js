// Script to verify everything is ready for Cost Allocation demo
require('dotenv').config({ path: './backend/.env' });

const SimpleAwsCredentials = require('./backend/src/services/simpleAwsCredentials');
const DatabaseService = require('./backend/src/services/databaseService');
const ResourceCostAllocationService = require('./backend/src/services/resourceCostAllocationService');

async function verifyDemoReadiness() {
    console.log('🔍 COST ALLOCATION DEMO READINESS CHECK\n');
    console.log('='.repeat(60));
    
    let allChecks = true;
    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;

    // Check 1: AWS Credentials
    console.log('\n✓ CHECK 1: AWS Credentials');
    console.log('-'.repeat(60));
    const creds = SimpleAwsCredentials.get(dbUserId);
    if (creds.success) {
        console.log('✅ PASS: AWS credentials loaded');
        console.log(`   Region: ${creds.credentials.region}`);
    } else {
        console.log('❌ FAIL: AWS credentials not found');
        console.log('   Run: node store-aws-creds.js');
        allChecks = false;
    }

    // Check 2: Database Tables
    console.log('\n✓ CHECK 2: Database Tables');
    console.log('-'.repeat(60));
    try {
        const tables = await DatabaseService.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('cost_allocation_rules', 'chargeback_reports')
        `);
        
        if (tables.rows.length === 2) {
            console.log('✅ PASS: Both tables exist');
            tables.rows.forEach(t => console.log(`   - ${t.table_name}`));
        } else {
            console.log('❌ FAIL: Missing tables');
            console.log('   Run: node backend/src/migrations/createCostAllocationTables.js');
            allChecks = false;
        }
    } catch (error) {
        console.log('❌ FAIL: Database connection error');
        console.log(`   Error: ${error.message}`);
        allChecks = false;
    }

    // Check 3: Service Initialization
    console.log('\n✓ CHECK 3: Service Initialization');
    console.log('-'.repeat(60));
    const service = new ResourceCostAllocationService();
    const initialized = await service.initializeAWS(dbUserId);
    if (initialized) {
        console.log('✅ PASS: Service initialized with AWS');
    } else {
        console.log('❌ FAIL: Service initialization failed');
        allChecks = false;
    }

    // Check 4: AWS Cost Explorer Access
    console.log('\n✓ CHECK 4: AWS Cost Explorer Access');
    console.log('-'.repeat(60));
    try {
        const summary = await service.getAllocationSummary(dbUserId);
        if (summary.success) {
            console.log('✅ PASS: Cost Explorer API accessible');
            console.log(`   Total Cost: $${summary.data.totalCost.toFixed(2)}`);
        } else {
            console.log('⚠️  WARNING: Cost Explorer returned no data');
            console.log('   This is normal if Cost Explorer is newly enabled');
            console.log('   Wait 24 hours for data to populate');
        }
    } catch (error) {
        console.log('❌ FAIL: Cost Explorer access error');
        console.log(`   Error: ${error.message}`);
        console.log('   Check IAM permissions: ce:GetCostAndUsage');
        allChecks = false;
    }

    // Check 5: AWS Tagging API Access
    console.log('\n✓ CHECK 5: AWS Tagging API Access');
    console.log('-'.repeat(60));
    try {
        const compliance = await service.getTagCompliance(dbUserId);
        if (compliance.success) {
            console.log('✅ PASS: Tagging API accessible');
            console.log(`   Resources found: ${compliance.data.summary.totalResources}`);
            console.log(`   Compliance: ${compliance.data.summary.compliancePercentage}%`);
        } else {
            console.log('❌ FAIL: Tagging API error');
            console.log(`   Error: ${compliance.error}`);
            allChecks = false;
        }
    } catch (error) {
        console.log('❌ FAIL: Tagging API access error');
        console.log(`   Error: ${error.message}`);
        console.log('   Check IAM permissions: tag:GetResources');
        allChecks = false;
    }

    // Check 6: Database Write Access
    console.log('\n✓ CHECK 6: Database Write Access');
    console.log('-'.repeat(60));
    try {
        const testRule = {
            rule_name: 'Demo Readiness Test Rule',
            rule_type: 'service_based',
            condition_json: { services: ['test'] },
            allocation_target: { cost_center: 'TEST' },
            priority: 999
        };
        
        const result = await service.createAllocationRule(testRule, dbUserId);
        if (result.success) {
            console.log('✅ PASS: Can write to database');
            
            // Clean up test rule
            await DatabaseService.query(
                'DELETE FROM cost_allocation_rules WHERE rule_name = $1',
                ['Demo Readiness Test Rule']
            );
            console.log('   Test rule cleaned up');
        } else {
            console.log('❌ FAIL: Cannot write to database');
            console.log(`   Error: ${result.error}`);
            allChecks = false;
        }
    } catch (error) {
        console.log('❌ FAIL: Database write error');
        console.log(`   Error: ${error.message}`);
        allChecks = false;
    }

    // Check 7: Existing Demo Resources
    console.log('\n✓ CHECK 7: Demo Resources in AWS');
    console.log('-'.repeat(60));
    try {
        const compliance = await service.getTagCompliance(dbUserId);
        if (compliance.data.summary.totalResources > 0) {
            console.log(`✅ INFO: ${compliance.data.summary.totalResources} resources found in AWS`);
            console.log('   You can use these for demo');
            console.log('   Or create new ones following the demo guide');
        } else {
            console.log('⚠️  INFO: No resources found in AWS');
            console.log('   Follow COST_ALLOCATION_DEMO_GUIDE.md to create demo resources');
        }
    } catch (error) {
        console.log('⚠️  WARNING: Could not check for resources');
    }

    // Check 8: Backend Server
    console.log('\n✓ CHECK 8: Backend Server');
    console.log('-'.repeat(60));
    try {
        const http = require('http');
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/resource-costs/health',
            method: 'GET',
            timeout: 2000
        };

        await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                if (res.statusCode === 200) {
                    console.log('✅ PASS: Backend server is running');
                    console.log('   Health endpoint accessible');
                    resolve();
                } else {
                    console.log('⚠️  WARNING: Backend server returned non-200 status');
                    resolve();
                }
            });

            req.on('error', (error) => {
                console.log('❌ FAIL: Backend server not running');
                console.log('   Start with: cd backend && npm start');
                allChecks = false;
                resolve();
            });

            req.on('timeout', () => {
                console.log('❌ FAIL: Backend server timeout');
                req.destroy();
                allChecks = false;
                resolve();
            });

            req.end();
        });
    } catch (error) {
        console.log('❌ FAIL: Cannot check backend server');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('READINESS SUMMARY');
    console.log('='.repeat(60));
    
    if (allChecks) {
        console.log('\n🎉 ALL CHECKS PASSED! ✅');
        console.log('\nYou are ready to demo the Cost Allocation feature!');
        console.log('\nNext steps:');
        console.log('1. Follow COST_ALLOCATION_DEMO_GUIDE.md to create demo resources');
        console.log('2. Wait 24 hours for cost data (or use existing resources)');
        console.log('3. Open frontend and navigate to Resource Cost Allocation');
        console.log('4. Follow the demo script in the guide');
    } else {
        console.log('\n⚠️  SOME CHECKS FAILED');
        console.log('\nPlease fix the issues above before proceeding with demo.');
        console.log('Refer to the error messages for specific solutions.');
    }

    console.log('\n📚 Documentation:');
    console.log('   - COST_ALLOCATION_DEMO_GUIDE.md - Complete step-by-step guide');
    console.log('   - DEMO_QUICK_REFERENCE.md - Quick reference card');
    console.log('   - COST_ALLOCATION_IMPLEMENTATION.md - Technical details');
    
    process.exit(allChecks ? 0 : 1);
}

verifyDemoReadiness().catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
});
