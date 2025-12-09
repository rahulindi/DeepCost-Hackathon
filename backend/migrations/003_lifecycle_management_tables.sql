-- Resource Lifecycle Management Database Schema
-- This migration creates all necessary tables for the lifecycle management system

-- Resource Schedules Table
-- Stores scheduled actions for resources (shutdown, startup, resize, terminate)
CREATE TABLE IF NOT EXISTS resource_schedules (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL,
    schedule_name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('shutdown', 'startup', 'resize', 'terminate')),
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, schedule_type)
);

-- Resource Lifecycle Tracking
-- Tracks resource lifecycle stages and history
CREATE TABLE IF NOT EXISTS resource_lifecycle (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL UNIQUE,
    resource_type VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    account_id VARCHAR(20) NOT NULL,
    current_stage VARCHAR(50) DEFAULT 'active', -- active, scheduled, terminated, etc.
    lifecycle_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rightsizing Recommendations
-- Stores cost optimization recommendations for resources
CREATE TABLE IF NOT EXISTS rightsizing_recommendations (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL,
    current_instance_type VARCHAR(100) NOT NULL,
    recommended_instance_type VARCHAR(100) NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    performance_impact VARCHAR(20) CHECK (performance_impact IN ('low', 'medium', 'high')),
    analysis_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP NULL
);

-- Orphaned Resources
-- Tracks detected orphaned/unused resources for cleanup
CREATE TABLE IF NOT EXISTS orphaned_resources (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL UNIQUE,
    resource_type VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    orphan_type VARCHAR(50) NOT NULL CHECK (orphan_type IN ('unused', 'unattached', 'idle', 'misconfigured')),
    last_activity TIMESTAMP NOT NULL,
    potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    cleanup_risk_level VARCHAR(20) CHECK (cleanup_risk_level IN ('low', 'medium', 'high')),
    cleanup_status VARCHAR(20) DEFAULT 'detected' CHECK (cleanup_status IN ('detected', 'scheduled', 'cleaned')),
    detection_metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cleaned_at TIMESTAMP NULL
);

-- Lifecycle Actions Log
-- Audit trail for all lifecycle actions performed
CREATE TABLE IF NOT EXISTS lifecycle_actions_log (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- schedule_created, action_executed, recommendation_applied, etc.
    action_details JSONB DEFAULT '{}',
    executed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    execution_status VARCHAR(20) DEFAULT 'pending' CHECK (execution_status IN ('pending', 'success', 'failed')),
    error_message TEXT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Metrics (for rightsizing analysis)
-- Stores performance data for resources
CREATE TABLE IF NOT EXISTS resource_performance_metrics (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL, -- cpu_utilization, memory_utilization, etc.
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL, -- percent, bytes, etc.
    collection_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_resource_schedules_resource_id ON resource_schedules(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_schedules_active ON resource_schedules(is_active, schedule_type);
CREATE INDEX IF NOT EXISTS idx_resource_lifecycle_resource_id ON resource_lifecycle(resource_id);
CREATE INDEX IF NOT EXISTS idx_rightsizing_recommendations_resource_id ON rightsizing_recommendations(resource_id);
CREATE INDEX IF NOT EXISTS idx_rightsizing_recommendations_status ON rightsizing_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_orphaned_resources_resource_id ON orphaned_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_orphaned_resources_status ON orphaned_resources(cleanup_status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_actions_log_resource_id ON lifecycle_actions_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_actions_log_executed_at ON lifecycle_actions_log(executed_at);
CREATE INDEX IF NOT EXISTS idx_resource_metrics ON resource_performance_metrics(resource_id, metric_name, collection_timestamp);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_resource_schedules_updated_at 
    BEFORE UPDATE ON resource_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_lifecycle_updated_at 
    BEFORE UPDATE ON resource_lifecycle 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup old performance metrics (older than 90 days) - Scheduled cleanup
-- This can be run as a maintenance job
-- DELETE FROM resource_performance_metrics WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
