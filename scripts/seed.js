#!/usr/bin/env node
/**
 * Database Seeding Script
 * Populates database with initial/sample data
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DatabaseSeeder {
  constructor() {
    // Build connection config
    let connectionConfig;
    
    if (process.env.DATABASE_URL) {
      connectionConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    } else {
      // Fallback to individual environment variables
      connectionConfig = {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'asa_maps',
        ssl: false
      };
    }
    
    this.pool = new Pool(connectionConfig);
  }

  async seedDatabase() {
    try {
      console.log('🌱 Starting database seeding...');
      
      // Run sample data seed
      const seedPath = path.join(__dirname, '../src/database/seeds/simple_data.sql');
      
      if (fs.existsSync(seedPath)) {
        const seedSQL = fs.readFileSync(seedPath, 'utf8');
        await this.pool.query(seedSQL);
        console.log('✅ Sample data seeded successfully');
      } else {
        console.log('⚠️  No seed file found at:', seedPath);
      }

      // Run data population service
      const DataPopulationService = require('../src/backend/services/DataPopulationService');
      const dataService = new DataPopulationService(this.pool);
      
      console.log('🔄 Populating with official data...');
      
      // Populate maps if they don't exist
      const mapCount = await this.pool.query('SELECT COUNT(*) FROM maps');
      if (parseInt(mapCount.rows[0].count) === 0) {
        await dataService.populateMaps();
        console.log('✅ Maps populated');
      } else {
        console.log('⏭️  Maps already exist, skipping');
      }

      // Populate creatures if they don't exist  
      const creatureCount = await this.pool.query('SELECT COUNT(*) FROM creatures');
      if (parseInt(creatureCount.rows[0].count) < 10) {
        await dataService.populateCreatures();
        console.log('✅ Creatures populated');
      } else {
        console.log('⏭️  Creatures already exist, skipping');
      }

      console.log('🎉 Database seeding completed successfully');
      
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      await this.seedDatabase();
    } catch (error) {
      console.error('❌ Database seeding failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.run();
}

module.exports = DatabaseSeeder;
