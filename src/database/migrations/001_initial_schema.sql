-- Migration 001: Create initial schema
-- Version: 1.0.0
-- Date: 2025-01-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creature_temperament') THEN
        CREATE TYPE creature_temperament AS ENUM ('passive', 'neutral', 'aggressive', 'defensive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creature_size') THEN
        CREATE TYPE creature_size AS ENUM ('tiny', 'small', 'medium', 'large', 'massive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'map_status') THEN
        CREATE TYPE map_status AS ENUM ('official', 'dlc', 'community', 'mod');
    END IF;
END $$;

-- Create system status table first
CREATE TABLE IF NOT EXISTS system_status (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables
CREATE TABLE IF NOT EXISTS maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status map_status DEFAULT 'official',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    temperament creature_temperament DEFAULT 'neutral',
    size creature_size DEFAULT 'medium',
    health INTEGER,
    stamina INTEGER,
    oxygen INTEGER,
    food INTEGER,
    weight INTEGER,
    damage INTEGER,
    movement_speed DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO maps (name, slug, description, status) VALUES
    ('The Island', 'the-island', 'The original ARK map', 'official'),
    ('Ragnarok', 'ragnarok', 'A massive free DLC map', 'dlc')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO creatures (name, slug, temperament, size) VALUES
    ('Rex', 'rex', 'aggressive', 'large'),
    ('Dodo', 'dodo', 'passive', 'small')
ON CONFLICT (slug) DO NOTHING;
