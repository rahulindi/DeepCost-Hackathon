// CRITICAL FIX for resourceLifecycleService.js
// Replace the getScheduledActions method (around line 86-125)

async getScheduledActions(filters = {}) {
    try {
        let query = `
            SELECT rs.*, rl.resource_type, rl.service_name, rl.region
            FROM resource_schedules rs
            LEFT JOIN resource_lifecycle rl ON rs.resource_id = rl.resource_id
            WHERE rs.is_active = true
        `;
        const params = [];

        // 🔒 SECURITY: Filter by user ID (CRITICAL!)
        if (filters.userId) {
            const dbUserId = DatabaseService.getUserIdForDatabase(filters.userId);
            params.push(dbUserId);
            query += ` AND rs.created_by = $${params.length}`;  // ✅ FIXED: Added $ sign
            console.log(`🔒 Filtering scheduled actions by userId: ${filters.userId} (DB: ${dbUserId}, type: ${typeof dbUserId})`);
        }

        if (filters.resourceId) {
            params.push(filters.resourceId);
            query += ` AND rs.resource_id = $${params.length}`;  // ✅ FIXED: Added $ sign
        }

        if (filters.scheduleType) {
            params.push(filters.scheduleType);
            query += ` AND rs.schedule_type = $${params.length}`;  // ✅ FIXED: Added $ sign
        }

        query += ' ORDER BY rs.created_at DESC';

        const result = await DatabaseService.query(query, params);
        console.log(`📊 Found ${result.rows.length} scheduled actions${filters.userId ? ' for user ' + filters.userId : ''}`);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('❌ Error fetching scheduled actions:', error);
        throw error;
    }
}

// THE BUG: Missing $ sign in parameter placeholders
// BEFORE: query += ` AND rs.created_by = ${params.length}`;  // Creates "AND rs.created_by = 1" (wrong!)
// AFTER:  query += ` AND rs.created_by = $${params.length}`; // Creates "AND rs.created_by = $1" (correct!)
