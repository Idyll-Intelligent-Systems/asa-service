require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    version: '2.0.0-enhanced',
    environment: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    connectionString: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000
  },

  // Rate limiting configuration
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // CORS configuration
  cors: {
    origins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true
  },

  // API configuration
  api: {
    port: process.env.PORT || 3000,
    maxJsonSize: '10mb',
    maxUrlEncodedSize: '10mb',
    defaultPageSize: 20,
    maxPageSize: 100,
    searchMinLength: 2
  },

  // External services
  services: {
    arkWiki: {
      baseUrl: 'https://ark.wiki.gg',
      timeout: 30000,
      retries: 3
    },
    dododex: {
      baseUrl: 'https://www.dododex.com',
      timeout: 30000,
      retries: 3
    }
  },

  // Security
  security: {
    trustProxy: process.env.TRUST_PROXY === 'true',
    enableHelmet: true,
    enableRateLimit: true
  },

  // Test configuration
  test: {
    databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://username:password@localhost:5432/asa_maps_test',
    timeout: 30000,
    verbose: process.env.TEST_VERBOSE === 'true'
  }
};

module.exports = config;
