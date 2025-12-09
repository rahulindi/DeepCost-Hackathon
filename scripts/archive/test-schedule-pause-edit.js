/**
 * Test script for schedule pause/resume and edit functionality
 */

const API_BASE = 'http://localhost:3001/api';

// Test credentials - create unique user each time
const timestamp = Date.now();
// 🔒 SECURITY: Use environment variables for credentials
const testUser = {
    email: process.env.TEST_EMAIL || `test-schedule-${timestamp}@example.com`,
    password: process.env.TEST_PASSWORD || 'your-password'
};

let authToken = '';
let testScheduleId = '';

async function register() {
    console.log('📝 Registering test user...');
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    if (data.success) {
        console.log('✅ Registration successful');
        // Now login to get token
        return await login();
    }
    console.error('❌ Registration failed:', data);
    return false;
}

async function login() {
    console.log('🔐 Logging in...');
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    if (data.token) {
        authToken = data.token;
        console.log('✅ Login successful');
        return true;
    }
    console.error('❌ Login failed:', data);
    return false;
}

async function createTestSchedule() {
    console.log('\n📅 Creating test schedule...');
    const response = await fetch(`${API_BASE}/lifecycle/schedule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            resourceId: 'i-test-pause-edit-123',
            action: 'shutdown',
            schedule: {
                name: 'Test Pause/Edit Schedule',
                cronExpression: '0 18 * * 1-5',
                timezone: 'UTC'
            }
        })
    });
    
    const data = await response.json();
    if (data.success) {
        testScheduleId = data.scheduleId;
        console.log('✅ Schedule created:', testScheduleId);
        return true;
    }
    console.error('❌ Failed to create schedule:', data);
    return false;
}

async function getSchedules() {
    console.log('\n📋 Getting schedules...');
    const response = await fetch(`${API_BASE}/lifecycle/schedule`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });
    
    const data = await response.json();
    if (data.success) {
        console.log(`✅ Found ${data.data.length} schedules`);
        data.data.forEach(s => {
            console.log(`   - ${s.schedule_name}: ${s.schedule_type} (${s.is_active ? 'Active' : 'Inactive'})`);
        });
        return data.data;
    }
    console.error('❌ Failed to get schedules:', data);
    return [];
}

async function pauseSchedule(scheduleId) {
    console.log(`\n⏸️  Pausing schedule ${scheduleId}...`);
    const response = await fetch(`${API_BASE}/lifecycle/schedule/${scheduleId}/toggle`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });
    
    const data = await response.json();
    if (data.success) {
        console.log(`✅ Schedule ${data.isActive ? 'resumed' : 'paused'}`);
        return true;
    }
    console.error('❌ Failed to toggle schedule:', data);
    return false;
}

async function editSchedule(scheduleId) {
    console.log(`\n✏️  Editing schedule ${scheduleId}...`);
    const response = await fetch(`${API_BASE}/lifecycle/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'startup',
            schedule: {
                name: 'Updated Test Schedule',
                cronExpression: '0 8 * * 1-5',
                timezone: 'America/New_York'
            }
        })
    });
    
    const data = await response.json();
    if (data.success) {
        console.log('✅ Schedule updated successfully');
        console.log('   New details:', data.data);
        return true;
    }
    console.error('❌ Failed to update schedule:', data);
    return false;
}

async function runTests() {
    console.log('🧪 Testing Schedule Pause/Resume and Edit Functionality\n');
    console.log('='.repeat(60));
    
    // Register
    if (!await register()) return;
    
    // Create test schedule
    if (!await createTestSchedule()) return;
    
    // Get initial schedules
    await getSchedules();
    
    // Pause the schedule
    await pauseSchedule(testScheduleId);
    
    // Verify it's paused
    console.log('\n🔍 Verifying pause...');
    const schedulesAfterPause = await getSchedules();
    const pausedSchedule = schedulesAfterPause.find(s => s.id === testScheduleId);
    if (pausedSchedule && !pausedSchedule.is_active) {
        console.log('✅ Schedule is paused');
    } else {
        console.log('❌ Schedule is still active');
    }
    
    // Resume the schedule
    await pauseSchedule(testScheduleId);
    
    // Verify it's resumed
    console.log('\n🔍 Verifying resume...');
    const schedulesAfterResume = await getSchedules();
    const resumedSchedule = schedulesAfterResume.find(s => s.id === testScheduleId);
    if (resumedSchedule && resumedSchedule.is_active) {
        console.log('✅ Schedule is active again');
    } else {
        console.log('❌ Schedule is still paused');
    }
    
    // Edit the schedule
    await editSchedule(testScheduleId);
    
    // Verify the edit
    console.log('\n🔍 Verifying edit...');
    const schedulesAfterEdit = await getSchedules();
    const editedSchedule = schedulesAfterEdit.find(s => s.id === testScheduleId);
    if (editedSchedule) {
        console.log('✅ Schedule details after edit:');
        console.log(`   Name: ${editedSchedule.schedule_name}`);
        console.log(`   Type: ${editedSchedule.schedule_type}`);
        console.log(`   Cron: ${editedSchedule.cron_expression}`);
        console.log(`   Timezone: ${editedSchedule.timezone}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
