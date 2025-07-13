-- Migration 002: Log migration status
-- Version: 1.0.1
-- Date: 2025-01-01

-- Log migration completion
INSERT INTO system_status (key, value, description) VALUES 
    ('migration_001', NOW()::TEXT, 'Initial schema creation completed'),
    ('migration_002', NOW()::TEXT, 'Migration logging system initialized')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
