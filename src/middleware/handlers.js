const config = require('../config');

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handling middleware
const errorHandler = (error, req, res, _next) => {
  console.error('API Error:', error);

  // Database constraint errors
  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      details: config.server.environment === 'development' ? error.detail : undefined
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Invalid reference to related resource',
      details: config.server.environment === 'development' ? error.detail : undefined
    });
  }

  if (error.code === '23502') { // PostgreSQL not null violation
    return res.status(400).json({
      success: false,
      error: 'Missing required field',
      details: config.server.environment === 'development' ? error.detail : undefined
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details
    });
  }

  // Default error response
  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json({
    success: false,
    error: config.server.environment === 'production'
      ? 'Internal server error'
      : error.message,
    ...(config.server.environment === 'development' && { 
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
    available_endpoints: {
      core: [
        'GET /',
        'GET /health'
      ],
      maps: [
        'GET /api/maps',
        'GET /api/maps/:slug',
        'GET /api/maps/:slug/regions',
        'GET /api/maps/:slug/caves',
        'GET /api/maps/:slug/resources',
        'GET /api/maps/:slug/obelisks',
        'GET /api/maps/:slug/supply-drops',
        'GET /api/maps/:slug/base-spots'
      ],
      creatures: [
        'GET /api/creatures',
        'GET /api/creatures/:id'
      ],
      other: [
        'GET /api/regions/:id',
        'GET /api/search',
        'POST /api/taming/calculate',
        'POST /api/admin/populate'
      ]
    }
  });
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return next(validationError);
    }
    next();
  };
};

// Database transaction middleware
const withTransaction = (fn) => {
  return asyncHandler(async(req, res, next) => {
    const { db } = req.app.locals;
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      req.dbClient = client;
      await fn(req, res, next);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
};

// Graceful shutdown handler
const gracefulShutdown = (server, db) => {
  const shutdown = (signal) => {
    console.log(`🛑 ${signal} received, shutting down gracefully`);
    
    if (server) {
      server.close(() => {
        console.log('💻 Server closed');
        if (db) {
          db.end(() => {
            console.log('🔌 Database connections closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Database connection test
const testDatabaseConnection = async(db) => {
  try {
    const result = await db.query('SELECT NOW() as timestamp, version() as version');
    console.log('✅ Database connected successfully');
    
    if (config.server.environment === 'development') {
      console.log(`📅 Database time: ${result.rows[0].timestamp}`);
    }
    
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }
};

// Health check helper
const performHealthCheck = async(db) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.server.version,
    environment: config.server.environment,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: false,
      latency: null
    }
  };

  try {
    const start = Date.now();
    await db.query('SELECT 1');
    health.database.connected = true;
    health.database.latency = Date.now() - start;
  } catch (error) {
    health.status = 'unhealthy';
    health.database.error = error.message;
  }

  return health;
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  validateRequest,
  withTransaction,
  gracefulShutdown,
  testDatabaseConnection,
  performHealthCheck
};
