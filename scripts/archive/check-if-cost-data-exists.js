// Check if cost data exists in database
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function checkCostData() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔍 Checking for cost data...\n');

    // Check total records
    const total = await pool.query('SELECT COUNT(*) as count FROM cost_records');
    const totalCount = parseInt(total.rows[0].count);
    
    console.log(`📊 Total cost records: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n❌ NO COST DATA FOUND!');
      console.log('\n💡 This is why auto-tag does nothing.');
      console.log('   You need to load cost data first.');
      console.log('\n✅ Solution:');
      console.log('   1. Go to Dashboard');
      console.log('   2. Click "Load Cost Data" or "Sync AWS Data"');
      console.log('   3. Wait for data to load');
      console.log('   4. Then try auto-tag again');
      await pool.end();
      return;
    }

    // Check by user
    const byUser = await pool.query(`
      SELECT 
        user_id,
        COUNT(*) as total,
        COUNT(CASE WHEN tags IS NULL THEN 1 END) as untagged,
        COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as tagged
      FROM cost_records
      GROUP BY user_id
      ORDER BY user_id
    `);

    console.log('\n📋 Cost records by user:');
    byUser.rows.forEach(row => {
      console.log(`\n   User ID: ${row.user_id}`);
      console.log(`   Total records: ${row.total}`);
      console.log(`   Untagged: ${row.untagged} (${(row.untagged/row.total*100).toFixed(1)}%)`);
      console.log(`   Tagged: ${row.tagged} (${(row.tagged/row.total*100).toFixed(1)}%)`);
      
      if (parseInt(row.untagged) === 0) {
        console.log(`   ⚠️  All records already tagged! Auto-tag will do nothing.`);
      } else {
        console.log(`   ✅ ${row.untagged} records available for auto-tagging`);
      }
    });

    // Sample untagged records
    const sample = await pool.query(`
      SELECT user_id, service_name, region, cost_amount, tags
      FROM cost_records
      WHERE tags IS NULL
      LIMIT 5
    `);

    if (sample.rows.length > 0) {
      console.log('\n🔖 Sample untagged records:');
      sample.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. User ${row.user_id}: ${row.service_name} (${row.region}) - $${row.cost_amount}`);
      });
    }

    console.log('\n✅ Diagnosis complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCostData();
