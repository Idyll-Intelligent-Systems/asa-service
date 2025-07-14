-- ASA Service Database Schema
-- Complete schema with all tables and official data integration
-- Version: 3.0.0 - Production Ready

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enums for data integrity
DO $$ 
BEGIN
    -- Creature related enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creature_temperament') THEN
        CREATE TYPE creature_temperament AS ENUM ('passive', 'neutral', 'aggressive', 'defensive', 'skittish');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creature_size') THEN
        CREATE TYPE creature_size AS ENUM ('tiny', 'small', 'medium', 'large', 'massive');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taming_method') THEN
        CREATE TYPE taming_method AS ENUM ('knockout', 'passive', 'special', 'breeding', 'untameable');
    END IF;
    
    -- Map related enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'map_type') THEN
        CREATE TYPE map_type AS ENUM ('official', 'dlc', 'expansion', 'community', 'mod');
    END IF;
    
    -- Resource related enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_rarity') THEN
        CREATE TYPE resource_rarity AS ENUM ('common', 'uncommon', 'rare', 'very_rare', 'legendary');
    END IF;
END $$;

-- ================================
-- CORE TABLES
-- ================================

-- Maps table - ARK survival maps
CREATE TABLE IF NOT EXISTS maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    map_type map_type DEFAULT 'official',
    size_km DECIMAL(8,2),
    release_date DATE,
    wiki_url TEXT,
    image_url TEXT,
    is_official BOOLEAN DEFAULT true,
    is_free BOOLEAN DEFAULT true,
    coordinates_system JSONB, -- Store coordinate system info
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creatures table - All ARK creatures
CREATE TABLE IF NOT EXISTS creatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100), -- Official display name
    species_name VARCHAR(100), -- Scientific name
    description TEXT,
    
    -- Basic properties
    temperament creature_temperament DEFAULT 'neutral',
    size creature_size DEFAULT 'medium',
    taming_method taming_method DEFAULT 'knockout',
    is_tameable BOOLEAN DEFAULT true,
    is_rideable BOOLEAN DEFAULT false,
    is_breedable BOOLEAN DEFAULT true,
    is_boss BOOLEAN DEFAULT false,
    is_alpha BOOLEAN DEFAULT false,
    
    -- Stats (base values)
    base_health INTEGER,
    base_stamina INTEGER,
    base_oxygen INTEGER,
    base_food INTEGER,
    base_water INTEGER,
    base_weight INTEGER,
    base_damage INTEGER,
    base_movement_speed DECIMAL(6,2),
    base_torpidity INTEGER,
    
    -- External data sources
    wiki_url TEXT,
    dododex_id VARCHAR(50),
    image_url TEXT,
    
    -- Search and metadata
    search_tags TEXT[], -- Array of searchable tags
    biomes TEXT[], -- Array of biomes where found
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map regions for spawn locations and biomes
CREATE TABLE IF NOT EXISTS map_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    region_type VARCHAR(50), -- biome, zone, area
    coordinates JSONB, -- Store coordinate boundaries
    temperature_range JSONB, -- {min: -10, max: 30}
    dangers TEXT[], -- Array of dangers
    resources TEXT[], -- Array of common resources
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, slug)
);

-- Creature spawns - where creatures spawn on maps
CREATE TABLE IF NOT EXISTS creature_spawns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    region_id UUID REFERENCES map_regions(id) ON DELETE SET NULL,
    
    -- Spawn details
    spawn_rate DECIMAL(5,2), -- Percentage spawn rate
    min_level INTEGER DEFAULT 1,
    max_level INTEGER DEFAULT 150,
    group_size_min INTEGER DEFAULT 1,
    group_size_max INTEGER DEFAULT 3,
    
    -- Location data
    coordinates JSONB, -- Specific spawn coordinates
    altitude_min DECIMAL(8,2),
    altitude_max DECIMAL(8,2),
    
    -- Conditions
    time_of_day VARCHAR(20), -- day, night, any
    weather_conditions TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    rarity resource_rarity DEFAULT 'common',
    stack_size INTEGER DEFAULT 100,
    spoil_time INTEGER, -- In seconds
    wiki_url TEXT,
    image_url TEXT,
    crafting_stations TEXT[], -- Where it can be crafted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource spawns on maps
CREATE TABLE IF NOT EXISTS resource_spawns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    region_id UUID REFERENCES map_regions(id) ON DELETE SET NULL,
    
    -- Spawn details
    abundance DECIMAL(5,2), -- Abundance rating 0-100
    quality DECIMAL(5,2), -- Quality rating 0-100
    respawn_time INTEGER, -- In seconds
    
    -- Location
    coordinates JSONB,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taming data from Dododex
CREATE TABLE IF NOT EXISTS taming_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    
    -- Taming requirements
    taming_method taming_method NOT NULL,
    unconscious_time INTEGER, -- Seconds
    taming_effectiveness_max DECIMAL(5,2) DEFAULT 100.0,
    
    -- Food preferences (JSON array of food items with effectiveness)
    preferred_foods JSONB, -- [{name: "Prime Meat", effectiveness: 100, quantity: 50}]
    kibble_type VARCHAR(50),
    
    -- Knockout taming
    torpor_depletion_rate DECIMAL(8,2),
    torpor_needed INTEGER,
    
    -- Passive taming
    feeding_interval INTEGER, -- Seconds between feeds
    
    -- Special requirements
    special_requirements TEXT,
    taming_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creature_id)
);

-- Breeding data
CREATE TABLE IF NOT EXISTS breeding_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    
    -- Breeding mechanics
    mating_interval_min DECIMAL(8,2), -- Hours
    mating_interval_max DECIMAL(8,2),
    gestation_time DECIMAL(8,2), -- Hours for mammals
    incubation_time DECIMAL(8,2), -- Hours for egg layers
    
    -- Baby care
    baby_food_consumption DECIMAL(8,2),
    maturation_time DECIMAL(8,2), -- Hours to adult
    imprint_period DECIMAL(8,2), -- Hours between imprints
    
    -- Conditions
    temperature_requirements JSONB, -- {min: 20, max: 30}
    special_requirements TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creature_id)
);

-- Caves and dungeons
CREATE TABLE IF NOT EXISTS caves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Cave properties
    cave_type VARCHAR(50), -- underwater, ice, lava, artifact, etc.
    difficulty_level INTEGER, -- 1-10 scale
    max_creature_level INTEGER,
    
    -- Location
    entrance_coordinates JSONB,
    exit_coordinates JSONB,
    
    -- Rewards
    artifacts TEXT[], -- Artifact names
    loot_quality VARCHAR(20), -- poor, good, excellent
    
    -- Requirements
    required_items TEXT[], -- Scuba gear, gas masks, etc.
    recommended_level INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, slug)
);

-- Boss fights and encounters
CREATE TABLE IF NOT EXISTS boss_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    creature_id UUID REFERENCES creatures(id) ON DELETE SET NULL,
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Difficulty levels
    gamma_level INTEGER,
    beta_level INTEGER,
    alpha_level INTEGER,
    
    -- Requirements
    required_artifacts TEXT[],
    required_players_min INTEGER DEFAULT 1,
    required_players_max INTEGER DEFAULT 10,
    
    -- Rewards
    rewards JSONB, -- Detailed reward structure
    element_reward INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, slug)
);

-- User favorites and collections
CREATE TABLE IF NOT EXISTS user_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Collection data (flexible JSON structure)
    creatures JSONB, -- Array of creature IDs with notes
    maps JSONB, -- Array of map IDs
    resources JSONB, -- Array of resource IDs
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System configuration and metadata
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    description TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data sync tracking for external sources
CREATE TABLE IF NOT EXISTS data_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(50) NOT NULL, -- 'wiki', 'dododex'
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Primary search indexes
CREATE INDEX IF NOT EXISTS idx_creatures_name_search ON creatures USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_creatures_slug ON creatures(slug);
CREATE INDEX IF NOT EXISTS idx_creatures_temperament ON creatures(temperament);
CREATE INDEX IF NOT EXISTS idx_creatures_tameable ON creatures(is_tameable);
CREATE INDEX IF NOT EXISTS idx_creatures_tags ON creatures USING gin(search_tags);

CREATE INDEX IF NOT EXISTS idx_maps_name_search ON maps USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_maps_slug ON maps(slug);
CREATE INDEX IF NOT EXISTS idx_maps_type ON maps(map_type);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_creature_spawns_creature ON creature_spawns(creature_id);
CREATE INDEX IF NOT EXISTS idx_creature_spawns_map ON creature_spawns(map_id);
CREATE INDEX IF NOT EXISTS idx_creature_spawns_region ON creature_spawns(region_id);

CREATE INDEX IF NOT EXISTS idx_resource_spawns_resource ON resource_spawns(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_spawns_map ON resource_spawns(map_id);

CREATE INDEX IF NOT EXISTS idx_taming_data_creature ON taming_data(creature_id);
CREATE INDEX IF NOT EXISTS idx_breeding_data_creature ON breeding_data(creature_id);

-- Coordinate and location indexes
CREATE INDEX IF NOT EXISTS idx_map_regions_coordinates ON map_regions USING gin(coordinates);
CREATE INDEX IF NOT EXISTS idx_creature_spawns_coordinates ON creature_spawns USING gin(coordinates);

-- ================================
-- MATERIALIZED VIEWS FOR SEARCH
-- ================================

-- Unified search view across all entities
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index AS
SELECT 
    'creature' as entity_type,
    c.id as entity_id,
    c.name,
    c.slug,
    COALESCE(c.description, '') as description,
    ARRAY_TO_STRING(c.search_tags, ' ') as tags,
    to_tsvector('english', 
        c.name || ' ' || 
        COALESCE(c.description, '') || ' ' || 
        COALESCE(ARRAY_TO_STRING(c.search_tags, ' '), '')
    ) as search_vector,
    jsonb_build_object(
        'temperament', c.temperament,
        'tameable', c.is_tameable,
        'rideable', c.is_rideable
    ) as metadata
FROM creatures c
UNION ALL
SELECT 
    'map' as entity_type,
    m.id as entity_id,
    m.name,
    m.slug,
    COALESCE(m.description, '') as description,
    '' as tags,
    to_tsvector('english', m.name || ' ' || COALESCE(m.description, '')) as search_vector,
    jsonb_build_object(
        'type', m.map_type,
        'official', m.is_official,
        'free', m.is_free
    ) as metadata
FROM maps m
UNION ALL
SELECT 
    'resource' as entity_type,
    r.id as entity_id,
    r.name,
    r.slug,
    COALESCE(r.description, '') as description,
    '' as tags,
    to_tsvector('english', r.name || ' ' || COALESCE(r.description, '')) as search_vector,
    jsonb_build_object(
        'rarity', r.rarity,
        'stack_size', r.stack_size
    ) as metadata
FROM resources r;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_search_index_vector ON search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(entity_type);
CREATE INDEX IF NOT EXISTS idx_search_index_slug ON search_index(slug);

-- ================================
-- FUNCTIONS
-- ================================

-- Function to refresh search index
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW search_index;
END;
$$ LANGUAGE plpgsql;

-- Function to get creature spawn locations
CREATE OR REPLACE FUNCTION get_creature_spawns(creature_slug VARCHAR)
RETURNS TABLE(
    map_name VARCHAR,
    region_name VARCHAR,
    spawn_rate DECIMAL,
    coordinates JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.name as map_name,
        r.name as region_name,
        cs.spawn_rate,
        cs.coordinates
    FROM creature_spawns cs
    JOIN creatures c ON cs.creature_id = c.id
    JOIN maps m ON cs.map_id = m.id
    LEFT JOIN map_regions r ON cs.region_id = r.id
    WHERE c.slug = creature_slug
    ORDER BY cs.spawn_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search across all entities
CREATE OR REPLACE FUNCTION search_entities(search_term TEXT, entity_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.entity_type,
        si.entity_id,
        si.name,
        si.slug,
        si.description,
        ts_rank(si.search_vector, plainto_tsquery('english', search_term)) as rank
    FROM search_index si
    WHERE 
        si.search_vector @@ plainto_tsquery('english', search_term)
        AND (entity_filter IS NULL OR si.entity_type = entity_filter)
    ORDER BY rank DESC, si.name;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- INITIAL SYSTEM CONFIGURATION
-- ================================

-- Insert system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('schema_version', '3.0.0', 'Current database schema version'),
    ('last_wiki_sync', NULL, 'Last successful Wiki data synchronization'),
    ('last_dododex_sync', NULL, 'Last successful Dododex data synchronization'),
    ('api_version', '2.0.0', 'Current API version'),
    ('search_enabled', 'true', 'Full-text search functionality enabled')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    last_updated = CURRENT_TIMESTAMP;

-- Log schema creation
INSERT INTO data_sync_log (source_name, sync_type, status, records_processed, started_at, completed_at, duration_seconds)
VALUES ('system', 'schema_creation', 'completed', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
