-- Migration 003: Log migration status
-- Version: 1.0.1
-- Date: 2025-01-01

-- Log migration completion using the existing system_status table
INSERT INTO system_status (status_key, status_value, description) VALUES 
    ('migration_001', NOW()::TEXT, 'Initial schema creation completed'),
    ('migration_002', NOW()::TEXT, 'Full-text search capabilities added'),
    ('migration_003', NOW()::TEXT, 'Migration logging system initialized')
ON CONFLICT (status_key) DO UPDATE SET 
    status_value = EXCLUDED.status_value,
    updated_at = CURRENT_TIMESTAMP;
