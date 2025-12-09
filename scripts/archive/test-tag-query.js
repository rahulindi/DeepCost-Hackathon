/**
 * Test the exact query being used in enforceTagCompliance
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const DatabaseService = require('./backend/src/services/databaseService');

async function testQuery() {
    const userId = 2;
    
    console.log('🧪 Testing Tag Compliance Query\n');
    
    try {
        const query = `
          SELECT 
            service_name,
            region,
            tags,
            resource_id,
            cost_amount,
            date,
            usage_type,
            operation
          FROM cost_records 
          WHERE user_id = $1 
          AND (
            tags IS NULL 
            OR NOT tags ? 'Owner'
            OR NOT tags ? 'CostCenter'
            OR NOT tags ? 'Environment'
          )
          ORDER BY cost_amount DESC
          LIMIT 100
        `;
        
        console.log('Running query for user:', userId);
        const res = await DatabaseService.query(query, [userId]);
        
        console.log(`\n✅ Query returned ${res.rows.length} records\n`);
        
        if (res.rows.length > 0) {
            console.log('First 5 records:');
            res.rows.slice(0, 5).forEach((row, i) => {
                console.log(`\n${i + 1}. ${row.service_name} in ${row.region || 'N/A'}`);
                console.log(`   Cost: $${parseFloat(row.cost_amount).toFixed(2)}`);
                console.log(`   Resource: ${row.resource_id || 'N/A'}`);
                console.log(`   Tags: ${row.tags}`);
            });
            
            // Group by service
            const grouped = res.rows.reduce((acc, resource) => {
                const key = `${resource.service_name}-${resource.region}`;
                if (!acc[key]) {
                    acc[key] = {
                        service: resource.service_name,
                        region: resource.region,
                        resources: [],
                        totalCost: 0
                    };
                }
                acc[key].resources.push({
                    resourceId: resource.resource_id || 'N/A',
                    cost: parseFloat(resource.cost_amount) || 0,
                    date: resource.date,
                    usageType: resource.usage_type,
                    operation: resource.operation,
                    tags: resource.tags
                });
                acc[key].totalCost += parseFloat(resource.cost_amount) || 0;
                return acc;
            }, {});
            
            const groupedArray = Object.values(grouped);
            
            console.log(`\n\n📊 Grouped into ${groupedArray.length} service/region combinations:`);
            groupedArray.slice(0, 5).forEach((group, i) => {
                console.log(`\n${i + 1}. ${group.service} in ${group.region || 'N/A'}`);
                console.log(`   Resources: ${group.resources.length}`);
                console.log(`   Total Cost: $${group.totalCost.toFixed(2)}`);
            });
            
            console.log('\n\n✅ This data SHOULD appear in the UI!');
        } else {
            console.log('❌ No records found - this is the problem!');
        }
        
    } catch (error) {
        console.error('❌ Query error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

testQuery();
