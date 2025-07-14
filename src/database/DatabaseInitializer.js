/**
 * Database Initialization Service
 * Complete database setup with real ARK Wiki and Dododex data integration
 * Replaces migration system with single initialization approach
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const WikiDataService = require('../services/WikiDataService');
const DodoDexService = require('../services/DodoDexService');
const logger = require('../utils/logger');

class DatabaseInitializer {
    constructor(config = {}) {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'asa_service',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ...config
        };
        
        this.pool = null;
        this.wikiService = new WikiDataService();
        this.dododexService = new DodoDexService();
        
        // Track initialization status
        this.status = {
            schema: false,
            wikiData: false,
            dododexData: false,
            initialization: false
        };
        
        this.logger = logger.child({ component: 'DatabaseInitializer' });
    }

    /**
     * Initialize the complete database system
     */
    async initialize(options = {}) {
        const {
            dropExisting = false,
            skipDataSync = false,
            verbose = true
        } = options;

        const startTime = Date.now();

        try {
            this.logger.database('Starting ASA Service database initialization...');
            this.logger.info('Initialization options', { dropExisting, skipDataSync, verbose });

            // Step 1: Connect to database
            await this.connect();
            if (verbose) console.log('✅ Database connection established');

            // Step 2: Create schema if needed
            if (dropExisting) {
                await this.dropSchema();
                if (verbose) console.log('🗑️  Existing schema dropped');
            }

            await this.createSchema();
            this.status.schema = true;
            if (verbose) console.log('✅ Database schema created');

            // Step 3: Check if data already exists
            const hasData = await this.checkExistingData();
            
            if (!hasData && !skipDataSync) {
                // Step 4: Populate with real data
                if (verbose) console.log('📥 Fetching real data from external sources...');
                
                await this.populateWithRealData(verbose);
                if (verbose) console.log('✅ Real data population completed');
            } else if (hasData && verbose) {
                console.log('ℹ️  Database already contains data, skipping data sync');
            }

            // Step 5: Refresh search indexes
            await this.refreshSearchIndexes();
            if (verbose) console.log('✅ Search indexes refreshed');

            this.status.initialization = true;
            if (verbose) console.log('🎉 Database initialization completed successfully!');

            return {
                success: true,
                status: this.status,
                message: 'Database initialized successfully'
            };

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    /**
     * Connect to PostgreSQL database
     */
    async connect() {
        try {
            this.pool = new Pool(this.config);
            
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
        } catch (error) {
            // If database doesn't exist, try to create it
            if (error.message.includes('does not exist')) {
                console.log(`📝 Database "${this.config.database}" does not exist. Attempting to create it...`);
                await this.createDatabase();
                
                // Try connecting again
                this.pool = new Pool(this.config);
                const client = await this.pool.connect();
                await client.query('SELECT NOW()');
                client.release();
                console.log(`✅ Successfully created and connected to database "${this.config.database}"`);
            } else {
                throw new Error(`Database connection failed: ${error.message}`);
            }
        }
    }

    /**
     * Create the database if it doesn't exist
     */
    async createDatabase() {
        const { Pool } = require('pg');
        
        // Create a connection to the default 'postgres' database to create our target database
        const adminPool = new Pool({
            ...this.config,
            database: 'postgres' // Connect to default postgres database
        });

        try {
            const client = await adminPool.connect();
            
            // Check if database already exists
            const checkQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
            const checkResult = await client.query(checkQuery, [this.config.database]);
            
            if (checkResult.rows.length === 0) {
                // Database doesn't exist, create it
                const createQuery = `CREATE DATABASE "${this.config.database}"`;
                await client.query(createQuery);
                console.log(`✅ Database "${this.config.database}" created successfully`);
            } else {
                console.log(`ℹ️  Database "${this.config.database}" already exists`);
            }
            
            client.release();
        } catch (error) {
            throw new Error(`Failed to create database: ${error.message}`);
        } finally {
            await adminPool.end();
        }
    }

    /**
     * Create complete database schema
     */
    async createSchema() {
        try {
            // Check if main tables already exist
            const tableCheck = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('maps', 'creatures', 'regions')
            `);
            
            if (tableCheck.rows.length >= 3) {
                this.logger.info('Main tables already exist, skipping schema creation');
                
                // Ensure system_config table exists for version tracking
                await this.pool.query(`
                    CREATE TABLE IF NOT EXISTS system_config (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        config_key VARCHAR(100) UNIQUE NOT NULL,
                        config_value TEXT,
                        description TEXT,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    INSERT INTO system_config (config_key, config_value, description) 
                    VALUES ('schema_version', '3.1.0', 'Database schema version') 
                    ON CONFLICT (config_key) DO UPDATE SET 
                        config_value = EXCLUDED.config_value,
                        last_updated = CURRENT_TIMESTAMP;
                `);
                
                return;
            }
            
            const schemaPath = path.join(__dirname, 'schema', 'complete_schema.sql');
            const schemaSql = await fs.readFile(schemaPath, 'utf8');
            
            await this.pool.query(schemaSql);
            
            // Apply interactive maps migration
            const migrationPath = path.join(__dirname, 'migrations', '004_interactive_maps.sql');
            try {
                const migrationSql = await fs.readFile(migrationPath, 'utf8');
                await this.pool.query(migrationSql);
                this.logger.info('Interactive maps migration applied successfully');
            } catch (migrationError) {
                this.logger.warn('Interactive maps migration failed or already applied:', migrationError.message);
            }
            
            // Update schema version
            await this.pool.query(`
                UPDATE system_config 
                SET config_value = $1, last_updated = CURRENT_TIMESTAMP
                WHERE config_key = 'schema_version'
            `, ['3.1.0']);

        } catch (error) {
            throw new Error(`Schema creation failed: ${error.message}`);
        }
    }

    /**
     * Drop existing schema (for clean reinstall)
     */
    async dropSchema() {
        try {
            // Drop all tables in correct order to handle foreign keys
            const dropQueries = [
                'DROP MATERIALIZED VIEW IF EXISTS search_index CASCADE',
                'DROP TABLE IF EXISTS data_sync_log CASCADE',
                'DROP TABLE IF EXISTS system_config CASCADE',
                'DROP TABLE IF EXISTS user_collections CASCADE',
                'DROP TABLE IF EXISTS boss_encounters CASCADE',
                'DROP TABLE IF EXISTS caves CASCADE',
                'DROP TABLE IF EXISTS breeding_data CASCADE',
                'DROP TABLE IF EXISTS taming_data CASCADE',
                'DROP TABLE IF EXISTS resource_spawns CASCADE',
                'DROP TABLE IF EXISTS resources CASCADE',
                'DROP TABLE IF EXISTS creature_spawns CASCADE',
                'DROP TABLE IF EXISTS map_regions CASCADE',
                'DROP TABLE IF EXISTS creatures CASCADE',
                'DROP TABLE IF EXISTS maps CASCADE',
                'DROP TYPE IF EXISTS resource_rarity CASCADE',
                'DROP TYPE IF EXISTS map_type CASCADE',
                'DROP TYPE IF EXISTS taming_method CASCADE',
                'DROP TYPE IF EXISTS creature_size CASCADE',
                'DROP TYPE IF EXISTS creature_temperament CASCADE'
            ];

            for (const query of dropQueries) {
                await this.pool.query(query);
            }

        } catch (error) {
            // Non-critical error if tables don't exist
            console.warn(`Schema drop warning: ${error.message}`);
        }
    }

    /**
     * Check if database already contains data
     */
    async checkExistingData() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM maps) as map_count,
                    (SELECT COUNT(*) FROM creatures) as creature_count,
                    (SELECT COUNT(*) FROM resources) as resource_count
            `);

            const { map_count, creature_count, resource_count } = result.rows[0];
            return map_count > 0 || creature_count > 0 || resource_count > 0;

        } catch (error) {
            // If query fails, assume no data exists
            return false;
        }
    }

    /**
     * Populate database with real ARK Wiki and Dododex data
     */
    async populateWithRealData(verbose = true) {
        try {
            // Track sync start
            const syncId = await this.logSyncStart('combined', 'full');

            let totalProcessed = 0;
            let totalUpdated = 0;
            let totalFailed = 0;

            // Step 1: Initialize maps data
            if (verbose) console.log('📍 Initializing maps data...');
            const mapsResult = await this.initializeMapsData();
            totalProcessed += mapsResult.processed;
            totalUpdated += mapsResult.updated;

            // Step 2: Fetch and populate Wiki data
            if (verbose) console.log('📚 Fetching ARK Wiki data...');
            const wikiResult = await this.populateWikiData();
            totalProcessed += wikiResult.processed;
            totalUpdated += wikiResult.updated;
            totalFailed += wikiResult.failed;
            this.status.wikiData = true;

            // Step 3: Fetch and populate Dododex data
            if (verbose) console.log('🦕 Fetching Dododex data...');
            const dododexResult = await this.populateDododexData();
            totalProcessed += dododexResult.processed;
            totalUpdated += dododexResult.updated;
            totalFailed += dododexResult.failed;
            this.status.dododexData = true;

            // Step 4: Cross-reference and enhance data
            if (verbose) console.log('🔗 Cross-referencing data sources...');
            await this.crossReferenceData();

            // Log completion
            await this.logSyncCompletion(syncId, 'completed', totalProcessed, totalUpdated, totalFailed);

            return {
                processed: totalProcessed,
                updated: totalUpdated,
                failed: totalFailed
            };

        } catch (error) {
            console.error('Data population failed:', error);
            throw error;
        }
    }

    /**
     * Initialize core maps data
     */
    async initializeMapsData() {
        const officialMaps = [
            {
                name: 'The Island',
                slug: 'the-island',
                description: 'The original ARK map featuring diverse biomes and all core gameplay elements.',
                map_type: 'official',
                size_km: 36.0,
                release_date: '2017-08-29',
                is_official: true,
                is_free: true
            },
            {
                name: 'The Center',
                slug: 'the-center',
                description: 'A massive map with floating islands and unique underground areas.',
                map_type: 'official',
                size_km: 70.0,
                release_date: '2016-05-17',
                is_official: true,
                is_free: true
            },
            {
                name: 'Scorched Earth',
                slug: 'scorched-earth',
                description: 'A desert wasteland with extreme weather and unique creatures.',
                map_type: 'dlc',
                size_km: 36.0,
                release_date: '2016-09-01',
                is_official: true,
                is_free: false
            },
            {
                name: 'Ragnarok',
                slug: 'ragnarok',
                description: 'A Norse-themed map combining elements from multiple official maps.',
                map_type: 'official',
                size_km: 144.0,
                release_date: '2017-06-12',
                is_official: true,
                is_free: true
            },
            {
                name: 'Aberration',
                slug: 'aberration',
                description: 'An underground damaged ARK with radiation zones and bioluminescent creatures.',
                map_type: 'dlc',
                size_km: 36.0,
                release_date: '2017-12-12',
                is_official: true,
                is_free: false
            },
            {
                name: 'Extinction',
                slug: 'extinction',
                description: 'A post-apocalyptic Earth with corrupted creatures and mechanical beings.',
                map_type: 'dlc',
                size_km: 36.0,
                release_date: '2018-11-06',
                is_official: true,
                is_free: false
            },
            {
                name: 'Valguero',
                slug: 'valguero',
                description: 'A lush map featuring an underground realm and diverse landscapes.',
                map_type: 'official',
                size_km: 81.0,
                release_date: '2019-06-18',
                is_official: true,
                is_free: true
            },
            {
                name: 'Genesis Part 1',
                slug: 'genesis-1',
                description: 'A simulation-based map with unique biomes and mission system.',
                map_type: 'dlc',
                size_km: 36.0,
                release_date: '2020-02-25',
                is_official: true,
                is_free: false
            },
            {
                name: 'Crystal Isles',
                slug: 'crystal-isles',
                description: 'A beautiful map with crystal formations and unique creatures.',
                map_type: 'official',
                size_km: 150.0,
                release_date: '2020-06-11',
                is_official: true,
                is_free: true
            },
            {
                name: 'Genesis Part 2',
                slug: 'genesis-2',
                description: 'A space-themed map featuring a massive starship environment.',
                map_type: 'dlc',
                size_km: 36.0,
                release_date: '2021-06-03',
                is_official: true,
                is_free: false
            },
            {
                name: 'Lost Island',
                slug: 'lost-island',
                description: 'A massive tropical map with unique creature variants.',
                map_type: 'official',
                size_km: 150.0,
                release_date: '2021-12-14',
                is_official: true,
                is_free: true
            },
            {
                name: 'Fjordur',
                slug: 'fjordur',
                description: 'A Norse-inspired map with multiple realms and mythical creatures.',
                map_type: 'official',
                size_km: 140.0,
                release_date: '2022-06-12',
                is_official: true,
                is_free: true
            }
        ];

        let processed = 0;
        let updated = 0;

        for (const mapData of officialMaps) {
            try {
                const result = await this.pool.query(`
                    INSERT INTO maps (name, slug, description, map_type, size_km, release_date, is_official, is_free)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (slug) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        map_type = EXCLUDED.map_type,
                        size_km = EXCLUDED.size_km,
                        release_date = EXCLUDED.release_date,
                        is_official = EXCLUDED.is_official,
                        is_free = EXCLUDED.is_free,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [
                    mapData.name, mapData.slug, mapData.description, mapData.map_type,
                    mapData.size_km, mapData.release_date, mapData.is_official, mapData.is_free
                ]);

                processed++;
                if (result.rows.length > 0) updated++;

            } catch (error) {
                console.error(`Failed to insert map ${mapData.name}:`, error.message);
            }
        }

        return { processed, updated };
    }

    /**
     * Populate with ARK Wiki data
     */
    async populateWikiData() {
        let processed = 0;
        let updated = 0;
        let failed = 0;

        try {
            // Fetch creatures from Wiki
            const creatures = await this.wikiService.fetchAllCreatures();
            
            for (const creature of creatures) {
                try {
                    const result = await this.pool.query(`
                        INSERT INTO creatures (
                            name, slug, display_name, description, temperament, size,
                            taming_method, is_tameable, is_rideable, is_breedable,
                            base_health, base_stamina, base_oxygen, base_food,
                            base_weight, base_damage, base_movement_speed,
                            wiki_url, search_tags, biomes
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                        ON CONFLICT (slug) DO UPDATE SET
                            name = EXCLUDED.name,
                            display_name = EXCLUDED.display_name,
                            description = EXCLUDED.description,
                            temperament = EXCLUDED.temperament,
                            size = EXCLUDED.size,
                            taming_method = EXCLUDED.taming_method,
                            is_tameable = EXCLUDED.is_tameable,
                            is_rideable = EXCLUDED.is_rideable,
                            is_breedable = EXCLUDED.is_breedable,
                            base_health = EXCLUDED.base_health,
                            base_stamina = EXCLUDED.base_stamina,
                            base_oxygen = EXCLUDED.base_oxygen,
                            base_food = EXCLUDED.base_food,
                            base_weight = EXCLUDED.base_weight,
                            base_damage = EXCLUDED.base_damage,
                            base_movement_speed = EXCLUDED.base_movement_speed,
                            wiki_url = EXCLUDED.wiki_url,
                            search_tags = EXCLUDED.search_tags,
                            biomes = EXCLUDED.biomes,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING id
                    `, [
                        creature.name, creature.slug, creature.displayName, creature.description,
                        creature.temperament, creature.size, creature.tamingMethod,
                        creature.isTameable, creature.isRideable, creature.isBreedable,
                        creature.stats?.health, creature.stats?.stamina, creature.stats?.oxygen,
                        creature.stats?.food, creature.stats?.weight, creature.stats?.damage,
                        creature.stats?.movementSpeed, creature.wikiUrl, creature.searchTags,
                        creature.biomes
                    ]);

                    processed++;
                    if (result.rows.length > 0) updated++;

                } catch (error) {
                    console.error(`Failed to insert creature ${creature.name}:`, error.message);
                    failed++;
                }
            }

        } catch (error) {
            console.error('Wiki data fetch failed:', error.message);
            throw error;
        }

        return { processed, updated, failed };
    }

    /**
     * Populate with Dododex data
     */
    async populateDododexData() {
        let processed = 0;
        let updated = 0;
        let failed = 0;

        try {
            // Fetch taming data from Dododex
            const tamingData = await this.dododexService.fetchAllTamingData();
            
            for (const data of tamingData) {
                try {
                    // First ensure creature exists or create it
                    const creatureResult = await this.pool.query(`
                        INSERT INTO creatures (name, slug, dododex_id)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (slug) DO UPDATE SET
                            dododex_id = EXCLUDED.dododex_id,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING id
                    `, [data.name, data.slug, data.dododexId]);

                    const creatureId = creatureResult.rows[0].id;

                    // Insert taming data
                    await this.pool.query(`
                        INSERT INTO taming_data (
                            creature_id, taming_method, unconscious_time,
                            taming_effectiveness_max, preferred_foods, kibble_type,
                            torpor_depletion_rate, torpor_needed, feeding_interval,
                            special_requirements, taming_notes
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (creature_id) DO UPDATE SET
                            taming_method = EXCLUDED.taming_method,
                            unconscious_time = EXCLUDED.unconscious_time,
                            taming_effectiveness_max = EXCLUDED.taming_effectiveness_max,
                            preferred_foods = EXCLUDED.preferred_foods,
                            kibble_type = EXCLUDED.kibble_type,
                            torpor_depletion_rate = EXCLUDED.torpor_depletion_rate,
                            torpor_needed = EXCLUDED.torpor_needed,
                            feeding_interval = EXCLUDED.feeding_interval,
                            special_requirements = EXCLUDED.special_requirements,
                            taming_notes = EXCLUDED.taming_notes,
                            updated_at = CURRENT_TIMESTAMP
                    `, [
                        creatureId, data.tamingMethod, data.unconsciousTime,
                        data.tamingEffectiveness, JSON.stringify(data.preferredFoods),
                        data.kibbleType, data.torportDepletion, data.torportNeeded,
                        data.feedingInterval, data.specialRequirements, data.notes
                    ]);

                    processed++;
                    updated++;

                } catch (error) {
                    console.error(`Failed to insert taming data for ${data.name}:`, error.message);
                    failed++;
                }
            }

        } catch (error) {
            console.error('Dododex data fetch failed:', error.message);
            throw error;
        }

        return { processed, updated, failed };
    }

    /**
     * Cross-reference data from multiple sources
     */
    async crossReferenceData() {
        try {
            // Update creatures with additional metadata from cross-referencing
            await this.pool.query(`
                UPDATE creatures 
                SET search_tags = ARRAY[
                    LOWER(name),
                    CASE WHEN temperament IS NOT NULL THEN LOWER(temperament::text) END,
                    CASE WHEN is_tameable THEN 'tameable' END,
                    CASE WHEN is_rideable THEN 'rideable' END,
                    CASE WHEN is_breedable THEN 'breedable' END
                ]::text[]
                WHERE search_tags IS NULL OR array_length(search_tags, 1) IS NULL
            `);

            // Update system config with sync timestamps
            await this.pool.query(`
                UPDATE system_config 
                SET config_value = CURRENT_TIMESTAMP::text, last_updated = CURRENT_TIMESTAMP
                WHERE config_key IN ('last_wiki_sync', 'last_dododex_sync')
            `);

        } catch (error) {
            console.error('Cross-reference failed:', error.message);
        }
    }

    /**
     * Refresh materialized views and search indexes
     */
    async refreshSearchIndexes() {
        try {
            // Check if search_index exists first
            const result = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'search_index'
                );
            `);
            
            if (result.rows[0].exists) {
                await this.pool.query('REFRESH MATERIALIZED VIEW search_index');
            } else {
                // Create a simple search index based on current schema
                await this.createSearchIndex();
            }
        } catch (error) {
            this.logger.warn('Search index refresh failed:', error.message);
        }
    }

    /**
     * Create search index materialized view
     */
    async createSearchIndex() {
        try {
            await this.pool.query(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS search_index AS
                SELECT 
                    'creature' as entity_type,
                    c.id as entity_id,
                    c.name,
                    c.slug,
                    COALESCE(c.description, '') as description,
                    '' as tags,
                    to_tsvector('english', 
                        c.name || ' ' || 
                        COALESCE(c.description, '')
                    ) as search_vector,
                    jsonb_build_object(
                        'temperament', c.temperament,
                        'tameable', COALESCE(c.is_tameable, c.tameable, false),
                        'rideable', COALESCE(c.is_rideable, c.rideable, false)
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
                        'type', COALESCE(m.map_type, m.type, 'official')
                    ) as metadata
                FROM maps m;
                
                CREATE INDEX IF NOT EXISTS idx_search_index_vector ON search_index USING gin(search_vector);
                CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(entity_type);
                CREATE INDEX IF NOT EXISTS idx_search_index_slug ON search_index(slug);
            `);
            
            this.logger.info('Search index created successfully');
        } catch (error) {
            this.logger.warn('Failed to create search index:', error.message);
        }
    }

    /**
     * Log sync operation start
     */
    async logSyncStart(sourceName, syncType) {
        try {
            const result = await this.pool.query(`
                INSERT INTO data_sync_log (source_name, sync_type, status)
                VALUES ($1, $2, 'running')
                RETURNING id
            `, [sourceName, syncType]);

            return result.rows[0].id;
        } catch (error) {
            console.error('Failed to log sync start:', error.message);
            return null;
        }
    }

    /**
     * Log sync operation completion
     */
    async logSyncCompletion(syncId, status, processed = 0, updated = 0, failed = 0, errorDetails = null) {
        if (!syncId) return;

        try {
            await this.pool.query(`
                UPDATE data_sync_log 
                SET status = $1, records_processed = $2, records_updated = $3, 
                    records_failed = $4, error_details = $5, completed_at = CURRENT_TIMESTAMP,
                    duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))
                WHERE id = $6
            `, [status, processed, updated, failed, errorDetails ? JSON.stringify(errorDetails) : null, syncId]);

        } catch (error) {
            console.error('Failed to log sync completion:', error.message);
        }
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return this.status;
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    /**
     * Get the database connection pool
     */
    getDb() {
        return this.pool;
    }

    /**
     * Health check for database
     */
    async healthCheck() {
        try {
            if (!this.pool) {
                await this.connect();
            }

            // Check schema version
            const schemaResult = await this.pool.query(`
                SELECT config_value FROM system_config WHERE config_key = 'schema_version'
            `);

            // Check data counts
            const countResult = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM maps) as maps,
                    (SELECT COUNT(*) FROM creatures) as creatures,
                    (SELECT COUNT(*) FROM taming_data) as taming_data
            `);

            const counts = countResult.rows[0];
            const schemaVersion = schemaResult.rows[0]?.config_value || 'unknown';

            return {
                healthy: true,
                schemaVersion,
                counts,
                status: this.status
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                status: this.status
            };
        }
    }
}

module.exports = DatabaseInitializer;
