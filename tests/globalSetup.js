const { Pool } = require('pg');

module.exports = async() => {
  console.log('Setting up test environment...');

  // Set up test database if needed
  if (process.env.TEST_DATABASE_URL) {
    try {
      const testDb = new Pool({
        connectionString: process.env.TEST_DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Clean test database
      await testDb.query('DROP SCHEMA IF EXISTS test CASCADE');
      await testDb.query('CREATE SCHEMA IF NOT EXISTS test');

      console.log('Test database initialized');
      await testDb.end();
    } catch (error) {
      console.warn('Test database setup failed:', error.message);
    }
  }

  // Set global test variables
  global.__TEST_START_TIME__ = Date.now();
};
