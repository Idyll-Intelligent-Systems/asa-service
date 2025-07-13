const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const path = require('path');

// Configuration and services
const config = require('./config');
const DataPopulationService = require('./services/DataPopulationService');

// Middleware imports
const { corsMiddleware, rateLimitMiddleware } = require('./middleware/security');
const { errorHandler, notFoundHandler, gracefulShutdown, testDatabaseConnection } = require('./middleware/handlers');

// Route imports
const coreRoutes = require('./routes/core');
const mapsRoutes = require('./routes/maps');
const creaturesRoutes = require('./routes/creatures');
const regionsRoutes = require('./routes/regions');
const tamingRoutes = require('./routes/taming');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');

class Application {
  constructor() {
    this.app = express();
    this.server = null;
    this.db = null;
    this.dataService = null;
    
    this.initializeDatabase();
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  initializeDatabase() {
    this.db = new Pool(config.database);
  }

  initializeServices() {
    this.dataService = new DataPopulationService(this.db);
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // Body parsing middleware
    this.app.use(express.json({ limit: config.api.maxJsonSize }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.api.maxUrlEncodedSize 
    }));
    
    // CORS middleware
    this.app.use(corsMiddleware);
    
    // Rate limiting for API endpoints
    this.app.use('/api/', rateLimitMiddleware);

    // Serve static files from frontend
    this.app.use('/static', express.static(path.join(__dirname, '../frontend/public')));
    
    // Store database and services in app.locals for route access
    this.app.locals.db = this.db;
    this.app.locals.dataService = this.dataService;
  }

  setupRoutes() {
    // Mount API routes
    this.app.use('/', coreRoutes);
    this.app.use('/api/maps', mapsRoutes);
    this.app.use('/api/creatures', creaturesRoutes);
    this.app.use('/api/regions', regionsRoutes);
    this.app.use('/api/taming', tamingRoutes);
    this.app.use('/api/search', searchRoutes);
    this.app.use('/api/admin', adminRoutes);

    // Serve frontend
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
  }

  setupErrorHandling() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start() {
    const PORT = config.api.port;
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(PORT, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`🚀 ASA Service API running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`📖 API docs: http://localhost:${PORT}/`);
        console.log(`🌐 Frontend: http://localhost:${PORT}/`);

        // Test database connection
        try {
          await testDatabaseConnection(this.db);
          console.log('✅ Database connection verified');
        } catch (error) {
          console.error('❌ Database connection failed:', error.message);
        }

        // Set up graceful shutdown
        gracefulShutdown(this.server, this.db);

        resolve(this.server);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Server stopped');
          if (this.db) {
            this.db.end(() => {
              console.log('🔌 Database connections closed');
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getApp() {
    return this.app;
  }
}

// Create application instance
const application = new Application();

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  application.start().catch(console.error);
}

module.exports = application;
