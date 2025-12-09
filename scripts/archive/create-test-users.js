const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function createUser(email, password) {
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email,
            password,
            subscription_tier: 'free'
        });
        console.log(`✅ Created user: ${email}`);
        return true;
    } catch (error) {
        if (error.response?.data?.error?.includes('already exists')) {
            console.log(`ℹ️  User already exists: ${email}`);
            return true;
        }
        console.error(`❌ Failed to create ${email}:`, error.response?.data || error.message);
        return false;
    }
}

async function main() {
    console.log('👥 Creating test users...\n');
    
    await createUser('testuser1@example.com', 'password123');
    await createUser('testuser2@example.com', 'password123');
    
    console.log('\n✅ Test users ready!');
}

main();
