require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('🔍 Testing Database Connection\n');
  console.log('='  .repeat(60) + '\n');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Port: ${process.env.DB_PORT}\n`);
  
  try {
    console.log('Attempting connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!\n');
    
    const result = await client.query('SELECT NOW(), version()');
    console.log(`✅ Query successful`);
    console.log(`   Time: ${result.rows[0].now}`);
    console.log(`   Version: ${result.rows[0].version.substring(0, 50)}...\n`);
    
    const countResult = await client.query('SELECT COUNT(*) FROM cost_records');
    console.log(`✅ Cost records: ${countResult.rows[0].count} records\n`);
    
    client.release();
    
    console.log('='  .repeat(60));
    console.log('✅ DATABASE IS WORKING CORRECTLY!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!\n');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}\n`);
    
    console.log('='  .repeat(60));
    console.log('\n💡 TROUBLESHOOTING:\n');
    
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      console.log('Issue: Connection Timeout');
      console.log('Most Likely Cause: AWS RDS instance is STOPPED\n');
      console.log('Solution:');
      console.log('1. Go to AWS Console → RDS');
      console.log('2. Find database: cost-tracker-db');
      console.log('3. Check status - if "Stopped", click "Start"');
      console.log('4. Wait 2-3 minutes for database to start');
      console.log('5. Run this test again\n');
    } else if (error.message.includes('authentication') || error.code === '28P01') {
      console.log('Issue: Authentication Failed');
      console.log('Cause: Wrong username or password\n');
      console.log('Solution:');
      console.log('1. Check backend/.env file');
      console.log('2. Verify DB_USER and DB_PASSWORD');
      console.log('3. Check AWS RDS console for correct credentials\n');
    } else if (error.message.includes('ENOTFOUND') || error.code === 'ENOTFOUND') {
      console.log('Issue: Host Not Found');
      console.log('Cause: DNS resolution failed or wrong hostname\n');
      console.log('Solution:');
      console.log('1. Check DB_HOST in backend/.env');
      console.log('2. Verify internet connection');
      console.log('3. Try: nslookup ' + process.env.DB_HOST + '\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('Issue: Connection Refused');
      console.log('Cause: Database not accepting connections\n');
      console.log('Solution:');
      console.log('1. Check if RDS instance is running');
      console.log('2. Verify security group allows your IP');
      console.log('3. Check VPC settings\n');
    } else {
      console.log('Issue: Unknown Error');
      console.log('Cause: ' + error.message + '\n');
      console.log('Solution:');
      console.log('1. Check AWS RDS console');
      console.log('2. Review CloudWatch logs');
      console.log('3. Verify all .env settings\n');
    }
    
    console.log('='  .repeat(60) + '\n');
    process.exit(1);
  }
}

testConnection();
