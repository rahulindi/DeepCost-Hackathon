require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('./backend/src/services/databaseService');

async function addMultiMonthData() {
    console.log('📊 Adding Multi-Month Test Data for Trend Analysis\n');

    try {
        // Get user ID
        const usersResult = await DatabaseService.query('SELECT id, email FROM users LIMIT 1');
        if (usersResult.rows.length === 0) {
            console.log('❌ No users found');
            return;
        }

        const userId = usersResult.rows[0].id;
        const userEmail = usersResult.rows[0].email;
        console.log(`👤 Using user: ${userEmail} (ID: ${userId})\n`);

        // Check existing data
        const existingResult = await DatabaseService.query(
            `SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as count, SUM(cost_amount) as total
             FROM cost_records 
             WHERE user_id = $1 
             GROUP BY TO_CHAR(date, 'YYYY-MM')
             ORDER BY month DESC`,
            [userId]
        );

        console.log('📅 Existing Data:');
        existingResult.rows.forEach(row => {
            console.log(`   ${row.month}: ${row.count} records, $${parseFloat(row.total).toFixed(2)}`);
        });

        // Add data for previous months if not exists
        const monthsToAdd = [
            { month: '2025-10', baseCost: 4.50, records: 75 },
            { month: '2025-09', baseCost: 4.00, records: 70 },
            { month: '2025-08', baseCost: 3.80, records: 65 }
        ];

        console.log('\n📝 Adding historical data...\n');

        for (const monthData of monthsToAdd) {
            // Check if month already has data
            const checkResult = await DatabaseService.query(
                `SELECT COUNT(*) as count FROM cost_records 
                 WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
                [userId, monthData.month]
            );

            if (parseInt(checkResult.rows[0].count) > 0) {
                console.log(`   ⏭️  ${monthData.month}: Already has data, skipping`);
                continue;
            }

            // Add records for this month
            const services = [
                { name: 'Amazon EC2', percentage: 0.25 },
                { name: 'Amazon Virtual Private Cloud', percentage: 0.35 },
                { name: 'Amazon RDS', percentage: 0.15 },
                { name: 'Amazon S3', percentage: 0.10 },
                { name: 'Tax', percentage: 0.15 }
            ];

            let recordsAdded = 0;
            const daysInMonth = 30;
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${monthData.month}-${String(day).padStart(2, '0')}`;
                
                for (const service of services) {
                    const dailyCost = (monthData.baseCost * service.percentage) / daysInMonth;
                    const cost = dailyCost * (0.9 + Math.random() * 0.2); // Add some variance
                    
                    await DatabaseService.query(
                        `INSERT INTO cost_records 
                         (user_id, date, service_name, cost_amount, resource_id, region)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            userId,
                            date,
                            service.name,
                            cost,
                            `test-resource-${service.name.toLowerCase().replace(/\s+/g, '-')}-${day}`,
                            'ap-south-1'
                        ]
                    );
                    recordsAdded++;
                }
            }

            console.log(`   ✅ ${monthData.month}: Added ${recordsAdded} records (~$${monthData.baseCost})`);
        }

        // Verify the data
        console.log('\n📊 Updated Data Summary:');
        const updatedResult = await DatabaseService.query(
            `SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as count, SUM(cost_amount) as total
             FROM cost_records 
             WHERE user_id = $1 
             GROUP BY TO_CHAR(date, 'YYYY-MM')
             ORDER BY month DESC`,
            [userId]
        );

        updatedResult.rows.forEach(row => {
            console.log(`   ${row.month}: ${row.count} records, $${parseFloat(row.total).toFixed(2)}`);
        });

        // Test the trend analysis
        console.log('\n📈 Testing Trend Analysis:');
        const trends = await DatabaseService.getMonthlyTrends(6, userId);
        
        console.log(`\nMonths with data: ${trends.length}`);
        trends.forEach((trend, index) => {
            console.log(`\n${index + 1}. ${trend.month_year}`);
            console.log(`   Cost: $${parseFloat(trend.total_cost).toFixed(2)}`);
            console.log(`   Growth: ${trend.growth_rate || 0}%`);
            console.log(`   Records: ${trend.record_count}`);
        });

        console.log('\n✅ Multi-month test data added successfully!');
        console.log('\n🎯 Next Steps:');
        console.log('1. Refresh your browser (Cmd+Shift+R)');
        console.log('2. Navigate to Trends tab');
        console.log('3. You should now see:');
        console.log('   - Multiple months of data');
        console.log('   - Growth rates calculated');
        console.log('   - Both line and bar charts working');
        console.log('   - Cost view and Growth view both functional');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

addMultiMonthData();
