-- Enhanced Maps Schema for Interactive Features
-- Supporting Wikily.gg data and interactive map functionality

-- Map locations (POIs, resources, creatures, etc.)
CREATE TABLE IF NOT EXISTS map_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    
    -- Location details
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- resource, creature, cave, landmark, spawn_point
    subcategory VARCHAR(50), -- metal, crystal, rex, artifact_cave, etc.
    
    -- Coordinates (using game coordinates system)
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    altitude DECIMAL(8, 2), -- for 3D positioning
    
    -- Visual data
    image_url TEXT,
    icon_url TEXT,
    marker_color VARCHAR(7) DEFAULT '#FF0000', -- hex color
    
    -- Metadata
    description TEXT,
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, very_rare, legendary
    difficulty VARCHAR(20) DEFAULT 'easy', -- easy, medium, hard, impossible
    danger_level INTEGER DEFAULT 1, -- 1-10 scale
    
    -- Additional properties (JSON for flexibility)
    properties JSONB, -- {respawn_time: 600, quantity: 50, requirements: [...]}
    
    -- Data source tracking
    source VARCHAR(50) DEFAULT 'manual', -- wikily, ark_wiki, dododex, manual
    external_id VARCHAR(100),
    
    -- Search optimization
    search_vector tsvector,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(map_id, latitude, longitude, category, name)
);

-- User locations and waypoints
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL, -- Can be session ID or user identifier
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    
    -- Location details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Coordinates
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    
    -- User preferences
    is_base BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    color VARCHAR(7) DEFAULT '#0066CC',
    icon VARCHAR(50) DEFAULT 'home',
    
    -- Sharing and visibility
    is_public BOOLEAN DEFAULT false,
    shared_with TEXT[], -- Array of user IDs
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes and paths between locations
CREATE TABLE IF NOT EXISTS map_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    
    -- Route details
    name VARCHAR(200),
    description TEXT,
    
    -- Start and end points
    start_location_id UUID REFERENCES map_locations(id),
    end_location_id UUID REFERENCES map_locations(id),
    
    -- Custom coordinates if not using existing locations
    start_lat DECIMAL(10, 6),
    start_lng DECIMAL(10, 6),
    end_lat DECIMAL(10, 6),
    end_lng DECIMAL(10, 6),
    
    -- Route properties
    distance_km DECIMAL(8, 2),
    estimated_time INTEGER, -- minutes
    difficulty VARCHAR(20) DEFAULT 'medium',
    dangers TEXT[], -- Array of dangers: ['rex', 'lava', 'radiation']
    
    -- Path waypoints (JSON array of coordinates)
    waypoints JSONB, -- [{lat: x, lng: y, note: "watch for rexes"}, ...]
    
    -- Route type
    route_type VARCHAR(50) DEFAULT 'walking', -- walking, flying, swimming, vehicle
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map layers for different data visualization
CREATE TABLE IF NOT EXISTS map_layers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    
    -- Layer details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- biomes, spawns, resources, dangers
    
    -- Layer data (GeoJSON or custom format)
    layer_data JSONB NOT NULL,
    
    -- Display properties
    color VARCHAR(7) DEFAULT '#FF0000',
    opacity DECIMAL(3, 2) DEFAULT 0.7,
    stroke_width INTEGER DEFAULT 2,
    fill_enabled BOOLEAN DEFAULT true,
    
    -- Visibility
    default_visible BOOLEAN DEFAULT true,
    min_zoom_level INTEGER DEFAULT 1,
    max_zoom_level INTEGER DEFAULT 18,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_map_locations_map_id ON map_locations(map_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_category ON map_locations(category);
CREATE INDEX IF NOT EXISTS idx_map_locations_coordinates ON map_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_map_locations_search ON map_locations USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_map_locations_rarity ON map_locations(rarity);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_map_id ON user_locations(map_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_coordinates ON user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_locations_is_base ON user_locations(is_base);

CREATE INDEX IF NOT EXISTS idx_map_routes_map_id ON map_routes(map_id);
CREATE INDEX IF NOT EXISTS idx_map_routes_start_location ON map_routes(start_location_id);
CREATE INDEX IF NOT EXISTS idx_map_routes_end_location ON map_routes(end_location_id);

CREATE INDEX IF NOT EXISTS idx_map_layers_map_id ON map_layers(map_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_category ON map_layers(category);

-- Update search vectors for full-text search
CREATE OR REPLACE FUNCTION update_map_locations_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.category, '') || ' ' ||
        COALESCE(NEW.subcategory, '') || ' ' ||
        COALESCE(NEW.description, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_map_locations_search_vector
    BEFORE INSERT OR UPDATE ON map_locations
    FOR EACH ROW EXECUTE FUNCTION update_map_locations_search_vector();

-- Enhanced maps table with interactive features
ALTER TABLE maps ADD COLUMN IF NOT EXISTS interactive_map_url TEXT;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS map_bounds JSONB; -- {north: x, south: x, east: x, west: x}
ALTER TABLE maps ADD COLUMN IF NOT EXISTS default_zoom INTEGER DEFAULT 10;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS center_coordinates JSONB; -- {lat: x, lng: x}
ALTER TABLE maps ADD COLUMN IF NOT EXISTS has_interactive_data BOOLEAN DEFAULT false;
