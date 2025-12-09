-- Migration: Fix user_id column type from INTEGER to BIGINT
-- Date: 2024-11-20
-- Purpose: Support large timestamp-based user IDs

-- Change user_id column type to BIGINT
ALTER TABLE cost_records 
ALTER COLUMN user_id TYPE BIGINT;

-- Recreate index (automatically handled by PostgreSQL)
-- The existing index will be updated automatically

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cost_records' AND column_name = 'user_id';
