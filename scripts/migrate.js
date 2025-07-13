#!/usr/bin/env node
/**
 * Database Migration Script
 * Applies database migrations in order
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class MigrationRunner {
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

  async getMigrationStatus() {
    try {
      const result = await this.pool.query(`
        SELECT value FROM system_status WHERE key LIKE 'migration_%' ORDER BY key
      `);
      return result.rows.map(row => row.value);
    } catch (error) {
      // If system_status table doesn't exist, no migrations have been run
      return [];
    }
  }

  async runMigration(migrationFile) {
    const migrationPath = path.join(__dirname, '../src/database/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    console.log(`Running migration: ${migrationFile}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log(`✅ Migration completed: ${migrationFile}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async run() {
    try {
      console.log('🔧 Starting database migration...');
      
      // Get list of migration files
      const migrationsDir = path.join(__dirname, '../src/database/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('📭 No migration files found');
        return;
      }

      // Get current migration status
      const completedMigrations = await this.getMigrationStatus();
      
      // Run pending migrations
      let migrationsRun = 0;
      for (const migrationFile of migrationFiles) {
        const migrationKey = migrationFile.replace('.sql', '');
        
        if (!completedMigrations.some(m => m.includes(migrationKey))) {
          await this.runMigration(migrationFile);
          migrationsRun++;
        } else {
          console.log(`⏭️  Skipping completed migration: ${migrationFile}`);
        }
      }

      if (migrationsRun === 0) {
        console.log('✅ Database is up to date');
      } else {
        console.log(`✅ Applied ${migrationsRun} migration(s)`);
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.run();
}

module.exports = MigrationRunner;
