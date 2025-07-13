-- ASA Service Database Schema
-- Comprehensive schema for ARK: Survival Ascended service
-- Version: 2.0.0-enhanced

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums and Custom Types
CREATE TYPE map_type AS ENUM ('official', 'mod', 'community');
CREATE TYPE region_category AS ENUM ('safe', 'dangerous', 'water', 'underground', 'special');
CREATE TYPE cave_difficulty AS ENUM ('easy', 'medium', 'hard', 'very_hard', 'tek');
CREATE TYPE resource_rarity AS ENUM ('common', 'uncommon', 'rare', 'very_rare');
CREATE TYPE creature_temperament AS ENUM ('passive', 'neutral', 'aggressive', 'highly_aggressive');
CREATE TYPE taming_method AS ENUM ('knockout', 'passive', 'special', 'not_tameable');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Maps table
CREATE TABLE IF NOT EXISTS maps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type map_type NOT NULL DEFAULT 'official',
    official BOOLEAN NOT NULL DEFAULT true,
    expansion BOOLEAN NOT NULL DEFAULT false,
    size_km INTEGER,
    release_date DATE,
    description TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    coordinates_info JSONB,
    temperature_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creatures table
CREATE TABLE IF NOT EXISTS creatures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    scientific_name VARCHAR(150),
    temperament creature_temperament,
    diet VARCHAR(50),
    taming_method taming_method,
    rideable BOOLEAN DEFAULT false,
    breedable BOOLEAN DEFAULT false,
    boss_creature BOOLEAN DEFAULT false,
    image_url TEXT,
    dododex_id VARCHAR(50),
    wiki_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creature stats table
CREATE TABLE IF NOT EXISTS creature_stats (
    id SERIAL PRIMARY KEY,
    creature_id INTEGER REFERENCES creatures(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    health INTEGER,
    stamina INTEGER,
    oxygen INTEGER,
    food INTEGER,
    weight INTEGER,
    melee_damage INTEGER,
    movement_speed INTEGER,
    torpidity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creature_id, level)
);

-- Map regions table
CREATE TABLE IF NOT EXISTS map_regions (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category region_category NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    description TEXT,
    danger_level INTEGER CHECK (danger_level >= 1 AND danger_level <= 5),
    temperature_min INTEGER,
    temperature_max INTEGER,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Caves table
CREATE TABLE IF NOT EXISTS caves (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50),
    difficulty cave_difficulty,
    entrance_lat DECIMAL(10, 7),
    entrance_lon DECIMAL(10, 7),
    exit_lat DECIMAL(10, 7),
    exit_lon DECIMAL(10, 7),
    max_creature_size VARCHAR(20),
    underwater BOOLEAN DEFAULT false,
    artifact VARCHAR(100),
    loot_quality VARCHAR(50),
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    rarity resource_rarity DEFAULT 'common',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    respawn_time INTEGER, -- in minutes
    yield_amount INTEGER,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Obelisks table
CREATE TABLE IF NOT EXISTS obelisks (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    terminal_functions JSONB,
    boss_arena VARCHAR(100),
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supply drops table
CREATE TABLE IF NOT EXISTS supply_drops (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    color VARCHAR(20) NOT NULL,
    quality VARCHAR(50),
    min_level INTEGER,
    max_level INTEGER,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    loot_items JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Base spots table
CREATE TABLE IF NOT EXISTS base_spots (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(150),
    type VARCHAR(50), -- hidden, water, cliff, etc.
    difficulty VARCHAR(20), -- beginner, intermediate, advanced
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    pros TEXT[],
    cons TEXT[],
    resource_proximity JSONB,
    danger_rating INTEGER CHECK (danger_rating >= 1 AND danger_rating <= 5),
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taming calculations table
CREATE TABLE IF NOT EXISTS taming_calculations (
    id SERIAL PRIMARY KEY,
    creature_id INTEGER REFERENCES creatures(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    food_type VARCHAR(100),
    food_quantity INTEGER,
    taming_time INTEGER, -- in seconds
    torpor_depletion_rate DECIMAL(5,2),
    narcotic_needed INTEGER,
    kibble_needed INTEGER,
    effectiveness DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creature_id, level, food_type)
);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- System status table
CREATE TABLE IF NOT EXISTS system_status (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data update log table
CREATE TABLE IF NOT EXISTS data_update_log (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'ark_wiki', 'dododex', 'manual'
    table_name VARCHAR(100),
    operation VARCHAR(20), -- 'insert', 'update', 'delete'
    records_affected INTEGER DEFAULT 0,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time INTEGER, -- in milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Maps indexes
CREATE INDEX IF NOT EXISTS idx_maps_slug ON maps(slug);
CREATE INDEX IF NOT EXISTS idx_maps_type ON maps(type);
CREATE INDEX IF NOT EXISTS idx_maps_official ON maps(official);

-- Creatures indexes
CREATE INDEX IF NOT EXISTS idx_creatures_slug ON creatures(slug);
CREATE INDEX IF NOT EXISTS idx_creatures_temperament ON creatures(temperament);
CREATE INDEX IF NOT EXISTS idx_creatures_taming_method ON creatures(taming_method);
CREATE INDEX IF NOT EXISTS idx_creatures_name_trgm ON creatures USING gin(name gin_trgm_ops);

-- Regions indexes
CREATE INDEX IF NOT EXISTS idx_regions_map_id ON map_regions(map_id);
CREATE INDEX IF NOT EXISTS idx_regions_category ON map_regions(category);
CREATE INDEX IF NOT EXISTS idx_regions_coordinates ON map_regions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_regions_name_trgm ON map_regions USING gin(name gin_trgm_ops);

-- Resources indexes
CREATE INDEX IF NOT EXISTS idx_resources_map_id ON resources(map_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_rarity ON resources(rarity);
CREATE INDEX IF NOT EXISTS idx_resources_coordinates ON resources(latitude, longitude);

-- Caves indexes
CREATE INDEX IF NOT EXISTS idx_caves_map_id ON caves(map_id);
CREATE INDEX IF NOT EXISTS idx_caves_difficulty ON caves(difficulty);
CREATE INDEX IF NOT EXISTS idx_caves_underwater ON caves(underwater);

-- Supply drops indexes
CREATE INDEX IF NOT EXISTS idx_supply_drops_map_id ON supply_drops(map_id);
CREATE INDEX IF NOT EXISTS idx_supply_drops_color ON supply_drops(color);
CREATE INDEX IF NOT EXISTS idx_supply_drops_coordinates ON supply_drops(latitude, longitude);

-- Base spots indexes
CREATE INDEX IF NOT EXISTS idx_base_spots_map_id ON base_spots(map_id);
CREATE INDEX IF NOT EXISTS idx_base_spots_type ON base_spots(type);
CREATE INDEX IF NOT EXISTS idx_base_spots_difficulty ON base_spots(difficulty);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER tr_maps_updated_at 
    BEFORE UPDATE ON maps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_creatures_updated_at 
    BEFORE UPDATE ON creatures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_regions_updated_at 
    BEFORE UPDATE ON map_regions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_caves_updated_at 
    BEFORE UPDATE ON caves 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_resources_updated_at 
    BEFORE UPDATE ON resources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_obelisks_updated_at 
    BEFORE UPDATE ON obelisks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_supply_drops_updated_at 
    BEFORE UPDATE ON supply_drops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_base_spots_updated_at 
    BEFORE UPDATE ON base_spots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename AS table_name,
        n_tup_ins + n_tup_upd - n_tup_del AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_tup_ins + n_tup_upd - n_tup_del DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search across all entities
CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS TABLE(
    entity_type TEXT,
    entity_id INTEGER,
    entity_name TEXT,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'map' as entity_type, id, name, similarity(name, search_term) as relevance
    FROM maps 
    WHERE similarity(name, search_term) > 0.1
    UNION ALL
    SELECT 'creature' as entity_type, id, name, similarity(name, search_term) as relevance
    FROM creatures 
    WHERE similarity(name, search_term) > 0.1
    UNION ALL
    SELECT 'region' as entity_type, id, name, similarity(name, search_term) as relevance
    FROM map_regions 
    WHERE similarity(name, search_term) > 0.1
    ORDER BY relevance DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert system status entries
INSERT INTO system_status (key, value, description) VALUES
    ('schema_version', '2.0.0', 'Database schema version'),
    ('last_wiki_update', NULL, 'Timestamp of last wiki data update'),
    ('last_dododex_update', NULL, 'Timestamp of last Dododex data update'),
    ('database_initialized', NOW()::TEXT, 'Database initialization timestamp')
ON CONFLICT (key) DO NOTHING;

-- Insert initial maps (official ARK maps)
INSERT INTO maps (name, slug, type, official, expansion, release_date, description) VALUES
    ('The Island', 'the-island', 'official', true, false, '2015-06-02', 'The original ARK map'),
    ('The Center', 'the-center', 'official', true, false, '2016-05-17', 'A large map with diverse biomes'),
    ('Scorched Earth', 'scorched-earth', 'official', true, true, '2016-09-01', 'Desert-themed expansion map'),
    ('Ragnarok', 'ragnarok', 'official', true, false, '2017-06-12', 'Norse mythology inspired map'),
    ('Aberration', 'aberration', 'official', true, true, '2017-12-12', 'Underground expansion map'),
    ('Extinction', 'extinction', 'official', true, true, '2018-11-06', 'Post-apocalyptic expansion map'),
    ('Valguero', 'valguero', 'official', true, false, '2019-06-18', 'Community map made official'),
    ('Genesis Part 1', 'genesis-part-1', 'official', true, true, '2020-02-25', 'Simulation-based expansion'),
    ('Crystal Isles', 'crystal-isles', 'official', true, false, '2020-06-11', 'Crystal-themed community map'),
    ('Genesis Part 2', 'genesis-part-2', 'official', true, true, '2021-06-03', 'Final expansion map'),
    ('Lost Island', 'lost-island', 'official', true, false, '2021-12-14', 'Community map with unique biomes'),
    ('Fjordur', 'fjordur', 'official', true, false, '2022-06-12', 'Norse-inspired free DLC map')
ON CONFLICT (slug) DO NOTHING;

SELECT 'ASA Service database schema initialized successfully' as status;
