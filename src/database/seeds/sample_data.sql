-- Seed data for ASA Service
-- This file contains initial data for testing and development

-- Insert sample creatures
INSERT INTO creatures (name, slug, scientific_name, temperament, diet, taming_method, rideable, breedable, description) VALUES
    ('T-Rex', 'tyrannosaurus', 'Tyrannosaurus dominum', 'aggressive', 'carnivore', 'knockout', true, true, 'The apex predator of ARK. Extremely dangerous but powerful when tamed.'),
    ('Triceratops', 'triceratops', 'Triceratops styrax', 'neutral', 'herbivore', 'knockout', true, true, 'A sturdy herbivore excellent for gathering berries and thatch.'),
    ('Parasaur', 'parasaurolophus', 'Parasaurolophus amphibio', 'passive', 'herbivore', 'knockout', true, true, 'One of the most common and peaceful dinosaurs. Great for beginners.'),
    ('Raptor', 'utahraptor', 'Utahraptor prime', 'aggressive', 'carnivore', 'knockout', true, true, 'Fast and deadly pack hunters. Excellent for scouting and quick travel.'),
    ('Dodo', 'dodo', 'Raphus replicare', 'passive', 'herbivore', 'knockout', false, true, 'Harmless and slow, but provides eggs and an easy source of food.'),
    ('Mammoth', 'mammuthus', 'Mammuthus steincaput', 'neutral', 'herbivore', 'knockout', true, true, 'Excellent for gathering wood and carrying heavy loads.'),
    ('Sabertooth', 'smilodon', 'Smilodon brutalis', 'aggressive', 'carnivore', 'knockout', true, true, 'Agile predator excellent for gathering chitin and hide.'),
    ('Argentavis', 'argentavis', 'Argentavis atrocollum', 'neutral', 'carnivore', 'knockout', true, true, 'Giant bird of prey. Essential for aerial transport and metal gathering.'),
    ('Ankylosaurus', 'ankylosaurus', 'Ankylosaurus crassacutis', 'neutral', 'herbivore', 'knockout', true, true, 'Heavily armored herbivore. The best creature for gathering metal, flint, and crystal.'),
    ('Pteranodon', 'pteranodon', 'Pteranodon wyvernus', 'passive', 'carnivore', 'knockout', true, true, 'Fast flying mount, perfect for early-game exploration and quick travel.')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample creature stats for level 1
INSERT INTO creature_stats (creature_id, level, health, stamina, oxygen, food, weight, melee_damage, movement_speed, torpidity) VALUES
    ((SELECT id FROM creatures WHERE slug = 'tyrannosaurus'), 1, 1100, 420, 150, 3000, 500, 100, 100, 1550),
    ((SELECT id FROM creatures WHERE slug = 'triceratops'), 1, 375, 150, 150, 3000, 365, 100, 100, 250),
    ((SELECT id FROM creatures WHERE slug = 'parasaurolophus'), 1, 200, 200, 150, 1500, 120, 100, 100, 170),
    ((SELECT id FROM creatures WHERE slug = 'utahraptor'), 1, 200, 150, 150, 1200, 140, 100, 100, 180),
    ((SELECT id FROM creatures WHERE slug = 'dodo'), 1, 40, 100, 150, 450, 50, 100, 100, 30),
    ((SELECT id FROM creatures WHERE slug = 'mammuthus'), 1, 850, 330, 150, 6000, 500, 100, 100, 350),
    ((SELECT id FROM creatures WHERE slug = 'smilodon'), 1, 250, 200, 150, 1200, 150, 100, 100, 200),
    ((SELECT id FROM creatures WHERE slug = 'argentavis'), 1, 365, 750, 150, 2000, 400, 100, 100, 600),
    ((SELECT id FROM creatures WHERE slug = 'ankylosaurus'), 1, 700, 175, 150, 3000, 250, 100, 100, 420),
    ((SELECT id FROM creatures WHERE slug = 'pteranodon'), 1, 210, 750, 150, 1200, 120, 100, 100, 200)
ON CONFLICT (creature_id, level) DO NOTHING;

-- Insert sample regions for The Island
INSERT INTO map_regions (map_id, name, category, latitude, longitude, description, danger_level) VALUES
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'South Zone 1', 'safe', 19.0, 68.0, 'Safe starting area with abundant resources', 1),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'South Zone 2', 'safe', 19.0, 37.0, 'Another safe starting location', 1),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'South Zone 3', 'safe', 41.0, 57.0, 'Safe zone near the central river', 1),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Central River', 'safe', 57.0, 72.0, 'Central river system, generally safe', 2),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Northern Plains', 'dangerous', 85.0, 53.0, 'Dangerous area with large predators', 4),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Volcano', 'dangerous', 23.0, 42.0, 'Extremely dangerous volcanic region', 5),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Underwater Caves', 'water', 35.0, 85.0, 'Underwater cave systems', 4),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Snow Biome', 'dangerous', 81.0, 20.0, 'Cold northern region with unique creatures', 4),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Redwood Forest', 'dangerous', 58.0, 45.0, 'Dense forest with tall redwood trees', 3),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Swamp', 'dangerous', 69.0, 83.0, 'Disease-ridden swampland', 4)
ON CONFLICT DO NOTHING;

-- Insert sample caves for The Island
INSERT INTO caves (map_id, name, type, difficulty, entrance_lat, entrance_lon, artifact, description) VALUES
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Lower South Cave', 'artifact', 'easy', 68.2, 56.2, 'Artifact of the Hunter', 'Easy cave suitable for beginners'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Central Cave', 'artifact', 'medium', 41.5, 46.9, 'Artifact of the Clever', 'Medium difficulty cave with varied creatures'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'North East Cave', 'artifact', 'hard', 14.7, 85.4, 'Artifact of the Devourer', 'Difficult cave with dangerous creatures'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Underwater Cave', 'artifact', 'very_hard', 68.1, 58.6, 'Artifact of the Brute', 'Challenging underwater cave system'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Snow Cave', 'artifact', 'hard', 29.1, 31.8, 'Artifact of the Strong', 'Cold cave in the snow biome'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Swamp Cave', 'artifact', 'very_hard', 62.7, 37.3, 'Artifact of the Immune', 'Disease-filled swamp cave'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Carno Island Cave', 'loot', 'medium', 26.4, 66.7, NULL, 'Loot cave on Carno Island'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Dead Island Cave', 'loot', 'hard', 23.0, 85.0, NULL, 'Dangerous loot cave'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Eastern Cave', 'artifact', 'medium', 86.8, 70.6, 'Artifact of the Pack', 'Cave in the eastern coast'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Western Cave', 'artifact', 'medium', 76.5, 17.4, 'Artifact of the Skylord', 'Western coastal cave')
ON CONFLICT DO NOTHING;

-- Insert sample resources for The Island
INSERT INTO resources (map_id, name, type, rarity, latitude, longitude, description) VALUES
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Metal Rich Mountain', 'metal', 'common', 25.0, 25.0, 'High concentration of metal nodes'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Crystal Caves', 'crystal', 'uncommon', 19.0, 19.0, 'Crystal formations in caves'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Oil Rocks', 'oil', 'rare', 68.0, 86.0, 'Underwater oil deposits'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Pearl Beds', 'pearls', 'rare', 35.0, 85.0, 'Underwater pearl deposits'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Obsidian Peaks', 'obsidian', 'uncommon', 42.0, 40.0, 'Obsidian deposits on volcanic peaks'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Rich Metal Mountain North', 'metal', 'common', 81.0, 44.0, 'Northern metal-rich area'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Underwater Oil', 'oil', 'rare', 20.0, 57.0, 'Deep underwater oil deposits'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Crystal Island', 'crystal', 'uncommon', 26.0, 67.0, 'Crystal deposits on small island'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Sulfur Fields', 'sulfur', 'rare', 23.0, 43.0, 'Sulfur deposits near volcano'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Rich Pearls Deep', 'pearls', 'very_rare', 42.0, 66.0, 'Deep water pearl concentrations')
ON CONFLICT DO NOTHING;

-- Insert sample obelisks for The Island
INSERT INTO obelisks (map_id, name, color, latitude, longitude, boss_arena, description) VALUES
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Red Obelisk', 'red', 26.0, 26.0, 'Broodmother Arena', 'Red terminal for boss fights and transfers'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Blue Obelisk', 'blue', 25.0, 25.0, 'Megapithecus Arena', 'Blue terminal for boss fights and transfers'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Green Obelisk', 'green', 58.0, 72.0, 'Dragon Arena', 'Green terminal for boss fights and transfers')
ON CONFLICT DO NOTHING;

-- Insert sample base spots for The Island
INSERT INTO base_spots (map_id, name, type, difficulty, latitude, longitude, pros, cons, danger_rating, description) VALUES
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Hidden Lake Base', 'hidden', 'beginner', 32.0, 32.0, 
     ARRAY['Secluded location', 'Fresh water', 'Safe area'], 
     ARRAY['Limited space', 'Far from resources'], 1,
     'Small hidden lake perfect for starter bases'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Clifftop Fortress', 'cliff', 'advanced', 35.0, 32.0, 
     ARRAY['Defensive position', 'Great views', 'Multiple levels'], 
     ARRAY['Difficult access', 'Fall damage risk'], 2,
     'High cliff location ideal for defensive bases'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'River Delta Base', 'water', 'intermediate', 68.0, 56.0, 
     ARRAY['Water access', 'Flat terrain', 'Good resources'], 
     ARRAY['Flood risk', 'Visible location'], 2,
     'River delta with good building space and water access'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Forest Hideout', 'hidden', 'intermediate', 45.0, 45.0, 
     ARRAY['Natural camouflage', 'Wood resources', 'Multiple escape routes'], 
     ARRAY['Limited visibility', 'Predator spawns'], 3,
     'Deep forest location with natural concealment'),
    ((SELECT id FROM maps WHERE slug = 'the-island'), 'Mountain Stronghold', 'cliff', 'advanced', 80.0, 45.0, 
     ARRAY['Ultimate defense', 'Metal nearby', 'Hard to raid'], 
     ARRAY['Extremely difficult build', 'Cold weather'], 4,
     'Ultimate mountain fortress for experienced players')
ON CONFLICT DO NOTHING;

SELECT 'Sample data inserted successfully' as status;
