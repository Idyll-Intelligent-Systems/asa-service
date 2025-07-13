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
