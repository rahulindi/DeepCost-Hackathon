// Create business_metrics table for revenue correlation forecasting
require('dotenv').config({ path: './backend/.env' });
const DatabaseService = require('../services/databaseService');

async function createBusinessMetricsTable() {
    console.log('📊 Creating Business Metrics Table\n');
    console.log('='.repeat(80));
    
    try {
        // Step 1: Create business_metrics table
        console.log('\n📋 Step 1: Creating business_metrics table...');
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS business_metrics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                revenue DECIMAL(12, 2) DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                transactions INTEGER DEFAULT 0,
                conversion_rate DECIMAL(5, 2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, date)
            )
        `);
        console.log('✅ business_metrics table created');
        
        // Step 2: Create indexes for performance
        console.log('\n📋 Step 2: Creating indexes...');
        await DatabaseService.query(`
            CREATE INDEX IF NOT EXISTS idx_business_metrics_user_id 
            ON business_metrics(user_id);
        `);
        await DatabaseService.query(`
            CREATE INDEX IF NOT EXISTS idx_business_metrics_date 
            ON business_metrics(date);
        `);
        await DatabaseService.query(`
            CREATE INDEX IF NOT EXISTS idx_business_metrics_user_date 
            ON business_metrics(user_id, date);
        `);
        console.log('✅ Indexes created');
        
        // Step 3: Generate sample business metrics for testdemo1 user
        console.log('\n📋 Step 3: Generating sample business metrics...');
        
        // Get testdemo1 user ID
        const userResult = await DatabaseService.query(
            'SELECT id FROM users WHERE email = $1',
            ['testdemo1@demo.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('⚠️  testdemo1 user not found, skipping sample data');
        } else {
            const userId = userResult.rows[0].id;
            console.log(`✅ Found user ID: ${userId}`);
            
            // Generate 12 months of realistic business metrics
            const metrics = [];
            const baseRevenue = 50000; // $50k base monthly revenue
            const baseUsers = 1000;
            const baseTransactions = 500;
            
            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                date.setDate(1); // First of month
                
                // Add realistic growth and seasonality
                const growthFactor = 1 + (11 - i) * 0.03; // 3% monthly growth
                const seasonalFactor = 1 + Math.sin((date.getMonth() / 12) * Math.PI * 2) * 0.15; // ±15% seasonal
                
                const revenue = Math.round(baseRevenue * growthFactor * seasonalFactor);
                const activeUsers = Math.round(baseUsers * growthFactor * seasonalFactor);
                const transactions = Math.round(baseTransactions * growthFactor * seasonalFactor);
                const conversionRate = ((transactions / activeUsers) * 100).toFixed(2);
                
                metrics.push({
                    date: date.toISOString().split('T')[0],
                    revenue,
                    activeUsers,
                    transactions,
                    conversionRate
                });
            }
            
            // Insert metrics
            let insertedCount = 0;
            for (const metric of metrics) {
                try {
                    await DatabaseService.query(`
                        INSERT INTO business_metrics 
                        (user_id, date, revenue, active_users, transactions, conversion_rate, notes)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (user_id, date) DO NOTHING
                    `, [
                        userId,
                        metric.date,
                        metric.revenue,
                        metric.activeUsers,
                        metric.transactions,
                        metric.conversionRate,
                        'Sample data for forecasting'
                    ]);
                    insertedCount++;
                } catch (error) {
                    console.error(`  ❌ Error inserting metric for ${metric.date}:`, error.message);
                }
            }
            
            console.log(`✅ Inserted ${insertedCount} months of business metrics`);
            
            // Show summary
            const summary = await DatabaseService.query(`
                SELECT 
                    COUNT(*) as total_records,
                    MIN(date) as earliest_date,
                    MAX(date) as latest_date,
                    AVG(revenue) as avg_revenue,
                    AVG(active_users) as avg_users
                FROM business_metrics
                WHERE user_id = $1
            `, [userId]);
            
            const stats = summary.rows[0];
            console.log('\n📊 Business Metrics Summary:');
            console.log(`   Records: ${stats.total_records}`);
            console.log(`   Date Range: ${stats.earliest_date} to ${stats.latest_date}`);
            console.log(`   Avg Revenue: $${parseFloat(stats.avg_revenue).toFixed(2)}`);
            console.log(`   Avg Users: ${Math.round(stats.avg_users)}`);
        }
        
        // Step 4: Verify table structure
        console.log('\n📋 Step 4: Verifying table structure...');
        const columns = await DatabaseService.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'business_metrics'
            ORDER BY ordinal_position
        `);
        
        console.log('✅ Table structure verified:');
        columns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ BUSINESS METRICS TABLE CREATED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('\n📝 Next Steps:');
        console.log('1. Restart backend if running');
        console.log('2. Go to Business Forecasting page');
        console.log('3. Forecasts will now show revenue correlation!');
        console.log('\n💡 The forecasting feature is now fully functional!');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    createBusinessMetricsTable()
        .then(() => {
            console.log('\n✅ Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = createBusinessMetricsTable;
