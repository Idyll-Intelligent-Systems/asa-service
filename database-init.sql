-- ASA Service Database Initialization with Sample Data
-- This script creates all necessary tables and populates them with sample ARK data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS taming_requirements CASCADE;
DROP TABLE IF EXISTS creature_spawns CASCADE;
DROP TABLE IF EXISTS region_resources CASCADE;
DROP TABLE IF EXISTS cave_artifacts CASCADE;
DROP TABLE IF EXISTS caves CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS taming_data CASCADE;
DROP TABLE IF EXISTS creatures CASCADE;
DROP TABLE IF EXISTS maps CASCADE;

-- Maps table
CREATE TABLE maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    type VARCHAR(50) DEFAULT 'Official',
    size VARCHAR(50),
    climate VARCHAR(100),
    dlc BOOLEAN DEFAULT false,
    release_date DATE,
    image_url TEXT,
    wiki_url TEXT,
    coordinates_system VARCHAR(50) DEFAULT 'GPS',
    max_players INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creatures table
CREATE TABLE creatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    scientific_name VARCHAR(150),
    species VARCHAR(100),
    time_period VARCHAR(100),
    diet VARCHAR(50),
    temperament VARCHAR(50),
    tameable BOOLEAN DEFAULT false,
    rideable BOOLEAN DEFAULT false,
    breedable BOOLEAN DEFAULT false,
    health INTEGER,
    stamina INTEGER,
    oxygen INTEGER,
    food INTEGER,
    weight INTEGER,
    melee_damage INTEGER,
    movement_speed DECIMAL(5,2),
    torpor INTEGER,
    base_level INTEGER DEFAULT 1,
    description TEXT,
    wiki_url TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taming data table
CREATE TABLE taming_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL, -- 'Knockout', 'Passive', 'Special'
    food_type VARCHAR(100),
    preferred_food JSONB, -- Array of preferred foods
    kibble_type VARCHAR(100),
    taming_time_min INTEGER, -- in minutes at level 1
    taming_time_max INTEGER, -- in minutes at max level
    food_consumption DECIMAL(8,2),
    effectiveness_multiplier DECIMAL(3,2) DEFAULT 1.0,
    torpor_depletion_rate DECIMAL(8,2),
    narcotic_requirement INTEGER,
    special_requirements TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Regions table
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    biome VARCHAR(50),
    temperature_min INTEGER,
    temperature_max INTEGER,
    coordinates JSONB, -- Store polygon coordinates
    center_lat DECIMAL(10,6),
    center_lon DECIMAL(10,6),
    danger_level VARCHAR(20), -- 'Safe', 'Medium', 'High', 'Extreme'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, slug)
);

-- Resources table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50), -- 'Metal', 'Stone', 'Crystal', 'Oil', etc.
    rarity VARCHAR(20), -- 'Common', 'Uncommon', 'Rare', 'Very Rare'
    stack_size INTEGER DEFAULT 100,
    weight DECIMAL(5,2) DEFAULT 0.1,
    description TEXT,
    uses JSONB, -- Array of what this resource is used for
    gathering_tools JSONB, -- Array of tools that can gather this
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Caves table
CREATE TABLE caves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20), -- 'Easy', 'Medium', 'Hard', 'Very Hard'
    entrance_lat DECIMAL(10,6),
    entrance_lon DECIMAL(10,6),
    depth INTEGER, -- in meters
    temperature INTEGER,
    oxygen_required BOOLEAN DEFAULT false,
    underwater BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, slug)
);

-- Cave artifacts table
CREATE TABLE cave_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cave_id UUID REFERENCES caves(id) ON DELETE CASCADE,
    artifact_name VARCHAR(100) NOT NULL,
    artifact_type VARCHAR(50), -- 'Artifact of the Strong', etc.
    coordinates JSONB,
    difficulty VARCHAR(20),
    guardian_creature VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Region resources table (many-to-many)
CREATE TABLE region_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    abundance VARCHAR(20), -- 'Scarce', 'Common', 'Abundant', 'Rich'
    quality VARCHAR(20), -- 'Poor', 'Average', 'Good', 'Excellent'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region_id, resource_id)
);

-- Creature spawns table (many-to-many)
CREATE TABLE creature_spawns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    spawn_rate VARCHAR(20), -- 'Very Rare', 'Rare', 'Uncommon', 'Common', 'Very Common'
    level_min INTEGER DEFAULT 1,
    level_max INTEGER DEFAULT 150,
    pack_size_min INTEGER DEFAULT 1,
    pack_size_max INTEGER DEFAULT 1,
    active_times JSONB, -- ['Day', 'Night', 'Both']
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creature_id, region_id)
);

-- Taming requirements table
CREATE TABLE taming_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taming_data_id UUID REFERENCES taming_data(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    food_amount INTEGER NOT NULL,
    time_minutes INTEGER NOT NULL,
    narcotic_amount INTEGER DEFAULT 0,
    bio_toxin_amount INTEGER DEFAULT 0,
    effectiveness DECIMAL(5,2) DEFAULT 100.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(taming_data_id, level)
);

-- Insert sample maps
INSERT INTO maps (name, slug, display_name, description, type, size, climate, dlc) VALUES
('The Island', 'the-island', 'The Island', 'The original ARK map featuring diverse biomes from beaches to mountains.', 'Official', 'Large', 'Varied', false),
('The Center', 'the-center', 'The Center', 'A massive map with a giant floating island in the center.', 'Official', 'Extra Large', 'Varied', false),
('Scorched Earth', 'scorched-earth', 'Scorched Earth', 'A harsh desert environment with extreme weather.', 'DLC', 'Large', 'Desert', true),
('Ragnarok', 'ragnarok', 'Ragnarok', 'A beautiful map inspired by Norse mythology.', 'Official', 'Extra Large', 'Varied', false),
('Aberration', 'aberration', 'Aberration', 'An underground damaged ARK with radioactive zones.', 'DLC', 'Large', 'Underground', true),
('Extinction', 'extinction', 'Extinction', 'A post-apocalyptic Earth with corrupted creatures.', 'DLC', 'Large', 'Wasteland', true),
('Valguero', 'valguero', 'Valguero', 'A lush map with underground caves and diverse biomes.', 'Official', 'Large', 'Varied', false),
('Genesis Part 1', 'genesis-1', 'Genesis: Part 1', 'Multiple biomes in a simulation with missions.', 'DLC', 'Large', 'Simulation', true),
('Genesis Part 2', 'genesis-2', 'Genesis: Part 2', 'A giant colony ship traveling through space.', 'DLC', 'Large', 'Space', true),
('Crystal Isles', 'crystal-isles', 'Crystal Isles', 'A magical map filled with floating islands and crystals.', 'Official', 'Large', 'Mystical', false),
('Fjordur', 'fjordur', 'Fjordur', 'A Nordic-inspired map with multiple realms.', 'Official', 'Extra Large', 'Nordic', false);

-- Insert sample creatures
INSERT INTO creatures (name, slug, scientific_name, species, diet, temperament, tameable, rideable, breedable, health, stamina, melee_damage, description) VALUES
('Rex', 'rex', 'Tyrannosaurus Rex', 'Tyrannosaurus', 'Carnivore', 'Aggressive', true, true, true, 1100, 420, 62, 'The ultimate apex predator of the island.'),
('Parasaur', 'parasaur', 'Parasaurolophus', 'Parasaurolophus', 'Herbivore', 'Passive', true, true, true, 200, 150, 12, 'A peaceful herbivore perfect for beginners.'),
('Raptor', 'raptor', 'Utahraptor', 'Utahraptor', 'Carnivore', 'Aggressive', true, true, true, 200, 150, 15, 'Fast and deadly pack hunters.'),
('Triceratops', 'triceratops', 'Triceratops', 'Triceratops', 'Herbivore', 'Docile', true, true, true, 365, 150, 32, 'A sturdy three-horned herbivore.'),
('Pteranodon', 'pteranodon', 'Pteranodon', 'Pteranodon', 'Carnivore', 'Skittish', true, true, true, 120, 150, 18, 'Early game flying mount.'),
('Stegosaurus', 'stegosaurus', 'Stegosaurus', 'Stegosaurus', 'Herbivore', 'Docile', true, true, true, 650, 300, 42, 'Heavily armored herbivore with spike plates.'),
('Carnotaurus', 'carnotaurus', 'Carnotaurus', 'Carnotaurus', 'Carnivore', 'Aggressive', true, true, true, 420, 150, 35, 'Fast running predator with horned skull.'),
('Ankylosaurus', 'ankylosaurus', 'Ankylosaurus', 'Ankylosaurus', 'Herbivore', 'Docile', true, true, true, 700, 175, 50, 'Heavily armored creature excellent for gathering metal.'),
('Argentavis', 'argentavis', 'Argentavis', 'Argentavis', 'Carrion-Feeder', 'Short-Tempered', true, true, true, 365, 400, 25, 'Large bird of prey capable of carrying heavy loads.'),
('Brontosaurus', 'brontosaurus', 'Brontosaurus', 'Apatosaurus', 'Herbivore', 'Docile', true, true, true, 2070, 240, 60, 'Massive long-necked herbivore.');

-- Insert sample taming data
INSERT INTO taming_data (creature_id, method, food_type, preferred_food, kibble_type, taming_time_min, taming_time_max, effectiveness_multiplier) VALUES
((SELECT id FROM creatures WHERE slug = 'rex'), 'Knockout', 'Meat', '["Prime Meat", "Mutton", "Raw Meat"]', 'Exceptional Kibble', 60, 180, 1.0),
((SELECT id FROM creatures WHERE slug = 'parasaur'), 'Knockout', 'Berries', '["Mejoberries", "Berries"]', 'Simple Kibble', 15, 45, 1.0),
((SELECT id FROM creatures WHERE slug = 'raptor'), 'Knockout', 'Meat', '["Prime Meat", "Raw Meat"]', 'Simple Kibble', 20, 60, 1.0),
((SELECT id FROM creatures WHERE slug = 'triceratops'), 'Knockout', 'Berries', '["Mejoberries", "Berries"]', 'Simple Kibble', 25, 75, 1.0),
((SELECT id FROM creatures WHERE slug = 'pteranodon'), 'Knockout', 'Meat', '["Raw Meat", "Fish Meat"]', 'Regular Kibble', 15, 45, 1.0);

-- Insert sample regions for The Island
INSERT INTO regions (map_id, name, slug, description, biome, danger_level) VALUES
((SELECT id FROM maps WHERE slug = 'the-island'), 'Southern Shores', 'southern-shores', 'Safe beaches perfect for new survivors.', 'Beach', 'Safe'),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Western Plains', 'western-plains', 'Open grasslands with abundant resources.', 'Grassland', 'Medium'),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Northern Forest', 'northern-forest', 'Dense redwood forest with dangerous predators.', 'Forest', 'High'),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Central Cave', 'central-cave', 'Deep cave system with artifacts.', 'Cave', 'High'),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Volcano', 'volcano', 'Dangerous volcanic region with obsidian and metal.', 'Volcanic', 'Extreme');

-- Insert sample resources
INSERT INTO resources (name, slug, type, rarity, stack_size, weight, description) VALUES
('Stone', 'stone', 'Stone', 'Common', 300, 1.0, 'Basic building material found everywhere.'),
('Wood', 'wood', 'Wood', 'Common', 300, 0.5, 'Essential crafting material from trees.'),
('Thatch', 'thatch', 'Thatch', 'Common', 100, 0.1, 'Basic thatching material from plants.'),
('Flint', 'flint', 'Stone', 'Common', 100, 0.5, 'Sharp stone used for tools and weapons.'),
('Metal', 'metal', 'Metal', 'Uncommon', 300, 1.0, 'Valuable ore for advanced equipment.'),
('Crystal', 'crystal', 'Crystal', 'Rare', 100, 1.0, 'Rare crystalline material for electronics.'),
('Oil', 'oil', 'Oil', 'Rare', 20, 0.1, 'Black liquid essential for gasoline and polymers.'),
('Obsidian', 'obsidian', 'Stone', 'Rare', 50, 4.0, 'Volcanic glass used for high-quality tools.'),
('Polymer', 'polymer', 'Synthetic', 'Rare', 20, 0.1, 'Advanced crafting material from oil or organic sources.'),
('Electronics', 'electronics', 'Synthetic', 'Rare', 100, 0.1, 'Complex components for advanced technology.');

-- Insert sample caves
INSERT INTO caves (map_id, name, slug, description, difficulty, underwater) VALUES
((SELECT id FROM maps WHERE slug = 'the-island'), 'Lower South Cave', 'lower-south-cave', 'Easy cave perfect for beginners.', 'Easy', false),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Central Cave', 'central-cave', 'Medium difficulty cave with good loot.', 'Medium', false),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Ice Cave', 'ice-cave', 'Extremely cold and dangerous cave.', 'Hard', false),
((SELECT id FROM maps WHERE slug = 'the-island'), 'Underwater Cave', 'underwater-cave', 'Dangerous underwater cave system.', 'Very Hard', true);

-- Insert sample cave artifacts
INSERT INTO cave_artifacts (cave_id, artifact_name, artifact_type, guardian_creature) VALUES
((SELECT id FROM caves WHERE slug = 'lower-south-cave'), 'Artifact of the Hunter', 'Alpha Boss', 'Meganeura'),
((SELECT id FROM caves WHERE slug = 'central-cave'), 'Artifact of the Clever', 'Alpha Boss', 'Araneo'),
((SELECT id FROM caves WHERE slug = 'ice-cave'), 'Artifact of the Strong', 'Alpha Boss', 'Purlovia'),
((SELECT id FROM caves WHERE slug = 'underwater-cave'), 'Artifact of the Brute', 'Alpha Boss', 'Eurypterid');

-- Insert sample region resources
INSERT INTO region_resources (region_id, resource_id, abundance, quality) VALUES
((SELECT id FROM regions WHERE slug = 'southern-shores'), (SELECT id FROM resources WHERE slug = 'stone'), 'Abundant', 'Good'),
((SELECT id FROM regions WHERE slug = 'southern-shores'), (SELECT id FROM resources WHERE slug = 'wood'), 'Common', 'Average'),
((SELECT id FROM regions WHERE slug = 'volcano'), (SELECT id FROM resources WHERE slug = 'metal'), 'Rich', 'Excellent'),
((SELECT id FROM regions WHERE slug = 'volcano'), (SELECT id FROM resources WHERE slug = 'obsidian'), 'Abundant', 'Excellent'),
((SELECT id FROM regions WHERE slug = 'northern-forest'), (SELECT id FROM resources WHERE slug = 'wood'), 'Rich', 'Excellent');

-- Insert sample creature spawns
INSERT INTO creature_spawns (creature_id, region_id, spawn_rate, level_min, level_max, pack_size_min, pack_size_max) VALUES
((SELECT id FROM creatures WHERE slug = 'parasaur'), (SELECT id FROM regions WHERE slug = 'southern-shores'), 'Common', 1, 30, 1, 3),
((SELECT id FROM creatures WHERE slug = 'raptor'), (SELECT id FROM regions WHERE slug = 'western-plains'), 'Uncommon', 5, 50, 2, 4),
((SELECT id FROM creatures WHERE slug = 'rex'), (SELECT id FROM regions WHERE slug = 'northern-forest'), 'Rare', 20, 80, 1, 1),
((SELECT id FROM creatures WHERE slug = 'pteranodon'), (SELECT id FROM regions WHERE slug = 'southern-shores'), 'Common', 1, 40, 1, 2),
((SELECT id FROM creatures WHERE slug = 'triceratops'), (SELECT id FROM regions WHERE slug = 'western-plains'), 'Common', 5, 45, 1, 2);

-- Create indexes for better performance
CREATE INDEX idx_creatures_slug ON creatures(slug);
CREATE INDEX idx_creatures_tameable ON creatures(tameable);
CREATE INDEX idx_maps_slug ON maps(slug);
CREATE INDEX idx_regions_map_id ON regions(map_id);
CREATE INDEX idx_regions_slug ON regions(map_id, slug);
CREATE INDEX idx_taming_data_creature_id ON taming_data(creature_id);
CREATE INDEX idx_creature_spawns_creature_id ON creature_spawns(creature_id);
CREATE INDEX idx_creature_spawns_region_id ON creature_spawns(region_id);
CREATE INDEX idx_region_resources_region_id ON region_resources(region_id);
CREATE INDEX idx_region_resources_resource_id ON region_resources(resource_id);

-- Create full-text search indexes
CREATE INDEX idx_creatures_search ON creatures USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_maps_search ON maps USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_resources_search ON resources USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_maps_updated_at BEFORE UPDATE ON maps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creatures_updated_at BEFORE UPDATE ON creatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_taming_data_updated_at BEFORE UPDATE ON taming_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caves_updated_at BEFORE UPDATE ON caves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
