// Manually add test tags to cost_records to test Tagging Intelligence
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function addTestTags() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🏷️  Adding test tags to cost_records...\n');

    // First, check how many records we have
    const countResult = await pool.query('SELECT COUNT(*) as count FROM cost_records');
    const totalRecords = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Total cost records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('\n❌ No cost records found!');
      console.log('   Please load cost data from Dashboard first.');
      await pool.end();
      return;
    }

    // Add tags to first 50% of records
    const updateQuery = `
      UPDATE cost_records
      SET tags = jsonb_build_object(
        'Owner', 'test-owner',
        'Environment', 'production',
        'CostCenter', 'engineering'
      )
      WHERE id IN (
        SELECT id FROM cost_records 
        WHERE tags IS NULL 
        LIMIT ${Math.ceil(totalRecords / 2)}
      )
      RETURNING id
    `;

    console.log('\n🔄 Adding tags to ~50% of records...');
    const result = await pool.query(updateQuery);
    
    console.log(`✅ Added tags to ${result.rowCount} records`);

    // Verify
    const verifyQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as tagged,
        COUNT(CASE WHEN tags IS NULL THEN 1 END) as untagged
      FROM cost_records
    `;
    
    const verify = await pool.query(verifyQuery);
    const stats = verify.rows[0];
    
    console.log('\n📊 Updated Statistics:');
    console.log(`   Total records: ${stats.total}`);
    console.log(`   Tagged: ${stats.tagged} (${(stats.tagged/stats.total*100).toFixed(1)}%)`);
    console.log(`   Untagged: ${stats.untagged} (${(stats.untagged/stats.total*100).toFixed(1)}%)`);

    console.log('\n✅ Done! Now refresh your browser and check Tagging Intelligence tab.');
    console.log('   You should see:');
    console.log('   - Compliance Score: ~50%');
    console.log('   - Most Used Tags: Owner, Environment, CostCenter');
    console.log('   - AI Suggestions with recommendations');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTestTags();
