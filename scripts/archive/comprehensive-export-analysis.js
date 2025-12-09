/**
 * Comprehensive Export Analysis
 * Checks what data exists for each export type
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function comprehensiveAnalysis() {
    console.log('🔍 COMPREHENSIVE EXPORT DATA ANALYSIS\n');
    console.log('='.repeat(70));
    
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected\n');
        
        // ============================================================
        // 1. COST SUMMARY ANALYSIS
        // ============================================================
        console.log('\n📊 1. COST SUMMARY EXPORT ANALYSIS');
        console.log('-'.repeat(70));
        
        const costQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT service_name) as unique_services,
                COUNT(DISTINCT region) as unique_regions,
                MIN(date) as earliest_date,
                MAX(date) as latest_date,
                SUM(cost_amount) as total_cost
            FROM cost_records
        `;
        const costResult = await pool.query(costQuery);
        const costStats = costResult.rows[0];
        
        console.log(`Total Records: ${costStats.total_records}`);
        console.log(`Unique Users: ${costStats.unique_users}`);
        console.log(`Unique Services: ${costStats.unique_services}`);
        console.log(`Unique Regions: ${costStats.unique_regions}`);
        console.log(`Date Range: ${costStats.earliest_date} to ${costStats.latest_date}`);
        console.log(`Total Cost: $${parseFloat(costStats.total_cost || 0).toFixed(2)}`);
        
        // Check by user
        const costByUserQuery = `
            SELECT user_id, COUNT(*) as records, SUM(cost_amount) as total_cost
            FROM cost_records
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY records DESC
        `;
        const costByUser = await pool.query(costByUserQuery);
        console.log(`\nCost Records by User:`);
        costByUser.rows.forEach((row, i) => {
            console.log(`  ${i+1}. User ${row.user_id}: ${row.records} records, $${parseFloat(row.total_cost).toFixed(2)}`);
        });
        
        console.log(`\n✅ COST SUMMARY: ${costStats.total_records > 0 ? 'DATA EXISTS' : 'NO DATA'}`);
        
        // ============================================================
        // 2. RESOURCE USAGE ANALYSIS
        // ============================================================
        console.log('\n\n📦 2. RESOURCE USAGE EXPORT ANALYSIS');
        console.log('-'.repeat(70));
        
        const resourceQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT resource_id) as unique_resources,
                COUNT(DISTINCT service_name) as unique_services
            FROM cost_records
            WHERE resource_id IS NOT NULL
        `;
        const resourceResult = await pool.query(resourceQuery);
        const resourceStats = resourceResult.rows[0];
        
        console.log(`Total Records with resource_id: ${resourceStats.total_records}`);
        console.log(`Unique Users: ${resourceStats.unique_users}`);
        console.log(`Unique Resources: ${resourceStats.unique_resources}`);
        console.log(`Unique Services: ${resourceStats.unique_services}`);
        
        if (parseInt(resourceStats.total_records) > 0) {
            // Sample resources
            const sampleQuery = `
                SELECT resource_id, service_name, COUNT(*) as occurrences
                FROM cost_records
                WHERE resource_id IS NOT NULL
                GROUP BY resource_id, service_name
                ORDER BY occurrences DESC
                LIMIT 5
            `;
            const samples = await pool.query(sampleQuery);
            console.log(`\nTop 5 Resources:`);
            samples.rows.forEach((row, i) => {
                console.log(`  ${i+1}. ${row.resource_id} (${row.service_name}): ${row.occurrences} records`);
            });
        }
        
        console.log(`\n${resourceStats.total_records > 0 ? '✅' : '⚠️'} RESOURCE USAGE: ${resourceStats.total_records > 0 ? 'DATA EXISTS' : 'NO DATA - This is normal if you don\'t track resource IDs'}`);
        
        // ============================================================
        // 3. BUDGET ANALYSIS
        // ============================================================
        console.log('\n\n💰 3. BUDGET ANALYSIS EXPORT ANALYSIS');
        console.log('-'.repeat(70));
        
        // Check if budgets table exists
        const budgetTableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'budgets'
            )
        `);
        
        let budgetResult = null;
        if (budgetTableCheck.rows[0].exists) {
            const budgetQuery = `
                SELECT 
                    COUNT(*) as total_budgets,
                    COUNT(DISTINCT user_id) as unique_users,
                    SUM(amount) as total_budgeted
                FROM budgets
            `;
            budgetResult = await pool.query(budgetQuery);
            const budgetStats = budgetResult.rows[0];
            
            console.log(`Total Budgets: ${budgetStats.total_budgets}`);
            console.log(`Unique Users: ${budgetStats.unique_users}`);
            console.log(`Total Budgeted: $${parseFloat(budgetStats.total_budgeted || 0).toFixed(2)}`);
            
            if (parseInt(budgetStats.total_budgets) > 0) {
                const budgetListQuery = `
                    SELECT name, amount, period, user_id
                    FROM budgets
                    ORDER BY amount DESC
                    LIMIT 5
                `;
                const budgets = await pool.query(budgetListQuery);
                console.log(`\nExisting Budgets:`);
                budgets.rows.forEach((row, i) => {
                    console.log(`  ${i+1}. ${row.name}: $${row.amount} (${row.period}) - User ${row.user_id}`);
                });
            }
            
            console.log(`\n${budgetStats.total_budgets > 0 ? '✅' : '⚠️'} BUDGET ANALYSIS: ${budgetStats.total_budgets > 0 ? 'DATA EXISTS' : 'NO BUDGETS CREATED YET'}`);
        } else {
            console.log('❌ budgets table does not exist');
        }
        
        // ============================================================
        // 4. CUSTOM REPORT ANALYSIS
        // ============================================================
        console.log('\n\n📈 4. CUSTOM REPORT EXPORT ANALYSIS');
        console.log('-'.repeat(70));
        
        // Custom report uses cost_records data, so check if we can generate metrics
        const metricsQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT service_name) as unique_services,
                COUNT(DISTINCT resource_id) as unique_resources,
                SUM(cost_amount) as total_cost,
                AVG(cost_amount) as avg_cost
            FROM cost_records
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        `;
        const metricsResult = await pool.query(metricsQuery);
        const metricsStats = metricsResult.rows[0];
        
        console.log(`Records (last 30 days): ${metricsStats.total_records}`);
        console.log(`Unique Services: ${metricsStats.unique_services}`);
        console.log(`Unique Resources: ${metricsStats.unique_resources}`);
        console.log(`Total Cost: $${parseFloat(metricsStats.total_cost || 0).toFixed(2)}`);
        console.log(`Average Cost: $${parseFloat(metricsStats.avg_cost || 0).toFixed(4)}`);
        
        console.log(`\n✅ CUSTOM REPORT: ${metricsStats.total_records > 0 ? 'DATA EXISTS' : 'NO DATA'}`);
        
        // ============================================================
        // FINAL SUMMARY
        // ============================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📋 FINAL SUMMARY');
        console.log('='.repeat(70));
        
        const summary = {
            cost_summary: parseInt(costStats.total_records) > 0,
            resource_usage: parseInt(resourceStats.total_records) > 0,
            budget_analysis: budgetTableCheck.rows[0].exists && parseInt(budgetResult?.rows[0]?.total_budgets || 0) > 0,
            custom_report: parseInt(metricsStats.total_records) > 0
        };
        
        console.log(`\n1. Cost Summary Export:     ${summary.cost_summary ? '✅ READY' : '❌ NO DATA'}`);
        console.log(`2. Resource Usage Export:   ${summary.resource_usage ? '✅ READY' : '⚠️  NO RESOURCE DATA'}`);
        console.log(`3. Budget Analysis Export:  ${summary.budget_analysis ? '✅ READY' : '⚠️  NO BUDGETS'}`);
        console.log(`4. Custom Report Export:    ${summary.custom_report ? '✅ READY' : '❌ NO DATA'}`);
        
        console.log('\n📝 RECOMMENDATIONS:');
        
        if (!summary.cost_summary) {
            console.log('  ❌ Import AWS cost data to enable Cost Summary exports');
        }
        
        if (!summary.resource_usage) {
            console.log('  ⚠️  Resource Usage export will show "No data" - this is normal if:');
            console.log('     - Your cost data doesn\'t include resource_id field');
            console.log('     - You haven\'t enabled resource-level tracking');
        }
        
        if (!summary.budget_analysis) {
            console.log('  ⚠️  Budget Analysis export will show "No data" - you need to:');
            console.log('     - Create budgets in the Budget Management page');
            console.log('     - Budgets are optional, not required for other exports');
        }
        
        if (!summary.custom_report) {
            console.log('  ❌ Import AWS cost data to enable Custom Report exports');
        }
        
        console.log('\n' + '='.repeat(70));
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

comprehensiveAnalysis();
