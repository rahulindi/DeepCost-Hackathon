// Test script to verify Resource Cost Allocation functionality
require('dotenv').config({ path: './backend/.env' });

const ResourceCostAllocationService = require('./backend/src/services/resourceCostAllocationService');

async function testCostAllocation() {
    console.log('🧪 Testing Resource Cost Allocation\n');

    const testUserId = 'user-1763658402716';
    const dbUserId = 1763658402716;
    
    console.log(`1️⃣ Testing with User ID: ${testUserId} (DB: ${dbUserId})\n`);

    const service = new ResourceCostAllocationService();

    // Test 1: Allocation Summary
    console.log('2️⃣ Testing getAllocationSummary()...');
    try {
        const summary = await service.getAllocationSummary(dbUserId);
        if (summary.success) {
            console.log('✅ Allocation Summary retrieved');
            console.log(`   Total Cost: $${summary.data.totalCost.toFixed(2)}`);
            console.log(`   Allocated: ${summary.data.allocationPercentages.assigned.toFixed(1)}%`);
        } else {
            console.log(`❌ Failed: ${summary.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Tag Compliance
    console.log('\n3️⃣ Testing getTagCompliance()...');
    try {
        const compliance = await service.getTagCompliance(dbUserId);
        if (compliance.success) {
            console.log('✅ Tag Compliance retrieved');
            console.log(`   Total Resources: ${compliance.data.summary.totalResources}`);
            console.log(`   Compliance: ${compliance.data.summary.compliancePercentage}%`);
        } else {
            console.log(`❌ Failed: ${compliance.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Cost Breakdown
    console.log('\n4️⃣ Testing getCostBreakdown()...');
    try {
        const breakdown = await service.getCostBreakdown(dbUserId);
        if (breakdown.success) {
            console.log('✅ Cost Breakdown retrieved');
            console.log(`   Breakdown items: ${breakdown.data.length}`);
        } else {
            console.log(`❌ Failed: ${breakdown.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Top Cost Centers
    console.log('\n5️⃣ Testing getTopCostCenters()...');
    try {
        const costCenters = await service.getTopCostCenters(dbUserId, 5);
        if (costCenters.success) {
            console.log('✅ Top Cost Centers retrieved');
            console.log(`   Cost Centers: ${costCenters.data.length}`);
            if (costCenters.data.length > 0) {
                console.log(`   Top: ${costCenters.data[0].cost_center} ($${costCenters.data[0].total_cost})`);
            }
        } else {
            console.log(`❌ Failed: ${costCenters.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Create Allocation Rule
    console.log('\n6️⃣ Testing createAllocationRule()...');
    try {
        const ruleData = {
            rule_name: 'Test Rule - EC2 to Engineering',
            rule_type: 'service_based',
            condition_json: { services: ['ec2', 'ebs'] },
            allocation_target: {
                cost_center: 'CC-ENG-001',
                department: 'Engineering',
                project: 'Infrastructure'
            },
            priority: 100
        };
        
        const rule = await service.createAllocationRule(ruleData, dbUserId);
        if (rule.success) {
            console.log('✅ Allocation Rule created');
            console.log(`   Rule ID: ${rule.data.id}`);
            console.log(`   Rule Name: ${rule.data.rule_name}`);
        } else {
            console.log(`❌ Failed: ${rule.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 6: Get Allocation Rules
    console.log('\n7️⃣ Testing getAllocationRules()...');
    try {
        const rules = await service.getAllocationRules(dbUserId);
        if (rules.success) {
            console.log('✅ Allocation Rules retrieved');
            console.log(`   Total Rules: ${rules.data.length}`);
        } else {
            console.log(`❌ Failed: ${rules.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 7: Generate Chargeback Report
    console.log('\n8️⃣ Testing generateChargebackReport()...');
    try {
        const reportData = {
            period: 'monthly',
            report_date: new Date().toISOString().split('T')[0]
        };
        
        const report = await service.generateChargebackReport(reportData, dbUserId);
        if (report.success) {
            console.log('✅ Chargeback Report generated');
            console.log(`   Report ID: ${report.data.id}`);
            console.log(`   Total Cost: $${report.data.total_cost}`);
        } else {
            console.log(`❌ Failed: ${report.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 8: Get Chargeback Reports
    console.log('\n9️⃣ Testing getChargebackReports()...');
    try {
        const reports = await service.getChargebackReports(dbUserId);
        if (reports.success) {
            console.log('✅ Chargeback Reports retrieved');
            console.log(`   Total Reports: ${reports.data.length}`);
        } else {
            console.log(`❌ Failed: ${reports.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Cost Allocation testing complete!');
    process.exit(0);
}

testCostAllocation().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
