-- Migration: Add user_id column to cost_records table for data isolation
-- Date: 2024-11-20
-- Purpose: Enable per-user cost data filtering for security

-- Add user_id column (nullable for backward compatibility with existing data)
ALTER TABLE cost_records 
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cost_records_user_id ON cost_records(user_id);

-- Add foreign key constraint (optional - only if users table exists)
-- ALTER TABLE cost_records 
-- ADD CONSTRAINT fk_cost_records_user 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Note: Existing rows will have NULL user_id
-- New rows will be saved with user_id from the authenticated user
