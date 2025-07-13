const request = require('supertest');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Test configuration
const config = {
  database: {
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://username:password@localhost:5432/asa_maps_test',
    ssl: false
  },
  timeout: 30000
};

const { createMockPool } = require('../utils/mock-database');

class TestDatabase {
  constructor() {
    this.pool = null;
    this.isRealDatabase = false;
  }

  async connect() {
    try {
      this.pool = new Pool(config.database);
      await this.pool.query('SELECT NOW()');
      this.isRealDatabase = true;
      console.log('✅ Test database connected');
    } catch (error) {
      console.log('⚠️  Could not connect to PostgreSQL, using mock database');
      this.pool = createMockPool();
      this.isRealDatabase = false;
    }
  }

  async setupSchema() {
    if (this.isRealDatabase) {
      const schemaPath = path.join(__dirname, '../../src/database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await this.pool.query(schema);
        console.log('✅ Test schema created');
      }
    } else {
      console.log('📊 Mock database - schema setup skipped');
    }
  }

  async seedData() {
    if (this.isRealDatabase) {
      const seedPath = path.join(__dirname, '../../src/database/seeds/sample_data.sql');
      if (fs.existsSync(seedPath)) {
        const seedData = fs.readFileSync(seedPath, 'utf8');
        await this.pool.query(seedData);
        console.log('✅ Test data seeded');
      }
    } else {
      console.log('🌱 Mock database - seed data skipped');
    }
  }

  async cleanup() {
    if (this.pool) {
      if (this.isRealDatabase) {
        // Drop all tables for clean slate
        await this.pool.query(`
          DROP SCHEMA public CASCADE;
          CREATE SCHEMA public;
          GRANT ALL ON SCHEMA public TO public;
        `);
        console.log('✅ Test database cleaned');
      } else {
        if (this.pool.clearData) {
          this.pool.clearData();
        }
        console.log('🧹 Mock database cleared');
      }
    }
  }

  async disconnect() {
    if (this.pool) {
      if (this.isRealDatabase) {
        await this.pool.end();
      }
      console.log('✅ Test database disconnected');
    }
  }

  getPool() {
    return this.pool;
  }
}

class TestApp {
  constructor() {
    this.application = null;
  }

  async start() {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = config.database.connectionString;
    
    // Import and create application
    const ApplicationModule = require('../../src/backend/app');
    this.application = ApplicationModule;
    
    return this.application.getApp();
  }

  async stop() {
    if (this.application && typeof this.application.stop === 'function') {
      await this.application.stop();
    }
  }

  getApp() {
    return this.application ? this.application.getApp() : null;
  }
}

// Test utilities
const testUtils = {
  // Generate test data
  generateCreature: (overrides = {}) => ({
    name: 'Test Creature',
    slug: 'test-creature',
    temperament: 'neutral',
    diet: 'omnivore',
    taming_method: 'knockout',
    rideable: true,
    breedable: true,
    description: 'A test creature for integration testing',
    ...overrides
  }),

  generateMap: (overrides = {}) => ({
    name: 'Test Map',
    slug: 'test-map',
    type: 'official',
    official: true,
    expansion: false,
    description: 'A test map for integration testing',
    ...overrides
  }),

  generateRegion: (mapId, overrides = {}) => ({
    map_id: mapId,
    name: 'Test Region',
    category: 'safe',
    latitude: 50.0,
    longitude: 50.0,
    description: 'A test region for integration testing',
    danger_level: 1,
    ...overrides
  }),

  // API response validators
  validateApiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    if (expectedStatus < 400) {
      expect(response.body.success).toBe(true);
    }
  },

  validateCreatureResponse: (creature) => {
    expect(creature).toHaveProperty('id');
    expect(creature).toHaveProperty('name');
    expect(creature).toHaveProperty('slug');
    expect(creature).toHaveProperty('temperament');
    expect(creature).toHaveProperty('diet');
    expect(creature).toHaveProperty('taming_method');
  },

  validateMapResponse: (map) => {
    expect(map).toHaveProperty('id');
    expect(map).toHaveProperty('name');
    expect(map).toHaveProperty('slug');
    expect(map).toHaveProperty('type');
    expect(map).toHaveProperty('official');
  },

  validateRegionResponse: (region) => {
    expect(region).toHaveProperty('id');
    expect(region).toHaveProperty('name');
    expect(region).toHaveProperty('category');
    expect(region).toHaveProperty('latitude');
    expect(region).toHaveProperty('longitude');
  },

  // Database validators
  validateDatabaseConnection: async (pool) => {
    const result = await pool.query('SELECT NOW() as timestamp');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toHaveProperty('timestamp');
  },

  validateTableExists: async (pool, tableName) => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    expect(result.rows[0].exists).toBe(true);
  },

  validateDataIntegrity: async (pool) => {
    // Check foreign key constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);
    
    expect(constraints.rows.length).toBeGreaterThan(0);
  }
};

module.exports = {
  TestDatabase,
  TestApp,
  testUtils,
  config
};
