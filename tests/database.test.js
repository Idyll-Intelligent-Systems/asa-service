const { Pool } = require('pg');
const { createMockPool } = require('./utils/mock-database');

describe('Database Schema Tests', () => {
  let db;
  let isRealDatabase = false;

  beforeAll(async() => {
    // Try to connect to real database first
    if (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL) {
      try {
        const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
        db = new Pool({
          connectionString,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Test the connection
        await db.query('SELECT 1');
        isRealDatabase = true;
        console.log('✅ Using real PostgreSQL database for tests');
        
        // Run schema setup
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '..', 'src', 'database', 'schema.sql');

        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          await db.query(schema);
        }
      } catch (error) {
        console.log('⚠️  Could not connect to PostgreSQL, using mock database');
        db = createMockPool();
        isRealDatabase = false;
      }
    } else {
      console.log('📝 No database URL configured, using mock database');
      db = createMockPool();
      isRealDatabase = false;
    }
  });

  afterAll(async() => {
    if (db) {
      if (isRealDatabase) {
        await db.end();
      }
    }
  });

  beforeEach(async() => {
    if (!isRealDatabase && db.clearData) {
      db.clearData();
    }
  });

  beforeEach(() => {
    if (!process.env.TEST_DATABASE_URL) {
      return;
    }
  });

  describe('Maps Table', () => {
    test('should insert and retrieve maps', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      const mapData = {
        name: 'Test Island',
        slug: 'test_island',
        official: true,
        expansion: false,
        release_date: '2023-01-01',
        size_km: 100,
        description: 'A test map for unit testing'
      };

      await db.query(`
        INSERT INTO maps (name, slug, official, expansion, release_date, size_km, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [mapData.name, mapData.slug, mapData.official, mapData.expansion, mapData.release_date, mapData.size_km, mapData.description]);

      const result = await db.query('SELECT * FROM maps WHERE slug = $1', [mapData.slug]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe(mapData.name);
      expect(result.rows[0].official).toBe(mapData.official);
    });

    test('should enforce unique slug constraint', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      const mapData = {
        name: 'Duplicate Test',
        slug: 'duplicate_test',
        official: true,
        expansion: false,
        release_date: '2023-01-01',
        size_km: 100,
        description: 'Test map'
      };

      // Insert first map
      await db.query(`
        INSERT INTO maps (name, slug, official, expansion, release_date, size_km, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [mapData.name, mapData.slug, mapData.official, mapData.expansion, mapData.release_date, mapData.size_km, mapData.description]);

      // Try to insert duplicate slug
      await expect(
        db.query(`
          INSERT INTO maps (name, slug, official, expansion, release_date, size_km, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['Another Map', mapData.slug, true, false, '2023-01-02', 120, 'Another test map'])
      ).rejects.toThrow();
    });
  });

  describe('Creatures Table', () => {
    test('should insert and retrieve creatures', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      const creatureData = {
        name: 'Test Rex',
        slug: 'test_rex',
        image_url: 'https://example.com/rex.jpg',
        description: 'A test creature',
        tameable: true,
        taming_method: 'knockout'
      };

      await db.query(`
        INSERT INTO creatures (name, slug, image_url, description, tameable, taming_method)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [creatureData.name, creatureData.slug, creatureData.image_url, creatureData.description, creatureData.tameable, creatureData.taming_method]);

      const result = await db.query('SELECT * FROM creatures WHERE slug = $1', [creatureData.slug]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe(creatureData.name);
      expect(result.rows[0].tameable).toBe(creatureData.tameable);
    });
  });

  describe('Regions Table', () => {
    test('should link regions to maps', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Insert a test map first
      await db.query(`
        INSERT INTO maps (name, slug, official, expansion, release_date, size_km, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (slug) DO NOTHING
      `, ['Region Test Map', 'region_test_map', true, false, '2023-01-01', 100, 'Test map for regions']);

      const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', ['region_test_map']);
      const mapId = mapResult.rows[0].id;

      const regionData = {
        map_id: mapId,
        name: 'Test Region',
        category: 'forest',
        description: 'A test region',
        image_url: 'https://example.com/region.jpg'
      };

      await db.query(`
        INSERT INTO map_regions (map_id, name, category, description, image_url)
        VALUES ($1, $2, $3, $4, $5)
      `, [regionData.map_id, regionData.name, regionData.category, regionData.description, regionData.image_url]);

      const result = await db.query(`
        SELECT mr.*, m.name as map_name 
        FROM map_regions mr 
        JOIN maps m ON mr.map_id = m.id 
        WHERE mr.name = $1
      `, [regionData.name]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].category).toBe(regionData.category);
      expect(result.rows[0].map_name).toBe('Region Test Map');
    });
  });

  describe('Creature Stats Table', () => {
    test('should link stats to creatures', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Insert a test creature first
      await db.query(`
        INSERT INTO creatures (name, slug, description, tameable, taming_method)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (slug) DO NOTHING
      `, ['Stat Test Creature', 'stat_test_creature', 'Test creature for stats', true, 'knockout']);

      const creatureResult = await db.query('SELECT id FROM creatures WHERE slug = $1', ['stat_test_creature']);
      const creatureId = creatureResult.rows[0].id;

      const statData = {
        creature_id: creatureId,
        stat_name: 'health',
        base_value: 1000,
        per_level_wild: 200,
        per_level_tamed: 100
      };

      await db.query(`
        INSERT INTO creature_stats (creature_id, stat_name, base_value, per_level_wild, per_level_tamed)
        VALUES ($1, $2, $3, $4, $5)
      `, [statData.creature_id, statData.stat_name, statData.base_value, statData.per_level_wild, statData.per_level_tamed]);

      const result = await db.query(`
        SELECT cs.*, c.name as creature_name 
        FROM creature_stats cs 
        JOIN creatures c ON cs.creature_id = c.id 
        WHERE cs.stat_name = $1 AND c.slug = $2
      `, [statData.stat_name, 'stat_test_creature']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].base_value).toBe(statData.base_value);
      expect(result.rows[0].creature_name).toBe('Stat Test Creature');
    });
  });

  describe('Full Text Search', () => {
    test('should search creatures by name', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Insert test creatures
      const creatures = [
        { name: 'Tyrannosaurus Rex', slug: 'tyrannosaurus_rex', description: 'Large carnivore' },
        { name: 'Triceratops', slug: 'triceratops', description: 'Herbivore with three horns' },
        { name: 'Argentavis', slug: 'argentavis', description: 'Giant bird' }
      ];

      for (const creature of creatures) {
        await db.query(`
          INSERT INTO creatures (name, slug, description, tameable, taming_method)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (slug) DO NOTHING
        `, [creature.name, creature.slug, creature.description, true, 'knockout']);
      }

      // Test search for "rex"
      const searchResult = await db.query(`
        SELECT * FROM creatures 
        WHERE to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', $1)
      `, ['rex']);

      expect(searchResult.rows.length).toBeGreaterThan(0);
      expect(searchResult.rows.some(row => row.name.includes('Rex'))).toBe(true);
    });
  });

  describe('Foreign Key Constraints', () => {
    test('should prevent orphaned regions', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Try to insert region with non-existent map_id
      await expect(
        db.query(`
          INSERT INTO map_regions (map_id, name, category, description)
          VALUES ($1, $2, $3, $4)
        `, [99999, 'Orphan Region', 'test', 'This should fail'])
      ).rejects.toThrow();
    });

    test('should prevent orphaned creature stats', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Try to insert stats with non-existent creature_id
      await expect(
        db.query(`
          INSERT INTO creature_stats (creature_id, stat_name, base_value, per_level_wild, per_level_tamed)
          VALUES ($1, $2, $3, $4, $5)
        `, [99999, 'health', 1000, 200, 100])
      ).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    test('should handle null values appropriately', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Test creature with minimal required fields
      await db.query(`
        INSERT INTO creatures (name, slug)
        VALUES ($1, $2)
        ON CONFLICT (slug) DO NOTHING
      `, ['Minimal Creature', 'minimal_creature']);

      const result = await db.query('SELECT * FROM creatures WHERE slug = $1', ['minimal_creature']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].description).toBeNull();
      expect(result.rows[0].tameable).toBe(true); // Default value
    });

    test('should handle timestamps correctly', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      const beforeInsert = new Date();

      await db.query(`
        INSERT INTO creatures (name, slug, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (slug) DO NOTHING
      `, ['Timestamp Test', 'timestamp_test', 'Testing timestamps']);

      const result = await db.query('SELECT created_at, updated_at FROM creatures WHERE slug = $1', ['timestamp_test']);

      const afterInsert = new Date();

      expect(result.rows).toHaveLength(1);
      const createdAt = result.rows[0].created_at instanceof Date 
        ? result.rows[0].created_at 
        : new Date(result.rows[0].created_at);
      
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
      expect(result.rows[0].updated_at).toEqual(result.rows[0].created_at);
    });
  });

  describe('Index Performance', () => {
    test('should use indexes for common queries', async() => {
      if (!process.env.TEST_DATABASE_URL) return;

      // Test that slug index is being used
      const explainResult = await db.query('EXPLAIN (FORMAT JSON) SELECT * FROM creatures WHERE slug = $1', ['test_slug']);

      // The explain plan should show an index scan rather than a sequential scan
      const [planRow] = explainResult.rows;
      const [plan] = planRow['QUERY PLAN'];
      expect(plan.Plan['Node Type']).toContain('Index');
    });
  });
});
