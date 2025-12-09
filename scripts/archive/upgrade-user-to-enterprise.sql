-- Upgrade user to enterprise tier (maximum permissions)
-- This gives the user admin role with all permissions

-- Check current user status
SELECT 
    id, 
    username, 
    email, 
    subscription_tier,
    created_at
FROM users 
WHERE email = 'newstart@test.com';

-- Update user to enterprise tier
UPDATE users 
SET 
    subscription_tier = 'enterprise',
    updated_at = NOW()
WHERE email = 'newstart@test.com';

-- Verify the update
SELECT 
    id, 
    username, 
    email, 
    subscription_tier,
    updated_at
FROM users 
WHERE email = 'newstart@test.com';

-- Show what permissions this gives
-- enterprise tier → admin role → ALL permissions:
-- view_costs, export_costs, create_alerts, manage_alerts, 
-- manage_users, view_audit_logs, bulk_operations, api_access, unlimited_exports