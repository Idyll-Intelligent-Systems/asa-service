// Test script for the enhanced logger
require('dotenv').config({ path: '.env.development' });
const logger = require('./src/utils/logger');

console.log('Testing ASA Service Logger...\n');

logger.startup('ASA Service starting up...');
logger.info('This is an info message');
logger.debug('This is a debug message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.success('This is a success message');
logger.database('Database operation completed');
logger.api('API request processed');
logger.performance('Operation took 150ms');
logger.security('Authentication successful');

// Test with metadata
logger.info('Database connection established', {
    host: 'localhost',
    port: 5432,
    database: 'asa_service'
});

logger.service('WikiService', 'scrape', 2500, true);
logger.service('DododexService', 'fetch', 1200, false);

console.log('\n✅ Logger test completed! Check logs/app.log for file output.');
