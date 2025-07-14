# ASA Service

ARK: Survival Ascended complete database API with integrated frontend providing creatures, maps, taming calculator, regions, and search functionality.

## 🚀 Quick Start

### Development Setup (Windows)

**Automated Setup (Recommended):**
```powershell
# Run the PowerShell development setup script
.\run-dev.ps1
```

This will automatically:
- Check prerequisites (Node.js, PostgreSQL)
- Install dependencies
- Create and initialize PostgreSQL database with sample data
- Start the application with hot reload

**Manual Setup:**
```bash
# Install dependencies
npm install

# Start development server (mock mode)
npm run dev:mock

# Or start with database (requires PostgreSQL)
npm run dev
```

**Alternative (Batch Script):**
```cmd
# For users who prefer batch files
start-dev.bat
```

### Prerequisites
- **Node.js** v16+ - [Download](https://nodejs.org/)
- **PostgreSQL** v12+ - [Download](https://www.postgresql.org/download/windows/) (optional for mock mode)

### Production Setup
```bash
# Install production dependencies
npm install --production

# Start production server (with mock data)
npm start

# Or start with database (if PostgreSQL is available)
set DATABASE_URL=postgresql://user:password@localhost:5432/asa_service && npm start
```

### Access the Application
- **Frontend UI**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs  
- **Health Check**: http://localhost:3000/api/health

### Development Scripts
```bash
# Start development server with auto-reload
npm run dev

# Test all features quickly
npm run demo

# Check service health
npm run health
```

## 📁 Project Structure

```
asa-service/
├── src/
│   ├── routes/           # API route handlers
│   │   ├── creatures.js  # Creature data and filtering
│   │   ├── maps.js       # Map information and details
│   │   ├── search.js     # Cross-entity search functionality
│   │   ├── taming.js     # Taming calculator and methods
│   │   ├── regions.js    # Map regions and biomes
│   │   ├── health.js     # System health monitoring
│   │   └── admin.js      # Administrative endpoints
│   └── frontend/         # Static web interface
│       ├── index.html    # Main UI with tabs and search
│       ├── images/       # Map images and assets
│       └── favicon.ico   # Site favicon
├── tests/               # Test suites
│   ├── unit/           # Unit tests for components
│   ├── integration/    # API integration tests
│   └── e2e/           # End-to-end browser tests
├── app.js              # Main application server
├── package.json        # Dependencies and scripts
├── nodemon.json        # Development server configuration
├── README.md           # This documentation
└── .gitignore          # Git ignore rules
```

## 🔗 API Endpoints

### Core Endpoints
- `GET /` - Application information and status
- `GET /api/health` - Detailed service health check
- `GET /api/docs` - Complete API documentation

### Search & Discovery
- `GET /api/search?q=term` - Search across creatures, maps, and content
- `GET /api/search?q=term&type=creature` - Search creatures only
- `GET /api/search?q=term&type=map` - Search maps only

### Creatures
- `GET /api/creatures` - List all creatures with pagination
- `GET /api/creatures?tameable=true` - Filter tameable creatures
- `GET /api/creatures?page=1&limit=20` - Paginated results
- `GET /api/creatures/:slug` - Get specific creature details

### Maps
- `GET /api/maps` - List all available maps
- `GET /api/maps?type=official` - Filter by map type
- `GET /api/maps/:slug` - Get specific map information
- `GET /api/maps/:slug/creatures` - Creatures available on map

### Taming System
- `GET /api/taming` - List all tameable creatures
- `GET /api/taming/:slug` - Get taming info for specific creature
- `POST /api/taming/calculate` - Taming calculator (levels, food, time)

### Regions & Biomes
- `GET /api/regions` - List all map regions
- `GET /api/regions/:id` - Get specific region details
- `GET /api/regions?map=the-island` - Filter by map

### Administrative
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/refresh` - Refresh cached data

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-restart on changes)
npm start               # Start production server
npm run start:fresh     # Start with fresh database (drops existing)
npm run start:quick     # Start without data sync (faster startup)

# Testing
npm test               # Run all tests
npm run test:unit      # Run unit tests only
npm run test:integration # Run API integration tests
npm run test:e2e       # Run end-to-end browser tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report
npm run test:all       # Run complete test suite

# Code Quality
npm run lint          # Run ESLint code analysis
npm run lint:fix      # Fix ESLint issues automatically
npm run clean         # Clean up temporary files

# Utilities
npm run health        # Check if service is running
npm run docs          # Open API documentation
npm run docker:build  # Build Docker image
npm run docker:run    # Run in Docker container
```

### Development Environment

The application works in multiple modes:

#### 1. Mock Data Mode (Default)
```bash
# No database required - uses built-in mock data
npm run dev
```
- ✅ All features work with sample data
- ✅ Perfect for frontend development
- ✅ No setup required

#### 2. Database Mode
```bash
# With PostgreSQL database
set DATABASE_URL=postgresql://user:password@localhost:5432/asa_service
npm start
```
- ✅ Full data persistence
- ✅ Real wiki data integration
- ✅ Production-ready

#### 3. Quick Start Mode
```bash
# Skip data synchronization for faster startup
npm run start:quick
```
- ✅ Faster development cycles
- ✅ Uses cached data

### Environment Configuration

Create a `.env` file in the root directory (optional):

```env
# Database Configuration (optional)
DATABASE_URL=postgresql://postgres:password@localhost:5432/asa_service

# Server Configuration
PORT=3000
NODE_ENV=development

# Development Options
SKIP_DATABASE=true          # Use mock data instead of database
SKIP_DATA_SYNC=true         # Skip wiki data synchronization
DROP_EXISTING_DB=false      # Reset database on startup

# Security (for production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# External APIs (optional)
DODODEX_API_ENABLED=true    # Enable DodoDex integration
WIKI_UPDATE_INTERVAL=6      # Hours between wiki updates
```

## 🌐 Frontend Interface

### Modern UI Features
- **🎨 Modern Design**: Clean, responsive interface with ARK-themed styling
- **📱 Mobile-Friendly**: Works perfectly on desktop, tablet, and mobile
- **🔍 Advanced Search**: Real-time search across all content types
- **📊 Data Browser**: Browse creatures, maps, and regions with filtering
- **🧮 Taming Calculator**: Calculate taming requirements and times
- **⚡ Live Updates**: Real-time status and connection monitoring
- **🎯 Interactive Maps**: Visual map exploration (when available)

### UI Components
1. **Search Tab**: Universal search across all content
2. **Creatures Tab**: Browse and filter creature database
3. **Maps Tab**: Explore available ARK maps
4. **Taming Tab**: Interactive taming calculator
5. **Regions Tab**: Discover map regions and biomes

### Usage
```bash
# Start the application
npm run dev

# Open your browser to:
http://localhost:3000
```

## 🧪 Testing

The project includes comprehensive testing across all layers:

### Test Categories
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoint testing with mock data
- **E2E Tests**: Full application testing with browser automation
- **Performance Tests**: Load and stress testing

### Running Tests

```bash
# Quick test (recommended for development)
npm test

# Comprehensive testing
npm run test:all

# Specific test suites
npm run test:unit           # Fast unit tests
npm run test:integration    # API integration tests  
npm run test:e2e           # Browser automation tests

# Development testing
npm run test:watch         # Auto-run tests on file changes
npm run test:coverage      # Generate coverage reports
```

### Test Features
- ✅ **No Database Required**: Tests use mock data by default
- ✅ **Fast Execution**: Unit tests complete in seconds
- ✅ **CI/CD Ready**: Designed for automated testing pipelines
- ✅ **Browser Testing**: Real browser testing with Puppeteer
- ✅ **API Testing**: Complete endpoint coverage

## 🗃️ Database

### Schema Overview

The database supports comprehensive ARK: Survival Ascended data:

```sql
-- Core Tables
creatures          # All creatures with stats, behavior, and attributes
maps              # Official and modded maps with metadata  
map_regions       # Biomes and regions within maps
taming_methods    # Taming information and requirements
spawn_locations   # Creature spawn points and coordinates
resources         # Materials, items, and resource nodes

-- Relationship Tables
creature_spawns   # Many-to-many: creatures ↔ maps
map_resources     # Many-to-many: maps ↔ resources
region_creatures  # Many-to-many: regions ↔ creatures
```

### Database Modes

#### 1. Automatic Setup (Recommended)
```bash
# Database tables created automatically
npm start
```
- ✅ Auto-creates tables and indexes
- ✅ Handles schema migrations
- ✅ Populates with wiki data

#### 2. Manual Setup
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE asa_service;

-- Run initialization
\i src/database/schema/complete_schema.sql
```

#### 3. Mock Data Mode (Development)
```bash
# No database required
set SKIP_DATABASE=true
npm run dev
```
- ✅ Works immediately without setup
- ✅ Full feature testing with sample data

## 📚 API Documentation

### Response Format

All API responses follow a consistent structure:

```json
{
  "success": true,
  "data": {
    "results": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  },
  "message": "Using mock data - database not connected"
}
```

### Error Handling

Errors include detailed information for debugging:

```json
{
  "success": false,
  "error": "Search query parameter 'q' is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-07-14T00:00:00Z"
}
```

### Example API Calls

```bash
# Search for creatures
curl "http://localhost:3000/api/search?q=rex"

# Get all tameable creatures  
curl "http://localhost:3000/api/creatures?tameable=true"

# Get taming info for Rex
curl "http://localhost:3000/api/taming/rex"

# Get regions on The Island
curl "http://localhost:3000/api/regions?map=the-island"

# Calculate taming requirements
curl -X POST "http://localhost:3000/api/taming/calculate" \
  -H "Content-Type: application/json" \
  -d '{"creature_id": 1, "level": 50, "food": "Prime Meat"}'
```

### Rate Limiting & Security

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable origin restrictions
- **Helmet**: Security headers automatically applied
- **Compression**: Gzip compression for all responses

## 🚢 Deployment

### Quick Deployment (Recommended)

```bash
# 1. Clone and install
git clone https://github.com/Idyll-Intelligent-Systems/asa-service.git
cd asa-service
npm install

# 2. Start immediately (no database required)
npm start

# 3. Access at http://localhost:3000
```

### Docker Deployment

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Or use docker-compose
docker-compose up -d
```

### Production Deployment

```bash
# 1. Install production dependencies
npm install --production

# 2. Set environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@localhost:5432/asa_service

# 3. Start with process manager
npm start

# Or with PM2
pm2 start app.js --name "asa-service"
```

### Environment-Specific Deployment

#### Development
```bash
set NODE_ENV=development
set SKIP_DATABASE=true
npm run dev
```

#### Staging  
```bash
set NODE_ENV=staging
set DATABASE_URL=postgresql://user:pass@staging-db:5432/asa_service
npm start
```

#### Production
```bash
set NODE_ENV=production
set DATABASE_URL=postgresql://user:pass@prod-db:5432/asa_service
npm start
```

## 🔧 Features

### ✅ Currently Working
- **🌐 Frontend Interface**: Complete web UI with all tabs functional
- **🔍 Universal Search**: Search across creatures, maps, and regions
- **🦕 Creature Database**: Browse all creatures with filtering and details
- **🗺️ Map Information**: Complete map data with descriptions and metadata
- **🎯 Taming Calculator**: Calculate taming requirements and methods
- **🌍 Region Explorer**: Browse map regions and biomes
- **📊 Health Monitoring**: Real-time service status and metrics
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **⚡ Mock Data Mode**: Full functionality without database setup
- **🔄 Auto-Fallback**: Graceful degradation when database unavailable

### 🚧 Database Integration
- **✅ Schema Ready**: Complete database schema available
- **✅ Migration System**: Automatic table creation and updates  
- **✅ Wiki Integration**: Automatic data sync from ARK Wiki (when connected)
- **🔄 Connection Handling**: Automatic reconnection and error recovery

### 🎮 Planned Features
- **📍 Interactive Maps**: Visual map coordinates and POI markers
- **📈 Statistics Dashboard**: Creature popularity and taming trends
- **🔔 Update Notifications**: Real-time wiki updates and new content
- **👥 User Accounts**: Save favorites and custom taming presets
- **📱 Mobile App**: Native mobile application
- **🔌 API Webhooks**: Real-time data notifications

## 🚨 Troubleshooting

### Common Issues

#### ❌ "Port 3000 already in use"
```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or use different port
set PORT=3001 && npm start
```

#### ❌ "Database connection failed"
```bash
# Use mock data mode (recommended for development)
set SKIP_DATABASE=true && npm start
# Or for PowerShell:
$env:SKIP_DATABASE="true"; npm start

# Or check PostgreSQL service
sc query postgresql-x64-13  # Windows
systemctl status postgresql  # Linux
```

#### ❌ "Module not found"
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json  # Linux/macOS
rmdir /s node_modules & del package-lock.json  # Windows
npm install
```

#### ❌ "Tests failing"
```bash
# Run tests individually to identify issues
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Performance Tips

#### Faster Startup
```bash
# Skip data synchronization for development
npm run start:quick
```

#### Memory Usage
```bash
# Limit database connections
set DB_POOL_SIZE=5 && npm start
```

#### Debug Mode
```bash
# Enable detailed logging
set DEBUG=asa-service:* && npm run dev
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the established patterns
4. **Add tests** for new functionality: `npm run test:watch`
5. **Run the full test suite**: `npm run test:all`
6. **Check code style**: `npm run lint:fix`
7. **Commit your changes**: `git commit -m 'Add amazing feature'`
8. **Push to the branch**: `git push origin feature/amazing-feature`
9. **Open a Pull Request** with detailed description

### Development Guidelines

#### Code Style
- ESLint configuration enforces consistent style
- Use `npm run lint:fix` to auto-fix style issues
- Follow existing patterns for route handlers and services
- Add JSDoc comments for functions and classes

#### Testing Requirements
- Add unit tests for all new functions
- Include integration tests for new API endpoints
- Update E2E tests if UI changes are made
- Maintain test coverage above 80%

#### Documentation
- Update README.md for new features
- Add API documentation for new endpoints
- Include example usage in code comments
- Update CHANGELOG.md with notable changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ARK: Survival Ascended** community for inspiration and testing
- **Official ARK Wiki** (https://ark.wiki.gg/) for creature and map data
- **DodoDex** (https://www.dododex.com/) for taming calculations
- **Node.js & Express** community for excellent documentation
- **All contributors** who help improve this project

## � Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Wiki**: Detailed guides and advanced usage
- **API Docs**: Complete endpoint reference at `/api/docs`

---

**Made with ❤️ for the ARK: Survival Ascended community**