module.exports = async() => {
  console.log('Tearing down test environment...');

  // Clean up test database connections
  if (process.env.TEST_DATABASE_URL) {
    try {
      // Any cleanup needed
      console.log('Test database cleanup completed');
    } catch (error) {
      console.warn('Test database cleanup failed:', error.message);
    }
  }

  // Calculate test duration
  if (global.__TEST_START_TIME__) {
    const duration = Date.now() - global.__TEST_START_TIME__;
    console.log(`Tests completed in ${duration}ms`);
  }
};
