-- Migration: Create business_metrics table
-- Purpose: Store real business metrics for forecasting correlation
-- Date: 2025-11-20

-- Create business_metrics table
CREATE TABLE IF NOT EXISTS business_metrics (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    revenue DECIMAL(15,2) DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    transactions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    customer_acquisition_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_metrics_user_date 
ON business_metrics(user_id, date DESC);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_business_metrics_user 
ON business_metrics(user_id);

-- Add comment
COMMENT ON TABLE business_metrics IS 'Stores business metrics for cost-revenue correlation analysis';

-- Insert sample data for testing (optional - can be removed in production)
-- This helps test the forecasting without waiting for real data
INSERT INTO business_metrics (user_id, date, revenue, active_users, transactions)
SELECT 
    1 as user_id,
    CURRENT_DATE - (n || ' days')::interval as date,
    50000 + (random() * 25000)::numeric(15,2) as revenue,
    10000 + (random() * 5000)::integer as active_users,
    25000 + (random() * 15000)::integer as transactions
FROM generate_series(0, 90) as n
ON CONFLICT (user_id, date) DO NOTHING;

-- Verify table creation
SELECT 'business_metrics table created successfully' as status;
