const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function createAdminUser() {
    try {
        console.log('🔄 Creating admin user safely...');
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id, email, role FROM users WHERE email = $1', ['newstart@test.com']);
        
        if (existingUser.rows.length > 0) {
            console.log('👤 User already exists:', existingUser.rows[0]);
            
            // Just update the role to admin (maximum permissions)
            const updateResult = await pool.query(
                'UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, role',
                ['admin', 'newstart@test.com']
            );
            
            console.log('✅ User role updated to admin (maximum permissions)');
            console.log('📋 Updated user:', updateResult.rows[0]);
            return;
        }
        
        // Create new admin user
        const hashedPassword = await bcrypt.hash('admin123', 10); // You can change this password
        
        const newUser = await pool.query(`
            INSERT INTO users (
                email, 
                password_hash, 
                first_name, 
                last_name, 
                role, 
                auth_provider, 
                is_active, 
                created_at, 
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
            RETURNING id, email, role, created_at
        `, [
            'newstart@test.com',
            hashedPassword,
            'Admin',
            'User',
            'admin',  // Maximum permissions role
            'local',
            true
        ]);
        
        console.log('✅ Admin user created successfully!');
        console.log('📋 New user details:', newUser.rows[0]);
        console.log('🔑 Login credentials:');
        console.log('   Email: newstart@test.com');
        console.log('   Password: admin123');
        console.log('   Role: admin (MAXIMUM PERMISSIONS)');
        
        console.log('\n🎯 This user can now:');
        console.log('   ✅ View all cost data');
        console.log('   ✅ Export unlimited data');
        console.log('   ✅ Create and manage alerts');
        console.log('   ✅ Manage other users');
        console.log('   ✅ Access all API endpoints');
        console.log('   ✅ Perform all operations');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createAdminUser();