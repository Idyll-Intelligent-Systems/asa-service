-- Migration 002: Add full-text search capabilities  
-- Version: 2.0.0
-- Date: 2025-01-02

-- Add description column to creatures if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creatures' AND column_name = 'description') THEN
        ALTER TABLE creatures ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_creatures_fulltext ON creatures 
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_maps_fulltext ON maps 
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
    description,
    to_tsvector('english', name || ' ' || COALESCE(description, '')) as search_vector
FROM creatures
UNION ALL
SELECT 
    'region' as entity_type,
    id as entity_id,
    name,
    description,
    to_tsvector('english', name || ' ' || COALESCE(description, '')) as search_vector
FROM map_regions
UNION ALL
SELECT 
    'cave' as entity_type,
    id as entity_id,
    name,
    description,
    to_tsvector('english', name || ' ' || COALESCE(description, '')) as search_vector
FROM caves;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_search_index_vector ON search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(entity_type);

-- Function to refresh search index
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW search_index;
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO system_status (key, value, description) VALUES 
    ('migration_002', NOW()::TEXT, 'Added full-text search capabilities')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
