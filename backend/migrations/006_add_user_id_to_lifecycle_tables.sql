-- Migration: Add user_id to lifecycle management tables
-- Date: 2024-11-20
-- Purpose: Enable per-user data isolation for lifecycle features

-- Add user_id to orphaned_resources table
ALTER TABLE orphaned_resources 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_orphaned_resources_user_id ON orphaned_resources(user_id);

-- Add user_id to scheduled_actions table (if exists)
ALTER TABLE scheduled_actions 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_scheduled_actions_user_id ON scheduled_actions(user_id);

-- Add user_id to rightsizing_recommendations table (if exists)
ALTER TABLE rightsizing_recommendations 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_rightsizing_recommendations_user_id ON rightsizing_recommendations(user_id);

-- Verify changes
SELECT 'orphaned_resources' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orphaned_resources' AND column_name = 'user_id'
UNION ALL
SELECT 'scheduled_actions' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scheduled_actions' AND column_name = 'user_id'
UNION ALL
SELECT 'rightsizing_recommendations' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rightsizing_recommendations' AND column_name = 'user_id';
