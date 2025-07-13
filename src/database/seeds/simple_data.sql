-- Simple seed data for ASA Service
-- This file contains basic test data

-- Insert sample creatures with simple schema
INSERT INTO creatures (name, slug, temperament, size, health, stamina, description) VALUES
    ('T-Rex', 'tyrannosaurus', 'aggressive', 'large', 1100, 420, 'The apex predator of ARK. Extremely dangerous but powerful when tamed.'),
    ('Triceratops', 'triceratops', 'neutral', 'large', 375, 150, 'A sturdy herbivore excellent for gathering berries and thatch.'),
    ('Parasaur', 'parasaurolophus', 'passive', 'medium', 200, 200, 'One of the most common and peaceful dinosaurs. Great for beginners.'),
    ('Raptor', 'utahraptor', 'aggressive', 'medium', 200, 150, 'Fast and deadly pack hunters. Excellent for scouting and quick travel.'),
    ('Dodo', 'dodo', 'passive', 'small', 40, 100, 'Harmless and slow, but provides eggs and an easy source of food.'),
    ('Mammoth', 'mammuthus', 'neutral', 'large', 850, 330, 'Excellent for gathering wood and carrying heavy loads.'),
    ('Sabertooth', 'smilodon', 'aggressive', 'medium', 250, 200, 'Agile predator excellent for gathering chitin and hide.'),
    ('Argentavis', 'argentavis', 'neutral', 'large', 365, 750, 'Giant bird of prey. Essential for aerial transport.'),
    ('Ankylosaurus', 'ankylosaurus', 'neutral', 'large', 700, 175, 'Heavily armored herbivore. The best creature for gathering metal.'),
    ('Pteranodon', 'pteranodon', 'passive', 'medium', 210, 750, 'Fast flying mount, perfect for exploration and quick travel.')
ON CONFLICT (slug) DO NOTHING;

-- Insert additional sample maps
INSERT INTO maps (name, slug, description, status) VALUES
    ('Scorched Earth', 'scorched-earth', 'A harsh desert environment with unique creatures and challenges.', 'dlc'),
    ('Aberration', 'aberration', 'An underground damaged ARK with radiation zones and unique mechanics.', 'dlc'),
    ('Extinction', 'extinction', 'A post-apocalyptic Earth with corrupted creatures and titans.', 'dlc'),
    ('Genesis Part 1', 'genesis-part-1', 'A simulation with biome missions and unique mechanics.', 'dlc'),
    ('Genesis Part 2', 'genesis-part-2', 'Space-themed expansion with colony ships and new creatures.', 'dlc'),
    ('The Center', 'the-center', 'A large community map with floating islands and underground areas.', 'community'),
    ('Crystal Isles', 'crystal-isles', 'A magical map with crystal wyverns and unique biomes.', 'community')
ON CONFLICT (slug) DO NOTHING;
