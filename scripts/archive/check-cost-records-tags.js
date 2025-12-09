// Quick check: Do we have any tagged cost records?
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTags() {
  console.log('🔍 Checking cost_records for tags...\n');
  
  try {
    // Check total records
    const total = await pool.query('SELECT COUNT(*) FROM cost_records');
    console.log(`📊 Total cost records: ${total.rows[0].count}`);
    
    // Check tagged records
    const tagged = await pool.query('SELECT COUNT(*) FROM cost_records WHERE tags IS NOT NULL');
    console.log(`🏷️  Tagged records: ${tagged.rows[0].count}`);
    
    // Check by user
    const byUser = await pool.query(`
      SELECT 
        user_id, 
        COUNT(*) as total,
        COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as tagged
      FROM cost_records 
      GROUP BY user_id
    `);
    
    console.log('\n📋 By User:');
    byUser.rows.forEach(row => {
      console.log(`   User ${row.user_id}: ${row.tagged}/${row.total} tagged (${(row.tagged/row.total*100).toFixed(1)}%)`);
    });
    
    // Sample tags
    const sample = await pool.query('SELECT service_name, region, tags FROM cost_records WHERE tags IS NOT NULL LIMIT 5');
    
    if (sample.rows.length > 0) {
      console.log('\n🔖 Sample Tags:');
      sample.rows.forEach(row => {
        console.log(`   ${row.service_name} (${row.region}): ${JSON.stringify(row.tags)}`);
      });
    } else {
      console.log('\n⚠️  NO TAGS FOUND IN DATABASE!');
      console.log('\n💡 This is why Tagging Intelligence shows no data.');
      console.log('   The feature analyzes EXISTING tags, but you have none yet.');
      console.log('\n✅ Solution: Click the AUTO-TAG button to add default tags.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTags();
