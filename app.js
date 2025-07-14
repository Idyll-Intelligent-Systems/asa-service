/**
 * ASA Service Application Entry Point
 * Enhanced startup with database initialization and real data integration
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const DatabaseInitializer = require('./src/database/DatabaseInitializer');
const logger = require('./src/utils/logger');

// Import routes
const creatureRoutes = require('./src/routes/creatures');
const mapRoutes = require('./src/routes/maps');
const searchRoutes = require('./src/routes/search');
const tamingRoutes = require('./src/routes/taming');
const healthRoutes = require('./src/routes/health');
const adminRoutes = require('./src/routes/admin');
const regionRoutes = require('./src/routes/regions');
const interactiveMapsRoutes = require('./src/routes/interactive-maps');

class ASAServiceApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.dbInitializer = null;
        this.isReady = false;
    }

    /**
     * Initialize the complete application
     */
    async initialize() {
        const startTime = Date.now();
        
        try {
            logger.startup('Starting ASA Service application...');
            logger.info(`Environment: ${process.env.NODE_ENV || 'production'}`);
            logger.info(`Port: ${this.port}`);
            logger.info(`Skip Database: ${process.env.SKIP_DATABASE || 'false'}`);

            // Setup middleware
            await this.setupMiddleware();
            
            // Initialize database
            await this.initializeDatabase();
            
            // Setup routes
            this.setupRoutes();
            
            // Setup error handlers
            this.setupErrorHandlers();
            
            this.isReady = true;
            
            const duration = Date.now() - startTime;
            logger.success(`Application initialized successfully in ${duration}ms`);
            
            return this.app;
            
        } catch (error) {
            logger.error('Application initialization failed', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * Setup Express middleware
     */
    async setupMiddleware() {
        logger.info('Setting up middleware...');
        
        // Request logging middleware
        this.app.use(logger.middleware());
        
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Limit each IP to 1000 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
            skip: (req) => {
                // Skip rate limiting for health checks
                return req.path === '/api/health';
            }
        });
        
        if (process.env.ENABLE_RATE_LIMITING !== 'false') {
            this.app.use(limiter);
            logger.info('Rate limiting enabled');
        } else {
            logger.warn('Rate limiting disabled');
        }

        // Compression and CORS
        this.app.use(compression());
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            optionsSuccessStatus: 200 // For legacy browser support
        }));
        logger.info('CORS and compression middleware configured');

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Serve static files from src/frontend directory
        this.app.use(express.static('src/frontend'));
        logger.info('Static file serving configured');

        // Static frontend files
        this.app.use('/frontend', express.static(path.join(__dirname, 'src/frontend')));
        
        // Serve main frontend at /frontend/index.html
        this.app.get('/frontend', (req, res) => {
            res.sendFile(path.join(__dirname, 'src/frontend/index.html'));
        });

        // Remove old request logging middleware since we're using logger.middleware()
        logger.success('Middleware setup completed');

        // Health check middleware (always available)
        this.app.use('/health', (req, res, next) => {
            if (!this.isReady && req.path !== '/startup') {
                return res.status(503).json({
                    status: 'starting',
                    message: 'Service is initializing, please wait...'
                });
            }
            next();
        });
    }

    /**
     * Initialize database with real data
     */
    async initializeDatabase() {
        const dbStartTime = Date.now();
        
        // Import services
        const DataPopulationService = require('./src/services/DataPopulationService');
        const WikiDataService = require('./src/services/WikiDataService');
        const DodoDexService = require('./src/services/DodoDexService');

        // Check if database should be skipped
        if (process.env.SKIP_DATABASE === 'true') {
            logger.warn('Database initialization skipped (SKIP_DATABASE=true)');
            logger.info('Running in mock data mode for development');
            this.dbInitializer = null;
            
            // Initialize services without database for mock mode
            this.app.locals.wikiService = new WikiDataService();
            this.app.locals.dododexService = new DodoDexService();
            this.app.locals.dataService = new DataPopulationService(null); // null db for mock mode
            
            logger.success('Mock services initialized');
            return;
        }

        try {
            logger.database('Initializing PostgreSQL database...');
            
            this.dbInitializer = new DatabaseInitializer();
            
            // Check if we should skip data sync (for faster startup in development)
            const skipDataSync = process.env.SKIP_DATA_SYNC === 'true';
            const dropExisting = process.env.DROP_EXISTING_DB === 'true';
            
            logger.info('Database configuration', {
                dropExisting,
                skipDataSync,
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'asa_service'
            });
            
            await this.dbInitializer.initialize({
                dropExisting,
                skipDataSync,
                verbose: process.env.VERBOSE_LOGGING === 'true'
            });

            // Make database and services available to routes
            this.app.locals.db = this.dbInitializer.pool;
            this.app.locals.wikiService = new WikiDataService();
            this.app.locals.dododexService = new DodoDexService();
            this.app.locals.dataService = new DataPopulationService(this.dbInitializer.pool);

            const duration = Date.now() - dbStartTime;
            logger.success(`Database initialization completed in ${duration}ms`);

        } catch (error) {
            logger.error('Database initialization failed', { error: error.message, stack: error.stack });
            
            // In development or test mode, continue without database
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.SKIP_DATABASE === 'true') {
                logger.warn('Continuing without database connection - using mock mode');
                this.dbInitializer = null;
                
                // Explicitly set database connection to null for mock mode
                this.app.locals.db = null;
                
                // Initialize services without database for mock mode
                this.app.locals.wikiService = new WikiDataService();
                this.app.locals.dododexService = new DodoDexService();
                this.app.locals.dataService = new DataPopulationService(null); // null db for mock mode
                
                return;
            }
            
            throw error;
        }
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        logger.info('Setting up routes...');
        
        // Root endpoint with API information
        this.app.get('/', (req, res) => {
            res.json({
                name: 'ASA Service API',
                version: '3.0.0',
                description: 'Complete ARK: Survival Ascended Database API with Real Data Integration',
                status: 'operational',
                endpoints: {
                    health: '/api/health',
                    docs: '/api/docs',
                    creatures: '/api/creatures',
                    maps: '/api/maps',
                    search: '/api/search',
                    taming: '/api/taming',
                    regions: '/api/regions',
                    admin: '/api/admin'
                },
                frontend: '/frontend',
                timestamp: new Date().toISOString()
            });
        });

        // API Documentation endpoint
        this.app.get('/api/docs', (req, res) => {
            res.json({
                title: 'ASA Service API Documentation',
                name: 'ASA Service API Documentation',
                version: '3.0.0',
                description: 'Complete API documentation for ARK: Survival Ascended data service',
                baseUrl: `${req.protocol}://${req.get('host')}/api`,
                endpoints: {
                    creatures: {
                        path: '/creatures',
                        methods: ['GET'],
                        description: 'Get creature data with filtering and pagination',
                        parameters: ['page', 'limit', 'tameable', 'method']
                    },
                    maps: {
                        path: '/maps',
                        methods: ['GET'],
                        description: 'Get map data with filtering',
                        parameters: ['page', 'limit', 'type']
                    },
                    search: {
                        path: '/search',
                        methods: ['GET'],
                        description: 'Search across creatures and maps',
                        parameters: ['q', 'type', 'page', 'limit']
                    },
                    taming: {
                        path: '/taming',
                        methods: ['GET'],
                        description: 'Get taming information for creatures'
                    },
                    regions: {
                        path: '/regions',
                        methods: ['GET'],
                        description: 'Get region information for maps'
                    }
                }
            });
        });
        
        // API routes
        this.app.use('/api/creatures', creatureRoutes);
        this.app.use('/api/maps', mapRoutes);
        this.app.use('/api/health', healthRoutes);
        this.app.use('/api/admin', adminRoutes);
        this.app.use('/api/search', searchRoutes);
        this.app.use('/api/taming', tamingRoutes);
        this.app.use('/api/regions', regionRoutes);
        this.app.use('/api/interactive-maps', interactiveMapsRoutes);

        // Serve static frontend files
        this.app.use(express.static(path.join(__dirname, 'src', 'frontend')));

        // Catch-all for unknown routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                availableEndpoints: [
                    '/api/creatures',
                    '/api/maps', 
                    '/api/search',
                    '/api/taming',
                    '/api/regions',
                    '/api/health'
                ]
            });
        });
    }

    /**
     * Setup error handling middleware
     */
    setupErrorHandlers() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);

            // Don't leak error details in production
            const isProduction = process.env.NODE_ENV === 'production';
            
            res.status(error.status || 500).json({
                error: 'Internal Server Error',
                message: isProduction ? 'An error occurred' : error.message,
                ...(isProduction ? {} : { stack: error.stack })
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.gracefulShutdown();
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.gracefulShutdown();
        });

        // Handle termination signals
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            this.gracefulShutdown();
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            this.gracefulShutdown();
        });
    }

    /**
     * Start the HTTP server
     */
    async start() {
        try {
            await this.initialize();
            
            const server = this.app.listen(this.port, () => {
                logger.startup(`ASA Service API is running on port ${this.port}`);
                logger.api(`API Documentation: http://localhost:${this.port}/api/docs`);
                logger.api(`Health Check: http://localhost:${this.port}/api/health`);
                logger.api(`Frontend UI: http://localhost:${this.port}/`);
                
                if (process.env.NODE_ENV === 'development') {
                    logger.info('Development mode - enhanced logging and CORS enabled');
                    logger.info('Environment variables loaded from .env.development');
                }
                
                logger.success('🎉 ASA Service is ready to handle requests!');
            });

            return server;

        } catch (error) {
            logger.error('Failed to start ASA Service', { error: error.message, stack: error.stack });
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    async gracefulShutdown() {
        try {
            console.log('Shutting down gracefully...');
            
            if (this.dbInitializer) {
                await this.dbInitializer.close();
            }
            
            // Don't exit in test environment
            if (process.env.NODE_ENV !== 'test') {
                process.exit(0);
            }
        } catch (error) {
            console.error('Error during shutdown:', error);
            
            // Don't exit in test environment
            if (process.env.NODE_ENV !== 'test') {
                process.exit(1);
            }
        }
    }

    /**
     * Get application instance (for testing)
     */
    getApp() {
        return this.app;
    }
}

// Start the application if this file is run directly
if (require.main === module) {
    const app = new ASAServiceApp();
    app.start();
}

module.exports = ASAServiceApp;
//trigger restart
